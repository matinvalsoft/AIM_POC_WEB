# OCR2 Quick Start Guide

## ✅ Installation Complete!

All OCR2 files and dependencies have been successfully integrated into your project.

---

## 🚀 What's Been Done

### ✅ Files Integrated
- ✅ All OCR2 library files copied to `src/lib/ocr2/`
- ✅ All API routes copied to `src/app/api/ocr2/`
- ✅ NPM dependencies installed (`openai`, `pdf-parse`, `pdf-poppler`, `pdf2pic`, `sharp`)
- ✅ System dependencies verified (`poppler-utils` v25.07.0 installed)
- ✅ Configuration file created (`ocr2.config.js`)
- ✅ Environment template created (`.env.template`)

---

## 📝 Next Steps (YOU NEED TO DO THIS)

### Step 1: Create `.env.local` File

Copy the template and add your API keys:

```bash
# Copy the template
cp .env.template .env.local

# Then edit .env.local and add your actual credentials:
# - OPENAI_API_KEY (get from https://platform.openai.com/api-keys)
# - AIRTABLE_BASE_ID (from your Airtable URL)
# - AIRTABLE_PAT (create at https://airtable.com/create/tokens)
```

**IMPORTANT:** `.env.local` is already in your `.gitignore` so your secrets won't be committed.

### Step 2: Start Your Dev Server

```bash
npm run dev
```

### Step 3: Test the OCR2 Integration

Test the health endpoint:
```bash
curl http://localhost:3000/api/ocr2/test
```

You should see a response like:
```json
{
  "status": "healthy",
  "service": "OCR2 Test",
  "message": "OCR2 service is properly configured",
  "configuration": {
    "openai": { "configured": true, "model": "gpt-4o" },
    "airtable": { "configured": true },
    "poppler": { "installed": true }
  }
}
```

### Step 4: Test with a Real PDF

```bash
curl -X POST http://localhost:3000/api/ocr2/process \
  -H "Content-Type: application/json" \
  -d '{
    "file_url": "https://example.com/your-document.pdf",
    "record_id": "recXXXXXXXXXXXX"
  }'
```

---

## 🎛️ Configuration

### Non-Sensitive Settings (`ocr2.config.js`)

Edit this file to adjust OCR settings without dealing with environment variables:

```javascript
module.exports = {
  pdf: {
    dpi: 150,              // Higher = better quality but slower
    maxPagesPerDoc: 50,    // Limit pages processed per document
  },
  chunking: {
    longSideMaxPx: 2048,   // Max image dimension for Vision API
    aspectTrigger: 2.7,    // When to split horizontally vs vertically
    overlapPct: 0.05,      // Overlap between chunks
  },
  concurrency: {
    maxParallelVisionCalls: 5,  // Concurrent API calls
  },
};
```

### Sensitive Settings (`.env.local`)

Required environment variables:
- `OPENAI_API_KEY` - Your OpenAI API key
- `AIRTABLE_BASE_ID` - Your Airtable base ID
- `AIRTABLE_PAT` - Your Airtable personal access token

Optional overrides (see `.env.template` for full list)

---

## 💻 Usage Examples

### In Your Code

```typescript
import { processPDFFromURL } from '@/lib/ocr2';

// Simple text extraction
const text = await processPDFFromURL('https://example.com/doc.pdf');
console.log('Extracted:', text);
```

### Using Quick Start Utilities

```typescript
import { quickStart } from '@/lib/ocr2';

// Test configuration
const isReady = await quickStart.testConfiguration();

// Extract text
const text = await quickStart.extractText(fileUrl);

// Get service health
const health = await quickStart.getHealth();
```

### Via API Endpoint

```typescript
const response = await fetch('/api/ocr2/process', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    file_url: uploadedFileUrl,
    record_id: airtableRecordId
  })
});

const result = await response.json();
```

---

## 🔍 Troubleshooting

### Error: "OPENAI_API_KEY environment variable is required"
**Fix:** Create `.env.local` file with your API key (see Step 1 above)

### Error: "Cannot find module 'openai'"
**Fix:** Run `npm install` to install dependencies

### Error: "pdftoppm: command not found"
**Fix:** Install poppler-utils:
```bash
brew install poppler  # macOS
```

### Error: "Failed to download PDF"
**Fix:** Check that the file URL is accessible and is a valid PDF

---

## 📊 Cost Monitoring

OCR processing uses OpenAI's GPT-4o Vision API:
- **Cost:** ~$0.01-0.05 per page (varies by complexity)
- **Monitor usage:** https://platform.openai.com/usage

**Tips to reduce costs:**
- Start with lower DPI (150) for testing
- Limit pages processed with `maxPagesPerDoc`
- Test with small documents first

---

## 📚 Additional Resources

- Full integration details: `OCR2_INTEGRATION_STATUS.md`
- Library documentation: `src/lib/ocr2/README.md`
- AI usage guide: `src/lib/ocr2/AI_USAGE_GUIDE.md`

---

## ✨ Features

- ✅ High-quality OCR using GPT-4o Vision
- ✅ Automatic image chunking for large documents
- ✅ Parallel processing with rate limiting
- ✅ Automatic Airtable integration
- ✅ Comprehensive error handling
- ✅ Performance monitoring and logging
- ✅ Text-based PDF detection (skips OCR if possible)

---

## 🎯 Integration Checklist

- [ ] `.env.local` created with API keys
- [ ] Dev server started (`npm run dev`)
- [ ] Health check passes (`/api/ocr2/test`)
- [ ] Test PDF processed successfully
- [ ] Settings adjusted in `ocr2.config.js` if needed
- [ ] Team members have access to `.env.template`

---

**Status:** ✅ Ready to use - just add your API keys!



