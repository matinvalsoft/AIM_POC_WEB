"use client";

import React from 'react';
import { ViewItemModal } from '@/components/documents/view-item-modal';
import { File01, Receipt, Mail01, MessageChatCircle, FileCheck02, CreditCard01, Package, LinkExternal01, Attachment01 } from '@untitledui/icons';
import type { Invoice } from "@/types/documents";
import type { AirtableFile } from "@/lib/airtable/files-hooks";
import type { AirtableEmail } from "@/lib/airtable/emails-hooks";

interface LinkedItem {
    id: string;
    name: string;
    type?: string;
    url?: string;
    status?: string;
    received?: Date;
    subject?: string;
    fromEmail?: string;
    uploadDate?: Date;
    size?: number;
}

interface LinksTabProps {
    linkedItems: LinkedItem[];
    // Raw document data for proper viewing
    files?: AirtableFile[];
    emails?: AirtableEmail[];
    invoices?: Invoice[];
    onViewItem?: (item: LinkedItem) => void;
    emptyStateMessage?: string;
    emptyStateIcon?: React.ComponentType<{ className?: string }>;
    title?: string;
}

const getIconForItemType = (item: LinkedItem) => {
    // If item has a type field, use it
    if (item.type) {
        switch (item.type.toLowerCase()) {
            case 'email':
                return Mail01;
            case 'invoice':
                return Receipt;
            case 'po':
            case 'purchase order':
                return FileCheck02;
            case 'bank':
            case 'bank statement':
                return CreditCard01;
            case 'shipping':
            case 'shipment':
                return Package;
            case 'thread':
                return MessageChatCircle;
            case 'file':
            case 'pdf':
                return Attachment01;
            case 'image':
                return File01;
            case 'receipt':
                return Receipt;
            case 'statement':
                return CreditCard01;
            case 'tracking':
                return Package;
            default:
                return File01;
        }
    }
    
    // Fallback: try to parse from ID (existing invoice behavior)
    const [type] = item.id.split('-');
    switch (type?.toLowerCase()) {
        case 'email':
            return Mail01;
        case 'pdf':
        case 'file':
            return Attachment01;
        case 'thread':
            return MessageChatCircle;
        case 'invoice':
            return Receipt;
        case 'po':
            return FileCheck02;
        case 'bank':
            return CreditCard01;
        case 'shipping':
            return Package;
        default:
            return File01;
    }
};

const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
        case 'processed':
        case 'linked':
        case 'approved':
            return 'text-success-600';
        case 'pending':
        case 'queued':
            return 'text-warning-600';
        case 'attention':
        case 'error':
        case 'rejected':
            return 'text-error-600';
        case 'unlinked':
            return 'text-gray-500';
        default:
            return 'text-gray-600';
    }
};

const formatItemSubtitle = (item: LinkedItem): string => {
    if (item.type?.toLowerCase() === 'email') {
        if (item.subject) return item.subject;
        if (item.fromEmail) return `From: ${item.fromEmail}`;
        if (item.received) return `Received: ${item.received.toLocaleDateString()}`;
    }
    
    if (item.type?.toLowerCase() === 'file' || item.type?.toLowerCase() === 'pdf') {
        const parts = [];
        if (item.uploadDate) parts.push(item.uploadDate.toLocaleDateString());
        if (item.size) parts.push(`${(item.size / 1024).toFixed(1)}KB`);
        if (item.status) parts.push(item.status);
        return parts.join(' • ') || '';
    }
    
    return item.status || '';
};

export const LinksTab: React.FC<LinksTabProps> = ({ 
    linkedItems = [],
    files = [],
    emails = [],
    invoices = [],
    onViewItem,
    emptyStateMessage = "No linked documents",
    emptyStateIcon: EmptyIcon = LinkExternal01,
    title
}) => {
    
    // Helper function to find the actual document data for a linked item
    const findDocumentData = (item: LinkedItem): Invoice | AirtableFile | AirtableEmail | undefined => {
        // Try to match by ID in files
        const file = files.find(f => f.id === item.id);
        if (file) return file;
        
        // Try to match by ID in emails
        const email = emails.find(e => e.id === item.id);
        if (email) return email;
        
        // Try to match by ID in invoices
        const invoice = invoices.find(i => i.id === item.id);
        if (invoice) return invoice;
        
        return undefined;
    };
    return (
        <div className="space-y-4 w-full max-w-full">
            {title && (
                <div className="pb-2 border-b border-gray-200">
                    <h4 className="text-sm font-medium text-gray-900">{title}</h4>
                </div>
            )}
            
            {linkedItems.length > 0 ? (
                <div className="space-y-3 w-full max-w-full">
                    {linkedItems.map((item) => {
                        const IconComponent = getIconForItemType(item);
                        const subtitle = formatItemSubtitle(item);
                        const statusColor = getStatusColor(item.status);
                        
                        return (
                            <div key={item.id} className="group flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all duration-150 min-w-0">
                                <div className="flex-shrink-0 mt-0.5">
                                    <IconComponent className="w-5 h-5 text-gray-500 group-hover:text-gray-700 transition-colors" />
                                </div>
                                
                                <div className="flex-1 min-w-0 overflow-hidden">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <h5 className="text-sm font-medium text-gray-900 truncate">
                                                {item.name || item.id}
                                            </h5>
                                            {subtitle && (
                                                <p className="text-xs text-gray-500 truncate mt-0.5">
                                                    {subtitle}
                                                </p>
                                            )}
                                            {item.status && (
                                                <div className="mt-1">
                                                    <span className={`text-xs font-medium ${statusColor}`}>
                                                        {item.status}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="flex-shrink-0">
                                            <ViewItemModal
                                                item={{
                                                    id: item.id,
                                                    name: item.name || item.id,
                                                    type: item.type || 'Document'
                                                }}
                                                documentData={findDocumentData(item)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-8">
                    <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                        <EmptyIcon className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500 font-medium mb-1">No Linked Items</p>
                    <p className="text-xs text-gray-400">{emptyStateMessage}</p>
                </div>
            )}
        </div>
    );
};
