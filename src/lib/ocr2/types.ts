/**
 * OCR2 TypeScript Types
 * Comprehensive type definitions for the OCR pipeline
 */

/**
 * Image processing types
 */
export interface ImageChunk {
  data: Buffer;
  width: number;
  height: number;
  x: number;
  y: number;
  chunkIndex: number;
}

export interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
}

/**
 * OCR processing types
 */
export interface OCRResult {
  text: string;
  confidence?: number;
  processingTime: number;
  tokensUsed: {
    input: number;
    output: number;
    total: number;
  };
}

export interface ChunkOCRResult extends OCRResult {
  chunkIndex: number;
  pageIndex: number;
}

/**
 * PDF processing types
 */
export interface PDFProcessingOptions {
  maxPages?: number;
  startPage?: number;
  endPage?: number;
  extractText?: boolean;
  extractImages?: boolean;
}

export interface PDFProcessingResult {
  totalPages: number;
  processedPages: number;
  extractedText: string;
  processingTime: number;
  pagesResults: PageProcessingResult[];
  summary: ProcessingSummary;
}

export interface PageProcessingResult {
  pageIndex: number;
  text: string;
  chunks: ChunkOCRResult[];
  processingTime: number;
}

export interface ProcessingSummary {
  totalTokensUsed: number;
  totalProcessingTime: number;
  averageChunksPerPage: number;
  successRate: number;
  errors: string[];
}

/**
 * Invoice data extraction types
 */
export interface InvoiceData {
  vendor_name: string;
  invoice_number: string;
  amount: string;
  date_time: string;
  store_number: string;
  gl_code: string;
  summary: string;
  name: string;
}

export interface StructuredExtractionResult {
  invoiceData: InvoiceData;
  confidence: number;
  extractionTime: number;
  rawText: string;
}

/**
 * API request/response types
 */
export interface ProcessFileRequest {
  file_url: string;
  record_id: string;
  options?: PDFProcessingOptions;
}

export interface ProcessFileResponse {
  status: 'success' | 'error';
  record_id: string;
  file_url: string;
  extracted_text_length?: number;
  airtable_updated?: boolean;
  processing_summary?: ProcessingSummary;
  structured_data?: InvoiceData;
  message?: string;
  error?: string;
}

/**
 * Error types
 */
export class OCRError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'OCRError';
  }
}

export class PDFProcessingError extends OCRError {
  constructor(message: string, details?: any) {
    super(message, 'PDF_PROCESSING_ERROR', details);
    this.name = 'PDFProcessingError';
  }
}

export class VisionAPIError extends OCRError {
  constructor(message: string, details?: any) {
    super(message, 'VISION_API_ERROR', details);
    this.name = 'VisionAPIError';
  }
}

export class AirtableUpdateError extends OCRError {
  constructor(message: string, details?: any) {
    super(message, 'AIRTABLE_UPDATE_ERROR', details);
    this.name = 'AirtableUpdateError';
  }
}

/**
 * Airtable integration types
 */
export interface AirtableFileRecord {
  id: string;
  fields: {
    Name: string;
    'Upload Date': string;
    Source: string;
    Status: string;
    'Raw Text'?: string;
    Pages?: number;
    'Is Duplicate': boolean;
    'Duplicate Of'?: string[];
    Attention?: string;
    Attachments?: Array<{
      id: string;
      url: string;
      filename: string;
      size: number;
      type: string;
    }>;
  };
}

export interface AirtableUpdateData {
  'Raw Text': string;
  Status: 'Processed' | 'Error' | 'Processing';
  Pages?: number;
  'Processing Time'?: number;
  'Text Length'?: number;
  'Error Message'?: string;
}

/**
 * Logging types
 */
export interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  context?: Record<string, any>;
}

export type Logger = {
  info: (message: string, context?: Record<string, any>) => void;
  warn: (message: string, context?: Record<string, any>) => void;
  error: (message: string, context?: Record<string, any>) => void;
  debug: (message: string, context?: Record<string, any>) => void;
};
