import type { Invoice, DeliveryTicket, DocumentLine, DocumentStatus } from '@/types/documents';
import type { AirtableRecord } from './types';
import { FIELD_IDS, TABLE_NAMES } from './schema-types';

// Field mapping constants (using schema field names for compatibility)
export const INVOICE_FIELDS = {
  INVOICE_NUMBER: 'Invoice Number',
  STATUS: 'Status',
  CREATED_AT: 'Created At',
  UPDATED_AT: 'Updated At',
  VENDOR_NAME: 'Vendor Name',
  VENDOR_CODE: 'Vendor Code',
  INVOICE_DATE: 'Date',
  AMOUNT: 'Amount',
  GL_ACCOUNT: 'GL Account',
  DOCUMENT_RAW_TEXT: 'Document Raw Text',
  REJECTION_CODE: 'Rejection Code',
  REJECTION_REASON: 'Rejection Reason',
  FILES: 'Files',
  ATTACHMENTS: 'Attachments',
  TEAM: 'Team',
  MISSING_FIELDS: 'Missing Fields', // Server-side validation field
  FILE_RAW_TEXT: 'File Raw Text' // Lookup field
} as const;

export const DELIVERY_TICKET_FIELDS = {
  DELIVERY_TICKET_ID: 'Delivery Ticket ID',
  INVOICE_NUMBER: 'Invoice Number',
  STATUS: 'Status',
  CREATED_AT: 'Created At',
  UPDATED_AT: 'Updated At',
  VENDOR_NAME: 'Vendor Name',
  VENDOR_CODE: 'Vendor Code',
  INVOICE_DATE: 'Date',
  AMOUNT: 'Amount',
  GL_ACCOUNT: 'GL Account',
  RAW_TEXT_OCR: 'Raw Text OCR',
  REJECTION_CODE: 'Rejection Code',
  REJECTION_REASON: 'Rejection Reason',
  FILES: 'Files',
  ATTACHMENTS: 'Attachments',
  TEAM: 'Team',
  HAS_MISSING_FIELDS: 'Has Missing Fields', // Server-side validation field
  FILE_RAW_TEXT: 'File Raw Text' // Lookup field
} as const;

// Export table names from schema
export { TABLE_NAMES };

/**
 * Transform Airtable invoice record to Invoice
 */
export function transformAirtableToInvoice(record: AirtableRecord): Invoice {
  const fields = record.fields;

  // Parse dates
  const parseDate = (dateString: string | undefined) => {
    return dateString ? new Date(dateString) : undefined;
  };

  // Map status from Airtable to our DocumentStatus type
  const mapStatus = (airtableStatus: string): DocumentStatus => {
    const statusMap: Record<string, DocumentStatus> = {
      'new': 'open',  // Map 'new' to 'open'
      'open': 'open',
      'reviewed': 'reviewed',
      'pending': 'pending',
      'approved': 'approved',
      'rejected': 'rejected',
      'exported': 'exported'
    };
    return statusMap[airtableStatus] || 'open';
  };

  // Read server-side validation from Airtable (formula field)
  const missingFieldsMessage = fields[INVOICE_FIELDS.MISSING_FIELDS] || '';

  return {
    id: record.id,
    type: 'invoices',
    status: mapStatus(fields[INVOICE_FIELDS.STATUS] || 'open'),
    missingFields: [], // Deprecated - kept for compatibility
    missingFieldsMessage, // Server-side validation message
    invoiceNumber: fields[INVOICE_FIELDS.INVOICE_NUMBER] || '',
    vendorName: fields[INVOICE_FIELDS.VENDOR_NAME] || '',
    vendorCode: fields[INVOICE_FIELDS.VENDOR_CODE] || '',
    amount: fields[INVOICE_FIELDS.AMOUNT] || 0,
    invoiceDate: parseDate(fields[INVOICE_FIELDS.INVOICE_DATE]) || new Date(),
    glAccount: fields[INVOICE_FIELDS.GL_ACCOUNT] || '',
    rawTextOcr: fields[INVOICE_FIELDS.DOCUMENT_RAW_TEXT] || '',
    rejectionCode: fields[INVOICE_FIELDS.REJECTION_CODE] || '',
    rejectionReason: fields[INVOICE_FIELDS.REJECTION_REASON] || '',
    team: fields[INVOICE_FIELDS.TEAM] || [],
    linkedIds: [],
    
    // Attachments from Files table
    attachments: fields[INVOICE_FIELDS.ATTACHMENTS] || [],
    files: fields[INVOICE_FIELDS.FILES] || [],
    
    // Additional computed fields
    createdAt: parseDate(fields[INVOICE_FIELDS.CREATED_AT]) || new Date(),
    updatedAt: parseDate(fields[INVOICE_FIELDS.UPDATED_AT]) || new Date()
  };
}

