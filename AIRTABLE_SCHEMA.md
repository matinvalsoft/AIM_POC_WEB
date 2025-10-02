# Airtable Schema Documentation

**Last Updated:** 2025-01-19T20:30:00.000Z

This document provides comprehensive documentation of the current Airtable schema, including all tables, fields, relationships, and status values.

## 🚨 Major Changes in v2.0.0

- **NEW STATUS**: "reviewed" added to Invoice workflow
- **NEW TABLE**: Teams table for team assignment
- **FIELD RENAMES**: Project/Task/Cost Center → ERP Attribute 1/2/3
- **NEW FILE STATUS**: "Processing" status added
- **ENHANCED ERROR TRACKING**: New error fields in Files table
- **FILE HASH FIELD**: SHA-256 hash for duplicate detection

## Tables Overview

The database consists of **6 tables** that work together to manage invoice processing workflow:

| Table | Purpose | Primary Field | Major Changes |
|-------|---------|---------------|---------------|
| [Invoices](#invoices-table) | Main invoice records | Invoice Number | ✅ NEW "reviewed" status, ERP attributes, team assignment |
| [Invoice Lines](#invoice-lines-table) | Line-item details for invoices | Auto # | No changes |
| [Activities](#activities-table) | Audit trail and workflow tracking | Auto # | No changes |
| [Files](#files-table) | Document file management | Name | ✅ NEW "processing" status, error tracking fields, file hash |
| [Emails](#emails-table) | Email communication tracking | Subject | No changes |
| [Teams](#teams-table) | Team management | Name | ✅ **NEW TABLE** |

## Invoices Table

**Table ID:** `tbl5gvAXvrV53lxBW`
**Primary Field:** Invoice Number (`fldip2afk1iwBXqIH`)

### Core Fields

| Field Name | Field ID | Type | Required | Description |
|------------|----------|------|----------|-------------|
| Invoice Number | `fldip2afk1iwBXqIH` | singleLineText | ✅ | Unique invoice identifier |
| Status | `fld7KzLACPWK7YE5S` | singleSelect | ✅ | Workflow status (6 values) |
| Vendor Name | `fldwXyrC93rysGzrJ` | singleLineText | | Supplier/vendor name |
| Vendor Code | `fldPWCklYpVUfiwAz` | singleLineText | | Internal vendor code |
| Date | `fldFd1vxXxxThsdAk` | date | | Date on the invoice |
| Due Date | `fldO7mkSkLyJfckKd` | date | | Payment due date |
| Amount | `fldPiog487BPfs1gE` | currency | | Total invoice amount (USD) |

### 🆕 Status Values (UPDATED)

| Value | Color | Description | Next States |
|-------|--------|-------------|-------------|
| **open** | Blue | Initial state, ready for processing | reviewed, pending, rejected |
| **reviewed** 🆕 | Teal Bright | Under initial review | pending, open, rejected |
| **pending** | Teal | Under approval workflow | approved, rejected, reviewed |
| **approved** | Green | Approved for payment | exported, rejected |
| **rejected** | Yellow | Rejected, needs correction | open, reviewed |
| **exported** | Orange | Exported to ERP system | *final state* |

### 🔄 ERP Attributes (RENAMED FIELDS)

| Field Name | Field ID | Type | Previous Name | Description |
|------------|----------|------|---------------|-------------|
| ERP Attribute 1 | `fldkB5t7eZD8Foane` | multilineText | ~~Project~~ | First ERP dimension |
| ERP Attribute 2 | `fldZZH4Iku5aTaMYV` | multilineText | ~~Task~~ | Second ERP dimension |
| ERP Attribute 3 | `fldCqCPCpUUJPWqeH` | multilineText | ~~Cost Center~~ | Third ERP dimension |
| GL Account | `fld4VwvAkOW77XhR4` | singleLineText | GL Account | General ledger account |

### Processing Fields

| Field Name | Field ID | Type | Description |
|------------|----------|------|-------------|
| Raw Text OCR | `fldutbLwPpnXBAzlP` | multilineText | OCR extracted text |
| Rejection Code 🆕 | `fldR4mbqWDgdGS3hL` | singleLineText | Structured rejection code |
| Rejection Reason | `fld6a8zvQYCVprrpl` | multilineText | Human-readable rejection reason |
| Days Until Due | `fldt82etqf0bZfenm` | formula | Calculated days to due date |

### System Fields

| Field Name | Field ID | Type | Description |
|------------|----------|------|-------------|
| Created At | `fld2pRPhrSTtl4ANV` | createdTime | Record creation timestamp |
| Updated At | `fldoRVUbO4liVHf9b` | lastModifiedTime | Last modification timestamp |

### Linked Records

| Field Name | Field ID | Type | Links To | Description |
|------------|----------|------|----------|-------------|
| Activities | `fld8iECtltoQZ3V5B` | multipleRecordLinks | Activities | Audit trail entries |
| Invoice Lines | `fldxUSTYhSCZfpfxF` | multipleRecordLinks | Invoice Lines | Line item details |
| Files | `fldu797dxWoXqGxU0` | multipleRecordLinks | Files | Source documents |
| Emails | `fldgdXEnSklAfPeSs` | multipleRecordLinks | Emails | Related email communications |
| Attachments | `fld5LeydwwVmVufs4` | multipleLookupValues | from Emails | Email attachments (lookup) |
| Team 🆕 | `fldG2o6HeG4ZgsG2U` | multipleRecordLinks | Teams | Assigned team members |

## Invoice Lines Table

**Table ID:** `tbl53Kp4e0mdWxJh7`
**Primary Field:** Auto # (`fldp1qMEJnUX0apFF`)

### Fields

| Field Name | Field ID | Type | Description |
|------------|----------|------|-------------|
| Auto # | `fldp1qMEJnUX0apFF` | autoNumber | Unique line identifier |
| Invoice | `fld5FQdA63lYXZhzg` | multipleRecordLinks | Link to parent invoice |
| Line Number | `fldrgMNcjmAIyw3B2` | number | Line sequence number |
| Description | `fldy2Wf5kUlzFI7PL` | multilineText | Line item description |
| Amount | `fldIQQvUGzQZuK2oZ` | currency | Line item amount |
| Project | `fldT2eGZNlctr22oY` | singleLineText | Project code |
| Task | `fldPGWkEDd0dpgsOp` | singleLineText | Task code |
| Cost Center | `fldSbKrVDOwuQZb8o` | singleLineText | Cost center |
| GL Account | `fld7720PGtdiA2vOs` | singleLineText | General ledger account |
| Created At | `fldxr78wIoNITGfB1` | createdTime | Creation timestamp |
| Updated At | `fldRtr4DHucGqdrOO` | lastModifiedTime | Last update timestamp |

## Activities Table

**Table ID:** `tbl3tSPM0w48WjCfB`
**Primary Field:** Auto # (`fldEtFtaiTt7zuARX`)

### Activity Types

| Value | Color | Description |
|-------|--------|-------------|
| **created** | Blue | Record created |
| **status_changed** | Cyan | Status transition |
| **edited** | Teal | Field edited |
| **coded** | Green | Coding applied |
| **approved** | Yellow | Approved for export |
| **rejected** | Orange | Rejected with reason |
| **exported** | Red | Exported to ERP |

### Fields

| Field Name | Field ID | Type | Description |
|------------|----------|------|-------------|
| Auto # | `fldEtFtaiTt7zuARX` | autoNumber | Unique activity ID |
| Activity Type | `fldbEX5Oe407OJ9RG` | singleSelect | Type of activity |
| Description | `fldlKFtGbJzeumLRm` | multilineText | Activity description |
| Performed By | `fld4F1HuPTj5zYxFO` | singleLineText | User who performed action |
| Performed At | `fldcpgpkyD04jvqbA` | createdTime | When activity occurred |
| Field Changed | `fldu6pOotaBQnXY5R` | singleLineText | Which field was modified |
| Old Value (JSON) | `fldh1SQjyl67UMyn9` | multilineText | Previous value |
| New Value (JSON) | `fldM06PHSYKohI57v` | multilineText | New value |
| Notes | `fld1StlTa0Yn9LB0k` | multilineText | Additional notes |
| System Generated | `fldWerjXBwpD9BMht` | checkbox | Auto-generated activity |
| Document (Invoice) | `fldT4itnTw8ExGOui` | multipleRecordLinks | Related invoice |

## Files Table

**Table ID:** `tblWwBxYXZMcUBsHn`
**Primary Field:** Name (`fld871fmYBmxf8xYU`)

### File Sources

| Value | Color | Description |
|-------|--------|-------------|
| **Email** | Blue | From email attachment |
| **Upload** | Cyan | Manual upload |

### 🆕 File Status Values (UPDATED)

| Value | Color | Description | Next States |
|-------|--------|-------------|-------------|
| **Queued** | Teal | Waiting for processing | Processing, Attention |
| **Processing** 🆕 | Blue | Currently being processed | Processed, Attention |
| **Processed** | Green | Successfully processed | Attention |
| **Attention** | Yellow | Needs manual review | Processing, Processed |

### Core Fields

| Field Name | Field ID | Type | Description |
|------------|----------|------|-------------|
| Name | `fld871fmYBmxf8xYU` | multilineText | File name |
| Upload Date | `fldCDTZ4fdLjjvBBg` | date | When file was uploaded |
| Source | `fld5bJlx5WszQ4c1u` | singleSelect | Email or Upload |
| Status | `fld9ouHowI4sch0n0` | singleSelect | Processing status |
| Pages | `fldd196VlH2J9np59` | number | Number of pages |
| Raw Text | `fldqYhVrJ09KBnVLk` | multilineText | OCR extracted text content |
| **File Hash** 🆕 | `fldbYXg99PG8IVk0c` | multilineText | SHA-256 hash for duplicate detection |

### 🆕 Error Tracking Fields (NEW)

| Field Name | Field ID | Type | Previous Name | Description |
|------------|----------|------|---------------|-------------|
| Error Code | `fldIBUz1V67JDnoqk` | singleLineText | ~~Attention~~ | Error classification code |
| Error Description 🆕 | `fldSePddKTGeqabXg` | multilineText | *new field* | Detailed error description |
| Error Link 🆕 | `fldAKXH81jZde4kwj` | singleLineText | *new field* | Link to error details |

### 🆕 Timestamp Fields (NEW)

| Field Name | Field ID | Type | Description |
|------------|----------|------|-------------|
| Created At 🆕 | `fldwsCB3B85GpPmLc` | createdTime | File creation timestamp |
| Modified At 🆕 | `fldOl0pJW9KWx7xCX` | lastModifiedTime | Last modification timestamp |

### Linked Records

| Field Name | Field ID | Type | Links To | Description |
|------------|----------|------|----------|-------------|
| Invoices | `fldkuHPgcgEa3m7rN` | multipleRecordLinks | Invoices | Related invoices |
| Emails | `fldAg6duKlD9hxMX4` | multipleRecordLinks | Emails | Source emails |
| Activity | `fldO4J1tqXca5gnP4` | multipleRecordLinks | Activities | Related activities |
| Attachments | `fldLR6Gc6IaN2ltR5` | multipleLookupValues | from Emails | Email attachments (lookup) |

## Emails Table

**Table ID:** `tblThORX9lNpjewJn`
**Primary Field:** Subject (`fldoqEzoDiHHfy2UB`)

### Email Recipients (To Field)

Common email addresses in the system:
- `ap@yourcompany.com` - Main AP email
- `ap@simonandschuster.com` - S&S AP 
- `ap-emea@simonandschuster.com` - EMEA AP
- `maya.lee@scribnerbooks.com` - Scribner contact
- `publicity@scribnerbooks.com` - Publicity dept
- `production@scribnerbooks.com` - Production dept
- `editorial-atria@simonandschuster.com` - Editorial
- `publicity-uk@gallerybooks.simonandschuster.co.uk` - UK Publicity
- `design@scribnerbooks.com` - Design dept

### Fields

| Field Name | Field ID | Type | Description |
|------------|----------|------|-------------|
| Subject | `fldoqEzoDiHHfy2UB` | multilineText | Email subject line |
| From Name | `fldrZpn2OurRutCGO` | multilineText | Sender display name |
| From Email | `fldqXhdOT0rjyXW9B` | email | Sender email address |
| Body | `fldABUS3ap5eBIKJC` | multilineText | Email body content |
| Received | `fldbBSy1dSBRgkeZ0` | dateTime | When email was received |
| To | `fldQJwRTiTP7o0VmE` | singleSelect | Recipient email |
| Attachments Count | `fldRwowuzTsO7eaD8` | number | Number of attachments |
| Vendor | `fldN1e3r3xG1dLC4Y` | multilineText | Extracted vendor info |
| Thread ID | `fldyrRvViGEnKHIdE` | multilineText | Email thread identifier |
| Message ID | `fldjSPDhm8pDWQdMU` | multilineText | Unique message ID |
| Attention | `fldG9oKMTzVaZeFSO` | multilineText | Issues requiring attention |
| Files | `fldaNhccW8ZBSQbaS` | multipleRecordLinks | Extracted file records |
| Invoices | `fldd785GbCaTpOnrf` | multipleRecordLinks | Related invoices |
| Attachments | `fldc2qvKbkjvvHTa6` | multipleAttachments | Email file attachments |

## 🆕 Teams Table (NEW)

**Table ID:** `tblL0YBYaKayqFIMb`
**Primary Field:** Name (`fldl9LGWidcveLU0S`)

### Fields

| Field Name | Field ID | Type | Description |
|------------|----------|------|-------------|
| Name | `fldl9LGWidcveLU0S` | singleLineText | Team short name/code |
| Full Name | `fldHmIuDRJ9wNdnzf` | singleLineText | Full team name |
| Invoices | `fldErw23zpptCI1Uu` | multipleRecordLinks | Assigned invoices |

## Data Relationships

### Updated Invoice Processing Flow

```
Email Received → Files Extracted → Invoice Created → Team Assignment → Review → Coding → Approval → Export
     ↓              ↓                   ↓              ↓              ↓         ↓         ↓         ↓
   Emails       Files table       Invoices table    Teams table   Activities  Lines   Activities  ERP
                  (Processing)       (reviewed)
```

### Key Relationships

1. **Invoices ↔ Invoice Lines**: One-to-many for multi-line coding
2. **Invoices ↔ Files**: Many-to-many (one invoice can have multiple source files)
3. **Invoices ↔ Emails**: Many-to-many (invoices can reference multiple emails)
4. **Invoices ↔ Activities**: One-to-many audit trail
5. **Invoices ↔ Teams**: Many-to-many team assignment 🆕
6. **Files ↔ Emails**: Many-to-many (files extracted from emails)
7. **Files ↔ Activities**: One-to-many processing history

## Breaking Changes & Migration

### Field Renames

Applications using the old field names need to be updated:

| Old Field Name | New Field Name | Migration Strategy |
|----------------|----------------|--------------------|
| Project | ERP Attribute 1 | Update all references to use new field name |
| Task | ERP Attribute 2 | Update all references to use new field name |
| Cost Center | ERP Attribute 3 | Update all references to use new field name |
| Attention (Files) | Error Code | Update error handling logic |

### New Status Values

- **Invoices**: "reviewed" status added between "open" and "pending"
- **Files**: "Processing" status added between "Queued" and "Processed"

### API Usage Examples

### Fetch Invoices by New Status
```typescript
import { createAirtableClient, buildFilter, filters, INVOICE_STATUS } from '@/lib/airtable';

const client = createAirtableClient('tbl5gvAXvrV53lxBW');

// Get reviewed invoices (NEW status)
const reviewedInvoices = await client.listRecords('Invoices', {
  filterByFormula: buildFilter(filters.equals('Status', INVOICE_STATUS.REVIEWED)),
  sort: [{ field: 'Due Date', direction: 'asc' }]
});
```

### Create Team Assignment
```typescript
// Assign invoice to team
await client.updateRecords('Invoices', {
  records: [{
    id: 'recInvoiceId',
    fields: {
      'Team': ['recTeamId'], // Link to Teams table
      'Status': INVOICE_STATUS.REVIEWED
    }
  }]
});
```

### Track File Processing
```typescript
// Update file status to processing
await client.updateRecords('Files', {
  records: [{
    id: 'recFileId',
    fields: {
      'Status': FILE_STATUS.PROCESSING,
      'Error Code': '', // Clear any previous errors
      'Error Description': ''
    }
  }]
});
```

## Schema Validation

The TypeScript types provide runtime validation for:
- ✅ New status transitions (including "reviewed" and "processing")
- ✅ Required fields per record type
- ✅ Field type validation (dates, currencies, etc.)
- ✅ Relationship integrity
- ✅ Team assignment validation

## Performance Considerations

### Indexing
- Primary fields are automatically indexed
- Status fields should be considered for views/filtering
- Date fields (Due Date, Created At) for sorting
- Team assignments for filtering by team

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
- **Open**: Status = open
- **Reviewed**: Status = reviewed 🆕
- **Exported**: Status = exported

### File Views  
- **Queued**: Status = Queued
- **Processing**: Status = Processing 🆕
- **Processed**: Status = Processed
- **Unlinked**: No related invoices

---

*This documentation reflects schema version 2.0.0 with breaking changes. For migration assistance, see the Breaking Changes section above.*

*Last schema fetch: 2025-01-19T20:30:00.000Z*