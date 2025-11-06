# Comprehensive Schema Migration Analysis

**Created:** 2025-01-XX  
**Purpose:** Analysis of required code changes to implement new Airtable schema with Invoices as primary entity

## Executive Summary

The Airtable schema has been updated to introduce a new **Invoices** table as the primary entity created at file upload. This represents a significant architectural change requiring updates across the entire codebase. The new structure enforces proper referential integrity between:

- **Files** → **Invoices** (many-to-many)
- **Invoices** → **POInvoiceHeaders** (one-to-many)  
- **POInvoiceHeaders** → **POInvoiceDetails** (one-to-many)
- **POInvoiceHeaders** → **PO Receipt** (1:1) - *Note: PO Receipt table not yet confirmed in schema*

## New Schema Structure

### Table Relationships

```
Files (1) ──< (many) Invoices
                │
                └──< (many) POInvoiceHeaders
                              │
                              ├──< (many) POInvoiceDetails
                              │
                              └─── (1:1) PO Receipt (if exists)
```

### Key Relationships

1. **Files ↔ Invoices**: Many-to-many relationship
   - Files table has `Invoices` field (multipleRecordLinks)
   - Invoices table has `Files` field (multipleRecordLinks)

2. **Invoices ↔ POInvoiceHeaders**: One-to-many relationship
   - Multiple POInvoiceHeaders can share the same AP Invoice Number
   - Each POInvoiceHeader links to one Invoice via `Invoices` field
   - Invoices table has `POInvoiceHeaders` field (multipleRecordLinks)

3. **POInvoiceHeaders ↔ POInvoiceDetails**: One-to-many relationship
   - Each POInvoiceDetail belongs to exactly one POInvoiceHeader
   - POInvoiceHeaders has `Invoice Details` field (multipleRecordLinks)
   - POInvoiceDetails has `InvoiceHeaders` field (multipleRecordLinks)

4. **POInvoiceHeaders ↔ PO Receipt**: One-to-one relationship (if PO Receipt table exists)
   - Each POInvoiceHeader corresponds to exactly one PO Receipt
   - *Note: PO Receipt table not found in current schema - may need to be added*

## Current vs. New Flow

### Current Flow (INCORRECT)
```
File Upload
    ↓
OCR Processing
    ↓
Create POInvoiceHeader directly
    ↓
Create POInvoiceDetails
    ↓
Link Files → POInvoiceHeaders
```

### New Flow (REQUIRED)
```
File Upload
    ↓
OCR Processing
    ↓
Create Invoice (PRIMARY ENTITY)
    ↓
Link Files → Invoice
    ↓
Create POInvoiceHeader(s)
    ↓
Link Invoice → POInvoiceHeader(s)
    ↓
Create POInvoiceDetails
    ↓
Link POInvoiceDetails → POInvoiceHeader
```

## Detailed Code Changes Required

### 1. Schema Types (`src/lib/airtable/schema-types.ts`)

**Status:** ✅ Already updated (generated from latest_schema.json)

**What's Done:**
- `FIELD_IDS.INVOICES` - Field IDs for Invoices table
- `TABLE_NAMES.INVOICES` - Table name constant
- `InvoicesFields` interface - TypeScript interface
- `InvoicesRecord` interface - Record interface

**What's Missing:**
- Status constants for Invoices table (if different from POInvoiceHeaders)
- Field mapping constants (similar to `INVOICE_FIELDS`)

**Required Changes:**
```typescript
// Add to schema-types.ts
export const INVOICE_STATUS_VALUES = {
  PENDING: 'Pending',
  MATCHED: 'Matched',
  QUEUED: 'Queued',
  EXPORTED: 'Exported',
  ERROR: 'Error'
} as const;

// Add to TABLE_NAMES (already done)
export const TABLE_NAMES = {
  FILES: 'Files',
  INVOICES: 'Invoices',  // ✅ Already added
  INVOICEHEADERS: 'POInvoiceHeaders',
  INVOICEDETAILS: 'POInvoiceDetails',
} as const;
```

---

### 2. Post-OCR Processing (`src/lib/post-ocr/processor.ts`)

**Current Behavior:**
- Creates POInvoiceHeaders directly from parsed documents
- Links files to POInvoiceHeaders

