# OCR2 Integration Status

## ✅ What's Already in Place

All OCR2 library files and API routes have been successfully copied to your project:

### Library Files (`src/lib/ocr2/`)
- ✅ `index.ts` - Main exports and quickStart utilities
- ✅ `config.ts` - Environment configuration management
- ✅ `types.ts` - TypeScript type definitions
- ✅ `logger.ts` - Structured logging
- ✅ `pdf-processor.ts` - PDF to image conversion
- ✅ `image-chunker.ts` - Intelligent image splitting
- ✅ `vision-client.ts` - OpenAI Vision API client
- ✅ `orchestrator-clean.ts` - Main processing pipeline (recommended)
- ✅ `orchestrator-v2.ts` - Alternative with full metrics
- ✅ `orchestrator.ts` - Original orchestrator
- ✅ `README.md` - Documentation

### API Routes (`src/app/api/ocr2/`)
- ✅ `process/route.ts` - Main OCR processing endpoint
- ✅ `test/route.ts` - Testing and health check endpoint

---

## ❌ What's Missing

### 1. **NPM Dependencies** (CRITICAL)

The following packages are **not installed** in your `package.json`:

```bash
npm install openai pdf-parse pdf-poppler pdf2pic sharp
npm install --save-dev @types/pdf-parse
```

**Impact:** Without these packages, the OCR2 module will fail with module not found errors.

**Required packages:**
- `openai` - OpenAI API client for GPT-4o Vision
- `pdf-parse` - Text extraction from text-based PDFs
- `pdf-poppler` - PDF to image conversion (primary method)
- `pdf2pic` - PDF to image conversion (fallback method)
- `sharp` - Image processing and manipulation
- `@types/pdf-parse` - TypeScript types for pdf-parse

---

### 2. **System Dependencies** (CRITICAL)

**Required:** `poppler-utils` must be installed on your system

```bash
# macOS (using Homebrew)
brew install poppler

# Ubuntu/Debian
sudo apt-get install poppler-utils

# CentOS/RHEL
sudo yum install poppler-utils
```

**Impact:** The `orchestrator-clean.ts` uses the system command `pdftoppm` (from poppler-utils) to convert PDFs to images. Without this, PDF processing will fail.

**Why needed:** The clean orchestrator relies on system-level PDF conversion for better performance and reliability.

---

### 3. **Environment Variables** (CRITICAL)

**Required:** Create `.env.local` file with sensitive credentials:

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here

