"use client";

import { useState } from "react";
import { ListBox, ListBoxItem, type ListBoxItemProps } from "react-aria-components";
import { SearchLg, FilterLines, Mail01, Paperclip, CheckCircle, AlertCircle, AlertTriangle, LinkBroken01 } from "@untitledui/icons";
import { Input } from "@/components/base/input/input";
import { Badge } from "@/components/base/badges/badges";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { cx } from "@/utils/cx";
import type { AirtableEmail } from "@/lib/airtable/emails-hooks";

// Helper function to check if an email has blocking issues
const hasBlockingIssues = (email: AirtableEmail) => {
    // Emails need attention if they're in error state
    return email.status === 'Error';
};

interface CompactEmailsListProps {
    emails: AirtableEmail[];
    filteredEmails?: AirtableEmail[]; // Add optional filtered emails prop
    selectedEmailId?: string;
    onSelectionChange?: (emailId: string) => void;
    subView?: string;
    onSubViewChange?: (subView: string) => void;
    keyboardNav?: any;
}

const EmailItem = ({ value, className, ...otherProps }: ListBoxItemProps<AirtableEmail>) => {
    if (!value) return null;

    const getStatusColor = (status: AirtableEmail['status']) => {
        switch (status) {
            case 'Linked': return 'success';
            case 'Unlinked': return 'gray';
            case 'Error': return 'error';
            default: return 'gray';
        }
    };

    const formatDateTime = (date: Date) => {
        const now = new Date();
        const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
        
        if (diffInHours < 24) {
            return date.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true
            });
        } else {
            return date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric'
            });
        }
    };

    const truncateMiddle = (text: string, maxLength: number = 40) => {
        if (text.length <= maxLength) return text;
        const start = Math.ceil((maxLength - 3) / 2);
        const end = Math.floor((maxLength - 3) / 2);
        return `${text.slice(0, start)}...${text.slice(-end)}`;
    };

    const hasAttachments = (value.attachmentsCount || 0) > 0;
    const hasVendor = value.vendor && value.vendor.trim() !== '';

    return (
        <ListBoxItem
            textValue={`${value.subject} – ${value.fromEmail}`}
            {...otherProps}
            className={(state) =>
                cx(
                    "relative flex flex-col gap-2 border-b border-secondary py-3 px-4 cursor-pointer select-none",
                    state.isFocused && "outline-2 -outline-offset-2 outline-focus-ring",
                    state.isSelected && "bg-secondary",
                    typeof className === "function" ? className(state) : className,
                )
            }
        >
            {/* Line 1: Subject */}
            <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-primary truncate flex-1" title={value.subject}>
                    {truncateMiddle(value.subject, 35)}
                </span>
                <div className="flex items-center gap-1 flex-shrink-0">
                    {(value.relatedInvoices?.length || 0) === 0 && (
                        <LinkBroken01 className="w-4 h-4 text-tertiary" title="Not linked to documents" />
                    )}
                    {(value.attention && value.attention.trim() !== '') && (
                        <AlertTriangle className="w-4 h-4 text-fg-warning-primary" title="Needs attention" />
                    )}
                </div>
            </div>

            {/* Line 2: From Email • Date • Attachments */}
            <div className="flex items-center justify-between gap-2">
                {/* From email on the left */}
                <span className="text-xs text-tertiary truncate flex-1">
                    {value.fromEmail}
                </span>
                
                {/* Date and Attachments on the right */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-tertiary">
                        {formatDateTime(value.received)}
                    </span>
                    {hasAttachments && (
                        <div className="flex items-center gap-0.5">
                            <Paperclip className="w-3 h-3 text-tertiary" />
                            <span className="text-xs text-tertiary">{value.attachmentsCount}</span>
                        </div>
                    )}
                </div>
            </div>
        </ListBoxItem>
    );
};

