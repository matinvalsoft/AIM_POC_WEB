/**
 * PDF Processing utilities for OCR2
 * Handles PDF to image conversion using pdf-poppler for Node.js
 */

import { PDFProcessingError, ProcessedImage, PDFProcessingOptions } from './types';
import { getOCR2Settings } from './config';
import { createLogger } from './logger';

const logger = createLogger('PDFProcessor');
const settings = getOCR2Settings();

/**
 * Convert PDF buffer to images using pdf-poppler
 */
export async function pdfToImages(pdfBuffer: Buffer, options?: PDFProcessingOptions): Promise<ProcessedImage[]> {
  try {
    logger.info('Converting PDF to images', { bufferSize: pdfBuffer.length });

    // Import pdf-poppler dynamically since it's a Node.js specific package
    const pdfPoppler = await import('pdf-poppler');
    
    const convertOptions = {
      format: 'png' as const,
      out_dir: null, // Return buffers instead of writing to disk
      out_prefix: 'page',
      page: options?.startPage ? `${options.startPage}-${options.endPage || options.startPage}` : undefined,
      single_file: false,
      scale: settings.pdf.dpi / 72, // Convert DPI to scale factor (72 DPI is default)
    };

    // Convert PDF pages to image buffers
    const images = await pdfPoppler.convert(pdfBuffer, convertOptions);
    
    if (!images || images.length === 0) {
      throw new PDFProcessingError('No images extracted from PDF');
    }

    // Process each image and extract metadata
    const processedImages: ProcessedImage[] = [];
    
    for (let i = 0; i < Math.min(images.length, settings.pdf.maxPagesPerDoc); i++) {
      const imageBuffer = images[i];
      
      if (!imageBuffer) {
        logger.warn(`Skipping empty image at index ${i}`);
        continue;
      }

      // Get image metadata using sharp
      const sharp = await import('sharp');
      const metadata = await sharp.default(imageBuffer).metadata();
      
      processedImages.push({
        buffer: imageBuffer,
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'png',
      });
    }

    logger.info('PDF to images conversion completed', { 
      totalPages: images.length,
      processedPages: processedImages.length,
      maxPages: settings.pdf.maxPagesPerDoc
    });

    return processedImages;

  } catch (error) {
    logger.error('PDF to images conversion failed', { error: error instanceof Error ? error.message : String(error) });
    
    if (error instanceof PDFProcessingError) {
      throw error;
    }
    
    throw new PDFProcessingError(
      `Failed to convert PDF to images: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { originalError: error }
    );
  }
}

/**
 * Alternative PDF processing using pdf2pic (fallback)
 */
export async function pdfToImagesFallback(pdfBuffer: Buffer, options?: PDFProcessingOptions): Promise<ProcessedImage[]> {
  try {
    logger.info('Using fallback PDF conversion with pdf2pic');

    const pdf2pic = await import('pdf2pic');
    
    const convert = pdf2pic.fromBuffer(pdfBuffer, {
      density: settings.pdf.dpi,
      saveFilename: 'page',
      savePath: '/tmp', // We'll get buffers, not save to disk
      format: 'png',
      width: settings.chunking.longSideMaxPx,
      height: settings.chunking.longSideMaxPx,
    });

    const maxPages = Math.min(options?.maxPages || settings.pdf.maxPagesPerDoc, settings.pdf.maxPagesPerDoc);
    const processedImages: ProcessedImage[] = [];

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      try {
        const result = await convert(pageNum, { responseType: 'buffer' });
        
        if (result.buffer) {
          // Get image metadata
          const sharp = await import('sharp');
          const metadata = await sharp.default(result.buffer).metadata();
          
          processedImages.push({
            buffer: result.buffer,
            width: metadata.width || 0,
            height: metadata.height || 0,
            format: metadata.format || 'png',
          });
        }
      } catch (pageError) {
        logger.warn(`Failed to process page ${pageNum}`, { error: pageError });
        break; // Stop on first failed page
      }
    }

    logger.info('Fallback PDF conversion completed', { processedPages: processedImages.length });
    return processedImages;

  } catch (error) {
    throw new PDFProcessingError(
      `Fallback PDF conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { originalError: error }
    );
  }
}

/**
 * Extract text from PDF using pdf-parse (for text-based PDFs)
 */
export async function extractPDFText(pdfBuffer: Buffer): Promise<string> {
  try {
    logger.info('Extracting text from PDF');

    const pdfParse = await import('pdf-parse');
    const data = await pdfParse.default(pdfBuffer);
    
    logger.info('PDF text extraction completed', { 
      textLength: data.text.length,
      pages: data.numpages 
    });

    return data.text;

  } catch (error) {
    logger.warn('PDF text extraction failed, will use OCR instead', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return '';
  }
}

/**
 * Check if PDF has extractable text
 */
export async function hasPDFText(pdfBuffer: Buffer): Promise<boolean> {
  try {
    const text = await extractPDFText(pdfBuffer);
    return text.trim().length > 100; // Consider it text-based if more than 100 characters
  } catch {
    return false;
  }
}

/**
 * Download PDF from URL
 */
export async function downloadPDF(url: string): Promise<Buffer> {
  try {
    logger.info('Downloading PDF from URL', { url: url.substring(0, 50) + '...' });

    let pdfBuffer: Buffer;

    if (url.startsWith('data:')) {
      // Handle data URIs
      const [header, data] = url.split(',', 2);
      if (!header.includes('application/pdf') && !header.includes('base64')) {
        throw new PDFProcessingError('Invalid PDF data URI format');
      }
      pdfBuffer = Buffer.from(data, 'base64');
      logger.info('PDF loaded from data URI', { size: pdfBuffer.length });
    } else {
      // Regular URL - download
      const response = await fetch(url, { 
        method: 'GET',
        headers: {
          'User-Agent': 'OCR2-PDF-Processor/1.0',
        },
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      if (!response.ok) {
        throw new PDFProcessingError(`Failed to download PDF: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      pdfBuffer = Buffer.from(arrayBuffer);
      logger.info('PDF downloaded from URL', { size: pdfBuffer.length });
    }

    // Validate PDF header
    if (!pdfBuffer.subarray(0, 4).toString().startsWith('%PDF')) {
      throw new PDFProcessingError('Downloaded file is not a valid PDF');
    }

    return pdfBuffer;

  } catch (error) {
    if (error instanceof PDFProcessingError) {
      throw error;
    }
    
    throw new PDFProcessingError(
      `PDF download failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { originalError: error, url }
    );
  }
}
