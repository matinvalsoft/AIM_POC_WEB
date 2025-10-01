/**
 * Specialized hooks for Teams data management with Airtable
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Team, TeamRecord } from './schema-types';
import { TABLE_NAMES, FIELD_IDS } from './schema-types';

const BASE_ID = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID || process.env.AIRTABLE_BASE_ID;

interface UseTeamsOptions {
  autoFetch?: boolean;
}

interface UseTeamsResult {
  teams: (TeamRecord & { id: string })[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Transform Airtable Team record to our TeamRecord format with Airtable ID
 */
function transformAirtableToTeam(record: any): TeamRecord & { id: string } {
  const fields = record.fields || {};
  
  return {
    id: record.id, // Include the Airtable record ID for unique keys
    name: fields['Name'] || '', // Use human-readable field name
    fullName: fields['Full Name'] || '', // Use human-readable field name
    invoices: fields['Invoices'] || [], // Use human-readable field name
  };
}

/**
 * Hook for fetching Teams data from Airtable
 */
export function useTeams(options: UseTeamsOptions = {}): UseTeamsResult {
  const { autoFetch = true } = options;
  
  const [teams, setTeams] = useState<(TeamRecord & { id: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isRequestInFlight = useRef(false);

  const fetchTeams = useCallback(async () => {
    if (isRequestInFlight.current) return; // Prevent concurrent requests
    
    isRequestInFlight.current = true;
    setLoading(true);
    setError(null);

    try {
      // Build query parameters
      const params = new URLSearchParams({
        baseId: BASE_ID,
        pageSize: '100', // Teams table should be relatively small
      });

      const response = await fetch(`/api/airtable/${TABLE_NAMES.TEAMS}?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to fetch teams: ${response.status} ${errorData}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Transform the records
      const transformedTeams = (data.records || []).map(transformAirtableToTeam);
      
      // Keep Airtable's natural ordering (don't sort alphabetically)
      setTeams(transformedTeams);
    } catch (err) {
      console.error('Error fetching teams:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
      isRequestInFlight.current = false;
    }
  }, []); // Remove loading dependency to prevent infinite loops

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchTeams();
    }
  }, [autoFetch, fetchTeams]);

  return {
    teams,
    loading,
    error,
    refresh: fetchTeams,
  };
}
