# File Upload Sequence & Prompts Documentation

## Overview
This document traces the complete flow from file upload to invoice creation, showing all the steps, API calls, and **where the prompts are located**.

---

## 📋 Complete Sequence Flow

### **Step 1: File Upload** 
**Entry Point:** User uploads PDF via UI

```
Frontend: src/app/(app)/upload/page.tsx
  ↓ (POST FormData)
API Route: src/app/api/upload/route.ts
```

**What happens:**
1. **Validate file** - Check size, type, format
2. **Generate file hash** - For duplicate detection
3. **Upload to Vercel Blob** - Store file in cloud storage
4. **Create Airtable record** - In `Files` table with status "Queued"
5. **Trigger OCR processing** - Async call to `/api/ocr2/process`

**Key Code:** `src/app/api/upload/route.ts` lines 272-303
```typescript
// Trigger OCR processing for PDF files
if (file.type === 'application/pdf') {
  triggerOCRProcessing(airtableRecord.id, blob.url, baseUrl).catch(...)
}
```

---

### **Step 2: OCR Processing (Text Extraction)**
**Entry Point:** Triggered automatically after upload

```
API Route: src/app/api/ocr2/process/route.ts
  ↓
Orchestrator: src/lib/ocr2/orchestrator-native.ts
  ↓
Vision Client: src/lib/ocr2/vision-client-native.ts
```

**What happens:**
1. **Download PDF** from Vercel Blob URL
2. **Validate PDF** - Check format, size, page count
3. **Upload to OpenAI Files API** - Convert PDF to OpenAI file object
4. **Call OpenAI Vision API** - Extract text using native PDF support (GPT-4o/GPT-5)
5. **Update Airtable** - Save raw text to `Files` table, set status to "Processed"
6. **Trigger Post-OCR** - Async call to `/api/post-ocr/process`

#### 🎯 **PROMPT #1: OCR Text Extraction**

**Location:** `src/lib/ocr2/vision-client-native.ts` lines 84-95

```typescript
text: `Extract ALL text from this PDF document. Preserve the original formatting, spacing, and layout as much as possible. 

Instructions:
- Include all visible text from every page
- Preserve tables, lists, headers, and footers
- Maintain paragraph breaks and section divisions
- Include page numbers if visible
- If a page break is detected, indicate it with "--- PAGE BREAK ---"
- Do not add any commentary or explanations
- Return only the extracted text

Return the complete text extraction.`
```

**Purpose:** Extract raw text from PDF while preserving layout and structure

**Model Used:** GPT-4o or GPT-5 (configured in `.env` as `OPENAI_MODEL`)

**Input:** PDF file (via OpenAI Files API)

**Output:** Raw text string saved to `Files.Raw-Text` field

---

### **Step 3: Post-OCR Processing (Document Parsing)**
**Entry Point:** Triggered automatically after OCR completes

```
API Route: src/app/api/post-ocr/process/route.ts
  ↓
Processor: src/lib/post-ocr/processor.ts
  ↓
Parser: src/lib/llm/parser.ts
  ↓
Prompts: src/lib/llm/prompts.ts
```

**What happens:**
1. **Fetch file record** - Get raw OCR text from Airtable
2. **Parse documents with LLM** - Identify and extract invoice data
3. **Filter to invoices only** - Skip non-invoice documents
4. **Extract individual text** (if multiple invoices) - Separate text for each invoice
5. **Create Invoice records** - In `Invoices` table
6. **Link invoices to file** - Update `Files` record with invoice IDs

#### 🎯 **PROMPT #2: Invoice Parsing**

**Location:** `src/lib/llm/prompts.ts` - `createParsePrompt()` lines 11-40

```typescript
return `You are an expert at parsing OCR text from invoices.

Your task: Analyze the OCR text and extract all INVOICES present. Return a JSON object with a "documents" array.

IMPORTANT: 
- We ONLY process invoices. If a document is not an invoice (e.g., packing slip, receipt, other document), set document_type to "other" and we will skip it.
- For invoices, extract all the fields listed below.
- If the file contains multiple invoices, extract each one separately.

