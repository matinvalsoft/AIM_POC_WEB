"use client";

import { ListBox, ListBoxItem, type ListBoxItemProps } from "react-aria-components";
import { AlertTriangle, FilterLines } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { cx } from "@/utils/cx";
import type { DeliveryTicket } from "@/types/documents";
import { DELIVERY_TICKET_SUB_VIEWS } from "@/types/documents";
import { hasBlockingIssues, sortInvoicesByPriority } from "@/utils/invoice-validation";

interface CompactDeliveryTicketListProps {
    deliveryTickets: DeliveryTicket[];
    filteredTickets?: DeliveryTicket[]; // Add optional filtered tickets prop
    selectedTicketId?: string;
    onSelectionChange?: (ticketId: string) => void;
    subView?: string;
    onSubViewChange?: (subView: string) => void;
    keyboardNav?: any;
}

const DeliveryTicketItem = ({ value, className, ...otherProps }: ListBoxItemProps<DeliveryTicket>) => {
    if (!value) return null;

    const getStatusColor = (status: DeliveryTicket['status']) => {
        switch (status) {
            case 'approved': return 'success';
            case 'rejected': return 'error';
            case 'reviewed': return 'success';
            case 'exported': return 'brand';
            case 'pending': return 'warning';
            case 'open': return 'gray';
            default: return 'gray';
        }
    };

    const getStatusDisplayName = (status: DeliveryTicket['status']) => {
        switch (status) {
            case 'open': return 'Open';
            case 'pending': return 'Pending';
            case 'reviewed': return 'Reviewed';
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
            {/* Line 1: Vendor Name */}
            <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-primary truncate flex-1">
                    {value.vendorName}
                </span>
            </div>

            {/* Line 2: Date • Badge + Completeness Icon */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-xs text-tertiary">
                        {formatDate(value.invoiceDate)}
                    </span>
                    <span className="text-xs text-quaternary">•</span>
                    <span className="text-xs text-tertiary truncate">
                        {truncateMiddle(value.invoiceNumber)}
                    </span>
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Completeness indicator */}
                    {hasBlockingIssues(value) && (
                        <div className="flex items-center">
                            <AlertTriangle 
                                className="w-3 h-3 text-warning-600" 
                                strokeWidth={2}
                            />
                        </div>
                    )}
                    
                    {/* Status badge */}
                    <Badge 
                        size="sm" 
                        color={getStatusColor(value.status)} 
                        type="color"
                    >
                        {getStatusDisplayName(value.status)}
                    </Badge>
                </div>
            </div>
        </ListBoxItem>
    );
};

export const CompactDeliveryTicketList = ({
    deliveryTickets,
    filteredTickets,
    selectedTicketId,
    onSelectionChange,
    subView = 'all',
    onSubViewChange,
    keyboardNav
}: CompactDeliveryTicketListProps) => {
    
    // Create sub-views with counts
    const subViews = DELIVERY_TICKET_SUB_VIEWS.map(view => ({
        ...view,
        count: view.filter(deliveryTickets).length
    }));

    // Use filteredTickets if provided, otherwise filter deliveryTickets based on subView
    const baseTickets = filteredTickets || (
        deliveryTickets
            .filter(ticket => {
                switch (subView) {
                    case 'missing_fields': return hasBlockingIssues(ticket);
                    case 'open': return ticket.status === 'open';
                    case 'reviewed': return ticket.status === 'reviewed';
                    case 'pending': return ticket.status === 'pending';
                    case 'approved': return ticket.status === 'approved';
                    case 'rejected': return ticket.status === 'rejected';
                    case 'exported': return ticket.status === 'exported';
                    default: return true;
                }
            })
    );

    // Use the base tickets directly without search filtering
    const finalTickets = baseTickets;

    return (
        <div className="w-80 max-w-xs border-r border-secondary bg-primary flex flex-col flex-shrink-0 h-full">
            {/* Header */}
            <div className="px-4 py-4 border-b border-secondary flex-shrink-0">
                <div className="flex items-center justify-between" style={{marginBottom: 0}}>
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-primary">
                            Delivery Tickets
                        </h2>
                        <Badge size="sm" color="gray" type="color">
                            {finalTickets.length}
                        </Badge>
                    </div>
                    
                    {/* Filter Dropdown */}
                    <Dropdown.Root>
                        <ButtonUtility
                            icon={FilterLines}
                            size="sm"
                            color="secondary"
                            tooltip="Filter delivery tickets"
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
                    <div className="mb-3" style={{marginBottom: 0}}>
                        <span className="text-xs text-tertiary font-medium">
                            {subViews.find(v => v.id === subView)?.label}
                        </span>
                    </div>
                )}
                
            </div>

            {/* Delivery Ticket List */}
            <div className="flex-1 overflow-y-auto">
                <ListBox
                    aria-label="Delivery Tickets"
                    selectionMode="single"
                    items={finalTickets}
                    selectedKeys={selectedTicketId ? [selectedTicketId] : []}
                    onSelectionChange={(keys) => {
                        const selectedId = Array.from(keys).at(0) as string;
                        onSelectionChange?.(selectedId);
                    }}
                >
                    {(item) => <DeliveryTicketItem key={item.id} value={item} />}
                </ListBox>

                {/* Empty State */}
                {finalTickets.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 px-4">
                        <div className="text-6xl mb-3">🚚</div>
                        <h3 className="text-sm font-medium text-secondary mb-1">No delivery tickets found</h3>
                        <p className="text-xs text-tertiary text-center">
                            No delivery tickets available
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
