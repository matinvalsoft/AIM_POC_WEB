import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { createAirtableClient } from '@/lib/airtable/client';

// Force this route to use Node.js runtime for server-side operations
export const runtime = 'nodejs';

/**
 * Trigger OCR processing for a file
 */
async function triggerOCRProcessing(recordId: string, fileUrl: string, baseUrl: string): Promise<void> {
  try {
    console.log(`🚀 Starting OCR processing for record ${recordId}`);
    const ocrEndpoint = `${baseUrl}/api/ocr2/process`;
    console.log(`📍 OCR endpoint: ${ocrEndpoint}`);
    
    const ocrResponse = await fetch(ocrEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        record_id: recordId,
        file_url: fileUrl
      })
    });

    console.log(`📡 OCR API response status: ${ocrResponse.status}`);

    if (!ocrResponse.ok) {
      const errorData = await ocrResponse.json().catch(() => ({}));
      console.error(`❌ OCR API error response:`, errorData);
      throw new Error(`OCR API responded with ${ocrResponse.status}: ${errorData.error || 'Unknown error'}`);
    }

    const result = await ocrResponse.json();
    console.log(`✅ OCR processing completed for record ${recordId}:`, {
      textLength: result.extracted_text_length,
      airtableUpdated: result.airtable_updated,
      message: result.message
    });
  } catch (error) {
    console.error(`❌ OCR processing failed for record ${recordId}:`, error);
    throw error;
  }
}

/**
 * Update file record status in Airtable
 */
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
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
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
    const baseId = process.env.AIRTABLE_BASE_ID;
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
      const recordData = {
        records: [{
          fields: {
            'Name': file.name,
            'Upload Date': new Date().toISOString().split('T')[0], // YYYY-MM-DD format
            'Source': 'Upload',
            'Status': 'Queued',
            'Pages': null, // Will be populated later if it's a document
            // Removed deprecated fields: 'Is Duplicate', 'Duplicate Of', 'Attention'
            // These fields don't exist in the current schema
            'Attachments': [
              {
                url: blob.url,
                filename: file.name
              }
            ]
          }
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
        triggerOCRProcessing(airtableRecord.id, blob.url, baseUrl).catch(error => {
          console.error('OCR processing failed:', error);
          // Update record status to attention if OCR fails
          updateRecordStatus(airtableRecord.id, 'Attention').catch(console.error);
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