Rules for INVOICES:
1. Identify each separate invoice in the text
2. Extract all relevant invoice fields
3. If you cannot determine a field value, use null
4. document_type MUST be "invoice" for invoices, or "other" for non-invoices (which will be skipped)
5. invoice_date must be in YYYY-MM-DD format if present
6. amount should be a string with the numeric value representing the total invoice amount (e.g., "1234.56")
7. invoice_number should be the invoice number or document reference number
8. vendor_name should be the vendor or supplier name
9. freight_charge should be a numeric value for freight/shipping charges (e.g., 45.50). Look for terms like "Freight", "Freight Charge", "Shipping", "Delivery Charge", etc.
10. surcharge should be a numeric value for surcharges or additional fees (e.g., 12.25). Look for terms like "Surcharge", "Fuel Surcharge", "Service Charge", "Handling Fee", etc.
11. misc_charge should be a numeric value representing miscellaneous charges (e.g., 32.10). Look for terms like "Misc Charge", "Miscellaneous", "Other Charges", etc.
12. po_numbers should be an array of all purchase order numbers found on the invoice. Look for terms like "PO", "P.O.", "Purchase Order", "PO Number", etc. Extract all unique PO numbers from the invoice header, footer, or line items. If no PO numbers are found, use an empty array [].
13. Do not invent information - only extract what is clearly present in the text

OCR Text:
${rawText}

Output the JSON object with a "documents" array now.`;
```

**Purpose:** Parse raw OCR text into structured invoice data

**Model Used:** GPT-4o or GPT-5 (configured via `src/lib/openai.ts`)

**Input:** Raw text from OCR (from `Files.Raw-Text`)

**Output:** Array of `ParsedDocument` objects with structured invoice data

**Schema:** Enforced via OpenAI Structured Outputs (see `src/lib/llm/schemas.ts`)

**Fields Extracted:**
- `document_type` - "invoice" or "other"
- `invoice_number` - Invoice/document number
- `vendor_name` - Supplier name
- `invoice_date` - Date in YYYY-MM-DD format
- `amount` - Total invoice amount
- `freight_charge` - Shipping/freight charges
- `surcharge` - Fuel surcharge, service charges
- `misc_charge` - Miscellaneous charges
- `po_numbers` - Array of PO numbers found on invoice

#### 🎯 **PROMPT #3: Individual Invoice Text Extraction** (Multi-Invoice Files Only)

**Location:** `src/lib/llm/prompts.ts` - `createExtractDocTextPrompt()` lines 45-62

```typescript
return `You are extracting the OCR text that belongs to ONE specific invoice from a larger text block.

The target invoice has these identifying fields:
- Invoice Number: ${doc.invoice_number || 'unknown'}
- Vendor: ${doc.vendor_name || 'unknown'}
- Date: ${doc.invoice_date || 'unknown'}
- Amount: ${doc.amount || 'unknown'}

Task: Extract ONLY the text that belongs to this specific invoice. Include all the text relevant to the invoce.
Return ONLY the plain text. No JSON. No commentary. No additional formatting.
Do not invent data, only extract what is clearly present in the text.

Full OCR Text:
${rawText}

Extracted text for the target invoice:`;
```

**Purpose:** When multiple invoices are in one file, extract the text for each individual invoice

**Model Used:** GPT-4o or GPT-5

**Input:** Full raw OCR text + invoice identifying fields

**Output:** Plain text for the specific invoice

**When Used:** Only when `parsedDocuments.length > 1` (see `src/lib/post-ocr/processor.ts` lines 104-131)

---

### **Step 4: PO Matching** (User-Initiated)
**Entry Point:** User clicks "Match Invoice" button in UI

```
API Route: src/app/api/match-invoice/route.ts
  ↓
Matcher: src/lib/po-matching/openai-matcher.ts
```

**What happens:**
1. **Fetch invoice data** - Get invoice fields from Airtable
2. **Fetch match payload** - Get PO candidates from AIM system
3. **Call OpenAI for matching** - Generate structured PO match data
4. **Return match results** - Headers and details for ERP import

#### 🎯 **PROMPT #4: PO Matching**

**Location:** `src/lib/po-matching/openai-matcher.ts` - `createPOMatchingPrompt()` lines 100-162

```typescript
return `You match supplier invoices to PO receipt lines. Use only the provided JSON. Do not invent data. Output valid JSON matching the exact schema below. No extra text.

