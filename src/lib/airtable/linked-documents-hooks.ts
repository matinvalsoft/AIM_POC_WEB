/**
 * Hooks for fetching linked documents (files, emails) for invoices
 */

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAirtableRecords } from './hooks';
import type { AirtableFile } from './files-hooks';
import type { AirtableEmail } from './emails-hooks';

const BASE_ID = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID || process.env.AIRTABLE_BASE_ID || 'applERrhATK0OQtqg';

export interface LinkedDocuments {
    files: AirtableFile[];
    emails: AirtableEmail[];
    invoices: any[]; // TODO: Import proper Invoice type
    loading: boolean;
    error: string | null;
}

/**
 * Transform Airtable File record to AirtableFile for linked documents
 */
function transformFileRecord(record: any): AirtableFile {
    return {
        id: record.id,
        name: record.fields['Name'] || '',
        uploadDate: record.fields['Upload Date'] ? new Date(record.fields['Upload Date']) : undefined,
        source: record.fields['Source'] || 'Upload',
        status: record.fields['Status'] || 'Queued',
        pages: record.fields['Pages'] || undefined,
        isDuplicate: record.fields['Is Duplicate'] || false,
        duplicateOf: record.fields['Duplicate Of'] || [],
        relatedInvoices: record.fields['Related Invoices'] || [],
        activity: record.fields['Activity'] || [],
        relatedEmails: record.fields['Related Emails'] || [],
        isLinked: (record.fields['Related Invoices'] || []).length > 0,
        createdAt: record.createdTime ? new Date(record.createdTime) : undefined,
        updatedAt: record.fields['Last Modified'] ? new Date(record.fields['Last Modified']) : undefined,
    };
}

/**
 * Transform Airtable Email record to AirtableEmail for linked documents
 */
function transformEmailRecord(record: any): AirtableEmail {
    return {
        id: record.id,
        subject: record.fields['Subject'] || '',
        fromName: record.fields['From Name'] || undefined,
        fromEmail: record.fields['From Email'] || '',
        body: record.fields['Body'] || undefined,
        received: record.fields['Received'] ? new Date(record.fields['Received']) : new Date(),
        to: record.fields['To'] || 'ap@yourcompany.com',
        status: (record.fields['Related Invoices']?.length || 0) > 0 ? 'Linked' : 'Unlinked',
        attachmentsCount: record.fields['Attachments Count'] || undefined,
        vendor: record.fields['Vendor'] || undefined,
        relatedFiles: record.fields['Related Files'] || [],
        threadId: record.fields['Thread ID'] || undefined,
        messageId: record.fields['Message ID'] || undefined,
        files: record.fields['Files'] || [],
        attention: record.fields['Attention'] || undefined,
        relatedInvoices: record.fields['Related Invoices'] || [],
        createdAt: record.createdTime ? new Date(record.createdTime) : undefined,
        updatedAt: record.fields['Last Modified'] ? new Date(record.fields['Last Modified']) : undefined,
    };
}

/**
 * Transform Airtable Invoice record for linked documents
 */
function transformInvoiceRecord(record: any): any {
    return {
        id: record.id,
        invoiceNumber: record.fields['Invoice Number'] || '',
        vendorName: record.fields['Vendor'] || '',
        vendorCode: record.fields['Vendor Code'] || '',
        amount: record.fields['Amount'] || 0,
        invoiceDate: record.fields['Invoice Date'] ? new Date(record.fields['Invoice Date']) : new Date(),
        dueDate: record.fields['Due Date'] ? new Date(record.fields['Due Date']) : undefined,
        status: record.fields['Status'] || 'New',
        project: record.fields['Project (ISBN)'] || undefined,
        task: record.fields['Task'] || undefined,
        costCenter: record.fields['Cost Center'] || undefined,
        glAccount: record.fields['GL Account'] || undefined,
        createdAt: record.createdTime ? new Date(record.createdTime) : undefined,
        updatedAt: record.fields['Last Modified'] ? new Date(record.fields['Last Modified']) : undefined,
    };
}

/**
 * Hook to fetch linked documents for any document type (invoice, email, file)
 */
