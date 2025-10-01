/**
 * OCR2 Orchestrator
 * Main pipeline for processing PDFs and extracting text
 */

import { 
  PDFProcessingResult, 
  PDFProcessingOptions, 
  PageProcessingResult,
  ProcessingSummary,
  ChunkOCRResult,
  PDFProcessingError 
} from './types';
import { downloadPDF, pdfToImages, extractPDFText, hasPDFText } from './pdf-processor';
import { chunkImage } from './image-chunker';
import { extractTextFromChunks } from './vision-client';
import { createLogger, measurePerformance, createTimer } from './logger';

const logger = createLogger('Orchestrator');

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

    // Step 2: Check if PDF has extractable text
    const hasText = await hasPDFText(pdfBuffer);
    logger.info('PDF text analysis', { hasExtractableText: hasText });

    let extractedText = '';
    let pagesResults: PageProcessingResult[] = [];
    let totalPages = 0;
    let processedPages = 0;

    if (hasText && !options?.extractImages) {
      // Use text extraction for text-based PDFs
      timer.checkpoint('Text extraction started');
      extractedText = await extractPDFText(pdfBuffer);
      timer.checkpoint('Text extraction completed');
      
      // For text-based PDFs, we don't have page-by-page results
      totalPages = 1; // Simplified
      processedPages = 1;
    } else {
      // Use OCR for image-based PDFs or when images are explicitly requested
      timer.checkpoint('Image conversion started');
      const images = await pdfToImages(pdfBuffer, options);
      totalPages = images.length;
      timer.checkpoint('Image conversion completed');

      // Process each page
      const pagePromises = images.map(async (image, pageIndex) => {
        return await processPage(image, pageIndex);
      });

      timer.checkpoint('OCR processing started');
      pagesResults = await Promise.all(pagePromises);
      processedPages = pagesResults.length;
      timer.checkpoint('OCR processing completed');

      // Combine all page texts
      extractedText = pagesResults
        .map(page => page.text)
        .join('\n\n')
        .trim();
    }

    // Calculate summary statistics
    const summary = calculateProcessingSummary(pagesResults, timer.finish());

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
      successRate: `${summary.successRate}%`
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
 * Process a single page image
 */
async function processPage(image: any, pageIndex: number): Promise<PageProcessingResult> {
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
      const chunkOCRResults: ChunkOCRResult[] = chunkResults.map((result, chunkIndex) => ({
        ...result,
        chunkIndex,
        pageIndex,
      }));

      const pageText = chunkOCRResults
        .map(chunk => chunk.text)
        .join('\n')
        .trim();

      return {
        pageIndex,
        text: pageText,
        chunks: chunkOCRResults,
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
    return total + page.chunks.filter(chunk => chunk.text.length > 0).length;
  }, 0);
  
  const successRate = totalChunks > 0 ? (successfulChunks / totalChunks) * 100 : 100;

  // Collect any errors (chunks with no text could indicate errors)
  const errors: string[] = [];
  pagesResults.forEach((page, pageIndex) => {
    page.chunks.forEach((chunk, chunkIndex) => {
      if (chunk.text.length === 0) {
        errors.push(`Page ${pageIndex + 1}, Chunk ${chunkIndex + 1}: No text extracted`);
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
    processingTime: `${result.processingTime}ms`
  });

  return result.extractedText;
}

/**
 * Get processing statistics for monitoring
 */
export function getProcessingStats() {
  return {
    // This would track statistics across multiple requests
    // For now, return basic configuration info
    maxPagesPerDoc: 50,
    maxConcurrency: 5,
    supportedFormats: ['PDF'],
    features: [
      'Text extraction',
      'OCR processing', 
      'Image chunking',
      'Parallel processing',
      'Error recovery'
    ]
  };
}