**Required Changes:**
1. **Create Invoice first** before creating POInvoiceHeaders
2. **Link Files to Invoice** instead of directly to POInvoiceHeaders
3. **Create POInvoiceHeaders** and link them to Invoice
4. **Create POInvoiceDetails** and link them to POInvoiceHeaders (unchanged)

**Specific Code Changes:**

```typescript
// In processPostOCR() function:

// OLD: Create POInvoiceHeader directly
const recordId = await createDocumentRecord(doc, fileRecordId, documentRawText);

// NEW: Create Invoice first, then POInvoiceHeader
const invoiceId = await createInvoiceRecord(doc, fileRecordId, documentRawText);
const poInvoiceHeaderId = await createPOInvoiceHeaderRecord(doc, invoiceId, documentRawText);

// OLD: Link files to POInvoiceHeaders
await linkDocumentsToFile(fileRecordId, createdDocuments);

// NEW: Link files to Invoices
await linkFilesToInvoice(fileRecordId, invoiceId);
```

**Files to Modify:**
- `src/lib/post-ocr/processor.ts` - Main processing logic
- `src/lib/post-ocr/airtable-helpers.ts` - Helper functions

---

### 3. Airtable Helpers (`src/lib/post-ocr/airtable-helpers.ts`)

**Current Functions:**
- `createDocumentRecord()` - Creates POInvoiceHeaders directly
- `linkDocumentsToFile()` - Links files to POInvoiceHeaders

**Required New Functions:**
1. `createInvoiceRecord()` - Create Invoice record
2. `createPOInvoiceHeaderRecord()` - Create POInvoiceHeader linked to Invoice
3. `linkFilesToInvoice()` - Link Files to Invoice (instead of POInvoiceHeaders)
4. `linkInvoiceToPOInvoiceHeaders()` - Link Invoice to POInvoiceHeaders

**Function Signatures:**

```typescript
/**
 * Create an Invoice record (primary entity)
 */
export async function createInvoiceRecord(
  doc: ParsedDocument,
  fileRecordId: string,
  documentRawText: string
): Promise<string>

/**
 * Create a POInvoiceHeader record linked to an Invoice
 */
export async function createPOInvoiceHeaderRecord(
  doc: ParsedDocument,
  invoiceId: string,
  documentRawText: string
): Promise<string>

/**
 * Link Files to Invoice (replaces linkDocumentsToFile)
 */
export async function linkFilesToInvoice(
  fileRecordId: string,
  invoiceId: string
): Promise<void>

/**
 * Link Invoice to POInvoiceHeaders
 */
export async function linkInvoiceToPOInvoiceHeaders(
  invoiceId: string,
  poInvoiceHeaderIds: string[]
): Promise<void>
```

**Field Mappings for Invoice Table:**

From `latest_schema.json`, Invoice table fields:
- `Invoice Number` (fldWJIn3Sb0JSCr2a) - singleLineText
- `VendId` (fldr9N3nkBSzTvOct) - singleLineText
- `Vendor Name` (fldgdPfsIPIu6GFrg) - singleLineText
- `Amount` (fldWskTDGmzu3udgQ) - currency
- `Date` (fldp1dFsyYtFcMk63) - date
- `Freight Charge` (fldmIOZypPrjc45MR) - currency
- `Surcharge` (fld0zGVtnSUl4YWva) - currency
- `Document Raw Text` (fldYajj2Ql4O3ZJNl) - multilineText
- `Files` (fldvgp2k2Ro3xneyz) - multipleRecordLinks → Files
- `Status` (fldbeTDRDaKibT17s) - singleSelect
- `Balance` (fldSjTjrW8Fso4j70) - currency
- `Balance Explanation` (fldySfNaohpv3gv4l) - singleLineText
- `POInvoiceHeaders` (fldzGkuubdu4lLy9n) - multipleRecordLinks → POInvoiceHeaders
- `MatchJSONPayload` (fldFxQNImfvsULyL2) - multilineText
- `Error Code` (fldBbD1mWcSqD5mn5) - singleLineText

**Field Mappings for POInvoiceHeader Table:**

POInvoiceHeader should now link to Invoice:
- `Invoices` (fldlDBkOm2QV6vSSc) - multipleRecordLinks → Invoices

---

### 4. File Upload (`src/app/api/upload/route.ts`)

**Current Behavior:**
- Creates File record
- Links File to POInvoiceHeaders (via `InvoiceHeaderID` field)

