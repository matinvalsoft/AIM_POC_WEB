/**
 * OCR2 Test Runner
 * Simple script to test PDF processing
 */

import { testPDFProcessing } from './simple-test';

async function main() {
  const filename = process.argv[2];
  
  if (!filename) {
    console.error('❌ Please provide a PDF filename');
    console.log('Usage: npx tsx src/lib/ocr2/test-runner.ts <filename.pdf>');
    console.log('Example: npx tsx src/lib/ocr2/test-runner.ts "Invoice_CW-2025-219_CoverWorks_Holly (1).pdf"');
    process.exit(1);
  }
  
  // Check environment
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY environment variable is required');
    console.log('Make sure your .env.local file contains your OpenAI API key');
    process.exit(1);
  }
  
  console.log('🧪 OCR2 Simple Test Runner');
  console.log(`🔑 Using OpenAI API key: ${process.env.OPENAI_API_KEY.substring(0, 20)}...`);
  
  await testPDFProcessing(filename);
}

main().catch(console.error);
