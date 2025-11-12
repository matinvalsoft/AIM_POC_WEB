import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { createAirtableClient } from '@/lib/airtable/client';
import { generateFileHash } from '@/utils/file-hash';
import { checkFileHashDuplicate } from '@/lib/duplicate-detection';
import { validateFile } from '@/utils/file-validation';
import { setRecordError } from '@/lib/airtable/error-handler';

// Force this route to use Node.js runtime for server-side operations
export const runtime = 'nodejs';

// Set maximum execution time to 300 seconds (5 minutes) for file upload and OCR processing
// Hobby plan with Fluid Compute: max is 300s (5 minutes)
// OCR processing is triggered asynchronously (fire-and-forget)
export const maxDuration = 300;

/**
 * Trigger OCR processing for a file
 */
async function triggerOCRProcessing(recordId: string, fileUrl: string, baseUrl: string): Promise<void> {
  try {
    console.log(`🚀 Starting OCR processing for record ${recordId}`);
    const ocrEndpoint = `${baseUrl}/api/ocr2/process`;
    console.log(`📍 OCR endpoint: ${ocrEndpoint}`);
    
    const requestBody = {
      record_id: recordId,
      file_url: fileUrl
    };
    console.log(`📤 Request body:`, JSON.stringify(requestBody));
    
    let ocrResponse;
    try {
      console.log(`📞 Making fetch request...`);
      ocrResponse = await fetch(ocrEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(300000) // 300 second timeout (5 minutes)
      });
      console.log(`✅ Fetch completed`);
    } catch (fetchError) {
      console.error(`❌ Fetch failed:`, fetchError);
      throw new Error(`Failed to call OCR API: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
    }

    console.log(`📡 OCR API response status: ${ocrResponse.status}`);
    console.log(`📡 OCR API response status text: ${ocrResponse.statusText}`);
    
    try {
      const headers = Object.fromEntries(ocrResponse.headers.entries());
      console.log(`📡 OCR API response headers:`, JSON.stringify(headers));
    } catch (e) {
      console.log(`⚠️ Could not log headers`);
    }

    // Try to read response body as text first
    let responseText = '';
    try {
      console.log(`📖 Reading response body...`);
      responseText = await ocrResponse.text();
      console.log(`📡 OCR API raw response body (length ${responseText.length}):`, responseText.substring(0, 1000));
    } catch (readError) {
      console.error(`❌ Failed to read response body:`, readError);
    }

    if (!ocrResponse.ok) {
      let errorData: any = {};
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { rawResponse: responseText };
      }
      console.error(`❌ OCR API error response:`, errorData);
      throw new Error(`OCR API responded with ${ocrResponse.status}: ${JSON.stringify(errorData)}`);
    }

    const result = JSON.parse(responseText);
    console.log(`✅ OCR processing completed for record ${recordId}:`, {
      textLength: result.extracted_text_length,
      airtableUpdated: result.airtable_updated,
      message: result.message
    });
  } catch (error) {
    console.error(`❌ OCR processing failed for record ${recordId}:`, error);
    console.error(`❌ Error type: ${error?.constructor?.name}`);
    console.error(`❌ Error message: ${error instanceof Error ? error.message : String(error)}`);
    console.error(`❌ Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
    throw error;
  }
}

/**
 * Update file record status in Airtable (currently unused but kept for future use)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function updateRecordStatus(recordId: string, status: 'Queued' | 'Processed' | 'Attention'): Promise<void> {
  try {
    const baseId = process.env.AIRTABLE_BASE_ID;
    if (!baseId) {
      console.warn('Cannot update record status: AIRTABLE_BASE_ID not configured');
      return;
    }

    const airtableClient = createAirtableClient(baseId);
    await airtableClient.updateRecords('Files', {
      records: [{
        id: recordId,
        fields: {
          'Status': status
        }
      }],
      typecast: true
    });

    console.log(`📝 Updated record ${recordId} status to: ${status}`);
  } catch (error) {
    console.error(`❌ Failed to update record ${recordId} status:`, error);
    throw error;
  }
}

/**
 * Upload file to Vercel Blob and create corresponding Airtable record
 */
export async function POST(request: NextRequest) {
  try {
    // Get base URL for internal API calls
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    const baseId = process.env.AIRTABLE_BASE_ID;
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file before processing
    console.log('🔍 Validating file...');
    const validationResult = await validateFile(file);
    if (!validationResult.isValid) {
      console.log(`❌ File validation failed: ${validationResult.errorMessage}`);
      return NextResponse.json(
        { 
          error: 'File validation failed',
          errorCode: validationResult.errorCode,
          errorMessage: validationResult.errorMessage
        },
        { status: 400 }
      );
    }
    console.log('✅ File validation passed');

    // Generate file hash for duplicate detection
    console.log('🔍 Generating file hash for duplicate detection...');
    const fileHash = await generateFileHash(file);
    console.log(`📋 File hash: ${fileHash}`);

    // Check for duplicates before uploading
    let isDuplicateFile = false;
    let duplicateInfo = null;
    if (baseId) {
      const duplicateResult = await checkFileHashDuplicate(fileHash, baseId);
      if (duplicateResult.isDuplicate) {
        console.log(`🚫 Duplicate file detected! ${duplicateResult.reason}`);
        isDuplicateFile = true;
        duplicateInfo = duplicateResult;
        // Continue with upload but mark as duplicate in Airtable
      }
    }

    // Upload to Vercel Blob with a simple, safe filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || '';
    const safeFilename = `upload-${timestamp}.${fileExtension}`;
    
    console.log(`Uploading file: ${file.name} as ${safeFilename}`);
    
    let blob;
    try {
      blob = await put(safeFilename, file, {
        access: 'public',
      });
      
      console.log(`✅ Vercel Blob upload successful: ${blob.url}`);
      
      // Wait a moment for the blob to be available
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Test if the blob URL is accessible
      const testResponse = await fetch(blob.url, { method: 'HEAD' });
      console.log(`Blob URL accessibility test: ${testResponse.status} - ${blob.url}`);
      
      if (testResponse.status !== 200) {
        console.error('Blob URL is not accessible to external services');
        throw new Error(`Blob URL returned ${testResponse.status}`);
      }
      
    } catch (error) {
      console.error('Vercel Blob upload or accessibility failed:', error);
      return NextResponse.json({
        success: false,
        error: 'File upload failed or not accessible for Airtable attachment',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }

    // Create Airtable record in Files table
    if (!baseId) {
      console.warn('AIRTABLE_BASE_ID not configured, skipping Airtable record creation');
      return NextResponse.json({
        success: true,
        url: blob.url,
        filename: file.name,
        size: file.size,
        type: file.type,
        airtableRecord: null,
        warning: 'File uploaded to Vercel Blob but not saved to Airtable (missing base ID)'
      });
    }

    try {
      const airtableClient = createAirtableClient(baseId);
      
      // Create record in Files table with attachment
      // Note: Using new schema field names after database migration
      const recordFields: Record<string, unknown> = {
        'FileName': file.name, // Changed from 'Name' to 'FileName'
        // 'Source' field removed in new schema
        'Status': isDuplicateFile ? 'Attention' : 'Queued',
        'FileHash': fileHash, // Changed from 'File Hash' to 'FileHash' (no space)
        'UploadedDate': new Date().toISOString().split('T')[0], // Add upload date (correct field name)
        'Attachments': [
          {
            url: blob.url,
            filename: file.name
          }
        ]
      };

      // Add duplicate error information if detected
      if (isDuplicateFile && duplicateInfo) {
        recordFields['Error-Code'] = 'DUPLICATE_FILE';
        recordFields['Error-Link'] = `/files?id=${duplicateInfo.duplicateRecord?.id}`;
      }

      const recordData = {
        records: [{
          fields: recordFields
        }],
        typecast: true
      };

      const airtableResponse = await airtableClient.createRecords('Files', recordData);

      const airtableRecord = airtableResponse.records[0];

      // Log successful attachment creation
      if (airtableRecord.fields.Attachments?.length > 0) {
        console.log(`✅ File uploaded and attached to Airtable record ${airtableRecord.id}`);
        console.log(`📎 Attachment ID: ${airtableRecord.fields.Attachments[0].id}`);
      } else {
        console.warn('⚠️ Record created but no attachments found');
      }

      // Trigger OCR processing for PDF files
      if (file.type === 'application/pdf') {
        console.log(`🔍 Triggering OCR processing for PDF: ${file.name}`);
        console.log(`📄 Record ID: ${airtableRecord.id}`);
        console.log(`🔗 File URL: ${blob.url}`);
        console.log(`🌐 Base URL: ${baseUrl}`);
        
        // Trigger OCR processing asynchronously - don't wait for completion
        triggerOCRProcessing(airtableRecord.id, blob.url, baseUrl).catch(async (error) => {
          console.error('OCR processing failed:', error);
          
          // Set appropriate error code based on the error
          const errorMessage = error instanceof Error ? error.message : String(error);
          let errorCode: 'OCR_FAILED' | 'PDF_CORRUPTED' | 'PROCESSING_ERROR' | 'TIMEOUT_ERROR' = 'OCR_FAILED';
          
          if (errorMessage.toLowerCase().includes('corrupt') || 
              errorMessage.toLowerCase().includes('invalid pdf')) {
            errorCode = 'PDF_CORRUPTED';
          } else if (errorMessage.toLowerCase().includes('timeout')) {
            errorCode = 'TIMEOUT_ERROR';
          }
          
          try {
            await setRecordError({
              recordId: airtableRecord.id,
              errorCode,
              baseId
            });
          } catch (updateError) {
            console.error('Failed to set error code:', updateError);
          }
        });
      } else {
        console.log(`ℹ️ Skipping OCR for non-PDF file: ${file.name} (type: ${file.type})`);
      }

      return NextResponse.json({
        success: true,
        url: blob.url,
        filename: file.name,
        size: file.size,
        type: file.type,
        isDuplicate: isDuplicateFile,
        duplicateInfo: isDuplicateFile ? duplicateInfo : null,
        airtableRecord: {
          id: airtableRecord.id,
          fields: airtableRecord.fields
        }
      });

    } catch (airtableError) {
      console.error('Airtable record creation failed:', airtableError);
      
      // File was uploaded to Blob successfully, but Airtable failed
      // We'll return success but with a warning
      return NextResponse.json({
        success: true,
        url: blob.url,
        filename: file.name,
        size: file.size,
        type: file.type,
        airtableRecord: null,
        warning: 'File uploaded to Vercel Blob but failed to save to Airtable',
        airtableError: airtableError instanceof Error ? airtableError.message : 'Unknown error'
      });
    }

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { 
        error: 'Upload failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
