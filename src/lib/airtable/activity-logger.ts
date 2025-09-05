import type { DocumentStatus } from '@/types/documents';

// Activity types matching Airtable schema
export type ActivityType = 'created' | 'status_changed' | 'edited' | 'coded' | 'approved' | 'rejected' | 'exported';

// Activity interface
export interface ActivityData {
  activityType: ActivityType;
  description: string;
  performedBy: string;
  fieldChanged?: string;
  oldValue?: string;
  newValue?: string;
  notes?: string;
  systemGenerated?: boolean;
  documentId: string; // Invoice ID
}

// Activity fields mapping to Airtable
export const ACTIVITY_FIELDS = {
  ACTIVITY_TYPE: 'Activity Type',
  DESCRIPTION: 'Description',
  PERFORMED_BY: 'Performed By',
  // PERFORMED_AT is auto-populated by Airtable (createdTime field)
  FIELD_CHANGED: 'Field Changed',
  OLD_VALUE: 'Old Value (JSON)',
  NEW_VALUE: 'New Value (JSON)',
  NOTES: 'Notes',
  SYSTEM_GENERATED: 'System Generated',
  DOCUMENT_INVOICE: 'Document (Invoice)'
} as const;

/**
 * Log an activity to the Activities table
 */
export async function logActivity(activity: ActivityData): Promise<boolean> {
  try {
    const activityRecord = {
      fields: {
        [ACTIVITY_FIELDS.ACTIVITY_TYPE]: activity.activityType,
        [ACTIVITY_FIELDS.DESCRIPTION]: activity.description,
        [ACTIVITY_FIELDS.PERFORMED_BY]: activity.performedBy,
        // Note: Performed At is auto-populated by Airtable (createdTime field)
        [ACTIVITY_FIELDS.FIELD_CHANGED]: activity.fieldChanged || '',
        [ACTIVITY_FIELDS.OLD_VALUE]: activity.oldValue || '',
        [ACTIVITY_FIELDS.NEW_VALUE]: activity.newValue || '',
        [ACTIVITY_FIELDS.NOTES]: activity.notes || '',
        [ACTIVITY_FIELDS.SYSTEM_GENERATED]: activity.systemGenerated || false,
        [ACTIVITY_FIELDS.DOCUMENT_INVOICE]: [activity.documentId] // Link to invoice
      }
    };

    const response = await fetch('/api/airtable/Activities', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(activityRecord),
    });

    if (!response.ok) {
      console.error('Failed to log activity:', response.statusText);
      return false;
    }

    const result = await response.json();
    console.log('Activity logged successfully:', result.id);
    return true;
  } catch (error) {
    console.error('Error logging activity:', error);
    return false;
  }
}

/**
 * Log a status change activity
 */
export async function logStatusChange(
  invoiceId: string,
  invoiceNumber: string,
  oldStatus: DocumentStatus,
  newStatus: DocumentStatus,
  performedBy: string = 'User', // TODO: Get actual user info
  notes?: string
): Promise<boolean> {
  // Map status to activity type
  const getActivityType = (status: DocumentStatus): ActivityType => {
    switch (status) {
      case 'pending': return 'status_changed';
      case 'approved': return 'approved';
      case 'rejected': return 'rejected';
      case 'exported': return 'exported';
      default: return 'status_changed';
    }
  };

  // Generate description
  const generateDescription = (oldStatus: DocumentStatus, newStatus: DocumentStatus, invoiceNumber: string): string => {
    const statusMap = {
      'open': 'Open',
      'pending': 'Pending',
      'approved': 'Approved', 
      'rejected': 'Rejected',
      'exported': 'Exported'
    };

    return `Invoice ${invoiceNumber} status changed from ${statusMap[oldStatus]} to ${statusMap[newStatus]}`;
  };

  const activity: ActivityData = {
    activityType: getActivityType(newStatus),
    description: generateDescription(oldStatus, newStatus, invoiceNumber),
    performedBy,
    fieldChanged: 'Status',
    oldValue: JSON.stringify({ status: oldStatus }),
    newValue: JSON.stringify({ status: newStatus }),
    notes,
    systemGenerated: false,
    documentId: invoiceId
  };

  return await logActivity(activity);
}

/**
 * Log a field edit activity
 */
export async function logFieldEdit(
  invoiceId: string,
  invoiceNumber: string,
  fieldName: string,
  oldValue: any,
  newValue: any,
  performedBy: string = 'User',
  notes?: string
): Promise<boolean> {
  const activity: ActivityData = {
    activityType: 'edited',
    description: `Invoice ${invoiceNumber} field '${fieldName}' updated`,
    performedBy,
    fieldChanged: fieldName,
    oldValue: JSON.stringify({ [fieldName]: oldValue }),
    newValue: JSON.stringify({ [fieldName]: newValue }),
    notes,
    systemGenerated: false,
    documentId: invoiceId
  };

  return await logActivity(activity);
}

/**
 * Log a coding activity
 */
export async function logCodingChange(
  invoiceId: string,
  invoiceNumber: string,
  codingChanges: Record<string, any>,
  performedBy: string = 'User',
  notes?: string
): Promise<boolean> {
  const changedFields = Object.keys(codingChanges).join(', ');
  
  const activity: ActivityData = {
    activityType: 'coded',
    description: `Invoice ${invoiceNumber} coding updated: ${changedFields}`,
    performedBy,
    fieldChanged: 'Coding',
    oldValue: '', // Could track previous values if needed
    newValue: JSON.stringify(codingChanges),
    notes,
    systemGenerated: false,
    documentId: invoiceId
  };

  return await logActivity(activity);
}
