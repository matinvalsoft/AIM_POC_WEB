/**
 * Test Clean Orchestrator
 * Simple demonstration of the clean orchestrator functionality
 */

import { join } from 'path';
import { readFileSync, existsSync } from 'fs';
import { processPDFFromURL, processDocument } from './orchestrator-clean';

/**
 * Test the clean orchestrator with a local PDF file
 */
async function testCleanOrchestrator(pdfFileName: string) {
  const pdfPath = join(process.cwd(), 'PDFs', pdfFileName);
  
  console.log(`🧪 Testing Clean Orchestrator`);
  console.log(`📁 PDF File: ${pdfFileName}`);
  console.log('='.repeat(60));
  
  // Check if file exists
  if (!existsSync(pdfPath)) {
    console.error(`❌ PDF file not found: ${pdfPath}`);
    process.exit(1);
  }
  
  const fileSize = Math.round(readFileSync(pdfPath).length / 1024);
  console.log(`✅ Found PDF file (${fileSize}KB)`);
  
  try {
    // Create a file:// URL for local testing
    const fileUrl = `file://${pdfPath}`;
    
    console.log(`\n🔄 Starting OCR processing...`);
    
    // Process the document
    const extractedText = await processPDFFromURL(fileUrl);
    
    console.log('\n' + '='.repeat(60));
    console.log('📄 FINAL EXTRACTED TEXT:');
    console.log('='.repeat(60));
    console.log(extractedText);
    console.log('\n' + '='.repeat(60));
    console.log('✅ Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Main execution
if (require.main === module) {
  const pdfFileName = process.argv[2];
  
  if (!pdfFileName) {
    console.error('❌ Please provide a PDF filename');
    console.log('Usage: tsx src/lib/ocr2/test-clean-orchestrator.ts <filename.pdf>');
    console.log('Example: tsx src/lib/ocr2/test-clean-orchestrator.ts "2100593144.pdf"');
    process.exit(1);
  }
  
  testCleanOrchestrator(pdfFileName);
}





