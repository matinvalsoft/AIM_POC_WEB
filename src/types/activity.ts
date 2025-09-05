export interface Activity {
  id: string;
  activityType: 'created' | 'status_changed' | 'edited' | 'coded' | 'approved' | 'rejected' | 'exported';
  description: string;
  performedBy: string;
  performedAt: Date;
  fieldChanged?: string;
  oldValue?: string;
  newValue?: string;
  notes?: string;
  systemGenerated: boolean;
  documentId: string;
}

export interface ActivityDisplayProps {
  activities: Activity[];
  loading?: boolean;
  error?: string;
}
