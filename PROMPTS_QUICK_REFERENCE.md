# Prompts Quick Reference

## 🎯 All Prompts at a Glance

This is a quick reference for all AI prompts used in the invoice processing pipeline.

---

## Prompt #1: OCR Text Extraction

**File:** `src/lib/ocr2/vision-client-native.ts` (lines 84-95)

**When:** Immediately after file upload

**Model:** GPT-4o or GPT-5 (native PDF support)

**Input:** PDF file (via OpenAI Files API)

**Output:** Raw text string

**Prompt:**
```
Extract ALL text from this PDF document. Preserve the original formatting, spacing, and layout as much as possible. 

Instructions:
- Include all visible text from every page
- Preserve tables, lists, headers, and footers
- Maintain paragraph breaks and section divisions
- Include page numbers if visible
- If a page break is detected, indicate it with "--- PAGE BREAK ---"
- Do not add any commentary or explanations
- Return only the extracted text

Return the complete text extraction.
```

**Key Settings:**
- Temperature: 0.1 (for GPT-4o), default (for GPT-5)
- Max tokens: 16000
- Timeout: 60 seconds

---

## Prompt #2: Invoice Parsing

**File:** `src/lib/llm/prompts.ts` - `createParsePrompt()` (lines 11-40)

**When:** After OCR completes (automatic)

**Model:** GPT-4o or GPT-5

**Input:** Raw OCR text

**Output:** Structured JSON array of invoice objects

**Prompt:**
```
You are an expert at parsing OCR text from invoices.

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

Output the JSON object with a "documents" array now.
```

**Key Settings:**
- Uses OpenAI Structured Outputs (strict schema enforcement)
- Schema: `DocumentArraySchema` (see `src/lib/llm/schemas.ts`)
- Temperature: Default (GPT-5 only supports default)

**Fields Extracted:**
- `document_type`: "invoice" | "other"
- `invoice_number`: string | null
- `vendor_name`: string | null
- `invoice_date`: string (YYYY-MM-DD) | null
- `amount`: string | null
- `freight_charge`: number | null
- `surcharge`: number | null
- `misc_charge`: number | null
- `po_numbers`: string[] (array)

---

## Prompt #3: Individual Invoice Text Extraction

**File:** `src/lib/llm/prompts.ts` - `createExtractDocTextPrompt()` (lines 45-62)

**When:** Only when multiple invoices detected in one file

**Model:** GPT-4o or GPT-5

**Input:** Full raw OCR text + invoice identifying fields

**Output:** Plain text for specific invoice

**Prompt:**
```
You are extracting the OCR text that belongs to ONE specific invoice from a larger text block.

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

Extracted text for the target invoice:
```

**Usage Logic:**
```typescript
if (parsedDocuments.length > 1) {
  // Multiple invoices - extract individual text for each
  documentRawText = await extractSingleDocumentText(rawText, doc);
} else {
  // Single invoice - use full raw text
  documentRawText = rawText;
}
```

---

## Prompt #4: PO Matching

**File:** `src/lib/po-matching/openai-matcher.ts` - `createPOMatchingPrompt()` (lines 100-162)

**When:** User clicks "Match Invoice" button

**Model:** GPT-4o or GPT-5

**Input:** Invoice data + PO match candidates (from AIM system)

**Output:** Structured JSON with headers and details for ERP import

**System Message:**
```
You are an expert at matching invoices to purchase orders and generating structured ERP import data.
```

**User Prompt:**
```
You match supplier invoices to PO receipt lines. Use only the provided JSON. Do not invent data. Output valid JSON matching the exact schema below. No extra text.

## INVOICE DATA
${JSON.stringify(invoiceData, null, 2)}

## PO MATCH CANDIDATES
${JSON.stringify(matchPayload, null, 2)}

# RULES
- Match each invoice line to exactly one `matchingReceipts` entry.
- Primary key: exact item number equality (`invoice.itemNo == receipt.itemNo`). Some variations in format (i.e. hyphens and spaces are fine, but the item number should be the same)
- Item description can also be used for matching if item number matching is vague.
- Quantities, unit pricing, and total pricings should be close
- Matches should ensure that date invoiced (on invoice) should be prior to date received (on PO receipt)
- Never split one invoice line across multiple receipts.
- If any invoice line fails item match, add a concise message to `error`. Still return matches for other lines if any. If no matches, return an empty header.

# Output formatting
- JSON only. No comments. No trailing commas. Keep numbers as numbers, not strings.

Using the provided invoice and PO data, identify which PO(s) the invoice relates to and produce a JSON structure in this format:

{
  "headers": [
    {
      "Company-Code": "<string>",
      "VendId": "<string>",
      "TermsId": "<string>",
      "TermsDaysInt": <integer>,
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
```

