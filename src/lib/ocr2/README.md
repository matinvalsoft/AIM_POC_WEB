# OCR2 - TypeScript OCR Processing Library

A modern, TypeScript-based OCR processing library for Next.js applications, featuring PDF text extraction, image processing, and seamless Airtable integration.

## 🚀 Features

- ✅ **PDF Text Extraction** - Smart text extraction with OCR fallback
- ✅ **GPT-4o Vision Integration** - High-quality OCR using OpenAI's Vision API
- ✅ **Image Chunking** - Automatic splitting of large images for optimal processing
- ✅ **Parallel Processing** - Concurrent chunk processing with rate limiting
- ✅ **Airtable Integration** - Direct record updates with extracted text
- ✅ **TypeScript First** - Full type safety and IntelliSense support
- ✅ **Error Recovery** - Comprehensive error handling and retry logic
- ✅ **Performance Monitoring** - Built-in logging and performance metrics
- ✅ **Next.js Compatible** - Seamless integration with Next.js API routes

## 📦 Installation

The OCR2 library is integrated directly into your Next.js project. Add the required dependencies:

```bash
npm install openai pdf-parse pdf-poppler pdf2pic sharp
npm install --save-dev @types/pdf-parse
```

## ⚙️ Configuration

Add the following environment variables to your `.env.local` file:

```bash
# Required: OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here

# Required: Airtable Configuration  
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
AIRTABLE_TABLE_NAME=Files

# Optional: OpenAI Configuration
OPENAI_MODEL_NAME=gpt-4o
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_TIMEOUT_SECONDS=90
MAX_VISION_RETRIES=1
RETRY_BACKOFF_SECONDS=2

# Optional: Processing Configuration
PDF_DPI=150
MAX_PAGES_PER_DOC=50
SHORT_SIDE_PX=512
LONG_SIDE_MAX_PX=2048
ASPECT_TRIGGER=2.7
OVERLAP_PCT=0.05
MAX_PARALLEL_VISION_CALLS=5

# Optional: Logging
LOG_LEVEL=INFO
```

## 🔧 Usage

### API Route Integration

Create an API route to handle OCR processing:

```typescript
// src/app/api/process-document/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { processPDFForRawText } from '@/lib/ocr2';

export async function POST(request: NextRequest) {
  try {
    const { fileUrl, recordId } = await request.json();
    
    // Process the PDF
    const extractedText = await processPDFForRawText(fileUrl);
    
    // Update your database/Airtable record here
    // ...
    
    return NextResponse.json({
      success: true,
      textLength: extractedText.length,
      recordId
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Processing failed' },
      { status: 500 }
    );
  }
}
```

### Direct Library Usage

```typescript
import { processPDFFromURL, quickStart } from '@/lib/ocr2';

// Quick text extraction
const text = await quickStart.extractText('https://example.com/document.pdf');

// Full processing with options
const result = await processPDFFromURL('https://example.com/document.pdf', {
  maxPages: 10,
  extractImages: true
});

console.log('Extracted text:', result.extractedText);
console.log('Processing time:', result.processingTime);
console.log('Pages processed:', result.processedPages);
```

### Health Check

```typescript
import { quickStart } from '@/lib/ocr2';

// Test configuration
const isConfigured = await quickStart.testConfiguration();

// Get service health
const health = await quickStart.getHealth();
console.log('Service status:', health.status);
```

## 🏗️ Architecture

```
src/lib/ocr2/
├── config.ts          # Environment configuration
├── types.ts           # TypeScript type definitions
├── logger.ts          # Structured logging utilities
├── pdf-processor.ts   # PDF to image conversion
├── image-chunker.ts   # Image splitting and optimization
├── vision-client.ts   # OpenAI Vision API integration
├── orchestrator.ts    # Main processing pipeline
├── index.ts          # Library exports
└── README.md         # This file

src/app/api/ocr2/
└── process/route.ts  # API endpoint for processing
```

## 📊 Processing Pipeline

1. **PDF Download** - Fetch PDF from URL or process data URI
2. **Text Detection** - Check if PDF has extractable text
3. **Image Conversion** - Convert PDF pages to high-quality images
4. **Image Chunking** - Split large images into optimal chunks
5. **Parallel OCR** - Process chunks concurrently with Vision API
6. **Text Assembly** - Combine chunk results into final text
7. **Airtable Update** - Store results in your database