## INVOICE DATA
${JSON.stringify(invoiceData, null, 2)}

## PO MATCH CANDIDATES
${JSON.stringify(matchPayload, null, 2)}

# RULES
- Match each invoice line to exactly one \`matchingReceipts\` entry.
- Primary key: exact item number equality (\`invoice.itemNo == receipt.itemNo\`). Some variations in format (i.e. hyphens and spaces are fine, but the item number should be the same)
- Item description can also be used for matching if item number matching is vague.
- Quantities, unit pricing, and total pricings should be close
- Matches should ensure that date invoiced (on invoice) should be prior to date received (on PO receipt)
- Never split one invoice line across multiple receipts.
- If any invoice line fails item match, add a concise message to \`error\`. Still return matches for other lines if any. If no matches, return an empty header.

# Output formatting
- JSON only. No comments. No trailing commas. Keep numbers as numbers, not strings.

Using the provided invoice and PO data, identify which PO(s) the invoice relates to and produce a JSON structure in this format:

{
  "headers": [
    {
      "Company-Code": "<string>",
      "VendId": "<string>",
      "TermsId": "<string>",
      "TermsDaysInt": <integer>, // convert termsID to an integer in days
      "APAcct": "<string>",
      "APSub": "<string>",
      "Freight-Account": "<string>",
      "Freight-Subaccount": "<string>",
      "Misc-Charge-Account": "<string>",
      "Misc-Charge-Subaccount": "<string>",
      "PO-Number-Seq-Type": "<string>",
      "PO-Number": "<string>",
      "PO-Vendor": "<string>",
      "CuryId": "<string>",
      "CuryRate": <number>,
      "CuryRateType": "<string>",
      "User-Id": "<string>",
      "Job-Project-Number": "<string>",
      "details": [
        [
          {
            "match_object": <index into matchingReceipts>,
            "invoice_price": <unit price from invoice>,
            "invoice_quantity": <quantity from invoice>,
            "invoice_amount": <line total from invoice>
          }
        ]
      ]
    }
  ],
  "error": "<empty if all lines matched; otherwise explain each unmatched invoice line succinctly>"
}
`;
```

**Purpose:** Match invoice line items to PO receipts and generate ERP import data

**Model Used:** GPT-4o or GPT-5

**Input:** 
- Invoice data (from `Invoices` table)
- Match payload (PO candidates from AIM system)

**Output:** Structured `GPTMatchingResponse` with headers and details

**Schema:** Enforced via OpenAI Structured Outputs (see `src/lib/types/po-matching.ts`)

---

## 🗂️ File Structure Summary

### **Prompts Location**
All prompts are centralized in these files:

1. **OCR Prompt** - `src/lib/ocr2/vision-client-native.ts` (lines 84-95)
2. **Invoice Parsing Prompt** - `src/lib/llm/prompts.ts` (lines 11-40)
3. **Individual Invoice Extraction Prompt** - `src/lib/llm/prompts.ts` (lines 45-62)
4. **PO Matching Prompt** - `src/lib/po-matching/openai-matcher.ts` (lines 100-162)

### **API Routes**
- `/api/upload` - File upload and Airtable record creation
- `/api/ocr2/process` - OCR text extraction
- `/api/post-ocr/process` - Document parsing and invoice creation
- `/api/match-invoice` - PO matching

### **Core Libraries**
- `src/lib/ocr2/` - OCR processing (native PDF support)
- `src/lib/llm/` - Document parsing (prompts, schemas, parser)
- `src/lib/post-ocr/` - Post-OCR workflow (processor, Airtable helpers)
- `src/lib/po-matching/` - PO matching logic
- `src/lib/airtable/` - Airtable client and helpers

---

## ⏱️ Timing & Performance

### Typical Processing Times
- **File Upload**: < 5 seconds
- **OCR Processing**: 20-30 seconds (depends on PDF size)
- **Post-OCR Parsing**: 5-10 seconds
- **PO Matching**: 10-15 seconds

### Vercel Configuration
- **Max Duration**: 300 seconds (5 minutes) for OCR and upload routes
- **Runtime**: Node.js
- **OpenAI Timeout**: 60 seconds (configurable via `OPENAI_TIMEOUT_SECONDS`)

---

## 🔑 Environment Variables

### Required for OCR & Parsing
```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o  # or gpt-5
OPENAI_TIMEOUT_SECONDS=60
OPENAI_MAX_RETRIES=2
```

### Required for Airtable
```bash
AIRTABLE_API_KEY=pat...
AIRTABLE_BASE_ID=app...
NEXT_PUBLIC_AIRTABLE_BASE_ID=app...
```

### Required for Vercel
```bash
BLOB_READ_WRITE_TOKEN=vercel_blob_...
VERCEL_URL=auto-set-by-vercel
```

---

## 🔄 Async Processing Flow

```
User Upload
    ↓
