/**
 * Auto-generated TypeScript types from Airtable schema
 * Generated: 2025-01-19T20:30:00.000Z
 * 
 * WARNING: This file is auto-generated and will be overwritten.
 * To update types, run the schema update process.
 */

import type { 
  AirtableRecord, 
  AirtableAttachment, 
  AirtableCollaborator,
  TypedAirtableRecord,
  TypedAirtableCreateRecord,
  TypedAirtableUpdateRecord
} from './types';

// ============================================================================
// Table IDs and Field IDs (for programmatic access)
// ============================================================================

export const TABLE_IDS = {
  INVOICES: 'tbl5gvAXvrV53lxBW',
  INVOICE_LINES: 'tbl53Kp4e0mdWxJh7',
  ACTIVITIES: 'tbl3tSPM0w48WjCfB',
  FILES: 'tblWwBxYXZMcUBsHn',
  EMAILS: 'tblThORX9lNpjewJn',
  TEAMS: 'tblL0YBYaKayqFIMb',
} as const;

export const FIELD_IDS = {
  INVOICES: {
    INVOICE_NUMBER: 'fldip2afk1iwBXqIH',
    STATUS: 'fld7KzLACPWK7YE5S',
    CREATED_AT: 'fld2pRPhrSTtl4ANV',
    UPDATED_AT: 'fldoRVUbO4liVHf9b',
    VENDOR_NAME: 'fldwXyrC93rysGzrJ',
    VENDOR_CODE: 'fldPWCklYpVUfiwAz',
    INVOICE_DATE: 'fldFd1vxXxxThsdAk',
    DUE_DATE: 'fldO7mkSkLyJfckKd',
    AMOUNT: 'fldPiog487BPfs1gE',
    IS_MULTILINE_CODING: 'fldMEVH80OGmzoO8S',
    ERP_ATTRIBUTE_1: 'fldkB5t7eZD8Foane', // Previously "Project"
    ERP_ATTRIBUTE_2: 'fldZZH4Iku5aTaMYV', // Previously "Task"
    ERP_ATTRIBUTE_3: 'fldCqCPCpUUJPWqeH', // Previously "Cost Center"
    GL_ACCOUNT: 'fld4VwvAkOW77XhR4',
    RAW_TEXT_OCR: 'fldutbLwPpnXBAzlP',
    REJECTION_CODE: 'fldR4mbqWDgdGS3hL', // NEW field
    REJECTION_REASON: 'fld6a8zvQYCVprrpl',
    DAYS_UNTIL_DUE: 'fldt82etqf0bZfenm',
    ACTIVITIES: 'fld8iECtltoQZ3V5B',
    INVOICE_LINES: 'fldxUSTYhSCZfpfxF',
    FILES: 'fldu797dxWoXqGxU0',
    EMAILS: 'fldgdXEnSklAfPeSs',
    ATTACHMENTS: 'fld5LeydwwVmVufs4',
    TEAM: 'fldG2o6HeG4ZgsG2U', // NEW field - link to Teams table
    MISSING_FIELDS: 'fldMissingFieldsFormula', // Server-side validation formula field
  },
  INVOICE_LINES: {
    AUTO_NUMBER: 'fldp1qMEJnUX0apFF',
    INVOICE: 'fld5FQdA63lYXZhzg',
    LINE_NUMBER: 'fldrgMNcjmAIyw3B2',
    DESCRIPTION: 'fldy2Wf5kUlzFI7PL',
    AMOUNT: 'fldIQQvUGzQZuK2oZ',
    PROJECT: 'fldT2eGZNlctr22oY',
    TASK: 'fldPGWkEDd0dpgsOp',
    COST_CENTER: 'fldSbKrVDOwuQZb8o',
    GL_ACCOUNT: 'fld7720PGtdiA2vOs',
    CREATED_AT: 'fldxr78wIoNITGfB1',
    UPDATED_AT: 'fldRtr4DHucGqdrOO',
    INVOICES_COPY: 'fldaADr3mrso2DkRJ',
  },
  ACTIVITIES: {
    AUTO_NUMBER: 'fldEtFtaiTt7zuARX',
    ACTIVITY_TYPE: 'fldbEX5Oe407OJ9RG',
    DESCRIPTION: 'fldlKFtGbJzeumLRm',
    PERFORMED_BY: 'fld4F1HuPTj5zYxFO',
    PERFORMED_AT: 'fldcpgpkyD04jvqbA',
    FIELD_CHANGED: 'fldu6pOotaBQnXY5R',
    OLD_VALUE_JSON: 'fldh1SQjyl67UMyn9',
    NEW_VALUE_JSON: 'fldM06PHSYKohI57v',
    NOTES: 'fld1StlTa0Yn9LB0k',
    SYSTEM_GENERATED: 'fldWerjXBwpD9BMht',
    DOCUMENT_INVOICE: 'fldT4itnTw8ExGOui',
    IMPORTED_TABLE: 'fld2NRh1ZPaxXLLZi',
    INVOICES_COPY: 'fldYZ5HQ9Uf4CkRML',
  },
  FILES: {
    NAME: 'fld871fmYBmxf8xYU',
    UPLOAD_DATE: 'fldCDTZ4fdLjjvBBg',
    SOURCE: 'fld5bJlx5WszQ4c1u',
    STATUS: 'fld9ouHowI4sch0n0',
    PAGES: 'fldd196VlH2J9np59',
    INVOICES: 'fldkuHPgcgEa3m7rN',
    ACTIVITY: 'fldO4J1tqXca5gnP4',
    EMAILS: 'fldAg6duKlD9hxMX4',
    ERROR_CODE: 'fldIBUz1V67JDnoqk', // Previously "Attention"
    ATTACHMENTS: 'fldLR6Gc6IaN2ltR5',
    INVOICES_COPY: 'fldppu3JsELA80aJg',
    CREATED_AT: 'fldwsCB3B85GpPmLc', // NEW field
    MODIFIED_AT: 'fldOl0pJW9KWx7xCX', // NEW field
    ERROR_DESCRIPTION: 'fldSePddKTGeqabXg', // NEW field
    ERROR_LINK: 'fldAKXH81jZde4kwj', // NEW field
  },
  EMAILS: {
    SUBJECT: 'fldoqEzoDiHHfy2UB',
    FROM_NAME: 'fldrZpn2OurRutCGO',
    FROM_EMAIL: 'fldqXhdOT0rjyXW9B',
    BODY: 'fldABUS3ap5eBIKJC',
    RECEIVED: 'fldbBSy1dSBRgkeZ0',
    TO: 'fldQJwRTiTP7o0VmE',
    ATTACHMENTS_COUNT: 'fldRwowuzTsO7eaD8',
    VENDOR: 'fldN1e3r3xG1dLC4Y',
    THREAD_ID: 'fldyrRvViGEnKHIdE',
    MESSAGE_ID: 'fldjSPDhm8pDWQdMU',
    ATTENTION: 'fldG9oKMTzVaZeFSO',
    FILES: 'fldaNhccW8ZBSQbaS',
    INVOICES: 'fldd785GbCaTpOnrf',
    ATTACHMENTS: 'fldc2qvKbkjvvHTa6',
    INVOICES_COPY: 'fldi2Vj9r0hjusqJI',
  },
  TEAMS: {
    NAME: 'fldl9LGWidcveLU0S', // NEW table
    FULL_NAME: 'fldHmIuDRJ9wNdnzf',
    INVOICES: 'fldErw23zpptCI1Uu',
  },
} as const;

