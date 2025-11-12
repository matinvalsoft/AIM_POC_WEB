/**
 * OCR3 API Route
 * Accepts an Airtable record ID from the Files table
 * Uses ocr-llm for text extraction
 */

import { NextRequest, NextResponse } from 'next/server';
import { OcrLLM } from 'ocr-llm';

const BASE_ID = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID || process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TOKEN = process.env.AIRTABLE_PAT;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface AirtableAttachment {
  id: string;
  url: string;
  filename: string;
  size: number;
  type: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recordId } = body;

    if (!recordId || !recordId.startsWith('rec')) {
      return NextResponse.json(
        { error: 'Invalid record ID' },
        { status: 400 }
      );
    }

    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    console.log('🔵 OCR3: Fetching record:', recordId);

    // Fetch the record from Airtable Files table
    const url = `https://api.airtable.com/v0/${BASE_ID}/Files/${recordId}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OCR3: Airtable fetch error:', response.status, errorText);
      return NextResponse.json(
        { error: `Failed to fetch record: ${response.status}` },
        { status: response.status }
      );
    }

    const record = await response.json();
    console.log('✅ OCR3: Record fetched successfully');
    console.log('📋 OCR3: Available fields:', Object.keys(record.fields || {}));

    // Update status to Processing
    console.log('🔄 OCR3: Setting status to Processing...');
    const statusUpdateUrl = `https://api.airtable.com/v0/${BASE_ID}/Files/${recordId}`;
    
    const statusUpdateResponse = await fetch(statusUpdateUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          'Status': 'Processing'
        }
      })
    });

    if (!statusUpdateResponse.ok) {
      console.error('⚠️ OCR3: Failed to update status to Processing:', statusUpdateResponse.status);
    } else {
      console.log('✅ OCR3: Status updated to Processing');
    }

    // Get attachments
    const attachments = record.fields?.Attachments as AirtableAttachment[] | undefined;
    
    if (!attachments || attachments.length === 0) {
      return NextResponse.json(
        { error: 'No attachments found in record' },
        { status: 400 }
      );
    }

    console.log(`📎 OCR3: Found ${attachments.length} attachment(s)`);
    
    // Get the first attachment
    const attachment = attachments[0];
    console.log('📄 OCR3: Processing attachment:', {
      filename: attachment.filename,
      type: attachment.type,
      size: attachment.size,
      url: attachment.url.substring(0, 50) + '...'
    });

    // Download the attachment
    console.log('⬇️  OCR3: Downloading attachment...');
    const fileResponse = await fetch(attachment.url);
    
    if (!fileResponse.ok) {
      console.error('❌ OCR3: Failed to download attachment:', fileResponse.status);
      return NextResponse.json(
        { error: 'Failed to download attachment' },
        { status: 500 }
      );
    }

    const fileBuffer = Buffer.from(await fileResponse.arrayBuffer());
    console.log('✅ OCR3: Attachment downloaded successfully');
    console.log(`📊 OCR3: File size: ${fileBuffer.byteLength} bytes`);

    // Initialize OcrLLM
    const ocrllm = new OcrLLM({
      provider: 'openai',
      key: OPENAI_API_KEY,
    });

    // Process the file based on type
    const isPdf = attachment.type === 'application/pdf' || attachment.filename.toLowerCase().endsWith('.pdf');
    
    console.log('🔍 OCR3: Starting OCR processing...');
    const startTime = Date.now();

    let extractedText = '';
    let pageCount = 0;

    if (isPdf) {
      console.log('📄 OCR3: Processing as PDF');
      const pdfResults = await ocrllm.pdf(fileBuffer);
      pageCount = pdfResults.length;
      
      // Combine all pages
      extractedText = pdfResults
        .map(page => `--- Page ${page.page} ---\n${page.content}`)
        .join('\n\n');
      
      console.log(`✅ OCR3: Processed ${pageCount} pages`);
    } else {
      console.log('🖼️  OCR3: Processing as image');
      const imageResult = await ocrllm.image(fileBuffer);
      extractedText = imageResult.content;
      pageCount = 1;
      console.log('✅ OCR3: Image processed');
    }

    const processingTime = Date.now() - startTime;
    console.log(`⏱️  OCR3: Processing completed in ${processingTime}ms`);
    console.log(`📝 OCR3: Extracted ${extractedText.length} characters`);

    // Update the Airtable record with extracted text
    console.log('💾 OCR3: Updating Airtable record with extracted text...');
    const updateUrl = `https://api.airtable.com/v0/${BASE_ID}/Files/${recordId}`;
    
    const updateResponse = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          'Raw-Text': extractedText
        }
      })
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('❌ OCR3: Failed to update Airtable record:', updateResponse.status, errorText);
      return NextResponse.json(
        { 
          error: `OCR succeeded but failed to update record: ${updateResponse.status}`,
          extractedText,
          textLength: extractedText.length
        },
        { status: 500 }
      );
    }

    console.log('✅ OCR3: Airtable record updated successfully');

    // Trigger parser3 processing
    console.log('🚀 OCR3: Triggering parser3...');
    try {
      const baseUrl = new URL(request.url).origin;
      const parser3Endpoint = `${baseUrl}/api/parser3`;
      
      const parser3Response = await fetch(parser3Endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recordId: recordId
        })
      });

      if (!parser3Response.ok) {
        console.error('⚠️ OCR3: Parser3 call failed:', parser3Response.status);
      } else {
        console.log('✅ OCR3: Parser3 triggered successfully');
      }
    } catch (parser3Error) {
      console.error('❌ OCR3: Failed to trigger parser3:', parser3Error);
    }

    // Return success with extracted text
    return NextResponse.json({
      success: true,
      recordId: record.id,
      fileName: attachment.filename,
      fileType: attachment.type,
      fileSize: fileBuffer.byteLength,
      pageCount,
      extractedText,
      textLength: extractedText.length,
      processingTimeMs: processingTime,
      message: 'OCR completed and record updated successfully'
    });

  } catch (error) {
    console.error('❌ OCR3: Error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

