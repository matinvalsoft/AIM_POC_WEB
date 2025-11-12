/**
 * Parser3 API Route
 * Takes a record ID, fetches the Raw-Text field, and logs the first 50 characters
 */

import { NextRequest, NextResponse } from 'next/server';

const BASE_ID = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID || process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TOKEN = process.env.AIRTABLE_PAT;

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

    console.log('🔵 Parser3: Processing record:', recordId);

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
      console.error('❌ Parser3: Airtable fetch error:', response.status, errorText);
      return NextResponse.json(
        { error: `Failed to fetch record: ${response.status}` },
        { status: response.status }
      );
    }

    const record = await response.json();
    console.log('✅ Parser3: Record fetched successfully');

    // Get the Raw-Text field
    const rawText = record.fields?.['Raw-Text'] as string | undefined;
    
    if (!rawText) {
      console.log('⚠️ Parser3: No Raw-Text field found in record');
      return NextResponse.json(
        { error: 'No Raw-Text field found in record' },
        { status: 400 }
      );
    }

    // Log the first 50 characters
    const first50Chars = rawText.substring(0, 50);
    console.log('📝 Parser3: First 50 characters of Raw-Text:', first50Chars);

    // Return success
    return NextResponse.json({
      success: true,
      recordId: record.id,
      rawTextLength: rawText.length,
      first50Chars,
      message: 'Parser3 completed successfully'
    });

  } catch (error) {
    console.error('❌ Parser3: Error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

