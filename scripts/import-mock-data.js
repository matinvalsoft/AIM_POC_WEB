#!/usr/bin/env node

/**
 * Import Mock Data to Airtable
 * Transforms mock data and creates records in Airtable using the integration
 */

const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Mock data (extracted from your mock-data.ts)
const mockInvoices = [
  {
    id: "inv-2025-0001",
    status: 'pending',
    vendorName: "Freelance Cover Artist LLC",
    vendorCode: "FCA001",
    invoiceNumber: "FCA-240815",
    invoiceDate: new Date("2025-08-15T00:00:00Z"),
    dueDate: new Date("2025-09-14T00:00:00Z"),
    amount: 1200,
    isMultilineCoding: false,
    project: "9780316450001",
    task: "ART-PHOTO",
    costCenter: "ADULT-TRADE",
    glAccount: "610200",
    rawTextOcr: "INVOICE\nInvoice #: FCA-240815\nDate: 08/15/2025\nFrom: Freelance Cover Artist LLC\nCover art – The Glass Garden\nAmount: $1,200.00",
    lines: [
      {
        description: "Cover art – The Glass Garden",
        amount: 1200,
        lineNumber: 1
      }
    ]
  },
  {
    id: "inv-2025-0002",
    status: 'approved',
    vendorName: "Proofread Pros, Inc.",
    vendorCode: "PPI014",
    invoiceNumber: "PPI-INV-5831",
    invoiceDate: new Date("2025-08-14T00:00:00Z"),
    dueDate: new Date("2025-09-13T00:00:00Z"),
    amount: 1350,
    isMultilineCoding: true,
    task: "EDT-PROOF",
    costCenter: "ADULT-TRADE-EDIT",
    glAccount: "610300",
    rawTextOcr: "INVOICE\nInvoice #: PPI-INV-5831\nDate: 08/14/2025\nFrom: Proofread Pros, Inc.\nProofreading services\nTotal Amount: $1,350.00",
    lines: [
      {
        description: "Proofreading – Title A",
        amount: 450,
        lineNumber: 1,
        project: "9781668001234"
      },
      {
        description: "Proofreading – Title B",
        amount: 375,
        lineNumber: 2,
        project: "9781982150002"
      },
      {
        description: "Proofreading – Title C",
        amount: 525,
        lineNumber: 3,
        project: "9781476790009"
      }
    ]
  },
  {
    id: "inv-2025-0003",
    status: 'exported',
    vendorName: "BrightSpark Marketing",
    vendorCode: "BSM220",
    invoiceNumber: "BSM-2025-082",
    invoiceDate: new Date("2025-08-10T00:00:00Z"),
    dueDate: new Date("2025-09-09T00:00:00Z"),
    amount: 7500,
    isMultilineCoding: false,
    project: "9781534460005",
    task: "MKT-CAMPAIGN",
    costCenter: "CHILDRENS-MKTG",
    glAccount: "620150",
    rawTextOcr: "INVOICE\nInvoice #: BSM-2025-082\nDate: 08/10/2025\nFrom: BrightSpark Marketing\nSpring Launch – Social & Display\nAmount: $7,500.00",
    lines: [
      {
        description: "Spring Launch – Social & Display",
        amount: 7500,
        lineNumber: 1
      }
    ]
  },
  {
    id: "inv-2025-0004",
    status: 'new',
    vendorName: "Office Supplies Co",
    vendorCode: "OSC310",
    invoiceNumber: "OSC-INV-8872",
    invoiceDate: new Date("2025-08-16T00:00:00Z"),
    dueDate: new Date("2025-09-15T00:00:00Z"),
    amount: 490,
    isMultilineCoding: false,
    rawTextOcr: "INVOICE\nInvoice #: OSC-INV-8872\nDate: 08/16/2025\nFrom: Office Supplies Co\nAmount: $490.00",
    lines: [
      {
        description: "Printer paper and toner cartridges",
        amount: 490,
        lineNumber: 1
      }
    ]
  },
  {
    id: "inv-2025-0005",
    status: 'rejected',
    vendorName: "Marketing Agency",
    vendorCode: "MKT003",
    invoiceNumber: "MKT-2025-444",
    invoiceDate: new Date("2025-08-13T00:00:00Z"),
    dueDate: new Date("2025-09-12T00:00:00Z"),
    amount: 3200,
    isMultilineCoding: false,
    project: "9780593500002",
    task: "MKT-PR",
    costCenter: "ADULT-MKTG",
    glAccount: "620300",
    rejectionReason: "Invoice amount exceeds approved budget for this project. Please provide additional authorization or reduce the amount.",
    rawTextOcr: "INVOICE\nInvoice #: MKT-2025-444\nDate: 08/13/2025\nFrom: Marketing Agency\nMarketing services\nAmount: $3,200.00",
    lines: [
      {
        description: "Press outreach campaign – Adult History title",
        amount: 3200,
        lineNumber: 1
      }
    ]
  },
  {
    id: "inv-2025-0006",
    status: 'approved',
    vendorName: "Freelance Photographer Jane Doe",
    vendorCode: "FPH007",
    invoiceNumber: "JD-INV-778",
    invoiceDate: new Date("2025-08-08T00:00:00Z"),
    dueDate: new Date("2025-09-07T00:00:00Z"),
    amount: 2100,
    isMultilineCoding: true,
    task: "ART-PHOTO",
    costCenter: "CHILDRENS-ILLUSTRATION",
    glAccount: "610250",
    rawTextOcr: "INVOICE\nInvoice #: JD-INV-778\nDate: 08/08/2025\nFrom: Freelance Photographer Jane Doe\nPhoto services\nTotal Amount: $2,100.00",
    lines: [
      {
        description: "Photo shoot – Children's Book A",
        amount: 900,
        lineNumber: 1,
        project: "9781250200007",
        task: "ART-PHOTO",
        costCenter: "CHILDRENS-ILLUSTRATION",
        glAccount: "610250"
      },
      {
        description: "Photo shoot – Children's Book B",
        amount: 1200,
        lineNumber: 2,
        project: "9780061120004",
        task: "ART-PHOTO",
        costCenter: "CHILDRENS-ILLUSTRATION",
        glAccount: "610250"
      }
    ]
  },
  {
    id: "inv-2025-0007",
    status: 'edited',
    vendorName: "Test Multi-line Vendor",
    vendorCode: "TML001",
    invoiceNumber: "TML-001",
    invoiceDate: new Date("2025-08-18T00:00:00Z"),
    dueDate: new Date("2025-09-17T00:00:00Z"),
    amount: 1000, // Intentional mismatch - line total is 1100
    isMultilineCoding: false,
    rawTextOcr: "INVOICE\nInvoice #: TML-001\nDate: 08/18/2025\nFrom: Test Multi-line Vendor\nServices\nAmount: $1,000.00",
    lines: [
      {
        description: "Service A",
        amount: 600,
        lineNumber: 1
      },
      {
        description: "Service B",
        amount: 500,
        lineNumber: 2
      }
    ]
  }
];