// ============================================================================
// Status Enums and Types
// ============================================================================

export const INVOICE_STATUS = {
  OPEN: 'open',
  REVIEWED: 'reviewed', // NEW status
  PENDING: 'pending', 
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPORTED: 'exported',
} as const;

export const ACTIVITY_TYPE = {
  CREATED: 'created',
  STATUS_CHANGED: 'status_changed',
  EDITED: 'edited',
  CODED: 'coded',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPORTED: 'exported',
} as const;

export const FILE_SOURCE = {
  EMAIL: 'Email',
  UPLOAD: 'Upload',
} as const;

export const FILE_STATUS = {
  QUEUED: 'Queued',
  PROCESSING: 'Processing', // NEW status
  PROCESSED: 'Processed',
  ATTENTION: 'Attention',
} as const;

export const EMAIL_RECIPIENTS = {
  AP_YOURCOMPANY: 'ap@yourcompany.com',
  AP_SIMONANDSCHUSTER: 'ap@simonandschuster.com',
  AP_EMEA_SIMONANDSCHUSTER: 'ap-emea@simonandschuster.com',
  MAYA_LEE_SCRIBNER: 'maya.lee@scribnerbooks.com',
  PUBLICITY_SCRIBNER: 'publicity@scribnerbooks.com',
  PRODUCTION_SCRIBNER: 'production@scribnerbooks.com',
  EDITORIAL_ATRIA: 'editorial-atria@simonandschuster.com',
  PUBLICITY_UK_GALLERY: 'publicity-uk@gallerybooks.simonandschuster.co.uk',
  DESIGN_SCRIBNER: 'design@scribnerbooks.com',
} as const;

