/**
 * Main PO Matching Processor
 * Orchestrates the entire flow: fetch invoice -> call OpenAI -> create records
 */

import { generatePOMatches } from './openai-matcher';
import { createPOInvoiceHeadersAndDetails } from './airtable-creator';
import { CreatedRecordsSummary } from '../types/po-matching';
import { TABLE_IDS, TABLE_NAMES, FIELD_NAMES } from '../airtable/schema-types';

/**
 * Process PO matching for an invoice
 * @param invoiceId - Airtable record ID of the invoice
 * @param fetchInvoiceFn - Function to fetch invoice from Airtable (injected for testability)
 * @param createRecordsFn - Function to create records in Airtable (injected for testability)
 * @param updateInvoiceFn - Function to update invoice record in Airtable (injected for testability)
 * @returns Summary of created records
 */
export async function processPOMatching(
  invoiceId: string,
  fetchInvoiceFn: (invoiceId: string) => Promise<any>,
  createRecordsFn: (tableName: string, records: any[]) => Promise<{ records: Array<{ id: string }> }>,
  updateInvoiceFn?: (invoiceId: string, fields: Record<string, any>) => Promise<void>
): Promise<CreatedRecordsSummary> {
  console.log('🚀 Starting PO matching process...');
  console.log(`   Invoice ID: ${invoiceId}`);

  try {
    // Step 1: Fetch invoice record from Airtable
    console.log('\n📥 Step 1: Fetching invoice record...');
    const invoiceRecord = await fetchInvoiceFn(invoiceId);
    
    if (!invoiceRecord || !invoiceRecord.fields) {
      throw new Error(`Invoice ${invoiceId} not found or has no fields`);
    }

    console.log(`   Found invoice record with ${Object.keys(invoiceRecord.fields).length} fields`);

    // Step 2: Filter out null/empty fields
    console.log('\n🔍 Step 2: Filtering non-null fields...');
    const nonNullFields: Record<string, any> = {};
    Object.entries(invoiceRecord.fields).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        nonNullFields[key] = value;
      }
    });
    
    console.log(`   Kept ${Object.keys(nonNullFields).length} non-null fields`);

    // Step 3: Extract and parse MatchPayloadJSON
    console.log('\n📦 Step 3: Extracting MatchPayloadJSON...');
    const matchPayloadRaw = nonNullFields[FIELD_NAMES.INVOICES.MATCH_PAYLOAD_JSON] || 
                            nonNullFields['MatchPayloadJSON'];
    
    if (!matchPayloadRaw) {
      console.warn('   Warning: No MatchPayloadJSON found, using empty object');
    }

    let matchPayload: any = {};
    if (matchPayloadRaw) {
      try {
        matchPayload = typeof matchPayloadRaw === 'string' 
          ? JSON.parse(matchPayloadRaw) 
          : matchPayloadRaw;
        console.log(`   Parsed match payload (type: ${typeof matchPayload})`);
      } catch (error) {
        console.warn('   Warning: Failed to parse MatchPayloadJSON, using empty object');
        console.warn(`   Error: ${error}`);
      }
    }

    // Remove MatchPayloadJSON from invoice fields to avoid duplication
    delete nonNullFields[FIELD_NAMES.INVOICES.MATCH_PAYLOAD_JSON];
    delete nonNullFields['MatchPayloadJSON'];

    // Step 4: Call OpenAI to generate PO matches
    console.log('\n🤖 Step 4: Generating PO matches with OpenAI...');
    const gptResponse = await generatePOMatches(nonNullFields, matchPayload);
    
    console.log(`   GPT generated ${gptResponse.headers.length} headers`);
    if (gptResponse.error) {
      console.log(`   ⚠️  Error: ${gptResponse.error}`);
    }

    // Step 5: Create POInvoiceHeader and POInvoiceDetail records (nested structure)
    console.log('\n📝 Step 5: Creating POInvoiceHeaders and POInvoiceDetails...');
    const { headerIds, detailIds } = await createPOInvoiceHeadersAndDetails(
      gptResponse.headers,
      invoiceId,
      matchPayload,
      createRecordsFn
    );

    // Step 6: Update Invoice record with Status, Error fields, and VendId
    if (updateInvoiceFn) {
      console.log('\n📝 Step 6: Updating Invoice Status, Error fields, and VendId...');
      try {
        const updateFields: Record<string, any> = {};
        
        // Update VendId from matchPayload vendor if available
        const vendorId = matchPayload?.vendor?.vendorId;
        if (vendorId) {
          updateFields[FIELD_NAMES.INVOICES.VENDID] = vendorId;
          console.log(`   📝 Updating VendId to: ${vendorId}`);
        }
        
        // Determine Status based on matching results
        const hasMatches = detailIds.length > 0;
        const hasError = gptResponse.error && gptResponse.error.trim() !== '';
        
        if (!hasMatches) {
          // No matches at all - set to Error status with NO_MATCH error code
          updateFields[FIELD_NAMES.INVOICES.STATUS] = 'Error';
          updateFields[FIELD_NAMES.INVOICES.ERRORCODE] = 'NO_MATCH';
          console.log('   ⚠️  No matches found - setting Status to Error with ErrorCode NO_MATCH');
        } else {
          // At least one match exists - set to Matched (even if there's also an error)
          updateFields[FIELD_NAMES.INVOICES.STATUS] = 'Matched';
          console.log(`   ✅ Matches found (${detailIds.length} details) - setting Status to Matched`);
        }
        
        // Add Error Description if provided and not empty
        if (hasError) {
          updateFields[FIELD_NAMES.INVOICES.ERROR_DESCRIPTION] = gptResponse.error;
          console.log(`   ⚠️  Error description present: ${gptResponse.error.substring(0, 100)}...`);
        }
        
        if (Object.keys(updateFields).length > 0) {
          await updateInvoiceFn(invoiceId, updateFields);
          console.log(`   ✅ Updated Invoice ${invoiceId}`);
          if (updateFields[FIELD_NAMES.INVOICES.VENDID]) {
            console.log(`      - VendId: ${updateFields[FIELD_NAMES.INVOICES.VENDID]}`);
          }
          if (updateFields[FIELD_NAMES.INVOICES.STATUS]) {
            console.log(`      - Status: ${updateFields[FIELD_NAMES.INVOICES.STATUS]}`);
          }
          if (updateFields[FIELD_NAMES.INVOICES.ERRORCODE]) {
            console.log(`      - ErrorCode: ${updateFields[FIELD_NAMES.INVOICES.ERRORCODE]}`);
          }
        }
      } catch (error) {
        console.warn('   ⚠️  Warning: Failed to update Invoice:', error);
        // Don't throw - this is not critical to the matching process
      }
    }

    // Step 7: Return summary
    const summary: CreatedRecordsSummary = {
      headerIds,
      detailIds,
      headerCount: headerIds.length,
      detailCount: detailIds.length,
    };

    console.log('\n✅ PO matching process completed successfully!');
    console.log(`   Headers created: ${summary.headerCount}`);
    console.log(`   Details created: ${summary.detailCount}`);

    return summary;

  } catch (error) {
    console.error('\n❌ Error in PO matching process:', error);
    throw error;
  }
}

/**
 * Helper to create a mock fetch invoice function for testing
 */
export function createMockFetchInvoiceFn(mockInvoice?: any) {
  return async (invoiceId: string) => {
    console.log(`   [MOCK] Fetching invoice ${invoiceId}`);
    
    if (mockInvoice) {
      return mockInvoice;
    }

    // Default mock invoice
    return {
      id: invoiceId,
      fields: {
        'Invoice-Number': 'INV-2025-001',
        'Vendor-Name': 'Test Vendor Inc',
        'VendId': 'VEND001',
        'Amount': 1500.00,
        'Date': '2025-01-15',
        'MatchPayloadJSON': JSON.stringify({
          pos: [
            {
              poNumber: 'PO-12345',
              vendor: 'Test Vendor Inc',
              lines: [
                {
                  lineNumber: '001',
                  itemNo: 'ITEM-001',
                  description: 'Test Item 1',
                  quantity: 10,
                  unitPrice: 100.00,
                },
                {
                  lineNumber: '002',
                  itemNo: 'ITEM-002',
                  description: 'Test Item 2',
                  quantity: 5,
                  unitPrice: 100.00,
                },
              ],
            },
          ],
        }),
      },
    };
  };
}