**Required Changes:**
- Update field name from `InvoiceHeaderID` to `Invoices` (multipleRecordLinks)
- Link Files to Invoices instead of POInvoiceHeaders

**Note:** The actual linking happens in post-OCR processing, but the field structure needs to be updated.

---

### 5. Transform Functions (`src/lib/airtable/transforms.ts`)

**Current Behavior:**
- `transformAirtableToInvoice()` - Transforms POInvoiceHeaders to Invoice type
- `transformInvoiceToAirtable()` - Transforms Invoice type to POInvoiceHeaders fields

**Required Changes:**
1. **Create new transform functions** for Invoices table:
   - `transformAirtableToInvoiceEntity()` - Transform Invoices table record
   - `transformInvoiceEntityToAirtable()` - Transform Invoice entity to Invoices table fields

2. **Update existing transforms** to handle POInvoiceHeaders separately:
   - `transformAirtableToPOInvoiceHeader()` - Transform POInvoiceHeaders table record
   - `transformPOInvoiceHeaderToAirtable()` - Transform POInvoiceHeader entity to POInvoiceHeaders table fields

3. **Update field mappings:**
   - Create `INVOICE_ENTITY_FIELDS` constant for Invoices table
   - Keep `INVOICE_FIELDS` for POInvoiceHeaders table (rename to `PO_INVOICE_HEADER_FIELDS`)

**Field Mapping Constants:**

```typescript
// New: Field mappings for Invoices table (primary entity)
export const INVOICE_ENTITY_FIELDS = {
  INVOICE_NUMBER: 'Invoice Number',
  VEND_ID: 'VendId',
  VENDOR_NAME: 'Vendor Name',
  AMOUNT: 'Amount',
  DATE: 'Date',
  FREIGHT_CHARGE: 'Freight Charge',
  SURCHARGE: 'Surcharge',
  DOCUMENT_RAW_TEXT: 'Document Raw Text',
  FILES: 'Files',
  STATUS: 'Status',
  BALANCE: 'Balance',
  BALANCE_EXPLANATION: 'Balance Explanation',
  PO_INVOICE_HEADERS: 'POInvoiceHeaders',
  MATCH_JSON_PAYLOAD: 'MatchJSONPayload',
  ERROR_CODE: 'Error Code',
  CREATED_AT: 'Created At',
  MODIFIED_AT: 'Modified At',
} as const;

// Rename existing: Field mappings for POInvoiceHeaders table
export const PO_INVOICE_HEADER_FIELDS = {
  // ... existing fields ...
  INVOICES: 'Invoices', // New field linking to Invoices table
} as const;
```

---

### 6. Invoice Hooks (`src/lib/airtable/invoice-hooks.ts`)

**Current Behavior:**
- `useInvoices()` - Fetches from POInvoiceHeaders table
- Transforms POInvoiceHeaders to Invoice type

**Required Changes:**
1. **Update `useInvoices()`** to fetch from Invoices table instead of POInvoiceHeaders
2. **Create new hook** `usePOInvoiceHeaders()` for POInvoiceHeaders table
3. **Update transforms** to use new Invoice entity transforms

**New Hook Structure:**

```typescript
// Fetch Invoices (primary entity)
export function useInvoices(options: UseInvoicesOptions = {}): UseInvoicesResult {
  // Fetch from TABLE_NAMES.INVOICES instead of TABLE_NAMES.INVOICEHEADERS
  // Use transformAirtableToInvoiceEntity() instead of transformAirtableToInvoice()
}

// Fetch POInvoiceHeaders (linked to Invoices)
export function usePOInvoiceHeaders(
  invoiceId?: string,
  options: UsePOInvoiceHeadersOptions = {}
): UsePOInvoiceHeadersResult {
  // Fetch from TABLE_NAMES.INVOICEHEADERS
  // Filter by invoiceId if provided
  // Use transformAirtableToPOInvoiceHeader()
}
```

---

### 7. Linked Documents Hooks (`src/lib/airtable/linked-documents-hooks.ts`)

**Current Behavior:**
- `useLinkedDocuments()` - Fetches linked files, emails, invoices
- Links are based on POInvoiceHeaders