// Type aliases for the enums
export type InvoiceStatus = typeof INVOICE_STATUS[keyof typeof INVOICE_STATUS];
export type ActivityType = typeof ACTIVITY_TYPE[keyof typeof ACTIVITY_TYPE];
export type FileSource = typeof FILE_SOURCE[keyof typeof FILE_SOURCE];
export type FileStatus = typeof FILE_STATUS[keyof typeof FILE_STATUS];
export type EmailRecipient = typeof EMAIL_RECIPIENTS[keyof typeof EMAIL_RECIPIENTS];

// ============================================================================
// Typed Record Interfaces
// ============================================================================

export interface InvoiceFields {
  [FIELD_IDS.INVOICES.INVOICE_NUMBER]: string;
  [FIELD_IDS.INVOICES.STATUS]: InvoiceStatus;
  [FIELD_IDS.INVOICES.CREATED_AT]: string;
  [FIELD_IDS.INVOICES.UPDATED_AT]: string;
  [FIELD_IDS.INVOICES.VENDOR_NAME]?: string;
  [FIELD_IDS.INVOICES.VENDOR_CODE]?: string;
  [FIELD_IDS.INVOICES.INVOICE_DATE]?: string;
  [FIELD_IDS.INVOICES.DUE_DATE]?: string;
  [FIELD_IDS.INVOICES.AMOUNT]?: number;
  [FIELD_IDS.INVOICES.IS_MULTILINE_CODING]?: boolean;
  [FIELD_IDS.INVOICES.ERP_ATTRIBUTE_1]?: string; // Previously "Project"
  [FIELD_IDS.INVOICES.ERP_ATTRIBUTE_2]?: string; // Previously "Task"
  [FIELD_IDS.INVOICES.ERP_ATTRIBUTE_3]?: string; // Previously "Cost Center"
  [FIELD_IDS.INVOICES.GL_ACCOUNT]?: string;
  [FIELD_IDS.INVOICES.RAW_TEXT_OCR]?: string;
  [FIELD_IDS.INVOICES.REJECTION_CODE]?: string; // NEW field
  [FIELD_IDS.INVOICES.REJECTION_REASON]?: string;
  [FIELD_IDS.INVOICES.DAYS_UNTIL_DUE]?: number;
  [FIELD_IDS.INVOICES.ACTIVITIES]?: string[];
  [FIELD_IDS.INVOICES.INVOICE_LINES]?: string[];
  [FIELD_IDS.INVOICES.FILES]?: string[];
  [FIELD_IDS.INVOICES.EMAILS]?: string[];
  [FIELD_IDS.INVOICES.ATTACHMENTS]?: AirtableAttachment[];
  [FIELD_IDS.INVOICES.TEAM]?: string[]; // NEW field - link to Teams
  [FIELD_IDS.INVOICES.MISSING_FIELDS]?: string; // Server-side validation formula field
}

export interface InvoiceLineFields {
  [FIELD_IDS.INVOICE_LINES.AUTO_NUMBER]: number;
  [FIELD_IDS.INVOICE_LINES.INVOICE]?: string[];
  [FIELD_IDS.INVOICE_LINES.LINE_NUMBER]?: number;
  [FIELD_IDS.INVOICE_LINES.DESCRIPTION]?: string;
  [FIELD_IDS.INVOICE_LINES.AMOUNT]?: number;
  [FIELD_IDS.INVOICE_LINES.PROJECT]?: string;
  [FIELD_IDS.INVOICE_LINES.TASK]?: string;
  [FIELD_IDS.INVOICE_LINES.COST_CENTER]?: string;
  [FIELD_IDS.INVOICE_LINES.GL_ACCOUNT]?: string;
  [FIELD_IDS.INVOICE_LINES.CREATED_AT]: string;
  [FIELD_IDS.INVOICE_LINES.UPDATED_AT]: string;
  [FIELD_IDS.INVOICE_LINES.INVOICES_COPY]?: string;
}