export const CompactEmailsList = ({ 
    emails, 
    filteredEmails: propFilteredEmails,
    selectedEmailId, 
    onSelectionChange,
    subView = 'all',
    onSubViewChange,
    keyboardNav
}: CompactEmailsListProps) => {
    const [searchQuery, setSearchQuery] = useState("");

    const subViews = [
        { id: 'all', label: 'All', count: emails.length },
        { id: 'needs_attention', label: 'Needs Attention', count: emails.filter(email => hasBlockingIssues(email)).length },
        { id: 'linked', label: 'Linked', count: emails.filter(email => email.status === 'Linked').length },
        { id: 'unlinked', label: 'Unlinked', count: emails.filter(email => email.status === 'Unlinked').length },
        { id: 'error', label: 'Error', count: emails.filter(email => email.status === 'Error').length },
        { id: 'with_attachments', label: 'Has Attachments', count: emails.filter(email => (email.attachmentsCount || 0) > 0).length },
        { id: 'vendor_mapped', label: 'Vendor Mapped', count: emails.filter(email => email.vendor && email.vendor.trim() !== '').length },
    ];

    // Use filtered emails from props if provided, otherwise do our own filtering
    const baseEmails = propFilteredEmails || emails
        .filter(email => {
            // Apply sub-view filter
            switch (subView) {
                case 'needs_attention': return hasBlockingIssues(email);
                case 'linked': return email.status === 'Linked';
                case 'unlinked': return email.status === 'Unlinked';
                case 'error': return email.status === 'Error';
                case 'with_attachments': return (email.attachmentsCount || 0) > 0;
                case 'vendor_mapped': return email.vendor && email.vendor.trim() !== '';
                default: return true;
            }
        })
        .sort((a, b) => {
            // Sort by blocking issues first (most urgent)
            const aHasIssues = hasBlockingIssues(a);
            const bHasIssues = hasBlockingIssues(b);
            
            if (aHasIssues && !bHasIssues) return -1;
            if (!aHasIssues && bHasIssues) return 1;
            
            // Then by status priority (Error -> Unlinked -> Linked)
            const statusPriority = { 'Error': 3, 'Unlinked': 2, 'Linked': 1 };
            const aPriority = statusPriority[a.status] || 0;
            const bPriority = statusPriority[b.status] || 0;
            
            if (aPriority !== bPriority) {
                return bPriority - aPriority;
            }
            
            // Then by received date (most recent first)
            return b.received.getTime() - a.received.getTime();
        });

    // Apply only search filtering if we have a search query
    const finalEmails = baseEmails.filter(email => {
        // Apply search filter
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            email.subject.toLowerCase().includes(query) ||
            (email.fromName || '').toLowerCase().includes(query) ||
            email.fromEmail.toLowerCase().includes(query) ||
            (email.vendor || '').toLowerCase().includes(query)
        );
    });

    return (
        <div className="w-80 max-w-xs border-r border-secondary bg-primary flex flex-col flex-shrink-0 h-full">
            {/* Header */}
            <div className="px-4 py-4 border-b border-secondary flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-primary">
                            Emails
                        </h2>
                        <Badge size="sm" color="gray" type="color">
                            {finalEmails.length}
                        </Badge>
                    </div>
                    
                    {/* Filter Dropdown */}
                    <Dropdown.Root>
                        <ButtonUtility
                            icon={FilterLines}
                            size="sm"
                            color="secondary"
                            tooltip="Filter emails"
                        />
                        <Dropdown.Popover>
                            <Dropdown.Menu
                                selectedKeys={[subView]}
                                onSelectionChange={(keys) => {
                                    const selectedKey = Array.from(keys).at(0) as string;
                                    onSubViewChange?.(selectedKey);
                                }}
                            >
                                {subViews.map((view) => (
                                    <Dropdown.Item
                                        key={view.id}
                                        id={view.id}
                                        label={view.label}
                                        addon={view.count > 0 ? view.count.toString() : undefined}
                                    />
                                ))}
                            </Dropdown.Menu>
                        </Dropdown.Popover>
                    </Dropdown.Root>
                </div>
                
                {/* Current Filter */}
                {subView !== 'all' && (
                    <div className="mb-3">
                        <span className="text-xs text-tertiary font-medium">
                            {subViews.find(v => v.id === subView)?.label}
                        </span>
                    </div>
                )}
                
                {/* Search */}
                <Input
                    ref={keyboardNav?.searchInputRef}
                    icon={SearchLg}
                    placeholder="Search emails"
                    size="sm"
                    value={searchQuery}
                    onChange={(value) => setSearchQuery(String(value ?? ""))}
                    onFocus={keyboardNav?.handleInputFocus}
                    onBlur={keyboardNav?.handleInputBlur}
                />
            </div>

            {/* Emails List */}
            <div className="flex-1 overflow-y-auto">
                <ListBox
                    aria-label="Emails"
                    selectionMode="single"
                    items={finalEmails}
                    selectedKeys={selectedEmailId ? [selectedEmailId] : []}
                    onSelectionChange={(keys) => {
                        const selectedId = Array.from(keys).at(0) as string;
                        onSelectionChange?.(selectedId);
                    }}
                >
                    {(item) => <EmailItem key={item.id} value={item} />}
                </ListBox>

                {/* Empty State */}
                {finalEmails.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 px-4">
                        <div className="text-6xl mb-3">📧</div>
                        <h3 className="text-sm font-medium text-secondary mb-1">No emails found</h3>
                        <p className="text-xs text-tertiary text-center">
                            {searchQuery ? "Try adjusting your search" : "No emails available"}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
