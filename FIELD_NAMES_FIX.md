# PO Matching Error Fix - Missing FIELD_NAMES Constant

## Issue Summary

**Date:** 2025-11-13  
**Error:** `TypeError: Cannot read properties of undefined (reading 'INVOICES')`  
**Location:** `/api/match-invoice` endpoint, specifically in `processor.ts` line 52

### Error Stack Trace
```
Cannot read properties of undefined (reading 'INVOICES')
    at A (.next/server/app/api/match-invoice/route.js:60:751)
    at async I (.next/server/app/api/match-invoice/route.js:62:10)
    at async k (.next/server/app/api/match-invoice/route.js:62:4067)
    at async g (.next/server/app/api/match-invoice/route.js:62:5070)
    at async P (.next/server/app/api/match-invoice/route.js:62:6192)
```

## Root Cause

The `src/lib/po-matching/processor.ts` file was trying to access `FIELD_NAMES.INVOICES.MATCH_PAYLOAD_JSON` on line 52, but the `FIELD_NAMES` constant was not defined in `src/lib/airtable/schema-types.ts`.

The schema-types file only had:
- `FIELD_IDS` - Contains Airtable field IDs (e.g., `fld7nZtX7h9ykBAS2`)
- `TABLE_NAMES` - Contains table names

But it was missing:
- `FIELD_NAMES` - Contains actual field names in Airtable (e.g., `MatchPayloadJSON`)

## The Fix

Added the `FIELD_NAMES` constant to `src/lib/airtable/schema-types.ts` with the complete mapping of all field names for all tables:

```typescript
export const FIELD_NAMES = {
  FILES: {
    FILEID: 'FileID',
    FILEHASH: 'FileHash',
    // ... all Files fields
  },
  INVOICES: {
    RECORDID: 'RecordID',
    INVOICE_NUMBER: 'Invoice-Number',
    MATCH_PAYLOAD_JSON: 'MatchPayloadJSON',  // ← This was the missing field
    VENDID: 'VendId',
    // ... all Invoices fields
  },
  POINVOICEHEADERS: {
    // ... all POInvoiceHeaders fields
  },
  POINVOICEDETAILS: {
    // ... all POInvoiceDetails fields
  },
} as const;
```

## Files Modified

1. **`src/lib/airtable/schema-types.ts`**
   - Added complete `FIELD_NAMES` constant with all field names for all tables
   - Includes proper TypeScript typing with `as const`

## Testing

- ✅ TypeScript compilation successful (no type errors)
- ✅ Build successful (`npm run build`)
- ✅ All imports resolved correctly

## Usage

The PO matching processor now correctly accesses field names:

```typescript
// In src/lib/po-matching/processor.ts
const matchPayloadRaw = nonNullFields[FIELD_NAMES.INVOICES.MATCH_PAYLOAD_JSON] || 
                        nonNullFields['MatchPayloadJSON'];
```

This provides:
- Type safety when accessing field names
- Centralized field name management
- Fallback to string literal for backward compatibility

## Impact

This fix resolves the PO matching API endpoint crash that occurred when trying to extract `MatchPayloadJSON` from invoice records. The endpoint should now work correctly for invoice ID `recN7aS6fm7fjkMNC` and all future PO matching requests.

## Related Files

- `/src/app/api/match-invoice/route.ts` - PO matching API endpoint
- `/src/lib/po-matching/processor.ts` - Main processing logic
- `/src/lib/airtable/schema-types.ts` - Schema constants and types

## Prevention

To prevent similar issues in the future:
1. When adding new field references, check that `FIELD_NAMES` is defined
2. Consider generating `FIELD_NAMES` automatically from `latest_schema.json` in the schema generation script
3. Add unit tests that verify all field name constants are accessible

