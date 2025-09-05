/**
 * Specialized React hooks for Files table operations
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createAirtableClient, buildFilter, filters } from './index';
import type { AirtableAttachment } from './types';

const BASE_ID = 'appUKa7frdeLLPBr4';

// Types that match the Airtable Files table schema
export interface AirtableFile {
    id: string;
    name: string;
    uploadDate?: Date;
    source: 'Email' | 'Upload';
    status: 'Queued' | 'Processing' | 'Processed' | 'Attention';
    pages?: number;
    isDuplicate: boolean;
    duplicateOf?: string[]; // Now a record link array
    relatedInvoices?: string[];
    activity?: string[];
    relatedEmails?: string[];
    attachments?: AirtableAttachment[]; // File attachments from Airtable
    // Computed fields
    isLinked: boolean; // Calculated field based on relationships
    createdAt?: Date;
    updatedAt?: Date;
}

export interface FileFilters {
    status?: string[];
    source?: string[];
    duplicates?: boolean;
    isLinked?: boolean;
}

export interface UseFilesOptions {
    autoFetch?: boolean;
    initialFilters?: FileFilters;
}

export interface UseFilesResult {
    files: AirtableFile[];
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    updateFile: (fileId: string, updates: Partial<AirtableFile>) => Promise<void>;
    createFile: (fileData: Partial<AirtableFile>) => Promise<AirtableFile>;
    deleteFile: (fileId: string) => Promise<void>;
    archiveFile: (fileId: string) => Promise<void>;
    linkToDocument: (fileId: string, documentId: string, documentType: string) => Promise<void>;
    unlinkFromDocument: (fileId: string, documentId: string) => Promise<void>;
}

export interface UseFileCountsResult {
    counts: {
        total: number;
        queued: number;
        processed: number;
        attention: number;
        bySource: {
            email: number;
            upload: number;
        };
        duplicates: number;
        linked: number;
    };
    loading: boolean;
}

/**
 * Transform Airtable record to AirtableFile
 */
function transformAirtableRecord(record: any): AirtableFile {
    const relatedInvoices = record.fields['Related Invoices'] || [];
    const relatedEmails = record.fields['Related Emails'] || [];
    // Calculate isLinked based on non-email document links (invoices, POs, etc.)
    const isLinked = relatedInvoices.length > 0;
    
    return {
        id: record.id,
        name: record.fields['Name'] || '',
        uploadDate: record.fields['Upload Date'] ? new Date(record.fields['Upload Date']) : undefined,
        source: record.fields['Source'] || 'Upload',
        status: record.fields['Status'] || 'Queued',
        pages: record.fields['Pages'] || undefined,
        isDuplicate: record.fields['Is Duplicate'] || false,
        duplicateOf: record.fields['Duplicate Of'] || [],
        relatedInvoices,
        activity: record.fields['Activity'] || [],
        relatedEmails,
        attachments: record.fields['Attachments'] || [], // File attachments from Airtable
        isLinked,
        createdAt: record.createdTime ? new Date(record.createdTime) : undefined,
        updatedAt: record.fields['Last Modified'] ? new Date(record.fields['Last Modified']) : undefined,
    };
}

/**
 * Transform AirtableFile to Airtable update format
 */
function transformToAirtableUpdate(file: Partial<AirtableFile>): any {
    const fields: any = {};
    
    if (file.name !== undefined) fields['Name'] = file.name;
    if (file.uploadDate !== undefined) fields['Upload Date'] = file.uploadDate?.toISOString().split('T')[0];
    if (file.source !== undefined) fields['Source'] = file.source;
    if (file.status !== undefined) fields['Status'] = file.status;
    if (file.pages !== undefined) fields['Pages'] = file.pages;
    if (file.isDuplicate !== undefined) fields['Is Duplicate'] = file.isDuplicate;
    if (file.duplicateOf !== undefined) fields['Duplicate Of'] = file.duplicateOf;
    
    return { fields };
}

/**
 * Build filter for files based on FileFilters
 */
function buildFileFilter(fileFilters: FileFilters): string {
    const filterParts: string[] = [];
    
    if (fileFilters.status && fileFilters.status.length > 0) {
        if (fileFilters.status.length === 1) {
            filterParts.push(filters.equals('Status', fileFilters.status[0]));
        } else {
            const statusFilters = fileFilters.status.map(status => filters.equals('Status', status));
            filterParts.push(filters.or(...statusFilters));
        }
    }
    
    if (fileFilters.source && fileFilters.source.length > 0) {
        if (fileFilters.source.length === 1) {
            filterParts.push(filters.equals('Source', fileFilters.source[0]));
        } else {
            const sourceFilters = fileFilters.source.map(source => filters.equals('Source', source));
            filterParts.push(filters.or(...sourceFilters));
        }
    }
    
    if (fileFilters.duplicates === true) {
        filterParts.push(filters.equals('Is Duplicate', 'TRUE'));
    } else if (fileFilters.duplicates === false) {
        filterParts.push(filters.equals('Is Duplicate', 'FALSE'));
    }
    
    if (fileFilters.isLinked === true) {
        filterParts.push(filters.or(
            filters.not(filters.isEmpty('Related Invoices')),
            filters.not(filters.isEmpty('Related Emails'))
        ));
    } else if (fileFilters.isLinked === false) {
        filterParts.push(filters.and(
            filters.isEmpty('Related Invoices'),
            filters.isEmpty('Related Emails')
        ));
    }
    
    return filterParts.length > 0 ? buildFilter(filters.and(...filterParts)) : '';
}

/**
 * Main hook for Files operations
 */