export function useLinkedDocuments(documentId?: string, documentType?: 'invoice' | 'email' | 'file'): LinkedDocuments {
    const [files, setFiles] = useState<AirtableFile[]>([]);
    const [emails, setEmails] = useState<AirtableEmail[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]); // TODO: Import proper Invoice type
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchLinkedDocuments = useCallback(async (id: string, docType: 'invoice' | 'email' | 'file') => {
        setLoading(true);
        setError(null);

        try {
            // First, fetch all records and find the one with the matching ID
            // This works around the RECORD_ID() filter issue
            let currentDocResponse;
            
            switch (docType) {
                case 'invoice':
                    currentDocResponse = await fetch(`/api/airtable/Invoices?baseId=${BASE_ID}&pageSize=100`);
                    break;
                case 'email':
                    currentDocResponse = await fetch(`/api/airtable/Emails?baseId=${BASE_ID}&pageSize=100`);
                    break;
                case 'file':
                    currentDocResponse = await fetch(`/api/airtable/Files?baseId=${BASE_ID}&pageSize=100`);
                    break;
            }

            if (!currentDocResponse.ok) {
                throw new Error(`Failed to fetch current document: ${currentDocResponse.status}`);
            }

            const currentDocData = await currentDocResponse.json();
            
            if (!currentDocData.records || currentDocData.records.length === 0) {
                throw new Error('No documents found');
            }
            
            // Find the specific record by ID
            const currentDoc = currentDocData.records.find((record: any) => record.id === id);
            
            if (!currentDoc) {
                throw new Error(`Document with ID ${id} not found`);
            }
            
            const fields = currentDoc.fields;

            // Get the IDs from the reference fields
            let linkedFileIds: string[] = [];
            let linkedEmailIds: string[] = [];
            let linkedInvoiceIds: string[] = [];

            switch (docType) {
                case 'invoice':
                    // For invoices: get IDs from Files and Emails fields
                    linkedFileIds = fields['Files'] || [];
                    linkedEmailIds = fields['Emails'] || [];
                    break;
                case 'email':
                    // For emails: get IDs from Files and Invoices fields
                    linkedFileIds = fields['Files'] || [];
                    linkedInvoiceIds = fields['Invoices'] || [];
                    break;
                case 'file':
                    // For files: get IDs from Invoices and Emails fields
                    linkedInvoiceIds = fields['Invoices'] || [];
                    linkedEmailIds = fields['Emails'] || [];
                    break;
            }

            console.log(`Debug: Found ${docType} record:`, currentDoc.id);
            console.log(`Debug: Linked file IDs:`, linkedFileIds);
            console.log(`Debug: Linked email IDs:`, linkedEmailIds);
            console.log(`Debug: Linked invoice IDs:`, linkedInvoiceIds);

            const promises = [];

            // Fetch files by ID if we have any
            if (linkedFileIds.length > 0) {
                console.log(`Debug: Fetching files for IDs:`, linkedFileIds);
                promises.push(
                    fetch(`/api/airtable/Files?baseId=${BASE_ID}&pageSize=100`)
                );
            } else {
                promises.push(Promise.resolve({ ok: true, json: () => Promise.resolve({ records: [] }) }));
            }

            // Fetch emails by ID if we have any
            if (linkedEmailIds.length > 0) {
                console.log(`Debug: Fetching emails for IDs:`, linkedEmailIds);
                promises.push(
                    fetch(`/api/airtable/Emails?baseId=${BASE_ID}&pageSize=100`)
                );
            } else {
                promises.push(Promise.resolve({ ok: true, json: () => Promise.resolve({ records: [] }) }));
            }

            // Fetch invoices by ID if we have any
            if (linkedInvoiceIds.length > 0) {
                console.log(`Debug: Fetching invoices for IDs:`, linkedInvoiceIds);
                promises.push(
                    fetch(`/api/airtable/Invoices?baseId=${BASE_ID}&pageSize=100`)
                );
            } else {
                promises.push(Promise.resolve({ ok: true, json: () => Promise.resolve({ records: [] }) }));
            }

            const [filesResponse, emailsResponse, invoicesResponse] = await Promise.all(promises);

            if (!filesResponse.ok) {
                throw new Error(`Failed to fetch files: ${filesResponse.status}`);
            }
            if (!emailsResponse.ok) {
                throw new Error(`Failed to fetch emails: ${emailsResponse.status}`);
            }
            if (invoicesResponse && !invoicesResponse.ok) {
                throw new Error(`Failed to fetch invoices: ${invoicesResponse.status}`);
            }

            const [filesData, emailsData, invoicesData] = await Promise.all([
                filesResponse.json(),
                emailsResponse.json(),
                invoicesResponse ? invoicesResponse.json() : Promise.resolve({ records: [] })
            ]);

            // Filter the fetched records to only include the ones we actually want
            const filteredFiles = filesData.records.filter((record: any) => linkedFileIds.includes(record.id));
            const filteredEmails = emailsData.records.filter((record: any) => linkedEmailIds.includes(record.id));
            const filteredInvoices = invoicesData.records.filter((record: any) => linkedInvoiceIds.includes(record.id));

            const transformedFiles = filteredFiles.map(transformFileRecord);
            const transformedEmails = filteredEmails.map(transformEmailRecord);
            const transformedInvoices = filteredInvoices.map(transformInvoiceRecord);

            console.log(`Debug: Fetched ${transformedFiles.length} files, ${transformedEmails.length} emails, and ${transformedInvoices.length} invoices for ${docType} ${id}`);
            console.log(`Debug: Files:`, transformedFiles);
            console.log(`Debug: Emails:`, transformedEmails);
            console.log(`Debug: Invoices:`, transformedInvoices);

            setFiles(transformedFiles);
            setEmails(transformedEmails);
            setInvoices(transformedInvoices);

        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch linked documents';
            setError(message);
            console.error('Error fetching linked documents:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch when document ID or type changes
    useEffect(() => {
        if (documentId && documentType) {
            fetchLinkedDocuments(documentId, documentType);
        } else {
            setFiles([]);
            setEmails([]);
            setInvoices([]);
            setError(null);
        }
    }, [documentId, documentType, fetchLinkedDocuments]);

    return {
        files,
        emails,
        invoices,
        loading,
        error
    };
}

/**
 * Hook to fetch Files linked to multiple invoices (for bulk operations)
 */
export function useLinkedFiles(invoiceIds: string[] = []) {
    const filterFormula = useMemo(() => {
        if (invoiceIds.length === 0) return '';
        
        if (invoiceIds.length === 1) {
            return `SEARCH("${invoiceIds[0]}", ARRAYJOIN({Related Invoices}, ","))`;
        }
        
        const conditions = invoiceIds.map(id => `SEARCH("${id}", ARRAYJOIN({Related Invoices}, ","))`);
        return `OR(${conditions.join(', ')})`;
    }, [invoiceIds]);

    const { records: fileRecords, loading, error } = useAirtableRecords(
        'Files',
        {
            filterByFormula: filterFormula,
            pageSize: 100
        },
        {
            baseId: BASE_ID,
            autoFetch: invoiceIds.length > 0
        }
    );

    const files = useMemo(() => 
        fileRecords.map(transformFileRecord), 
        [fileRecords]
    );

    return { files, loading, error };
}

/**
 * Hook to fetch Emails linked to multiple invoices (for bulk operations)
 */
export function useLinkedEmails(invoiceIds: string[] = []) {
    const filterFormula = useMemo(() => {
        if (invoiceIds.length === 0) return '';
        
        if (invoiceIds.length === 1) {
            return `SEARCH("${invoiceIds[0]}", ARRAYJOIN({Related Invoices}, ","))`;
        }
        
        const conditions = invoiceIds.map(id => `SEARCH("${id}", ARRAYJOIN({Related Invoices}, ","))`);
        return `OR(${conditions.join(', ')})`;
    }, [invoiceIds]);

    const { records: emailRecords, loading, error } = useAirtableRecords(
        'Emails',
        {
            filterByFormula: filterFormula,
            pageSize: 100,
            sort: [{ field: 'Received', direction: 'desc' }]
        },
        {
            baseId: BASE_ID,
            autoFetch: invoiceIds.length > 0
        }
    );

    const emails = useMemo(() => 
        emailRecords.map(transformEmailRecord), 
        [emailRecords]
    );

    return { emails, loading, error };
}

/**
 * Combined hook for getting all document links for any document type (including transformed data for LinksTab)
 */
export function useDocumentLinks(documentId?: string, documentType?: 'invoice' | 'email' | 'file') {
    const { files, emails, invoices, loading, error } = useLinkedDocuments(documentId, documentType);

    const linkedItems = useMemo(() => {
        const items = [];

        // Add files
        files.forEach(file => {
            items.push({
                id: file.id,
                name: file.name,
                type: 'file',
                status: file.status,
                uploadDate: file.uploadDate,
                size: file.pages ? file.pages * 1024 : undefined, // Rough size estimate based on pages
            });
        });

        // Add emails
        emails.forEach(email => {
            items.push({
                id: email.id,
                name: email.subject || `Email from ${email.fromName || email.fromEmail}`,
                type: 'email',
                status: email.status,
                received: email.received,
                subject: email.subject,
                fromEmail: email.fromEmail,
            });
        });

        // Add invoices
        invoices.forEach(invoice => {
            items.push({
                id: invoice.id,
                name: invoice.invoiceNumber || `Invoice ${invoice.id}`,
                type: 'invoice',
                status: invoice.status,
                received: invoice.invoiceDate,
                subject: `${invoice.vendorName} - ${invoice.invoiceNumber}`,
                fromEmail: invoice.vendorName,
            });
        });

        console.log(`Debug: useDocumentLinks created ${items.length} linked items:`, items.map(i => `${i.type}: ${i.name}`));
        return items;
    }, [files, emails, invoices]);

    return {
        linkedItems,
        files,
        emails,
        invoices,
        loading,
        error
    };
}

/**
 * Legacy hook for backwards compatibility with invoices
 */
export function useInvoiceLinks(invoiceId?: string) {
    return useDocumentLinks(invoiceId, 'invoice');
}

/**
 * Hook for email document links
 */
export function useEmailLinks(emailId?: string) {
    return useDocumentLinks(emailId, 'email');
}

/**
 * Hook for file document links
 */
export function useFileLinks(fileId?: string) {
    return useDocumentLinks(fileId, 'file');
}
