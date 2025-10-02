import type { AirtableAttachment } from '@/lib/airtable/types';

// Document Types
export type DocumentType = 'invoices' | 'files' | 'store-receivers' | 'delivery-tickets';

// Document Status (from Airtable schema)
export type DocumentStatus = 'open' | 'reviewed' | 'exported' | 'pending' | 'approved' | 'rejected';

// Completeness is computed on the fly in UI; keeping type for legacy references if any
export type CompletenessStatus = 'complete' | 'incomplete' | 'missing_fields';

// Base Document Interface
export interface BaseDocument {
    id: string;
    type: DocumentType;
    status: DocumentStatus;
    missingFields?: string[]; // Deprecated - kept for compatibility
    missingFieldsMessage?: string; // Server-side validation from Airtable
    createdAt: Date;
    updatedAt: Date;
    linkedIds: string[];
}

// Invoice Document
export interface Invoice extends BaseDocument {
    type: 'invoices';
    vendorName: string;
    vendorCode?: string;
    invoiceNumber: string;
    invoiceDate: Date;
    amount: number;
    glAccount?: string;
    rawTextOcr?: string;
    rejectionCode?: string;
    rejectionReason?: string;
    attachments?: AirtableAttachment[];
    files?: string[];
    team?: string[];
}

// Purchase Order Document
export interface PurchaseOrder extends BaseDocument {
    type: 'pos';
    supplier: {
        name: string;
        code: string;
    };
    poNumber: string;
    poDate: Date;
    totalAmount: number;
    linkedInvoices?: string[];
}

// Shipping/ASN Document
export interface Shipping extends BaseDocument {
    type: 'shipping';
    supplier: string;
    carrier?: string;
    asnNumber: string;
    shipDate: Date;
    totalQuantity: number;
    linkedPO?: string;
}

// Bank Statement Document
export interface BankStatement extends BaseDocument {
    type: 'bank';
    bank: string;
    accountNumber: string;
    periodStart: Date;
    periodEnd: Date;
    openingBalance: number;
    closingBalance: number;
    transactionCount: number;
    mappingProfile?: string;
}

// File Document
export interface FileDocument extends BaseDocument {
    type: 'files';
    title: string;
    fileType: string;
    source: 'email' | 'upload';
    receivedAt: Date;
    tags: FileTag[];
}

export type FileTag = 'duplicate' | 'corrupt' | 'unreadable' | 'password' | 'needs_split';

// Delivery Ticket Document
export interface DeliveryTicket extends BaseDocument {
    type: 'delivery-tickets';
    vendorName: string;
    vendorCode?: string;
    invoiceNumber: string;
    invoiceDate: Date;
    amount: number;
    glAccount?: string;
    rawTextOcr?: string;
    rejectionCode?: string;
    rejectionReason?: string;
    attachments?: AirtableAttachment[];
    files?: string[];
    team?: string[];
}

// Store Receiver Document
export interface StoreReceiver extends BaseDocument {
    type: 'store-receivers';
    documentNumber: string;
    vendorName: string;
    vendorCode?: string;
    invoiceNumber: string;
    invoiceDate: Date;
    amount: number;
    glAccount?: string;
    documentRawText?: string;
    rejectionCode?: string;
    rejectionReason?: string;
    attachments?: AirtableAttachment[];
    files?: string[];
    team?: string[];
}

// Union type for all documents
export type Document = Invoice | DeliveryTicket | StoreReceiver | PurchaseOrder | Shipping | BankStatement | FileDocument;

// Document Link
export interface DocumentLink {
    fromId: string;
    fromType: DocumentType;
    toId: string;
    toType: DocumentType;
    lineRefs?: number[];
    createdAt: Date;
}

// Sub-views for each document type
export interface DocumentSubView {
    id: string;
    label: string;
    count?: number;
    filter: (documents: Document[]) => Document[];
}

export const INVOICE_SUB_VIEWS: DocumentSubView[] = [
    {
        id: 'all',
        label: 'All',
        filter: () => true as any
    },
    {
        id: 'missing_fields',
        label: 'Missing Fields',
        filter: (docs: Document[]) => docs.filter(doc => doc.type === 'invoices' && (
            (doc as any).vendorName && (doc as any).invoiceNumber && (doc as any).amount
        ) === false)
    },
    {
        id: 'open',
        label: 'Open',
        filter: (docs: Document[]) => docs.filter(doc => doc.status === 'open')
    },
    {
        id: 'reviewed',
        label: 'Reviewed',
        filter: (docs: Document[]) => docs.filter(doc => doc.status === 'reviewed')
    },
    {
        id: 'pending',
        label: 'Pending',
        filter: (docs: Document[]) => docs.filter(doc => doc.status === 'pending')
    },
    {
        id: 'staged',
        label: 'Staged',
        filter: (docs: Document[]) => docs.filter(doc => doc.status === 'approved')
    },
    {
        id: 'exported',
        label: 'Exported',
        filter: (docs: Document[]) => docs.filter(doc => doc.status === 'exported')
    }
];

