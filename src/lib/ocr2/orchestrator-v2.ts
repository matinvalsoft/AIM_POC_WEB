/**
 * OCR2 Orchestrator - Production Version
 * Clean implementation with parallel processing and intelligent chunking
 */

import { execSync } from 'child_process';
import { readFileSync, unlinkSync, existsSync } from 'fs';
import OpenAI from 'openai';
import { getOCR2Settings } from './config';
import { createLogger, measurePerformance } from './logger';

/**
 * Simple timer utility for performance tracking
 */
function createTimer(operation: string, component: string) {
  const startTime = Date.now();
  const checkpoints: Array<{ name: string; time: number }> = [];
  
  return {
    checkpoint(name: string) {
      checkpoints.push({ name, time: Date.now() - startTime });
    },
    
    finish() {
      const totalTime = Date.now() - startTime;
      const logger = createLogger(component);
      
      logger.info(`${operation} completed`, {
        totalTime: `${totalTime}ms`,
        checkpoints: checkpoints.map(cp => `${cp.name}: ${cp.time}ms`).join(', ')
      });
      
      return totalTime;
    }
  };
}
import type {
  PDFProcessingResult,
  PDFProcessingOptions,
  PageProcessingResult,
  ProcessingSummary,
  ImageChunk,
  ProcessedImage,
  OCRResult,
  ChunkOCRResult,
  PDFProcessingError,
  VisionAPIError,
} from './types';

const logger = createLogger('Orchestrator');
const settings = getOCR2Settings();

/**
 * OpenAI client instance
 */
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: settings.openai.apiKey,
      baseURL: settings.openai.baseUrl,
      timeout: settings.openai.timeoutSeconds * 1000,
    });
    
    logger.info('OpenAI client initialized', {
      model: settings.openai.model,
      baseUrl: settings.openai.baseUrl || 'default',
      timeout: `${settings.openai.timeoutSeconds}s`
    });
  }
  
  return openaiClient;
}

/**
 * Semaphore for controlling concurrent API calls
 */
class Semaphore {
  private permits: number;
  private waitQueue: (() => void)[] = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.waitQueue.push(resolve);
    });
  }

  release(): void {
    this.permits++;
    const next = this.waitQueue.shift();
    if (next) {
      this.permits--;
      next();
    }
  }
}

// Global semaphore for rate limiting
const semaphore = new Semaphore(settings.concurrency.maxParallelVisionCalls);

/**
 * Download PDF from URL or process data URI
 */
