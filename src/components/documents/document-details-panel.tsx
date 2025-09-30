"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import type { Key } from "react";
import { parseDate, getLocalTimeZone } from "@internationalized/date";
import { Tabs, TabList, Tab, TabPanel } from "@/components/application/tabs/tabs";
import { Input } from "@/components/base/input/input";
import { FormField } from "@/components/base/input/form-field";
import { DatePicker } from "@/components/application/date-picker/date-picker";
import { Select } from "@/components/base/select/select";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Badge } from "@/components/base/badges/badges";
import { AlertTriangle, CheckCircle, Clock, User01, LinkExternal01, Trash01, Copy01, Mail01, File01, MessageChatCircle, FileCheck02, Receipt, CreditCard01, Package, Edit03, FileDownload02 } from "@untitledui/icons";
import { cx } from "@/utils/cx";
import { LinksTab, RawContentTab } from "@/components/documents/shared-tabs";
import { DialogTrigger, ModalOverlay, Modal, Dialog } from "@/components/application/modals/modal";
import { useTeams } from "@/lib/airtable";
import { useDocumentLinks } from "@/lib/airtable/linked-documents-hooks";
import type { Invoice, DeliveryTicket, DocumentLink } from "@/types/documents";
import { INVOICE_STATUS } from "@/lib/airtable/schema-types";
import { validateInvoice, getMissingFieldsMessage, isMultiLineMode } from "@/utils/invoice-validation";



interface DocumentDetailsPanelProps {
    document?: Invoice | DeliveryTicket;
    className?: string;
    onSave?: (document: Invoice | DeliveryTicket) => void;
    onSendForApproval?: (document: Invoice | DeliveryTicket) => void;
    onApprove?: (document: Invoice | DeliveryTicket) => void;
    onReject?: (document: Invoice | DeliveryTicket) => void;
    onReopen?: (document: Invoice | DeliveryTicket) => void;
    onResendForApproval?: (document: Invoice | DeliveryTicket) => void;
    onViewReason?: (document: Invoice | DeliveryTicket) => void;
    onViewInOracle?: (document: Invoice | DeliveryTicket) => void;
    onDelete?: (document: Invoice | DeliveryTicket) => void;
    activeTab?: string;
    onTabChange?: (tab: string) => void;
    keyboardNav?: any;
}

