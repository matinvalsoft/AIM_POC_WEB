import type { Invoice, DeliveryTicket, DocumentLine, DocumentStatus } from '@/types/documents';
import type { AirtableRecord } from './types';
import { FIELD_IDS, TABLE_NAMES } from './schema-types';

// Field mapping constants for Invoices table (primary entity)
export const INVOICE_ENTITY_FIELDS = {
  INVOICE_NUMBER: 'Invoice Number',
  STATUS: 'Status',
  CREATED_AT: 'Created At',
  UPDATED_AT: 'Modified At',
  VENDOR_NAME: 'Vendor Name',
  VEND_ID: 'VendId',
  DATE: 'Date',
  AMOUNT: 'Amount',
  FREIGHT_CHARGE: 'Freight Charge',
  SURCHARGE: 'Surcharge',
  POS: 'POs',
  DOCUMENT_RAW_TEXT: 'Document Raw Text',
  FILES: 'Files',
  PO_INVOICE_HEADERS: 'POInvoiceHeaders',
  MATCH_JSON_PAYLOAD: 'MatchJSONPayload',
  ERROR_CODE: 'Error Code',
  BALANCE: 'Balance',
  BALANCE_EXPLANATION: 'Balance Explanation',
  FILE_RAW_TEXT: 'File Raw Text', // Lookup field
  MISSING_FIELDS: 'Missing Fields', // Formula field
} as const;

// Field mapping constants for POInvoiceHeaders table
export const PO_INVOICE_HEADER_FIELDS = {
  INVOICE_NUMBER: 'AP-Invoice-Number',
  STATUS: 'Status',
  CREATED_AT: 'Created At',
  UPDATED_AT: 'Modified At',
  VENDOR_NAME: 'Vendor Name',
  VENDOR_ID: 'VendId',
  INVOICE_DATE: 'Invoice-Date',
  AMOUNT: 'Total-Invoice-Amount',
  DOCUMENT_RAW_TEXT: 'Document Raw Text',
  ERROR_CODE: 'ErrorCode',
  ERROR_REASON: 'Error Reason',
  FILES: 'Files',
  ATTACHMENTS: 'Attachments',
  MISSING_FIELDS: 'Missing Fields', // Server-side validation field (formula)
  FILE_RAW_TEXT: 'File Raw Text', // Lookup field
  INVOICE_DETAILS: 'Invoice Details', // Link to POInvoiceDetails table
  INVOICES: 'Invoices', // Link to Invoices table
  // Additional fields in POInvoiceHeaders
  COMPANY_CODE: 'Company-Code',
  TERMS_ID: 'TermsId',
  DUE_DATE: 'Due-Date',
  PO_NUMBER: 'PO-Number',
} as const;

// Legacy alias for backward compatibility
export const INVOICE_FIELDS = PO_INVOICE_HEADER_FIELDS;

// DEPRECATED: Delivery Tickets table no longer exists in new schema
// Kept for backward compatibility during migration
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
 * Transform Airtable Invoice entity record to Invoice
 * This is the NEW transform for the Invoices table (primary entity)
 */
