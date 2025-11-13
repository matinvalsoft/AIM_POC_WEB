"use client";

import React, { useState, useEffect, useRef } from "react";
import { Tabs, TabList, Tab, TabPanel } from "@/components/application/tabs/tabs";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Badge } from "@/components/base/badges/badges";
import { AlertTriangle, CheckCircle, Trash01, RefreshCw05, Copy01 } from "@untitledui/icons";
import { getErrorCodeDefinition, getErrorDisplayName, getErrorIcon, getErrorColor, getErrorDescription, hasErrorCode } from "@/lib/error-codes";
import { DialogTrigger as AriaDialogTrigger, DialogTrigger, Heading as AriaHeading } from "react-aria-components";
import { cx } from "@/utils/cx";
import { LinksTab, RawContentTab } from "@/components/documents/shared-tabs";
import { TextArea } from "@/components/base/textarea/textarea";
import { CloseButton } from "@/components/base/buttons/close-button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { BackgroundPattern } from "@/components/shared-assets/background-patterns";
import { AlertFloating } from "@/components/application/alerts/alerts";
import { useFileLinks } from "@/lib/airtable/linked-documents-hooks";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import type { AirtableFile } from "@/lib/airtable/files-hooks";

interface FileDetailsPanelProps {
    file?: AirtableFile;
    className?: string;
    onDelete?: (file: AirtableFile) => void;
    onReprocess?: (file: AirtableFile, instructions?: string) => void;
    activeTab?: string;
    onTabChange?: (tab: string) => void;
}

