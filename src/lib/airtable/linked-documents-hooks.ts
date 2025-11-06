/**
 * Hooks for fetching linked documents (files, emails) for invoices
 */

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAirtableRecords } from './hooks';
import type { AirtableFile } from './files-hooks';


const BASE_ID = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID || process.env.AIRTABLE_BASE_ID;

export interface LinkedDocuments {
    files: AirtableFile[];
    emails: any[]; // Deprecated - emails functionality was removed
    invoices: any[]; // TODO: Import proper Invoice type
    deliveryTickets: any[]; // TODO: Import proper DeliveryTicket type
    loading: boolean;
    error: string | null;
}

/**
 * Transform Airtable File record to AirtableFile for linked documents
 * Updated for new schema field names
 */
function transformFileRecord(record: any): AirtableFile {
    return {
        id: record.id,
        name: record.fields['FileName'] || record.fields['Name'] || '', // New field name
        uploadDate: record.fields['UploadDate'] || record.fields['Upload Date'] ? new Date(record.fields['UploadDate'] || record.fields['Upload Date']) : undefined,
        source: record.fields['Source'] || 'Upload',
        status: record.fields['Status'] || 'Queued',
        pages: record.fields['Pages'] || undefined,
        isDuplicate: (record.fields['Error Code'] === 'DUPLICATE_FILE') || record.fields['Is Duplicate'] || false,
        duplicateOf: [], // This field was removed from schema
        relatedInvoices: record.fields['Invoices'] || [], // Links to Invoices table
        activity: record.fields['Activity'] || [],
        relatedEmails: [], // Emails no longer exist
        fileHash: record.fields['FileHash'] || record.fields['File Hash'],
        errorCode: record.fields['Error Code'],
        errorDescription: record.fields['Error Description'],
        errorLink: record.fields['Error Link'],
        isLinked: (record.fields['Invoices'] || []).length > 0,
        createdAt: record.createdTime ? new Date(record.createdTime) : undefined,
        updatedAt: record.fields['Modified At'] || record.fields['ModifiedAt'] ? new Date(record.fields['Modified At'] || record.fields['ModifiedAt']) : undefined,
    };
}

/**
 * Transform Airtable Email record to any for linked documents
 */
