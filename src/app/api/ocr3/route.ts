/**
 * OCR3 API Route
 * Accepts an Airtable record ID from the Files table
 * Uses OpenAI's native PDF processing via Responses API
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for large PDFs

import { NextRequest, NextResponse } from 'next/server';

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
  const requestId = Math.random().toString(36).substring(7);
  
  try {
    const body = await request.json();
    const { recordId } = body;

    if (!recordId || !recordId.startsWith('rec')) {
      return NextResponse.json(
        { error: 'Invalid record ID' },
        { status: 400 }
      );
    }

    console.log(`🔵 [${requestId}] OCR3: Fetching record:`, recordId);
    console.log(`🔵 [${requestId}] OCR3: BASE_ID:`, BASE_ID);
    console.log(`🔵 [${requestId}] OCR3: AIRTABLE_TOKEN present:`, !!AIRTABLE_TOKEN);
    console.log(`🔵 [${requestId}] OCR3: AIRTABLE_TOKEN length:`, AIRTABLE_TOKEN?.length);

    // Add a small delay to allow for Airtable propagation
    console.log(`⏳ [${requestId}] OCR3: Waiting 2 seconds for Airtable record propagation...`);
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Fetch the record from Airtable Files table
    const url = `https://api.airtable.com/v0/${BASE_ID}/Files/${recordId}`;
    console.log(`🔵 [${requestId}] OCR3: Fetch URL:`, url);
    
    const airtableResponse = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!airtableResponse.ok) {
      const errorText = await airtableResponse.text();
      console.error(`❌ [${requestId}] OCR3: Airtable fetch error:`, airtableResponse.status, errorText);
      console.error(`❌ [${requestId}] OCR3: Record ID:`, recordId);
      console.error(`❌ [${requestId}] OCR3: BASE_ID:`, BASE_ID);
      console.error(`❌ [${requestId}] OCR3: Full URL:`, url);
      return NextResponse.json(
        { error: `Failed to fetch record: ${airtableResponse.status}`, details: errorText },
        { status: airtableResponse.status }
      );
    }

    const record = await airtableResponse.json();
    console.log(`✅ [${requestId}] OCR3: Record fetched successfully`);
    console.log(`📋 [${requestId}] OCR3: Available fields:`, Object.keys(record.fields || {}));

    // Get attachments
    const attachments = record.fields?.Attachments as AirtableAttachment[] | undefined;
    
    if (!attachments || attachments.length === 0) {
      return NextResponse.json(
        { error: 'No attachments found in record' },
        { status: 400 }
      );
    }

    console.log(`📎 [${requestId}] OCR3: Found ${attachments.length} attachment(s)`);
    
    // Get the first attachment
    const attachment = attachments[0];
    console.log(`📄 [${requestId}] OCR3: Processing attachment:`, {
      filename: attachment.filename,
      type: attachment.type,
      size: attachment.size,
      url: attachment.url.substring(0, 50) + '...'
    });

    // Download the attachment
    console.log(`⬇️  [${requestId}] OCR3: Downloading attachment...`);
    const fileResponse = await fetch(attachment.url);
    
    if (!fileResponse.ok) {
      console.error(`❌ [${requestId}] OCR3: Failed to download attachment:`, fileResponse.status);
      return NextResponse.json(
        { error: 'Failed to download attachment' },
        { status: 500 }
      );
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    console.log(`✅ [${requestId}] OCR3: Attachment downloaded successfully`);
    console.log(`📊 [${requestId}] OCR3: File size: ${fileBuffer.byteLength} bytes`);

    // Check if it's a PDF
    const isPdf = attachment.type === 'application/pdf' || 
                  attachment.filename.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      return NextResponse.json(
        { error: 'Only PDF files are supported' },
        { status: 400 }
      );
    }

    // Update status to "Processing" before starting OCR
    console.log(`📝 [${requestId}] OCR3: Setting status to Processing...`);
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
      console.warn(`⚠️ [${requestId}] OCR3: Failed to update status to Processing:`, statusUpdateResponse.status);
    } else {
      console.log(`✅ [${requestId}] OCR3: Status set to Processing`);
    }

    // Use OpenAI's native PDF processing via Responses API
    // Following the exact format from OpenAI docs
    console.log(`🤖 [${requestId}] OCR3: Processing PDF with OpenAI Responses API...`);
    const startOcr = Date.now();

    const openaiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-5',
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: 'Extract all text from this PDF document. Return only the raw text content in reading order, with no additional commentary or formatting.'
              },
              {
                type: 'input_file',
                file_url: attachment.url
              }
            ]
          }
        ]
      })
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error(`❌ [${requestId}] OCR3: OpenAI API error:`, openaiResponse.status);
      console.error(`❌ [${requestId}] OCR3: Error details:`, errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      
      return NextResponse.json(
        { 
          error: `OpenAI API error: ${openaiResponse.status}`,
          details: errorData
        },
        { status: 500 }
      );
    }

    const completion = await openaiResponse.json();
    console.log(`🔍 [${requestId}] OCR3: OpenAI response structure:`, JSON.stringify(completion, null, 2));
    
    // Extract text from the Responses API format
    // The output array contains: [0] = reasoning, [1] = message with content
    let extractedText = '';
    if (completion.output && Array.isArray(completion.output)) {
      // Find the message output (type: "message")
      const messageOutput = completion.output.find((item: any) => item.type === 'message');
      if (messageOutput?.content && Array.isArray(messageOutput.content)) {
        // Find the text content (type: "output_text")
        const textContent = messageOutput.content.find((item: any) => item.type === 'output_text');
        extractedText = textContent?.text || '';
      }
    }
    const ocrTime = Date.now() - startOcr;

    console.log(`✅ [${requestId}] OCR3: OCR completed in ${ocrTime}ms`);
    console.log(`📝 [${requestId}] OCR3: Extracted ${extractedText.length} characters`);
    console.log(`📄 [${requestId}] OCR3: Preview: ${extractedText.substring(0, 200)}...`);

    // Update Airtable record with extracted text (keep status as "Processing")
    console.log(`💾 [${requestId}] OCR3: Updating Airtable record with extracted text...`);
    const updateUrl = `https://api.airtable.com/v0/${BASE_ID}/Files/${recordId}`;
    
    const updatePayload = {
      fields: {
        'Raw-Text': extractedText
        // Note: Status remains "Processing" - not changing it to "Processed"
      }
    };
    
    const updateResponse = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatePayload)
    });

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      console.error(`❌ [${requestId}] OCR3: Failed to update Airtable:`, updateResponse.status, errorData);
      return NextResponse.json(
        { 
          error: `OCR succeeded but failed to update record: ${updateResponse.status}`,
          airtableError: errorData,
          extractedText,
          textLength: extractedText.length
        },
        { status: 500 }
      );
    }

    const updateResult = await updateResponse.json();
    console.log(`✅ [${requestId}] OCR3: Record updated successfully (status remains "Processing")`);

    // Step: Trigger parser3 to create invoice and update status to "Processed"
    console.log(`🔄 [${requestId}] OCR3: Triggering parser3 to create invoice...`);
    try {
      // Determine base URL for internal API calls
      const baseUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}`
        : (process.env.NEXTAUTH_URL || 'http://localhost:3000');
      
      const parser3Endpoint = `${baseUrl}/api/parser3`;
      console.log(`📍 [${requestId}] OCR3: parser3 endpoint:`, parser3Endpoint);
      
      const parser3Response = await fetch(parser3Endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recordID: recordId,
          rawText: extractedText
        }),
      });

      if (!parser3Response.ok) {
        const errorText = await parser3Response.text();
        console.error(`❌ [${requestId}] OCR3: parser3 failed:`, parser3Response.status, errorText);
        // Don't fail the whole request - OCR was successful
        console.warn(`⚠️ [${requestId}] OCR3: Invoice creation failed, file remains in Processing state`);
      } else {
        const parser3Result = await parser3Response.json();
        console.log(`✅ [${requestId}] OCR3: Invoice created successfully:`, parser3Result.invoiceRecordId);
        console.log(`✅ [${requestId}] OCR3: File status updated to "Processed"`);
      }
    } catch (parser3Error) {
      console.error(`❌ [${requestId}] OCR3: Error calling parser3:`, parser3Error);
      // Don't fail the whole request - OCR was successful
      console.warn(`⚠️ [${requestId}] OCR3: Invoice creation failed, file remains in Processing state`);
    }

    // Return success
    return NextResponse.json({
      success: true,
      recordId: record.id,
      fileName: attachment.filename,
      fileType: attachment.type,
      fileSize: fileBuffer.byteLength,
      textLength: extractedText.length,
      ocrTimeMs: ocrTime,
      message: 'OCR completed and record updated successfully'
    });

  } catch (error) {
    console.error(`❌ [${requestId}] OCR3: Error:`, error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}