export interface ActivityFields {
  [FIELD_IDS.ACTIVITIES.AUTO_NUMBER]: number;
  [FIELD_IDS.ACTIVITIES.ACTIVITY_TYPE]: ActivityType;
  [FIELD_IDS.ACTIVITIES.DESCRIPTION]?: string;
  [FIELD_IDS.ACTIVITIES.PERFORMED_BY]?: string;
  [FIELD_IDS.ACTIVITIES.PERFORMED_AT]: string;
  [FIELD_IDS.ACTIVITIES.FIELD_CHANGED]?: string;
  [FIELD_IDS.ACTIVITIES.OLD_VALUE_JSON]?: string;
  [FIELD_IDS.ACTIVITIES.NEW_VALUE_JSON]?: string;
  [FIELD_IDS.ACTIVITIES.NOTES]?: string;
  [FIELD_IDS.ACTIVITIES.SYSTEM_GENERATED]?: boolean;
  [FIELD_IDS.ACTIVITIES.DOCUMENT_INVOICE]?: string[];
  [FIELD_IDS.ACTIVITIES.IMPORTED_TABLE]?: string[];
  [FIELD_IDS.ACTIVITIES.INVOICES_COPY]?: string;
}

export interface FileFields {
  [FIELD_IDS.FILES.NAME]: string;
  [FIELD_IDS.FILES.UPLOAD_DATE]?: string;
  [FIELD_IDS.FILES.SOURCE]?: FileSource;
  [FIELD_IDS.FILES.STATUS]?: FileStatus;
  [FIELD_IDS.FILES.PAGES]?: number;
  [FIELD_IDS.FILES.INVOICES]?: string[];
  [FIELD_IDS.FILES.ACTIVITY]?: string[];
  [FIELD_IDS.FILES.EMAILS]?: string[];
  [FIELD_IDS.FILES.ERROR_CODE]?: string; // Previously "Attention"
  [FIELD_IDS.FILES.ATTACHMENTS]?: AirtableAttachment[];
  [FIELD_IDS.FILES.INVOICES_COPY]?: string;
  [FIELD_IDS.FILES.CREATED_AT]?: string; // NEW field
  [FIELD_IDS.FILES.MODIFIED_AT]?: string; // NEW field
  [FIELD_IDS.FILES.ERROR_DESCRIPTION]?: string; // NEW field
  [FIELD_IDS.FILES.ERROR_LINK]?: string; // NEW field
}

export interface EmailFields {
  [FIELD_IDS.EMAILS.SUBJECT]: string;
  [FIELD_IDS.EMAILS.FROM_NAME]?: string;
  [FIELD_IDS.EMAILS.FROM_EMAIL]?: string;
  [FIELD_IDS.EMAILS.BODY]?: string;
  [FIELD_IDS.EMAILS.RECEIVED]?: string;
  [FIELD_IDS.EMAILS.TO]?: EmailRecipient;
  [FIELD_IDS.EMAILS.ATTACHMENTS_COUNT]?: number;
  [FIELD_IDS.EMAILS.VENDOR]?: string;
  [FIELD_IDS.EMAILS.THREAD_ID]?: string;
  [FIELD_IDS.EMAILS.MESSAGE_ID]?: string;
  [FIELD_IDS.EMAILS.ATTENTION]?: string;
  [FIELD_IDS.EMAILS.FILES]?: string[];
  [FIELD_IDS.EMAILS.INVOICES]?: string[];
  [FIELD_IDS.EMAILS.ATTACHMENTS]?: AirtableAttachment[];
  [FIELD_IDS.EMAILS.INVOICES_COPY]?: string;
}

export interface TeamFields {
  [FIELD_IDS.TEAMS.NAME]: string;
  [FIELD_IDS.TEAMS.FULL_NAME]?: string;
  [FIELD_IDS.TEAMS.INVOICES]?: string[];
}

// ============================================================================
// Typed Record Types (with friendly field names)
// ============================================================================

export interface InvoiceRecord {
  invoiceNumber: string;
  status: InvoiceStatus;
  createdAt: string;
  updatedAt: string;
  vendorName?: string;
  vendorCode?: string;
  invoiceDate?: string;
  dueDate?: string;
  amount?: number;
  isMultilineCoding?: boolean;
  erpAttribute1?: string; // Previously "project"
  erpAttribute2?: string; // Previously "task"  
  erpAttribute3?: string; // Previously "costCenter"
  glAccount?: string;
  rawTextOcr?: string;
  rejectionCode?: string; // NEW field
  rejectionReason?: string;
  daysUntilDue?: number;
  activities?: string[];
  invoiceLines?: string[];
  files?: string[];
  emails?: string[];
  attachments?: AirtableAttachment[];
  team?: string[]; // NEW field
  missingFields?: string; // Server-side validation formula field
}

