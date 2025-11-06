/**
 * Post-OCR Processing Workflow
 * 
 * Takes a processed file record and:
 * 1. Parses the raw OCR text with LLM
 * 2. Creates Invoice records in Invoices table (primary entity)
 * 3. Handles single vs multiple documents
 * 4. Links invoices back to the file
 * 
 * Note: POInvoiceHeader creation happens LATER via AIM bridge after MatchJSONPayload is provided
 */

import { parseDocuments, extractSingleDocumentText } from '../llm/parser';
import { getFileRecord, createInvoiceRecord, linkDocumentsToFile, createInvoiceDetails } from './airtable-helpers';
import { FIELD_IDS } from '../airtable/schema-types';
import type { ParsedDocument } from '../llm/schemas';

export interface ProcessFileResult {
  success: boolean;
  fileRecordId: string;
  invoicesCreated: number; // Changed from documentsCreated
  invoiceIds: { type: string; id: string }[]; // Changed from documentIds
  error?: string;
  details?: any;
}

/**
 * Main post-OCR processing function
 * 
 * @param fileRecordId - Airtable record ID of the processed file
 * @returns Processing result with created document IDs
 */
export async function processPostOCR(fileRecordId: string): Promise<ProcessFileResult> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 Starting post-OCR processing for file: ${fileRecordId}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    // Step 1: Fetch the file record
    console.log('📂 Step 1: Fetching file record from Airtable...');
    const fileRecord = await getFileRecord(fileRecordId);
    
    // Try both field name and field ID for raw text
    const rawText = fileRecord.fields['Raw Text'] || fileRecord.fields[FIELD_IDS.FILES.RAW_TEXT];
    
    if (!rawText || rawText.trim().length === 0) {
      throw new Error('File record has no raw text - OCR may not have completed');
    }
    
    console.log(`✅ File record fetched. Raw text length: ${rawText.length} chars\n`);

    // Step 2: Parse documents with LLM
    console.log('🤖 Step 2: Parsing OCR text with LLM...');
    const parsedDocuments = await parseDocuments(rawText);
    
    if (parsedDocuments.length === 0) {
      throw new Error('LLM did not extract any documents from the text');
    }
    
    console.log(`✅ Parsed ${parsedDocuments.length} document(s)\n`);
    
    // Log what we found
    parsedDocuments.forEach((doc, idx) => {
      console.log(`Document ${idx + 1}:`, {
        type: doc.document_type,
        vendor: doc.vendor_name || 'unknown',
        invoiceNumber: doc.invoice_number || 'none',
        amount: doc.amount || 'unknown',
        team: doc.team || 'none',
      });
    });
    console.log();

    // Step 3: Determine if single or multiple documents
    const isMultipleDocuments = parsedDocuments.length > 1;
    
    if (isMultipleDocuments) {
      console.log('📄 Multiple documents detected - will extract individual text for each\n');
    } else {
      console.log('📄 Single document detected - using full raw text\n');
    }

    // Step 4: Create Invoice records (primary entity only)
    console.log('💾 Step 3: Creating Invoice records in Invoices table...');
    const createdInvoices: { type: string; id: string }[] = [];
    
    for (let i = 0; i < parsedDocuments.length; i++) {
      const doc = parsedDocuments[i];
      console.log(`\n  Processing invoice ${i + 1}/${parsedDocuments.length}...`);
      
      let documentRawText: string;
      
      if (isMultipleDocuments) {
        // Extract individual document text
        console.log(`  🔍 Extracting text for individual invoice...`);
        documentRawText = await extractSingleDocumentText(rawText, doc);
        console.log(`  ✅ Extracted ${documentRawText.length} chars`);
      } else {
        // Use full raw text for single document
        documentRawText = rawText;
        console.log(`  ✅ Using full file text (${documentRawText.length} chars)`);
      }
      
      // Create the Invoice record (primary entity)
      const invoiceId = await createInvoiceRecord(doc, fileRecordId, documentRawText);
      
      createdInvoices.push({
        type: 'invoice',
        id: invoiceId,
      });
      
      console.log(`  ✅ Created Invoice record: ${invoiceId}`);
      console.log(`  ℹ️  POInvoiceHeader will be created later by AIM bridge`);
    }
    
    console.log(`\n✅ Created ${createdInvoices.length} Invoice record(s)\n`);

    // Step 5: Link invoices back to file
    console.log('🔗 Step 4: Linking invoices to file record...');
    await linkDocumentsToFile(fileRecordId, createdInvoices);
    console.log('✅ Invoices linked to file\n');

    console.log(`${'='.repeat(60)}`);
    console.log(`✅ Post-OCR processing completed successfully!`);
    console.log(`   File: ${fileRecordId}`);
    console.log(`   Invoices created: ${createdInvoices.length}`);
    console.log(`   Note: POInvoiceHeaders will be created by AIM bridge`);
    console.log(`${'='.repeat(60)}\n`);

    return {
      success: true,
      fileRecordId,
      invoicesCreated: createdInvoices.length,
      invoiceIds: createdInvoices,
      details: {
        invoices: parsedDocuments.map((doc, idx) => ({
          index: idx + 1,
          type: doc.document_type,
          vendor: doc.vendor_name,
          invoiceNumber: doc.invoice_number,
          amount: doc.amount,
          invoiceId: createdInvoices[idx]?.id,
          lineItemsCount: doc.line_items?.length || 0,
        })),
      },
    };
    
  } catch (error) {
    console.error('\n❌ Post-OCR processing failed:', error);
    
    return {
      success: false,
      fileRecordId,
      invoicesCreated: 0,
      invoiceIds: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

