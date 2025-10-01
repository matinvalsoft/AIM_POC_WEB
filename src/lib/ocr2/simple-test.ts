/**
 * Simple OCR2 Test - Direct PDF Processing
 * Process PDFs from the PDFs folder using Vision API only
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import OpenAI from 'openai';

// Simple configuration
const config = {
  openaiApiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o',
  pdfDpi: 150,
  maxPages: 10,
};

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.openaiApiKey,
});

/**
 * Convert PDF to images using pdf-poppler
 */
async function pdfToImages(pdfPath: string): Promise<Buffer[]> {
  try {
    console.log(`📄 Converting PDF to images: ${pdfPath}`);
    
    const pdfBuffer = readFileSync(pdfPath);
    
    // Try pdf-poppler
    try {
      const pdfPoppler = await import('pdf-poppler');
      
      const options = {
        format: 'png' as const,
        out_dir: null, // Return buffers
        out_prefix: 'page',
        page: null,
        single_file: false,
        scale: config.pdfDpi / 72, // Convert DPI to scale
      };

      console.log(`🖼️  Converting PDF with pdf-poppler...`);
      const images = await pdfPoppler.convert(pdfBuffer, options);
      
      if (!images || images.length === 0) {
        throw new Error('No images returned from pdf-poppler');
      }

      console.log(`✅ PDF conversion completed: ${images.length} pages`);
      
      // Convert to proper buffers and log sizes
      const imageBuffers: Buffer[] = [];
      for (let i = 0; i < images.length; i++) {
        const imageBuffer = Buffer.isBuffer(images[i]) ? images[i] : Buffer.from(images[i]);
        imageBuffers.push(imageBuffer);
        console.log(`   Page ${i + 1}: ${Math.round(imageBuffer.length / 1024)}KB`);
      }
      
      return imageBuffers;
      
    } catch (popplerError) {
      console.log(`⚠️  pdf-poppler failed: ${popplerError.message}`);
      console.log(`🔄 Trying fallback method...`);
      
      // Fallback to pdf2pic
      const pdf2pic = await import('pdf2pic');
      
      const convert = pdf2pic.fromBuffer(pdfBuffer, {
        density: config.pdfDpi,
        saveFilename: 'page',
        savePath: '/tmp',
        format: 'png',
        width: 2048,
        height: 2048,
      });

      const images: Buffer[] = [];
      
      // Convert pages one by one
      for (let pageNum = 1; pageNum <= config.maxPages; pageNum++) {
        try {
          console.log(`🖼️  Converting page ${pageNum}...`);
          const result = await convert(pageNum, { responseType: 'buffer' });
          
          if (result.buffer) {
            images.push(result.buffer);
            console.log(`✅ Page ${pageNum} converted (${Math.round(result.buffer.length / 1024)}KB)`);
          } else {
            console.log(`ℹ️  No more pages after page ${pageNum - 1}`);
            break;
          }
        } catch (pageError) {
          console.log(`ℹ️  Finished converting at page ${pageNum - 1} (no more pages)`);
          break;
        }
      }

      if (images.length === 0) {
        throw new Error('Both pdf-poppler and pdf2pic failed to extract images');
      }

      console.log(`✅ Fallback PDF conversion completed: ${images.length} pages`);
      return images;
    }
    
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
    
    if (images.length === 0) {
      throw new Error('No images extracted from PDF');
    }
    
    // Step 2: Process each page with Vision API
    const pageTexts: string[] = [];
    
    for (let i = 0; i < images.length; i++) {
      const pageText = await extractTextFromImage(images[i], i + 1);
      pageTexts.push(pageText);
      
      // Add a small delay to be respectful to the API
      if (i < images.length - 1) {
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
      readFileSync(pdfPath);
      console.log(`✅ Found PDF file: ${filename}`);
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
    console.log('Usage: npm run test-ocr <filename.pdf>');
    console.log('Example: npm run test-ocr "Invoice_CW-2025-219_CoverWorks_Holly (1).pdf"');
    process.exit(1);
  }
  
  testPDFProcessing(filename);
}
