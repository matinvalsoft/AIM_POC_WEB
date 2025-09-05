"use client";

import { useState } from "react";
import { ListBox, ListBoxItem, type ListBoxItemProps } from "react-aria-components";
import { SearchLg, AlertTriangle, ChevronDown, FilterLines } from "@untitledui/icons";
import { Input } from "@/components/base/input/input";
import { Badge } from "@/components/base/badges/badges";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { cx } from "@/utils/cx";
import type { Invoice } from "@/types/documents";
import { hasBlockingIssues, sortInvoicesByPriority } from "@/utils/invoice-validation";

interface CompactInvoiceListProps {
    invoices: Invoice[];
    filteredInvoices?: Invoice[]; // Add optional filtered invoices prop
    selectedInvoiceId?: string;
    onSelectionChange?: (invoiceId: string) => void;
    subView?: string;
    onSubViewChange?: (subView: string) => void;
    keyboardNav?: any;
}

const InvoiceItem = ({ value, className, ...otherProps }: ListBoxItemProps<Invoice>) => {
    if (!value) return null;

    const getStatusColor = (status: Invoice['status']) => {
        switch (status) {
            case 'approved': return 'success';
            case 'rejected': return 'error';
            case 'exported': return 'brand';
            case 'pending': return 'warning';
            case 'open': return 'gray';
            default: return 'gray';
        }
    };

    const getStatusDisplayName = (status: Invoice['status']) => {
        switch (status) {
            case 'open': return 'Open';
            case 'pending': return 'Pending';
            case 'approved': return 'Approved';
            case 'rejected': return 'Rejected';
            case 'exported': return 'Exported';
            default: return status;
        }
    };

    const formatCurrency = (amount: number, currency?: string) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency || 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric'
        });
    };

    const truncateMiddle = (text: string, maxLength: number = 20) => {
        if (text.length <= maxLength) return text;
        const start = Math.ceil((maxLength - 3) / 2);
        const end = Math.floor((maxLength - 3) / 2);
        return `${text.slice(0, start)}...${text.slice(-end)}`;
    };

    return (
        <ListBoxItem
            textValue={`${value.vendorName} – ${value.invoiceNumber}`}
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
            {/* Line 1: Vendor Name • Amount */}
            <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-primary truncate flex-1">
                    {value.vendorName}
                </span>
                <span className="text-sm font-medium text-primary flex-shrink-0">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value.amount)}
                </span>
            </div>

            {/* Line 2: Date • Badge + Completeness Icon */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-xs text-tertiary">
                        {formatDate(value.invoiceDate)}
                    </span>
                </div>
                
                {/* Badge and Completeness Icon (only show alert when not complete) */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge size="sm" color={getStatusColor(value.status)} type="color">
                        {getStatusDisplayName(value.status)}
                    </Badge>
                    {hasBlockingIssues(value) && (
                        <AlertTriangle className="w-4 h-4 text-fg-warning-primary" />
                    )}
                </div>
            </div>
        </ListBoxItem>
    );
};

export const CompactInvoiceList = ({ 
    invoices, 
    filteredInvoices: propFilteredInvoices,
    selectedInvoiceId, 
    onSelectionChange,
    subView = 'all',
    onSubViewChange,
    keyboardNav
}: CompactInvoiceListProps) => {
    const [searchQuery, setSearchQuery] = useState("");

    const subViews = [
        { id: 'all', label: 'All', count: invoices.length },
        { id: 'missing_fields', label: 'Missing Fields', count: invoices.filter(inv => hasBlockingIssues(inv)).length },
        { id: 'open', label: 'Open', count: invoices.filter(inv => inv.status === 'open').length },
        { id: 'pending', label: 'Pending', count: invoices.filter(inv => inv.status === 'pending').length },
        { id: 'approved', label: 'Approved', count: invoices.filter(inv => inv.status === 'approved').length },
        { id: 'rejected', label: 'Rejected', count: invoices.filter(inv => inv.status === 'rejected').length },
        { id: 'exported', label: 'Exported', count: invoices.filter(inv => inv.status === 'exported').length },
    ];

    // Use filtered invoices from props if provided, otherwise do our own filtering
    const baseInvoices = propFilteredInvoices || sortInvoicesByPriority(
        invoices
            .filter(invoice => {
                // Apply sub-view filter
                switch (subView) {
                    case 'missing_fields': return hasBlockingIssues(invoice);
                    case 'open': return invoice.status === 'open';
                    case 'pending': return invoice.status === 'pending';
                    case 'approved': return invoice.status === 'approved';
                    case 'rejected': return invoice.status === 'rejected';
                    case 'exported': return invoice.status === 'exported';
                    default: return true;
                }
            })
    );

    // Apply only search filtering if we have a search query
    const finalInvoices = baseInvoices.filter(invoice => {
        // Apply search filter
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            invoice.vendorName.toLowerCase().includes(query) ||
            invoice.invoiceNumber.toLowerCase().includes(query) ||
            invoice.vendorCode?.toLowerCase().includes(query)
        );
    });

    return (
        <div className="w-80 max-w-xs border-r border-secondary bg-primary flex flex-col flex-shrink-0 h-full">
            {/* Header */}
            <div className="px-4 py-4 border-b border-secondary flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-primary">
                            Invoices
                        </h2>
                        <Badge size="sm" color="gray" type="color">
                            {finalInvoices.length}
                        </Badge>
                    </div>
                    
                    {/* Filter Dropdown */}
                    <Dropdown.Root>
                        <ButtonUtility
                            icon={FilterLines}
                            size="sm"
                            color="secondary"
                            tooltip="Filter invoices"
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
                    placeholder="Search invoices"
                    size="sm"
                    value={searchQuery}
                    onChange={(value) => setSearchQuery(String(value ?? ""))}
                    onFocus={keyboardNav?.handleInputFocus}
                    onBlur={keyboardNav?.handleInputBlur}
                />
            </div>

            {/* Invoice List */}
            <div className="flex-1 overflow-y-auto">
                <ListBox
                    aria-label="Invoices"
                    selectionMode="single"
                    items={finalInvoices}
                    selectedKeys={selectedInvoiceId ? [selectedInvoiceId] : []}
                    onSelectionChange={(keys) => {
                        const selectedId = Array.from(keys).at(0) as string;
                        onSelectionChange?.(selectedId);
                    }}
                >
                    {(item) => <InvoiceItem key={item.id} value={item} />}
                </ListBox>

                {/* Empty State */}
                {finalInvoices.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 px-4">
                        <div className="text-6xl mb-3">📄</div>
                        <h3 className="text-sm font-medium text-secondary mb-1">No invoices found</h3>
                        <p className="text-xs text-tertiary text-center">
                            {searchQuery ? "Try adjusting your search" : "No invoices available"}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
