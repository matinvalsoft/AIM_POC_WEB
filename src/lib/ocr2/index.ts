/**
 * OCR2 Library - Main Exports
 * TypeScript-based OCR processing for Next.js applications
 */

// Core configuration
export { getOCR2Settings, validateSettings } from './config';

// Type definitions
export type {
  OCR2Settings,
  ImageChunk,
  ProcessedImage,
  OCRResult,
  ChunkOCRResult,
  PDFProcessingOptions,
  PDFProcessingResult,
  PageProcessingResult,
  ProcessingSummary,
  InvoiceData,
  StructuredExtractionResult,
  ProcessFileRequest,
  ProcessFileResponse,
  AirtableFileRecord,
  AirtableUpdateData,
  Logger,
  LogEntry,
  OCRError,
  PDFProcessingError,
  VisionAPIError,
  AirtableUpdateError,
} from './types';

// PDF processing utilities
export {
  pdfToImagesFallback,
  extractPDFText,
  hasPDFText,
} from './pdf-processor';

// Image chunking utilities
export {
  resizeImageForVision,
  imageChunkToDataURI,
  getOptimalChunkSize,
} from './image-chunker';

// Vision API client
export {
  testVisionAPI,
  getAPIUsageStats,
} from './vision-client';

// Main orchestrator (clean version)
export {
  processPDFFromURL,
  processDocument,
} from './orchestrator-clean';

// Logging utilities
export {
  createLogger,
  logger,
  measurePerformance,
  createTimer,
  logMemoryUsage,
} from './logger';

/**
 * OCR2 Library Information
 */
export const OCR2_INFO = {
  name: 'OCR2',
  version: '1.0.0',
  description: 'TypeScript-based OCR processing for Next.js applications',
  features: [
    'PDF text extraction',
    'OCR processing with GPT-4o Vision',
    'Image chunking for large documents',
    'Parallel processing with concurrency control',
    'Airtable integration',
    'Comprehensive error handling',
    'Structured logging',
    'Performance monitoring',
  ],
  compatibility: {
    runtime: 'Node.js',
    framework: 'Next.js',
    typescript: true,
    serverComponents: true,
    apiRoutes: true,
  },
} as const;

/**
 * Quick start utility for common use cases
 */
export const quickStart = {
  /**
   * Process a PDF file and return extracted text
   */
  async extractText(fileUrl: string): Promise<string> {
    const { processPDFFromURL } = await import('./orchestrator-clean');
    return processPDFFromURL(fileUrl);
  },

  /**
   * Test if the OCR2 service is properly configured
   */
  async testConfiguration(): Promise<boolean> {
    try {
      const { getOCR2Settings, validateSettings } = await import('./config');
      const { testVisionAPI } = await import('./vision-client');
      
      const settings = getOCR2Settings();
      validateSettings(settings);
      
      return await testVisionAPI();
    } catch {
      return false;
    }
  },

  /**
   * Get service health information
   */
  async getHealth() {
    const { getOCR2Settings } = await import('./config');
    const { getProcessingStats } = await import('./orchestrator-v2');
    const { getAPIUsageStats } = await import('./vision-client');
    
    try {
      const settings = getOCR2Settings();
      const processingStats = getProcessingStats();
      const apiStats = getAPIUsageStats();
      
      return {
        status: 'healthy',
        configuration: {
          model: settings.openai.model,
          maxPages: settings.pdf.maxPagesPerDoc,
          maxConcurrency: settings.concurrency.maxParallelVisionCalls,
        },
        stats: {
          processing: processingStats,
          api: apiStats,
        },
      };
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
};

export default {
  ...OCR2_INFO,
  quickStart,
};
