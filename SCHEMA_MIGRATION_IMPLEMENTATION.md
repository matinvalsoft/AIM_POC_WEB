# Schema Migration Implementation Summary

**Date:** 2025-01-XX  
**Status:** ✅ **COMPLETED**

## Overview

Successfully implemented the new Airtable schema where **Invoices** table is the primary entity created at file upload. The implementation correctly handles the flow where POInvoiceHeaders are created later by the AIM bridge (not during initial file upload).

## Changes Implemented

### 1. Transform Functions (`src/lib/airtable/transforms.ts`)

**✅ Completed**

#### New Constants
- `INVOICE_ENTITY_FIELDS` - Field mappings for Invoices table (primary entity)
- `PO_INVOICE_HEADER_FIELDS` - Field mappings for POInvoiceHeaders table
- `INVOICE_FIELDS` - Legacy alias pointing to `PO_INVOICE_HEADER_FIELDS`

#### New Transform Functions
- `transformAirtableToInvoiceEntity()` - Transform Invoices table records to Invoice type
- `transformInvoiceToAirtableEntity()` - Transform Invoice type to Invoices table fields
- Updated `transformAirtableToInvoice()` - Now handles POInvoiceHeaders (backward compatibility)
- Updated `transformInvoiceToAirtable()` - Now handles POInvoiceHeaders format

#### Key Changes
- Invoices table uses fields: `Invoice Number`, `Date`, `Amount`, `VendId`, `Vendor Name`
- POInvoiceHeaders table uses fields: `AP-Invoice-Number`, `Invoice-Date`, `Total-Invoice-Amount`
- Status mapping updated for both tables:
  - Invoices: Pending, Matched, Queued, Exported, Error
  - POInvoiceHeaders: Queued, Exported, Error

---

### 2. Airtable Helpers (`src/lib/post-ocr/airtable-helpers.ts`)

**✅ Completed**

#### New Functions

**`createInvoiceRecord()`**
- Creates Invoice record in Invoices table (primary entity)
- Links to Files via `Files` field
- Sets status to 'Pending'
- Returns Invoice record ID

**`createPOInvoiceHeaderRecord()`**
- Creates POInvoiceHeader record in POInvoiceHeaders table
- Links to Invoice via `Invoices` field
- Links to Files via `Files` field
- Sets status to 'Queued'
- Returns POInvoiceHeader record ID
- **Note:** Should be called by AIM bridge, not during initial file upload

#### Updated Functions

**`linkDocumentsToFile()`**
- Updated to link Files to Invoices (not POInvoiceHeaders)
- Uses `Invoices` field (multipleRecordLinks) instead of `InvoiceHeaderID`

**`createInvoiceDetails()`**
- Updated comments to clarify it's for POInvoiceHeader creation
- Should be called when POInvoiceHeader is created by AIM bridge

---

### 3. Post-OCR Processor (`src/lib/post-ocr/processor.ts`)

**✅ Completed**

#### Updated Flow
```
OLD: File → OCR → POInvoiceHeader → POInvoiceDetails
NEW: File → OCR → Invoice (only)
     Later: AIM Bridge → POInvoiceHeader → POInvoiceDetails
```

#### Key Changes
- Now creates **Invoice records only** (not POInvoiceHeaders)
- Removed POInvoiceDetails creation from post-OCR flow
- Updated return type: `invoicesCreated` and `invoiceIds` instead of `documentsCreated` and `documentIds`
- Links Invoices back to Files via `Invoices` field
- Added logging to clarify that POInvoiceHeaders will be created later by AIM bridge

#### ProcessFileResult Interface
```typescript
interface ProcessFileResult {
  success: boolean;
  fileRecordId: string;
  invoicesCreated: number; // Changed from documentsCreated
  invoiceIds: { type: string; id: string }[]; // Changed from documentIds
  error?: string;
  details?: any;
}
```

---

### 4. Invoice Hooks (`src/lib/airtable/invoice-hooks.ts`)

**✅ Completed**

#### Updated Functions

