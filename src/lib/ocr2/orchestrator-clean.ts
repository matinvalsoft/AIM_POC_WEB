/**
 * OCR2 Orchestrator - Clean Implementation
 * Simple: PDF URL → OCR with parallel processing → Text string
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs';
import OpenAI from 'openai';

// Configuration (matches simple-test-v5)
const config = {
  openaiApiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o',
  dpi: 150,
  maxPages: 50,
  
  // Chunking parameters (from original OCR/config.py)
  longSideMaxPx: 2048,      // LONG_SIDE_MAX_PX
  aspectTrigger: 2.7,       // ASPECT_TRIGGER - when to split horizontally vs vertically
  overlapPct: 0.05,         // OVERLAP_PCT - 5% overlap between chunks
  
  // Parallel processing
  maxParallelCalls: 5,      // MAX_PARALLEL_VISION_CALLS
};

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.openaiApiKey,
});

interface ImageChunk {
  buffer: Buffer;
  width: number;
  height: number;
  x: number;
  y: number;
  chunkIndex: number;
  pageIndex: number;
  id: string; // Unique identifier for tracking
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
const semaphore = new Semaphore(config.maxParallelCalls);

/**
 * Download PDF from URL or local file
 */
async function downloadPDF(url: string): Promise<Buffer> {
  console.log(`📥 Loading PDF from: ${url.substring(0, 50)}...`);

  try {
    let pdfBuffer: Buffer;

    if (url.startsWith('file://')) {
      // Handle local file paths
      const filePath = url.replace('file://', '');
      if (!existsSync(filePath)) {
        throw new Error(`Local file not found: ${filePath}`);
      }
      pdfBuffer = readFileSync(filePath);
      console.log(`✅ PDF loaded from local file (${Math.round(pdfBuffer.length / 1024)}KB)`);
    } else if (url.startsWith('data:')) {
      // Handle data URIs
      const [header, data] = url.split(',', 2);
      if (!header.includes('application/pdf') && !header.includes('base64')) {
        throw new Error('Invalid PDF data URI format');
      }
      pdfBuffer = Buffer.from(data, 'base64');
      console.log(`✅ PDF loaded from data URI (${Math.round(pdfBuffer.length / 1024)}KB)`);
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
        throw new Error(`Failed to download PDF: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      pdfBuffer = Buffer.from(arrayBuffer);
      console.log(`✅ PDF downloaded (${Math.round(pdfBuffer.length / 1024)}KB)`);
    }

    // Validate PDF header
    if (!pdfBuffer.subarray(0, 4).toString().startsWith('%PDF')) {
      throw new Error('Downloaded file is not a valid PDF');
    }

    return pdfBuffer;

  } catch (error) {
    console.error(`❌ PDF download failed:`, error);
    throw error;
  }
}

/**
 * Convert PDF to images using system pdftoppm command
 */
async function pdfToImages(pdfBuffer: Buffer): Promise<Buffer[]> {
  const tempDir = '/tmp';
  const baseName = `ocr2_page_${Date.now()}`;
  const tempPdfPath = `/tmp/ocr2_pdf_${Date.now()}.pdf`;
  
  try {
    console.log(`🖼️  Converting PDF to images...`);
    
    // Write PDF buffer to temp file
    writeFileSync(tempPdfPath, pdfBuffer);
    
    // Use pdftoppm to convert PDF to PNG images
    const command = `pdftoppm -png -r ${config.dpi} -l ${config.maxPages} "${tempPdfPath}" "${tempDir}/${baseName}"`;
    
    console.log(`📄 Running: pdftoppm with DPI ${config.dpi}, max ${config.maxPages} pages`);
    execSync(command, { stdio: 'pipe' });
    
    // Find generated images
    const images: Buffer[] = [];
    
    for (let page = 1; page <= config.maxPages; page++) {
      const imagePath = `${tempDir}/${baseName}-${page}.png`;
      
      if (existsSync(imagePath)) {
        const imageBuffer = readFileSync(imagePath);
        images.push(imageBuffer);
        console.log(`✅ Page ${page}: ${Math.round(imageBuffer.length / 1024)}KB`);
        
        // Clean up temp image file
        unlinkSync(imagePath);
      } else {
        console.log(`ℹ️  No more pages after page ${page - 1}`);
        break;
      }
    }
    
    if (images.length === 0) {
      throw new Error('No images were generated from PDF');
    }
    
    console.log(`✅ PDF conversion completed: ${images.length} pages`);
    return images;
    
  } finally {
    // Clean up temp PDF file
    if (existsSync(tempPdfPath)) {
      unlinkSync(tempPdfPath);
    }
  }
}

/**
 * Get image dimensions using sharp
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
 * Chunk image intelligently based on size and aspect ratio
 */
async function chunkImage(imageBuffer: Buffer, pageIndex: number): Promise<ImageChunk[]> {
  const { width, height } = await getImageDimensions(imageBuffer);
  const pageNum = pageIndex + 1;
  console.log(`📐 Page ${pageNum} dimensions: ${width}x${height}px`);
  
  // If image is small enough, return as single chunk
  if (width <= config.longSideMaxPx && height <= config.longSideMaxPx) {
    console.log(`✅ Page ${pageNum}: Image is small enough, using single chunk`);
    return [{
      buffer: imageBuffer,
      width,
      height,
      x: 0,
      y: 0,
      chunkIndex: 0,
      pageIndex,
      id: `p${pageNum}c1`,
    }];
  }
  
  // Calculate aspect ratio
  const aspectRatio = width / height;
  console.log(`📊 Page ${pageNum} aspect ratio: ${aspectRatio.toFixed(2)}`);
  
  // Determine split direction based on aspect ratio
  if (aspectRatio > config.aspectTrigger) {
    // Wide image - split horizontally
    console.log(`↔️  Page ${pageNum}: Wide image, splitting horizontally`);
    return await splitImageHorizontally(imageBuffer, width, height, pageIndex);
  } else {
    // Tall image - split vertically  
    console.log(`↕️  Page ${pageNum}: Tall image, splitting vertically`);
    return await splitImageVertically(imageBuffer, width, height, pageIndex);
  }
}

/**
 * Split image horizontally with overlap
 */
async function splitImageHorizontally(imageBuffer: Buffer, width: number, height: number, pageIndex: number): Promise<ImageChunk[]> {
  const sharp = await import('sharp');
  const pageNum = pageIndex + 1;
  
  // Calculate chunk width with overlap
  const chunkWidth = Math.min(width, config.longSideMaxPx);
  const overlapPixels = Math.floor(chunkWidth * config.overlapPct);
  
  const chunks: ImageChunk[] = [];
  let x = 0;
  let chunkIndex = 0;
  
  while (x < width) {
    const endX = Math.min(x + chunkWidth, width);
    const actualWidth = endX - x;
    
    try {
      // Extract chunk using sharp
      const chunkBuffer = await sharp.default(imageBuffer)
        .extract({ 
          left: x, 
          top: 0, 
          width: actualWidth, 
          height: height 
        })
        .png()
        .toBuffer();
      
      chunks.push({
        buffer: chunkBuffer,
        width: actualWidth,
        height: height,
        x,
        y: 0,
        chunkIndex,
        pageIndex,
        id: `p${pageNum}c${chunkIndex + 1}`,
      });
      
      console.log(`   📎 Chunk ${chunkIndex + 1}: ${actualWidth}x${height}px at (${x}, 0)`);
      
      // Move to next chunk with overlap
      x = endX - overlapPixels;
      chunkIndex++;
      
      // Stop if we're at the end
      if (x >= width - overlapPixels) {
        break;
      }
      
    } catch (error) {
      console.warn(`⚠️  Failed to create chunk ${chunkIndex}, skipping:`, error);
      x = endX; // Skip this chunk and continue
    }
  }
  
  console.log(`✅ Horizontal splitting completed: ${chunks.length} chunks`);
  return chunks;
}

/**
 * Split image vertically with overlap
 */
async function splitImageVertically(imageBuffer: Buffer, width: number, height: number, pageIndex: number): Promise<ImageChunk[]> {
  const sharp = await import('sharp');
  const pageNum = pageIndex + 1;
  
  // Calculate chunk height with overlap
  const chunkHeight = Math.min(height, config.longSideMaxPx);
  const overlapPixels = Math.floor(chunkHeight * config.overlapPct);
  
  const chunks: ImageChunk[] = [];
  let y = 0;
  let chunkIndex = 0;
  
  while (y < height) {
    const endY = Math.min(y + chunkHeight, height);
    const actualHeight = endY - y;
    
    try {
      // Extract chunk using sharp
      const chunkBuffer = await sharp.default(imageBuffer)
        .extract({ 
          left: 0, 
          top: y, 
          width: width, 
          height: actualHeight 
        })
        .png()
        .toBuffer();
      
      chunks.push({
        buffer: chunkBuffer,
        width: width,
        height: actualHeight,
        x: 0,
        y,
        chunkIndex,
        pageIndex,
        id: `p${pageNum}c${chunkIndex + 1}`,
      });
      
      console.log(`   📎 Chunk ${chunkIndex + 1}: ${width}x${actualHeight}px at (0, ${y})`);
      
      // Move to next chunk with overlap
      y = endY - overlapPixels;
      chunkIndex++;
      
      // Stop if we're at the end
      if (y >= height - overlapPixels) {
        break;
      }
      
    } catch (error) {
      console.warn(`⚠️  Failed to create chunk ${chunkIndex}, skipping:`, error);
      y = endY; // Skip this chunk and continue
    }
  }
  
  console.log(`✅ Vertical splitting completed: ${chunks.length} chunks`);
  return chunks;
}

/**
 * Extract text from image chunk using OpenAI Vision API
 */
async function extractTextFromChunk(chunk: ImageChunk): Promise<{ chunk: ImageChunk; text: string; tokens: number; processingTime: number }> {
  const startTime = Date.now();
  
  await semaphore.acquire();
  
  try {
    console.log(`🔍 [${chunk.id}] Processing with Vision API...`);
    
    // Convert to base64
    const base64Image = chunk.buffer.toString('base64');
    const dataUri = `data:image/png;base64,${base64Image}`;
    
    const response = await openai.chat.completions.create({
      model: config.model,
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
                detail: 'high',
              },
            },
          ],
        },
      ],
      max_tokens: 4096,
      temperature: 0.1,
    });

    const extractedText = response.choices[0]?.message?.content?.trim() || '';
    const tokens = response.usage?.total_tokens || 0;
    const processingTime = Date.now() - startTime;
    
    console.log(`✅ [${chunk.id}] Extracted ${extractedText.length} characters (${tokens} tokens, ${processingTime}ms)`);
    
    return {
      chunk,
      text: extractedText,
      tokens,
      processingTime,
    };
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ [${chunk.id}] Vision API failed:`, error);
    
    return {
      chunk,
      text: `[ERROR: Could not extract text from ${chunk.id}]`,
      tokens: 0,
      processingTime,
    };
  } finally {
    semaphore.release();
  }
}

/**
 * Process all chunks in parallel with controlled concurrency
 */
async function processAllChunks(allChunks: ImageChunk[]): Promise<{ chunk: ImageChunk; text: string; tokens: number; processingTime: number }[]> {
  console.log(`\n🚀 Starting parallel processing of ${allChunks.length} chunks (max ${config.maxParallelCalls} concurrent)...`);
  
  const startTime = Date.now();
  
  // Process all chunks in parallel
  const chunkPromises = allChunks.map(chunk => extractTextFromChunk(chunk));
  const results = await Promise.all(chunkPromises);
  
  const totalTime = Date.now() - startTime;
  const totalTokens = results.reduce((sum, result) => sum + result.tokens, 0);
  
  console.log(`✅ Parallel processing completed in ${Math.round(totalTime / 1000)}s`);
  console.log(`💰 Total tokens used: ${totalTokens}`);
  console.log(`⚡ Average processing time per chunk: ${Math.round(totalTime / allChunks.length)}ms`);
  
  return results;
}

/**
 * Main function: PDF URL → OCR → Text string
 * This is the core orchestrator function that does everything
 */
export async function processPDFFromURL(url: string): Promise<string> {
  console.log(`\n🚀 Starting OCR processing: ${url.substring(0, 50)}...`);
  console.log('='.repeat(80));
  
  const startTime = Date.now();
  
  try {
    // Step 1: Download PDF
    const pdfBuffer = await downloadPDF(url);
    
    // Step 2: Convert PDF to images
    const images = await pdfToImages(pdfBuffer);
    
    // Step 3: Chunk all pages
    console.log(`\n📄 Chunking ${images.length} pages...`);
    const allChunks: ImageChunk[] = [];
    
    for (let pageIndex = 0; pageIndex < images.length; pageIndex++) {
      const pageNum = pageIndex + 1;
      console.log(`\n📄 Analyzing page ${pageNum}/${images.length}...`);
      
      const chunks = await chunkImage(images[pageIndex], pageIndex);
      allChunks.push(...chunks);
      
      console.log(`✅ Page ${pageNum}: ${chunks.length} chunks created`);
    }
    
    console.log(`\n📊 Total chunks across all pages: ${allChunks.length}`);
    
    // Step 4: Process all chunks in parallel
    const results = await processAllChunks(allChunks);
    
    // Step 5: Reassemble results by page
    console.log(`\n📋 Reassembling results by page...`);
    const pageTexts: string[] = [];
    
    for (let pageIndex = 0; pageIndex < images.length; pageIndex++) {
      const pageChunks = results.filter(result => result.chunk.pageIndex === pageIndex);
      
      // Sort chunks by their position/index
      pageChunks.sort((a, b) => a.chunk.chunkIndex - b.chunk.chunkIndex);
      
      const pageText = pageChunks.map(result => result.text).join('\n').trim();
      pageTexts.push(pageText);
      
      const pageNum = pageIndex + 1;
      console.log(`✅ Page ${pageNum}: ${pageText.length} characters from ${pageChunks.length} chunks`);
    }
    
    // Step 6: Combine all pages into final text
    const fullText = pageTexts.join('\n\n--- PAGE BREAK ---\n\n');
    
    const processingTime = Date.now() - startTime;
    const totalTokens = results.reduce((sum, result) => sum + result.tokens, 0);
    
    console.log('\n' + '='.repeat(80));
    console.log('🎉 OCR PROCESSING COMPLETED');
    console.log('='.repeat(80));
    console.log(`📊 Statistics:`);
    console.log(`   • Pages processed: ${images.length}`);
    console.log(`   • Total chunks: ${allChunks.length}`);
    console.log(`   • Average chunks per page: ${(allChunks.length / images.length).toFixed(1)}`);
    console.log(`   • Max parallel calls: ${config.maxParallelCalls}`);
    console.log(`   • Total characters: ${fullText.length}`);
    console.log(`   • Total tokens used: ${totalTokens}`);
    console.log(`   • Processing time: ${Math.round(processingTime / 1000)}s`);
    console.log(`   • Speedup factor: ~${Math.min(config.maxParallelCalls, allChunks.length).toFixed(1)}x`);
    
    return fullText;
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`\n❌ OCR processing failed after ${Math.round(processingTime / 1000)}s:`, error);
    throw error;
  }
}

/**
 * Simple interface for external use
 */
export { processPDFFromURL as processDocument };