export interface InvoiceLineRecord {
  autoNumber: number;
  invoice?: string[];
  lineNumber?: number;
  description?: string;
  amount?: number;
  project?: string;
  task?: string;
  costCenter?: string;
  glAccount?: string;
  createdAt: string;
  updatedAt: string;
  invoicesCopy?: string;
}

export interface ActivityRecord {
  autoNumber: number;
  activityType: ActivityType;
  description?: string;
  performedBy?: string;
  performedAt: string;
  fieldChanged?: string;
  oldValueJson?: string;
  newValueJson?: string;
  notes?: string;
  systemGenerated?: boolean;
  documentInvoice?: string[];
  importedTable?: string[];
  invoicesCopy?: string;
}

export interface FileRecord {
  name: string;
  uploadDate?: string;
  source?: FileSource;
  status?: FileStatus;
  pages?: number;
  invoices?: string[];
  activity?: string[];
  emails?: string[];
  errorCode?: string; // Previously "attention"
  attachments?: AirtableAttachment[];
  invoicesCopy?: string;
  createdAt?: string; // NEW field
  modifiedAt?: string; // NEW field
  errorDescription?: string; // NEW field
  errorLink?: string; // NEW field
}

export interface EmailRecord {
  subject: string;
  fromName?: string;
  fromEmail?: string;
  body?: string;
  received?: string;
  to?: EmailRecipient;
  attachmentsCount?: number;
  vendor?: string;
  threadId?: string;
  messageId?: string;
  attention?: string;
  files?: string[];
  invoices?: string[];
  attachments?: AirtableAttachment[];
  invoicesCopy?: string;
}

export interface TeamRecord {
  name: string;
  fullName?: string;
  invoices?: string[];
}

// ============================================================================
// Typed Airtable Records (combining ID + fields)
// ============================================================================

export type Invoice = TypedAirtableRecord<InvoiceFields>;
export type InvoiceLine = TypedAirtableRecord<InvoiceLineFields>;
export type Activity = TypedAirtableRecord<ActivityFields>;
export type File = TypedAirtableRecord<FileFields>;
export type Email = TypedAirtableRecord<EmailFields>;
export type Team = TypedAirtableRecord<TeamFields>;

export type CreateInvoice = TypedAirtableCreateRecord<InvoiceFields>;
export type CreateInvoiceLine = TypedAirtableCreateRecord<InvoiceLineFields>;
export type CreateActivity = TypedAirtableCreateRecord<ActivityFields>;
export type CreateFile = TypedAirtableCreateRecord<FileFields>;
export type CreateEmail = TypedAirtableCreateRecord<EmailFields>;
export type CreateTeam = TypedAirtableCreateRecord<TeamFields>;

export type UpdateInvoice = TypedAirtableUpdateRecord<InvoiceFields>;
export type UpdateInvoiceLine = TypedAirtableUpdateRecord<InvoiceLineFields>;
export type UpdateActivity = TypedAirtableUpdateRecord<ActivityFields>;
export type UpdateFile = TypedAirtableUpdateRecord<FileFields>;
export type UpdateEmail = TypedAirtableUpdateRecord<EmailFields>;
export type UpdateTeam = TypedAirtableUpdateRecord<TeamFields>;

// ============================================================================
// Helper Types and Utilities
// ============================================================================

export interface InvoiceWithRelations extends Invoice {
  // Populated linked records
  populatedActivities?: Activity[];
  populatedInvoiceLines?: InvoiceLine[];
  populatedFiles?: File[];
  populatedEmails?: Email[];
  populatedTeam?: Team[]; // NEW relation
}

export interface ActivityWithRelations extends Activity {
  // Populated linked records
  populatedDocumentInvoice?: Invoice[];
  populatedImportedTable?: File[];
}

export interface FileWithRelations extends File {
  // Populated linked records
  populatedInvoices?: Invoice[];
  populatedActivity?: Activity[];
  populatedEmails?: Email[];
}

export interface EmailWithRelations extends Email {
  // Populated linked records
  populatedFiles?: File[];
  populatedInvoices?: Invoice[];
}

