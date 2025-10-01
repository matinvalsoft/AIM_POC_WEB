# OCR2 AI Usage Guide

## Purpose
Extract text from PDF documents using OpenAI Vision API with intelligent chunking and parallel processing.

## Core Function
```typescript
import { processPDFFromURL } from '@/lib/ocr2/orchestrator-clean';

// Input: PDF URL (HTTP, data URI, or file://)
// Output: Extracted text as string
const text = await processPDFFromURL(url);
```

## API Endpoints

### Health Check
```bash
GET /api/ocr2/test
# Returns: {"status": "healthy", "configuration": {...}}
```

### Process Document
```bash
POST /api/ocr2/process
Content-Type: application/json

{
  "record_id": "string",
  "file_url": "https://example.com/document.pdf"
}

# Returns: {"status": "success", "extracted_text_length": 1234, ...}
```

## What It Does
1. Downloads PDF from URL
2. Converts to images (150 DPI)
3. Intelligently chunks large images (2048px max, 5% overlap)
4. Processes up to 5 chunks in parallel with OpenAI Vision
5. Returns complete text with page breaks

## Features
- **Multi-page support**: Handles PDFs with multiple pages
- **Smart chunking**: Splits wide/tall images automatically
- **Parallel processing**: 5x faster with concurrent API calls
- **Error recovery**: Graceful handling of failed chunks
- **Memory efficient**: Cleans up temporary files

## Configuration
Environment variables in `.env.local`:
```bash
OPENAI_API_KEY=sk-your-key-here
```

## Performance
- Typical processing: 15-30 seconds per page
- Token usage: ~1000-3000 tokens per page
- Speedup: 2-5x with parallel processing