// Reprocess Modal Component
const ReprocessModal = ({ file, onConfirm, isDisabled, color = "primary", className }: { 
    file: AirtableFile; 
    onConfirm: (file: AirtableFile, instructions?: string) => void;
    isDisabled?: boolean;
    color?: "primary" | "secondary";
    className?: string;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [instructions, setInstructions] = useState('');

    const handleConfirm = () => {
        onConfirm(file, instructions);
        setIsOpen(false);
        setInstructions(''); // Reset instructions after confirming
    };

    const handleCancel = () => {
        setIsOpen(false);
        setInstructions(''); // Reset instructions when cancelling
    };

    return (
        <AriaDialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
            <Button
                color={color}
                size="sm"
                className={className}
                isDisabled={isDisabled}
                onClick={() => setIsOpen(true)}
            >
                Reprocess
            </Button>
            <ModalOverlay isDismissable>
                <Modal>
                    <Dialog>
                        <div className="relative w-full overflow-hidden rounded-2xl bg-primary shadow-xl sm:max-w-160">
                            <CloseButton onClick={handleCancel} theme="light" size="lg" className="absolute top-3 right-3" />
                            
                            {/* Header */}
                            <div className="flex flex-col gap-4 px-4 pt-5 pb-5 sm:px-6 sm:pt-6">
                                <div className="relative w-max max-sm:hidden">
                                    <FeaturedIcon color="gray" size="lg" theme="modern" icon={RefreshCw05} />
                                    <BackgroundPattern pattern="circle" size="sm" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                </div>
                                <div className="z-10 flex flex-col gap-0.5">
                                    <AriaHeading slot="title" className="text-md font-semibold text-primary">
                                        Reprocess {file.name}
                                    </AriaHeading>
                                    <p className="text-sm text-tertiary">
                                        This will reset the file status and restart the processing workflow.
                                    </p>
                                </div>
                            </div>

                            {/* Warning Alert */}
                            <div className="px-4 sm:px-6 pb-4">
                                <AlertFloating
                                    color="warning"
                                    title="Warning: Linked Documents Will Be Deleted"
                                    description="This will delete all linked documents and cannot be undone."
                                    confirmLabel=""
                                />
                            </div>


                            {/* Instructions Field */}
                            <div className="px-4 sm:px-6">
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-medium text-primary">
                                        Reprocessing Instructions
                                    </label>
                                    <TextArea
                                        value={instructions}
                                        onChange={(value) => setInstructions(value)}
                                        placeholder="Enter specific instructions for how this file should be reprocessed..."
                                        rows={6}
                                        className="w-full"
                                    />
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="z-10 flex flex-1 flex-col-reverse gap-3 p-4 pt-6 sm:flex-row sm:items-center sm:justify-end sm:px-6 sm:pt-8 sm:pb-6">
                                <Button color="secondary" size="lg" onClick={handleCancel}>
                                    Cancel
                                </Button>
                                <Button color="primary" size="lg" onClick={handleConfirm}>
                                    Reprocess File
                                </Button>
                            </div>
                        </div>
                    </Dialog>
                </Modal>
            </ModalOverlay>
        </AriaDialogTrigger>
    );
};

export const FileDetailsPanel = ({ 
    file, 
    className, 
    onDelete,
    onReprocess,
    activeTab = "overview",
    onTabChange,
}: FileDetailsPanelProps) => {
    const [editedFile, setEditedFile] = useState<AirtableFile | undefined>(file);
    
    // Refs for scroll delegation
    const panelRef = useRef<HTMLDivElement>(null);
    const contentAreaRef = useRef<HTMLDivElement>(null);

    // Fetch linked documents (invoices and delivery tickets) for the current file
    const { linkedItems, files: linkedFiles, emails, invoices, loading: linkedDocsLoading, error: linkedDocsError } = useFileLinks(file?.id);

    // Keep panel state in sync with selected file
    useEffect(() => {
        setEditedFile(file);
    }, [file]);

    // Handle scroll delegation
    useEffect(() => {
        const panel = panelRef.current;
        const contentArea = contentAreaRef.current;
        
        if (!panel || !contentArea) return;

        const handleWheel = (e: WheelEvent) => {
            const target = e.target as Element;
            const isInsideContentArea = contentArea.contains(target);
            
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


    // Status display helpers
    const getStatusColor = (status: AirtableFile['status'], errorCode?: string): 'success' | 'blue' | 'warning' | 'error' | 'gray' => {
        // If there's an error code, use its color
        if (errorCode) {
            const errorDef = getErrorCodeDefinition(errorCode);
            if (errorDef) return errorDef.color;
        }
        
        switch (status) {
            case 'Processed': return 'success';
            case 'Processing': return 'blue';
            case 'Queued': return 'warning';
            case 'Attention': return 'warning';
            default: return 'gray';
        }
    };

    const getStatusDisplayName = (status: AirtableFile['status'], errorCode?: string) => {
        // If there's an error code, use its display name
        if (errorCode) {
            return getErrorDisplayName(errorCode);
        }
        
        switch (status) {
            case 'Queued': return 'Queued';
            case 'Processing': return 'Processing';
            case 'Processed': return 'Processed';
            case 'Attention': return 'Needs Attention';
            default: return status;
        }
    };


    // Check if file has blocking issues
    const hasBlockingIssues = (file: AirtableFile) => {
        return hasErrorCode(file.errorCode) || file.status === 'Attention';
    };


    const currentFile = editedFile || file;

    // Render action buttons based on file status
    const renderActionButtons = () => {
        if (!currentFile) return null;

        const isQueued = currentFile.status === 'Queued';
        const isProcessing = currentFile.status === 'Processing';
        const isProcessed = currentFile.status === 'Processed';

        // Processing state: only show Delete button with destructive warning
        if (isProcessing) {
            return (
                <div className="flex items-center gap-2 w-full">
                    <DialogTrigger>
                        <Button 
                            size="sm" 
                            color="secondary"
                            className="flex-1"
                        >
                            Delete
                        </Button>
                        <ModalOverlay isDismissable>
                            <Modal>
                                <Dialog>
                                    {({ close }) => (
                                        <div className="bg-white rounded-lg p-6 max-w-md">
                                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Delete Processing File?</h2>
                                            <p className="text-sm text-gray-600 mb-6">
                                                Are you sure you want to delete this? It is still processing. You will need to upload the original document again.
                                            </p>
                                            <div className="flex justify-end gap-3">
                                                <button
                                                    type="button"
                                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                                                    onClick={() => close()}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700"
                                                    onClick={() => {
                                                        onDelete?.(currentFile);
                                                        close();
                                                    }}
                                                >
                                                    Delete File
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </Dialog>
                            </Modal>
                        </ModalOverlay>
                    </DialogTrigger>
                </div>
            );
        }

        // Processed state: show View Invoice (primary), Reprocess (secondary), Delete (utility)
        if (isProcessed) {
            const linkedInvoice = invoices && invoices.length > 0 ? invoices[0] : null;
            
            return (
                <div className="flex items-center gap-2 w-full">
                    {linkedInvoice ? (
                        <Button 
                            size="sm" 
                            color="primary"
                            className="flex-1"
                            onClick={() => {
                                window.location.href = `/invoices?id=${linkedInvoice.id}`;
                            }}
                        >
                            View Invoice
                        </Button>
                    ) : (
                        <Button 
                            size="sm" 
                            color="primary"
                            className="flex-1"
                            isDisabled={true}
                        >
                            View Invoice
                        </Button>
                    )}
                    
                    <ReprocessModal 
                        file={currentFile} 
                        onConfirm={(file, instructions) => onReprocess?.(file, instructions)}
                        isDisabled={false}
                        color="secondary"
                        className="flex-1"
                    />
                    
                    <ButtonUtility 
                        size="sm" 
                        color="secondary"
                        icon={Trash01}
                        onClick={() => onDelete?.(currentFile)}
                        tooltip="Delete file"
                    />
                </div>
            );
        }

        return (
            <div className="flex items-center gap-2">
                <ReprocessModal 
                    file={currentFile} 
                    onConfirm={(file, instructions) => onReprocess?.(file, instructions)}
                    isDisabled={isQueued}
                    color="primary"
                    className="flex-1"
                />
                
                <ButtonUtility 
                    size="sm" 
                    color="secondary"
                    icon={Trash01}
                    onClick={() => onDelete?.(currentFile)}
                    tooltip="Delete file"
                />
            </div>
        );
    };

    const tabs = [
        { id: "overview", label: "Overview" },
        { id: "raw", label: "Raw" },
        { id: "links", label: "Links" }
    ];

    if (!file) {
        return (
            <div className={cx("border-l border-secondary bg-primary", className)} style={{ width: '320px', minWidth: '320px', maxWidth: '320px' }}>
                <div className="flex flex-col items-center justify-center py-12 px-6">
                    <div className="text-4xl mb-3">📄</div>
                    <h3 className="text-lg font-medium text-primary mb-2">No File Selected</h3>
                    <p className="text-tertiary text-center">Select a file to view details</p>
                </div>
            </div>
        );
    }

    return (
        <div ref={panelRef} className={cx("border-l border-secondary bg-primary flex flex-col h-full overflow-hidden", className)} style={{ width: '320px', minWidth: '320px', maxWidth: '320px' }}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-secondary flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-primary">
                        Details
                    </h2>
                    <div className="flex items-center gap-2">
                        <Badge 
                            size="sm" 
                            color={getStatusColor(currentFile?.status || 'Queued', currentFile?.errorCode)}
                            type="color"
                        >
                            {getStatusDisplayName(currentFile?.status || 'Queued', currentFile?.errorCode)}
                        </Badge>
                        {currentFile?.errorCode ? (
                            (() => {
                                const ErrorIcon = getErrorIcon(currentFile.errorCode);
                                return <ErrorIcon className="w-4 h-4 text-error-primary" />;
                            })()
                        ) : currentFile?.status === 'Processing' ? (
                            // No icon for processing state
                            null
                        ) : currentFile && hasBlockingIssues(currentFile) ? (
                            <AlertTriangle className="w-4 h-4 text-error-primary" />
                        ) : (
                            <CheckCircle className="w-4 h-4 text-success-primary" />
                        )}
                    </div>
                </div>

                {/* Show blocking issues alert */}
                {currentFile && hasBlockingIssues(currentFile) && (
                    <div className="rounded-lg border p-3 mb-4 border-error bg-error-25 text-error-700">
                        <div className="flex items-center gap-2 mb-2">
                            {(() => {
                                const ErrorIcon = getErrorIcon(currentFile.errorCode);
                                return <ErrorIcon className="w-4 h-4 text-error-primary" />;
                            })()}
                            <span className="text-sm font-medium">
                                {getErrorDisplayName(currentFile.errorCode)}
                            </span>
                        </div>
                        <p className="text-xs">
                            {getErrorDescription(currentFile.errorCode)}
                        </p>
                        {currentFile.errorLink && currentFile.errorCode === 'DUPLICATE_FILE' && (
                            <p className="text-xs text-warning-600 mt-1">
                                {currentFile.errorLink.startsWith('/') ? (
                                    <a 
                                        href={currentFile.errorLink} 
                                        className="underline hover:text-warning-800"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            window.location.href = currentFile.errorLink!;
                                        }}
                                    >
                                        View original file
                                    </a>
                                ) : (
                                    currentFile.errorLink
                                )}
                            </p>
                        )}
                    </div>
                )}

                {/* Processing state indicator */}
                {currentFile?.status === 'Processing' && (
                    <div className="rounded-lg border p-3 mb-4 border-blue-200 bg-blue-50 text-blue-700">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                            <span className="text-sm font-medium">
                                Processing File
                            </span>
                        </div>
                        <p className="text-xs">
                            Your file is processing. All fields are read-only.
                        </p>
                    </div>
                )}
                
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
                <div ref={contentAreaRef} className="flex-1 overflow-y-auto min-h-0 w-full" style={{ padding: '18px' }}>
                    <TabPanel id="overview">
                        <div className="space-y-6">
                            <div>
                                <h3 className="flex items-center text-secondary text-sm font-semibold gap-0.5">
                                    File Name
                                    <span className="hidden text-brand-tertiary">*</span>
                                </h3>
                                <p className="text-tertiary text-sm">{currentFile?.name || '—'}</p>
                            </div>

                            <div>
                                <h3 className="flex items-center text-secondary text-sm font-semibold gap-0.5">
                                    Created At
                                    <span className="hidden text-brand-tertiary">*</span>
                                </h3>
                                <p className="text-tertiary text-sm">
                                    {currentFile?.createdAt?.toLocaleDateString() || '—'}
                                </p>
                            </div>

                            <div>
                                <h3 className="flex items-center text-secondary text-sm font-semibold gap-0.5">
                                    Source
                                    <span className="hidden text-brand-tertiary">*</span>
                                </h3>
                                <p className="text-tertiary text-sm">{currentFile?.source || '—'}</p>
                            </div>
                        </div>
                    </TabPanel>

                    <TabPanel id="links">
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
                                files={linkedFiles}
                                invoices={invoices as Array<{ id: string; [key: string]: unknown }>}
                                emails={emails}
                                emptyStateMessage="No documents linked to this file"
                            />
                        )}
                    </TabPanel>

                    <TabPanel id="raw">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-medium text-secondary truncate flex-1 min-w-0">Raw File Content</h4>
                            <ButtonUtility 
                                size="xs" 
                                color="secondary"
                                icon={Copy01}
                                tooltip="Copy raw text"
                                onClick={() => {
                                    const rawText = `FILE\nName: ${currentFile?.name || ''}\nCreated At: ${currentFile?.createdAt?.toLocaleDateString() || ''}\nSource: ${currentFile?.source || ''}\nStatus: ${currentFile?.status || ''}\nFile Hash: ${currentFile?.fileHash || ''}`;
                                    navigator.clipboard.writeText(rawText);
                                }}
                                className="flex-shrink-0 ml-2"
                            />
                        </div>
                        <div className="text-xs text-tertiary font-mono bg-tertiary rounded p-3 overflow-y-auto overflow-x-hidden">
                            <div className="space-y-2 overflow-hidden">
                                {currentFile?.name && (
                                    <p className="break-all overflow-hidden">
                                        <strong className="break-normal">Name:</strong> {currentFile.name}
                                    </p>
                                )}
                                {currentFile?.createdAt && (
                                    <p className="break-all overflow-hidden">
                                        <strong className="break-normal">Created At:</strong> {currentFile.createdAt.toLocaleDateString()}
                                    </p>
                                )}
                                {currentFile?.source && (
                                    <p className="break-all overflow-hidden">
                                        <strong className="break-normal">Source:</strong> {currentFile.source}
                                    </p>
                                )}
                                {currentFile?.status && (
                                    <p className="break-all overflow-hidden">
                                        <strong className="break-normal">Status:</strong> {currentFile.status}
                                    </p>
                                )}
                                {currentFile?.fileHash && (
                                    <p className="break-all overflow-hidden">
                                        <strong className="break-normal">File Hash:</strong> {currentFile.fileHash}
                                    </p>
                                )}
                                {currentFile?.errorCode && (
                                    <p className="break-all overflow-hidden">
                                        <strong className="break-normal">Error Code:</strong> {currentFile.errorCode}
                                    </p>
                                )}
                                {currentFile?.errorDescription && (
                                    <p className="break-all overflow-hidden">
                                        <strong className="break-normal">Error Description:</strong> {currentFile.errorDescription}
                                    </p>
                                )}
                                {currentFile?.errorLink && (
                                    <p className="break-all overflow-hidden">
                                        <strong className="break-normal">Error Link:</strong> {currentFile.errorLink}
                                    </p>
                                )}
                                <div className="whitespace-pre-wrap break-words overflow-hidden">
                                    {`FILE\nName: ${currentFile?.name || ''}\nCreated At: ${currentFile?.createdAt?.toLocaleDateString() || ''}\nSource: ${currentFile?.source || ''}\nStatus: ${currentFile?.status || ''}\nFile Hash: ${currentFile?.fileHash || ''}`}
                                </div>
                            </div>
                        </div>
                    </TabPanel>
                </div>
            </Tabs>
        </div>
    );
};
