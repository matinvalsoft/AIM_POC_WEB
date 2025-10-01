/**
 * OCR2 Configuration
 * Non-sensitive configuration values that can be committed to git
 * 
 * These settings can be overridden by environment variables.
 * See .env.local.example for environment variable options.
 */

module.exports = {
  // PDF Processing
  pdf: {
    dpi: 150,                    // Image resolution (higher = better quality, larger files)
    maxPagesPerDoc: 50,          // Maximum pages to process per document
  },

  // Image Chunking
  chunking: {
    shortSidePx: 512,            // Short side pixel size for chunking
    longSideMaxPx: 2048,         // Maximum long side pixel size
    aspectTrigger: 2.7,          // Aspect ratio trigger for horizontal vs vertical split
    overlapPct: 0.05,            // 5% overlap between chunks to prevent text loss
  },

  // Concurrency & Performance
  concurrency: {
    maxParallelVisionCalls: 5,  // Maximum concurrent OpenAI API calls
  },

  // OpenAI Settings (non-sensitive)
  openai: {
    model: 'gpt-4o',             // OpenAI model to use (gpt-4o recommended for OCR)
    timeoutSeconds: 90,          // Request timeout in seconds
    maxRetries: 1,               // Number of retries on failure
    retryBackoffSeconds: 2,      // Backoff time between retries (exponential)
  },

  // Airtable Settings (non-sensitive)
  airtable: {
    tableName: 'Files',          // Default table name for file records
  },

  // Logging
  logging: {
    level: 'INFO',               // DEBUG, INFO, WARN, ERROR
  },
};



