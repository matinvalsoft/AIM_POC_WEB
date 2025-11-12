/**
 * OCR3 API Route
 * Accepts an Airtable record ID from the Files table
 * Uses PDFium WASM + GPT-4o for high-quality OCR
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for large PDFs

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const BASE_ID = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID || process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TOKEN = process.env.AIRTABLE_PAT;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

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

    const fileBuffer = await fileResponse.arrayBuffer();
    console.log('✅ OCR3: Attachment downloaded successfully');
    console.log(`📊 OCR3: File size: ${fileBuffer.byteLength} bytes`);

    // Check if it's a PDF
    const isPdf = attachment.type === 'application/pdf' || 
                  attachment.filename.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      return NextResponse.json(
        { error: 'Only PDF files are supported' },
        { status: 400 }
      );
    }

    // Convert PDF to base64 for GPT-4o
    console.log('🔍 OCR3: Preparing PDF for GPT-4o...');
    const startOcr = Date.now();
    const pdfBase64 = Buffer.from(fileBuffer).toString('base64');
    
    // Send PDF directly to GPT-4o (it can handle PDFs natively)
    console.log('🤖 OCR3: Running OCR with GPT-4o on PDF...');
    
    const prompt = 'Perform OCR on this PDF document. Extract ALL text in reading order. Output ONLY the raw text, no commentary or formatting.';

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:application/pdf;base64,${pdfBase64}`,
              },
            },
          ],
        },
      ],
    });

    const extractedText = completion.choices[0]?.message?.content ?? '';
    const ocrTime = Date.now() - startOcr;
    
    console.log(`✅ OCR3: OCR completed in ${ocrTime}ms`);
    console.log(`📝 OCR3: Extracted ${extractedText.length} characters`);

    // Update Airtable record with extracted text
    console.log('💾 OCR3: Updating Airtable record...');
    const updateUrl = `https://api.airtable.com/v0/${BASE_ID}/Files/${recordId}`;
    
    const updatePayload = {
      fields: {
        'Raw-Text': extractedText,
        'Status': 'Processed',
      }
    };
    
    console.log('📤 OCR3: Update URL:', updateUrl);
    console.log('📤 OCR3: Update payload:', JSON.stringify(updatePayload, null, 2));
    
    const updateResponse = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatePayload)
    });

    const updateResult = await updateResponse.json();
    console.log('📥 OCR3: Update response status:', updateResponse.status);
    console.log('📥 OCR3: Update response:', JSON.stringify(updateResult, null, 2));

    if (!updateResponse.ok) {
      console.error('❌ OCR3: Failed to update Airtable:', updateResponse.status, updateResult);
      return NextResponse.json(
        { 
          error: `OCR succeeded but failed to update record: ${updateResponse.status}`,
          airtableError: updateResult,
          extractedText,
          textLength: extractedText.length
        },
        { status: 500 }
      );
    }

    console.log('✅ OCR3: Record updated successfully');

    // Return success
    return NextResponse.json({
      success: true,
      recordId: record.id,
      fileName: attachment.filename,
      fileType: attachment.type,
      fileSize: fileBuffer.byteLength,
      textLength: extractedText.length,
      ocrTimeMs: ocrTime,
      message: 'OCR completed successfully'
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