export function transformAirtableToInvoiceEntity(record: AirtableRecord): Invoice {
  const fields = record.fields;

  // Parse dates
  const parseDate = (dateString: string | undefined) => {
    return dateString ? new Date(dateString) : undefined;
  };

  // Map status from Airtable to our DocumentStatus type
  const mapStatus = (airtableStatus: string): DocumentStatus => {
    const statusMap: Record<string, DocumentStatus> = {
      'Pending': 'pending',
      'Matched': 'open',      // Editable state
      'Queued': 'pending',
      'Exported': 'exported',
      'Error': 'rejected',
      // Legacy mappings
      'pending': 'pending',
      'open': 'open',
      'reviewed': 'reviewed',
      'approved': 'approved',
      'rejected': 'rejected',
      'exported': 'exported'
    };
    return statusMap[airtableStatus] || 'pending';
  };

  // Read server-side validation from Airtable (formula field)
  const missingFieldsMessage = fields[INVOICE_ENTITY_FIELDS.MISSING_FIELDS] || '';

  return {
    id: record.id,
    type: 'invoices',
    status: mapStatus(fields[INVOICE_ENTITY_FIELDS.STATUS] || 'Pending'),
    missingFields: [], // Deprecated - kept for compatibility
    missingFieldsMessage, // Server-side validation message
    invoiceNumber: fields[INVOICE_ENTITY_FIELDS.INVOICE_NUMBER] || '',
    vendorName: fields[INVOICE_ENTITY_FIELDS.VENDOR_NAME] || '',
    vendorCode: fields[INVOICE_ENTITY_FIELDS.VEND_ID] || '',
    amount: fields[INVOICE_ENTITY_FIELDS.AMOUNT] || 0,
    invoiceDate: parseDate(fields[INVOICE_ENTITY_FIELDS.DATE]) || new Date(),
    glAccount: '', // GL Account is in POInvoiceDetails (line items)
    rawTextOcr: fields[INVOICE_ENTITY_FIELDS.DOCUMENT_RAW_TEXT] || '',
    rejectionCode: fields[INVOICE_ENTITY_FIELDS.ERROR_CODE] || '',
    rejectionReason: '', // Not in Invoices table
    team: [], // Not applicable to Invoice entity
    linkedIds: [],
    
    // Linked POInvoiceHeaders records
    invoiceDetails: fields[INVOICE_ENTITY_FIELDS.PO_INVOICE_HEADERS] || [],
    
    // Attachments from Files table (lookup)
    attachments: [],
    files: fields[INVOICE_ENTITY_FIELDS.FILES] || [],
    
    // Additional computed fields
    createdAt: parseDate(fields[INVOICE_ENTITY_FIELDS.CREATED_AT]) || new Date(),
    updatedAt: parseDate(fields[INVOICE_ENTITY_FIELDS.UPDATED_AT]) || new Date()
  };
}

/**
 * Transform Airtable POInvoiceHeader record to Invoice
 * This is for the POInvoiceHeaders table (legacy/backward compatibility)
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
      // POInvoiceHeaders status mappings
      'Queued': 'pending',
      'Exported': 'exported',
      'Error': 'rejected',
      // Legacy mappings
      'Pending': 'pending',
      'Matched': 'open',
      'Reviewed': 'reviewed',
      'pending': 'pending',
      'open': 'open',
      'reviewed': 'reviewed',
      'approved': 'approved',
      'rejected': 'rejected',
      'exported': 'exported'
    };
    return statusMap[airtableStatus] || 'pending';
  };

  // Read server-side validation from Airtable (formula field)
  const missingFieldsMessage = fields[PO_INVOICE_HEADER_FIELDS.MISSING_FIELDS] || '';

  return {
    id: record.id,
    type: 'invoices',
    status: mapStatus(fields[PO_INVOICE_HEADER_FIELDS.STATUS] || 'Queued'),
    missingFields: [], // Deprecated - kept for compatibility
    missingFieldsMessage, // Server-side validation message
    invoiceNumber: fields[PO_INVOICE_HEADER_FIELDS.INVOICE_NUMBER] || '',
    vendorName: fields[PO_INVOICE_HEADER_FIELDS.VENDOR_NAME] || '',
    vendorCode: fields[PO_INVOICE_HEADER_FIELDS.VENDOR_ID] || '',
    amount: fields[PO_INVOICE_HEADER_FIELDS.AMOUNT] || 0,
    invoiceDate: parseDate(fields[PO_INVOICE_HEADER_FIELDS.INVOICE_DATE]) || new Date(),
    glAccount: '', // GL Account moved to POInvoiceDetails (line items)
    rawTextOcr: fields[PO_INVOICE_HEADER_FIELDS.DOCUMENT_RAW_TEXT] || '',
    rejectionCode: fields[PO_INVOICE_HEADER_FIELDS.ERROR_CODE] || '',
    rejectionReason: fields[PO_INVOICE_HEADER_FIELDS.ERROR_REASON] || '',
    team: [], // Team table no longer exists
    linkedIds: [],
    
    // Linked POInvoiceDetails records (line items)
    invoiceDetails: fields[PO_INVOICE_HEADER_FIELDS.INVOICE_DETAILS] || [],
    
    // Attachments from Files table
    attachments: fields[PO_INVOICE_HEADER_FIELDS.ATTACHMENTS] || [],
    files: fields[PO_INVOICE_HEADER_FIELDS.FILES] || [],
    
    // Additional computed fields
    createdAt: parseDate(fields[PO_INVOICE_HEADER_FIELDS.CREATED_AT]) || new Date(),
    updatedAt: parseDate(fields[PO_INVOICE_HEADER_FIELDS.UPDATED_AT]) || new Date()
  };
}

/**
 * Transform Invoice to Airtable Invoice entity format (Invoices table)
 */
