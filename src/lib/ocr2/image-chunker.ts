/**
 * Image Chunking utilities for OCR2
 * Splits large images into smaller chunks for better OCR processing
 */

import { ProcessedImage, ImageChunk } from './types';
import { getOCR2Settings } from './config';
import { createLogger } from './logger';

const logger = createLogger('ImageChunker');
const settings = getOCR2Settings();

/**
 * Split image into chunks for optimal OCR processing
 */
export async function chunkImage(image: ProcessedImage, pageIndex: number = 0): Promise<ImageChunk[]> {
  try {
    logger.info('Chunking image', { 
      width: image.width, 
      height: image.height, 
      pageIndex 
    });

    const { width, height } = image;

    // If image is small enough, return as single chunk
    if (width <= settings.chunking.longSideMaxPx && height <= settings.chunking.longSideMaxPx) {
      logger.info('Image is small enough, returning as single chunk');
      return [{
        data: image.buffer,
        width,
        height,
        x: 0,
        y: 0,
        chunkIndex: 0,
      }];
    }

    const aspectRatio = width / height;
    const chunks: ImageChunk[] = [];

    if (aspectRatio > settings.chunking.aspectTrigger) {
      // Wide image - split horizontally
      logger.info('Splitting wide image horizontally', { aspectRatio });
      return await splitImageHorizontally(image);
    } else {
      // Tall image - split vertically
      logger.info('Splitting tall image vertically', { aspectRatio });
      return await splitImageVertically(image);
    }

  } catch (error) {
    logger.error('Image chunking failed', { 
      error: error instanceof Error ? error.message : String(error),
      pageIndex 
    });
    
    // Return original image as fallback
    return [{
      data: image.buffer,
      width: image.width,
      height: image.height,
      x: 0,
      y: 0,
      chunkIndex: 0,
    }];
  }
}

/**
 * Split image horizontally with overlap
 */
async function splitImageHorizontally(image: ProcessedImage): Promise<ImageChunk[]> {
  const sharp = await import('sharp');
  const { width, height } = image;
  
  const chunkWidth = Math.min(width, settings.chunking.longSideMaxPx);
  const overlapPixels = Math.floor(chunkWidth * settings.chunking.overlapPct);
  
  const chunks: ImageChunk[] = [];
  let x = 0;
  let chunkIndex = 0;

  while (x < width) {
    const endX = Math.min(x + chunkWidth, width);
    const actualWidth = endX - x;
    
    try {
      // Extract chunk using sharp
      const chunkBuffer = await sharp.default(image.buffer)
        .extract({ 
          left: x, 
          top: 0, 
          width: actualWidth, 
          height: height 
        })
        .png()
        .toBuffer();

      chunks.push({
        data: chunkBuffer,
        width: actualWidth,
        height: height,
        x,
        y: 0,
        chunkIndex,
      });

      logger.debug('Created horizontal chunk', { 
        chunkIndex, 
        x, 
        width: actualWidth, 
        height 
      });

      // Move to next chunk with overlap
      x = endX - overlapPixels;
      chunkIndex++;

      // Stop if we're at the end
      if (x >= width - overlapPixels) {
        break;
      }

    } catch (error) {
      logger.warn('Failed to create chunk, skipping', { x, chunkIndex, error });
      x = endX; // Skip this chunk and continue
    }
  }

  logger.info('Horizontal splitting completed', { totalChunks: chunks.length });
  return chunks;
}

/**
 * Split image vertically with overlap
 */
async function splitImageVertically(image: ProcessedImage): Promise<ImageChunk[]> {
  const sharp = await import('sharp');
  const { width, height } = image;
  
  const chunkHeight = Math.min(height, settings.chunking.longSideMaxPx);
  const overlapPixels = Math.floor(chunkHeight * settings.chunking.overlapPct);
  
  const chunks: ImageChunk[] = [];
  let y = 0;
  let chunkIndex = 0;

  while (y < height) {
    const endY = Math.min(y + chunkHeight, height);
    const actualHeight = endY - y;
    
    try {
      // Extract chunk using sharp
      const chunkBuffer = await sharp.default(image.buffer)
        .extract({ 
          left: 0, 
          top: y, 
          width: width, 
          height: actualHeight 
        })
        .png()
        .toBuffer();

      chunks.push({
        data: chunkBuffer,
        width: width,
        height: actualHeight,
        x: 0,
        y,
        chunkIndex,
      });

      logger.debug('Created vertical chunk', { 
        chunkIndex, 
        y, 
        width, 
        height: actualHeight 
      });

      // Move to next chunk with overlap
      y = endY - overlapPixels;
      chunkIndex++;

      // Stop if we're at the end
      if (y >= height - overlapPixels) {
        break;
      }

    } catch (error) {
      logger.warn('Failed to create chunk, skipping', { y, chunkIndex, error });
      y = endY; // Skip this chunk and continue
    }
  }

  logger.info('Vertical splitting completed', { totalChunks: chunks.length });
  return chunks;
}

/**
 * Resize image if it's too large for vision API
 */
export async function resizeImageForVision(imageBuffer: Buffer): Promise<Buffer> {
  try {
    const sharp = await import('sharp');
    
    const metadata = await sharp.default(imageBuffer).metadata();
    const { width = 0, height = 0 } = metadata;
    
    // Check if resize is needed
    const maxDimension = Math.max(width, height);
    if (maxDimension <= settings.chunking.longSideMaxPx) {
      return imageBuffer; // No resize needed
    }
    
    // Calculate new dimensions maintaining aspect ratio
    const scale = settings.chunking.longSideMaxPx / maxDimension;
    const newWidth = Math.floor(width * scale);
    const newHeight = Math.floor(height * scale);
    
    logger.info('Resizing image for vision API', {
      originalSize: `${width}x${height}`,
      newSize: `${newWidth}x${newHeight}`,
      scale
    });
    
    const resizedBuffer = await sharp.default(imageBuffer)
      .resize(newWidth, newHeight, {
        kernel: sharp.default.kernel.lanczos3,
        withoutEnlargement: true,
      })
      .png({ quality: 95 })
      .toBuffer();
    
    return resizedBuffer;
    
  } catch (error) {
    logger.warn('Image resize failed, using original', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return imageBuffer;
  }
}

/**
 * Convert image chunk to base64 data URI for API calls
 */
export function imageChunkToDataURI(chunk: ImageChunk): string {
  const base64 = chunk.data.toString('base64');
  return `data:image/png;base64,${base64}`;
}

/**
 * Get optimal chunk size based on image dimensions
 */
export function getOptimalChunkSize(width: number, height: number): { chunkWidth: number; chunkHeight: number; strategy: 'horizontal' | 'vertical' | 'single' } {
  // If image fits within limits, no chunking needed
  if (width <= settings.chunking.longSideMaxPx && height <= settings.chunking.longSideMaxPx) {
    return {
      chunkWidth: width,
      chunkHeight: height,
      strategy: 'single'
    };
  }

  const aspectRatio = width / height;

  if (aspectRatio > settings.chunking.aspectTrigger) {
    // Wide image - horizontal chunking
    return {
      chunkWidth: Math.min(width, settings.chunking.longSideMaxPx),
      chunkHeight: height,
      strategy: 'horizontal'
    };
  } else {
    // Tall image - vertical chunking
    return {
      chunkWidth: width,
      chunkHeight: Math.min(height, settings.chunking.longSideMaxPx),
      strategy: 'vertical'
    };
  }
}
