import type { AirtableAttachment } from '@/lib/airtable/types';

// Document Types
export type DocumentType = 'invoices' | 'files' | 'emails' | 'pos' | 'shipping' | 'bank';

export type DocumentStatus = 'open' | 'pending' | 'approved' | 'rejected' | 'exported';

// Completeness is computed on the fly in UI; keeping type for legacy references if any
export type CompletenessStatus = 'complete' | 'incomplete' | 'missing_fields';

// Base Document Interface
export interface BaseDocument {
    id: string;
    type: DocumentType;
    status: DocumentStatus;
    // completeness is not persisted; compute in UI
    missingFields?: string[];
    createdAt: Date;
    updatedAt: Date;
    lines?: DocumentLine[];
    linkedIds: string[];
}

// Document Line Interface
export interface DocumentLine {
    id: string;
    description: string;
    amount: number;
    lineNumber: number;
    // Optional line-level coding overrides
    project?: string;
    task?: string;
    costCenter?: string;
    glAccount?: string;
    // Airtable alignment: optional timestamps on line items
    createdAt?: Date;
    updatedAt?: Date;
}

// Removed LineCodingAllocation - simplified to use line-level coding fields directly

// Invoice Document
export interface Invoice extends BaseDocument {
    type: 'invoices';
    // Airtable structure - vendor split into separate fields
    vendorName: string;
    vendorCode?: string; // Optional/advisory only
    invoiceNumber: string;
    invoiceDate: Date;
    dueDate?: Date; // Optional in Airtable schema
    amount: number;
    // Coding mode control
    isMultilineCoding: boolean; // Controls whether to use invoice-level or line-level coding
    // Invoice-level coding fields (ignored when isMultilineCoding = true, but preserved)
    project?: string; // ISBN
    task?: string; // 30-code
    costCenter?: string;
    glAccount?: string; // 6-digit
    // Document processing
    rawTextOcr?: string; // OCR extracted text from original document
    // Rejection reason (only present when status is 'rejected')
    rejectionReason?: string;
    // Email attachments from linked emails (multipleLookupValues)
    attachments?: AirtableAttachment[];
    // Additional fields from schema
    storeNumber?: string; // Store identifier for multi-location businesses
    files?: string[]; // Links to file records
    emails?: string[]; // Links to email records
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

// Union type for all documents
export type Document = Invoice | PurchaseOrder | Shipping | BankStatement | FileDocument;

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