export async function downloadPDF(url: string): Promise<Buffer> {
  try {
    logger.info('Downloading PDF', { url: url.substring(0, 50) + '...' });

    let pdfBuffer: Buffer;

    if (url.startsWith('data:')) {
      // Handle data URIs
      const [header, data] = url.split(',', 2);
      if (!header.includes('application/pdf') && !header.includes('base64')) {
        throw new PDFProcessingError('Invalid PDF data URI format');
      }
      pdfBuffer = Buffer.from(data, 'base64');
      logger.info('PDF loaded from data URI', { size: pdfBuffer.length });
    } else {
      // Regular URL - download
      const response = await fetch(url, { 
        method: 'GET',
        headers: {
          'User-Agent': 'OCR2-PDF-Processor/2.0',
        },
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      if (!response.ok) {
        throw new PDFProcessingError(`Failed to download PDF: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      pdfBuffer = Buffer.from(arrayBuffer);
      logger.info('PDF downloaded from URL', { size: pdfBuffer.length });
    }

    // Validate PDF header
    if (!pdfBuffer.subarray(0, 4).toString().startsWith('%PDF')) {
      throw new PDFProcessingError('Downloaded file is not a valid PDF');
    }

    return pdfBuffer;

  } catch (error) {
    if (error instanceof PDFProcessingError) {
      throw error;
    }
    
    throw new PDFProcessingError(
      `PDF download failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { originalError: error, url }
    );
  }
}

/**
 * Convert PDF to images using system pdftoppm command
 */
export async function pdfToImages(pdfBuffer: Buffer, options?: PDFProcessingOptions): Promise<ProcessedImage[]> {
  try {
    logger.info('Converting PDF to images', { bufferSize: pdfBuffer.length });

    // Write PDF to temporary file
    const tempPdfPath = `/tmp/ocr2_pdf_${Date.now()}.pdf`;
    const tempDir = '/tmp';
    const baseName = `ocr2_page_${Date.now()}`;
    
    try {
      // Write PDF buffer to temp file
      require('fs').writeFileSync(tempPdfPath, pdfBuffer);
      
      // Use pdftoppm to convert PDF to PNG images
      const maxPages = Math.min(options?.maxPages || settings.pdf.maxPagesPerDoc, settings.pdf.maxPagesPerDoc);
      const command = `pdftoppm -png -r ${settings.pdf.dpi} -l ${maxPages} "${tempPdfPath}" "${tempDir}/${baseName}"`;
      
      logger.debug('Running PDF conversion command', { command: command.substring(0, 100) + '...' });
      execSync(command, { stdio: 'pipe' });
      
      // Find generated images
      const images: ProcessedImage[] = [];
      
      for (let page = 1; page <= maxPages; page++) {
        const imagePath = `${tempDir}/${baseName}-${page}.png`;
        
        if (existsSync(imagePath)) {
          const imageBuffer = readFileSync(imagePath);
          
          // Get image metadata using sharp
          const sharp = await import('sharp');
          const metadata = await sharp.default(imageBuffer).metadata();
          
          images.push({
            buffer: imageBuffer,
            width: metadata.width || 0,
            height: metadata.height || 0,
            format: metadata.format || 'png',
          });
          
          logger.debug('Processed page', { 
            page, 
            size: `${Math.round(imageBuffer.length / 1024)}KB`,
            dimensions: `${metadata.width}x${metadata.height}px`
          });
          
          // Clean up temp image file
          unlinkSync(imagePath);
        } else {
          logger.info('No more pages found', { lastPage: page - 1 });
          break;
        }
      }
      
      logger.info('PDF to images conversion completed', { 
        totalPages: images.length,
        maxPages: settings.pdf.maxPagesPerDoc
      });

      return images;
      
    } finally {
      // Clean up temp PDF file
      if (existsSync(tempPdfPath)) {
        unlinkSync(tempPdfPath);
      }
    }

  } catch (error) {
    logger.error('PDF to images conversion failed', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    throw new PDFProcessingError(
      `Failed to convert PDF to images: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { originalError: error }
    );
  }
}

/**
 * Get image dimensions
 */
async function getImageDimensions(imageBuffer: Buffer): Promise<{ width: number; height: number }> {
  const sharp = await import('sharp');
  const metadata = await sharp.default(imageBuffer).metadata();
  return {
    width: metadata.width || 0,
    height: metadata.height || 0
  };
}

/**
 * Intelligent image chunking based on size and aspect ratio
 */
export async function chunkImage(image: ProcessedImage, pageIndex: number): Promise<ImageChunk[]> {
  try {
    const { width, height } = image;
    const pageNum = pageIndex + 1;
    
    logger.debug('Analyzing image for chunking', {
      page: pageNum,
      dimensions: `${width}x${height}px`
    });
    
    // If image is small enough, return as single chunk
    if (width <= settings.chunking.longSideMaxPx && height <= settings.chunking.longSideMaxPx) {
      logger.debug('Image fits within limits, using single chunk', { page: pageNum });
      return [{
        data: image.buffer,
        width,
        height,
        x: 0,
        y: 0,
        chunkIndex: 0,
      }];
    }
    
    // Calculate aspect ratio
    const aspectRatio = width / height;
    logger.debug('Image requires chunking', { 
      page: pageNum,
      aspectRatio: aspectRatio.toFixed(2),
      trigger: settings.chunking.aspectTrigger
    });
    
    // Determine split direction based on aspect ratio
    if (aspectRatio > settings.chunking.aspectTrigger) {
      // Wide image - split horizontally
      logger.debug('Splitting image horizontally', { page: pageNum });
      return await splitImageHorizontally(image, pageIndex);
    } else {
      // Tall image - split vertically  
      logger.debug('Splitting image vertically', { page: pageNum });
      return await splitImageVertically(image, pageIndex);
    }
    
  } catch (error) {
    logger.warn('Image chunking failed, using original image', { 
      pageIndex,
      error: error instanceof Error ? error.message : String(error) 
    });
    
    return [{
      data: image.buffer,
      width: image.width,
      height: image.height,
      x: 0,
      y: 0,
      chunkIndex: 0,
    }];
  }
}

/**
 * Split image horizontally with overlap
 */
async function splitImageHorizontally(image: ProcessedImage, pageIndex: number): Promise<ImageChunk[]> {
  const sharp = await import('sharp');
  const { width, height } = image;
  
  // Calculate chunk width with overlap
  const chunkWidth = Math.min(width, settings.chunking.longSideMaxPx);
  const overlapPixels = Math.floor(chunkWidth * settings.chunking.overlapPct);
  
  const chunks: ImageChunk[] = [];
  let x = 0;
  let chunkIndex = 0;
  
  while (x < width) {
    const endX = Math.min(x + chunkWidth, width);
    const actualWidth = endX - x;
    
    try {
      // Extract chunk using sharp
      const chunkBuffer = await sharp.default(image.buffer)
        .extract({ 
          left: x, 
          top: 0, 
          width: actualWidth, 
          height: height 
        })
        .png()
        .toBuffer();
      
      chunks.push({
        data: chunkBuffer,
        width: actualWidth,
        height: height,
        x,
        y: 0,
        chunkIndex,
      });
      
      logger.debug('Created horizontal chunk', { 
        pageIndex,
        chunkIndex, 
        x, 
        width: actualWidth, 
        height 
      });
      
      // Move to next chunk with overlap
      x = endX - overlapPixels;
      chunkIndex++;
      
      // Stop if we're at the end
      if (x >= width - overlapPixels) {
        break;
      }
      
    } catch (error) {
      logger.warn('Failed to create chunk, skipping', { pageIndex, x, chunkIndex, error });
      x = endX; // Skip this chunk and continue
    }
  }
  
  logger.info('Horizontal splitting completed', { 
    pageIndex,
    totalChunks: chunks.length 
  });
  
  return chunks;
}

/**
 * Split image vertically with overlap
 */
async function splitImageVertically(image: ProcessedImage, pageIndex: number): Promise<ImageChunk[]> {
  const sharp = await import('sharp');
  const { width, height } = image;
  
  // Calculate chunk height with overlap
  const chunkHeight = Math.min(height, settings.chunking.longSideMaxPx);
  const overlapPixels = Math.floor(chunkHeight * settings.chunking.overlapPct);
  
  const chunks: ImageChunk[] = [];
  let y = 0;
  let chunkIndex = 0;
  
  while (y < height) {
    const endY = Math.min(y + chunkHeight, height);
    const actualHeight = endY - y;
    
    try {
      // Extract chunk using sharp
      const chunkBuffer = await sharp.default(image.buffer)
        .extract({ 
          left: 0, 
          top: y, 
          width: width, 
          height: actualHeight 
        })
        .png()
        .toBuffer();
      
      chunks.push({
        data: chunkBuffer,
        width: width,
        height: actualHeight,
        x: 0,
        y,
        chunkIndex,
      });
      
      logger.debug('Created vertical chunk', { 
        pageIndex,
        chunkIndex, 
        y, 
        width, 
        height: actualHeight 
      });
      
      // Move to next chunk with overlap
      y = endY - overlapPixels;
      chunkIndex++;
      
      // Stop if we're at the end
      if (y >= height - overlapPixels) {
        break;
      }
      
    } catch (error) {
      logger.warn('Failed to create chunk, skipping', { pageIndex, y, chunkIndex, error });
      y = endY; // Skip this chunk and continue
    }
  }
  
  logger.info('Vertical splitting completed', { 
    pageIndex,
    totalChunks: chunks.length 
  });
  
  return chunks;
}

/**
 * Extract text from image chunk using OpenAI Vision API
 */
export async function extractTextFromChunk(chunk: ImageChunk): Promise<OCRResult> {
  const operation = async (): Promise<OCRResult> => {
    await semaphore.acquire();
    
    try {
      const client = getOpenAIClient();
      
      // Convert chunk to base64 data URI
      const base64Image = chunk.data.toString('base64');
      const dataUri = `data:image/png;base64,${base64Image}`;
      
      logger.debug('Sending chunk to Vision API', {
        chunkIndex: chunk.chunkIndex,
        width: chunk.width,
        height: chunk.height,
        size: `${Math.round(chunk.data.length / 1024)}KB`
      });

      const response = await client.chat.completions.create({
        model: settings.openai.model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all text from this image. Preserve the original formatting, spacing, and layout as much as possible. Include all visible text including headers, footers, tables, and any annotations. Return only the extracted text with no additional commentary.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: dataUri,
                  detail: settings.openai.detailMode,
                },
              },
            ],
          },
        ],
        max_tokens: 4096,
        temperature: 0.1,
      });

      const extractedText = response.choices[0]?.message?.content?.trim() || '';
      
      const result: OCRResult = {
        text: extractedText,
        confidence: 1.0, // Vision API doesn't provide confidence scores
        processingTime: 0, // Will be set by measurePerformance
        tokensUsed: {
          input: response.usage?.prompt_tokens || 0,
          output: response.usage?.completion_tokens || 0,
          total: response.usage?.total_tokens || 0,
        },
      };

      logger.debug('Vision API response received', {
        chunkIndex: chunk.chunkIndex,
        textLength: extractedText.length,
        tokensUsed: result.tokensUsed.total,
      });

      return result;

    } finally {
      semaphore.release();
    }
  };

  try {
    const { result, duration } = await measurePerformance(
      operation,
      `Vision API call for chunk ${chunk.chunkIndex}`,
      'Orchestrator'
    );

    result.processingTime = duration;
    return result;

  } catch (error) {
    logger.error('Vision API call failed', {
      chunkIndex: chunk.chunkIndex,
      error: error instanceof Error ? error.message : String(error)
    });

    if (error instanceof Error) {
      // Parse OpenAI API errors
      if (error.message.includes('rate_limit_exceeded')) {
        throw new VisionAPIError('Rate limit exceeded. Please try again later.', { 
          originalError: error,
          retryAfter: 60 
        });
      }
      
      if (error.message.includes('invalid_request_error')) {
        throw new VisionAPIError('Invalid request to Vision API', { originalError: error });
      }
      
      if (error.message.includes('timeout')) {
        throw new VisionAPIError('Vision API request timed out', { originalError: error });
      }
    }

    throw new VisionAPIError(
      `Vision API call failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { originalError: error, chunkIndex: chunk.chunkIndex }
    );
  }
}

/**
 * Process multiple chunks in parallel
 */
export async function extractTextFromChunks(chunks: ImageChunk[], pageIndex: number = 0): Promise<ChunkOCRResult[]> {
  logger.info('Processing chunks with Vision API', {
    totalChunks: chunks.length,
    pageIndex,
    concurrency: settings.concurrency.maxParallelVisionCalls
  });

  // Process chunks in parallel with concurrency control
  const chunkPromises = chunks.map(async (chunk, index) => {
    try {
      const result = await extractTextFromChunk(chunk);
      return { 
        ...result,
        chunkIndex: chunk.chunkIndex,
        pageIndex,
        success: true 
      };
    } catch (error) {
      logger.error(`Chunk ${chunk.chunkIndex} failed`, {
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        text: `[ERROR: Could not extract text from chunk ${chunk.chunkIndex}]`,
        confidence: 0,
        processingTime: 0,
        tokensUsed: { input: 0, output: 0, total: 0 },
        chunkIndex: chunk.chunkIndex,
        pageIndex,
        success: false
      };
    }
  });

  // Wait for all chunks to complete
  const results = await Promise.all(chunkPromises);

  const successful = results.filter(r => r.success).length;
  const failed = results.length - successful;

  logger.info('Chunk processing completed', {
    successful,
    failed,
    totalChunks: chunks.length,
    successRate: `${Math.round((successful / chunks.length) * 100)}%`
  });

  // If all chunks failed, throw an error
  if (successful === 0 && failed > 0) {
    throw new VisionAPIError(
      `All ${chunks.length} chunks failed to process`,
      { pageIndex }
    );
  }

  return results;
}

/**
 * Process a single page image
 */
async function processPage(image: ProcessedImage, pageIndex: number): Promise<PageProcessingResult> {
  const { result, duration } = await measurePerformance(
    async () => {
      logger.info(`Processing page ${pageIndex + 1}`, {
        width: image.width,
        height: image.height,
        format: image.format
      });

      // Step 1: Chunk the image
      const chunks = await chunkImage(image, pageIndex);
      logger.info(`Page ${pageIndex + 1} chunked`, { totalChunks: chunks.length });

      // Step 2: Process chunks with Vision API
      const chunkResults = await extractTextFromChunks(chunks, pageIndex);

      // Step 3: Combine chunk results
      const pageText = chunkResults
        .map(chunk => chunk.text)
        .join('\n')
        .trim();

      return {
        pageIndex,
        text: pageText,
        chunks: chunkResults,
        processingTime: 0, // Will be set below
      };
    },
    `Page ${pageIndex + 1} processing`,
    'Orchestrator'
  );

  result.processingTime = duration;
  return result;
}

/**
 * Calculate processing summary statistics
 */
function calculateProcessingSummary(
  pagesResults: PageProcessingResult[], 
  totalProcessingTime: number
): ProcessingSummary {
  const totalTokensUsed = pagesResults.reduce((total, page) => {
    return total + page.chunks.reduce((pageTotal, chunk) => {
      return pageTotal + chunk.tokensUsed.total;
    }, 0);
  }, 0);

  const totalChunks = pagesResults.reduce((total, page) => total + page.chunks.length, 0);
  const averageChunksPerPage = pagesResults.length > 0 ? totalChunks / pagesResults.length : 0;

  const successfulChunks = pagesResults.reduce((total, page) => {
    return total + page.chunks.filter(chunk => chunk.text.length > 0 && !chunk.text.includes('[ERROR:')).length;
  }, 0);
  
  const successRate = totalChunks > 0 ? (successfulChunks / totalChunks) * 100 : 100;

  // Collect any errors
  const errors: string[] = [];
  pagesResults.forEach((page, pageIndex) => {
    page.chunks.forEach((chunk, chunkIndex) => {
      if (chunk.text.includes('[ERROR:')) {
        errors.push(`Page ${pageIndex + 1}, Chunk ${chunkIndex + 1}: Processing failed`);
      }
    });
  });

  return {
    totalTokensUsed,
    totalProcessingTime,
    averageChunksPerPage: Math.round(averageChunksPerPage * 100) / 100,
    successRate: Math.round(successRate * 100) / 100,
    errors,
  };
}

/**
 * Main function to process a PDF from URL and extract text
 */
export async function processPDFFromURL(
  url: string, 
  options?: PDFProcessingOptions
): Promise<PDFProcessingResult> {
  const timer = createTimer('PDF Processing', 'Orchestrator');
  
  try {
    logger.info('Starting PDF processing', { 
      url: url.substring(0, 50) + '...',
      options 
    });

    // Step 1: Download PDF
    timer.checkpoint('Download started');
    const pdfBuffer = await downloadPDF(url);
    timer.checkpoint('Download completed');

    // Step 2: Convert PDF to images
    timer.checkpoint('Image conversion started');
    const images = await pdfToImages(pdfBuffer, options);
    const totalPages = images.length;
    timer.checkpoint('Image conversion completed');

    // Step 3: Process each page in parallel
    const pagePromises = images.map(async (image, pageIndex) => {
      return await processPage(image, pageIndex);
    });

    timer.checkpoint('OCR processing started');
    const pagesResults = await Promise.all(pagePromises);
    const processedPages = pagesResults.length;
    timer.checkpoint('OCR processing completed');

    // Step 4: Combine all page texts
    const extractedText = pagesResults
      .map(page => page.text)
      .join('\n\n--- PAGE BREAK ---\n\n')
      .trim();

    // Calculate summary statistics
    const processingTime = timer.finish();
    const summary = calculateProcessingSummary(pagesResults, processingTime);

    const result: PDFProcessingResult = {
      totalPages,
      processedPages,
      extractedText,
      processingTime: summary.totalProcessingTime,
      pagesResults,
      summary,
    };

    logger.info('PDF processing completed', {
      totalPages,
      processedPages,
      textLength: extractedText.length,
      processingTime: `${summary.totalProcessingTime}ms`,
      successRate: `${summary.successRate}%`,
      totalTokens: summary.totalTokensUsed
    });

    return result;

  } catch (error) {
    const processingTime = timer.finish();
    
    logger.error('PDF processing failed', {
      url: url.substring(0, 50) + '...',
      processingTime: `${processingTime}ms`,
      error: error instanceof Error ? error.message : String(error)
    });

    if (error instanceof PDFProcessingError) {
      throw error;
    }

    throw new PDFProcessingError(
      `PDF processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { originalError: error, url, processingTime }
    );
  }
}

/**
 * Process a PDF for raw text extraction only (no structured data)
 */
export async function processPDFForRawText(
  url: string,
  options?: PDFProcessingOptions
): Promise<string> {
  logger.info('Processing PDF for raw text only', { 
    url: url.substring(0, 50) + '...' 
  });

  const result = await processPDFFromURL(url, options);
  
  logger.info('Raw text extraction completed', {
    textLength: result.extractedText.length,
    processingTime: `${result.processingTime}ms`,
    totalTokens: result.summary.totalTokensUsed
  });

  return result.extractedText;
}

/**
 * Get processing statistics for monitoring
 */
export function getProcessingStats() {
  return {
    configuration: {
      maxPagesPerDoc: settings.pdf.maxPagesPerDoc,
      maxConcurrency: settings.concurrency.maxParallelVisionCalls,
      chunkingEnabled: true,
      longSideMaxPx: settings.chunking.longSideMaxPx,
      aspectTrigger: settings.chunking.aspectTrigger,
      overlapPct: settings.chunking.overlapPct,
    },
    supportedFormats: ['PDF'],
    features: [
      'Text extraction',
      'OCR processing', 
      'Intelligent image chunking',
      'Parallel processing',
      'Error recovery',
      'Rate limiting',
      'Performance monitoring'
    ]
  };
}
