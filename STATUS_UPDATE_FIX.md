# Status Update Flow Fix

## Problem
Previously, files were being marked as "Processed" immediately after OCR completion, but they should only be marked as "Processed" after an invoice has been successfully created and linked to the file.

## Solution
Modified the OCR3 route to automatically trigger parser3 after OCR completion. The parser3 endpoint creates the invoice and updates the file status to "Processed" only after successful invoice creation.

## Updated Flow

### Before Fix
1. Upload → File status: "Queued"
2. OCR3 starts → File status: "Processing"
3. OCR3 completes → File status: "Processed" ❌ (TOO EARLY)
4. Manual parser3 call → Creates invoice

### After Fix
1. Upload → File status: "Queued"
2. OCR3 starts → File status: "Processing"
3. OCR3 completes → Saves raw text (status remains "Processing")
4. OCR3 automatically triggers parser3 → Creates invoice and links it to file
5. parser3 updates file status → File status: "Processed" ✅ (CORRECT)

## Changes Made

### `/src/app/api/ocr3/route.ts`
- Added automatic parser3 invocation after successful OCR text extraction
- parser3 is called with the file record ID and raw text
- If parser3 fails, the OCR request still succeeds but the file remains in "Processing" state
- Comprehensive logging for debugging the invoice creation process

### Key Features
- **Non-blocking**: If parser3 fails, OCR still succeeds (file remains in "Processing" state)
- **Automatic**: No manual intervention needed after upload
- **Traceable**: Detailed logging at each step for debugging
- **Correct status transitions**: File only marked as "Processed" after invoice exists

## Status State Diagram

```
┌─────────┐
│ Queued  │ ← File uploaded to Airtable
└────┬────┘
     │
     ↓ OCR3 triggered
┌──────────────┐
│  Processing  │ ← OCR in progress
└──────┬───────┘
       │
       ↓ OCR completes, Raw-Text saved
┌──────────────┐
│  Processing  │ ← parser3 triggered
└──────┬───────┘
       │
       ↓ Invoice created and linked
┌──────────────┐
│  Processed   │ ← File ready for review
└──────────────┘
```

## Testing

To test the fix:

1. Upload a PDF file
2. Watch the server logs for:
   - `[requestId] OCR3: Triggering parser3 to create invoice...`
   - `[requestId] OCR3: Invoice created successfully: [invoiceId]`
   - `[requestId] OCR3: File status updated to "Processed"`
3. Verify in Airtable that:
   - File record has status "Processed"
   - File record has Raw-Text field populated
   - Invoice record exists and is linked to the file
   - Invoice record has all parsed fields populated

## Error Handling

If parser3 fails:
- OCR3 still returns success (OCR was successful)
- File remains in "Processing" state
- Error is logged: `Invoice creation failed, file remains in Processing state`
- User can manually retry or investigate the parsing issue

## Notes

- The parser3 endpoint already had the correct logic to update status to "Processed"
- This fix simply automates the trigger from OCR3 to parser3
- The status update happens in parser3 (lines 164-189) after invoice creation succeeds

