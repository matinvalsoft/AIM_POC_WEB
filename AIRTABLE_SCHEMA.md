# Airtable Schema Documentation

**Last Updated:** 2025-01-XX  
**Schema Version:** 3.0.0

This document provides comprehensive documentation of the current Airtable schema, including all tables, fields, relationships, and status values.

## 🚨 Major Changes in v3.0.0

- **NEW TABLE**: **Invoices** table added as primary entity created at file upload
- **ARCHITECTURAL CHANGE**: Invoices are now the primary entity, with POInvoiceHeaders as separate linked records
- **RELATIONSHIP UPDATES**: 
  - Files → Invoices (many-to-many)
  - Invoices → POInvoiceHeaders (one-to-many)
  - POInvoiceHeaders → POInvoiceDetails (one-to-many)
- **FIELD UPDATES**: Files table now links to Invoices via `Invoices` field (multipleRecordLinks)
- **POInvoiceHeaders UPDATES**: Now links to Invoices via `Invoices` field (multipleRecordLinks)

## Tables Overview

The database consists of **4 tables** that work together to manage invoice processing workflow:

| Table | Purpose | Primary Field | Relationships |
|-------|---------|---------------|---------------|
| [Files](#files-table) | Document file management | FileID | Links to Invoices (many-to-many) |
| [Invoices](#invoices-table) 🆕 | **Primary invoice entity** | RecordID | Links to Files, POInvoiceHeaders |
| [POInvoiceHeaders](#poinvoiceheaders-table) | PO-matched invoice headers | RecordID | Links to Invoices, POInvoiceDetails |
| [POInvoiceDetails](#poinvoicedetails-table) | Line-level invoice details | RecordID | Links to POInvoiceHeaders |

## Data Relationships

### Updated Invoice Processing Flow

```
File Upload → OCR Processing → Invoice Created → POInvoiceHeader Created → POInvoiceDetails Created
     ↓              ↓                ↓                    ↓                        ↓
   Files       Raw Text         Invoices table    POInvoiceHeaders      POInvoiceDetails
                  ↓                    ↓                    ↓                        ↓
            Document Raw Text    Links to Files    Links to Invoice    Links to POInvoiceHeader
```

### Key Relationships

1. **Files ↔ Invoices**: Many-to-many
   - One file can contain multiple invoices
   - One invoice can come from multiple files
   - Files table: `Invoices` field (multipleRecordLinks)
   - Invoices table: `Files` field (multipleRecordLinks)

2. **Invoices ↔ POInvoiceHeaders**: One-to-many
   - Multiple POInvoiceHeaders can share the same AP Invoice Number
   - Each POInvoiceHeader links to exactly one Invoice
   - Invoices table: `POInvoiceHeaders` field (multipleRecordLinks)
   - POInvoiceHeaders table: `Invoices` field (multipleRecordLinks)

3. **POInvoiceHeaders ↔ POInvoiceDetails**: One-to-many
   - Each POInvoiceDetail belongs to exactly one POInvoiceHeader
   - POInvoiceHeaders table: `Invoice Details` field (multipleRecordLinks)
   - POInvoiceDetails table: `InvoiceHeaders` field (multipleRecordLinks)

4. **POInvoiceHeaders ↔ PO Receipt**: One-to-one (if PO Receipt table exists)
   - Each POInvoiceHeader corresponds to exactly one PO Receipt
   - *Note: PO Receipt table not found in current schema - may need to be added*

## Files Table

**Table ID:** `tblMNDY3eCvIwSdA8`  
**Primary Field:** FileID (`fldvv1P403ZBW5bzD`)

### Core Fields

| Field Name | Field ID | Type | Description |
|------------|----------|------|-------------|
| FileID | `fldvv1P403ZBW5bzD` | autoNumber | Unique file identifier |
| InvoiceHeaderID | `fldfWuCdkpNQj9Ldk` | singleLineText | *Deprecated - use Invoices field* |
| FileURL | `fldMOyx6UwMi6bEBe` | url | File storage URL |
| FileHash | `fld4ul9KRJUSKaUWS` | singleLineText | SHA-256 hash for duplicate detection |
| FileName | `fldIGVTS5FNOBGa6R` | singleLineText | Original file name |
| UploadDate | `fldNiceCZo3dSbvaD` | date | When file was uploaded |
| Status | `flduvY2bmQosJsn7n` | singleSelect | Processing status |
| ParsedAt | `fldtidSYAqPRmoW3e` | dateTime | When OCR processing completed |
| Attachments | `fld3draNU7mkLeGqI` | multipleAttachments | File attachments |
| Raw Text | `fld1lL5zRXtTbt0A3` | multilineText | OCR extracted text content |
| Error Code | `flddPRt8iRsl1YYZM` | singleLineText | Error classification code |
| Error Description | `flddfs5LMqSRF4gXO` | singleLineText | Detailed error description |
| Error Link | `fldO1mNxkXBkp9hiC` | singleLineText | Link to error details |
| Created At | `fldPaMbKTIR1J6gAn` | createdTime | File creation timestamp |
| Modified At | `fldTqso4wgmGyPkUj` | lastModifiedTime | Last modification timestamp |
| InvoiceHeaders | `fld8fYyXVZiKhNeDv` | singleLineText | *Deprecated - use Invoices field* |
| **Invoices** 🆕 | `fldwKImJnsRbsWjHj` | multipleRecordLinks | **Links to Invoices table** |

### File Status Values

| Value | Color | Description |
|-------|--------|-------------|
| **Queued** | Blue | Waiting for processing |
| **Processing** | Cyan | Currently being processed |
| **Processed** | Teal | Successfully processed |
| **Attention** | Green | Needs manual review |

## Invoices Table 🆕

**Table ID:** `tblNKS2pOwcisNWJJ`  
**Primary Field:** RecordID (`fldZ17knWjEOCfztq`)

**Purpose:** Primary invoice entity created at file upload. This is the main record that represents an invoice document.

### Core Fields

| Field Name | Field ID | Type | Description |
|------------|----------|------|-------------|
| RecordID | `fldZ17knWjEOCfztq` | autoNumber | Unique invoice identifier |
| Invoice Number | `fldWJIn3Sb0JSCr2a` | singleLineText | Invoice number from document |
| VendId | `fldr9N3nkBSzTvOct` | singleLineText | Vendor ID |
| Vendor Name | `fldgdPfsIPIu6GFrg` | singleLineText | Vendor/supplier name |
| Amount | `fldWskTDGmzu3udgQ` | currency | Total invoice amount (USD) |
| Date | `fldp1dFsyYtFcMk63` | date | Invoice date |
| Freight Charge | `fldmIOZypPrjc45MR` | currency | Freight charges |
| Surcharge | `fld0zGVtnSUl4YWva` | currency | Surcharge amount |
| POs | `fldmBwAkd2ekGDS3h` | multilineText | Purchase order numbers (text) |
| Document Raw Text | `fldYajj2Ql4O3ZJNl` | multilineText | OCR extracted text content |
| Files | `fldvgp2k2Ro3xneyz` | multipleRecordLinks | **Links to Files table** |
| Status | `fldbeTDRDaKibT17s` | singleSelect | Workflow status |
| Balance | `fldSjTjrW8Fso4j70` | currency | Invoice balance |
| Balance Explanation | `fldySfNaohpv3gv4l` | singleLineText | Explanation of balance |
| POInvoiceHeaders | `fldzGkuubdu4lLy9n` | multipleRecordLinks | **Links to POInvoiceHeaders table** |
| MatchJSONPayload | `fldFxQNImfvsULyL2` | multilineText | JSON payload for matching |
| Error Code | `fldBbD1mWcSqD5mn5` | singleLineText | Error classification code |
| File Raw Text | `fldUsIefXXVrL9ugZ` | multipleLookupValues | Lookup from Files table |
| Missing Fields | `fldhUobiEpFG2S8E2` | formula | Server-side validation (formula) |
| Created At | `fldQTWe0E9ik9t3SW` | createdTime | Record creation timestamp |
| Modified At | `fldtlqLgTn2IdBbkj` | lastModifiedTime | Last modification timestamp |

### Invoice Status Values

| Value | Color | Description |
|-------|--------|-------------|
| **Pending** | Blue | Initial state, ready for processing |
| **Matched** | Cyan | Matched to PO, ready for review |
| **Queued** | Teal | Queued for export |
| **Exported** | Green | Exported to ERP system |
| **Error** | Yellow | Has errors, needs attention |

## POInvoiceHeaders Table

**Table ID:** `tblJoCXc4S52J5h6L`  
**Primary Field:** RecordID (`fldKuzxRLh9ebfwQ6`)

**Purpose:** Represents PO-matched invoice headers. Multiple POInvoiceHeaders can share the same AP Invoice Number and link to the same Invoice.

### Core Fields

| Field Name | Field ID | Type | Description |
|------------|----------|------|-------------|
| RecordID | `fldKuzxRLh9ebfwQ6` | autoNumber | Unique header identifier |
| Company-Code | `fldTxznaohx3570gT` | singleLineText | Company code |
| Status | `fldQG5aLrzWuybUGl` | singleSelect | Processing status |
| VendId | `fldHqAuDgGiFwEbNu` | singleLineText | Vendor ID |
| Vendor Name | `fldoQDBbjtB45u8Y0` | singleLineText | Vendor name |
| Invoice Details | `fldDtXpleyIIKomex` | multipleRecordLinks | Links to POInvoiceDetails |
| AP-Invoice-Number | `fldeLVE34jFJIZ4mt` | singleLineText | AP invoice number |
| Invoice-Date | `fld965jyW6vfHSzve` | date | Invoice date |
| TermsId | `fldEfXJh4GLbPWnQ4` | singleLineText | Payment terms ID |
| Due-Date | `fldaToVmDpqv9ONaF` | date | Payment due date |
| Remit-Name | `fldnqlfWxfsldK9bw` | singleLineText | Remittance name |
| Total-Invoice-Amount | `fldCm1wXZcP8By64B` | currency | Total invoice amount |
| Freight-Charge | `fldlY0X5bukPwEL8m` | currency | Freight charges |
| Miscellaneous-Charge | `fldliitVmX1mosV3v` | currency | Miscellaneous charges |
| Discount-Amount | `fldVMtTKXIqwZwxyp` | currency | Discount amount |
| Discount-Date | `fldUUPq044MMnF5oJ` | date | Discount date |
| PO-Number | `fld2DoiZs6t3sq3ru` | singleLineText | Purchase order number |
| Files | `fldmyaFCTdFTJ1fnf` | multipleRecordLinks | Links to Files table |
| Document Raw Text | `fldDGh2zVJXjpoTvX` | multilineText | OCR extracted text |
| **Invoices** 🆕 | `fldlDBkOm2QV6vSSc` | multipleRecordLinks | **Links to Invoices table** |
| Created At | `fldTOi6cp2tzLromy` | createdTime | Record creation timestamp |
| Modified At | `fld7UTUCBIDIP8bw4` | lastModifiedTime | Last modification timestamp |

*Note: Many additional fields exist for tax, currency, accounting, etc. See schema-types.ts for complete list.*

### POInvoiceHeader Status Values

| Value | Color | Description |
|-------|--------|-------------|
| **Queued** | Green | Queued for processing |
| **Exported** | Blue | Exported to ERP |
| **Error** | Yellow | Has errors |

## POInvoiceDetails Table

**Table ID:** `tblRkwaiS3LcFFrZ9`  
**Primary Field:** RecordID (`flddeN1uf4flGhHNS`)

**Purpose:** Line-level invoice details linked to POInvoiceHeaders. Each detail represents a single line item.

### Core Fields

| Field Name | Field ID | Type | Description |
|------------|----------|------|-------------|
| RecordID | `flddeN1uf4flGhHNS` | autoNumber | Unique detail identifier |
| Company-Code | `fldaagXjpyrRtsy8e` | singleLineText | Company code |
| VendId | `fldKjuYXhgwv8fcLs` | singleLineText | Vendor ID |
| AP-Invoice-Number | `fld4i5XGZJi4sYyDV` | singleLineText | AP invoice number |
| Line-Number | `fld3sdHL8z7RxoZTn` | singleLineText | Line sequence number |
| Item-No | `fldMeG51leLehcgNa` | singleLineText | Item SKU/product number |
| Item-Description | `fld7iTo1UUNAjRAK4` | singleLineText | Item description |
| Invoice-Price | `fldzRKqDHlSo168I5` | number | Unit price |
| Invoice-Pricing-Qty | `fldm3JJHqefoSzkY0` | number | Pricing quantity |
| Quantity-Invoiced | `fldyMWOPBZ0VSFS6Z` | number | Quantity invoiced |
| Line-Amount | `fldogLboVcfjTq9M8` | number | Total line amount |
| PO-Number | `fldCGNWvybCS5wLh0` | singleLineText | Purchase order number |
| PO-Line-Number | `fldaRbB9j71w8TL9S` | singleLineText | PO line number |
| Expacct | `fldmYAfYSSYynpSf4` | singleLineText | GL expense account |
| InvoiceHeaders | `fldS39vWDismMUvfC` | multipleRecordLinks | **Links to POInvoiceHeaders table** |
| Status | `fld3c6QiWMYO8fUrO` | singleSelect | Processing status |
| Created At | `fld17mKjXewbTA0vy` | createdTime | Record creation timestamp |
| Modified At | `fldI3kD7U94DDThpi` | lastModifiedTime | Last modification timestamp |

*Note: Many additional fields exist for PO matching, tax, quantities, etc. See schema-types.ts for complete list.*

### POInvoiceDetail Status Values

| Value | Color | Description |
|-------|--------|-------------|
| **Queued** | Blue | Queued for processing |
| **Exported** | Cyan | Exported to ERP |
| **Error** | Teal | Has errors |

## Referential Integrity

### Enforced Relationships

1. **Invoice → POInvoiceHeader**
   - Multiple POInvoiceHeaders can share the same AP Invoice Number
   - Each POInvoiceHeader links to exactly one Invoice via `Invoices` field
   - Invoices table tracks all linked POInvoiceHeaders via `POInvoiceHeaders` field

2. **POInvoiceHeader → POInvoiceDetail**
   - Each POInvoiceDetail belongs to exactly one POInvoiceHeader
   - POInvoiceHeaders table tracks linked details via `Invoice Details` field
   - POInvoiceDetails table links back via `InvoiceHeaders` field

3. **File → Invoice**
   - Files link to Invoices via `Invoices` field (multipleRecordLinks)
   - Invoices link to Files via `Files` field (multipleRecordLinks)
   - Many-to-many relationship

4. **POInvoiceHeader → PO Receipt** (if PO Receipt table exists)
   - Each POInvoiceHeader corresponds to exactly one PO Receipt
   - *Note: PO Receipt table not found in current schema*

## API Usage Examples

### Create Invoice from File Upload

```typescript
import { createAirtableClient } from '@/lib/airtable';

const client = createAirtableClient('tblNKS2pOwcisNWJJ');

// Create Invoice record
const invoice = await client.createRecords('Invoices', {
  records: [{
    fields: {
      'Invoice Number': 'INV-2025-001',
      'Vendor Name': 'Acme Corp',
      'Amount': 1000.00,
      'Date': '2025-01-15',
      'Status': 'Pending',
      'Files': ['recFileId123'], // Link to file
      'Document Raw Text': rawTextContent
    }
  }]
});
```

### Create POInvoiceHeader Linked to Invoice

```typescript
// Create POInvoiceHeader linked to Invoice
const poHeader = await client.createRecords('POInvoiceHeaders', {
  records: [{
    fields: {
      'AP-Invoice-Number': 'INV-2025-001',
      'Vendor Name': 'Acme Corp',
      'Total-Invoice-Amount': 1000.00,
      'Invoice-Date': '2025-01-15',
      'Status': 'Queued',
      'Invoices': ['recInvoiceId123'], // Link to Invoice
      'Files': ['recFileId123'] // Link to file
    }
  }]
});
```

### Link Files to Invoice

```typescript
// Update File record to link to Invoice
await client.updateRecords('Files', {
  records: [{
    id: 'recFileId123',
    fields: {
      'Invoices': ['recInvoiceId123'] // Link to Invoice
    }
  }]
});
```

## Schema Validation

The TypeScript types provide runtime validation for:
- ✅ Status transitions
- ✅ Required fields per record type
- ✅ Field type validation (dates, currencies, etc.)
- ✅ Relationship integrity
- ✅ Referential integrity between tables

## Performance Considerations

### Indexing
- Primary fields are automatically indexed
- Status fields should be considered for views/filtering
- Date fields (Date, Created At) for sorting
- Link fields for relationship queries

### Rate Limits
- 5 requests per second per base
- 50 requests per second per token
- Automatic retry with exponential backoff

### Batch Operations
- Create/update up to 10 records per request
- Use pagination for large record sets
- Consider async processing for bulk operations

## Views & Filtering

### Invoice Views
- **All**: All invoices
- **Pending**: Status = Pending
- **Matched**: Status = Matched
- **Exported**: Status = Exported

### File Views  
- **Queued**: Status = Queued
- **Processing**: Status = Processing
- **Processed**: Status = Processed
- **Unlinked**: No related invoices

### POInvoiceHeader Views
- **Queued**: Status = Queued
- **Exported**: Status = Exported
- **Error**: Status = Error

---

*This documentation reflects schema version 3.0.0 with Invoices as primary entity. For migration assistance, see SCHEMA_MIGRATION_ANALYSIS.md.*

*Last schema fetch: 2025-01-XX*
