# Validation System Update - Server-Side Validation

## Summary
Updated the invoice validation system to use server-side validation from Airtable instead of client-side calculations. The system now relies on a "Missing Fields" formula field in Airtable to determine validation status.

## Changes Made

### 1. Airtable Schema Updates
- Added `MISSING_FIELDS` field to `INVOICE_FIELDS` mapping
- Added `MISSING_FIELDS` field to `DELIVERY_TICKET_FIELDS` mapping
- Updated `schema-types.ts` to include the Missing Fields field in:
  - Field IDs
  - InvoiceFields interface
  - InvoiceRecord interface

### 2. Type System Updates (`src/types/documents.ts`)
- Added `missingFieldsMessage?: string` to `BaseDocument` interface
- This field contains the server-side validation message from Airtable
- Kept `missingFields?: string[]` for backward compatibility (marked as deprecated)

### 3. Transform Functions (`src/lib/airtable/transforms.ts`)
- **Invoice Transform**: Updated to read `missingFieldsMessage` from Airtable
- **Delivery Ticket Transform**: Updated to read `missingFieldsMessage` from Airtable
- Both functions now set `missingFields: []` (deprecated) and populate `missingFieldsMessage`

### 4. Validation Logic (`src/utils/invoice-validation.ts`)
- **`validateInvoice()`**: Now primarily uses server-side validation
  - If `missingFieldsMessage` exists and is not empty, creates a blocking issue
  - Falls back to client-side validation for backward compatibility
- **`getMissingFieldsMessage()`**: Updated to use `missingFieldsMessage` from Airtable first
  - Falls back to client-side calculation if server-side field is not available

### 5. UI Component Updates (`src/components/documents/document-details-panel.tsx`)
- **CompletenessChecker**: Simplified to use server-side validation
  - Shows alert only when `missingFieldsMessage` is not empty
  - Displays: "Missing: {field names} — complete to continue"
  - Empty message = no validation issues = no alert shown

## How It Works

### Airtable Side
The "Missing Fields" field in Airtable is a **formula field** that:
- Returns an empty string if all required fields are present
- Returns a comma-separated list of missing field names if any are missing
- Example: `"Vendor Code, Amount"` or `"Invoice Date, Team, Invoice Number"`

### Frontend Side
1. Data is fetched from Airtable with the formula field value
2. Transform functions read the value into `missingFieldsMessage`
3. Validation functions check if `missingFieldsMessage` is empty or not
4. UI components display the message if present

## Benefits
- ✅ Single source of truth for validation (Airtable)
- ✅ Validation logic centralized in Airtable formulas
- ✅ Frontend only displays what Airtable determines
- ✅ Easier to update validation rules (change formula, not code)
- ✅ Backward compatible with fallback to client-side validation

## Testing Notes
- If "Missing Fields" is empty → No alert shown
- If "Missing Fields" contains text → Alert shown with that text
- Format: "Missing: {Airtable formula value} — complete to continue"

## Migration Path
1. ✅ Add "Missing Fields" formula field to Airtable Invoices table
2. ✅ Add "Missing Fields" formula field to Airtable Delivery Tickets table
3. ✅ Update frontend to read and display the field
4. ✅ Keep backward compatibility for records without the field
5. Future: Remove deprecated client-side validation once all records have the field
