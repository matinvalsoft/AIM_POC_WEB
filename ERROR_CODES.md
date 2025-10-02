# Error Code System

This document describes the centralized error code system for file processing.

## Available Error Codes

All error codes are defined in `src/lib/error-codes.ts` and automatically work across all components.

## Automatic Detection

The system automatically detects and sets error codes during file upload and processing:

- **Upload validation** (`src/utils/file-validation.ts`): Checks file size, format, and PDF integrity before upload
- **OCR processing** (`src/app/api/ocr2/process/route.ts`): Detects OCR failures, PDF corruption, and timeouts
- **Error handler** (`src/lib/airtable/error-handler.ts`): Centralized function to set error codes in Airtable

### Error Codes

| Code | Display Name | Icon | Color | Detection | Description |
|------|-------------|------|-------|-----------|-------------|
| `DUPLICATE_FILE` | Duplicate | Copy01 | Error (Red) | **Auto** - Upload API | This file is a duplicate of another file |
| `OCR_FAILED` | OCR Failed | FileSearch02 | Error (Red) | **Auto** - OCR API | OCR processing failed or returned poor quality results |
| `PDF_CORRUPTED` | Corrupted File | FileX02 | Error (Red) | **Auto** - Upload/OCR API | PDF file is corrupted or unreadable |
| `UNSUPPORTED_FORMAT` | Unsupported Format | AlertCircle | Error (Red) | **Auto** - Upload API | File format not supported for processing |
| `FILE_TOO_LARGE` | File Too Large | AlertTriangle | Error (Red) | **Auto** - Upload API | File exceeds size limits (50MB for PDFs, 20MB for images) |
| `PROCESSING_ERROR` | Processing Error | XCircle | Error (Red) | **Auto** - OCR API | An error occurred while processing this file |
| `VALIDATION_ERROR` | Validation Error | AlertTriangle | Error (Red) | Manual | This file failed validation checks |
| `TIMEOUT_ERROR` | Timeout | Clock | Error (Red) | **Auto** - OCR API | Processing timed out for this file |

## Detection Logic

### Upload Validation (Pre-Upload)
Before a file is uploaded to Vercel Blob, the system validates:

1. **File Format** - Only PDFs and images (JPG, PNG, GIF, TIFF) are supported
   - ❌ Rejects: `.txt`, `.doc`, `.xls`, etc.
   - Sets: `UNSUPPORTED_FORMAT`

2. **File Size** - Maximum 50MB for PDFs, 20MB for images
   - ❌ Rejects: Files exceeding size limits
   - Sets: `FILE_TOO_LARGE`

3. **PDF Integrity** - Validates PDF header and structure
   - ❌ Rejects: Corrupted or invalid PDFs
   - Sets: `PDF_CORRUPTED`

### Duplicate Detection
After validation, before creating Airtable record:

1. **File Hash** - SHA-256 hash comparison
   - ✅ Allows upload but marks as duplicate
   - Sets: `DUPLICATE_FILE` + link to original file

### OCR Processing (Post-Upload)
For PDF files, after upload to Airtable:

1. **OCR Failures** - Text extraction errors
   - Sets: `OCR_FAILED`

2. **PDF Corruption** - Detected during processing
   - Sets: `PDF_CORRUPTED`

3. **Timeout** - Processing takes too long
   - Sets: `TIMEOUT_ERROR`

4. **General Errors** - Other processing issues
   - Sets: `PROCESSING_ERROR`

## Centralized Error Descriptions

**Error descriptions are now centralized** in the error code dictionary (`src/lib/error-codes.ts`). The system automatically:

- ✅ **No Error Description field needed** - Descriptions come from the error code
- ✅ **Consistent messaging** - Same description everywhere for each error code  
- ✅ **Programmatic format** - All error descriptions are pre-written and consistent
- ✅ **All red styling** - All error codes now use red error styling (no more yellow warnings)

### How It Works:
1. **Set only Error Code** in Airtable (e.g., `DUPLICATE_FILE`)
2. **Description auto-generated** from `getErrorDescription(errorCode)` 
3. **UI automatically updates** with correct text, icon, and red styling
4. **"View original file" link** - Only shown for `DUPLICATE_FILE` errors (others don't need links)

## Usage in Airtable

To **manually** mark a file with an error:

1. Set the `Status` field to `Attention`
2. Set the `Error Code` field to one of the codes above (e.g., `OCR_FAILED`)
3. Set the `Error Link` field **only for duplicates** with a relative URL (e.g., `/files?id=recXXX`)

**Note**: 
- No need to set Error Description - it's automatically generated from the error code!
- Error Link only makes sense for `DUPLICATE_FILE` (to reference the original file)

## Automatic Behavior

When a file has an error code, the system automatically:

- **Badge**: Shows the error display name instead of "Needs Attention"
- **Badge Color**: Uses red error color for all error codes
- **Icon**: Shows the error-specific icon in red
- **Alert Box**: Displays the centralized error description with red styling
- **Status Display**: Updates everywhere (file list, details panel, upload UI)

## Adding New Error Codes

To add a new error code:

1. Add it to `ERROR_CODES` in `src/lib/error-codes.ts`
2. Choose an appropriate icon from `@untitledui/icons`
3. Set the color to `'error'` (all errors are now red)
4. Add a centralized description
5. It will automatically work everywhere!

No need to update individual components - the centralized system handles everything.
