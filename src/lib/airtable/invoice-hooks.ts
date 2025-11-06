/**
 * Specialized hooks for invoice data management with Airtable
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { transformAirtableToInvoiceEntity, transformInvoiceToAirtableEntity } from './transforms';
import { TABLE_NAMES } from './schema-types';
import type { Invoice } from '@/types/documents';
import type { AirtableRecord } from './types';

const BASE_ID = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID || process.env.AIRTABLE_BASE_ID;

interface UseInvoicesOptions {
  filter?: string;
  sort?: Array<{ field: string; direction: 'asc' | 'desc' }>;
  autoFetch?: boolean;
}

interface UseInvoicesResult {
  invoices: Invoice[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  refresh: () => Promise<void>;
  fetchMore: () => Promise<void>;
  updateInvoice: (invoiceId: string, updates: Partial<Invoice>) => Promise<void>;
  createInvoice: (invoice: Partial<Invoice>) => Promise<Invoice>;
}

/**
 * Hook for managing invoices from the Invoices table (primary entity)
 * Updated to fetch from Invoices table instead of POInvoiceHeaders
 */
export function useInvoices(options: UseInvoicesOptions = {}): UseInvoicesResult {
  const { filter, sort, autoFetch = true } = options;
  
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  // Memoize the fetch function to prevent infinite loops
  const fetchInvoices = useCallback(async () => {
    if (loading) return; // Prevent concurrent requests
    
    setLoading(true);
    setError(null);

    try {
      // Build query parameters
      const queryParams = new URLSearchParams({
        baseId: BASE_ID,
      });

      if (filter) {
        queryParams.append('filterByFormula', filter);
      }

      if (sort) {
        sort.forEach((sortItem, index) => {
          queryParams.append(`sort[${index}][field]`, sortItem.field);
          queryParams.append(`sort[${index}][direction]`, sortItem.direction);
        });
      } else {
        // Default sort by created date descending
        queryParams.append('sort[0][field]', 'Created At');
        queryParams.append('sort[0][direction]', 'desc');
      }

      queryParams.append('pageSize', '50');

      // Fetch invoices from Invoices table (primary entity)
      const invoicesResponse = await fetch(`/api/airtable/Invoices?${queryParams}`);

      if (!invoicesResponse.ok) {
        throw new Error(`Failed to fetch invoices: ${invoicesResponse.status}`);
      }

      const invoicesData = await invoicesResponse.json();

      // Transform the data using Invoice entity transform
      const transformedInvoices = invoicesData.records.map((invoiceRecord: AirtableRecord) => {
        return transformAirtableToInvoiceEntity(invoiceRecord);
      });

      setInvoices(transformedInvoices);
      setHasMore(!!invoicesData.offset);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch invoices';
      setError(message);
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  }, [filter, sort]);

  // Auto-fetch only once when component mounts or key dependencies change
  useEffect(() => {
    if (autoFetch) {
      fetchInvoices();
    }
  }, [autoFetch]); // Only depend on autoFetch, not the function itself

  /**
   * Manual refresh function
   */
  const refresh = useCallback(async () => {
    await fetchInvoices();
  }, [fetchInvoices]);

  /**
   * Fetch more invoices (pagination) - placeholder for now
   */
  const fetchMore = useCallback(async () => {
    // TODO: Implement pagination with offset
    console.log('Fetch more not implemented yet');
  }, []);

  /**
   * Update an invoice in Invoices table
   */
  const updateInvoice = useCallback(async (invoiceId: string, updates: Partial<Invoice>) => {
    try {
      const airtableFields = transformInvoiceToAirtableEntity(updates);
      
      const response = await fetch(`/api/airtable/Invoices`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: [{ id: invoiceId, fields: airtableFields }]
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update invoice: ${response.status}`);
      }

      // Optimistically update local state
      setInvoices(prevInvoices => 
        prevInvoices.map(invoice => 
          invoice.id === invoiceId 
            ? { ...invoice, ...updates }
            : invoice
        )
      );

    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update invoice');
    }
  }, []);

  /**
   * Create a new invoice in Invoices table
   */
  const createInvoice = useCallback(async (invoice: Partial<Invoice>): Promise<Invoice> => {
    try {
      const airtableFields = transformInvoiceToAirtableEntity(invoice);
      
      const response = await fetch(`/api/airtable/Invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: airtableFields }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create invoice: ${response.status}`);
      }

      const data = await response.json();
      const createdInvoice = transformAirtableToInvoiceEntity(data.records[0]);
      
      // Add to local state
      setInvoices(prevInvoices => [createdInvoice, ...prevInvoices]);
      
      return createdInvoice;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create invoice');
    }
  }, []);

  return {
    invoices,
    loading,
    error,
    hasMore,
    refresh,
    fetchMore,
    updateInvoice,
    createInvoice
  };
}

/**
 * Hook for getting invoices by status
 */
export function useInvoicesByStatus(status: string) {
  const filterFormula = `{Status} = "${status}"`;
  return useInvoices({
    filter: filterFormula
  });
}

/**
 * Hook for getting pending invoices
 */
export function usePendingInvoices() {
  return useInvoicesByStatus('pending');
}

/**
 * Hook for getting invoices that need coding (missing fields)
 */
export function useInvoicesNeedingCoding() {
  const filterFormula = `OR({Project} = BLANK(), {Task} = BLANK(), {Cost Center} = BLANK(), {GL Account} = BLANK())`;
  return useInvoices({
    filter: filterFormula
  });
}

/**
 * Hook for invoice counts by status
 * Updated to fetch from Invoices table
 */
export function useInvoiceCounts() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCounts = useCallback(async () => {
    if (loading) return; // Prevent concurrent requests
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/airtable/Invoices?baseId=${BASE_ID}&fields=Status`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const statusCounts: Record<string, number> = {};

      // Count by status (Invoices table status values)
      data.records.forEach((record: AirtableRecord) => {
        const status = record.fields.Status || 'Pending';
        // Normalize to lowercase for counting
        const normalizedStatus = status.toLowerCase();
        statusCounts[normalizedStatus] = (statusCounts[normalizedStatus] || 0) + 1;
      });

      // Calculate derived counts
      const total = data.records.length;
      const needsCoding = data.records.filter((record: AirtableRecord) => {
        const fields = record.fields;
        // Check if key fields are missing (Invoices table fields)
        return !fields['Vendor Name'] || !fields['Invoice Number'] || !fields['Amount'];
      }).length;

      setCounts({
        total,
        pending: statusCounts.pending || 0,
        open: statusCounts.matched || 0, // Map matched to open for backward compatibility
        reviewed: statusCounts.queued || 0, // Map queued to reviewed
        approved: statusCounts.queued || 0, // Map queued to approved for backward compatibility
        rejected: statusCounts.error || 0, // Map error to rejected
        exported: statusCounts.exported || 0,
        needsCoding
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch invoice counts');
    } finally {
      setLoading(false);
    }
  }, [loading]);

  useEffect(() => {
    fetchCounts();
  }, []); // Only fetch once on mount

  return {
    counts,
    loading,
    error,
    refresh: fetchCounts
  };
}