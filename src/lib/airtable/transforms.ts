import type { Invoice, DocumentLine, DocumentStatus } from '@/types/documents';
import type { AirtableRecord } from './types';

// Field mapping constants
export const INVOICE_FIELDS = {
  INVOICE_NUMBER: 'Invoice Number',
  STATUS: 'Status',
  CREATED_AT: 'Created At',
  UPDATED_AT: 'Updated At',
  VENDOR_NAME: 'Vendor Name',
  VENDOR_CODE: 'Vendor Code',
  INVOICE_DATE: 'Invoice Date',
  DUE_DATE: 'Due Date',
  AMOUNT: 'Amount',
  IS_MULTILINE_CODING: 'Is Multiline Coding',
  PROJECT: 'Project',
  TASK: 'Task',
  COST_CENTER: 'Cost Center',
  GL_ACCOUNT: 'GL Account',
  RAW_TEXT_OCR: 'Raw Text OCR',
  REJECTION_REASON: 'Rejection Reason',
  DAYS_UNTIL_DUE: 'Days Until Due',
  ACTIVITIES: 'Activities',
  INVOICE_LINES: 'Invoice Lines',
  STORE_NUMBER: 'Store Number',
  FILES: 'Files',
  EMAILS: 'Emails',
  ATTACHMENTS: 'Attachments'
} as const;

export const INVOICE_LINE_FIELDS = {
  AUTO_NUMBER: 'Auto #',
  INVOICE: 'Invoice',
  LINE_NUMBER: 'Line Number',
  DESCRIPTION: 'Description',
  AMOUNT: 'Amount',
  PROJECT: 'Project',
  TASK: 'Task',
  COST_CENTER: 'Cost Center',
  GL_ACCOUNT: 'GL Account',
  CREATED_AT: 'Created At',
  UPDATED_AT: 'Updated At'
} as const;

/**
 * Transform Airtable invoice line record to DocumentLine
 */
export function transformAirtableToInvoiceLine(record: AirtableRecord): DocumentLine {
  const fields = record.fields;
  
  return {
    id: record.id,
    lineNumber: fields[INVOICE_LINE_FIELDS.LINE_NUMBER] || 0,
    description: fields[INVOICE_LINE_FIELDS.DESCRIPTION] || '',
    amount: fields[INVOICE_LINE_FIELDS.AMOUNT] || 0,
    project: fields[INVOICE_LINE_FIELDS.PROJECT] || '',
    task: fields[INVOICE_LINE_FIELDS.TASK] || '',
    costCenter: fields[INVOICE_LINE_FIELDS.COST_CENTER] || '',
    glAccount: fields[INVOICE_LINE_FIELDS.GL_ACCOUNT] || ''
  };
}

/**
 * Transform Airtable invoice record with lines to Invoice
 */
export function transformAirtableToInvoice(
  record: AirtableRecord, 
  lines: AirtableRecord[] = []
): Invoice {
  const fields = record.fields;
  
  // Transform invoice lines
  const transformedLines: DocumentLine[] = lines.map(lineRecord => 
    transformAirtableToInvoiceLine(lineRecord)
  );

  // Parse dates
  const parseDate = (dateString: string | undefined) => {
    return dateString ? new Date(dateString) : undefined;
  };

  // Map status from Airtable to our DocumentStatus type
  const mapStatus = (airtableStatus: string): DocumentStatus => {
    const statusMap: Record<string, DocumentStatus> = {
      'new': 'open',  // Map 'new' to 'open'
      'open': 'open',
      'pending': 'pending',
      'approved': 'approved',
      'rejected': 'rejected',
      'exported': 'exported'
    };
    return statusMap[airtableStatus] || 'open';
  };

  // Calculate missing fields
  const missingFields: string[] = [];
  if (!fields[INVOICE_FIELDS.PROJECT]) missingFields.push('project');
  if (!fields[INVOICE_FIELDS.TASK]) missingFields.push('task');
  if (!fields[INVOICE_FIELDS.COST_CENTER]) missingFields.push('costCenter');
  if (!fields[INVOICE_FIELDS.GL_ACCOUNT]) missingFields.push('glAccount');

  return {
    id: record.id,
    type: 'invoices',
    status: mapStatus(fields[INVOICE_FIELDS.STATUS] || 'open'),
    missingFields,
    invoiceNumber: fields[INVOICE_FIELDS.INVOICE_NUMBER] || '',
    vendorName: fields[INVOICE_FIELDS.VENDOR_NAME] || '',
    vendorCode: fields[INVOICE_FIELDS.VENDOR_CODE] || '',
    amount: fields[INVOICE_FIELDS.AMOUNT] || 0,
    invoiceDate: parseDate(fields[INVOICE_FIELDS.INVOICE_DATE]) || new Date(),
    dueDate: parseDate(fields[INVOICE_FIELDS.DUE_DATE]),
    project: fields[INVOICE_FIELDS.PROJECT] || '',
    task: fields[INVOICE_FIELDS.TASK] || '',
    costCenter: fields[INVOICE_FIELDS.COST_CENTER] || '',
    glAccount: fields[INVOICE_FIELDS.GL_ACCOUNT] || '',
    isMultilineCoding: fields[INVOICE_FIELDS.IS_MULTILINE_CODING] || false,
    rawTextOcr: fields[INVOICE_FIELDS.RAW_TEXT_OCR] || '',
    rejectionReason: fields[INVOICE_FIELDS.REJECTION_REASON] || '',
    lines: transformedLines,
    linkedIds: [], // Initialize as empty array for now
    
    // New schema fields
    attachments: fields[INVOICE_FIELDS.ATTACHMENTS] || [], // Email attachments from linked emails
    storeNumber: fields[INVOICE_FIELDS.STORE_NUMBER] || undefined,
    files: fields[INVOICE_FIELDS.FILES] || [],
    emails: fields[INVOICE_FIELDS.EMAILS] || [],
    
    // Additional computed fields
    createdAt: parseDate(fields[INVOICE_FIELDS.CREATED_AT]) || new Date(),
    updatedAt: parseDate(fields[INVOICE_FIELDS.UPDATED_AT]) || new Date()
  };
}

