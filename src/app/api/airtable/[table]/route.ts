/**
 * Next.js Route Handlers for Airtable CRUD operations
 * Supports GET (list), POST (create), PATCH (update), DELETE operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAirtableClient } from '@/lib/airtable/client';
import { buildFilter } from '@/lib/airtable/formula';
import type {
  AirtableListParams,
  AirtableCreateParams,
  AirtableUpdateParams,
  AirtableDeleteParams,
} from '@/lib/airtable/types';

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
 * Parse query parameters for list operation
 */
function parseListParams(searchParams: URLSearchParams): AirtableListParams {
  const params: AirtableListParams = {};

  // Basic parameters
  if (searchParams.has('view')) {
    params.view = searchParams.get('view')!;
  }
  
  if (searchParams.has('pageSize')) {
    const pageSize = parseInt(searchParams.get('pageSize')!);
    params.pageSize = Math.min(Math.max(pageSize, 1), 100); // Clamp between 1-100
  }
  
  if (searchParams.has('offset')) {
    params.offset = searchParams.get('offset')!;
  }
  
  if (searchParams.has('maxRecords')) {
    params.maxRecords = parseInt(searchParams.get('maxRecords')!);
  }

  // Filter by formula
  if (searchParams.has('filter')) {
    params.filterByFormula = searchParams.get('filter')!;
  }

  // Fields selection
  const fields = searchParams.getAll('fields[]') || searchParams.getAll('fields');
  if (fields.length > 0) {
    params.fields = fields;
  }

  // Sort parameters
  const sortEntries = Array.from(searchParams.entries())
    .filter(([key]) => key.startsWith('sort[') && key.endsWith('][field]'))
    .map(([key, field]) => {
      const index = key.match(/sort\[(\d+)\]/)?.[1];
      const directionKey = `sort[${index}][direction]`;
      const direction = searchParams.get(directionKey) as 'asc' | 'desc' || 'asc';
      return { field, direction };
    });

  if (sortEntries.length > 0) {
    params.sort = sortEntries;
  }

  return params;
}

/**
 * GET /api/airtable/[table] - List records with pagination and filtering
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  try {
    const baseId = getBaseId(request);
    const client = createAirtableClient(baseId);
    const resolvedParams = await params;
    const table = decodeURIComponent(resolvedParams.table);
    
    const listParams = parseListParams(request.nextUrl.searchParams);
    
    const response = await client.listRecords(table, listParams);
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Airtable GET error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to fetch records',
      500
    );
  }
}

/**
 * POST /api/airtable/[table] - Create records (single or batch)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  try {
    const baseId = getBaseId(request);
    const client = createAirtableClient(baseId);
    const resolvedParams = await params;
    const table = decodeURIComponent(resolvedParams.table);
    
    const body = await request.json();
    
    // Support both single record and batch creation
    let createParams: AirtableCreateParams;
    
    if (body.fields) {
      // Single record: { fields: {...} }
      createParams = {
        records: [{ fields: body.fields }],
        typecast: body.typecast,
      };
    } else if (body.records) {
      // Batch creation: { records: [{ fields: {...} }, ...] }
      createParams = {
        records: body.records,
        typecast: body.typecast,
      };
    } else {
      return errorResponse('Request body must contain either "fields" or "records"');
    }
    
    const response = await client.createRecords(table, createParams);
    
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Airtable POST error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to create records',
      500
    );
  }
}

/**
 * PATCH /api/airtable/[table] - Update records (batch)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  try {
    const baseId = getBaseId(request);
    const client = createAirtableClient(baseId);
    const resolvedParams = await params;
    const table = decodeURIComponent(resolvedParams.table);
    
    const body = await request.json();
    
    if (!body.records || !Array.isArray(body.records)) {
      return errorResponse('Request body must contain "records" array with id and fields');
    }
    
    // Validate that all records have id and fields
    for (const record of body.records) {
      if (!record.id || !record.fields) {
        return errorResponse('Each record must have "id" and "fields" properties');
      }
    }
    
    const updateParams: AirtableUpdateParams = {
      records: body.records,
      typecast: body.typecast,
    };
    
    const response = await client.updateRecords(table, updateParams);
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Airtable PATCH error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to update records',
      500
    );
  }
}

/**
 * DELETE /api/airtable/[table] - Delete records by IDs
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  try {
    const baseId = getBaseId(request);
    const client = createAirtableClient(baseId);
    const resolvedParams = await params;
    const table = decodeURIComponent(resolvedParams.table);
    
    const body = await request.json();
    
    if (!body.ids || !Array.isArray(body.ids)) {
      return errorResponse('Request body must contain "ids" array');
    }
    
    if (body.ids.length === 0) {
      return errorResponse('At least one record ID must be provided');
    }
    
    const deleteParams: AirtableDeleteParams = {
      records: body.ids,
    };
    
    const response = await client.deleteRecords(table, deleteParams);
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Airtable DELETE error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to delete records',
      500
    );
  }
}