[Upload API] ← Returns immediately with file record
    ↓ (async)
[OCR API] ← Extracts text (20-30s)
    ↓ (async)
[Post-OCR API] ← Parses invoices (5-10s)
    ↓
Invoice Records Created ✅
    ↓ (user-initiated)
[Match Invoice API] ← Matches to POs (10-15s)
    ↓
Match Results Ready for ERP Import ✅
```

**Key Points:**
- Upload returns immediately - doesn't wait for OCR
- OCR triggers Post-OCR automatically
- PO Matching is user-initiated (not automatic)
- All steps use fire-and-forget async calls

---

## 📊 Data Flow

### Files Table (Airtable)
```
Status: Queued → Processed → (Attention if error)
Fields:
  - FileName
  - Attachments (PDF from Vercel Blob)
  - Raw-Text (from OCR)
  - Status
  - FileHash
  - Error-Code (if failed)
  - Invoices (linked records)
```

### Invoices Table (Airtable)
```
Created by Post-OCR processing
Fields:
  - Invoice-Number
  - Vendor-Name
  - Invoice-Date
  - Amount
  - Freight-Charge
  - Surcharge
  - Misc-Charge
  - PO-Numbers (array)
  - Raw-Text (individual invoice text)
  - File (linked to Files table)
  - MatchJSONPayload (from PO matching)
```

---

## 🛠️ Debugging & Testing

### Test OCR Processing
```bash
# Test OCR endpoint directly
curl -X POST http://localhost:3000/api/ocr2/process \
  -H "Content-Type: application/json" \
  -d '{"record_id": "recXXXXXXXXXXXXXX", "file_url": "https://..."}'
```

### Test Post-OCR Processing
```bash
# Test post-OCR endpoint directly
curl -X POST http://localhost:3000/api/post-ocr/process \
  -H "Content-Type: application/json" \
  -d '{"file_record_id": "recXXXXXXXXXXXXXX"}'
```

### Test PO Matching
```bash
# Test match endpoint directly
curl -X POST http://localhost:3000/api/match-invoice \
  -H "Content-Type: application/json" \
  -d '{"invoice_id": "recXXXXXXXXXXXXXX"}'
```

### View Logs
- Check Vercel logs for production: `vercel logs`
- Check local console for development: `npm run dev`

---

## 📝 Notes

### Why Native PDF Support?
- **Faster**: Single API call vs PDF → images → chunks → OCR
- **Simpler**: No external dependencies (pdftoppm, pdf-poppler)
- **Better**: Preserves layout and formatting
- **Serverless-friendly**: Works on Vercel without system dependencies

### Why Structured Outputs?
- **Guaranteed schema adherence**: No hallucinated fields
- **Type safety**: JSON schema enforced by OpenAI
- **Reliability**: No need for validation/retry logic
- **Deterministic**: Consistent output format

### Error Handling
- All routes have comprehensive error handling
- Errors are logged to console and Airtable
- Error codes: `OCR_FAILED`, `PDF_CORRUPTED`, `PROCESSING_ERROR`, `TIMEOUT_ERROR`, `DUPLICATE_FILE`
- Status field updated to "Attention" on errors

---

## 🚀 Future Enhancements

### Potential Improvements
1. **Batch processing** - Process multiple files at once
2. **Webhook notifications** - Notify when processing completes
3. **Advanced matching** - ML-based PO matching
4. **Line item extraction** - Extract individual line items during parsing
5. **Confidence scores** - Add confidence metrics to parsed data

---

**Last Updated:** November 12, 2025
**Version:** 2.0 (Native PDF Support)

