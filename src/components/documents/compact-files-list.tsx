"use client";

import { useState } from "react";
import { ListBox, ListBoxItem, type ListBoxItemProps } from "react-aria-components";
import { SearchLg, AlertTriangle, ChevronDown, FilterLines, File01, Mail01, Upload01, Link01, FileCheck02, Copy03, Copy07, AlertCircle, LinkBroken01 } from "@untitledui/icons";
import { Input } from "@/components/base/input/input";
import { Badge } from "@/components/base/badges/badges";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { cx } from "@/utils/cx";
import type { AirtableFile } from "@/lib/airtable/files-hooks";

// Helper function to check if a file has blocking issues
const hasBlockingIssues = (file: AirtableFile) => {
    // Files need attention if they're in attention state or are duplicates
    return file.status === 'Attention' || file.isDuplicate;
};

interface CompactFilesListProps {
    files: AirtableFile[];
    filteredFiles?: AirtableFile[]; // Add optional filtered files prop
    selectedFileId?: string;
    onSelectionChange?: (fileId: string) => void;
    subView?: string;
    onSubViewChange?: (subView: string) => void;
    keyboardNav?: any;
}

const FileItem = ({ value, className, ...otherProps }: ListBoxItemProps<AirtableFile>) => {
    if (!value) return null;

    const getStatusColor = (status: AirtableFile['status']) => {
        switch (status) {
            case 'Processed': return 'success';
            case 'Processing': return 'warning';
            case 'Queued': return 'gray';
            case 'Attention': return 'warning';
            case 'Error': return 'error';
            default: return 'gray';
        }
    };

    const getSourceIcon = (source: AirtableFile['source']) => {
        return source === 'Email' ? Mail01 : Upload01;
    };



    const formatDate = (date: Date | undefined) => {
        if (!date) return '';
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric'
        });
    };

    const formatCurrency = (amount?: number) => {
        if (!amount) return '';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const truncateMiddle = (text: string, maxLength: number = 30) => {
        if (text.length <= maxLength) return text;
        const start = Math.ceil((maxLength - 3) / 2);
        const end = Math.floor((maxLength - 3) / 2);
        return `${text.slice(0, start)}...${text.slice(-end)}`;
    };

    const SourceIcon = getSourceIcon(value.source);
    const linkedCount = (value.relatedInvoices?.length || 0);
    
    // Check if file is linked to non-email documents (invoices, POs, etc.)
    const isLinkedToNonEmailDocs = linkedCount > 0; // For now, just checking invoices
    const shouldShowUnlinkedIcon = !isLinkedToNonEmailDocs;

    return (
        <ListBoxItem
            textValue={`${value.name} – ${value.status}`}
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
            {/* Line 1: File Name */}
            <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-primary truncate flex-1" title={value.name}>
                    {truncateMiddle(value.name, 30)}
                </span>
                <div className="flex items-center gap-1 flex-shrink-0">
                    {shouldShowUnlinkedIcon && (
                        <LinkBroken01 className="w-4 h-4 text-tertiary" title="Not linked to documents" />
                    )}
                    {value.isDuplicate ? (
                        <Copy07 className="w-4 h-4 text-fg-error-primary" title="Duplicate file" />
                    ) : hasBlockingIssues(value) && (
                        <AlertTriangle className="w-4 h-4 text-fg-warning-primary" title="Needs attention" />
                    )}
                </div>
            </div>

            {/* Line 2: Date • Status */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    {value.uploadDate && (
                        <span className="text-xs text-tertiary">
                            {formatDate(value.uploadDate)}
                        </span>
                    )}
                </div>
                
                {/* Status Badge */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge size="sm" color={getStatusColor(value.status)} type="color">
                        {value.status}
                    </Badge>
                </div>
            </div>
        </ListBoxItem>
    );
};

export const CompactFilesList = ({ 
    files, 
    filteredFiles: propFilteredFiles,
    selectedFileId, 
    onSelectionChange,
    subView = 'all',
    onSubViewChange,
    keyboardNav
}: CompactFilesListProps) => {
    const [searchQuery, setSearchQuery] = useState("");

    const subViews = [
        { id: 'all', label: 'All', count: files.length },
        { id: 'needs_attention', label: 'Needs Attention', count: files.filter(file => hasBlockingIssues(file)).length },
        { id: 'queued', label: 'Queued', count: files.filter(file => file.status === 'Queued').length },
        { id: 'processing', label: 'Processing', count: files.filter(file => file.status === 'Processing').length },
        { id: 'processed', label: 'Processed', count: files.filter(file => file.status === 'Processed').length },
        { id: 'error', label: 'Error', count: files.filter(file => file.status === 'Error').length },
        { id: 'linked', label: 'Linked', count: files.filter(file => file.isLinked).length },
        { id: 'duplicates', label: 'Duplicates', count: files.filter(file => file.isDuplicate).length },
    ];

    // Use filtered files from props if provided, otherwise do our own filtering
    const baseFiles = propFilteredFiles || files
        .filter(file => {
            // Apply sub-view filter
            switch (subView) {
                case 'needs_attention': return hasBlockingIssues(file);
                case 'queued': return file.status === 'Queued';
                case 'processing': return file.status === 'Processing';
                case 'processed': return file.status === 'Processed';
                case 'error': return file.status === 'Error';
                case 'linked': return file.isLinked;
                case 'duplicates': return file.isDuplicate;
                default: return true;
            }
        })
        .sort((a, b) => {
            // Sort by blocking issues first (most urgent)
            const aHasIssues = hasBlockingIssues(a);
            const bHasIssues = hasBlockingIssues(b);
            
            if (aHasIssues && !bHasIssues) return -1;
            if (!aHasIssues && bHasIssues) return 1;
            
            // Then by status priority (Error -> Attention -> Processing -> Queued -> Processed)
            const statusPriority = { 'Error': 5, 'Attention': 4, 'Processing': 3, 'Queued': 2, 'Processed': 1 };
            const aPriority = statusPriority[a.status] || 0;
            const bPriority = statusPriority[b.status] || 0;
            
            if (aPriority !== bPriority) {
                return bPriority - aPriority;
            }
            
            // Then by upload date (most recent first)
            if (a.uploadDate && b.uploadDate) {
                return b.uploadDate.getTime() - a.uploadDate.getTime();
            }
            if (a.uploadDate && !b.uploadDate) return -1;
            if (!a.uploadDate && b.uploadDate) return 1;
            
            // Finally by name
            return a.name.localeCompare(b.name);
        });

    // Apply only search filtering if we have a search query
    const finalFiles = baseFiles.filter(file => {
        // Apply search filter
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return file.name.toLowerCase().includes(query);
    });

    return (
        <div className="w-80 max-w-xs border-r border-secondary bg-primary flex flex-col flex-shrink-0 h-full">
            {/* Header */}
            <div className="px-4 py-4 border-b border-secondary flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-primary">
                            Files
                        </h2>
                        <Badge size="sm" color="gray" type="color">
                            {finalFiles.length}
                        </Badge>
                    </div>
                    
                    {/* Filter Dropdown */}
                    <Dropdown.Root>
                        <ButtonUtility
                            icon={FilterLines}
                            size="sm"
                            color="secondary"
                            tooltip="Filter files"
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
                    placeholder="Search files"
                    size="sm"
                    value={searchQuery}
                    onChange={(value) => setSearchQuery(String(value ?? ""))}
                    onFocus={keyboardNav?.handleInputFocus}
                    onBlur={keyboardNav?.handleInputBlur}
                />
            </div>

            {/* Files List */}
            <div className="flex-1 overflow-y-auto">
                <ListBox
                    aria-label="Files"
                    selectionMode="single"
                    items={finalFiles}
                    selectedKeys={selectedFileId ? [selectedFileId] : []}
                    onSelectionChange={(keys) => {
                        const selectedId = Array.from(keys).at(0) as string;
                        onSelectionChange?.(selectedId);
                    }}
                >
                    {(item) => <FileItem key={item.id} value={item} />}
                </ListBox>

                {/* Empty State */}
                {finalFiles.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 px-4">
                        <div className="text-6xl mb-3">📁</div>
                        <h3 className="text-sm font-medium text-secondary mb-1">No files found</h3>
                        <p className="text-xs text-tertiary text-center">
                            {searchQuery ? "Try adjusting your search" : "No files available"}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
