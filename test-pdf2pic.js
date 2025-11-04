/**
 * Test pdf2pic locally
 * Run: node test-pdf2pic.js
 */

const fs = require('fs');
const path = require('path');

async function testPdf2pic() {
  console.log('🧪 Testing pdf2pic PDF conversion...\n');

  try {
    // Import pdf2pic
    console.log('📦 Importing pdf2pic...');
    const pdf2pic = require('pdf2pic');
    console.log('✅ pdf2pic imported successfully\n');

    // Find a test PDF
    let testPdfPath = path.join(__dirname, 'test-invoice.pdf');
    
    if (!fs.existsSync(testPdfPath)) {
      // Try using a PDF from node_modules for testing
      testPdfPath = path.join(__dirname, 'node_modules/pdf-parse/test/data/01-valid.pdf');
      if (!fs.existsSync(testPdfPath)) {
        console.log('❌ Test PDF not found');
        console.log('💡 Please place a test PDF file named "test-invoice.pdf" in the project root');
        return;
      }
      console.log('ℹ️  Using test PDF from node_modules');
    }

    console.log('📄 Test PDF found:', testPdfPath);
    const pdfBuffer = fs.readFileSync(testPdfPath);
    console.log(`📏 PDF size: ${Math.round(pdfBuffer.length / 1024)}KB\n`);

    // Configure pdf2pic
    const options = {
      density: 300,           // DPI
      saveFilename: 'test_page',
      savePath: './tmp',      // Temp directory
      format: 'png',
      width: 2048,
      height: 2048,
    };

    console.log('⚙️  Configuration:', options);
    console.log('');

    // Create converter from buffer
    const convert = pdf2pic.fromBuffer(pdfBuffer, options);

    // Try to convert first page
    console.log('🖼️  Converting page 1...');
    const startTime = Date.now();
    
    const result = await convert(1, { responseType: 'buffer' });
    
    const elapsed = Date.now() - startTime;

    if (result.buffer) {
      console.log(`✅ Page 1 converted successfully!`);
      console.log(`   Size: ${Math.round(result.buffer.length / 1024)}KB`);
      console.log(`   Time: ${elapsed}ms`);
      console.log(`   Name: ${result.name}`);
      console.log(`   Page: ${result.page}`);
      
      // Save to file for inspection
      const outputPath = path.join(__dirname, 'test-output-page-1.png');
      fs.writeFileSync(outputPath, result.buffer);
      console.log(`   💾 Saved to: ${outputPath}`);
      console.log('');
      
      // Try converting page 2 (if exists)
      console.log('🖼️  Trying page 2...');
      try {
        const result2 = await convert(2, { responseType: 'buffer' });
        if (result2.buffer) {
          console.log(`✅ Page 2 converted successfully!`);
          console.log(`   Size: ${Math.round(result2.buffer.length / 1024)}KB`);
          
          const outputPath2 = path.join(__dirname, 'test-output-page-2.png');
          fs.writeFileSync(outputPath2, result2.buffer);
          console.log(`   💾 Saved to: ${outputPath2}`);
        }
      } catch (page2Error) {
        console.log(`ℹ️  Page 2 not available (single-page PDF or error)`);
      }
      
      console.log('');
      console.log('🎉 pdf2pic test completed successfully!');
      console.log('✅ pdf2pic is working and can be used for Vercel deployment');
      
    } else {
      console.log('❌ No buffer returned from conversion');
    }

  } catch (error) {
    console.error('❌ pdf2pic test failed:', error.message);
    console.error('');
    console.error('📋 Error details:', error);
    console.error('');
    
    if (error.message?.includes('gm') || error.message?.includes('convert')) {
      console.error('💡 Possible fix: Install GraphicsMagick or ImageMagick');
      console.error('   macOS: brew install graphicsmagick');
      console.error('   or:    brew install imagemagick');
      console.error('');
      console.error('   Note: pdf2pic requires GraphicsMagick or ImageMagick to be installed');
    }
  }
}

testPdf2pic();