**`useInvoices()`**
- Now fetches from **Invoices table** (not POInvoiceHeaders)
- Uses `transformAirtableToInvoiceEntity()` for transformations
- Default sort by `Created At` descending
- Returns same `Invoice` type (backward compatible)

**`updateInvoice()`**
- Updates records in Invoices table
- Uses `transformInvoiceToAirtableEntity()` for field mapping

**`createInvoice()`**
- Creates records in Invoices table
- Uses `transformInvoiceToAirtableEntity()` for field mapping

**`useInvoiceCounts()`**
- Fetches from Invoices table
- Updated field checks: `Invoice Number`, `Vendor Name`, `Amount` (not POInvoiceHeader fields)
- Updated status mapping for Invoices table status values

#### Status Mapping
```typescript
// Invoices table status → Internal status
'Pending' → 'pending'
'Matched' → 'open'
'Queued' → 'reviewed'/'approved'
'Exported' → 'exported'
'Error' → 'rejected'
```

---

### 5. Linked Documents Hooks (`src/lib/airtable/linked-documents-hooks.ts`)

**✅ Completed**

#### Updated Transform Functions

**`transformFileRecord()`**
- Updated to use `Invoices` field (not `InvoiceHeaderID`)
- Returns `relatedInvoices` from Invoices table links

**`transformInvoiceRecord()`**
- Updated for Invoices table field names
- Uses `Invoice Number`, `Date`, `Amount` (not POInvoiceHeader fields)

#### Updated Fetch Logic

**`useLinkedDocuments()`**
- For invoice document type: fetches from **Invoices table** (not POInvoiceHeaders)
- For file document type: reads `Invoices` field (not `InvoiceHeaderID`)
- Uses Invoices table API endpoint: `/api/airtable/Invoices`

---

### 6. Schema Types (`src/lib/airtable/schema-types.ts`)

**✅ Already Generated**

#### Auto-Generated Additions
- `FIELD_IDS.INVOICES` - Field IDs for Invoices table
- `FIELD_IDS.FILES.INVOICES` - Field ID for Files → Invoices link
- `FIELD_IDS.INVOICEHEADERS.INVOICES` - Field ID for POInvoiceHeaders → Invoices link
- `TABLE_NAMES.INVOICES` - Table name constant: `'Invoices'`
- `InvoicesFields` - TypeScript interface for Invoices table fields
- `InvoicesRecord` - TypeScript record interface

---

## Data Flow

### Current Flow (Implemented)

```
┌─────────────┐
│ File Upload │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ OCR Process │
└──────┬──────┘
       │
       ▼
┌─────────────────────────┐
│ Create Invoice Record   │
│ (Invoices table)        │
│ - Primary entity        │
│ - Status: Pending       │
│ - Linked to File        │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Link Files → Invoices   │
│ (via 'Invoices' field)  │
└─────────────────────────┘

... Later (separate process) ...

┌─────────────────────────┐
│ AIM Bridge Provides     │
│ MatchJSONPayload        │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────────┐
│ Create POInvoiceHeader(s)   │
│ - Status: Queued            │
│ - Linked to Invoice         │
│ - Linked to File            │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│ Create POInvoiceDetails     │
│ - Line items                │
│ - Linked to POInvoiceHeader │
└─────────────────────────────┘
```

### Table Relationships

```
┌──────────┐          many-to-many          ┌──────────┐
│  Files   │◄─────────────────────────────►│ Invoices │
└──────────┘                                 └────┬─────┘
                                                  │
                                                  │ one-to-many
                                                  │
                                                  ▼
                                          ┌────────────────────┐
                                          │ POInvoiceHeaders   │
                                          └────────┬───────────┘
                                                   │
                                                   │ one-to-many
                                                   │
                                                   ▼
                                          ┌────────────────────┐
                                          │ POInvoiceDetails   │
                                          └────────────────────┘
```

## Field Mappings