/**
 * Transform Invoice to Airtable record format
 */
export function transformInvoiceToAirtable(invoice: Invoice): Record<string, any> {
  const fields: Record<string, any> = {};

  // Basic fields
  if (invoice.invoiceNumber) fields[INVOICE_FIELDS.INVOICE_NUMBER] = invoice.invoiceNumber;
  if (invoice.vendorName) fields[INVOICE_FIELDS.VENDOR_NAME] = invoice.vendorName;
  if (invoice.vendorCode) fields[INVOICE_FIELDS.VENDOR_CODE] = invoice.vendorCode;
  if (invoice.amount !== undefined) fields[INVOICE_FIELDS.AMOUNT] = invoice.amount;
  if (invoice.status) fields[INVOICE_FIELDS.STATUS] = invoice.status;

  // Dates
  if (invoice.invoiceDate) {
    fields[INVOICE_FIELDS.INVOICE_DATE] = invoice.invoiceDate.toISOString().split('T')[0];
  }
  if (invoice.dueDate) {
    fields[INVOICE_FIELDS.DUE_DATE] = invoice.dueDate.toISOString().split('T')[0];
  }

  // Coding fields
  if (invoice.project) fields[INVOICE_FIELDS.PROJECT] = invoice.project;
  if (invoice.task) fields[INVOICE_FIELDS.TASK] = invoice.task;
  if (invoice.costCenter) fields[INVOICE_FIELDS.COST_CENTER] = invoice.costCenter;
  if (invoice.glAccount) fields[INVOICE_FIELDS.GL_ACCOUNT] = invoice.glAccount;

  // Boolean fields
  if (invoice.isMultilineCoding !== undefined) {
    fields[INVOICE_FIELDS.IS_MULTILINE_CODING] = invoice.isMultilineCoding;
  }

  // Text fields
  if (invoice.rawTextOcr) fields[INVOICE_FIELDS.RAW_TEXT_OCR] = invoice.rawTextOcr;
  if (invoice.rejectionReason) fields[INVOICE_FIELDS.REJECTION_REASON] = invoice.rejectionReason;

  return fields;
}

/**
 * Transform DocumentLine to Airtable record format
 */
export function transformInvoiceLineToAirtable(line: DocumentLine, invoiceId?: string): Record<string, any> {
  const fields: Record<string, any> = {};

  if (invoiceId) fields[INVOICE_LINE_FIELDS.INVOICE] = [invoiceId];
  if (line.lineNumber !== undefined) fields[INVOICE_LINE_FIELDS.LINE_NUMBER] = line.lineNumber;
  if (line.description) fields[INVOICE_LINE_FIELDS.DESCRIPTION] = line.description;
  if (line.amount !== undefined) fields[INVOICE_LINE_FIELDS.AMOUNT] = line.amount;
  if (line.project) fields[INVOICE_LINE_FIELDS.PROJECT] = line.project;
  if (line.task) fields[INVOICE_LINE_FIELDS.TASK] = line.task;
  if (line.costCenter) fields[INVOICE_LINE_FIELDS.COST_CENTER] = line.costCenter;
  if (line.glAccount) fields[INVOICE_LINE_FIELDS.GL_ACCOUNT] = line.glAccount;

  return fields;
}