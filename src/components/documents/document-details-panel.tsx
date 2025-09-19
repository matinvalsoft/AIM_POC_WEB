"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { parseDate, getLocalTimeZone } from "@internationalized/date";
import { Tabs, TabList, Tab, TabPanel } from "@/components/application/tabs/tabs";
import { Input } from "@/components/base/input/input";
import { AmountInput } from "@/components/base/input/amount-input";
import { FormField } from "@/components/base/input/form-field";
import { DatePicker } from "@/components/application/date-picker/date-picker";
import { Select } from "@/components/base/select/select";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Badge } from "@/components/base/badges/badges";
import { AlertTriangle, CheckCircle, Clock, User01, LinkExternal01, Trash01, Copy01, Mail01, File01, MessageChatCircle, FileCheck02, Receipt, CreditCard01, Package, Edit03, FileDownload02, AlertCircle } from "@untitledui/icons";
import { cx } from "@/utils/cx";
import { InvoiceCodingInterface } from "@/components/documents/invoice-coding-interface";
import { LinksTab, RawContentTab, ActivityTimeline } from "@/components/documents/shared-tabs";
import { useActivities } from "@/lib/airtable";
import { useInvoiceLinks } from "@/lib/airtable/linked-documents-hooks";
import type { Invoice, DocumentLink } from "@/types/documents";
import { INVOICE_STATUS } from "@/lib/airtable/schema-types";
import { validateInvoice, getMissingFieldsMessage, isMultiLineMode } from "@/utils/invoice-validation";



interface DocumentDetailsPanelProps {
    document?: Invoice;
    className?: string;
    onSave?: (document: Invoice) => void;
    onSendForApproval?: (document: Invoice) => void;
    onApprove?: (document: Invoice) => void;
    onReject?: (document: Invoice) => void;
    onReopen?: (document: Invoice) => void;
    onResendForApproval?: (document: Invoice) => void;
    onViewReason?: (document: Invoice) => void;
    onViewInOracle?: (document: Invoice) => void;
    onDelete?: (document: Invoice) => void;
    activeTab?: string;
    onTabChange?: (tab: string) => void;
    keyboardNav?: any;
}

const CompletenessChecker = ({ document }: { document?: Invoice }) => {
    if (!document) return null;

    const validation = validateInvoice(document);
    const issueMessage = getMissingFieldsMessage(document);

    // Hide alert entirely if no blocking issues
    if (validation.canMarkAsReviewed) {
        return null;
    }

    return (
        <div className={cx(
            "rounded-lg border p-3 mb-4",
            "border-warning bg-warning-25 text-warning-700"
        )}>
            <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-warning-primary" />
                <span className="text-sm font-medium">
                    {isMultiLineMode(document) ? 'Issues Found' : 'Missing Required Fields'}
                </span>
            </div>
            <p className="text-xs">
                {issueMessage} — complete to continue
            </p>
        </div>
    );
};

const RejectionReasonBanner = ({ document }: { document?: Invoice }) => {
    if (!document || document.status !== INVOICE_STATUS.REJECTED || !document.rejectionReason) {
        return null;
    }

    return (
        <div className={cx(
            "rounded-lg border p-3 mb-4",
            "border-error bg-error-25 text-error-700"
        )}>
            <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-error-primary" />
                <span className="text-sm font-medium">
                    Invoice Rejected
                </span>
            </div>
            <p className="text-xs">
                {document.rejectionReason}
            </p>
        </div>
    );
};

