/**
 * POST-OCR Processing API Endpoint
 * 
 * Test endpoint for post-OCR document parsing and Airtable record creation
 * 
 * Usage:
 *   POST /api/post-ocr/process
 *   Body: { "file_record_id": "recXXXXXXXXXXXXXX" }
 * 
 * This can be called manually for testing or automatically after OCR completion
 */

import { NextRequest, NextResponse } from 'next/server';
import { processPostOCR } from '@/lib/post-ocr/processor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // Force dynamic rendering to prevent build-time analysis
export const maxDuration = 60; // Allow up to 60 seconds for LLM processing

/**
 * POST /api/post-ocr/process
 * 
 * Process a file that has completed OCR:
 * 1. Parse the raw OCR text with LLM
 * 2. Create document records in Airtable
 * 3. Link documents back to the file
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { file_record_id } = body;

    // Validate input
    if (!file_record_id || typeof file_record_id !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing or invalid file_record_id',
        },
        { status: 400 }
      );
    }

    if (!file_record_id.startsWith('rec')) {
      return NextResponse.json(
        {
          success: false,
          error: 'file_record_id must be an Airtable record ID (starts with "rec")',
        },
        { status: 400 }
      );
    }

    console.log(`\n🎯 POST-OCR processing request received for: ${file_record_id}\n`);

    // Process the file
    const result = await processPostOCR(file_record_id);

    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ Unexpected error in post-OCR API:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/post-ocr/process
 * 
 * Health check / documentation endpoint
 */
export async function GET() {
  return NextResponse.json({
    name: 'Post-OCR Processing API',
    version: '1.0.0',
    description: 'Parses OCR text and creates structured document records',
    usage: {
      method: 'POST',
      body: {
        file_record_id: 'string (required) - Airtable record ID of processed file',
      },
      example: {
        file_record_id: 'recXXXXXXXXXXXXXX',
      },
    },
    workflow: [
      '1. Fetch file record and raw OCR text',
      '2. Parse text with LLM (GPT-4o) to identify documents',
      '3. Extract individual document text (if multiple documents)',
      '4. Create Airtable records (Invoices, Delivery Tickets, Store Receivers)',
      '5. Link created documents back to source file',
    ],
    environment: {
      openai_configured: !!process.env.OPENAI_API_KEY,
      airtable_configured: !!(process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID || process.env.AIRTABLE_BASE_ID),
    },
  });
}






