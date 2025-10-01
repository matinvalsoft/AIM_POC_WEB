/**
 * Simple OCR2 Test - Direct PDF Processing (Version 2)
 * Fallback approach using direct PDF to Vision API
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import OpenAI from 'openai';

// Simple configuration
const config = {
  openaiApiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o',
};

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.openaiApiKey,
});

/**
 * Try to extract text directly from PDF first
 */
async function extractPDFText(pdfPath: string): Promise<string | null> {
  try {
    console.log(`📄 Attempting text extraction from PDF...`);
    
    const pdfParse = await import('pdf-parse');
    const pdfBuffer = readFileSync(pdfPath);
    
    const data = await pdfParse.default(pdfBuffer);
    
    if (data.text && data.text.trim().length > 50) {
      console.log(`✅ Found extractable text: ${data.text.length} characters`);
      return data.text;
    } else {
      console.log(`ℹ️  PDF has minimal text (${data.text.length} chars), will use OCR`);
      return null;
    }
    
  } catch (error) {
    console.log(`ℹ️  Text extraction failed: ${error.message}`);
    return null;
  }
}

/**
 * Process PDF directly with Vision API (PDF as base64)
 */
async function processPDFWithVision(pdfPath: string): Promise<string> {
  try {
    console.log(`🔍 Processing PDF directly with Vision API...`);
    
    const pdfBuffer = readFileSync(pdfPath);
    const base64PDF = pdfBuffer.toString('base64');
    const dataUri = `data:application/pdf;base64,${base64PDF}`;
    
    console.log(`📊 PDF size: ${Math.round(pdfBuffer.length / 1024)}KB`);
    
    const response = await openai.chat.completions.create({
      model: config.model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract all text from this PDF document. Preserve the original formatting, spacing, and layout as much as possible. Include all visible text including headers, footers, tables, and any annotations. Return only the extracted text with no additional commentary.',
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
    
    console.log(`✅ Vision API: Extracted ${extractedText.length} characters`);
    console.log(`💰 Tokens used: ${response.usage?.total_tokens || 0}`);
    
    return extractedText;
    
  } catch (error) {
    console.error(`❌ Vision API failed:`, error);
    throw error;
  }
}

/**
 * Process a single PDF file with smart approach
 */
export async function processPDFSimple(pdfPath: string): Promise<string> {
  console.log(`\n🚀 Starting simple PDF processing: ${pdfPath}`);
  console.log('='.repeat(60));
  
  const startTime = Date.now();
  
  try {
    // Step 1: Try text extraction first (fast path)
    const directText = await extractPDFText(pdfPath);
    
    if (directText) {
      const processingTime = Date.now() - startTime;
      
      console.log('\n' + '='.repeat(60));
      console.log('🎉 PDF PROCESSING COMPLETED (TEXT EXTRACTION)');
      console.log('='.repeat(60));
      console.log(`📊 Statistics:`);
      console.log(`   • Method: Direct text extraction`);
      console.log(`   • Total characters: ${directText.length}`);
      console.log(`   • Processing time: ${Math.round(processingTime / 1000)}s`);
      console.log(`   • Cost: $0.00 (no API calls)`);
      
      return directText;
    }
    
    // Step 2: Use Vision API for OCR (image-based PDFs)
    console.log(`🤖 Using AI OCR with Vision API...`);
    const ocrText = await processPDFWithVision(pdfPath);
    
    const processingTime = Date.now() - startTime;
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 PDF PROCESSING COMPLETED (OCR)');
    console.log('='.repeat(60));
    console.log(`📊 Statistics:`);
    console.log(`   • Method: AI OCR (Vision API)`);
    console.log(`   • Total characters: ${ocrText.length}`);
    console.log(`   • Processing time: ${Math.round(processingTime / 1000)}s`);
    
    return ocrText;
    
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
    console.log('Usage: npm run test-ocr-v2 <filename.pdf>');
    console.log('Example: npm run test-ocr-v2 "Invoice_CW-2025-219_CoverWorks_Holly (1).pdf"');
    process.exit(1);
  }
  
  testPDFProcessing(filename);
}