/**
 * Transform Invoice to Airtable record format
 */
export function transformInvoiceToAirtable(invoice: Partial<Invoice>): Record<string, any> {
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

  // Coding fields
  if (invoice.glAccount) fields[INVOICE_FIELDS.GL_ACCOUNT] = invoice.glAccount;

  // Text fields
  if (invoice.rawTextOcr) fields[INVOICE_FIELDS.DOCUMENT_RAW_TEXT] = invoice.rawTextOcr;
  if (invoice.rejectionCode) fields[INVOICE_FIELDS.REJECTION_CODE] = invoice.rejectionCode;
  if (invoice.rejectionReason) fields[INVOICE_FIELDS.REJECTION_REASON] = invoice.rejectionReason;

  // Team field (array of team IDs)
  if (invoice.team && invoice.team.length > 0) {
    fields[INVOICE_FIELDS.TEAM] = invoice.team;
  }

  return fields;
}

/**
 * Transform Airtable delivery ticket record to DeliveryTicket
 */
export function transformAirtableToDeliveryTicket(record: AirtableRecord): DeliveryTicket {
  const fields = record.fields;
  
  // Parse dates
  const parseDate = (dateString: string | undefined) => {
    return dateString ? new Date(dateString) : undefined;
  };

  // Map status from Airtable to our DocumentStatus type
  const mapStatus = (airtableStatus: string): DocumentStatus => {
    const statusMap: Record<string, DocumentStatus> = {
      'new': 'open',  // Map 'new' to 'open'
      'open': 'open',
      'reviewed': 'reviewed',
      'pending': 'pending',
      'approved': 'approved',
      'rejected': 'rejected',
      'exported': 'exported'
    };
    return statusMap[airtableStatus] || 'open';
  };

  // Read server-side validation from Airtable (formula field)
  const missingFieldsMessage = fields[DELIVERY_TICKET_FIELDS.MISSING_FIELDS] || '';

  return {
    id: record.id,
    type: 'delivery-tickets',
    status: mapStatus(fields[DELIVERY_TICKET_FIELDS.STATUS] || 'open'),
    missingFields: [], // Deprecated - kept for compatibility
    missingFieldsMessage, // Server-side validation message
    invoiceNumber: fields[DELIVERY_TICKET_FIELDS.INVOICE_NUMBER] || '',
    vendorName: fields[DELIVERY_TICKET_FIELDS.VENDOR_NAME] || '',
    vendorCode: fields[DELIVERY_TICKET_FIELDS.VENDOR_CODE] || '',
    amount: fields[DELIVERY_TICKET_FIELDS.AMOUNT] || 0,
    invoiceDate: parseDate(fields[DELIVERY_TICKET_FIELDS.INVOICE_DATE]) || new Date(),
    dueDate: parseDate(fields[DELIVERY_TICKET_FIELDS.DUE_DATE]),
    isMultilineCoding: false, // Delivery tickets don't have multiline coding for now
    erpAttribute1: fields[DELIVERY_TICKET_FIELDS.ERP_ATTRIBUTE_1] || '',
    erpAttribute2: fields[DELIVERY_TICKET_FIELDS.ERP_ATTRIBUTE_2] || '',
    erpAttribute3: fields[DELIVERY_TICKET_FIELDS.ERP_ATTRIBUTE_3] || '',
    glAccount: fields[DELIVERY_TICKET_FIELDS.GL_ACCOUNT] || '',
    rawTextOcr: fields[DELIVERY_TICKET_FIELDS.RAW_TEXT_OCR] || '',
    rejectionCode: fields[DELIVERY_TICKET_FIELDS.REJECTION_CODE] || '',
    rejectionReason: fields[DELIVERY_TICKET_FIELDS.REJECTION_REASON] || '',
    team: fields[DELIVERY_TICKET_FIELDS.TEAM] || [],
    linkedIds: [], // Initialize as empty array for now
    
    // New schema fields
    attachments: fields[DELIVERY_TICKET_FIELDS.ATTACHMENTS] || [],
    files: fields[DELIVERY_TICKET_FIELDS.FILES] || [],
    emails: fields[DELIVERY_TICKET_FIELDS.EMAILS] || [],
    
    // Additional computed fields
    createdAt: parseDate(fields[DELIVERY_TICKET_FIELDS.CREATED_AT]) || new Date(),
    updatedAt: parseDate(fields[DELIVERY_TICKET_FIELDS.UPDATED_AT]) || new Date()
  };
}

