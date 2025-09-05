/**
 * React hooks for Airtable integration
 * Client-side utilities that call our server-side API endpoints
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  AirtableRecord,
  AirtableListParams,
  AirtableCreateRecord,
  AirtableUpdateRecord,
} from './types';

interface UseAirtableOptions {
  baseId?: string;
  initialParams?: AirtableListParams;
  autoFetch?: boolean;
}

interface UseAirtableResult {
  records: AirtableRecord[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  offset?: string;
  
  // Actions
  fetch: (params?: AirtableListParams) => Promise<void>;
  fetchMore: () => Promise<void>;
  create: (record: AirtableCreateRecord | AirtableCreateRecord[]) => Promise<AirtableRecord[]>;
  update: (records: AirtableUpdateRecord[]) => Promise<AirtableRecord[]>;
  delete: (ids: string[]) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing Airtable records with CRUD operations
 */
export function useAirtable(
  table: string,
  options: UseAirtableOptions = {}
): UseAirtableResult {
  const { baseId, initialParams = {}, autoFetch = true } = options;
  
  const [records, setRecords] = useState<AirtableRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);
  const [lastParams, setLastParams] = useState<AirtableListParams>(initialParams);

  /**
   * Build API URL with query parameters
   */
  const buildUrl = useCallback((endpoint: string, params?: Record<string, any>) => {
    const baseUrl = `/api/airtable/${encodeURIComponent(table)}${endpoint}`;
    const url = new URL(baseUrl, window.location.origin);
    
    if (baseId) {
      url.searchParams.append('baseId', baseId);
    }
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(item => url.searchParams.append(`${key}[]`, String(item)));
          } else {
            url.searchParams.append(key, String(value));
          }
        }
      });
    }
    
    return url.toString();
  }, [table, baseId]);

  /**
   * Fetch records with pagination
   */
  const fetch = useCallback(async (params: AirtableListParams = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const queryParams: Record<string, any> = { ...params };
      
      // Handle sort parameter
      if (params.sort) {
        params.sort.forEach((sort, index) => {
          queryParams[`sort[${index}][field]`] = sort.field;
          queryParams[`sort[${index}][direction]`] = sort.direction;
        });
        delete queryParams.sort;
      }
      
      // Handle fields parameter
      if (params.fields) {
        queryParams.fields = params.fields;
        delete queryParams.fields;
      }
      
      const url = buildUrl('', queryParams);
      const response = await window.fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (params.offset) {
        // Appending to existing records (pagination)
        setRecords(prev => [...prev, ...data.records]);
      } else {
        // Fresh fetch
        setRecords(data.records);
      }
      
      setOffset(data.offset);
      setHasMore(!!data.offset);
      setLastParams(params);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch records');
    } finally {
      setLoading(false);
    }
  }, [buildUrl]);

  /**
   * Fetch more records (pagination)
   */
  const fetchMore = useCallback(async () => {
    if (!hasMore || loading || !offset) return;
    
    await fetch({ ...lastParams, offset });
  }, [fetch, hasMore, loading, offset, lastParams]);

  /**
   * Create new record(s)
   */
  const create = useCallback(async (
    record: AirtableCreateRecord | AirtableCreateRecord[]
  ): Promise<AirtableRecord[]> => {
    setLoading(true);
    setError(null);
    
    try {
      const body = Array.isArray(record) 
        ? { records: record }
        : { fields: record.fields };
      
      const url = buildUrl('');
      const response = await window.fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      // Add new records to the beginning of the list
      setRecords(prev => [...data.records, ...prev]);
      
      return data.records;
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create record';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [buildUrl]);

  /**
   * Update existing record(s)
   */
  const update = useCallback(async (
    updates: AirtableUpdateRecord[]
  ): Promise<AirtableRecord[]> => {
    setLoading(true);
    setError(null);
    
    try {
      const url = buildUrl('');
      const response = await window.fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: updates }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      // Update records in place
      setRecords(prev => 
        prev.map(record => {
          const updated = data.records.find((r: AirtableRecord) => r.id === record.id);
          return updated || record;
        })
      );
      
      return data.records;
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update records';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [buildUrl]);

  /**
   * Delete record(s)
   */
  const deleteRecords = useCallback(async (ids: string[]): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      const url = buildUrl('');
      const response = await window.fetch(url, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }
      
      // Remove deleted records from the list
      setRecords(prev => prev.filter(record => !ids.includes(record.id)));
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete records';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [buildUrl]);

  /**
   * Refresh current view
   */
  const refresh = useCallback(async () => {
    await fetch(lastParams);
  }, [fetch, lastParams]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetch(initialParams);
    }
  }, [autoFetch, fetch, initialParams]);

  return {
    records,
    loading,
    error,
    hasMore,
    offset,
    fetch,
    fetchMore,
    create,
    update,
    delete: deleteRecords,
    refresh,
  };
}

/**
 * Hook for simple record fetching with automatic pagination
 */
export function useAirtableRecords(
  table: string,
  params: AirtableListParams = {},
  options: { baseId?: string; autoFetch?: boolean } = {}
) {
  const { records, loading, error, fetchMore, hasMore } = useAirtable(table, {
    ...options,
    initialParams: params,
  });

  return {
    records,
    loading,
    error,
    hasMore,
    loadMore: fetchMore,
  };
}

/**
 * Hook for managing a single record
 */
export function useAirtableRecord(
  table: string,
  recordId: string,
  options: { baseId?: string; autoFetch?: boolean } = {}
) {
  const [record, setRecord] = useState<AirtableRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { baseId, autoFetch = true } = options;

  const fetchRecord = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const url = `/api/airtable/${encodeURIComponent(table)}/${recordId}${baseId ? `?baseId=${baseId}` : ''}`;
      const response = await window.fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      setRecord(data);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch record');
    } finally {
      setLoading(false);
    }
  }, [table, recordId, baseId]);

  useEffect(() => {
    if (autoFetch && recordId) {
      fetchRecord();
    }
  }, [autoFetch, recordId, fetchRecord]);

  return {
    record,
    loading,
    error,
    refresh: fetchRecord,
  };
}
