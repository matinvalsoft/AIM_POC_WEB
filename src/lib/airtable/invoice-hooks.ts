/**
 * Specialized hooks for invoice data management with Airtable
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { transformAirtableToInvoice, transformInvoiceToAirtable } from './transforms';
import type { Invoice } from '@/types/documents';
import type { AirtableRecord } from './types';

const BASE_ID = 'appUKa7frdeLLPBr4';

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
 * Hook for managing invoices with their lines in a single optimized request
 */
export function useInvoices(options: UseInvoicesOptions = {}): UseInvoicesResult {
  const { filter, sort, autoFetch = true } = options;
  
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  // Memoize the fetch function to prevent infinite loops
  const fetchInvoicesWithLines = useCallback(async () => {
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

      // Fetch invoices and lines in parallel
      const [invoicesResponse, linesResponse] = await Promise.all([
        fetch(`/api/airtable/Invoices?${queryParams}`),
        fetch(`/api/airtable/Invoice%20Lines?baseId=${BASE_ID}&pageSize=100&sort[0][field]=Line Number&sort[0][direction]=asc`)
      ]);

      if (!invoicesResponse.ok) {
        throw new Error(`Failed to fetch invoices: ${invoicesResponse.status}`);
      }
      if (!linesResponse.ok) {
        throw new Error(`Failed to fetch invoice lines: ${linesResponse.status}`);
      }

      const [invoicesData, linesData] = await Promise.all([
        invoicesResponse.json(),
        linesResponse.json()
      ]);

      // Transform and combine the data
      const transformedInvoices = invoicesData.records.map((invoiceRecord: AirtableRecord) => {
        // Find lines that belong to this invoice
        const invoiceLines = linesData.records.filter((lineRecord: AirtableRecord) => {
          const invoiceIds = lineRecord.fields['Invoice'] as string[] | undefined;
          return invoiceIds && invoiceIds.includes(invoiceRecord.id);
        });

        return transformAirtableToInvoice(invoiceRecord, invoiceLines);
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
  }, [filter, sort, loading]); // Dependencies memoized properly

  // Auto-fetch only once when component mounts or key dependencies change
  useEffect(() => {
    if (autoFetch) {
      fetchInvoicesWithLines();
    }
  }, [autoFetch]); // Only depend on autoFetch, not the function itself

  /**
   * Manual refresh function
   */
  const refresh = useCallback(async () => {
    await fetchInvoicesWithLines();
  }, [fetchInvoicesWithLines]);

  /**
   * Fetch more invoices (pagination) - placeholder for now
   */
  const fetchMore = useCallback(async () => {
    // TODO: Implement pagination with offset
    console.log('Fetch more not implemented yet');
  }, []);

  /**
   * Update an invoice
   */
  const updateInvoice = useCallback(async (invoiceId: string, updates: Partial<Invoice>) => {
    try {
      const airtableFields = transformInvoiceToAirtable(updates);
      
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
   * Create a new invoice
   */
  const createInvoice = useCallback(async (invoice: Partial<Invoice>): Promise<Invoice> => {
    try {
      const airtableFields = transformInvoiceToAirtable(invoice);
      
      const response = await fetch(`/api/airtable/Invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: airtableFields }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create invoice: ${response.status}`);
      }

      const data = await response.json();
      const createdInvoice = transformAirtableToInvoice(data.records[0]);
      
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

      // Count by status
      data.records.forEach((record: AirtableRecord) => {
        const status = record.fields.Status || 'open';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      // Calculate derived counts
      const total = data.records.length;
      const needsCoding = data.records.filter((record: AirtableRecord) => {
        const fields = record.fields;
        return !fields.Project || !fields.Task || !fields['Cost Center'] || !fields['GL Account'];
      }).length;

      setCounts({
        total,
        open: statusCounts.open || 0,
        pending: statusCounts.pending || 0,
        approved: statusCounts.approved || 0,
        rejected: statusCounts.rejected || 0,
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