export const PO_SUB_VIEWS: DocumentSubView[] = [
    {
        id: 'all',
        label: 'All',
        filter: () => true as any
    },
    {
        id: 'missing_fields',
        label: 'Missing Fields',
        filter: (docs: Document[]) => docs.filter(doc => doc.missingFields && doc.missingFields.length > 0)
    },
    {
        id: 'unlinked',
        label: 'Unlinked',
        filter: (docs: Document[]) => docs.filter(doc => doc.linkedIds.length === 0)
    },
    {
        id: 'linked',
        label: 'Linked',
        filter: (docs: Document[]) => docs.filter(doc => doc.linkedIds.length > 0)
    }
];

export const SHIPPING_SUB_VIEWS: DocumentSubView[] = [
    {
        id: 'all',
        label: 'All',
        filter: () => true as any
    },
    {
        id: 'missing_fields',
        label: 'Missing Fields',
        filter: (docs: Document[]) => docs.filter(doc => doc.missingFields && doc.missingFields.length > 0)
    },
    {
        id: 'unlinked_po',
        label: 'Unlinked to PO',
        filter: (docs: Document[]) => docs.filter(doc => doc.linkedIds.length === 0)
    },
    {
        id: 'linked',
        label: 'Linked',
        filter: (docs: Document[]) => docs.filter(doc => doc.linkedIds.length > 0)
    }
];

export const BANK_SUB_VIEWS: DocumentSubView[] = [
    {
        id: 'all',
        label: 'All',
        filter: () => true as any
    },
    {
        id: 'missing_fields',
        label: 'Missing Fields',
        filter: (docs: Document[]) => docs.filter(doc => doc.missingFields && doc.missingFields.length > 0)
    },
    {
        id: 'unmapped',
        label: 'Unmapped',
        filter: (docs: Document[]) => docs.filter(doc => doc.type === 'bank' && !(doc as BankStatement).mappingProfile)
    },
    {
        id: 'mapped',
        label: 'Mapped',
        filter: (docs: Document[]) => docs.filter(doc => doc.type === 'bank' && (doc as BankStatement).mappingProfile)
    }
];

export const FILES_SUB_VIEWS: DocumentSubView[] = [
    {
        id: 'all',
        label: 'All',
        filter: () => true as any
    },
    {
        id: 'unlinked',
        label: 'Unlinked',
        filter: (docs: Document[]) => docs.filter(doc => doc.linkedIds.length === 0)
    },
    {
        id: 'linked',
        label: 'Linked',
        filter: (docs: Document[]) => docs.filter(doc => doc.linkedIds.length > 0)
    },
    {
        id: 'duplicate',
        label: 'Duplicate',
        filter: (docs: Document[]) => docs.filter(doc => 
            doc.type === 'files' && (doc as FileDocument).tags.includes('duplicate')
        )
    },
    {
        id: 'corrupt',
        label: 'Corrupt',
        filter: (docs: Document[]) => docs.filter(doc => 
            doc.type === 'files' && (doc as FileDocument).tags.includes('corrupt')
        )
    }
];

export const DELIVERY_TICKET_SUB_VIEWS: DocumentSubView[] = [
    {
        id: 'all',
        label: 'All',
        filter: () => true as any
    },
    {
        id: 'missing_fields',
        label: 'Missing Fields',
        filter: (docs: Document[]) => docs.filter(doc => doc.type === 'delivery-tickets' && (
            (doc as any).vendorName && (doc as any).invoiceNumber && (doc as any).amount
        ) === false)
    },
    {
        id: 'open',
        label: 'Open',
        filter: (docs: Document[]) => docs.filter(doc => doc.status === 'open')
    },
    {
        id: 'reviewed',
        label: 'Reviewed',
        filter: (docs: Document[]) => docs.filter(doc => doc.status === 'reviewed')
    },
    {
        id: 'pending',
        label: 'Pending',
        filter: (docs: Document[]) => docs.filter(doc => doc.status === 'pending')
    },
    {
        id: 'approved',
        label: 'Approved',
        filter: (docs: Document[]) => docs.filter(doc => doc.status === 'approved')
    },
    {
        id: 'rejected',
        label: 'Rejected',
        filter: (docs: Document[]) => docs.filter(doc => doc.status === 'rejected')
    },
    {
        id: 'exported',
        label: 'Exported',
        filter: (docs: Document[]) => docs.filter(doc => doc.status === 'exported')
    }
];