### Invoices Table (Primary Entity)
| Field Name | Field ID | Type | Purpose |
|------------|----------|------|---------|
| Invoice Number | `fldWJIn3Sb0JSCr2a` | singleLineText | Invoice identifier |
| Date | `fldp1dFsyYtFcMk63` | date | Invoice date |
| Amount | `fldWskTDGmzu3udgQ` | currency | Total amount |
| VendId | `fldr9N3nkBSzTvOct` | singleLineText | Vendor ID |
| Vendor Name | `fldgdPfsIPIu6GFrg` | singleLineText | Vendor name |
| Files | `fldvgp2k2Ro3xneyz` | multipleRecordLinks | Links to Files table |
| POInvoiceHeaders | `fldzGkuubdu4lLy9n` | multipleRecordLinks | Links to POInvoiceHeaders |
| Status | `fldbeTDRDaKibT17s` | singleSelect | Pending/Matched/Queued/Exported/Error |

### Files Table
| Field Name | Field ID | Type | Purpose |
|------------|----------|------|---------|
| Invoices | `fldwKImJnsRbsWjHj` | multipleRecordLinks | Links to Invoices table |

### POInvoiceHeaders Table
| Field Name | Field ID | Type | Purpose |
|------------|----------|------|---------|
| Invoices | `fldlDBkOm2QV6vSSc` | multipleRecordLinks | Links to Invoices table |
| Files | `fldmyaFCTdFTJ1fnf` | multipleRecordLinks | Links to Files table |
| Invoice Details | `fldDtXpleyIIKomex` | multipleRecordLinks | Links to POInvoiceDetails |

## API Endpoint Changes

### Updated Endpoints
- `/api/airtable/Invoices` - Fetch/Create/Update Invoice records
- `/api/airtable/POInvoiceHeaders` - Fetch/Create/Update POInvoiceHeader records (for AIM bridge)
- `/api/airtable/POInvoiceDetails` - Fetch/Create/Update POInvoiceDetails records

### No Changes Needed
- Generic `/api/airtable/[table]/route.ts` - Already handles any table name
- Other API routes remain unchanged

## Backward Compatibility

### Maintained
- ✅ `Invoice` type interface unchanged (UI components still work)
- ✅ `useInvoices()` hook signature unchanged
- ✅ Transform function names maintained (new functions added, old ones kept)
- ✅ Legacy `INVOICE_FIELDS` constant aliased to `PO_INVOICE_HEADER_FIELDS`

### UI Components
- ✅ **No changes required** - UI components use `useInvoices()` hook which was updated internally
- ✅ Components receive same `Invoice` type, so all rendering logic works as before
- ✅ Status mappings ensure UI displays correctly

## Testing Checklist

### To Test
- [ ] File upload creates Invoice record in Invoices table
- [ ] Invoice record links to File via `Invoices` field
- [ ] File record links to Invoice via `Invoices` field
- [ ] Invoice displays correctly in UI
- [ ] Status values display correctly
- [ ] Linked documents display correctly
- [ ] (Later) AIM bridge can create POInvoiceHeader linked to Invoice
- [ ] (Later) POInvoiceDetails can be created linked to POInvoiceHeader

## Notes

### Important Points
1. **POInvoiceHeader creation is deferred** - Not created during file upload, will be created by AIM bridge
2. **POInvoiceDetails creation is deferred** - Created when POInvoiceHeader is created by AIM bridge
3. **Multiple POInvoiceHeaders per Invoice** - Supported by schema (many-to-many relationship via `Invoices` field)
4. **UI requires no changes** - `useInvoices()` hook updated internally, returns same type
5. **Backward compatibility maintained** - Old transform functions still work for POInvoiceHeaders

### Future Implementation
- **AIM Bridge Integration** - Needs separate route to:
  1. Accept MatchJSONPayload
  2. Create POInvoiceHeader(s) linked to Invoice
  3. Create POInvoiceDetails for each POInvoiceHeader
  4. Update Invoice status if needed

---

## Summary

✅ **All core changes completed successfully**

The codebase now correctly:
1. Creates **Invoices** as the primary entity at file upload
2. Links Files ↔ Invoices (many-to-many)
3. Defers POInvoiceHeader creation to AIM bridge
4. Maintains backward compatibility
5. Requires no UI changes

The implementation is ready for testing and AIM bridge integration.

