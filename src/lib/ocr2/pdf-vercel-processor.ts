/**
 * Vercel-Compatible PDF Processing
 * Uses pure JavaScript PDF libraries that work in serverless environments
 * No system dependencies required (no pdftoppm/poppler needed)
 */

import { createLogger } from './logger';

const logger = createLogger('PDFVercelProcessor');

interface PDFToImageOptions {
  dpi?: number;
  maxPages?: number;
}

/**
 * Convert PDF buffer to images using pdf.js (mozilla's pdf library)
 * This works in serverless environments without system dependencies
 */
export async function pdfToImagesVercel(
  pdfBuffer: Buffer,
  options: PDFToImageOptions = {}
): Promise<Buffer[]> {
  const dpi = options.dpi || 300;
  const maxPages = options.maxPages || 50;

  try {
    logger.info('Converting PDF to images using pdf.js (Vercel-compatible)', {
      bufferSize: pdfBuffer.length,
      dpi,
      maxPages,
    });

    // Import pdfjs-dist dynamically
    const pdfjsLib = await import('pdfjs-dist');
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(pdfBuffer),
      verbosity: 0, // Suppress console logs
    });
    
    const pdfDoc = await loadingTask.promise;
    const numPages = Math.min(pdfDoc.numPages, maxPages);
    
    logger.info(`PDF loaded successfully. Processing ${numPages} pages...`);

    const imageBuffers: Buffer[] = [];

    // Process each page
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      try {
        const page = await pdfDoc.getPage(pageNum);
        
        // Calculate viewport with desired DPI
        // Standard PDF is 72 DPI, so scale = desiredDPI / 72
        const scale = dpi / 72;
        const viewport = page.getViewport({ scale });

        // Create canvas using node-canvas
        const { createCanvas } = await import('canvas');
        const canvas = createCanvas(viewport.width, viewport.height);
        const context = canvas.getContext('2d');

        // Render PDF page to canvas
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;

        // Convert canvas to PNG buffer
        const imageBuffer = canvas.toBuffer('image/png');
        imageBuffers.push(imageBuffer);

        logger.info(`Page ${pageNum}/${numPages} converted`, {
          size: `${Math.round(imageBuffer.length / 1024)}KB`,
          dimensions: `${viewport.width}x${viewport.height}px`,
        });

        // Clean up
        page.cleanup();
      } catch (pageError) {
        logger.error(`Failed to process page ${pageNum}`, {
          error: pageError instanceof Error ? pageError.message : String(pageError),
        });
        throw pageError;
      }
    }

    logger.info('PDF conversion completed', { totalPages: imageBuffers.length });
    return imageBuffers;
  } catch (error) {
    logger.error('PDF conversion failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(
      `Vercel PDF conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Fallback method using pdf2pic (GraphicsMagick/ImageMagick based)
 * May work in some serverless environments if the runtime has gm/convert
 */
export async function pdfToImagesPdf2pic(
  pdfBuffer: Buffer,
  options: PDFToImageOptions = {}
): Promise<Buffer[]> {
  const dpi = options.dpi || 300;
  const maxPages = options.maxPages || 50;

  try {
    logger.info('Converting PDF using pdf2pic (fallback method)');

    const pdf2pic = await import('pdf2pic');
    const fs = await import('fs');
    const path = await import('path');

    // Create temp directory for pdf2pic
    const tempDir = '/tmp/pdf2pic-' + Date.now();
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const convert = pdf2pic.fromBuffer(pdfBuffer, {
      density: dpi,
      saveFilename: 'page',
      savePath: tempDir,
      format: 'png',
      width: 2048,
      height: 2048,
    });

    const imageBuffers: Buffer[] = [];

    // Convert pages one by one
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      try {
        logger.info(`Converting page ${pageNum}...`);
        const result = await convert(pageNum, { responseType: 'buffer' });

        if (result.buffer) {
          imageBuffers.push(result.buffer);
          logger.info(`Page ${pageNum} converted`, {
            size: `${Math.round(result.buffer.length / 1024)}KB`,
          });
        } else {
          logger.info(`No more pages after page ${pageNum - 1}`);
          break;
        }
      } catch (pageError: any) {
        if (pageError.message?.includes('page') || pageError.message?.includes('range')) {
          logger.info(`Finished converting at page ${pageNum - 1} (no more pages)`);
          break;
        }
        throw pageError;
      }
    }

    // Clean up temp directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }

    if (imageBuffers.length === 0) {
      throw new Error('No images were generated from PDF');
    }

    logger.info('pdf2pic conversion completed', { totalPages: imageBuffers.length });
    return imageBuffers;
  } catch (error) {
    logger.error('pdf2pic conversion failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error(
      `pdf2pic conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Smart PDF processor that tries multiple methods in order
 * 1. pdf.js (most reliable for serverless)
 * 2. pdf2pic (fallback if pdf.js fails)
 */
export async function pdfToImagesAuto(
  pdfBuffer: Buffer,
  options: PDFToImageOptions = {}
): Promise<Buffer[]> {
  const errors: Array<{ method: string; error: string }> = [];

  // Try pdf.js first (most reliable for serverless)
  try {
    logger.info('Attempting PDF conversion with pdf.js...');
    return await pdfToImagesVercel(pdfBuffer, options);
  } catch (pdfjsError) {
    const errorMsg = pdfjsError instanceof Error ? pdfjsError.message : String(pdfjsError);
    logger.warn('pdf.js conversion failed, trying fallback', { error: errorMsg });
    errors.push({ method: 'pdf.js', error: errorMsg });
  }

  // Try pdf2pic as fallback
  try {
    logger.info('Attempting PDF conversion with pdf2pic...');
    return await pdfToImagesPdf2pic(pdfBuffer, options);
  } catch (pdf2picError) {
    const errorMsg = pdf2picError instanceof Error ? pdf2picError.message : String(pdf2picError);
    logger.warn('pdf2pic conversion failed', { error: errorMsg });
    errors.push({ method: 'pdf2pic', error: errorMsg });
  }

  // All methods failed
  logger.error('All PDF conversion methods failed', { errors });
  throw new Error(
    `PDF conversion failed. Tried ${errors.length} methods: ` +
      errors.map((e) => `${e.method} (${e.error})`).join(', ')
  );
}

