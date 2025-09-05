/**
 * Next.js Route Handler for individual Airtable record operations
 * Supports GET, PATCH, DELETE for a specific record ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAirtableClient } from '@/lib/airtable/client';

// Force this route to use Node.js runtime for server-side operations
export const runtime = 'nodejs';

/**
 * Error response helper
 */
function errorResponse(message: string, status = 400) {
  return NextResponse.json(
    { error: { message, status } },
    { status }
  );
}

/**
 * Get base ID from request or environment
 */
function getBaseId(request: NextRequest): string {
  const baseId = request.nextUrl.searchParams.get('baseId') || process.env.AIRTABLE_BASE_ID;
  
  if (!baseId) {
    throw new Error('Base ID is required. Provide baseId query parameter or set AIRTABLE_BASE_ID environment variable.');
  }
  
  return baseId;
}

/**
 * GET /api/airtable/[table]/[recordId] - Get a single record by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ table: string; recordId: string }> }
) {
  try {
    const baseId = getBaseId(request);
    const client = createAirtableClient(baseId);
    const resolvedParams = await params;
    const table = decodeURIComponent(resolvedParams.table);
    const recordId = resolvedParams.recordId;
    
    console.log(`Fetching record ${recordId} from table ${table} in base ${baseId}`);
    
    const record = await client.getRecord(table, recordId);
    
    return NextResponse.json(record);
  } catch (error) {
    console.error('Airtable GET record error:', error);
    
    // If it's a 404 from Airtable, return 404 instead of 500
    if (error instanceof Error && error.message.includes('NOT_FOUND')) {
      return errorResponse(
        `Record ${(await params).recordId} not found in table ${(await params).table}`,
        404
      );
    }
    
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to fetch record',
      500
    );
  }
}

/**
 * PATCH /api/airtable/[table]/[recordId] - Update a single record
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ table: string; recordId: string }> }
) {
  try {
    const baseId = getBaseId(request);
    const client = createAirtableClient(baseId);
    const resolvedParams = await params;
    const table = decodeURIComponent(resolvedParams.table);
    const recordId = resolvedParams.recordId;
    
    const body = await request.json();
    
    if (!body.fields) {
      return errorResponse('Request body must contain "fields" object');
    }
    
    console.log(`Updating record ${recordId} in table ${table} in base ${baseId}`);
    
    const updateParams = {
      records: [{ id: recordId, fields: body.fields }],
      typecast: body.typecast,
    };
    
    const response = await client.updateRecords(table, updateParams);
    
    // Return the updated record (first item in the response)
    return NextResponse.json(response.records[0]);
  } catch (error) {
    console.error('Airtable PATCH record error:', error);
    
    if (error instanceof Error && error.message.includes('NOT_FOUND')) {
      return errorResponse(
        `Record ${(await params).recordId} not found in table ${(await params).table}`,
        404
      );
    }
    
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to update record',
      500
    );
  }
}

/**
 * DELETE /api/airtable/[table]/[recordId] - Delete a single record
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ table: string; recordId: string }> }
) {
  try {
    const baseId = getBaseId(request);
    const client = createAirtableClient(baseId);
    const resolvedParams = await params;
    const table = decodeURIComponent(resolvedParams.table);
    const recordId = resolvedParams.recordId;
    
    console.log(`Deleting record ${recordId} from table ${table} in base ${baseId}`);
    
    const deleteParams = {
      records: [recordId],
    };
    
    const response = await client.deleteRecords(table, deleteParams);
    
    return NextResponse.json(response.records[0]);
  } catch (error) {
    console.error('Airtable DELETE record error:', error);
    
    if (error instanceof Error && error.message.includes('NOT_FOUND')) {
      return errorResponse(
        `Record ${(await params).recordId} not found in table ${(await params).table}`,
        404
      );
    }
    
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to delete record',
      500
    );
  }
}


