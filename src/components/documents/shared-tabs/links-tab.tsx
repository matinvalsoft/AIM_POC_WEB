"use client";

import React from 'react';
import { ViewItemModal } from '@/components/documents/view-item-modal';
import { Badge } from '@/components/base/badges/badges';
import { ButtonUtility } from '@/components/base/buttons/button-utility';
import { File01, Receipt, Mail01, MessageChatCircle, FileCheck02, CreditCard01, Package, LinkExternal01, Attachment01 } from '@untitledui/icons';
import type { Invoice } from "@/types/documents";
import type { AirtableFile } from "@/lib/airtable/files-hooks";
import { getErrorCodeDefinition, getErrorDisplayName } from "@/lib/error-codes";


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
    errorCode?: string; // Add errorCode for files
}

interface LinksTabProps {
    linkedItems: LinkedItem[];
    // Raw document data for proper viewing
    files?: AirtableFile[];
    emails?: any[];
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
            case 'delivery-ticket':
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
        case 'delivery-ticket':
            return Package;
        default:
            return File01;
    }
};

const getStatusColor = (item: LinkedItem): 'success' | 'warning' | 'error' | 'gray' | 'brand' => {
    // If there's an error code (for files), use its color
    if (item.errorCode) {
        const errorDef = getErrorCodeDefinition(item.errorCode);
        if (errorDef) return errorDef.color;
    }
    
    // Map status based on item type and status value
    const status = item.status?.toLowerCase();
    
    switch (status) {
        // Success states
        case 'processed':
        case 'linked':
        case 'approved':
        case 'reviewed':
            return 'success';
        
        // Warning states
        case 'pending':
        case 'queued':
        case 'processing':
        case 'attention':
            return 'warning';
        
        // Error states
        case 'error':
        case 'rejected':
        case 'failed':
            return 'error';
        
        // Brand states
        case 'exported':
            return 'brand';
        
        // Default states
        case 'open':
        case 'unlinked':
        default:
            return 'gray';
    }
};

const getStatusDisplayName = (item: LinkedItem): string => {
    // If there's an error code (for files), use its display name
    if (item.errorCode) {
        return getErrorDisplayName(item.errorCode);
    }
    
    // Otherwise use the status with proper capitalization
    if (!item.status) return '';
    
    switch (item.status.toLowerCase()) {
        case 'open': return 'Open';
        case 'pending': return 'Pending';
        case 'processed': return 'Processed';
        case 'processing': return 'Processing';
        case 'queued': return 'Queued';
        case 'reviewed': return 'Reviewed';
        case 'approved': return 'Approved';
        case 'rejected': return 'Rejected';
        case 'exported': return 'Exported';
        case 'linked': return 'Linked';
        case 'unlinked': return 'Unlinked';
        case 'attention': return 'Needs Attention';
        case 'error': return 'Error';
        case 'failed': return 'Failed';
        default: return item.status;
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
        return parts.join(' • ') || '';
    }
    
    return '';
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
    const findDocumentData = (item: LinkedItem): Invoice | AirtableFile | any | undefined => {
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
                <div className="pb-2 border-b border-secondary">
                    <h4 className="text-sm font-medium text-primary">{title}</h4>
                </div>
            )}
            
            {linkedItems.length > 0 ? (
                <div className="space-y-3 w-full max-w-full">
                    {linkedItems.map((item) => {
                        const IconComponent = getIconForItemType(item);
                        const subtitle = formatItemSubtitle(item);
                        const statusColor = getStatusColor(item);
                        const statusDisplayName = getStatusDisplayName(item);
                        
                        return (
                            <div key={item.id} className="group flex items-start gap-3 p-3 border border-secondary rounded-lg hover:border-primary hover:shadow-sm transition-all duration-150 min-w-0">
                                <div className="flex-shrink-0 mt-0.5">
                                    <IconComponent className="w-5 h-5 text-tertiary group-hover:text-secondary transition-colors" />
                                </div>
                                
                                <div className="flex-1 min-w-0 overflow-hidden">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            {/* Title */}
                                            <h5 className="text-sm font-medium text-primary truncate">
                                                {item.name || item.id}
                                            </h5>
                                            
                                            {/* Subtitle */}
                                            {subtitle && (
                                                <p className="text-xs text-tertiary truncate mt-0.5">
                                                    {subtitle}
                                                </p>
                                            )}
                                            
                                            {/* Status Badge - on separate line */}
                                            {item.status && (
                                                <div className="mt-1.5">
                                                    <Badge size="sm" color={statusColor} type="color">
                                                        {statusDisplayName}
                                                    </Badge>
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
                                                trigger={
                                                    <ButtonUtility
                                                        size="xs"
                                                        color="tertiary"
                                                        icon={LinkExternal01}
                                                        tooltip="View document"
                                                    />
                                                }
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
                    <div className="mx-auto w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
                        <EmptyIcon className="w-6 h-6 text-quaternary" />
                    </div>
                    <p className="text-sm text-secondary font-medium mb-1">No Linked Items</p>
                    <p className="text-xs text-tertiary">{emptyStateMessage}</p>
                </div>
            )}
        </div>
    );
};
