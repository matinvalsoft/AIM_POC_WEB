"use client";

import { useState, useEffect } from "react";
import { Select } from "@/components/base/select/select";
import { InvoiceCodingInterface } from "@/components/documents/invoice-coding-interface";
import { useInvoices } from "@/lib/airtable";
import { logCodingChange } from "@/lib/airtable/activity-logger";
import type { Invoice } from "@/types/documents";

export default function CodingDemoPage() {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");
  
  // Use Airtable hook for invoices
  const { invoices, loading, error, updateInvoice } = useInvoices({
    autoFetch: true
  });
  
  const selectedInvoice = invoices.find(inv => inv.id === selectedInvoiceId);

  // Set initial selection when invoices load
  useEffect(() => {
    if (invoices.length > 0 && !selectedInvoiceId) {
      setSelectedInvoiceId(invoices[0].id);
    }
  }, [invoices, selectedInvoiceId]);

  const invoiceOptions = invoices.map(invoice => ({
    id: invoice.id,
    label: `${invoice.invoiceNumber} - ${invoice.vendorName}`,
    supportingText: `$${invoice.amount.toFixed(2)} | ${invoice.lines?.length || 0} line${(invoice.lines?.length || 0) !== 1 ? 's' : ''}`,
  }));

  const handleCodingChange = async (invoiceCoding?: any, lineCoding?: any) => {
    if (!selectedInvoice) return;
    
    try {
      // Update invoice with new coding information
      const updates: Partial<Invoice> = {};
      
      if (invoiceCoding) {
        if (invoiceCoding.project !== undefined) updates.project = invoiceCoding.project;
        if (invoiceCoding.task !== undefined) updates.task = invoiceCoding.task;
        if (invoiceCoding.costCenter !== undefined) updates.costCenter = invoiceCoding.costCenter;
        if (invoiceCoding.glAccount !== undefined) updates.glAccount = invoiceCoding.glAccount;
        if (invoiceCoding.isMultilineCoding !== undefined) updates.isMultilineCoding = invoiceCoding.isMultilineCoding;
      }
      
      await updateInvoice(selectedInvoice.id, updates);
      console.log("Successfully updated invoice coding:", updates);
      
      // Log the coding change
      if (Object.keys(updates).length > 0) {
        await logCodingChange(
          selectedInvoice.id,
          selectedInvoice.invoiceNumber,
          updates,
          'User', // TODO: Get actual user info
          'Invoice coding updated via demo interface'
        );
      }
      
      // TODO: Handle line-level coding updates when needed
      if (lineCoding) {
        console.log("Line Coding updates:", lineCoding);
        // This would require additional API calls to update invoice lines
        
        // Log line coding changes if implemented
        await logCodingChange(
          selectedInvoice.id,
          selectedInvoice.invoiceNumber,
          { lineCoding },
          'User', // TODO: Get actual user info
          'Line-level coding updated via demo interface'
        );
      }
      
    } catch (err) {
      console.error('Failed to update invoice coding:', err);
      // You could add a toast notification here
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-primary p-8 flex items-center justify-center">
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
      <div className="min-h-screen bg-primary p-8 flex items-center justify-center">
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
      <div className="min-h-screen bg-primary p-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No invoices found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-primary mb-2">Invoice Coding Interface Demo</h1>
          <p className="text-secondary">
            Test the invoice coding interface with both single-line and multi-line invoices. 
            Switch between Invoice mode (apply to all) and Lines mode (code per line).
          </p>
        </div>

        {/* Invoice Selection */}
        <div className="mb-8 p-6 bg-secondary border border-tertiary rounded-lg">
          <Select
            label="Select Invoice to Code"
            placeholder="Choose an invoice"
            items={invoiceOptions}
            selectedKey={selectedInvoiceId}
            onSelectionChange={(key) => setSelectedInvoiceId(key as string)}
            size="md"
          >
            {(item) => (
              <Select.Item key={item.id} id={item.id}>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className="text-xs text-tertiary">{item.supportingText}</span>
                </div>
              </Select.Item>
            )}
          </Select>
        </div>

        {/* Selected Invoice Info */}
        {selectedInvoice && (
          <div className="mb-6 p-4 bg-secondary border border-tertiary rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-secondary">Vendor:</span>
                <span className="ml-2 text-tertiary">{selectedInvoice.vendorName}</span>
              </div>
              <div>
                <span className="font-medium text-secondary">Amount:</span>
                <span className="ml-2 text-tertiary">${selectedInvoice.amount.toFixed(2)}</span>
              </div>
              <div>
                <span className="font-medium text-secondary">Status:</span>
                <span className="ml-2 text-tertiary capitalize">{selectedInvoice.status}</span>
              </div>
              <div>
                <span className="font-medium text-secondary">Lines:</span>
                <span className="ml-2 text-tertiary">{selectedInvoice.lines?.length || 0}</span>
              </div>
            </div>
          </div>
        )}

        {/* Coding Interface */}
        {selectedInvoice && (
          <div className="p-6 bg-secondary border border-tertiary rounded-lg">
            <h3 className="text-lg font-semibold text-primary mb-4">Coding</h3>
            <InvoiceCodingInterface
              invoice={selectedInvoice}
              onCodingChange={handleCodingChange}
            />
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 p-4 bg-primary border border-secondary rounded-lg">
          <h4 className="font-medium text-secondary mb-2">How to Test:</h4>
          <ul className="text-sm text-tertiary space-y-1">
            <li>• Select different invoices to see single-line vs multi-line behavior</li>
            <li>• Toggle between "Invoice" and "Lines" modes using the switch</li>
            <li>• In Lines mode, use ← → buttons to navigate between line items</li>
            <li>• Notice how each line can have different coding values</li>
            <li>• Check the browser console to see coding data changes</li>
          </ul>
        </div>

        {/* Demo Data Info */}
        <div className="mt-4 p-4 bg-primary border border-secondary rounded-lg">
          <h4 className="font-medium text-secondary mb-2">Available Test Invoices:</h4>
          <ul className="text-sm text-tertiary space-y-1">
            <li>• INV-2024-001: Single line (Acme Corporation)</li>
            <li>• INV-2024-006: 4 lines - Office supplies (Office Depot)</li>
            <li>• INV-2024-007: 5 lines - Software & services (Tech Solutions)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