export function useFiles(options: UseFilesOptions = {}): UseFilesResult {
    const { autoFetch = false, initialFilters } = options;
    const [files, setFiles] = useState<AirtableFile[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // We don't need the client here since we're using API routes directly

    const fetchFiles = useCallback(async (fileFilters?: FileFilters) => {
        setLoading(true);
        setError(null);
        
        try {
            const queryParams = new URLSearchParams({
                baseId: BASE_ID,
                'sort[0][field]': 'Name',
                'sort[0][direction]': 'asc',
                pageSize: '100'
            });

            const filterFormula = fileFilters ? buildFileFilter(fileFilters) : '';
            if (filterFormula) {
                queryParams.append('filterByFormula', filterFormula);
            }

            const response = await fetch(`/api/airtable/Files?${queryParams}`);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `HTTP ${response.status}`);
            }
            
            const data = await response.json();
            const transformedFiles = data.records.map(transformAirtableRecord);
            setFiles(transformedFiles);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch files';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, []);

    const refresh = useCallback(() => fetchFiles(initialFilters), [fetchFiles, initialFilters]);

    const updateFile = useCallback(async (fileId: string, updates: Partial<AirtableFile>) => {
        try {
            const updateData = transformToAirtableUpdate(updates);
            const response = await fetch(`/api/airtable/Files`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    records: [{ id: fileId, ...updateData }]
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `HTTP ${response.status}`);
            }
            
            // Update local state optimistically
            setFiles(currentFiles => 
                currentFiles.map(file => 
                    file.id === fileId ? { ...file, ...updates } : file
                )
            );
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update file';
            throw new Error(message);
        }
    }, []);

    const createFile = useCallback(async (fileData: Partial<AirtableFile>): Promise<AirtableFile> => {
        try {
            const createData = transformToAirtableUpdate(fileData);
            const response = await fetch(`/api/airtable/Files`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    records: [createData]
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `HTTP ${response.status}`);
            }
            
            const data = await response.json();
            const newFile = transformAirtableRecord(data.records[0]);
            
            // Update local state
            setFiles(currentFiles => [...currentFiles, newFile]);
            
            return newFile;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to create file';
            throw new Error(message);
        }
    }, []);

    const deleteFile = useCallback(async (fileId: string) => {
        try {
            const response = await fetch(`/api/airtable/Files`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: [fileId] })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `HTTP ${response.status}`);
            }
            
            // Update local state
            setFiles(currentFiles => currentFiles.filter(file => file.id !== fileId));
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to delete file';
            throw new Error(message);
        }
    }, []);

    const archiveFile = useCallback(async (fileId: string) => {
        await updateFile(fileId, { status: 'Processed' }); // Archive means processed
    }, [updateFile]);

    const linkToDocument = useCallback(async (fileId: string, documentId: string, documentType: string) => {
        const file = files.find(f => f.id === fileId);
        if (!file) throw new Error('File not found');

        // Add to appropriate relation field based on document type
        if (documentType === 'invoices') {
            const currentInvoices = file.relatedInvoices || [];
            if (!currentInvoices.includes(documentId)) {
                await updateFile(fileId, {
                    relatedInvoices: [...currentInvoices, documentId],
                    status: 'Processed'
                });
            }
        }
        // Add more document types as needed
    }, [files, updateFile]);

    const unlinkFromDocument = useCallback(async (fileId: string, documentId: string) => {
        const file = files.find(f => f.id === fileId);
        if (!file) throw new Error('File not found');

        const updatedInvoices = (file.relatedInvoices || []).filter(id => id !== documentId);
        const isStillLinked = updatedInvoices.length > 0 || (file.relatedEmails && file.relatedEmails.length > 0);
        
        await updateFile(fileId, {
            relatedInvoices: updatedInvoices,
            status: isStillLinked ? 'Processed' : 'Queued'
        });
    }, [files, updateFile]);

    // Auto-fetch on mount if enabled
    useEffect(() => {
        if (autoFetch) {
            fetchFiles(initialFilters);
        }
    }, [autoFetch, fetchFiles, initialFilters]);

    return {
        files,
        loading,
        error,
        refresh,
        updateFile,
        createFile,
        deleteFile,
        archiveFile,
        linkToDocument,
        unlinkFromDocument,
    };
}

/**
 * Hook for file counts and statistics
 */
export function useFileCounts(): UseFileCountsResult {
    const [counts, setCounts] = useState({
        total: 0,
        queued: 0,
        processed: 0,
        attention: 0,
        bySource: {
            email: 0,
            upload: 0,
        },
        duplicates: 0,
        linked: 0,
    });
    const [loading, setLoading] = useState(true);

    const fetchCounts = useCallback(async () => {
        try {
            const response = await fetch(`/api/airtable/Files?baseId=${BASE_ID}&pageSize=100`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            const files = data.records.map(transformAirtableRecord);
            
            const newCounts = {
                total: files.length,
                queued: files.filter(f => f.status === 'Queued').length,
                processed: files.filter(f => f.status === 'Processed').length,
                attention: files.filter(f => f.status === 'Attention').length,
                bySource: {
                    email: files.filter(f => f.source === 'Email').length,
                    upload: files.filter(f => f.source === 'Upload').length,
                },
                duplicates: files.filter(f => f.isDuplicate).length,
                linked: files.filter(f => (f.relatedInvoices?.length || 0) > 0).length,
            };
            
            setCounts(newCounts);
        } catch (err) {
            console.error('Failed to fetch file counts:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCounts();
    }, []);

    return { counts, loading };
}