**Required Changes:**
1. **Update file linking logic** to use Invoices table instead of POInvoiceHeaders
2. **Update field references:**
   - Files table: `InvoiceHeaderID` → `Invoices` (multipleRecordLinks)
   - Invoices table: `Files` field (multipleRecordLinks)
   - POInvoiceHeaders table: `Invoices` field (multipleRecordLinks)

**Specific Changes:**

```typescript
// In useLinkedDocuments():

case 'invoice':
  // OLD: linkedFileIds = fields['Files'] || [];
  // NEW: Fetch Invoice record, then get Files from Invoice
  linkedFileIds = invoiceRecord.fields['Files'] || [];
  linkedPOInvoiceHeaderIds = invoiceRecord.fields['POInvoiceHeaders'] || [];
  break;

case 'file':
  // OLD: linkedInvoiceIds = fields['InvoiceHeaderID'] || [];
  // NEW: linkedInvoiceIds = fields['Invoices'] || [];
  break;
```

---

### 8. Invoice Details Hooks (`src/lib/airtable/invoice-details-hooks.ts`)

**Current Behavior:**
- `useInvoiceDetails()` - Fetches POInvoiceDetails by IDs from POInvoiceHeaders

**Required Changes:**
- **No changes needed** - POInvoiceDetails still link to POInvoiceHeaders
- The relationship POInvoiceHeaders → POInvoiceDetails remains unchanged

---

### 9. UI Components

**Files to Review:**
- `src/components/documents/invoice-coding-interface.tsx` - Invoice editing UI
- `src/components/documents/document-details-panel.tsx` - Document display
- `src/components/documents/shared-tabs/links-tab.tsx` - Linked documents display

**Required Changes:**
1. **Update to fetch Invoices** instead of POInvoiceHeaders for primary display
2. **Add UI for POInvoiceHeaders** if multiple headers per invoice
3. **Update linked documents display** to show proper relationships

**Specific Components:**

```typescript
// invoice-coding-interface.tsx
// OLD: const { invoices } = useInvoices();
// NEW: 
const { invoices } = useInvoices(); // Now fetches from Invoices table
const { poInvoiceHeaders } = usePOInvoiceHeaders(invoiceId); // Fetch headers for invoice

// document-details-panel.tsx
// Update to show Invoice as primary, POInvoiceHeaders as linked records
```

---

### 10. API Routes

**Files to Review:**
- `src/app/api/airtable/[table]/route.ts` - Generic Airtable API
- `src/app/api/post-ocr/process/route.ts` - Post-OCR processing endpoint
- `src/app/api/ocr2/process/route.ts` - OCR2 processing endpoint

**Required Changes:**
- **No changes needed** - Generic API routes should work with new table names
- **Update post-OCR processing** to use new flow (create Invoice first)

---

### 11. Type Definitions (`src/types/documents.ts`)

**Current Behavior:**
- `Invoice` type represents POInvoiceHeaders

**Required Changes:**
1. **Create new `InvoiceEntity` type** for Invoices table
2. **Create new `POInvoiceHeader` type** for POInvoiceHeaders table
3. **Update `Invoice` type** or create separate types

**Type Structure:**

```typescript
// Primary Invoice entity (from Invoices table)
export interface InvoiceEntity {
  id: string;
  type: 'invoices';
  invoiceNumber: string;
  vendId?: string;
  vendorName: string;
  amount: number;
  date: Date;
  freightCharge?: number;
  surcharge?: number;
  status: DocumentStatus;
  balance?: number;
  balanceExplanation?: string;
  documentRawText?: string;
  files: string[]; // File record IDs
  poInvoiceHeaders: string[]; // POInvoiceHeader record IDs
  createdAt: Date;
  updatedAt: Date;
}

// PO Invoice Header (from POInvoiceHeaders table)
export interface POInvoiceHeader {
  id: string;
  type: 'po-invoice-headers';
  invoiceId: string; // Link to Invoice entity
  // ... other POInvoiceHeader fields ...
  invoiceDetails: string[]; // POInvoiceDetails record IDs
}
```

---

## Migration Strategy

### Phase 1: Schema & Types (✅ COMPLETE)
- [x] Fetch latest schema from Airtable
- [x] Generate TypeScript types
- [x] Update schema documentation

### Phase 2: Core Data Layer
- [ ] Create Invoice entity transform functions
- [ ] Create POInvoiceHeader transform functions
- [ ] Update field mapping constants
- [ ] Create new helper functions for Invoice creation

