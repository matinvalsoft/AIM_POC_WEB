/**
 * Test pdfjs-dist + canvas locally
 * This is the approach that will work on Vercel
 * Run: node test-pdfjs.js
 */

const fs = require('fs');
const path = require('path');

async function testPdfjs() {
  console.log('🧪 Testing pdfjs-dist + canvas PDF conversion...\n');

  try {
    // Import pdfjs-dist
    console.log('📦 Importing pdfjs-dist...');
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    console.log('✅ pdfjs-dist imported successfully');

    // Import canvas
    console.log('📦 Importing @napi-rs/canvas...');
    const { createCanvas, Image: CanvasImage, DOMMatrix, ImageData, Path2D } = require('@napi-rs/canvas');
    console.log('✅ @napi-rs/canvas imported successfully\n');

    // Polyfill globals for pdfjs
    if (typeof global.Image === 'undefined') {
      global.Image = CanvasImage;
    }
    if (typeof global.DOMMatrix === 'undefined') {
      global.DOMMatrix = DOMMatrix;
    }
    if (typeof global.ImageData === 'undefined') {
      global.ImageData = ImageData;
    }
    if (typeof global.Path2D === 'undefined') {
      global.Path2D = Path2D;
    }

    // Setup canvas factory for pdfjs
    class NodeCanvasFactory {
      create(width, height) {
        const canvas = createCanvas(width, height);
        return {
          canvas,
          context: canvas.getContext('2d'),
        };
      }

      reset(canvasAndContext, width, height) {
        canvasAndContext.canvas.width = width;
        canvasAndContext.canvas.height = height;
      }

      destroy(canvasAndContext) {
        canvasAndContext.canvas.width = 0;
        canvasAndContext.canvas.height = 0;
        canvasAndContext.canvas = null;
        canvasAndContext.context = null;
      }
    }

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

    // Load PDF
    console.log('📖 Loading PDF document...');
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(pdfBuffer),
      verbosity: 0,
      useSystemFonts: true,
    });
    
    const pdfDoc = await loadingTask.promise;
    console.log(`✅ PDF loaded: ${pdfDoc.numPages} pages\n`);

    const dpi = 300;
    const scale = dpi / 72;
    const canvasFactory = new NodeCanvasFactory();

    // Convert first page
    console.log('🖼️  Converting page 1...');
    const startTime = Date.now();
    
    const page = await pdfDoc.getPage(1);
    const viewport = page.getViewport({ scale });
    
    console.log(`   Dimensions: ${Math.round(viewport.width)}x${Math.round(viewport.height)}px`);

    // Create canvas
    const canvasAndContext = canvasFactory.create(viewport.width, viewport.height);

    // Render PDF page to canvas
    await page.render({
      canvasContext: canvasAndContext.context,
      viewport: viewport,
      canvasFactory,
    }).promise;

    // Convert to PNG buffer
    const imageBuffer = canvasAndContext.canvas.toBuffer('image/png');
    const elapsed = Date.now() - startTime;

    console.log(`✅ Page 1 converted successfully!`);
    console.log(`   Size: ${Math.round(imageBuffer.length / 1024)}KB`);
    console.log(`   Time: ${elapsed}ms`);
    
    // Save to file
    const outputPath = path.join(__dirname, 'test-pdfjs-output-page-1.png');
    fs.writeFileSync(outputPath, imageBuffer);
    console.log(`   💾 Saved to: ${outputPath}`);
    console.log('');

    // Clean up
    canvasFactory.destroy(canvasAndContext);
    page.cleanup();

    // Try page 2 if it exists
    if (pdfDoc.numPages >= 2) {
      console.log('🖼️  Converting page 2...');
      const page2 = await pdfDoc.getPage(2);
      const viewport2 = page2.getViewport({ scale });
      
      const canvasAndContext2 = canvasFactory.create(viewport2.width, viewport2.height);
      
      await page2.render({
        canvasContext: canvasAndContext2.context,
        viewport: viewport2,
        canvasFactory,
      }).promise;
      
      const imageBuffer2 = canvasAndContext2.canvas.toBuffer('image/png');
      console.log(`✅ Page 2 converted successfully!`);
      console.log(`   Size: ${Math.round(imageBuffer2.length / 1024)}KB`);
      
      const outputPath2 = path.join(__dirname, 'test-pdfjs-output-page-2.png');
      fs.writeFileSync(outputPath2, imageBuffer2);
      console.log(`   💾 Saved to: ${outputPath2}`);
      
      canvasFactory.destroy(canvasAndContext2);
      page2.cleanup();
    }

    console.log('');
    console.log('🎉 pdfjs-dist test completed successfully!');
    console.log('✅ This method will work on Vercel serverless environment');

  } catch (error) {
    console.error('❌ pdfjs-dist test failed:', error.message);
    console.error('');
    console.error('📋 Error details:', error);
    console.error('Stack:', error.stack);
  }
}

testPdfjs();

