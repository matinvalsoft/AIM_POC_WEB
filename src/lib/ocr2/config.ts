/**
 * OCR2 Configuration
 * TypeScript configuration for the modernized OCR pipeline
 */

export interface OCR2Settings {
  // OpenAI Configuration
  openai: {
    apiKey: string;
    baseUrl?: string;
    model: string;
    detailMode: 'low' | 'high';
    timeoutSeconds: number;
    maxRetries: number;
    retryBackoffSeconds: number;
  };

  // PDF Processing
  pdf: {
    dpi: number;
    maxPagesPerDoc: number;
  };

  // Image Chunking
  chunking: {
    shortSidePx: number;
    longSideMaxPx: number;
    aspectTrigger: number;
    overlapPct: number;
  };

  // Concurrency
  concurrency: {
    maxParallelVisionCalls: number;
  };

  // Airtable Configuration
    airtable: {
      pat: string;
      baseId: string;
      tableName: string;
    };
}

/**
 * Get OCR2 settings from environment variables
 */
export function getOCR2Settings(): OCR2Settings {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const airtableBaseId = process.env.AIRTABLE_BASE_ID;
  const airtablePat = process.env.AIRTABLE_PAT;

  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }

  if (!airtableBaseId) {
    throw new Error('AIRTABLE_BASE_ID environment variable is required');
  }

  if (!airtablePat) {
    throw new Error('AIRTABLE_PAT environment variable is required');
  }

  return {
    openai: {
      apiKey: openaiApiKey,
      baseUrl: process.env.OPENAI_BASE_URL,
      model: process.env.OPENAI_MODEL_NAME || 'gpt-4o',
      detailMode: 'high', // Mandatory for vision OCR quality
      timeoutSeconds: parseInt(process.env.OPENAI_TIMEOUT_SECONDS || '90'),
      maxRetries: parseInt(process.env.MAX_VISION_RETRIES || '1'),
      retryBackoffSeconds: parseInt(process.env.RETRY_BACKOFF_SECONDS || '2'),
    },

    pdf: {
      dpi: parseInt(process.env.PDF_DPI || '150'),
      maxPagesPerDoc: parseInt(process.env.MAX_PAGES_PER_DOC || '50'),
    },

    chunking: {
      shortSidePx: parseInt(process.env.SHORT_SIDE_PX || '512'),
      longSideMaxPx: parseInt(process.env.LONG_SIDE_MAX_PX || '2048'),
      aspectTrigger: parseFloat(process.env.ASPECT_TRIGGER || '2.7'),
      overlapPct: parseFloat(process.env.OVERLAP_PCT || '0.05'),
    },

    concurrency: {
      maxParallelVisionCalls: parseInt(process.env.MAX_PARALLEL_VISION_CALLS || '5'),
    },

    airtable: {
      pat: airtablePat,
      baseId: airtableBaseId,
      tableName: process.env.AIRTABLE_TABLE_NAME || 'Files',
    },
  };
}

/**
 * Validate OCR2 settings
 */
export function validateSettings(settings: OCR2Settings): void {
  if (!settings.openai.apiKey.startsWith('sk-')) {
    throw new Error('Invalid OpenAI API key format');
  }

  if (settings.pdf.maxPagesPerDoc <= 0) {
    throw new Error('MAX_PAGES_PER_DOC must be greater than 0');
  }

  if (settings.concurrency.maxParallelVisionCalls <= 0) {
    throw new Error('MAX_PARALLEL_VISION_CALLS must be greater than 0');
  }
}

export default {
  getOCR2Settings,
  validateSettings,
};
