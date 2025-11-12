/**
 * PO Matching API Endpoint
 * 
 * POST /api/match-invoice
 * Body: { "invoiceId": "recXXXXXXXXXXXXXX" }
 * 
 * Given an invoice record ID:
 * 1. Fetches the invoice from Airtable
 * 2. Extracts non-null fields and MatchPayloadJSON
 * 3. Uses OpenAI to generate structured POInvoiceHeaders and POInvoiceDetails
 * 4. Creates the records in Airtable
 * 5. Returns the created record IDs
 */

import { NextRequest, NextResponse } from 'next/server';
import { processPOMatching } from '@/lib/po-matching/processor';
import { POMatchingRequest, POMatchingResponse } from '@/lib/types/po-matching';
import { TABLE_NAMES } from '@/lib/airtable/schema-types';

export const runtime = 'nodejs';
export const maxDuration = 300; // Maximum for Hobby plan with Fluid Compute (5 minutes)

// Environment variables
const BASE_ID = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID || process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TOKEN = process.env.AIRTABLE_PAT;

if (!BASE_ID) {
  throw new Error('Airtable BASE_ID is not configured');
}

/**
 * Fetch an invoice record from Airtable
 */
async function fetchInvoice(invoiceId: string): Promise<any> {
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}`
    : (process.env.NEXTAUTH_URL || 'http://localhost:3000');
  const url = `${baseUrl}/api/airtable/${TABLE_NAMES.INVOICES}/${invoiceId}?baseId=${BASE_ID}`;
  
  console.log(`   Fetching invoice from: ${url}`);
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch invoice record: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

/**
 * Create records in Airtable
 */
async function createRecords(
  tableName: string, 
  records: Array<{ fields: Record<string, any> }>
): Promise<{ records: Array<{ id: string }> }> {
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}`
    : (process.env.NEXTAUTH_URL || 'http://localhost:3000');
  const url = `${baseUrl}/api/airtable/${tableName}?baseId=${BASE_ID}`;
  
  console.log(`   Creating ${records.length} record(s) in ${tableName}`);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ records }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create records in ${tableName}: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

/**
 * Update an invoice record in Airtable
 */
async function updateInvoice(
  invoiceId: string,
  fields: Record<string, any>
): Promise<void> {
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}`
    : (process.env.NEXTAUTH_URL || 'http://localhost:3000');
  const url = `${baseUrl}/api/airtable/${TABLE_NAMES.INVOICES}?baseId=${BASE_ID}`;
  
  console.log(`   Updating invoice ${invoiceId} with fields:`, Object.keys(fields));
  
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      records: [{
        id: invoiceId,
        fields,
      }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update invoice ${invoiceId}: ${response.status} - ${errorText}`);
  }
}

/**
 * POST /api/match-invoice
 * 
 * Process PO matching for an invoice
 */
export async function POST(request: NextRequest) {
  try {
    const body: POMatchingRequest = await request.json();
    const { invoiceId } = body;

    // Validate input
    if (!invoiceId || typeof invoiceId !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing or invalid invoiceId',
        } as POMatchingResponse,
        { status: 400 }
      );
    }

    if (!invoiceId.startsWith('rec')) {
      return NextResponse.json(
        {
          success: false,
          error: 'invoiceId must be an Airtable record ID (starts with "rec")',
        } as POMatchingResponse,
        { status: 400 }
      );
    }

    console.log(`\n🎯 PO matching request received for invoice: ${invoiceId}\n`);

    // Process the PO matching
    const result = await processPOMatching(
      invoiceId,
      fetchInvoice,
      createRecords,
      updateInvoice
    );

    const response: POMatchingResponse = {
      success: true,
      headers: {
        ids: result.headerIds,
        count: result.headerCount,
      },
      details: {
        ids: result.detailIds,
        count: result.detailCount,
      },
    };

    return NextResponse.json(response, { status: 200 });
    
  } catch (error) {
    console.error('❌ Unexpected error in PO matching API:', error);
    
    const response: POMatchingResponse = {
      success: false,
      headers: { ids: [], count: 0 },
      details: { ids: [], count: 0 },
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };

    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * GET /api/match-invoice
 * 
 * Health check / documentation endpoint
 */
export async function GET() {
  return NextResponse.json({
    name: 'PO Matching API',
    version: '1.0.0',
    description: 'Generates and creates POInvoiceHeaders and POInvoiceDetails using OpenAI',
    usage: {
      method: 'POST',
      body: {
        invoiceId: 'string (required) - Airtable record ID of invoice',
      },
      example: {
        invoiceId: 'recXXXXXXXXXXXXXX',
      },
    },
    workflow: [
      '1. Fetch invoice record from Airtable',
      '2. Filter non-null fields',
      '3. Extract and parse MatchPayloadJSON',
      '4. Call OpenAI with invoice data and match payload',
      '5. Create POInvoiceHeader records',
      '6. Create POInvoiceDetail records (linked to headers)',
      '7. Return created record IDs',
    ],
    response: {
      success: 'boolean',
      headers: {
        ids: 'string[] - Created POInvoiceHeader record IDs',
        count: 'number - Count of created headers',
      },
      details: {
        ids: 'string[] - Created POInvoiceDetail record IDs',
        count: 'number - Count of created details',
      },
      error: 'string (optional) - Error message if failed',
    },
    environment: {
      openai_configured: !!process.env.OPENAI_API_KEY,
      airtable_configured: !!BASE_ID,
      base_id: BASE_ID ? `${BASE_ID.substring(0, 6)}...` : 'not configured',
    },
  });
}



