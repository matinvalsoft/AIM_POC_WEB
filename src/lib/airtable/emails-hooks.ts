/**
 * Specialized React hooks for Emails table operations
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createAirtableClient, buildFilter, filters } from './index';
import type { AirtableAttachment } from './types';

const BASE_ID = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID || process.env.AIRTABLE_BASE_ID;

// Types that match the Airtable Emails table schema
export interface AirtableEmail {
    id: string;
    subject: string;
    fromName?: string;
    fromEmail: string;
    body?: string;
    received: Date;
    to: 'ap@yourcompany.com';
    status: 'Linked' | 'Unlinked' | 'Error';
    attachmentsCount?: number;
    attachments?: AirtableAttachment[]; // Actual email file attachments (multipleAttachments)
    vendor?: string;
    relatedFiles?: string[];
    threadId?: string;
    messageId?: string;
    files?: string[]; // New field for additional file linking
    attention?: string; // Notes requiring attention
    relatedInvoices?: string[]; // Links to invoice records
    // Computed fields
    createdAt?: Date;
    updatedAt?: Date;
}

export interface EmailFilters {
    status?: string[];
    hasAttachments?: boolean;
    vendorMapped?: boolean;
    errors?: boolean;
    threaded?: boolean;
}

export interface UseEmailsOptions {
    autoFetch?: boolean;
    initialFilters?: EmailFilters;
}

export interface UseEmailsResult {
    emails: AirtableEmail[];
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    updateEmail: (emailId: string, updates: Partial<AirtableEmail>) => Promise<void>;
    createEmail: (emailData: Partial<AirtableEmail>) => Promise<AirtableEmail>;
    deleteEmail: (emailId: string) => Promise<void>;
    markAsProcessed: (emailId: string, reason?: string) => Promise<void>;
    markAsIgnored: (emailId: string, reason: string) => Promise<void>;
    retryProcessing: (emailId: string) => Promise<void>;
    linkToDocument: (emailId: string, documentId: string, documentType: string) => Promise<void>;
    unlinkFromDocument: (emailId: string, documentId: string) => Promise<void>;
}

export interface UseEmailCountsResult {
    counts: {
        total: number;
        linked: number;
        unlinked: number;
        error: number;
        withAttachments: number;
        withoutAttachments: number;
        vendorMapped: number;
        threaded: number;
    };
    loading: boolean;
}

/**
 * Transform Airtable record to AirtableEmail
 */
function transformAirtableRecord(record: any): AirtableEmail {
    return {
        id: record.id,
        subject: record.fields['Subject'] || '',
        fromName: record.fields['From Name'] || undefined,
        fromEmail: record.fields['From Email'] || '',
        body: record.fields['Body'] || undefined,
        received: record.fields['Received'] ? new Date(record.fields['Received']) : new Date(),
        to: record.fields['To'] || 'ap@yourcompany.com',
        // Status calculated based on links since Status field doesn't exist in Airtable
        status: (record.fields['Invoices']?.length || 0) > 0 ? 'Linked' : 'Unlinked',
        attachmentsCount: record.fields['Attachments Count'] || undefined,
        attachments: record.fields['Attachments'] || [], // Actual email file attachments
        vendor: record.fields['Vendor'] || undefined,
        relatedFiles: record.fields['Files'] || [], // Changed from 'Related Files'
        threadId: record.fields['Thread ID'] || undefined,
        messageId: record.fields['Message ID'] || undefined,
        files: record.fields['Files'] || [],
        attention: record.fields['Attention'] || undefined,
        relatedInvoices: record.fields['Invoices'] || [], // Changed from 'Related Invoices'
        createdAt: record.createdTime ? new Date(record.createdTime) : undefined,
        updatedAt: record.fields['Last Modified'] ? new Date(record.fields['Last Modified']) : undefined,
    };
}

/**
 * Transform AirtableEmail to Airtable update format
 */