export function transformInvoiceToAirtableEntity(invoice: Partial<Invoice>): Record<string, any> {
  const fields: Record<string, any> = {};

  // Basic fields
  if (invoice.invoiceNumber) fields[INVOICE_ENTITY_FIELDS.INVOICE_NUMBER] = invoice.invoiceNumber;
  if (invoice.vendorName) fields[INVOICE_ENTITY_FIELDS.VENDOR_NAME] = invoice.vendorName;
  if (invoice.vendorCode) fields[INVOICE_ENTITY_FIELDS.VEND_ID] = invoice.vendorCode;
  if (invoice.amount !== undefined) fields[INVOICE_ENTITY_FIELDS.AMOUNT] = invoice.amount;
  
  // Map our internal status back to Airtable's capitalized values
  if (invoice.status) {
    const statusMap: Record<string, string> = {
      'pending': 'Pending',
      'open': 'Matched',       // Editable state
      'reviewed': 'Queued',    // Ready for export
      'approved': 'Queued',    // Also maps to Queued
      'exported': 'Exported',
      'rejected': 'Error',
    };
    fields[INVOICE_ENTITY_FIELDS.STATUS] = statusMap[invoice.status] || 'Pending';
  }

  // Dates
  if (invoice.invoiceDate) {
    fields[INVOICE_ENTITY_FIELDS.DATE] = invoice.invoiceDate.toISOString().split('T')[0];
  }

  // Text fields
  if (invoice.rawTextOcr) fields[INVOICE_ENTITY_FIELDS.DOCUMENT_RAW_TEXT] = invoice.rawTextOcr;
  if (invoice.rejectionCode) fields[INVOICE_ENTITY_FIELDS.ERROR_CODE] = invoice.rejectionCode;

  return fields;
}

/**
 * Transform Invoice to Airtable POInvoiceHeader format (legacy/backward compatibility)
 */
export function transformInvoiceToAirtable(invoice: Partial<Invoice>): Record<string, any> {
  const fields: Record<string, any> = {};

  // Basic fields
  if (invoice.invoiceNumber) fields[PO_INVOICE_HEADER_FIELDS.INVOICE_NUMBER] = invoice.invoiceNumber;
  if (invoice.vendorName) fields[PO_INVOICE_HEADER_FIELDS.VENDOR_NAME] = invoice.vendorName;
  if (invoice.vendorCode) fields[PO_INVOICE_HEADER_FIELDS.VENDOR_ID] = invoice.vendorCode;
  if (invoice.amount !== undefined) fields[PO_INVOICE_HEADER_FIELDS.AMOUNT] = invoice.amount;
  
  // Map our internal status back to Airtable's capitalized values for POInvoiceHeaders
  if (invoice.status) {
    const statusMap: Record<string, string> = {
      'pending': 'Queued',
      'open': 'Queued',
      'reviewed': 'Queued',
      'approved': 'Queued',
      'exported': 'Exported',
      'rejected': 'Error',
    };
    fields[PO_INVOICE_HEADER_FIELDS.STATUS] = statusMap[invoice.status] || 'Queued';
  }

  // Dates
  if (invoice.invoiceDate) {
    fields[PO_INVOICE_HEADER_FIELDS.INVOICE_DATE] = invoice.invoiceDate.toISOString().split('T')[0];
  }

  // GL Account is now in POInvoiceDetails (line items), not in POInvoiceHeaders
  // Omitting it here

  // Text fields
  if (invoice.rawTextOcr) fields[PO_INVOICE_HEADER_FIELDS.DOCUMENT_RAW_TEXT] = invoice.rawTextOcr;
  if (invoice.rejectionCode) fields[PO_INVOICE_HEADER_FIELDS.ERROR_CODE] = invoice.rejectionCode;
  if (invoice.rejectionReason) fields[PO_INVOICE_HEADER_FIELDS.ERROR_REASON] = invoice.rejectionReason;

  // Team field no longer exists in new schema
  // Omitting it

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