/**
 * Specialized hooks for delivery ticket data management with Airtable
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { transformAirtableToDeliveryTicket, transformDeliveryTicketToAirtable } from './transforms';
import type { DeliveryTicket } from '@/types/documents';
import type { AirtableRecord } from './types';

const BASE_ID = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID || process.env.AIRTABLE_BASE_ID;

interface UseDeliveryTicketsOptions {
  filter?: string;
  sort?: Array<{ field: string; direction: 'asc' | 'desc' }>;
  autoFetch?: boolean;
}

interface UseDeliveryTicketsResult {
  deliveryTickets: DeliveryTicket[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  refresh: () => Promise<void>;
  fetchMore: () => Promise<void>;
  updateDeliveryTicket: (ticketId: string, updates: Partial<DeliveryTicket>) => Promise<void>;
  createDeliveryTicket: (ticket: Partial<DeliveryTicket>) => Promise<DeliveryTicket>;
}

/**
 * Hook for managing delivery tickets
 */
export function useDeliveryTickets(options: UseDeliveryTicketsOptions = {}): UseDeliveryTicketsResult {
  const { filter, sort, autoFetch = true } = options;
  
  const [deliveryTickets, setDeliveryTickets] = useState<DeliveryTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  // Memoize the fetch function to prevent infinite loops
  const fetchDeliveryTickets = useCallback(async () => {
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

      // Fetch delivery tickets
      const response = await fetch(`/api/airtable/Delivery%20Ticket?${queryParams}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch delivery tickets: ${response.status}`);
      }

      const data = await response.json();

      // Transform the data
      const transformedTickets = data.records.map((record: AirtableRecord) => {
        return transformAirtableToDeliveryTicket(record);
      });

      setDeliveryTickets(transformedTickets);
      setHasMore(!!data.offset);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch delivery tickets';
      setError(message);
      console.error('Error fetching delivery tickets:', err);
    } finally {
      setLoading(false);
    }
  }, [filter, sort, loading]); // Dependencies memoized properly

  // Auto-fetch only once when component mounts or key dependencies change
  useEffect(() => {
    if (autoFetch) {
      fetchDeliveryTickets();
    }
  }, [autoFetch]); // Only depend on autoFetch, not the function itself

  /**
   * Manual refresh function
   */
  const refresh = useCallback(async () => {
    await fetchDeliveryTickets();
  }, [fetchDeliveryTickets]);

  /**
   * Fetch more delivery tickets (pagination) - placeholder for now
   */
  const fetchMore = useCallback(async () => {
    // TODO: Implement pagination with offset
    console.log('Fetch more not implemented yet');
  }, []);

  /**
   * Update a delivery ticket
   */
  const updateDeliveryTicket = useCallback(async (ticketId: string, updates: Partial<DeliveryTicket>) => {
    try {
      const airtableFields = transformDeliveryTicketToAirtable(updates);
      
      const response = await fetch(`/api/airtable/Delivery%20Ticket`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: [{ id: ticketId, fields: airtableFields }]
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update delivery ticket: ${response.status}`);
      }

      // Optimistically update local state
      setDeliveryTickets(prevTickets => 
        prevTickets.map(ticket => 
          ticket.id === ticketId 
            ? { ...ticket, ...updates }
            : ticket
        )
      );

    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update delivery ticket');
    }
  }, []);

  /**
   * Create a new delivery ticket
   */
  const createDeliveryTicket = useCallback(async (ticket: Partial<DeliveryTicket>): Promise<DeliveryTicket> => {
    try {
      const airtableFields = transformDeliveryTicketToAirtable(ticket);
      
      const response = await fetch(`/api/airtable/Delivery%20Ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: airtableFields }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create delivery ticket: ${response.status}`);
      }

      const data = await response.json();
      const createdTicket = transformAirtableToDeliveryTicket(data.records[0]);
      
      // Add to local state
      setDeliveryTickets(prevTickets => [createdTicket, ...prevTickets]);
      
      return createdTicket;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create delivery ticket');
    }
  }, []);

  return {
    deliveryTickets,
    loading,
    error,
    hasMore,
    refresh,
    fetchMore,
    updateDeliveryTicket,
    createDeliveryTicket
  };
}

/**
 * Hook for getting delivery tickets by status
 */
export function useDeliveryTicketsByStatus(status: string) {
  const filterFormula = `{Status} = "${status}"`;
  return useDeliveryTickets({
    filter: filterFormula
  });
}

/**
 * Hook for getting pending delivery tickets
 */
export function usePendingDeliveryTickets() {
  return useDeliveryTicketsByStatus('pending');
}

/**
 * Hook for getting delivery tickets that need coding (missing fields)
 */
export function useDeliveryTicketsNeedingCoding() {
  const filterFormula = `OR({ERP Attribute 1} = BLANK(), {ERP Attribute 2} = BLANK(), {ERP Attribute 3} = BLANK(), {GL Account} = BLANK())`;
  return useDeliveryTickets({
    filter: filterFormula
  });
}

/**
 * Hook for delivery ticket counts by status
 */
export function useDeliveryTicketCounts() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCounts = useCallback(async () => {
    if (loading) return; // Prevent concurrent requests
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/airtable/Delivery%20Ticket?baseId=${BASE_ID}&fields=Status`);
      
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
        return !fields['ERP Attribute 1'] || !fields['ERP Attribute 2'] || !fields['ERP Attribute 3'] || !fields['GL Account'];
      }).length;

      setCounts({
        total,
        open: statusCounts.open || 0,
        reviewed: statusCounts.reviewed || 0,
        pending: statusCounts.pending || 0,
        approved: statusCounts.approved || 0,
        rejected: statusCounts.rejected || 0,
        exported: statusCounts.exported || 0,
        needsCoding
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch delivery ticket counts');
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