const CompletenessChecker = ({ document }: { document?: Invoice }) => {
    if (!document) return null;

    // Use server-side validation from Airtable
    const issueMessage = getMissingFieldsMessage(document);

    // Hide alert if no issues (empty message means all fields are complete)
    if (!issueMessage || issueMessage.trim() === '') {
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
    const [editedDocument, setEditedDocument] = useState<Invoice | DeliveryTicket | undefined>(document);
    const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
    const [editingVendorName, setEditingVendorName] = useState('');
    const [isUpdatingVendor, setIsUpdatingVendor] = useState(false);
    
    // Refs for scroll delegation
    const panelRef = useRef<HTMLDivElement>(null);
    const contentAreaRef = useRef<HTMLDivElement>(null);
    
    // Connect the keyboard navigation ref to our content area
    useEffect(() => {
        if (keyboardNav?.detailsContainerRef && contentAreaRef.current) {
            keyboardNav.detailsContainerRef.current = contentAreaRef.current;
        }
    }, [keyboardNav]);


    // Fetch linked documents (files and emails) for the current document
    // Determine document type and use appropriate hook
    const documentType = document?.type === 'delivery-tickets' ? 'delivery-ticket' : 'invoice';
    const { linkedItems, files, emails, loading: linkedDocsLoading, error: linkedDocsError } = useDocumentLinks(document?.id, documentType);

    // Fetch teams data for store number dropdown
    const { teams, loading: teamsLoading, error: teamsError } = useTeams();

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
        const fieldsToCheck: (keyof (Invoice | DeliveryTicket))[] = [
            "vendorName", "invoiceNumber", "invoiceDate", "dueDate",
            "erpAttribute1", "erpAttribute2", "erpAttribute3", "glAccount", "isMultilineCoding", "team"
        ];
        
        // Check top-level fields
        const topLevelChanged = fieldsToCheck.some((key) => {
            const originalValue = document[key];
            const editedValue = editedDocument[key];
            
            // Handle Date objects specially
            if (originalValue instanceof Date && editedValue instanceof Date) {
                return originalValue.getTime() !== editedValue.getTime();
            }
            
            // Handle array fields (like team) specially
            if (Array.isArray(originalValue) && Array.isArray(editedValue)) {
                if (originalValue.length !== editedValue.length) {
                    return true;
                }
                return originalValue.some((val, index) => val !== editedValue[index]);
            }
            
            // Handle array vs non-array comparison
            if (Array.isArray(originalValue) !== Array.isArray(editedValue)) {
                return true;
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

    const handleVendorEdit = () => {
        setEditingVendorName(currentDoc?.vendorName || '');
        setIsVendorModalOpen(true);
    };

    const handleVendorSubmit = async () => {
        if (!currentDoc || !editingVendorName.trim() || isUpdatingVendor) return;
        
        setIsUpdatingVendor(true);
        
        try {
            // Update Airtable directly
            const response = await fetch(`/api/airtable/Invoices`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    records: [{
                        id: currentDoc.id,
                        fields: {
                            'Vendor Name': editingVendorName.trim(),
                            'Vendor Code': null // Clear vendor code since we're manually editing
                        }
                    }]
                })
            });

            if (!response.ok) {
                throw new Error('Failed to update vendor in Airtable');
            }

            // Parse the response to get the updated record
            const responseData = await response.json();
            const updatedRecord = responseData.records?.[0];

            // Update the document locally to reflect the changes
            updateVendorName(editingVendorName.trim());
            
            // Clear vendor code since we're manually editing
            if (editedDocument) {
                const updatedDoc = {
                    ...editedDocument,
                    vendorName: editingVendorName.trim(),
                    vendorCode: undefined,
                };
                setEditedDocument(updatedDoc);
                
                // Trigger parent component to refetch/reload the document data
                if (onSave) {
                    onSave(updatedDoc);
                }
            }
            
            // Close modal and reset state
            setIsVendorModalOpen(false);
            setEditingVendorName('');
            
        } catch (error) {
            console.error('Error updating vendor:', error);
            // TODO: Show error message to user
        } finally {
            setIsUpdatingVendor(false);
        }
    };


    const tabs = keyboardNav?.tabs || [
        { id: "extracted", label: "Header" },
        { id: "raw", label: "Raw" },
        { id: "links", label: "Links" }
    ];

    // Move all hooks before any conditional returns
    const currentDoc = editedDocument || document;
    const validation = useMemo(() => {
        return currentDoc ? validateInvoice(currentDoc) : { canMarkAsReviewed: false, isValid: false, issues: [] };
    }, [currentDoc]);

    // Transform teams data for the store number dropdown
    const teamsSelectItems = useMemo(() => {
        return teams
            .map(team => ({
                id: team.id, // Use Airtable record ID for unique keys
                label: team.fullName ? `${team.name} - ${team.fullName}` : team.name, // Team name with dash and full name
                name: team.name // Keep original name for sorting
            }))
            .sort((a, b) => {
                // Sort by name as integer (1, 2, 3, ..., 10) instead of string sorting
                const aNum = parseInt(a.name, 10);
                const bNum = parseInt(b.name, 10);
                
                // If both are valid numbers, sort numerically
                if (!isNaN(aNum) && !isNaN(bNum)) {
                    return aNum - bNum;
                }
                
                // If one or both are not numbers, fall back to string sorting
                return a.name.localeCompare(b.name);
            });
    }, [teams]);

    // Find the selected team ID based on the current team field (array of team IDs)
    const selectedTeamId = useMemo(() => {
        // team is an array of team record IDs, get the first one
        const teamId = currentDoc?.team?.[0];
        return teamId || null;
    }, [currentDoc?.team]);

    // Handle team selection - update team field with selected team ID
    const handleTeamSelection = (key: Key | null) => {
        if (key) {
            // Update the team field with an array containing the selected team ID
            updateField('team', [key as string]);
        }
    };

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
                        className="px-6 pt-2 w-full flex justify-between"
                    >
                        {(item) => <Tab key={item.id} id={item.id} label={item.label} className="flex-1 text-center" />}
                    </TabList>
                </div>

                {/* Content */}
                <div ref={contentAreaRef} className="flex-1 overflow-y-auto min-h-0 w-full max-w-full" style={{ padding: '18px' }} data-keyboard-nav-container>
                    <TabPanel id="extracted" className="space-y-4">
                            <div>
                                <label className="text-xs font-medium text-tertiary mb-1 block">Store Number</label>
                                <Select
                                    placeholder={teamsLoading ? "Loading teams..." : "Select store"}
                                    items={teamsSelectItems}
                                    selectedKey={selectedTeamId}
                                    onSelectionChange={handleTeamSelection}
                                    size="sm"
                                    isDisabled={!canEdit || teamsLoading}
                                >
                                    {(item) => (
                                        <Select.Item key={item.id} id={item.id}>
                                            <span className="font-normal">{item.label}</span>
                                        </Select.Item>
                                    )}
                                </Select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-tertiary mb-1 block">Vendor</label>
                                <Select
                                    placeholder="Select vendor"
                                    items={[
                                        ...(currentDoc?.vendorName ? [{ 
                                            id: "current", 
                                            label: currentDoc.vendorCode 
                                                ? `${currentDoc.vendorName} - ${currentDoc.vendorCode}`
                                                : currentDoc.vendorName,
                                            icon: !currentDoc.vendorCode ? (() => (
                                                <svg
                                                    className="animate-spin h-4 w-4 text-gray-400"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <circle
                                                        className="opacity-25"
                                                        cx="12"
                                                        cy="12"
                                                        r="10"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                    ></circle>
                                                    <path
                                                        className="opacity-75"
                                                        fill="currentColor"
                                                        d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                    ></path>
                                                </svg>
                                            )) : undefined
                                        }] : []),
                                        { 
                                            id: "edit", 
                                            label: "Edit vendor", 
                                            icon: Edit03 
                                        }
                                    ]}
                                    selectedKey={currentDoc?.vendorName ? "current" : null}
                                    onSelectionChange={(key) => {
                                        if (key === "edit") {
                                            handleVendorEdit();
                                        }
                                        // Keep current vendor selected, don't change anything for now
                                    }}
                                    size="sm"
                                    isDisabled={!canEdit}
                                >
                                    {(item) => (
                                        <Select.Item key={item.id} id={item.id} icon={item.icon}>
                                            {item.label}
                                        </Select.Item>
                                    )}
                                </Select>
                            </div>
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
                                <label className="text-xs font-medium text-tertiary mb-1 block">GL Account</label>
                                <Input 
                                    placeholder="000000"
                                    value={currentDoc?.glAccount || ''}
                                    onChange={(value) => updateField('glAccount', value)}
                                    size="sm"
                                    maxLength={6}
                                    pattern="[0-9]{6}"
                                    isDisabled={!canEdit}
                                    onFocus={keyboardNav?.handleInputFocus}
                                    onBlur={keyboardNav?.handleInputBlur}
                                />
                            </div>
                    </TabPanel>

                    <TabPanel id="raw">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-medium text-secondary truncate flex-1 min-w-0">Raw Document Text</h4>
                            <ButtonUtility 
                                size="xs" 
                                color="secondary"
                                icon={Copy01}
                                tooltip="Copy raw text"
                                onClick={() => {
                                    const rawText = `DELIVERY TICKET\nTicket #: ${currentDoc?.invoiceNumber || ''}\nDate: ${currentDoc?.invoiceDate?.toLocaleDateString() || ''}\nFrom: ${currentDoc?.vendorName || ''}${currentDoc?.lines?.map((line) => `\n• ${line.description}`).join('') || ''}`;
                                    navigator.clipboard.writeText(rawText);
                                }}
                                className="flex-shrink-0 ml-2"
                            />
                        </div>
                        <div className="text-xs text-tertiary font-mono bg-tertiary rounded p-3 overflow-y-auto overflow-x-hidden">
                            <div className="space-y-2 overflow-hidden">
                                {currentDoc?.invoiceNumber && (
                                    <p className="break-all overflow-hidden">
                                        <strong className="break-normal">Ticket #:</strong> {currentDoc.invoiceNumber}
                                    </p>
                                )}
                                {currentDoc?.invoiceDate && (
                                    <p className="break-all overflow-hidden">
                                        <strong className="break-normal">Date:</strong> {currentDoc.invoiceDate.toLocaleDateString()}
                                    </p>
                                )}
                                {currentDoc?.vendorName && (
                                    <p className="break-all overflow-hidden">
                                        <strong className="break-normal">From:</strong> {currentDoc.vendorName}
                                    </p>
                                )}
                                <div className="whitespace-pre-wrap break-words overflow-hidden">
                                    {`DELIVERY TICKET\nTicket #: ${currentDoc?.invoiceNumber || ''}\nDate: ${currentDoc?.invoiceDate?.toLocaleDateString() || ''}\nFrom: ${currentDoc?.vendorName || ''}${currentDoc?.lines?.map((line) => `\n• ${line.description}`).join('') || ''}`}
                                </div>
                            </div>
                        </div>
                    </TabPanel>

                    <TabPanel id="links" className="space-y-6">
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
                    </TabPanel>
                </div>
            </Tabs>
            
            {/* Vendor Edit Modal */}
            {isVendorModalOpen && (
                <ModalOverlay isOpen={isVendorModalOpen} onOpenChange={setIsVendorModalOpen} isDismissable>
                    <Modal className="max-w-md">
                        <Dialog>
                            <div className="bg-white rounded-lg p-6">
                                {/* Modal Header */}
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold text-gray-900">Edit Vendor</h2>
                                    <Button
                                        color="secondary"
                                        size="sm"
                                        onClick={() => setIsVendorModalOpen(false)}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        ×
                                    </Button>
                                </div>
                                
                                {/* Modal Content */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 mb-1 block">
                                            Vendor Name
                                        </label>
                                        <Input
                                            value={editingVendorName}
                                            onChange={(value) => setEditingVendorName(value as string)}
                                            placeholder="Enter vendor name"
                                            size="sm"
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                
                                {/* Modal Actions */}
                                <div className="flex justify-end gap-3 mt-6">
                                    <Button
                                        color="secondary"
                                        size="sm"
                                        onClick={() => setIsVendorModalOpen(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={handleVendorSubmit}
                                        isDisabled={!editingVendorName.trim() || isUpdatingVendor}
                                        isLoading={isUpdatingVendor}
                                    >
                                        {isUpdatingVendor ? 'Updating...' : 'Update Vendor'}
                                    </Button>
                                </div>
                            </div>
                        </Dialog>
                    </Modal>
                </ModalOverlay>
            )}
        </div>
    );
};
