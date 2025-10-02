/**
 * Helper functions for setting error codes on Airtable records
 */

import { createAirtableClient } from './client';

export type ErrorCode = 
  | 'DUPLICATE_FILE'
  | 'OCR_FAILED'
  | 'PDF_CORRUPTED'
  | 'UNSUPPORTED_FORMAT'
  | 'FILE_TOO_LARGE'
  | 'PROCESSING_ERROR'
  | 'VALIDATION_ERROR'
  | 'TIMEOUT_ERROR';

export interface SetErrorOptions {
  recordId: string;
  errorCode: ErrorCode;
  errorLink?: string;
  baseId: string;
}

/**
 * Set error code and related fields on an Airtable record
 */
export async function setRecordError(options: SetErrorOptions): Promise<void> {
  const { recordId, errorCode, errorLink, baseId } = options;
  
  try {
    const airtableClient = createAirtableClient(baseId);
    
    const fields: any = {
      'Status': 'Attention',
      'Error Code': errorCode
    };
    
    if (errorLink) {
      fields['Error Link'] = errorLink;
    }
    
    await airtableClient.updateRecords('Files', {
      records: [{
        id: recordId,
        fields
      }],
      typecast: true
    });
    
    console.log(`✅ Set error code ${errorCode} on record ${recordId}`);
  } catch (error) {
    console.error(`❌ Failed to set error code on record ${recordId}:`, error);
    throw error;
  }
}

/**
 * Clear error code from an Airtable record
 */
export async function clearRecordError(recordId: string, baseId: string): Promise<void> {
  try {
    const airtableClient = createAirtableClient(baseId);
    
    await airtableClient.updateRecords('Files', {
      records: [{
        id: recordId,
        fields: {
          'Status': 'Queued',
          'Error Code': '',
          'Error Link': ''
        }
      }],
      typecast: true
    });
    
    console.log(`✅ Cleared error code from record ${recordId}`);
  } catch (error) {
    console.error(`❌ Failed to clear error code from record ${recordId}:`, error);
    throw error;
  }
}