function transformEmailRecord(record: any): any {
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
 * Transform Airtable Delivery Ticket record for linked documents
 */
function transformDeliveryTicketRecord(record: any): any {
    return {
        id: record.id,
        invoiceNumber: record.fields['Invoice Number'] || '',
        vendorName: record.fields['Vendor'] || '',
        vendorCode: record.fields['Vendor Code'] || '',
        amount: record.fields['Amount'] || 0,
        invoiceDate: record.fields['Date'] ? new Date(record.fields['Date']) : new Date(),
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
 * Transform Airtable Invoice record for linked documents
 * Updated for new Invoices table field names
 */
function transformInvoiceRecord(record: any): any {
    return {
        id: record.id,
        invoiceNumber: record.fields['Invoice Number'] || '',
        vendorName: record.fields['Vendor Name'] || '',
        vendorCode: record.fields['VendId'] || '',
        amount: record.fields['Amount'] || 0,
        invoiceDate: record.fields['Date'] ? new Date(record.fields['Date']) : new Date(),
        status: record.fields['Status'] || 'Pending',
        glAccount: undefined, // GL Account is in POInvoiceDetails
        createdAt: record.createdTime ? new Date(record.createdTime) : undefined,
        updatedAt: record.fields['Modified At'] ? new Date(record.fields['Modified At']) : undefined,
    };
}

/**
 * Hook to fetch linked documents for any document type (invoice, email, file)
 */
export function useLinkedDocuments(documentId?: string, documentType?: 'invoice' | 'delivery-ticket' | 'file'): LinkedDocuments {
    const [files, setFiles] = useState<AirtableFile[]>([]);
    const [emails, setEmails] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]); // TODO: Import proper Invoice type
    const [deliveryTickets, setDeliveryTickets] = useState<any[]>([]); // TODO: Import proper DeliveryTicket type
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchLinkedDocuments = useCallback(async (id: string, docType: 'invoice' | 'delivery-ticket' | 'file') => {
        setLoading(true);
        setError(null);

        try {
            // First, fetch all records and find the one with the matching ID
            // This works around the RECORD_ID() filter issue
            let currentDocResponse;
            
            switch (docType) {
                case 'invoice':
                    // Fetch from Invoices table (primary entity)
                    currentDocResponse = await fetch(`/api/airtable/Invoices?baseId=${BASE_ID}&pageSize=100`);
                    break;
                case 'delivery-ticket':
                    // DEPRECATED: Delivery Tickets table no longer exists - treat as invoice
                    console.warn('Delivery Tickets table deprecated, treating as Invoices');
                    currentDocResponse = await fetch(`/api/airtable/Invoices?baseId=${BASE_ID}&pageSize=100`);
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
            let linkedDeliveryTicketIds: string[] = [];

            switch (docType) {
                case 'invoice':
                    // For invoices: get IDs from Files field
                    linkedFileIds = fields['Files'] || [];
                    // Emails field no longer exists
                    linkedEmailIds = [];
                    break;
                case 'delivery-ticket':
                    // DEPRECATED: Delivery tickets no longer exist
                    linkedFileIds = fields['Files'] || [];
                    linkedEmailIds = [];
                    break;
                case 'file':
                    // For files: get IDs from Invoices field (multipleRecordLinks)
                    linkedInvoiceIds = fields['Invoices'] || [];
                    // Delivery Tickets no longer exist
                    linkedDeliveryTicketIds = [];
                    // Emails field no longer exists
                    linkedEmailIds = [];
                    break;
            }

            console.log(`Debug: Found ${docType} record:`, currentDoc.id);
            console.log(`Debug: Linked file IDs:`, linkedFileIds);
            console.log(`Debug: Linked email IDs:`, linkedEmailIds);
            console.log(`Debug: Linked invoice IDs:`, linkedInvoiceIds);
            console.log(`Debug: Linked delivery ticket IDs:`, linkedDeliveryTicketIds);

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

            // Emails table was removed - always return empty response
            promises.push(Promise.resolve({ ok: true, json: () => Promise.resolve({ records: [] }) }));

            // Fetch invoices by ID if we have any (using Invoices table)
            if (linkedInvoiceIds.length > 0) {
                console.log(`Debug: Fetching invoices for IDs:`, linkedInvoiceIds);
                promises.push(
                    fetch(`/api/airtable/Invoices?baseId=${BASE_ID}&pageSize=100`)
                );
            } else {
                promises.push(Promise.resolve({ ok: true, json: () => Promise.resolve({ records: [] }) }));
            }

            // DEPRECATED: Delivery tickets no longer exist - always return empty
            promises.push(Promise.resolve({ ok: true, json: () => Promise.resolve({ records: [] }) }));

            const [filesResponse, emailsResponse, invoicesResponse, deliveryTicketsResponse] = await Promise.all(promises);

            if (!filesResponse.ok) {
                throw new Error(`Failed to fetch files: ${('status' in filesResponse) ? filesResponse.status : 'Unknown error'}`);
            }
            // Skip email response validation since emails were removed
            if (invoicesResponse && 'status' in invoicesResponse && !invoicesResponse.ok) {
                throw new Error(`Failed to fetch invoices: ${invoicesResponse.status}`);
            }
            // Skip delivery tickets validation since they were removed

            const [filesData, emailsData, invoicesData, deliveryTicketsData] = await Promise.all([
                filesResponse.json(),
                emailsResponse.json(),
                invoicesResponse ? invoicesResponse.json() : Promise.resolve({ records: [] }),
                deliveryTicketsResponse ? deliveryTicketsResponse.json() : Promise.resolve({ records: [] })
            ]);

            // Filter the fetched records to only include the ones we actually want
            const filteredFiles = filesData.records.filter((record: any) => linkedFileIds.includes(record.id));
            const filteredEmails = emailsData.records.filter((record: any) => linkedEmailIds.includes(record.id));
            const filteredInvoices = invoicesData.records.filter((record: any) => linkedInvoiceIds.includes(record.id));
            const filteredDeliveryTickets = deliveryTicketsData.records.filter((record: any) => linkedDeliveryTicketIds.includes(record.id));

            const transformedFiles = filteredFiles.map(transformFileRecord);
            const transformedEmails = filteredEmails.map(transformEmailRecord);
            const transformedInvoices = filteredInvoices.map(transformInvoiceRecord);
            const transformedDeliveryTickets = filteredDeliveryTickets.map(transformDeliveryTicketRecord);

            console.log(`Debug: Fetched ${transformedFiles.length} files, ${transformedEmails.length} emails, ${transformedInvoices.length} invoices, and ${transformedDeliveryTickets.length} delivery tickets for ${docType} ${id}`);
            console.log(`Debug: Files:`, transformedFiles);
            console.log(`Debug: Emails:`, transformedEmails);
            console.log(`Debug: Invoices:`, transformedInvoices);
            console.log(`Debug: Delivery Tickets:`, transformedDeliveryTickets);

            setFiles(transformedFiles);
            setEmails(transformedEmails);
            setInvoices(transformedInvoices);
            setDeliveryTickets(transformedDeliveryTickets);

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
            setDeliveryTickets([]);
            setError(null);
        }
    }, [documentId, documentType, fetchLinkedDocuments]);

    return {
        files,
        emails,
        invoices,
        deliveryTickets,
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
    // Emails functionality was removed - return empty results
    return { 
        emails: [], 
        loading: false, 
        error: null 
    };
}

/**
 * Combined hook for getting all document links for any document type (including transformed data for LinksTab)
 */
export function useDocumentLinks(documentId?: string, documentType?: 'invoice' | 'delivery-ticket' | 'file') {
    const { files, emails, invoices, deliveryTickets, loading, error } = useLinkedDocuments(documentId, documentType);

    const linkedItems = useMemo(() => {
        const items: Array<{
            id: string;
            name: string;
            type: string;
            status?: string;
            uploadDate?: Date;
            size?: number;
            errorCode?: string;
            received?: Date;
            subject?: string;
            fromEmail?: string;
        }> = [];

        // Add files
        files.forEach(file => {
            items.push({
                id: file.id,
                name: file.name,
                type: 'file',
                status: file.status,
                uploadDate: file.uploadDate,
                size: file.pages ? file.pages * 1024 : undefined, // Rough size estimate based on pages
                errorCode: file.errorCode,
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

        // Add delivery tickets
        deliveryTickets.forEach(deliveryTicket => {
            items.push({
                id: deliveryTicket.id,
                name: deliveryTicket.invoiceNumber || `Delivery Ticket ${deliveryTicket.id}`,
                type: 'delivery-ticket',
                status: deliveryTicket.status,
                received: deliveryTicket.invoiceDate,
                subject: `${deliveryTicket.vendorName} - ${deliveryTicket.invoiceNumber}`,
                fromEmail: deliveryTicket.vendorName,
            });
        });

        console.log(`Debug: useDocumentLinks created ${items.length} linked items:`, items.map(i => `${i.type}: ${i.name}`));
        return items;
    }, [files, emails, invoices, deliveryTickets]);

    return {
        linkedItems,
        files,
        emails,
        invoices,
        deliveryTickets,
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
 * Hook for email document links - deprecated since emails were removed
 */
export function useEmailLinks(emailId?: string) {
    // Emails functionality was removed - return empty results
    return { 
        linkedItems: [], 
        files: [], 
        emails: [], 
        invoices: [], 
        deliveryTickets: [],
        loading: false, 
        error: null 
    };
}

/**
 * Hook for file document links
 */
export function useFileLinks(fileId?: string) {
    return useDocumentLinks(fileId, 'file');
}
