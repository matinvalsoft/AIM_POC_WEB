/**
 * TypeScript definitions for Airtable Web API
 * Based on the official Airtable API v0 specification
 */

// ============================================================================
// Core Record Types
// ============================================================================

export interface AirtableRecord {
  id: string;
  fields: Record<string, any>;
  createdTime: string;
}

export interface AirtableCreateRecord {
  fields: Record<string, any>;
}

export interface AirtableUpdateRecord {
  id: string;
  fields: Record<string, any>;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface AirtableListResponse {
  records: AirtableRecord[];
  offset?: string;
}

export interface AirtableErrorResponse {
  error: {
    type: string;
    message: string;
  };
}

// ============================================================================
// API Parameter Types
// ============================================================================

export interface AirtableListParams {
  view?: string;
  pageSize?: number;
  maxRecords?: number;
  offset?: string;
  filterByFormula?: string;
  sort?: Array<{
    field: string;
    direction: 'asc' | 'desc';
  }>;
  fields?: string[];
}

export interface AirtableCreateParams {
  records: AirtableCreateRecord[];
  typecast?: boolean;
}

export interface AirtableUpdateParams {
  records: AirtableUpdateRecord[];
  typecast?: boolean;
}

export interface AirtableDeleteParams {
  records: string[];
}

// ============================================================================
// Schema and Metadata Types
// ============================================================================

export interface AirtableBase {
  id: string;
  name: string;
  permissionLevel: 'create' | 'comment' | 'edit' | 'read';
}

export interface AirtableTable {
  id: string;
  name: string;
  primaryFieldId: string;
  fields: AirtableField[];
  views: AirtableView[];
}

export interface AirtableField {
  id: string;
  name: string;
  type: AirtableFieldType;
  description?: string;
  options?: AirtableFieldOptions;
}

export type AirtableFieldType =
  | 'singleLineText'
  | 'email'
  | 'url' 
  | 'multilineText'
  | 'number'
  | 'percent'
  | 'currency'
  | 'singleSelect'
  | 'multipleSelects'
  | 'singleCollaborator'
  | 'multipleCollaborators'
  | 'multipleRecordLinks'
  | 'date'
  | 'dateTime'
  | 'phoneNumber'
  | 'multipleAttachments'
  | 'checkbox'
  | 'formula'
  | 'createdTime'
  | 'rollup'
  | 'count'
  | 'lookup'
  | 'multipleLookupValues'
  | 'autoNumber'
  | 'barcode'
  | 'rating'
  | 'richText'
  | 'duration'
  | 'lastModifiedTime'
  | 'button'
  | 'lastModifiedBy'
  | 'createdBy'
  | 'externalSyncSource'
  | 'aiText';

export interface AirtableFieldOptions {
  // For select fields
  choices?: AirtableSelectOption[];

  // For linked record fields
  linkedTableId?: string;
  relationship?: 'oneToMany' | 'manyToOne' | 'manyToMany';
  unreversed?: boolean;

  // For formula fields
  formula?: string;
  isValid?: boolean;
  referencedFieldIds?: string[];

  // For rollup fields
  recordLinkFieldId?: string;
  fieldIdInLinkedTable?: string;
  rollupFunction?: string;

  // For number/currency fields
  precision?: number;
  symbol?: string;

  // For date fields
  dateFormat?: {
    name: string;
    format: string;
  };
  timeFormat?: {
    name: string;
    format: string;
  };
  timeZone?: string;

  // For rating fields
  icon?: string;
  max?: number;
  color?: string;
}

export interface AirtableSelectOption {
  id: string;
  name: string;
  color?: string;
}

export interface AirtableView {
  id: string;
  name: string;
  type: 'grid' | 'form' | 'calendar' | 'gallery' | 'kanban' | 'timeline' | 'block' | 'gantt';
}

export interface AirtableAttachment {
  id: string;
  url: string;
  filename: string;
  size: number;
  type: string;
  thumbnails?: {
    small: AirtableThumbnail;
    large: AirtableThumbnail;
    full: AirtableThumbnail;
  };
}

export interface AirtableThumbnail {
  url: string;
  width: number;
  height: number;
}

export interface AirtableCollaborator {
  id: string;
  email: string;
  name: string;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface AirtableConfig {
  baseId: string;
  token: string;
  apiUrl?: string;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

export interface RateLimitInfo {
  requestsPerSecond: number;
  lastRequestTime: number;
  requestQueue: Array<{ timestamp: number; resolve: () => void }>;
}

// ============================================================================
// Schema API Response Types
// ============================================================================

export interface AirtableBaseMetadataResponse {
  tables: AirtableTable[];
}

export interface AirtableTableMetadataResponse extends AirtableTable {}

// ============================================================================
// Webhook Types
// ============================================================================

export interface AirtableWebhookPayload {
  base: {
    id: string;
  };
  webhook: {
    id: string;
  };
  timestamp: string;
  changedTablesById: Record<string, {
    changedRecordsById: Record<string, {
      current?: {
        cellValuesByFieldId: Record<string, any>;
        createdTime: string;
      };
      previous?: {
        cellValuesByFieldId: Record<string, any>;
        createdTime: string;
      };
    }>;
    createdRecordsById: Record<string, any>;
    destroyedRecordIds: string[];
  }>;
}

export interface AirtableWebhookSubscription {
  id: string;
  macSecretBase64: string;
  expirationTime: string;
  notificationUrl: string;
  isHookEnabled: boolean;
  cursorForNextPayload: number;
  includeCellValuesInFieldIds: string[];
  includePreviousCellValues: boolean;
  includeCreatedTime: boolean;
  areTablesIncluded: boolean;
  specification: {
    options: {
      filters: {
        dataTypes: ('tableData' | 'tableSchema')[];
        recordChangeScope?: string;
        watchDataInFieldIds?: string[];
      };
    };
  };
}

// ============================================================================
// Utility Types
// ============================================================================

export type AirtableFieldValue = 
  | string 
  | number 
  | boolean 
  | Date 
  | AirtableAttachment[]
  | AirtableCollaborator[]
  | string[] // for multiple select
  | any[]; // for linked records

export interface TypedAirtableRecord<T = Record<string, any>> {
  id: string;
  fields: T;
  createdTime: string;
}

export interface TypedAirtableCreateRecord<T = Record<string, any>> {
  fields: Partial<T>;
}

export interface TypedAirtableUpdateRecord<T = Record<string, any>> {
  id: string;
  fields: Partial<T>;
}

// ============================================================================
// Document Types (Application-specific)
// ============================================================================

export interface DocumentRecord {
  id: string;
  type: 'invoice' | 'email' | 'file';
  title: string;
  status?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

// Legacy document type mapping for backwards compatibility
export interface Document {
  id: string;
  type: 'invoice' | 'email' | 'file';
  title: string;
  status: string;
  date: string;
  amount?: number;
  vendor?: string;
  metadata?: Record<string, any>;
}
