"use client";

import { useState, useEffect } from "react";
import { CompactInvoiceList } from "@/components/documents/compact-invoice-list";
import { PDFViewer } from "@/components/documents/pdf-viewer";
import { DocumentDetailsPanel } from "@/components/documents/document-details-panel";
import { useInvoices } from "@/lib/airtable";
import { logStatusChange, logFieldEdit } from "@/lib/airtable/activity-logger";
import { useKeyboardNavigation } from "@/hooks/use-keyboard-navigation";
import { KeyboardShortcutsHelp } from "@/components/keyboard-shortcuts-help";
import { cx } from "@/utils/cx";
import { hasBlockingIssues, sortInvoicesByPriority } from "@/utils/invoice-validation";
import type { Invoice } from "@/types/documents";

export default function InvoicesPage() {
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
    const [subView, setSubView] = useState('all');
    const [activeTab, setActiveTab] = useState('extracted');
    
    // Use Airtable hook for invoices
    const { invoices, loading, error, updateInvoice } = useInvoices({
        autoFetch: true
    });

    const selectedInvoice = invoices.find(inv => inv.id === selectedInvoiceId);

    // Get the filtered and sorted invoices that match what the UI shows
    const filteredInvoices = sortInvoicesByPriority(
        invoices.filter(invoice => {
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

    // Handle save action - save the current edited document
    const handleKeyboardSave = () => {
        if (selectedInvoice) {
            handleInvoiceUpdate(selectedInvoice);
        }
    };

    // Keyboard navigation system - use filtered invoices so navigation matches what's visible
    const keyboardNav = useKeyboardNavigation({
        invoices: filteredInvoices,
        selectedInvoiceId,
        onSelectionChange: setSelectedInvoiceId,
        activeTab,
        onTabChange: setActiveTab,
        onSave: handleKeyboardSave,
    });

    // Set initial selection when invoices load - use filtered invoices
    useEffect(() => {
        if (filteredInvoices.length > 0 && !selectedInvoiceId) {
            setSelectedInvoiceId(filteredInvoices[0].id);
        }
    }, [filteredInvoices, selectedInvoiceId]);

    const handleInvoiceUpdate = async (updatedInvoice: Invoice) => {
        try {
            const originalInvoice = invoices.find(inv => inv.id === updatedInvoice.id);
            
            await updateInvoice(updatedInvoice.id, updatedInvoice);
            
            // Log field edits (non-status changes)
            if (originalInvoice) {
                const fieldsToCheck = [
                    'vendorName', 'invoiceNumber', 'amount', 'invoiceDate', 'dueDate',
                    'project', 'task', 'costCenter', 'glAccount', 'isMultilineCoding'
                ];
                
                for (const field of fieldsToCheck) {
                    const oldValue = originalInvoice[field as keyof Invoice];
                    const newValue = updatedInvoice[field as keyof Invoice];
                    
                    if (oldValue !== newValue) {
                        await logFieldEdit(
                            updatedInvoice.id,
                            updatedInvoice.invoiceNumber,
                            field,
                            oldValue,
                            newValue,
                            'User', // TODO: Get actual user info
                            `Field ${field} updated`
                        );
                    }
                }
            }
        } catch (err) {
            console.error('Failed to update invoice:', err);
            // You could add a toast notification here
        }
    };

    // Status change handlers
    const handleSendForApproval = async (invoice: Invoice) => {
        try {
            const oldStatus = invoice.status;
            await updateInvoice(invoice.id, { status: 'pending' });
            
            // Log the activity
            await logStatusChange(
                invoice.id,
                invoice.invoiceNumber,
                oldStatus,
                'pending',
                'User', // TODO: Get actual user info
                'Invoice sent for approval'
            );
        } catch (err) {
            console.error('Failed to send for approval:', err);
        }
    };

    const handleApprove = async (invoice: Invoice) => {
        try {
            const oldStatus = invoice.status;
            await updateInvoice(invoice.id, { status: 'approved' });
            
            // Log the activity
            await logStatusChange(
                invoice.id,
                invoice.invoiceNumber,
                oldStatus,
                'approved',
                'User', // TODO: Get actual user info
                'Invoice approved'
            );
        } catch (err) {
            console.error('Failed to approve invoice:', err);
        }
    };

    const handleReject = async (invoice: Invoice) => {
        try {
            const oldStatus = invoice.status;
            await updateInvoice(invoice.id, { status: 'rejected' });
            
            // Log the activity
            await logStatusChange(
                invoice.id,
                invoice.invoiceNumber,
                oldStatus,
                'rejected',
                'User', // TODO: Get actual user info
                'Invoice rejected'
            );
        } catch (err) {
            console.error('Failed to reject invoice:', err);
        }
    };

    const handleResendForApproval = async (invoice: Invoice) => {
        try {
            const oldStatus = invoice.status;
            await updateInvoice(invoice.id, { status: 'pending' });
            
            // Log the activity
            await logStatusChange(
                invoice.id,
                invoice.invoiceNumber,
                oldStatus,
                'pending',
                'User', // TODO: Get actual user info
                'Invoice resent for approval'
            );
        } catch (err) {
            console.error('Failed to resend for approval:', err);
        }
    };

    const handleReopen = async (invoice: Invoice) => {
        try {
            const oldStatus = invoice.status;
            await updateInvoice(invoice.id, { status: 'open' });
            
            // Log the activity
            await logStatusChange(
                invoice.id,
                invoice.invoiceNumber,
                oldStatus,
                'open',
                'User', // TODO: Get actual user info
                'Invoice reopened'
            );
        } catch (err) {
            console.error('Failed to reopen invoice:', err);
        }
    };

    // Show loading state
    if (loading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading invoices...</p>
                </div>
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600 mb-4">Failed to load invoices: {error}</p>
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
    if (invoices.length === 0) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600">No invoices found.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full w-full overflow-hidden min-h-0">
            {/* Left Column - Compact Invoice List */}
            <div className="flex-shrink-0 h-full">
                <CompactInvoiceList
                    invoices={invoices}
                    filteredInvoices={filteredInvoices}
                    selectedInvoiceId={selectedInvoiceId}
                    onSelectionChange={setSelectedInvoiceId}
                    subView={subView}
                    onSubViewChange={setSubView}
                    keyboardNav={keyboardNav}
                />
            </div>

            {/* Center Column - PDF Viewer */}
            <div className="flex-1 min-w-0 overflow-hidden h-full">
                <PDFViewer 
                    document={selectedInvoice} 
                    keyboardNav={keyboardNav}
                />
            </div>

            {/* Right Column - Document Details */}
            <div className="flex-shrink-0 max-w-sm h-full">
                <DocumentDetailsPanel
                    document={selectedInvoice}
                    onSave={handleInvoiceUpdate}
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
