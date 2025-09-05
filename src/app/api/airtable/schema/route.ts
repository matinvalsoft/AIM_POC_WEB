/**
 * Airtable Schema API endpoint
 * Retrieves base and table metadata including field definitions
 */

import { NextRequest, NextResponse } from 'next/server';
import type { 
  AirtableBaseMetadataResponse,
  AirtableTableMetadataResponse 
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
 * Get PAT from environment
 */
function getPAT(): string {
  const pat = process.env.AIRTABLE_PAT;
  
  if (!pat) {
    throw new Error('Airtable Personal Access Token (PAT) is required. Set AIRTABLE_PAT environment variable.');
  }
  
  return pat;
}

/**
 * GET /api/airtable/schema - Get base schema with all tables and fields
 * 
 * Query Parameters:
 * - baseId: Airtable base ID (optional if set in env)
 * - table: Specific table name to get schema for (optional, returns all tables if not specified)
 * 
 * Examples:
 * - GET /api/airtable/schema?baseId=appXXXXXXXXXXXXXX
 * - GET /api/airtable/schema?table=Contacts
 */
export async function GET(request: NextRequest) {
  try {
    const baseId = getBaseId(request);
    const pat = getPAT();
    const specificTable = request.nextUrl.searchParams.get('table');
    
    console.log('Fetching Airtable schema:', { baseId, specificTable });
    
    // Get base metadata including all tables and their fields
    const url = `https://api.airtable.com/v0/meta/bases/${baseId}/tables`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${pat}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`HTTP ${response.status}: ${errorData.error?.message || response.statusText}`);
    }

    const data: AirtableBaseMetadataResponse = await response.json();
    
    // If specific table requested, filter to just that table
    if (specificTable) {
      const table = data.tables.find(t => 
        t.name === specificTable || 
        t.id === specificTable
      );
      
      if (!table) {
        return errorResponse(`Table "${specificTable}" not found in base ${baseId}`, 404);
      }
      
      const tableResponse: AirtableTableMetadataResponse = table;
      return NextResponse.json(tableResponse);
    }
    
    // Return all tables
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Airtable schema error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to fetch schema',
      500
    );
  }
}

/**
 * Helper function to get field type information
 */
export function getFieldTypeInfo(fieldType: string) {
  const typeMapping: Record<string, { 
    category: string; 
    description: string; 
    supportsOptions: boolean;
  }> = {
    'singleLineText': { 
      category: 'Text', 
      description: 'Single line of text', 
      supportsOptions: false 
    },
    'email': { 
      category: 'Text', 
      description: 'Email address with validation', 
      supportsOptions: false 
    },
    'url': { 
      category: 'Text', 
      description: 'Web URL with validation', 
      supportsOptions: false 
    },
    'multilineText': { 
      category: 'Text', 
      description: 'Multiple lines of text', 
      supportsOptions: false 
    },
    'number': { 
      category: 'Number', 
      description: 'Numeric value', 
      supportsOptions: true 
    },
    'percent': { 
      category: 'Number', 
      description: 'Percentage value', 
      supportsOptions: false 
    },
    'currency': { 
      category: 'Number', 
      description: 'Currency amount', 
      supportsOptions: true 
    },
    'singleSelect': { 
      category: 'Select', 
      description: 'Single choice from predefined options', 
      supportsOptions: true 
    },
    'multipleSelects': { 
      category: 'Select', 
      description: 'Multiple choices from predefined options', 
      supportsOptions: true 
    },
    'singleCollaborator': { 
      category: 'Collaborator', 
      description: 'Single collaborator', 
      supportsOptions: false 
    },
    'multipleCollaborators': { 
      category: 'Collaborator', 
      description: 'Multiple collaborators', 
      supportsOptions: false 
    },
    'multipleRecordLinks': { 
      category: 'Link', 
      description: 'Links to records in another table', 
      supportsOptions: true 
    },
    'date': { 
      category: 'Date', 
      description: 'Date only', 
      supportsOptions: true 
    },
    'dateTime': { 
      category: 'Date', 
      description: 'Date and time', 
      supportsOptions: true 
    },
    'phoneNumber': { 
      category: 'Text', 
      description: 'Phone number', 
      supportsOptions: false 
    },
    'multipleAttachments': { 
      category: 'Attachment', 
      description: 'File attachments', 
      supportsOptions: false 
    },
    'checkbox': { 
      category: 'Checkbox', 
      description: 'True/false checkbox', 
      supportsOptions: false 
    },
    'formula': { 
      category: 'Formula', 
      description: 'Computed formula field', 
      supportsOptions: true 
    },
    'createdTime': { 
      category: 'System', 
      description: 'Record creation timestamp', 
      supportsOptions: false 
    },
    'rollup': { 
      category: 'Rollup', 
      description: 'Aggregated values from linked records', 
      supportsOptions: true 
    },
    'count': { 
      category: 'Count', 
      description: 'Count of linked records', 
      supportsOptions: false 
    },
    'lookup': { 
      category: 'Lookup', 
      description: 'Values from linked records', 
      supportsOptions: true 
    },
    'autoNumber': { 
      category: 'Number', 
      description: 'Auto-incrementing number', 
      supportsOptions: false 
    },
    'barcode': { 
      category: 'Text', 
      description: 'Barcode scanner input', 
      supportsOptions: false 
    },
    'rating': { 
      category: 'Rating', 
      description: 'Star rating', 
      supportsOptions: true 
    },
    'richText': { 
      category: 'Text', 
      description: 'Rich text with formatting', 
      supportsOptions: false 
    },
    'duration': { 
      category: 'Number', 
      description: 'Time duration', 
      supportsOptions: true 
    },
    'lastModifiedTime': { 
      category: 'System', 
      description: 'Last modification timestamp', 
      supportsOptions: false 
    },
    'button': { 
      category: 'Action', 
      description: 'Action button', 
      supportsOptions: true 
    },
    'lastModifiedBy': { 
      category: 'System', 
      description: 'Last modifier collaborator', 
      supportsOptions: false 
    },
    'createdBy': { 
      category: 'System', 
      description: 'Creator collaborator', 
      supportsOptions: false 
    },
  };

  return typeMapping[fieldType] || { 
    category: 'Unknown', 
    description: `Unknown field type: ${fieldType}`, 
    supportsOptions: false 
  };
}