function transformToAirtableUpdate(email: Partial<AirtableEmail>): any {
    const fields: any = {};
    
    if (email.subject !== undefined) fields['Subject'] = email.subject;
    if (email.fromName !== undefined) fields['From Name'] = email.fromName;
    if (email.fromEmail !== undefined) fields['From Email'] = email.fromEmail;
    if (email.body !== undefined) fields['Body'] = email.body;
    if (email.received !== undefined) fields['Received'] = email.received.toISOString();
    if (email.to !== undefined) fields['To'] = email.to;
    if (email.status !== undefined) fields['Status'] = email.status;
    if (email.attachmentsCount !== undefined) fields['Attachments Count'] = email.attachmentsCount;
    if (email.vendor !== undefined) fields['Vendor'] = email.vendor;
    if (email.threadId !== undefined) fields['Thread ID'] = email.threadId;
    if (email.messageId !== undefined) fields['Message ID'] = email.messageId;
    
    return { fields };
}

/**
 * Build filter for emails based on EmailFilters
 */
function buildEmailFilter(emailFilters: EmailFilters): string {
    const filterParts: string[] = [];
    
    if (emailFilters.status && emailFilters.status.length > 0) {
        if (emailFilters.status.length === 1) {
            filterParts.push(filters.equals('Status', emailFilters.status[0]));
        } else {
            const statusFilters = emailFilters.status.map(status => filters.equals('Status', status));
            filterParts.push(filters.or(...statusFilters));
        }
    }
    
    if (emailFilters.hasAttachments === true) {
        filterParts.push(filters.greaterThan('Attachments Count', 0));
    } else if (emailFilters.hasAttachments === false) {
        filterParts.push(filters.or(
            filters.equals('Attachments Count', 0),
            filters.isEmpty('Attachments Count')
        ));
    }
    
    if (emailFilters.vendorMapped === true) {
        filterParts.push(filters.not(filters.isEmpty('Vendor')));
    } else if (emailFilters.vendorMapped === false) {
        filterParts.push(filters.isEmpty('Vendor'));
    }
    
    if (emailFilters.threaded === true) {
        filterParts.push(filters.not(filters.isEmpty('Thread ID')));
    } else if (emailFilters.threaded === false) {
        filterParts.push(filters.isEmpty('Thread ID'));
    }
    
    return filterParts.length > 0 ? buildFilter(filters.and(...filterParts)) : '';
}

/**
 * Main hook for Emails operations
 */
