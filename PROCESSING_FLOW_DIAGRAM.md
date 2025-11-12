# Invoice Processing Flow Diagram

## 📊 Complete Visual Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          USER UPLOADS PDF FILE                               │
│                     (src/app/(app)/upload/page.tsx)                         │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         STEP 1: FILE UPLOAD API                              │
│                      (src/app/api/upload/route.ts)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. Validate file (size, type, format)                                      │
│  2. Generate file hash (SHA-256)                                            │
│  3. Check for duplicates                                                    │
│  4. Upload to Vercel Blob Storage                                           │
│  5. Create Airtable record in Files table                                   │
│     - Status: "Queued"                                                      │
│     - FileName, FileHash, Attachments                                       │
│  6. Trigger OCR processing (async)                                          │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 │ Returns immediately
                                 │ (doesn't wait for OCR)
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  Response to User:     │
                    │  - File uploaded ✅    │
                    │  - Record ID           │
                    │  - Status: Queued      │
                    └────────────────────────┘

                                 │ (async trigger)
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         STEP 2: OCR PROCESSING                               │
│                    (src/app/api/ocr2/process/route.ts)                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  Orchestrator: src/lib/ocr2/orchestrator-native.ts                          │
│  Vision Client: src/lib/ocr2/vision-client-native.ts                        │
│                                                                              │
│  1. Download PDF from Vercel Blob                                           │
│  2. Validate PDF (format, size, pages)                                      │
│  3. Upload PDF to OpenAI Files API                                          │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  🎯 PROMPT #1: OCR TEXT EXTRACTION                                 │    │
│  │  Location: src/lib/ocr2/vision-client-native.ts (lines 84-95)     │    │
│  │  Model: GPT-4o / GPT-5 (native PDF support)                       │    │
│  │                                                                     │    │
│  │  "Extract ALL text from this PDF document.                        │    │
│  │   Preserve the original formatting, spacing, and layout..."       │    │
│  │                                                                     │    │
│  │  Input: PDF file (via OpenAI Files API)                           │    │
│  │  Output: Raw text string                                          │    │
│  │  Tokens: ~3,000-8,000                                             │    │
│  │  Time: 20-30 seconds                                              │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  4. Extract text using OpenAI Vision API                                    │
│  5. Update Airtable Files record:                                           │
│     - Raw-Text: <extracted text>                                            │
│     - Status: "Processed"                                                   │
│  6. Trigger Post-OCR processing (async)                                     │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 │ (async trigger)
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      STEP 3: POST-OCR PROCESSING                             │
│                  (src/app/api/post-ocr/process/route.ts)                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  Processor: src/lib/post-ocr/processor.ts                                   │
│  Parser: src/lib/llm/parser.ts                                              │
│  Prompts: src/lib/llm/prompts.ts                                            │
│                                                                              │
│  1. Fetch file record from Airtable                                         │
│  2. Get Raw-Text field                                                      │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  🎯 PROMPT #2: INVOICE PARSING                                     │    │
│  │  Location: src/lib/llm/prompts.ts - createParsePrompt()           │    │
│  │  Model: GPT-4o / GPT-5 (structured outputs)                       │    │
│  │                                                                     │    │
│  │  "You are an expert at parsing OCR text from invoices.            │    │
│  │   Analyze the OCR text and extract all INVOICES present..."       │    │
│  │                                                                     │    │
│  │  Input: Raw OCR text                                              │    │
│  │  Output: Array of ParsedDocument objects                          │    │
│  │  Schema: Enforced via OpenAI Structured Outputs                   │    │
│  │  Tokens: ~1,700-4,500                                             │    │
│  │  Time: 5-10 seconds                                               │    │
│  │                                                                     │    │
│  │  Fields Extracted:                                                │    │
│  │  - document_type: "invoice" | "other"                            │    │
│  │  - invoice_number, vendor_name, invoice_date                     │    │
│  │  - amount, freight_charge, surcharge, misc_charge                │    │
│  │  - po_numbers: string[]                                          │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  3. Parse documents with LLM                                                │
│  4. Filter to invoices only (skip document_type="other")                    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │  IF multiple invoices detected:                                 │       │
│  │                                                                  │       │
│  │  🎯 PROMPT #3: INDIVIDUAL INVOICE TEXT EXTRACTION               │       │
│  │  Location: src/lib/llm/prompts.ts - createExtractDocTextPrompt()│       │
│  │  Model: GPT-4o / GPT-5                                          │       │
│  │                                                                  │       │
│  │  "You are extracting the OCR text that belongs to ONE          │       │
│  │   specific invoice from a larger text block..."                │       │
│  │                                                                  │       │
│  │  Input: Full raw text + invoice identifying fields             │       │
│  │  Output: Plain text for specific invoice                       │       │
│  │  Tokens: ~2,500-6,500 per invoice                             │       │
│  │  Time: 3-5 seconds per invoice                                │       │
│  │                                                                  │       │
│  │  Called once per invoice when multiple invoices in file        │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                              │
│  5. For each invoice:                                                       │
│     - Extract individual text (if multiple)                                 │
│     - Create Invoice record in Invoices table                               │
│     - Store parsed fields and raw text                                      │
│  6. Link invoices back to file record                                       │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────────┐
                    │  Invoice Records Created:  │
                    │  - Invoice-Number          │
                    │  - Vendor-Name             │
                    │  - Invoice-Date            │
                    │  - Amount, Charges         │
                    │  - PO-Numbers              │
                    │  - Raw-Text                │
                    │  - Linked to File          │
                    └────────────────────────────┘

                                 │
                                 │ USER CLICKS "MATCH INVOICE"
                                 │ (manual trigger)
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      STEP 4: PO MATCHING (Optional)                          │
│                   (src/app/api/match-invoice/route.ts)                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  Matcher: src/lib/po-matching/openai-matcher.ts                             │
│                                                                              │
│  1. Fetch invoice data from Airtable                                        │
│  2. Fetch match payload from AIM system (PO candidates)                     │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  🎯 PROMPT #4: PO MATCHING                                         │    │
│  │  Location: src/lib/po-matching/openai-matcher.ts                  │    │
│  │  Model: GPT-4o / GPT-5 (structured outputs)                       │    │
│  │                                                                     │    │
│  │  System: "You are an expert at matching invoices to purchase      │    │
│  │           orders and generating structured ERP import data."       │    │
│  │                                                                     │    │
│  │  User: "You match supplier invoices to PO receipt lines.          │    │
│  │         Use only the provided JSON. Do not invent data..."         │    │
│  │                                                                     │    │
│  │  Input: Invoice data + PO match candidates                        │    │
│  │  Output: GPTMatchingResponse (headers + details)                  │    │
│  │  Schema: Enforced via OpenAI Structured Outputs                   │    │
│  │  Tokens: ~3,500-12,000                                            │    │
│  │  Time: 10-15 seconds                                              │    │
│  │                                                                     │    │
│  │  Matching Rules:                                                  │    │
│  │  - Match by item number (primary key)                            │    │
│  │  - Consider item description                                     │    │
│  │  - Verify quantities and pricing                                 │    │
│  │  - Check date consistency                                        │    │
│  │  - Never split invoice line across multiple receipts             │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  3. Generate PO matches with OpenAI                                         │
│  4. Return structured match results:                                        │
│     - POInvoiceHeaders (one per PO)                                         │
│     - POInvoiceDetails (nested match objects)                               │
│     - Error messages (if any lines unmatched)                               │
│  5. Store MatchJSONPayload in Invoice record                                │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────────┐
                    │  Match Results Ready:      │
                    │  - Headers with PO info    │
                    │  - Details with matches    │
                    │  - Ready for ERP import    │
                    └────────────────────────────┘
```

---

## 🔄 Async Processing Timeline

```
Time    Action                          Status in Airtable
─────────────────────────────────────────────────────────────
0s      User uploads file               -
1s      File uploaded to Blob           -
2s      Airtable record created         Status: "Queued"
2s      Upload API returns ✅           Status: "Queued"
        
        [User sees success message]
        
3s      OCR processing starts           Status: "Queued"
5s      PDF uploaded to OpenAI          Status: "Queued"
10s     OpenAI processing...            Status: "Queued"
25s     Text extraction complete        Status: "Queued"
27s     Airtable updated                Status: "Processed"
27s     OCR API returns ✅              Status: "Processed"
        
28s     Post-OCR processing starts      Status: "Processed"
30s     LLM parsing documents...        Status: "Processed"
33s     Invoice records created         Status: "Processed"
35s     Invoices linked to file         Status: "Processed"
35s     Post-OCR API returns ✅         Status: "Processed"
        
        [User sees invoice records in UI]
        
---     User clicks "Match Invoice"     Status: "Processed"
+1s     Fetch invoice + PO data         Status: "Processed"
+3s     OpenAI matching...              Status: "Processed"
+15s    Match results returned          Status: "Processed"
+15s    Match API returns ✅            Status: "Processed"
        
        [User sees match results]
```

**Total Time:**
- Upload to OCR complete: ~27 seconds
- Upload to invoices created: ~35 seconds
- Upload to PO matching: ~50 seconds (if user initiates)

---

## 🗂️ Data Flow Through Tables

```
┌─────────────────────────────────────────────────────────────────┐
│                         FILES TABLE                              │
├─────────────────────────────────────────────────────────────────┤
│  Record ID: recXXXXXXXXXXXXXX                                   │
│                                                                  │
│  After Upload:                                                   │
│  ├─ FileName: "invoice-2024-11-12.pdf"                         │
│  ├─ Status: "Queued"                                           │
│  ├─ FileHash: "abc123..."                                      │
│  ├─ Attachments: [{ url: "https://blob.vercel..." }]          │
│  └─ Invoices: []                                               │
│                                                                  │
│  After OCR:                                                      │
│  ├─ Raw-Text: "INVOICE\nDate: 2024-11-12\n..."                │
│  ├─ Status: "Processed"                                        │
│  └─ Invoices: []                                               │
│                                                                  │
│  After Post-OCR:                                                 │
│  └─ Invoices: [recYYYYYYYYYYYYYY, recZZZZZZZZZZZZZZ]          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Links to
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       INVOICES TABLE                             │
├─────────────────────────────────────────────────────────────────┤
│  Record ID: recYYYYYYYYYYYYYY                                   │
│                                                                  │
│  After Post-OCR:                                                 │
│  ├─ Invoice-Number: "INV-12345"                                │
│  ├─ Vendor-Name: "ACME Corp"                                   │
│  ├─ Invoice-Date: "2024-11-12"                                 │
│  ├─ Amount: "1234.56"                                          │
│  ├─ Freight-Charge: 45.50                                      │
│  ├─ Surcharge: 12.25                                           │
│  ├─ Misc-Charge: 32.10                                         │
│  ├─ PO-Numbers: ["PO-001", "PO-002"]                           │
│  ├─ Raw-Text: "INVOICE\nINV-12345\n..."                       │
│  ├─ File: [recXXXXXXXXXXXXXX]                                 │
│  └─ MatchJSONPayload: null                                     │
│                                                                  │
│  After PO Matching:                                              │
│  └─ MatchJSONPayload: {                                        │
│       "headers": [                                             │
│         {                                                      │
│           "PO-Number": "PO-001",                              │
│           "details": [...]                                    │
│         }                                                      │
│       ]                                                        │
│     }                                                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Prompt Locations Summary

| Prompt | File | Function | Lines |
|--------|------|----------|-------|
| **#1: OCR Extraction** | `src/lib/ocr2/vision-client-native.ts` | `extractTextFromPDF()` | 84-95 |
| **#2: Invoice Parsing** | `src/lib/llm/prompts.ts` | `createParsePrompt()` | 11-40 |
| **#3: Individual Text** | `src/lib/llm/prompts.ts` | `createExtractDocTextPrompt()` | 45-62 |
| **#4: PO Matching** | `src/lib/po-matching/openai-matcher.ts` | `createPOMatchingPrompt()` | 100-162 |

---

## 🚦 Status Flow

```
File Upload
    ↓
┌─────────┐
│ Queued  │ ← File uploaded, waiting for OCR
└────┬────┘
     │
     │ OCR Processing (20-30s)
     ↓
┌───────────┐
│ Processed │ ← OCR complete, text extracted
└─────┬─────┘
      │
      │ Post-OCR Processing (5-10s)
      ↓
┌───────────┐
│ Processed │ ← Invoices created and linked
└─────┬─────┘
      │
      │ (If error occurs at any step)
      ↓
┌───────────┐
│ Attention │ ← Error occurred, needs review
└───────────┘
    ↓
Error-Code set:
- OCR_FAILED
- PDF_CORRUPTED
- PROCESSING_ERROR
- TIMEOUT_ERROR
- DUPLICATE_FILE
```

---

## 💰 Cost Breakdown

```
Per Invoice Processing:

┌─────────────────────────────────────────────────────────┐
│  OCR Extraction (Prompt #1)                             │
│  Tokens: ~3,000-8,000                                   │
│  Cost: $0.02-0.05                                       │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│  Invoice Parsing (Prompt #2)                            │
│  Tokens: ~1,700-4,500                                   │
│  Cost: $0.01-0.02                                       │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│  Individual Text (Prompt #3) - if multiple invoices     │
│  Tokens: ~2,500-6,500 per invoice                      │
│  Cost: $0.01-0.03 per invoice                          │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│  PO Matching (Prompt #4) - optional                     │
│  Tokens: ~3,500-12,000                                  │
│  Cost: $0.02-0.06                                       │
└─────────────────────────────────────────────────────────┘

Total Cost per Invoice: $0.05-0.13 (GPT-4o)
```

---

## 🔧 Configuration

### Environment Variables
```bash
# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o  # or gpt-5
OPENAI_TIMEOUT_SECONDS=60
OPENAI_MAX_RETRIES=2

# Airtable
AIRTABLE_API_KEY=pat...
AIRTABLE_BASE_ID=app...

# Vercel
BLOB_READ_WRITE_TOKEN=vercel_blob_...
```

### Vercel Route Config
```typescript
// All OCR/processing routes
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes
```

---

## 📚 Related Documentation

- **Detailed Sequence:** `FILE_UPLOAD_SEQUENCE_AND_PROMPTS.md`
- **Prompts Reference:** `PROMPTS_QUICK_REFERENCE.md`
- **OCR Implementation:** `OCR2_NATIVE_MIGRATION_COMPLETE.md`
- **Post-OCR Processing:** `POST_OCR_SUMMARY.md`
- **PO Matching:** `PO_MATCHING_IMPLEMENTATION.md`

---

**Last Updated:** November 12, 2025

