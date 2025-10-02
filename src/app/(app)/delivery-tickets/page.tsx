"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CompactDeliveryTicketList } from "@/components/documents/compact-delivery-ticket-list";
import { PDFViewer } from "@/components/documents/pdf-viewer";
import { DocumentDetailsPanel } from "@/components/documents/document-details-panel";
import { useDeliveryTickets } from "@/lib/airtable";
// Activity logging removed - Activities table no longer exists
import { useKeyboardNavigation } from "@/hooks/use-keyboard-navigation";
import { KeyboardShortcutsHelp } from "@/components/keyboard-shortcuts-help";
import { cx } from "@/utils/cx";
import { hasBlockingIssues, sortInvoicesByPriority, validateInvoice, getMissingFieldsMessage } from "@/utils/invoice-validation";
import type { DeliveryTicket, Invoice, StoreReceiver } from "@/types/documents";

export default function DeliveryTicketsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const [selectedTicketId, setSelectedTicketId] = useState<string>('');
    const [subView, setSubView] = useState('all');
    const [activeTab, setActiveTab] = useState('extracted');
    
    // Use Airtable hook for delivery tickets
    const { deliveryTickets, loading, error, updateDeliveryTicket } = useDeliveryTickets({
        autoFetch: true
    });

    // Sync URL with selectedTicketId
    useEffect(() => {
        const urlTicketId = searchParams.get('id');
        if (urlTicketId && urlTicketId !== selectedTicketId) {
            setSelectedTicketId(urlTicketId);
        }
    }, [searchParams, selectedTicketId]);

    // Update URL when selectedTicketId changes
    const updateSelectedTicketId = (ticketId: string) => {
        setSelectedTicketId(ticketId);
        
        const newSearchParams = new URLSearchParams(searchParams.toString());
        if (ticketId) {
            newSearchParams.set('id', ticketId);
        } else {
            newSearchParams.delete('id');
        }
        
        const newUrl = `/delivery-tickets?${newSearchParams.toString()}`;
        router.replace(newUrl, { scroll: false });
    };

    const selectedTicket = deliveryTickets.find(ticket => ticket.id === selectedTicketId);

    // Get the filtered and sorted delivery tickets that match what the UI shows
    const filteredTickets = sortInvoicesByPriority(
        deliveryTickets.filter(ticket => {
            // Apply sub-view filter
            switch (subView) {
                case 'missing_fields': return hasBlockingIssues(ticket);
                case 'open': return ticket.status === 'open';
                case 'pending': return ticket.status === 'pending';
                case 'approved': return ticket.status === 'approved';
                case 'rejected': return ticket.status === 'rejected';
                case 'exported': return ticket.status === 'exported';
                default: return true;
            }
        })
    ) as DeliveryTicket[]; // Cast since we know these are all delivery tickets

    // Handle save action - save the current edited document
    const handleKeyboardSave = () => {
        if (selectedTicket) {
            handleTicketUpdate(selectedTicket);
        }
    };

    // Keyboard navigation system - use filtered tickets so navigation matches what's visible
    const keyboardNav = useKeyboardNavigation({
        invoices: filteredTickets,
        selectedInvoiceId: selectedTicketId,
        onSelectionChange: updateSelectedTicketId,
        activeTab,
        onTabChange: setActiveTab,
        onSave: handleKeyboardSave,
    });

    // Set initial selection when tickets load - use filtered tickets
    useEffect(() => {
        if (filteredTickets.length > 0 && !selectedTicketId) {
            updateSelectedTicketId(filteredTickets[0].id);
        }
    }, [filteredTickets, selectedTicketId]);

    const handleTicketUpdate = async (updatedDocument: Invoice | DeliveryTicket | StoreReceiver) => {
        // Cast to DeliveryTicket since we know this is the delivery tickets page
        const updatedTicket = updatedDocument as DeliveryTicket;
        try {
            const originalTicket = deliveryTickets.find(ticket => ticket.id === updatedTicket.id);
            
            await updateDeliveryTicket(updatedTicket.id, updatedTicket);
            
            // Log field edits (non-status changes)
            if (originalTicket) {
                const fieldsToCheck = [
                    'vendorName', 'invoiceNumber', 'amount', 'invoiceDate', 'dueDate',
                    'erpAttribute1', 'erpAttribute2', 'erpAttribute3', 'glAccount'
                ];
                
                for (const field of fieldsToCheck) {
                    const oldValue = originalTicket[field as keyof DeliveryTicket];
                    const newValue = updatedTicket[field as keyof DeliveryTicket];
                    
                    if (oldValue !== newValue) {
                    }
                }
            }
        } catch (err) {
            console.error('Failed to update delivery ticket:', err);
            // You could add a toast notification here
        }
    };

    // Status change handlers
    const handleSendForApproval = async (document: Invoice | DeliveryTicket | StoreReceiver) => {
        const ticket = document as DeliveryTicket;
        try {
            // Validate required fields before marking as reviewed
            const validation = validateInvoice(ticket);
            if (!validation.canMarkAsReviewed) {
                const missingFieldsMessage = getMissingFieldsMessage(ticket);
                alert(`Cannot mark as reviewed. ${missingFieldsMessage}`);
                return;
            }

            const oldStatus = ticket.status;
            await updateDeliveryTicket(ticket.id, { status: 'reviewed' });
            
            // Log the activity
        } catch (err) {
            console.error('Failed to mark as reviewed:', err);
        }
    };

    const handleApprove = async (document: Invoice | DeliveryTicket | StoreReceiver) => {
        const ticket = document as DeliveryTicket;
        try {
            const oldStatus = ticket.status;
            await updateDeliveryTicket(ticket.id, { status: 'approved' });
            
            // Log the activity
        } catch (err) {
            console.error('Failed to approve delivery ticket:', err);
        }
    };

    const handleReject = async (document: Invoice | DeliveryTicket | StoreReceiver) => {
        const ticket = document as DeliveryTicket;
        try {
            const oldStatus = ticket.status;
            await updateDeliveryTicket(ticket.id, { status: 'rejected' });
            
            // Log the activity
        } catch (err) {
            console.error('Failed to reject delivery ticket:', err);
        }
    };

    const handleResendForApproval = async (document: Invoice | DeliveryTicket | StoreReceiver) => {
        const ticket = document as DeliveryTicket;
        try {
            const oldStatus = ticket.status;
            await updateDeliveryTicket(ticket.id, { status: 'pending' });
            
            // Log the activity
        } catch (err) {
            console.error('Failed to re-mark as reviewed:', err);
        }
    };

    const handleReopen = async (document: Invoice | DeliveryTicket | StoreReceiver) => {
        const ticket = document as DeliveryTicket;
        try {
            const oldStatus = ticket.status;
            await updateDeliveryTicket(ticket.id, { status: 'open' });
            
            // Log the activity
        } catch (err) {
            console.error('Failed to reopen delivery ticket:', err);
        }
    };

    // Show loading state
    if (loading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading delivery tickets...</p>
                </div>
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600 mb-4">Failed to load delivery tickets: {error}</p>
                    <button 
                        onClick={() => window.location.reload()} 
                        className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    // Show empty state
    if (deliveryTickets.length === 0) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600">No delivery tickets found.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full w-full overflow-hidden min-h-0">
            {/* Left Column - Compact Delivery Ticket List */}
            <div className="flex-shrink-0 h-full">
                <CompactDeliveryTicketList
                    deliveryTickets={deliveryTickets}
                    filteredTickets={filteredTickets}
                    selectedTicketId={selectedTicketId}
                    onSelectionChange={updateSelectedTicketId}
                    subView={subView}
                    onSubViewChange={setSubView}
                    keyboardNav={keyboardNav}
                />
            </div>

            {/* Center Column - PDF Viewer */}
            <div className="flex-1 min-w-0 overflow-hidden h-full">
                <PDFViewer 
                    document={selectedTicket} 
                    keyboardNav={keyboardNav}
                />
            </div>

            {/* Right Column - Document Details */}
            <div className="flex-shrink-0 max-w-sm h-full">
                <DocumentDetailsPanel
                    document={selectedTicket}
                    onSave={handleTicketUpdate}
                    onSendForApproval={handleSendForApproval}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onResendForApproval={handleResendForApproval}
                    onReopen={handleReopen}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    keyboardNav={keyboardNav}
                />
            </div>

            {/* Keyboard Shortcuts Help */}
            <KeyboardShortcutsHelp />
        </div>
    );
}

