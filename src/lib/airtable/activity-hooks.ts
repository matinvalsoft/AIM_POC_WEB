import { useState, useEffect, useCallback } from 'react';
import type { Activity } from '@/types/activity';

interface UseActivitiesOptions {
  invoiceId?: string;
  autoFetch?: boolean;
}

interface UseActivitiesReturn {
  activities: Activity[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Transform Airtable record to Activity
function transformAirtableToActivity(record: any): Activity {
  const fields = record.fields;
  
  return {
    id: record.id,
    activityType: fields['Activity Type'] || 'created',
    description: fields['Description'] || '',
    performedBy: fields['Performed By'] || 'Unknown',
    performedAt: new Date(fields['Performed At'] || record.createdTime),
    fieldChanged: fields['Field Changed'] || undefined,
    oldValue: fields['Old Value (JSON)'] || undefined,
    newValue: fields['New Value (JSON)'] || undefined,
    notes: fields['Notes'] || undefined,
    systemGenerated: fields['System Generated'] || false,
    documentId: fields['Document (Invoice)']?.[0] || ''
  };
}

export function useActivities(options: UseActivitiesOptions = {}): UseActivitiesReturn {
  const { invoiceId, autoFetch = true } = options;
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async () => {
    if (!invoiceId) {
      setActivities([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch all activities (Airtable filtering for linked records is tricky)
      const params = new URLSearchParams({
        sort: JSON.stringify([{ field: 'Performed At', direction: 'desc' }])
      });

      const response = await fetch(`/api/airtable/Activities?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch activities: ${response.statusText}`);
      }

      const data = await response.json();
      const allActivities = data.records.map(transformAirtableToActivity);
      
      // Filter activities for the specific invoice on the client side
      const filteredActivities = allActivities
        .filter(activity => activity.documentId === invoiceId)
        .sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime()); // Reverse chronological (newest first)
      
      setActivities(filteredActivities);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching activities:', err);
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  const refetch = useCallback(async () => {
    await fetchActivities();
  }, [fetchActivities]);

  // Auto-fetch on mount and when invoiceId changes
  useEffect(() => {
    if (autoFetch) {
      fetchActivities();
    }
  }, [autoFetch, fetchActivities]);

  return {
    activities,
    loading,
    error,
    refetch
  };
}

// Hook for getting activity counts/stats
export function useActivityStats(invoiceId?: string) {
  const { activities, loading, error } = useActivities({ invoiceId, autoFetch: true });

  const stats = {
    total: activities.length,
    statusChanges: activities.filter(a => a.activityType === 'status_changed').length,
    edits: activities.filter(a => a.activityType === 'edited').length,
    coding: activities.filter(a => a.activityType === 'coded').length,
    systemGenerated: activities.filter(a => a.systemGenerated).length,
    userGenerated: activities.filter(a => !a.systemGenerated).length
  };

  return {
    stats,
    loading,
    error
  };
}
