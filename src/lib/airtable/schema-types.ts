/**
 * Auto-generated Airtable schema types
 * Generated from latest_schema.json
 * DO NOT EDIT MANUALLY - Run 'node scripts/generate-schema-types.js' to regenerate
 */

// Auto-generated field IDs from Airtable schema

export const FIELD_IDS = {
  FILES: {
    NAME: 'fld871fmYBmxf8xYU',
    SOURCE: 'fld5bJlx5WszQ4c1u',
    STATUS: 'fld9ouHowI4sch0n0',
    INVOICES: 'fldkuHPgcgEa3m7rN',
    ERROR_CODE: 'fldIBUz1V67JDnoqk',
    ATTACHMENTS: 'fldLR6Gc6IaN2ltR5',
    CREATED_AT: 'fldwsCB3B85GpPmLc',
    MODIFIED_AT: 'fldOl0pJW9KWx7xCX',
    ERROR_DESCRIPTION: 'fldSePddKTGeqabXg',
    ERROR_LINK: 'fldAKXH81jZde4kwj',
    DELIVERY_TICKETS: 'fldfHlzm4Y2llPWmI',
    STORE_RECEIVERS: 'fldY4KUJ2Ab1WLPkz',
    RAW_TEXT: 'fldqYhVrJ09KBnVLk',
    FILE_HASH: 'fldbYXg99PG8IVk0c',
  },
  INVOICES: {
    INVOICE_NUMBER: 'fldip2afk1iwBXqIH',
    STATUS: 'fld7KzLACPWK7YE5S',
    CREATED_AT: 'fld2pRPhrSTtl4ANV',
    UPDATED_AT: 'fldoRVUbO4liVHf9b',
    VENDOR_NAME: 'fldwXyrC93rysGzrJ',
    VENDOR_CODE: 'fldPWCklYpVUfiwAz',
    INVOICE_DATE: 'fldFd1vxXxxThsdAk',
    AMOUNT: 'fldPiog487BPfs1gE',
    GL_ACCOUNT: 'fld4VwvAkOW77XhR4',
    DOCUMENT_RAW_TEXT: 'fldutbLwPpnXBAzlP',
    REJECTION_CODE: 'fldR4mbqWDgdGS3hL',
    REJECTION_REASON: 'fld6a8zvQYCVprrpl',
    FILES: 'fldu797dxWoXqGxU0',
    ATTACHMENTS: 'fld5LeydwwVmVufs4',
    TEAM: 'fldG2o6HeG4ZgsG2U',
    MISSING_FIELDS: 'fldbrygcHSus5OnmN',
    FILE_RAW_TEXT: 'fldVSJ6uKdHTbqZT6',
  },
  DELIVERY_TICKETS: {
    DELIVERY_TICKET_ID: 'fldR0NiDhDkBj2wVL',
    INVOICE_NUMBER: 'flddCGUlcJGHTqfDC',
    STATUS: 'fld2XdvGuxkVprt0N',
    CREATED_AT: 'fldXCvznjAhEDxpIQ',
    UPDATED_AT: 'fldj4zEhGMJtda446',
    VENDOR_NAME: 'fldracbI1LPJK9omE',
    VENDOR_CODE: 'fldK9g4rQ7j5xLlvu',
    INVOICE_DATE: 'fldAqFfDPfV4zV2vf',
    AMOUNT: 'fldKv20a0PZ0xVQbz',
    GL_ACCOUNT: 'fldZ8afGcwkipq6MZ',
    RAW_TEXT_OCR: 'fldpGPvCH7L8T3ogK',
    REJECTION_CODE: 'fldMh0VwOlEoYlScG',
    REJECTION_REASON: 'fld1nMjBIG06HUgkg',
    FILES: 'fldpkNRjpEM8I9mPV',
    ATTACHMENTS: 'fld0YSijoejxdX4nZ',
    TEAM: 'fldBf2QN6osayVvXP',
    HAS_MISSING_FIELDS: 'fld6Ec0izASDnhchI',
    FILE_RAW_TEXT: 'fldhR2TiIe1her9dC',
  },
  STORE_RECEIVERS: {
    DOCUMENT_NUMBER: 'fldAncD0ffthUYpTC',
    INVOICE_NUMBER: 'fldWZ5fIalPnum8Bt',
    STATUS: 'fldLkCQ3s9tB0nmYE',
    CREATED_AT: 'fldGZUUKhcqketiGH',
    UPDATED_AT: 'fld2rYZEEoS9O6X2X',
    VENDOR_NAME: 'fldaxBw5ZnYpl5hkv',
    VENDOR_CODE: 'fldtwFpOOJsL8Hetl',
    INVOICE_DATE: 'fldjN4A0NR4KaRVt6',
    AMOUNT: 'fldtSrlxYr8G8RJ9q',
    GL_ACCOUNT: 'fldIvzA3a8tY0mZKQ',
    DOCUMENT_RAW_TEXT: 'fld83eQZFJUOuZheB',
    REJECTION_CODE: 'fldvEpgTMXN4zhLax',
    REJECTION_REASON: 'fldKKbEYGi9MiQ9i7',
    FILES: 'fld8HccGngVOj5fNM',
    ATTACHMENTS: 'fldJlhDGmQsdOTXlQ',
    TEAM: 'fldkCrba40BQ9RoVG',
    HAS_MISSING_FIELDS: 'fldP1BlFxc1jYd5fz',
    FILE_RAW_TEXT: 'fldaTlXt33Y9PHS8r',
  },
  TEAMS: {
    NAME: 'fldl9LGWidcveLU0S',
    FULL_NAME: 'fldHmIuDRJ9wNdnzf',
    INVOICES: 'fldErw23zpptCI1Uu',
    DELIVERY_TICKETS: 'fldzEaM9r7NEUbQPp',
    STORE_RECEIVERS: 'fldi1z7wpJWkv7JNg',
  },
} as const;