/**
 * Transform DeliveryTicket to Airtable record format
 */
export function transformDeliveryTicketToAirtable(ticket: Partial<DeliveryTicket>): Record<string, any> {
  const fields: Record<string, any> = {};

  // Basic fields
  if (ticket.invoiceNumber) fields[DELIVERY_TICKET_FIELDS.INVOICE_NUMBER] = ticket.invoiceNumber;
  if (ticket.vendorName) fields[DELIVERY_TICKET_FIELDS.VENDOR_NAME] = ticket.vendorName;
  if (ticket.vendorCode) fields[DELIVERY_TICKET_FIELDS.VENDOR_CODE] = ticket.vendorCode;
  if (ticket.amount !== undefined) fields[DELIVERY_TICKET_FIELDS.AMOUNT] = ticket.amount;
  if (ticket.status) fields[DELIVERY_TICKET_FIELDS.STATUS] = ticket.status;

  // Dates
  if (ticket.invoiceDate) {
    fields[DELIVERY_TICKET_FIELDS.INVOICE_DATE] = ticket.invoiceDate.toISOString().split('T')[0];
  }
  if (ticket.dueDate) {
    fields[DELIVERY_TICKET_FIELDS.DUE_DATE] = ticket.dueDate.toISOString().split('T')[0];
  }

  // Coding fields
  if (ticket.erpAttribute1) fields[DELIVERY_TICKET_FIELDS.ERP_ATTRIBUTE_1] = ticket.erpAttribute1;
  if (ticket.erpAttribute2) fields[DELIVERY_TICKET_FIELDS.ERP_ATTRIBUTE_2] = ticket.erpAttribute2;
  if (ticket.erpAttribute3) fields[DELIVERY_TICKET_FIELDS.ERP_ATTRIBUTE_3] = ticket.erpAttribute3;
  if (ticket.glAccount) fields[DELIVERY_TICKET_FIELDS.GL_ACCOUNT] = ticket.glAccount;

  // Text fields
  if (ticket.rawTextOcr) fields[DELIVERY_TICKET_FIELDS.RAW_TEXT_OCR] = ticket.rawTextOcr;
  if (ticket.rejectionCode) fields[DELIVERY_TICKET_FIELDS.REJECTION_CODE] = ticket.rejectionCode;
  if (ticket.rejectionReason) fields[DELIVERY_TICKET_FIELDS.REJECTION_REASON] = ticket.rejectionReason;

  // Team field (array of team IDs)
  if (ticket.team && ticket.team.length > 0) {
    fields[DELIVERY_TICKET_FIELDS.TEAM] = ticket.team;
  }

  return fields;
}