# Airtable Configuration
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
AIRTABLE_PAT=your_airtable_personal_access_token
```

**Impact:** Without these environment variables, the OCR2 service will not start and will throw configuration errors.

---

### 4. **Configuration File for Non-Sensitive Settings** (RECOMMENDED)

**Create:** `ocr2.config.js` at project root

This file should contain non-sensitive configuration that you want to access and modify easily without dealing with environment variables:

```javascript
/**
 * OCR2 Configuration
 * Non-sensitive configuration values that can be committed to git
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
    model: 'gpt-4o',             // OpenAI model to use
    timeoutSeconds: 90,          // Request timeout
    maxRetries: 1,               // Number of retries on failure
    retryBackoffSeconds: 2,      // Backoff time between retries
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
```

**Why separate file?**
- Easy to modify max pages, DPI, concurrency without editing .env
- Can be committed to git (unlike .env.local)
- Centralized configuration that's easy to find and update
- Team members can see and adjust settings

---

### 5. **Environment Variables Template** (RECOMMENDED)

**Create:** `.env.local.example` (can be committed to git)

```bash
# OCR2 - OpenAI Configuration
# Get your API key from: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-openai-api-key-here

# OCR2 - Airtable Configuration
# Base ID can be found in your Airtable URL
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX

# Personal Access Token - create at: https://airtable.com/create/tokens
AIRTABLE_PAT=your_airtable_personal_access_token

# Optional: Override default settings
# OPENAI_MODEL_NAME=gpt-4o
# OPENAI_BASE_URL=https://api.openai.com/v1
# OPENAI_TIMEOUT_SECONDS=90
# MAX_VISION_RETRIES=1
# RETRY_BACKOFF_SECONDS=2
# PDF_DPI=150
# MAX_PAGES_PER_DOC=50
# SHORT_SIDE_PX=512
# LONG_SIDE_MAX_PX=2048
# ASPECT_TRIGGER=2.7
# OVERLAP_PCT=0.05
# MAX_PARALLEL_VISION_CALLS=5
# AIRTABLE_TABLE_NAME=Files
# LOG_LEVEL=INFO
```

---

## 🔧 Integration Steps

### Step 1: Install Dependencies
```bash
npm install openai pdf-parse pdf-poppler pdf2pic sharp
npm install --save-dev @types/pdf-parse
```

### Step 2: Install System Dependencies
```bash
# macOS
brew install poppler

# Check installation
pdftoppm -v
```

### Step 3: Create Configuration Files
1. Copy `.env.local.example` to `.env.local`
2. Fill in your actual API keys and credentials in `.env.local`
3. Create `ocr2.config.js` with your preferred settings

### Step 4: Update .gitignore
Ensure `.env.local` is in your `.gitignore`:
```
.env.local
```

### Step 5: Test the Integration
```bash
# Start your dev server
npm run dev

# Test the health endpoint
curl http://localhost:3000/api/ocr2/test

# Test the processing endpoint
curl http://localhost:3000/api/ocr2/process
```

---

## 🚨 Expected Errors Before Integration

### Error 1: Module Not Found
```
Error: Cannot find module 'openai'
Error: Cannot find module 'pdf-parse'
Error: Cannot find module 'sharp'
```
**Fix:** Install NPM dependencies (Step 1)

### Error 2: Missing Environment Variables
```
Error: OPENAI_API_KEY environment variable is required
Error: AIRTABLE_BASE_ID environment variable is required
```
**Fix:** Create .env.local with required variables (Step 3)

### Error 3: System Command Not Found
```
Error: Command failed: pdftoppm
/bin/sh: pdftoppm: command not found
```
**Fix:** Install poppler-utils (Step 2)

### Error 4: Configuration Error
```
Error: Invalid OpenAI API key format
```
**Fix:** Ensure your API key starts with 'sk-' in .env.local

---

## 📊 Usage Examples

### Basic Usage in Your Code

```typescript
import { processPDFFromURL } from '@/lib/ocr2';

// Extract text from a PDF
const fileUrl = 'https://example.com/document.pdf';
const extractedText = await processPDFFromURL(fileUrl);
console.log('Extracted text:', extractedText);
```

### Using the API Endpoint

```typescript
// Trigger OCR processing after file upload
const response = await fetch('/api/ocr2/process', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    file_url: uploadedFileUrl,
    record_id: airtableRecordId
  })
});

const result = await response.json();
console.log('OCR result:', result);
```

### Quick Start Utilities

```typescript
import { quickStart } from '@/lib/ocr2';

// Test if OCR2 is configured
const isReady = await quickStart.testConfiguration();

// Get service health
const health = await quickStart.getHealth();

// Extract text from PDF
const text = await quickStart.extractText(fileUrl);
```

---

## ✅ Integration Checklist

- [ ] NPM dependencies installed (`openai`, `pdf-parse`, `pdf-poppler`, `pdf2pic`, `sharp`)
- [ ] System dependencies installed (`poppler-utils`)
- [ ] `.env.local` created with API keys
- [ ] `ocr2.config.js` created (optional but recommended)
- [ ] `.env.local.example` created for team reference
- [ ] `.env.local` is in `.gitignore`
- [ ] Health check endpoint works: `curl http://localhost:3000/api/ocr2/test`
- [ ] Test document processed successfully
- [ ] Error handling tested
- [ ] Documentation reviewed

---

## 🎯 Next Steps After Integration

1. **Test with a sample PDF**: Upload a test PDF and verify OCR extraction works
2. **Monitor costs**: Track OpenAI API usage (typically $0.01-0.05 per page)
3. **Adjust settings**: Tune DPI, max pages, and concurrency in `ocr2.config.js`
4. **Set up error monitoring**: Consider adding error tracking (Sentry, etc.)
5. **Integrate with file upload flow**: Connect OCR processing to your file upload component

---

## 💡 Tips

- **Start with low DPI (150)** for testing to save costs
- **Monitor OpenAI usage** in your OpenAI dashboard
- **Test with various PDF types**: scanned images, text-based, mixed
- **Adjust concurrency** based on your OpenAI rate limits
- **Use health check endpoint** for monitoring in production

---

## 📚 Additional Resources

- [OpenAI Vision API Documentation](https://platform.openai.com/docs/guides/vision)
- [OCR2 README](./src/lib/ocr2/README.md) - Detailed library documentation
- [Airtable API Reference](https://airtable.com/developers/web/api/introduction)

---

**Status:** ⏳ Ready for integration - all files in place, dependencies need to be installed