### Phase 3: Post-OCR Processing
- [ ] Update `createInvoiceRecord()` function
- [ ] Update `createPOInvoiceHeaderRecord()` function
- [ ] Update `linkFilesToInvoice()` function
- [ ] Update `processPostOCR()` workflow
- [ ] Test end-to-end file upload → Invoice creation

### Phase 4: Data Hooks
- [ ] Update `useInvoices()` to fetch from Invoices table
- [ ] Create `usePOInvoiceHeaders()` hook
- [ ] Update `useLinkedDocuments()` for new relationships
- [ ] Update `useInvoiceDetails()` if needed

### Phase 5: UI Components
- [ ] Update invoice list views
- [ ] Update invoice detail views
- [ ] Update linked documents display
- [ ] Add POInvoiceHeaders display if multiple per invoice

### Phase 6: Testing & Validation
- [ ] Test file upload → Invoice creation
- [ ] Test multiple POInvoiceHeaders per Invoice
- [ ] Test POInvoiceDetails linking
- [ ] Validate referential integrity
- [ ] Test UI displays correctly

## Key Considerations

### 1. Backward Compatibility
- **Issue:** Existing data may have POInvoiceHeaders without Invoices
- **Solution:** Create migration script to:
  - Create Invoice records for existing POInvoiceHeaders
  - Link POInvoiceHeaders to new Invoice records
  - Link Files to new Invoice records

### 2. Multiple POInvoiceHeaders per Invoice
- **Requirement:** Multiple POInvoiceHeaders can share same AP Invoice Number
- **Implementation:** 
  - Group POInvoiceHeaders by AP Invoice Number
  - Create one Invoice per unique AP Invoice Number
  - Link all matching POInvoiceHeaders to that Invoice

### 3. PO Receipt Table
- **Status:** Not found in current schema
- **Action Required:** 
  - Confirm if PO Receipt table exists
  - If exists, add to schema documentation
  - Implement 1:1 relationship with POInvoiceHeaders
  - If doesn't exist, create table or document as future requirement

### 4. Field Name Consistency
- **Current:** Mix of field names and IDs
- **Recommendation:** Use field names consistently (as done in current code)
- **Exception:** Field IDs in FIELD_IDS constants for reference

### 5. Status Values
- **Invoices table:** Pending, Matched, Queued, Exported, Error
- **POInvoiceHeaders table:** Queued, Exported, Error
- **Note:** Different status values - ensure proper mapping

## Testing Checklist

### Unit Tests
- [ ] Invoice entity creation
- [ ] POInvoiceHeader creation with Invoice link
- [ ] File linking to Invoice
- [ ] Transform functions (both directions)
- [ ] Hook functions

### Integration Tests
- [ ] File upload → Invoice creation flow
- [ ] OCR processing → Invoice + POInvoiceHeader creation
- [ ] Multiple POInvoiceHeaders per Invoice
- [ ] POInvoiceDetails creation and linking

### End-to-End Tests
- [ ] Complete file upload workflow
- [ ] Invoice display in UI
- [ ] POInvoiceHeaders display
- [ ] Linked documents display
- [ ] Invoice editing (if applicable)

## Risk Assessment

### High Risk Areas
1. **Post-OCR Processing** - Core workflow change
2. **Data Hooks** - Used throughout UI
3. **Transform Functions** - Data conversion logic

### Medium Risk Areas
1. **UI Components** - Display logic changes
2. **Linked Documents** - Relationship changes

### Low Risk Areas
1. **API Routes** - Generic, should work as-is
2. **Type Definitions** - Additive changes

## Estimated Effort

- **Phase 2 (Core Data Layer):** 4-6 hours
- **Phase 3 (Post-OCR Processing):** 6-8 hours
- **Phase 4 (Data Hooks):** 4-6 hours
- **Phase 5 (UI Components):** 6-8 hours
- **Phase 6 (Testing):** 4-6 hours

**Total Estimated Effort:** 24-34 hours

## Next Steps

1. **Review this analysis** with team
2. **Confirm PO Receipt table** status
3. **Create migration script** for existing data (if needed)
4. **Begin Phase 2 implementation**
5. **Set up test environment** with sample data

---

*This document should be updated as implementation progresses and new findings are discovered.*

