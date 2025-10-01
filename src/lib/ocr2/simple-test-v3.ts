/**
 * Simple OCR2 Test - Using system poppler tools
 * Convert PDF to PNG using command line, then use Vision API
 */

import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import OpenAI from 'openai';

// Simple configuration
const config = {
  openaiApiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o',
  dpi: 150,
  maxPages: 5,
};

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.openaiApiKey,
});

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
 * Extract text from image using OpenAI Vision
 */
async function extractTextFromImage(imageBuffer: Buffer, pageNum: number): Promise<string> {
  try {
    console.log(`🔍 Processing page ${pageNum} with Vision API...`);
    
    // Convert to base64
    const base64Image = imageBuffer.toString('base64');
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
    
    console.log(`✅ Page ${pageNum}: Extracted ${extractedText.length} characters`);
    console.log(`💰 Tokens used: ${response.usage?.total_tokens || 0}`);
    
    return extractedText;
    
  } catch (error) {
    console.error(`❌ Vision API failed for page ${pageNum}:`, error);
    return `[ERROR: Could not extract text from page ${pageNum}]`;
  }
}

/**
 * Process a single PDF file
 */
export async function processPDFSimple(pdfPath: string): Promise<string> {
  console.log(`\n🚀 Starting simple PDF processing: ${pdfPath}`);
  console.log('='.repeat(60));
  
  const startTime = Date.now();
  
  try {
    // Step 1: Convert PDF to images
    const images = await pdfToImages(pdfPath);
    
    // Step 2: Process each page with Vision API
    const pageTexts: string[] = [];
    let totalTokens = 0;
    
    for (let i = 0; i < images.length; i++) {
      const pageText = await extractTextFromImage(images[i], i + 1);
      pageTexts.push(pageText);
      
      // Add a small delay to be respectful to the API
      if (i < images.length - 1) {
        console.log(`⏳ Waiting 1 second before next page...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Step 3: Combine all page texts
    const fullText = pageTexts.join('\n\n--- PAGE BREAK ---\n\n');
    
    const processingTime = Date.now() - startTime;
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 PDF PROCESSING COMPLETED');
    console.log('='.repeat(60));
    console.log(`📊 Statistics:`);
    console.log(`   • Pages processed: ${images.length}`);
    console.log(`   • Total characters: ${fullText.length}`);
    console.log(`   • Processing time: ${Math.round(processingTime / 1000)}s`);
    console.log(`   • Average per page: ${Math.round(processingTime / images.length / 1000)}s`);
    
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
    
    // Process the PDF
    const extractedText = await processPDFSimple(pdfPath);
    
    // Log the results
    console.log('\n' + '='.repeat(60));
    console.log('📄 EXTRACTED TEXT:');
    console.log('='.repeat(60));
    console.log(extractedText);
    console.log('\n' + '='.repeat(60));
    
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
    console.log('Usage: npm run test-ocr-v3 <filename.pdf>');
    console.log('Example: npm run test-ocr-v3 "Invoice_CW-2025-219_CoverWorks_Holly (1).pdf"');
    process.exit(1);
  }
  
  testPDFProcessing(filename);
}
