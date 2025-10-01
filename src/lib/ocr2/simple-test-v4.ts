/**
 * Simple OCR2 Test - With Image Chunking (Version 4)
 * Includes intelligent image chunking like the original OCR system
 */

import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import OpenAI from 'openai';

// Configuration with chunking parameters (from original OCR)
const config = {
  openaiApiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o',
  dpi: 150,
  maxPages: 5,
  
  // Chunking parameters (from original OCR/config.py)
  longSideMaxPx: 2048,      // LONG_SIDE_MAX_PX
  aspectTrigger: 2.7,       // ASPECT_TRIGGER - when to split horizontally vs vertically
  overlapPct: 0.05,         // OVERLAP_PCT - 5% overlap between chunks
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
}

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
async function chunkImage(imageBuffer: Buffer, pageNum: number): Promise<ImageChunk[]> {
  try {
    const { width, height } = await getImageDimensions(imageBuffer);
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
      }];
    }
    
    // Calculate aspect ratio
    const aspectRatio = width / height;
    console.log(`📊 Page ${pageNum} aspect ratio: ${aspectRatio.toFixed(2)}`);
    
    // Determine split direction based on aspect ratio (from original OCR logic)
    if (aspectRatio > config.aspectTrigger) {
      // Wide image - split horizontally
      console.log(`↔️  Page ${pageNum}: Wide image, splitting horizontally`);
      return await splitImageHorizontally(imageBuffer, width, height);
    } else {
      // Tall image - split vertically  
      console.log(`↕️  Page ${pageNum}: Tall image, splitting vertically`);
      return await splitImageVertically(imageBuffer, width, height);
    }
    
  } catch (error) {
    console.warn(`⚠️  Page ${pageNum}: Chunking failed, using original image:`, error);
    const { width, height } = await getImageDimensions(imageBuffer);
    return [{
      buffer: imageBuffer,
      width,
      height,
      x: 0,
      y: 0,
      chunkIndex: 0,
    }];
  }
}

/**
 * Split image horizontally with overlap (from original OCR)
 */
async function splitImageHorizontally(imageBuffer: Buffer, width: number, height: number): Promise<ImageChunk[]> {
  const sharp = await import('sharp');
  
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
async function splitImageVertically(imageBuffer: Buffer, width: number, height: number): Promise<ImageChunk[]> {
  const sharp = await import('sharp');
  
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
 * Extract text from image chunk using OpenAI Vision
 */
async function extractTextFromChunk(chunk: ImageChunk, pageNum: number): Promise<string> {
  try {
    console.log(`🔍 Processing page ${pageNum}, chunk ${chunk.chunkIndex + 1} with Vision API...`);
    
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
    
    console.log(`✅ Page ${pageNum}, Chunk ${chunk.chunkIndex + 1}: Extracted ${extractedText.length} characters`);
    console.log(`💰 Tokens used: ${response.usage?.total_tokens || 0}`);
    
    return extractedText;
    
  } catch (error) {
    console.error(`❌ Vision API failed for page ${pageNum}, chunk ${chunk.chunkIndex + 1}:`, error);
    return `[ERROR: Could not extract text from page ${pageNum}, chunk ${chunk.chunkIndex + 1}]`;
  }
}

/**
 * Process a single PDF file with chunking
 */
export async function processPDFSimple(pdfPath: string): Promise<string> {
  console.log(`\n🚀 Starting PDF processing with intelligent chunking: ${pdfPath}`);
  console.log('='.repeat(70));
  
  const startTime = Date.now();
  
  try {
    // Step 1: Convert PDF to images
    const images = await pdfToImages(pdfPath);
    
    // Step 2: Process each page with chunking
    const allPageTexts: string[] = [];
    let totalChunks = 0;
    let totalTokens = 0;
    
    for (let pageIndex = 0; pageIndex < images.length; pageIndex++) {
      const pageNum = pageIndex + 1;
      console.log(`\n📄 Processing page ${pageNum}/${images.length}...`);
      
      // Step 2a: Chunk the image intelligently
      const chunks = await chunkImage(images[pageIndex], pageNum);
      totalChunks += chunks.length;
      
      // Step 2b: Process each chunk with Vision API
      const chunkTexts: string[] = [];
      
      for (const chunk of chunks) {
        const chunkText = await extractTextFromChunk(chunk, pageNum);
        chunkTexts.push(chunkText);
        
        // Small delay between chunks to be respectful to API
        if (chunk.chunkIndex < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // Step 2c: Combine chunks for this page
      const pageText = chunkTexts.join('\n').trim();
      allPageTexts.push(pageText);
      
      console.log(`✅ Page ${pageNum} completed: ${pageText.length} characters from ${chunks.length} chunks`);
      
      // Delay between pages
      if (pageIndex < images.length - 1) {
        console.log(`⏳ Waiting 1 second before next page...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Step 3: Combine all page texts
    const fullText = allPageTexts.join('\n\n--- PAGE BREAK ---\n\n');
    
    const processingTime = Date.now() - startTime;
    
    console.log('\n' + '='.repeat(70));
    console.log('🎉 PDF PROCESSING WITH CHUNKING COMPLETED');
    console.log('='.repeat(70));
    console.log(`📊 Statistics:`);
    console.log(`   • Pages processed: ${images.length}`);
    console.log(`   • Total chunks: ${totalChunks}`);
    console.log(`   • Average chunks per page: ${(totalChunks / images.length).toFixed(1)}`);
    console.log(`   • Total characters: ${fullText.length}`);
    console.log(`   • Processing time: ${Math.round(processingTime / 1000)}s`);
    console.log(`   • Average per page: ${Math.round(processingTime / images.length / 1000)}s`);
    console.log(`   • Average per chunk: ${Math.round(processingTime / totalChunks / 1000)}s`);
    
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
    
    // Show chunking configuration
    console.log(`⚙️  Chunking Configuration:`);
    console.log(`   • Max dimension: ${config.longSideMaxPx}px`);
    console.log(`   • Aspect trigger: ${config.aspectTrigger}`);
    console.log(`   • Overlap: ${config.overlapPct * 100}%`);
    
    // Process the PDF
    const extractedText = await processPDFSimple(pdfPath);
    
    // Log the results
    console.log('\n' + '='.repeat(70));
    console.log('📄 EXTRACTED TEXT:');
    console.log('='.repeat(70));
    console.log(extractedText);
    console.log('\n' + '='.repeat(70));
    
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
    console.log('Usage: npm run test-ocr-v4 <filename.pdf>');
    console.log('Example: npm run test-ocr-v4 "Invoice_CW-2025-219_CoverWorks_Holly (1).pdf"');
    process.exit(1);
  }
  
  testPDFProcessing(filename);
}