/**
 * Create Airtable client
 */
function createAirtableClient() {
  const pat = process.env.AIRTABLE_PAT;
  const baseId = process.env.AIRTABLE_BASE_ID;
  
  if (!pat) {
    throw new Error('AIRTABLE_PAT environment variable is required');
  }
  
  if (!baseId) {
    throw new Error('AIRTABLE_BASE_ID environment variable is required');
  }
  
  return { pat, baseId };
}

/**
 * Make HTTP request to Airtable API
 */
async function makeAirtableRequest(url, options = {}) {
  const { pat } = createAirtableClient();
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${pat}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`HTTP ${response.status}: ${errorData.error?.message || response.statusText}`);
  }

  return response.json();
}

/**
 * Transform mock invoice to Airtable format
 */
function transformInvoiceForAirtable(mockInvoice) {
  const airtableRecord = {
    fields: {
      'Invoice Number': mockInvoice.invoiceNumber,
      'Status': mockInvoice.status,
      'Vendor Name': mockInvoice.vendorName,
      'Vendor Code': mockInvoice.vendorCode,
      'Date': mockInvoice.invoiceDate.toISOString().split('T')[0], // YYYY-MM-DD format
      'Due Date': mockInvoice.dueDate.toISOString().split('T')[0],
      'Amount': mockInvoice.amount,
      'Is Multiline Coding': mockInvoice.isMultilineCoding,
      'Raw Text OCR': mockInvoice.rawTextOcr,
    }
  };

  // Add optional fields only if they exist
  if (mockInvoice.project) airtableRecord.fields.Project = mockInvoice.project;
  if (mockInvoice.task) airtableRecord.fields.Task = mockInvoice.task;
  if (mockInvoice.costCenter) airtableRecord.fields['Cost Center'] = mockInvoice.costCenter;
  if (mockInvoice.glAccount) airtableRecord.fields['GL Account'] = mockInvoice.glAccount;
  if (mockInvoice.rejectionReason) airtableRecord.fields['Rejection Reason'] = mockInvoice.rejectionReason;

  return airtableRecord;
}