## 🔍 API Reference

### Core Functions

#### `processPDFFromURL(url: string, options?: PDFProcessingOptions): Promise<PDFProcessingResult>`

Process a PDF file and return comprehensive results.

**Parameters:**
- `url` - PDF file URL or data URI
- `options` - Optional processing configuration

**Returns:** Full processing results with text, timing, and statistics

#### `processPDFForRawText(url: string, options?: PDFProcessingOptions): Promise<string>`

Process a PDF file and return extracted text only.

**Parameters:**
- `url` - PDF file URL or data URI  
- `options` - Optional processing configuration

**Returns:** Extracted text string

### Configuration

#### `getOCR2Settings(): OCR2Settings`

Get current configuration from environment variables.

#### `validateSettings(settings: OCR2Settings): void`

Validate configuration settings (throws on invalid config).

### Utilities

#### `createLogger(component: string): Logger`

Create a logger instance for a specific component.

#### `measurePerformance<T>(operation: () => Promise<T>, name: string): Promise<{ result: T; duration: number }>`

Measure the performance of an async operation.

## 🚨 Error Handling

The library provides comprehensive error handling with specific error types:

```typescript
import { PDFProcessingError, VisionAPIError, AirtableUpdateError } from '@/lib/ocr2';

try {
  const result = await processPDFFromURL(fileUrl);
} catch (error) {
  if (error instanceof PDFProcessingError) {
    console.error('PDF processing failed:', error.message);
  } else if (error instanceof VisionAPIError) {
    console.error('Vision API failed:', error.message);
  } else if (error instanceof AirtableUpdateError) {
    console.error('Airtable update failed:', error.message);
  }
}
```

## 📈 Performance Optimization

### Concurrency Control
- Automatic rate limiting for OpenAI API calls
- Configurable parallel processing limits
- Exponential backoff retry logic

### Image Optimization
- Smart chunking based on image dimensions
- Automatic resizing for Vision API limits
- Overlap handling to prevent text loss

### Memory Management
- Streaming processing for large files
- Automatic cleanup of temporary resources
- Memory usage monitoring

## 🔧 Troubleshooting

### Common Issues

**"OPENAI_API_KEY not found"**
- Ensure your OpenAI API key is set in `.env.local`
- Verify the key starts with `sk-`

**"Rate limit exceeded"**
- Reduce `MAX_PARALLEL_VISION_CALLS` (default: 5)
- Increase `RETRY_BACKOFF_SECONDS` (default: 2)

**"PDF processing failed"**
- Check if the PDF file is accessible
- Verify the file is a valid PDF
- Try reducing `MAX_PAGES_PER_DOC`

**"Vision API timeout"**
- Increase `OPENAI_TIMEOUT_SECONDS` (default: 90)
- Reduce image quality with lower `PDF_DPI`

### Debug Mode

Enable debug logging:

```bash
LOG_LEVEL=DEBUG
```

### Health Check Endpoint

Test your setup with the built-in health check:

```bash
curl http://localhost:3000/api/ocr2/process
```

## 📚 Integration Examples

### With File Upload

```typescript
// After file upload to Vercel Blob
const response = await fetch('/api/ocr2/process', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    file_url: blobUrl,
    record_id: airtableRecordId
  })
});

const result = await response.json();
console.log('OCR completed:', result.extracted_text_length);
```

### Batch Processing

```typescript
const files = ['file1.pdf', 'file2.pdf', 'file3.pdf'];

const results = await Promise.allSettled(
  files.map(url => processPDFForRawText(url))
);

results.forEach((result, index) => {
  if (result.status === 'fulfilled') {
    console.log(`File ${index + 1}: ${result.value.length} characters`);
  } else {
    console.error(`File ${index + 1} failed:`, result.reason);
  }
});
```

## 🤝 Contributing

This library is part of the ACOM SnS Demo project. Improvements and bug fixes are welcome.

## 📄 License

Part of the ACOM SnS Demo project. See project license for details.

---

**OCR2 v1.0.0** - Built with TypeScript for Next.js applications
