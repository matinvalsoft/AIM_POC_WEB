import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { TABLE_NAMES, FILE_STATUS } from '@/lib/airtable/schema-types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Get BASE_ID from environment variables
 */
function getBaseId(): string {
  const baseId = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID || process.env.AIRTABLE_BASE_ID;
  if (!baseId) {
    throw new Error('Airtable BASE_ID is not configured');
  }
  return baseId;
}

/**
 * Get base URL for API calls
 */
function getBaseUrl(): string {
  return process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}`
    : (process.env.NEXTAUTH_URL || 'http://localhost:3000');
}

// Define the schema for structured output
const invoiceSchema = {
  type: "object",
  properties: {
    "Invoice-Number": {
      type: ["string", "null"],
      description: "Invoice number identifier"
    },
    "Vendor-Name": {
      type: ["string", "null"],
      description: "Name of the vendor"
    },
    "Amount": {
      type: ["number", "null"],
      description: "Total Invoice amount in dollars"
    },
    "Date": {
      type: ["string", "null"],
      description: "Invoice date in ISO format"
    },
    "Freight-Charge": {
      type: ["number", "null"],
      description: "Freight charges in dollars"
    },
    "Surcharge": {
      type: ["number", "null"],
      description: "Additional surcharges in dollars"
    },
    "Misc-Charge": {
      type: ["number", "null"],
      description: "Miscellaneous charges in dollars"
    },
    "Discount-Amount": {
      type: ["number", "null"],
      description: "Discount amount in dollars"
    },
    "Discount-Date": {
      type: ["string", "null"],
      description: "Date for discount eligibility in ISO format"
    }
  },
  required: [
    "Invoice-Number",
    "Vendor-Name",
    "Amount",
    "Date",
    "Freight-Charge",
    "Surcharge",
    "Misc-Charge",
    "Discount-Amount",
    "Discount-Date"
  ],
  additionalProperties: false
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { recordID, rawText } = body;

    if (!recordID || !rawText) {
      return NextResponse.json(
        { error: 'Missing recordID or rawText' },
        { status: 400 }
      );
    }

    console.log(`[parser3] Processing File recordID: ${recordID}`);

    // Step 1: Call OpenAI with structured output
    console.log(`[parser3] Calling OpenAI to parse invoice...`);
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-2024-08-06",
      messages: [
        {
          role: "user",
          content: `This is an invoice. Please parse this according to the JSON schema, respond in JSON:\n\n${rawText}`
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "invoice_parser",
          strict: true,
          schema: invoiceSchema
        }
      }
    });

    const parsedData = JSON.parse(completion.choices[0].message.content || '{}');
    console.log(`[parser3] Successfully parsed invoice data`);

    // Step 2: Create Invoice record in Airtable
    console.log(`[parser3] Creating Invoice record in Airtable...`);
    const invoiceFields: Record<string, any> = {
      'Files': [recordID], // Link to the File record
    };

    // Only add fields if they have non-null values
    if (parsedData['Invoice-Number']) {
      invoiceFields['Invoice-Number'] = parsedData['Invoice-Number'];
    }
    if (parsedData['Vendor-Name']) {
      invoiceFields['Vendor-Name'] = parsedData['Vendor-Name'];
    }
    if (parsedData['Amount'] !== null && parsedData['Amount'] !== undefined) {
      invoiceFields['Amount'] = parsedData['Amount'];
    }
    if (parsedData['Date']) {
      invoiceFields['Date'] = parsedData['Date'];
    }
    if (parsedData['Freight-Charge'] !== null && parsedData['Freight-Charge'] !== undefined) {
      invoiceFields['Freight-Charge'] = parsedData['Freight-Charge'];
    }
    if (parsedData['Surcharge'] !== null && parsedData['Surcharge'] !== undefined) {
      invoiceFields['Surcharge'] = parsedData['Surcharge'];
    }
    if (parsedData['Misc-Charge'] !== null && parsedData['Misc-Charge'] !== undefined) {
      invoiceFields['Misc-Charge'] = parsedData['Misc-Charge'];
    }
    if (parsedData['Discount-Amount'] !== null && parsedData['Discount-Amount'] !== undefined) {
      invoiceFields['Discount-Amount'] = parsedData['Discount-Amount'];
    }
    if (parsedData['Discount-Date']) {
      invoiceFields['Discount-Date'] = parsedData['Discount-Date'];
    }

    // Set default status to 'Pending'
    invoiceFields['Status'] = 'Pending';

    const BASE_ID = getBaseId();
    const baseUrl = getBaseUrl();
    const createInvoiceUrl = `${baseUrl}/api/airtable/${TABLE_NAMES.INVOICES}?baseId=${BASE_ID}`;

    const createInvoiceResponse = await fetch(createInvoiceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields: invoiceFields }),
    });

    if (!createInvoiceResponse.ok) {
      const errorText = await createInvoiceResponse.text();
      throw new Error(`Failed to create Invoice record: ${createInvoiceResponse.status} - ${errorText}`);
    }

    const invoiceData = await createInvoiceResponse.json();
    const invoiceRecordId = invoiceData.records?.[0]?.id || invoiceData.id;
    console.log(`[parser3] ✅ Created Invoice record: ${invoiceRecordId}`);

    // Step 3: Update File record status to "Processed"
    console.log(`[parser3] Updating File record status to "Processed"...`);
    const updateFileUrl = `${baseUrl}/api/airtable/${TABLE_NAMES.FILES}?baseId=${BASE_ID}`;

    const updateFileResponse = await fetch(updateFileUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        records: [{
          id: recordID,
          fields: {
            'Status': FILE_STATUS.PROCESSED,
          }
        }]
      }),
    });

    if (!updateFileResponse.ok) {
      const errorText = await updateFileResponse.text();
      console.error(`[parser3] ⚠️ Failed to update File status: ${updateFileResponse.status} - ${errorText}`);
      // Don't fail the whole request if status update fails
    } else {
      console.log(`[parser3] ✅ Updated File status to "Processed"`);
    }

    return NextResponse.json({
      success: true,
      fileRecordId: recordID,
      invoiceRecordId,
      parsedData,
    });

  } catch (error: any) {
    console.error('[parser3] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to parse invoice',
        details: error.message 
      },
      { status: 500 }
    );
  }
}