**Key Settings:**
- Uses OpenAI Structured Outputs (strict schema enforcement)
- Schema: `POMatchingJSONSchema` (see `src/lib/types/po-matching.ts`)
- Temperature: Default (GPT-5 only supports default)

**Output Structure:**
- `headers[]`: Array of POInvoiceHeader objects
- `headers[].details[][]`: Nested array of match objects
- `error`: String describing any unmatched lines

---

## 🔧 Modifying Prompts

### To Change OCR Prompt
Edit: `src/lib/ocr2/vision-client-native.ts` lines 84-95

**Example:** Add instruction to extract tables
```typescript
text: `Extract ALL text from this PDF document. Preserve the original formatting, spacing, and layout as much as possible. 

Instructions:
- Include all visible text from every page
- Preserve tables, lists, headers, and footers
- For tables, use | to separate columns  // <-- NEW
- Maintain paragraph breaks and section divisions
...
```

### To Change Invoice Parsing Prompt
Edit: `src/lib/llm/prompts.ts` - `createParsePrompt()` function

**Example:** Add new field extraction
```typescript
// 1. Update prompt rules
14. tax_amount should be a numeric value for sales tax (e.g., 123.45). Look for terms like "Tax", "Sales Tax", "GST", "VAT", etc.

// 2. Update schema in src/lib/llm/schemas.ts
export const ParsedDocumentSchema = {
  type: "object",
  properties: {
    // ... existing fields ...
    tax_amount: { type: ["number", "null"] },  // <-- NEW
  },
  // ...
}

// 3. Update TypeScript type
export interface ParsedDocument {
  // ... existing fields ...
  tax_amount: number | null;  // <-- NEW
}
```

### To Change PO Matching Prompt
Edit: `src/lib/po-matching/openai-matcher.ts` - `createPOMatchingPrompt()` function

**Example:** Adjust matching rules
```typescript
# RULES
- Match each invoice line to exactly one `matchingReceipts` entry.
- Primary key: exact item number equality
- Allow fuzzy matching on item descriptions  // <-- NEW
- Quantities must be within 5% tolerance  // <-- NEW
...
```

---

## 📊 Prompt Performance

### Token Usage (Typical)

**OCR Extraction:**
- Input: ~2,000-5,000 tokens (depends on PDF size)
- Output: ~1,000-3,000 tokens (extracted text)
- Total: ~3,000-8,000 tokens per PDF

**Invoice Parsing:**
- Input: ~1,500-4,000 tokens (raw text + prompt)
- Output: ~200-500 tokens (structured JSON)
- Total: ~1,700-4,500 tokens per file

**Individual Text Extraction:**
- Input: ~2,000-5,000 tokens (full text + prompt)
- Output: ~500-1,500 tokens (individual invoice text)
- Total: ~2,500-6,500 tokens per invoice

**PO Matching:**
- Input: ~3,000-10,000 tokens (invoice + PO data + prompt)
- Output: ~500-2,000 tokens (match results)
- Total: ~3,500-12,000 tokens per match

### Cost Estimates (GPT-4o)

**Per Invoice (Full Pipeline):**
- OCR: ~$0.02-0.05
- Parsing: ~$0.01-0.02
- PO Matching: ~$0.02-0.06
- **Total: ~$0.05-0.13 per invoice**

**Note:** Costs vary based on:
- PDF size and complexity
- Number of invoices per file
- Number of PO candidates
- Model used (GPT-4o vs GPT-5)

---

## 🧪 Testing Prompts

### Test OCR Prompt
```bash
# Upload a test PDF and check the Raw-Text field
curl -X POST http://localhost:3000/api/upload \
  -F "file=@test-invoice.pdf"
```

### Test Invoice Parsing Prompt
```bash
# Run post-OCR on a processed file
curl -X POST http://localhost:3000/api/post-ocr/process \
  -H "Content-Type: application/json" \
  -d '{"file_record_id": "recXXXXXXXXXXXXXX"}'
```

### Test PO Matching Prompt
```bash
# Run match on an invoice
curl -X POST http://localhost:3000/api/match-invoice \
  -H "Content-Type: application/json" \
  -d '{"invoice_id": "recXXXXXXXXXXXXXX"}'
```

### View Prompt Output
Check the console logs or Vercel logs for:
- `📦 Received response from OpenAI: ...`
- `✅ Successfully parsed X document(s)`
- `✅ Successfully generated X headers with Y total match objects`

---

## 📚 Related Documentation

- **Full Sequence Flow:** `FILE_UPLOAD_SEQUENCE_AND_PROMPTS.md`
- **OCR Implementation:** `OCR2_NATIVE_MIGRATION_COMPLETE.md`
- **Post-OCR Processing:** `POST_OCR_SUMMARY.md`
- **PO Matching:** `PO_MATCHING_IMPLEMENTATION.md`
- **Structured Outputs:** `STRUCTURED_OUTPUTS_UPDATE.md`

---

**Last Updated:** November 12, 2025