// Status value constants
export const INVOICE_STATUS = {
  OPEN: 'open',
  REVIEWED: 'reviewed', 
  EXPORTED: 'exported'
} as const;

export const FILE_STATUS = {
  QUEUED: 'Queued',
  PROCESSING: 'Processing',
  PROCESSED: 'Processed',
  ATTENTION: 'Attention'
} as const;

// Table names
export const TABLE_NAMES = {
  FILES: 'Files',
  INVOICES: 'Invoices',
  DELIVERY_TICKETS: 'Delivery Tickets',
  STORE_RECEIVERS: 'Store Receivers',
  TEAMS: 'Teams',
} as const;

// Airtable attachment type
export interface AirtableAttachment {
  id: string;
  url: string;
  filename: string;
  size?: number;
  type?: string;
  thumbnails?: {
    small?: { url: string; width: number; height: number };
    large?: { url: string; width: number; height: number };
    full?: { url: string; width: number; height: number };
  };
}

export interface FilesFields {
  name?: string;
  source?: string;
  status?: string;
  invoices?: string[];
  errorCode?: string;
  attachments?: AirtableAttachment[];
  createdAt: string;
  modifiedAt?: string;
  errorDescription?: string;
  errorLink?: string;
  deliveryTickets?: string[];
  storeReceivers?: string[];
  rawText?: string;
  fileHash?: string;
}

export interface InvoicesFields {
  invoiceNumber?: string;
  status?: string;
  createdAt: string;
  updatedAt?: string;
  vendorName?: string;
  vendorCode?: string;
  invoiceDate?: string;
  amount?: number;
  gLAccount?: string;
  documentRawText?: string;
  rejectionCode?: string;
  rejectionReason?: string;
  files?: string[];
  attachments?: any;
  team?: string[];
  missingFields?: any;
  fileRawText?: any;
}

export interface DeliveryTicketsFields {
  deliveryTicketID: number;
  invoiceNumber?: string;
  status?: string;
  createdAt: string;
  updatedAt?: string;
  vendorName?: string;
  vendorCode?: string;
  invoiceDate?: string;
  amount?: number;
  gLAccount?: string;
  rawTextOCR?: string;
  rejectionCode?: string;
  rejectionReason?: string;
  files?: string[];
  attachments?: any;
  team?: string[];
  hasMissingFields?: any;
  fileRawText?: any;
}

export interface StoreReceiversFields {
  documentNumber?: string;
  invoiceNumber?: string;
  status?: string;
  createdAt: string;
  updatedAt?: string;
  vendorName?: string;
  vendorCode?: string;
  invoiceDate?: string;
  amount?: number;
  gLAccount?: string;
  documentRawText?: string;
  rejectionCode?: string;
  rejectionReason?: string;
  files?: string[];
  attachments?: any;
  team?: string[];
  hasMissingFields?: any;
  fileRawText?: any;
}

export interface TeamsFields {
  name?: string;
  fullName?: string;
  invoices?: string[];
  deliveryTickets?: string[];
  storeReceivers?: string[];
}

export interface FilesRecord {
  name?: string;
  source?: string;
  status?: string;
  invoices?: string[];
  errorCode?: string;
  attachments?: AirtableAttachment[];
  createdAt: string;
  modifiedAt?: string;
  errorDescription?: string;
  errorLink?: string;
  deliveryTickets?: string[];
  storeReceivers?: string[];
  rawText?: string;
  fileHash?: string;
}

export interface InvoicesRecord {
  invoiceNumber?: string;
  status?: string;
  createdAt: string;
  updatedAt?: string;
  vendorName?: string;
  vendorCode?: string;
  invoiceDate?: string;
  amount?: number;
  gLAccount?: string;
  documentRawText?: string;
  rejectionCode?: string;
  rejectionReason?: string;
  files?: string[];
  attachments?: any;
  team?: string[];
  missingFields?: any;
  fileRawText?: any;
}

export interface DeliveryTicketsRecord {
  deliveryTicketID: number;
  invoiceNumber?: string;
  status?: string;
  createdAt: string;
  updatedAt?: string;
  vendorName?: string;
  vendorCode?: string;
  invoiceDate?: string;
  amount?: number;
  gLAccount?: string;
  rawTextOCR?: string;
  rejectionCode?: string;
  rejectionReason?: string;
  files?: string[];
  attachments?: any;
  team?: string[];
  hasMissingFields?: any;
  fileRawText?: any;
}

export interface StoreReceiversRecord {
  documentNumber?: string;
  invoiceNumber?: string;
  status?: string;
  createdAt: string;
  updatedAt?: string;
  vendorName?: string;
  vendorCode?: string;
  invoiceDate?: string;
  amount?: number;
  gLAccount?: string;
  documentRawText?: string;
  rejectionCode?: string;
  rejectionReason?: string;
  files?: string[];
  attachments?: any;
  team?: string[];
  hasMissingFields?: any;
  fileRawText?: any;
}

export interface TeamsRecord {
  name?: string;
  fullName?: string;
  invoices?: string[];
  deliveryTickets?: string[];
  storeReceivers?: string[];
}