export interface TeamWithRelations extends Team {
  // Populated linked records
  populatedInvoices?: Invoice[];
}

// ============================================================================
// Status Transition Rules
// ============================================================================

export const INVOICE_STATUS_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  [INVOICE_STATUS.OPEN]: [INVOICE_STATUS.REVIEWED, INVOICE_STATUS.PENDING, INVOICE_STATUS.REJECTED],
  [INVOICE_STATUS.REVIEWED]: [INVOICE_STATUS.PENDING, INVOICE_STATUS.OPEN, INVOICE_STATUS.REJECTED], // NEW transitions
  [INVOICE_STATUS.PENDING]: [INVOICE_STATUS.APPROVED, INVOICE_STATUS.REJECTED, INVOICE_STATUS.REVIEWED],
  [INVOICE_STATUS.APPROVED]: [INVOICE_STATUS.EXPORTED, INVOICE_STATUS.REJECTED],
  [INVOICE_STATUS.REJECTED]: [INVOICE_STATUS.OPEN, INVOICE_STATUS.REVIEWED],
  [INVOICE_STATUS.EXPORTED]: [], // Final state
};

export const FILE_STATUS_TRANSITIONS: Record<FileStatus, FileStatus[]> = {
  [FILE_STATUS.QUEUED]: [FILE_STATUS.PROCESSING, FILE_STATUS.ATTENTION],
  [FILE_STATUS.PROCESSING]: [FILE_STATUS.PROCESSED, FILE_STATUS.ATTENTION], // NEW transitions
  [FILE_STATUS.PROCESSED]: [FILE_STATUS.ATTENTION],
  [FILE_STATUS.ATTENTION]: [FILE_STATUS.PROCESSING, FILE_STATUS.PROCESSED],
};

// ============================================================================
// Validation Helpers
// ============================================================================

export function isValidInvoiceStatus(status: string): status is InvoiceStatus {
  return Object.values(INVOICE_STATUS).includes(status as InvoiceStatus);
}

export function isValidActivityType(type: string): type is ActivityType {
  return Object.values(ACTIVITY_TYPE).includes(type as ActivityType);
}

export function isValidFileStatus(status: string): status is FileStatus {
  return Object.values(FILE_STATUS).includes(status as FileStatus);
}

export function isValidFileSource(source: string): source is FileSource {
  return Object.values(FILE_SOURCE).includes(source as FileSource);
}

export function isValidEmailRecipient(recipient: string): recipient is EmailRecipient {
  return Object.values(EMAIL_RECIPIENTS).includes(recipient as EmailRecipient);
}

export function canTransitionInvoiceStatus(from: InvoiceStatus, to: InvoiceStatus): boolean {
  return INVOICE_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export function canTransitionFileStatus(from: FileStatus, to: FileStatus): boolean {
  return FILE_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

// ============================================================================
// Table Names (for API calls)
// ============================================================================

export const TABLE_NAMES = {
  INVOICES: 'Invoices',
  INVOICE_LINES: 'Invoice Lines',
  ACTIVITIES: 'Activities', 
  FILES: 'Files',
  EMAILS: 'Emails',
  TEAMS: 'Teams', // NEW table
} as const;

export type TableName = typeof TABLE_NAMES[keyof typeof TABLE_NAMES];

// ============================================================================
// Legacy Field Mapping (for backward compatibility)
// ============================================================================

export const LEGACY_FIELD_MAPPING = {
  // Map old field names to new ones for backward compatibility
  PROJECT: 'ERP_ATTRIBUTE_1',
  TASK: 'ERP_ATTRIBUTE_2', 
  COST_CENTER: 'ERP_ATTRIBUTE_3',
  ATTENTION: 'ERROR_CODE',
  DUPLICATE_OF: 'ERROR_CODE',
} as const;

// ============================================================================
// Schema Metadata
// ============================================================================

export const SCHEMA_META = {
  version: '2.0.0', // Incremented due to breaking changes
  generatedAt: '2025-01-19T20:30:00.000Z',
  tableCount: 6,
  tables: Object.values(TABLE_NAMES),
  majorChanges: [
    'Added "reviewed" status to invoices',
    'Added Teams table with team management',
    'Renamed Project/Task/Cost Center to ERP Attributes 1-3',
    'Added Processing status to Files',
    'Added error tracking fields to Files',
    'Added team assignment to invoices'
  ],
} as const;