/**
 * Simple OCR2 Test - With Parallel Processing (Version 5)
 * Includes intelligent chunking + parallel OpenAI API calls with concurrency control
 */

import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import OpenAI from 'openai';

// Configuration with parallel processing
const config = {
  openaiApiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o',
  dpi: 150,
  maxPages: 10,
  
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
 * Convert PDF to images using system pdftoppm command
 */
async function pdfToImages(pdfPath: string): Promise<Buffer[]> {
  const tempDir = '/tmp';
  const baseName = 'ocr_test_page';
  
  try {
    console.log(`📄 Converting PDF to images using pdftoppm...`);
    
    // Use pdftoppm to convert PDF to PNG images
    const command = `pdftoppm -png -r ${config.dpi} -l ${config.maxPages} "${pdfPath}" "${tempDir}/${baseName}"`;
    
    console.log(`🖼️  Running: ${command}`);
    execSync(command, { stdio: 'pipe' });
    
    // Find generated images
    const images: Buffer[] = [];
    
    for (let page = 1; page <= config.maxPages; page++) {
      const imagePath = `${tempDir}/${baseName}-${page}.png`;
      
      if (existsSync(imagePath)) {
        console.log(`✅ Found page ${page}: ${imagePath}`);
        const imageBuffer = readFileSync(imagePath);
        images.push(imageBuffer);
        console.log(`   Size: ${Math.round(imageBuffer.length / 1024)}KB`);
        
        // Clean up temp file
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
    
  } catch (error) {
    console.error('❌ PDF conversion failed:', error);
    throw error;
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
 * Chunk image intelligently based on size and aspect ratio (from original OCR)
 */
async function chunkImage(imageBuffer: Buffer, pageIndex: number): Promise<ImageChunk[]> {
  try {
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
    
    // Determine split direction based on aspect ratio (from original OCR logic)
    if (aspectRatio > config.aspectTrigger) {
      // Wide image - split horizontally
      console.log(`↔️  Page ${pageNum}: Wide image, splitting horizontally`);
      return await splitImageHorizontally(imageBuffer, width, height, pageIndex);
    } else {
      // Tall image - split vertically  
      console.log(`↕️  Page ${pageNum}: Tall image, splitting vertically`);
      return await splitImageVertically(imageBuffer, width, height, pageIndex);
    }
    
  } catch (error) {
    console.warn(`⚠️  Page ${pageIndex + 1}: Chunking failed, using original image:`, error);
    const { width, height } = await getImageDimensions(imageBuffer);
    return [{
      buffer: imageBuffer,
      width,
      height,
      x: 0,
      y: 0,
      chunkIndex: 0,
      pageIndex,
      id: `p${pageIndex + 1}c1`,
    }];
  }
}

/**
 * Split image horizontally with overlap (from original OCR)
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
 * Split image vertically with overlap (from original OCR)
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
 * Extract text from image chunk using OpenAI Vision with semaphore control
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
              text: 'Extract all text from this image chunk. Preserve the original formatting, spacing, and layout as much as possible. Include all visible text including headers, footers, tables, and any annotations. Return only the extracted text with no additional commentary.',
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
 * Process a single PDF file with parallel chunking
 */
export async function processPDFSimple(pdfPath: string): Promise<string> {
  console.log(`\n🚀 Starting PDF processing with parallel chunking: ${pdfPath}`);
  console.log('='.repeat(80));
  
  const startTime = Date.now();
  
  try {
    // Step 1: Convert PDF to images
    const images = await pdfToImages(pdfPath);
    
    // Step 2: Chunk all pages
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
    
    // Step 3: Process all chunks in parallel
    const results = await processAllChunks(allChunks);
    
    // Step 4: Reassemble results by page
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
    
    // Step 5: Combine all pages
    const fullText = pageTexts.join('\n\n--- PAGE BREAK ---\n\n');
    
    const processingTime = Date.now() - startTime;
    const totalTokens = results.reduce((sum, result) => sum + result.tokens, 0);
    
    console.log('\n' + '='.repeat(80));
    console.log('🎉 PDF PROCESSING WITH PARALLEL CHUNKING COMPLETED');
    console.log('='.repeat(80));
    console.log(`📊 Statistics:`);
    console.log(`   • Pages processed: ${images.length}`);
    console.log(`   • Total chunks: ${allChunks.length}`);
    console.log(`   • Average chunks per page: ${(allChunks.length / images.length).toFixed(1)}`);
    console.log(`   • Max parallel calls: ${config.maxParallelCalls}`);
    console.log(`   • Total characters: ${fullText.length}`);
    console.log(`   • Total tokens used: ${totalTokens}`);
    console.log(`   • Processing time: ${Math.round(processingTime / 1000)}s`);
    console.log(`   • Time per page: ${Math.round(processingTime / images.length / 1000)}s`);
    console.log(`   • Time per chunk: ${Math.round(processingTime / allChunks.length / 1000)}s`);
    console.log(`   • Speedup factor: ~${Math.min(config.maxParallelCalls, allChunks.length).toFixed(1)}x`);
    
    return fullText;
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`\n❌ PDF processing failed after ${Math.round(processingTime / 1000)}s:`, error);
    throw error;
  }
}

/**
 * Main function to test with a PDF from the PDFs folder
 */
export async function testPDFProcessing(filename: string): Promise<void> {
  try {
    // Construct path to PDF file
    const pdfPath = join(process.cwd(), 'PDFs', filename);
    
    console.log(`🔍 Looking for PDF: ${pdfPath}`);
    
    // Check if file exists
    try {
      const pdfBuffer = readFileSync(pdfPath);
      console.log(`✅ Found PDF file: ${filename} (${Math.round(pdfBuffer.length / 1024)}KB)`);
    } catch {
      throw new Error(`PDF file not found: ${pdfPath}`);
    }
    
    // Show configuration
    console.log(`⚙️  Configuration:`);
    console.log(`   • Max dimension: ${config.longSideMaxPx}px`);
    console.log(`   • Aspect trigger: ${config.aspectTrigger}`);
    console.log(`   • Overlap: ${config.overlapPct * 100}%`);
    console.log(`   • Max parallel calls: ${config.maxParallelCalls}`);
    console.log(`   • Max pages: ${config.maxPages}`);
    
    // Process the PDF
    const extractedText = await processPDFSimple(pdfPath);
    
    // Log the results
    console.log('\n' + '='.repeat(80));
    console.log('📄 EXTRACTED TEXT:');
    console.log('='.repeat(80));
    console.log(extractedText);
    console.log('\n' + '='.repeat(80));
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// If this file is run directly
if (require.main === module) {
  const filename = process.argv[2];
  
  if (!filename) {
    console.error('❌ Please provide a PDF filename');
    console.log('Usage: npm run test-ocr-v5 <filename.pdf>');
    console.log('Example: npm run test-ocr-v5 "Scan_14-07-2025_015809493.pdf"');
    process.exit(1);
  }
  
  testPDFProcessing(filename);
}