/**
 * Transform mock line to Airtable format
 */
function transformLineForAirtable(mockLine, invoiceRecordId) {
  const airtableRecord = {
    fields: {
      'Invoice': [invoiceRecordId], // Link to parent invoice
      'Line Number': mockLine.lineNumber,
      'Description': mockLine.description,
      'Amount': mockLine.amount,
    }
  };

  // Add optional fields only if they exist
  if (mockLine.project) airtableRecord.fields.Project = mockLine.project;
  if (mockLine.task) airtableRecord.fields.Task = mockLine.task;
  if (mockLine.costCenter) airtableRecord.fields['Cost Center'] = mockLine.costCenter;
  if (mockLine.glAccount) airtableRecord.fields['GL Account'] = mockLine.glAccount;

  return airtableRecord;
}

/**
 * Create activity record
 */
function createActivityRecord(invoiceRecordId, activityType, description) {
  return {
    fields: {
      'Activity Type': activityType,
      'Description': description,
      'Performed By': 'System Import',
      'System Generated': true,
      'Document (Invoice)': [invoiceRecordId]
    }
  };
}

/**
 * Import all mock data to Airtable
 */
async function importMockData() {
  console.log('🚀 Starting Mock Data Import to Airtable');
  console.log('=============================================\n');

  const { baseId } = createAirtableClient();
  const invoicesUrl = `https://api.airtable.com/v0/${baseId}/Invoices`;
  const linesUrl = `https://api.airtable.com/v0/${baseId}/Invoice%20Lines`;
  const activitiesUrl = `https://api.airtable.com/v0/${baseId}/Activities`;

  const results = {
    invoices: [],
    lines: [],
    activities: [],
    errors: []
  };

  for (const [index, mockInvoice] of mockInvoices.entries()) {
    try {
      console.log(`📄 Processing Invoice ${index + 1}/7: ${mockInvoice.invoiceNumber}`);
      
      // 1. Create invoice record
      const invoiceRecord = transformInvoiceForAirtable(mockInvoice);
      console.log(`   Creating invoice: ${mockInvoice.vendorName} - $${mockInvoice.amount}`);
      
      const invoiceResponse = await makeAirtableRequest(invoicesUrl, {
        method: 'POST',
        body: JSON.stringify(invoiceRecord),
      });
      
      const createdInvoiceId = invoiceResponse.id;
      results.invoices.push(invoiceResponse);
      console.log(`   ✅ Invoice created with ID: ${createdInvoiceId}`);

      // 2. Create line items
      console.log(`   Creating ${mockInvoice.lines.length} line item(s)...`);
      for (const line of mockInvoice.lines) {
        const lineRecord = transformLineForAirtable(line, createdInvoiceId);
        
        const lineResponse = await makeAirtableRequest(linesUrl, {
          method: 'POST',
          body: JSON.stringify(lineRecord),
        });
        
        results.lines.push(lineResponse);
        console.log(`     ✅ Line ${line.lineNumber}: ${line.description} - $${line.amount}`);
      }

      // 3. Create activity record
      const activityRecord = createActivityRecord(
        createdInvoiceId, 
        'created', 
        `Invoice imported from mock data - Status: ${mockInvoice.status}`
      );
      
      const activityResponse = await makeAirtableRequest(activitiesUrl, {
        method: 'POST',
        body: JSON.stringify(activityRecord),
      });
      
      results.activities.push(activityResponse);
      console.log(`     ✅ Activity log created`);

      // Add a small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 300));
      console.log('');

    } catch (error) {
      console.error(`❌ Error processing ${mockInvoice.invoiceNumber}:`, error.message);
      results.errors.push({
        invoice: mockInvoice.invoiceNumber,
        error: error.message
      });
    }
  }

  // Summary
  console.log('📊 Import Summary:');
  console.log('==================');
  console.log(`✅ Invoices created: ${results.invoices.length}`);
  console.log(`✅ Lines created: ${results.lines.length}`);
  console.log(`✅ Activities created: ${results.activities.length}`);
  
  if (results.errors.length > 0) {
    console.log(`❌ Errors: ${results.errors.length}`);
    results.errors.forEach(err => {
      console.log(`   - ${err.invoice}: ${err.error}`);
    });
  }

  console.log('\n🎉 Mock data import completed!');
  console.log('\n🔗 Check your Airtable base to see the imported records:');
  console.log(`   https://airtable.com/${baseId}`);

  return results;
}

// Run the import
if (require.main === module) {
  importMockData().catch(console.error);
}

module.exports = { importMockData };