export const DocumentDetailsPanel = ({ 
    document, 
    className, 
    onSave,
    onSendForApproval,
    onApprove,
    onReject,
    onReopen,
    onResendForApproval,
    onViewReason,
    onViewInOracle,
    onDelete,
    activeTab = "extracted",
    onTabChange,
    keyboardNav
}: DocumentDetailsPanelProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedDocument, setEditedDocument] = useState<Invoice | undefined>(document);
    const [selectedVendor2, setSelectedVendor2] = useState<string | null>(null);
    
    // Refs for scroll delegation
    const panelRef = useRef<HTMLDivElement>(null);
    const contentAreaRef = useRef<HTMLDivElement>(null);
    
    // Connect the keyboard navigation ref to our content area
    useEffect(() => {
        if (keyboardNav?.detailsContainerRef && contentAreaRef.current) {
            keyboardNav.detailsContainerRef.current = contentAreaRef.current;
        }
    }, [keyboardNav]);

    // Fetch activities for the current document
    const { activities, loading: activitiesLoading, error: activitiesError } = useActivities({
        invoiceId: document?.id,
        autoFetch: true
    });

    // Fetch linked documents (files and emails) for the current document
    const { linkedItems, files, emails, loading: linkedDocsLoading, error: linkedDocsError } = useInvoiceLinks(document?.id);

    // Keep panel state in sync with selected document
    useEffect(() => {
        setEditedDocument(document);
    }, [document]);

    // Handle scroll delegation - forward wheel events to content area
    useEffect(() => {
        const panel = panelRef.current;
        const contentArea = contentAreaRef.current;
        
        if (!panel || !contentArea) return;

        const handleWheel = (e: WheelEvent) => {
            // Only delegate scroll if the target is not already inside the scrollable content area
            const target = e.target as Element;
            const isInsideContentArea = contentArea.contains(target);
            
            // If the wheel event happened on the panel but not inside the scrollable content,
            // delegate it to the content area
            if (!isInsideContentArea && contentArea.scrollHeight > contentArea.clientHeight) {
                e.preventDefault();
                e.stopPropagation();
                contentArea.scrollBy({
                    top: e.deltaY,
                    behavior: 'auto'
                });
            }
        };

        panel.addEventListener('wheel', handleWheel, { passive: false });
        
        return () => {
            panel.removeEventListener('wheel', handleWheel);
        };
    }, []);

    // Helpers for date formatting/parsing for DatePicker component
    const formatDateValue = (date: Date | undefined) => {
        if (!date) return null;
        const y = date.getFullYear();
        const m = `${date.getMonth() + 1}`.padStart(2, '0');
        const d = `${date.getDate()}`.padStart(2, '0');
        return parseDate(`${y}-${m}-${d}`);
    };

    // Status display helpers
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

    // Dirty check: enable Save when edited fields differ from original
    const isDirty = useMemo(() => {
        if (!document || !editedDocument) return false;
        
        // Check all editable fields
        const fieldsToCheck: (keyof Invoice)[] = [
            "vendorName", "invoiceNumber", "amount", "invoiceDate", "dueDate",
            "project", "task", "costCenter", "glAccount", "isMultilineCoding"
        ];
        
        // Check top-level fields
        const topLevelChanged = fieldsToCheck.some((key) => {
            const originalValue = document[key];
            const editedValue = editedDocument[key];
            
            // Handle Date objects specially
            if (originalValue instanceof Date && editedValue instanceof Date) {
                return originalValue.getTime() !== editedValue.getTime();
            }
            
            // Handle null/undefined equivalence
            if ((originalValue ?? "") !== (editedValue ?? "")) {
                return true;
            }
            
            return false;
        });
        
        // Check lines array for changes (multiline coding)
        const linesChanged = (() => {
            const originalLines = document.lines || [];
            const editedLines = editedDocument.lines || [];
            
            // Different number of lines
            if (originalLines.length !== editedLines.length) {
                return true;
            }
            
            // Check each line for changes
            return originalLines.some((originalLine, index) => {
                const editedLine = editedLines[index];
                if (!editedLine) return true;
                
                // Check line properties that can be edited
                return (
                    originalLine.description !== editedLine.description ||
                    originalLine.amount !== editedLine.amount ||
                    originalLine.id !== editedLine.id
                );
            });
        })();
        
        return topLevelChanged || linesChanged;
    }, [document, editedDocument]);

    const handleSave = () => {
        if (editedDocument && onSave) {
            onSave(editedDocument);
            setIsEditing(false);
        }
    };

    // Render action buttons based on invoice status
    const renderActionButtons = () => {
        if (!currentDoc) return null;

        const status = currentDoc.status;
        const validation = validateInvoice(currentDoc);

        switch (status) {
            case 'open':
                return (
                    <div className="flex items-center gap-2">
                        <Button 
                            size="sm" 
                            color="primary"
                            className="flex-1"
                            onClick={() => onSendForApproval?.(currentDoc)}
                            isDisabled={!validation.canMarkAsReviewed}
                        >
                            Mark as Reviewed
                        </Button>
                        <Button 
                            size="sm" 
                            color="secondary"
                            className="flex-1"
                            onClick={handleSave}
                            isDisabled={!isDirty}
                        >
                            Save
                        </Button>
                        <Button 
                            size="sm" 
                            color="secondary"
                            iconLeading={Trash01}
                            onClick={() => onDelete?.(currentDoc)}
                            aria-label="Delete"
                        />
                    </div>
                );

            case 'pending':
                return (
                    <div className="flex items-center gap-2">
                        <Button 
                            size="sm" 
                            color="primary"
                            className="flex-1"
                            onClick={() => onApprove?.(currentDoc)}
                        >
                            Approve
                        </Button>
                        <Button 
                            size="sm" 
                            color="secondary"
                            className="flex-1"
                            onClick={() => onReject?.(currentDoc)}
                        >
                            Reject
                        </Button>
                    </div>
                );

            case 'rejected': // Rejected
                return (
                    <div className="flex items-center gap-2">
                        <Button 
                            size="sm" 
                            color="primary"
                            className="flex-1"
                            onClick={() => onResendForApproval?.(currentDoc)}
                        >
                            Re-mark as Reviewed
                        </Button>
                        <Button 
                            size="sm" 
                            color="secondary"
                            className="flex-1"
                            onClick={handleSave}
                            isDisabled={!isDirty}
                        >
                            Save
                        </Button>
                    </div>
                );

            case 'approved': // Approved
                return (
                    <div className="flex items-center gap-2">
                        <Button 
                            size="sm" 
                            color="primary"
                            className="flex-1"
                            onClick={() => onReopen?.(currentDoc)}
                        >
                            Reopen
                        </Button>
                    </div>
                );

            case 'exported': // Exported
                return (
                    <div className="flex items-center gap-2">
                        <Button 
                            size="sm" 
                            color="primary"
                            className="flex-1"
                            onClick={() => onViewInOracle?.(currentDoc)}
                        >
                            View in Oracle
                        </Button>
                    </div>
                );

            default:
                // Fallback for unknown statuses
                return (
                    <div className="flex items-center gap-2">
                        <Button 
                            size="sm" 
                            color="primary"
                            className="flex-1"
                            isDisabled={!validation.canMarkAsReviewed}
                        >
                            Mark Reviewed
                        </Button>
                        <Button 
                            size="sm" 
                            color="secondary"
                            className="flex-1"
                            onClick={handleSave}
                            isDisabled={!isDirty}
                        >
                            Save
                        </Button>
                    </div>
                );
        }
    };

    const updateField = (field: keyof Invoice, value: any) => {
        if (editedDocument) {
            setEditedDocument({
                ...editedDocument,
                [field]: value
            });
            setIsEditing(true);
        }
    };

    const updateVendorName = (value: string) => {
        if (editedDocument) {
            setEditedDocument({
                ...editedDocument,
                vendorName: value,
            });
            setIsEditing(true);
        }
    };

    const handleCodingChange = (invoiceCoding?: any, lineCoding?: any) => {
        if (editedDocument && invoiceCoding) {
            setEditedDocument({
                ...editedDocument,
                glAccount: invoiceCoding.glAccount,
                isMultilineCoding: invoiceCoding.isMultilineCoding,
            });
            setIsEditing(true);
        }
        // Note: Line-level coding would require extending the data model
        // For now, we're just handling invoice-level coding
    };

    const handleLineUpdate = (lineId: string, field: 'description' | 'amount', value: string | number) => {
        if (editedDocument && editedDocument.lines) {
            const updatedLines = editedDocument.lines.map(line => 
                line.id === lineId 
                    ? { ...line, [field]: value }
                    : line
            );
            setEditedDocument({
                ...editedDocument,
                lines: updatedLines,
            });
            setIsEditing(true);
        }
    };

    const tabs = keyboardNav?.tabs || [
        { id: "extracted", label: "Header" },
        { id: "coding", label: "Coding" },
        { id: "raw", label: "Raw" },
        { id: "links", label: "Links" },
        { id: "activity", label: "Activity" }
    ];

    // Move all hooks before any conditional returns
    const currentDoc = editedDocument || document;
    const validation = useMemo(() => {
        return currentDoc ? validateInvoice(currentDoc) : { canMarkAsReviewed: false, isValid: false, issues: [] };
    }, [currentDoc]);

    if (!document) {
        return (
            <div className={cx("w-full max-w-sm border-l border-secondary bg-primary", className)}>
                <div className="flex flex-col items-center justify-center py-12 px-6">
                    <div className="text-4xl mb-3">📋</div>
                    <h3 className="text-lg font-medium text-primary mb-2">No Document Selected</h3>
                    <p className="text-tertiary text-center">Select a document to view details</p>
                </div>
            </div>
        );
    }
    const canEdit = currentDoc?.status === INVOICE_STATUS.OPEN || currentDoc?.status === INVOICE_STATUS.REJECTED;

    return (
        <div ref={panelRef} className={cx("w-full max-w-sm border-l border-secondary bg-primary flex flex-col h-full overflow-hidden", className)}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-secondary flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-primary">
                        Details
                    </h2>
                    <div className="flex items-center gap-2">
                        <Badge 
                            size="sm" 
                            color={getStatusColor(currentDoc?.status || 'open')}
                            type="color"
                        >
                            {getStatusDisplayName(currentDoc?.status || 'open')}
                        </Badge>
                        {validation.canMarkAsReviewed ? (
                            <CheckCircle className="w-4 h-4 text-success-primary" />
                        ) : (
                            <AlertTriangle className="w-4 h-4 text-warning-primary" />
                        )}
                    </div>
                </div>

                <CompletenessChecker document={currentDoc} />
                <RejectionReasonBanner document={currentDoc} />
                
                {/* Primary Actions */}
                {renderActionButtons()}
            </div>

            {/* Tabs */}
            <Tabs 
                selectedKey={activeTab}
                onSelectionChange={(key) => onTabChange?.(key as string)}
                className="flex-1 flex flex-col overflow-hidden"
            >
                <div className="border-b border-secondary flex-shrink-0">
                    <TabList 
                        items={tabs}
                        type="underline"
                        size="sm"
                        className="px-6 pt-2"
                    >
                        {(item) => <Tab key={item.id} id={item.id} label={item.label} />}
                    </TabList>
                </div>

                {/* Content */}
                <div ref={contentAreaRef} className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0 w-full max-w-full" data-keyboard-nav-container>
                    <TabPanel id="extracted">
                        <div className="space-y-4 w-full max-w-full">
                            <div>
                                <label className="text-xs font-medium text-tertiary mb-1 block">Store Number</label>
                                <Select
                                    placeholder="Select store"
                                    items={[
                                        { id: "1", label: "Store 1", supportingText: "Main Location" },
                                        { id: "2", label: "Store 2", supportingText: "North Branch" },
                                        { id: "3", label: "Store 3", supportingText: "South Branch" },
                                        { id: "4", label: "Store 4", supportingText: "East Branch" },
                                        { id: "5", label: "Store 5", supportingText: "West Branch" },
                                        { id: "6", label: "Store 6", supportingText: "Downtown" },
                                        { id: "7", label: "Store 7", supportingText: "Uptown" },
                                        { id: "8", label: "Store 8", supportingText: "Midtown" },
                                        { id: "9", label: "Store 9", supportingText: "Westside" },
                                        { id: "10", label: "Store 10", supportingText: "Eastside" }
                                    ]}
                                    selectedKey={currentDoc?.storeNumber}
                                    onSelectionChange={(key) => updateField('storeNumber', key as string)}
                                    size="sm"
                                    isDisabled={!canEdit}
                                >
                                    {(item) => (
                                        <Select.Item key={item.id} id={item.id} supportingText={item.supportingText}>
                                            {item.label}
                                        </Select.Item>
                                    )}
                                </Select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-tertiary mb-1 block">Vendor</label>
                                <Input 
                                    value={currentDoc?.vendorName || ''}
                                    onChange={(value) => updateVendorName(value as string)}
                                    size="sm"
                                    isDisabled={!canEdit}
                                    onFocus={keyboardNav?.handleInputFocus}
                                    onBlur={keyboardNav?.handleInputBlur}
                                />
                            </div>
                            <FormField label="Amount">
                                <AmountInput
                                    value={currentDoc?.amount || 0}
                                    onChange={(value) => updateField('amount', value)}
                                    size="sm"
                                    isDisabled={!canEdit}
                                    onFocus={keyboardNav?.handleInputFocus}
                                    onBlur={keyboardNav?.handleInputBlur}
                                />
                            </FormField>
                            <div>
                                <label className="text-xs font-medium text-tertiary mb-1 block">Invoice Number</label>
                                <Input 
                                    value={currentDoc?.invoiceNumber || ''}
                                    onChange={(value) => updateField('invoiceNumber', value)}
                                    size="sm"
                                    isDisabled={!canEdit}
                                    onFocus={keyboardNav?.handleInputFocus}
                                    onBlur={keyboardNav?.handleInputBlur}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-tertiary mb-1 block">Date</label>
                                <DatePicker 
                                    aria-label="Date picker"
                                    value={formatDateValue(currentDoc?.dueDate)}
                                    onChange={(value) => {
                                        if (value) {
                                            const date = value.toDate('UTC');
                                            updateField('dueDate', date);
                                        }
                                    }}
                                    isDisabled={!canEdit}
                                    onFocus={keyboardNav?.handleInputFocus}
                                    onBlur={keyboardNav?.handleInputBlur}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-tertiary mb-1 block">Vendor 2</label>
                                <Select
                                    placeholder="Select vendor"
                                    items={[
                                        { id: "v1", label: "Acme Supplies", supportingText: "#100234" },
                                        { id: "v2", label: "Beta Manufacturing", supportingText: "#100897" },
                                        { id: "v3", label: "Cascade Logistics", supportingText: "#101122" },
                                        { id: "v4", label: "Delta Office Goods", supportingText: "#101345" },
                                        { id: "v5", label: "Evergreen Paper Co.", supportingText: "#101678" },
                                        { id: "ezcm", label: "Select in EZCM", icon: AlertCircle }
                                    ]}
                                    selectedKey={selectedVendor2}
                                    onSelectionChange={(key) => setSelectedVendor2(key as string)}
                                    size="sm"
                                    isDisabled={!canEdit}
                                    popoverClassName="max-h-none"
                                >
                                    {(item) => (
                                        <Select.Item 
                                            key={item.id} 
                                            id={item.id} 
                                            supportingText={item.supportingText}
                                            icon={item.icon}
                                            className={item.id === 'ezcm' ? 'border-t border-border-secondary *:data-icon:text-warning-primary' : ''}
                                        >
                                            {item.label}
                                        </Select.Item>
                                    )}
                                </Select>
                                {selectedVendor2 === 'ezcm' && (
                                    <p className="text-xs font-medium text-tertiary mt-1">
                                        Temporary vendor assigned: "Unknown Supplier"
                                    </p>
                                )}
                            </div>
                        </div>
                    </TabPanel>

                    <TabPanel id="coding">
                        <div className="w-full max-w-full">
                            {currentDoc && (
                                <InvoiceCodingInterface
                                    invoice={currentDoc}
                                    onCodingChange={handleCodingChange}
                                    onLineUpdate={handleLineUpdate}
                                    disabled={!canEdit}
                                    keyboardNav={keyboardNav}
                                />
                            )}
                        </div>
                    </TabPanel>

                    <TabPanel id="raw">
                        <div className="w-full max-w-full">
                            <RawContentTab 
                                title="Raw Document Text"
                                rawText={`INVOICE\nInvoice #: ${currentDoc?.invoiceNumber || ''}\nDate: ${currentDoc?.invoiceDate?.toLocaleDateString() || ''}\nFrom: ${currentDoc?.vendorName || ''}\nAmount: ${new Intl.NumberFormat('en-US', {
                                    style: 'currency',
                                    currency: 'USD',
                                }).format(currentDoc?.amount || 0)}${currentDoc?.lines?.map((line) => `\n• ${line.description} - ${new Intl.NumberFormat('en-US', {
                                    style: 'currency',
                                    currency: 'USD',
                                }).format(line.amount)}`).join('') || ''}`}
                                keyValues={{
                                    'Invoice #': currentDoc?.invoiceNumber,
                                    'Date': currentDoc?.invoiceDate?.toLocaleDateString(),
                                    'From': currentDoc?.vendorName,
                                    'Amount': currentDoc?.amount
                                }}
                            />
                        </div>
                    </TabPanel>

                    <TabPanel id="links">
                        <div className="w-full max-w-full space-y-6">
                            {linkedDocsLoading && (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                    <span className="ml-2 text-sm text-gray-600">Loading linked documents...</span>
                                </div>
                            )}
                            
                            {linkedDocsError && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <p className="text-sm text-red-800">
                                        Error loading linked documents: {linkedDocsError}
                                    </p>
                                </div>
                            )}
                            
                            {!linkedDocsLoading && !linkedDocsError && (
                                <LinksTab 
                                    linkedItems={linkedItems}
                                    files={files}
                                    emails={emails}
                                    emptyStateMessage="No documents linked to this invoice"
                                />
                            )}
                        </div>
                    </TabPanel>

                    <TabPanel id="activity">
                        <div className="w-full max-w-full">
                            <ActivityTimeline 
                                activities={activities}
                                loading={activitiesLoading}
                                error={activitiesError || undefined}
                            />
                        </div>
                    </TabPanel>
                </div>
            </Tabs>
        </div>
    );
};