export function useEmails(options: UseEmailsOptions = {}): UseEmailsResult {
    const { autoFetch = false, initialFilters } = options;
    const [emails, setEmails] = useState<AirtableEmail[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // We don't need the client here since we're using API routes directly

    const fetchEmails = useCallback(async (emailFilters?: EmailFilters) => {
        setLoading(true);
        setError(null);
        
        try {
            const queryParams = new URLSearchParams({
                baseId: BASE_ID,
                'sort[0][field]': 'Received',
                'sort[0][direction]': 'desc',
                pageSize: '100'
            });

            const filterFormula = emailFilters ? buildEmailFilter(emailFilters) : '';
            if (filterFormula) {
                queryParams.append('filterByFormula', filterFormula);
            }

            const response = await fetch(`/api/airtable/Emails?${queryParams}`);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `HTTP ${response.status}`);
            }
            
            const data = await response.json();
            const transformedEmails = data.records.map(transformAirtableRecord);
            setEmails(transformedEmails);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch emails';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, []);

    const refresh = useCallback(() => fetchEmails(initialFilters), [fetchEmails, initialFilters]);

    const updateEmail = useCallback(async (emailId: string, updates: Partial<AirtableEmail>) => {
        try {
            const updateData = transformToAirtableUpdate(updates);
            const response = await fetch(`/api/airtable/Emails`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    records: [{ id: emailId, ...updateData }]
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `HTTP ${response.status}`);
            }
            
            // Update local state optimistically
            setEmails(currentEmails => 
                currentEmails.map(email => 
                    email.id === emailId ? { ...email, ...updates } : email
                )
            );
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update email';
            throw new Error(message);
        }
    }, []);

    const createEmail = useCallback(async (emailData: Partial<AirtableEmail>): Promise<AirtableEmail> => {
        try {
            const createData = transformToAirtableUpdate(emailData);
            const response = await fetch(`/api/airtable/Emails`, {
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
            const newEmail = transformAirtableRecord(data.records[0]);
            
            // Update local state
            setEmails(currentEmails => [newEmail, ...currentEmails]);
            
            return newEmail;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to create email';
            throw new Error(message);
        }
    }, []);

    const deleteEmail = useCallback(async (emailId: string) => {
        try {
            const response = await fetch(`/api/airtable/Emails`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: [emailId] })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `HTTP ${response.status}`);
            }
            
            // Update local state
            setEmails(currentEmails => currentEmails.filter(email => email.id !== emailId));
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to delete email';
            throw new Error(message);
        }
    }, []);

    const markAsProcessed = useCallback(async (emailId: string, reason?: string) => {
        await updateEmail(emailId, { 
            status: 'Linked',
            ...(reason && { body: (emails.find(e => e.id === emailId)?.body || '') + `\n\nProcessed: ${reason}` })
        });
    }, [emails, updateEmail]);

    const markAsIgnored = useCallback(async (emailId: string, reason: string) => {
        await updateEmail(emailId, { 
            status: 'Error',
            body: (emails.find(e => e.id === emailId)?.body || '') + `\n\nIgnored: ${reason}`
        });
    }, [emails, updateEmail]);

    const retryProcessing = useCallback(async (emailId: string) => {
        await updateEmail(emailId, { status: 'Unlinked' });
    }, [updateEmail]);

    const linkToDocument = useCallback(async (emailId: string, documentId: string, documentType: string) => {
        const email = emails.find(e => e.id === emailId);
        if (!email) throw new Error('Email not found');

        // This would require more complex logic to determine which relation field to update
        // For now, we'll just mark as linked
        await updateEmail(emailId, { status: 'Linked' });
    }, [emails, updateEmail]);

    const unlinkFromDocument = useCallback(async (emailId: string, documentId: string) => {
        const email = emails.find(e => e.id === emailId);
        if (!email) throw new Error('Email not found');

        // Logic to unlink from document would go here
        // For now, we'll update status based on remaining links
        await updateEmail(emailId, { status: 'Unlinked' });
    }, [emails, updateEmail]);

    // Auto-fetch on mount if enabled
    useEffect(() => {
        if (autoFetch) {
            fetchEmails(initialFilters);
        }
    }, [autoFetch, fetchEmails, initialFilters]);

    return {
        emails,
        loading,
        error,
        refresh,
        updateEmail,
        createEmail,
        deleteEmail,
        markAsProcessed,
        markAsIgnored,
        retryProcessing,
        linkToDocument,
        unlinkFromDocument,
    };
}

/**
 * Hook for email counts and statistics
 */
export function useEmailCounts(): UseEmailCountsResult {
    const [counts, setCounts] = useState({
        total: 0,
        linked: 0,
        unlinked: 0,
        error: 0,
        withAttachments: 0,
        withoutAttachments: 0,
        vendorMapped: 0,
        threaded: 0,
    });
    const [loading, setLoading] = useState(true);

    const fetchCounts = useCallback(async () => {
        try {
            const response = await fetch(`/api/airtable/Emails?baseId=${BASE_ID}&pageSize=100`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            const emails = data.records.map(transformAirtableRecord);
            
            const newCounts = {
                total: emails.length,
                linked: emails.filter(e => (e.relatedInvoices?.length || 0) > 0).length,
                unlinked: emails.filter(e => (e.relatedInvoices?.length || 0) === 0).length,
                error: emails.filter(e => e.attention && e.attention.trim() !== '').length,
                withAttachments: emails.filter(e => (e.attachmentsCount || 0) > 0).length,
                withoutAttachments: emails.filter(e => (e.attachmentsCount || 0) === 0).length,
                vendorMapped: emails.filter(e => e.vendor && e.vendor.trim() !== '').length,
                threaded: emails.filter(e => e.threadId && e.threadId.trim() !== '').length,
            };
            
            setCounts(newCounts);
        } catch (err) {
            console.error('Failed to fetch email counts:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCounts();
    }, [fetchCounts]);

    return { counts, loading };
}
