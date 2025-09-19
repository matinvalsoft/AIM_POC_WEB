"use client";

import React, { useState, useEffect, useRef } from "react";
import { Tabs, TabList, Tab, TabPanel } from "@/components/application/tabs/tabs";
import { Button } from "@/components/base/buttons/button";
import { Badge } from "@/components/base/badges/badges";
import { AlertTriangle, CheckCircle, Trash01, RefreshCw05 } from "@untitledui/icons";
import { DialogTrigger as AriaDialogTrigger, Heading as AriaHeading } from "react-aria-components";
import { cx } from "@/utils/cx";
import { LinksTab, RawContentTab, ActivityTimeline } from "@/components/documents/shared-tabs";
import { TextArea } from "@/components/base/textarea/textarea";
import { CloseButton } from "@/components/base/buttons/close-button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { BackgroundPattern } from "@/components/shared-assets/background-patterns";
import { AlertFloating } from "@/components/application/alerts/alerts";
import { useActivities } from "@/lib/airtable";
// import { useFileLinks } from "@/lib/airtable/linked-documents-hooks"; // Temporarily disabled
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
const ReprocessModal = ({ file, onConfirm, isDisabled }: { 
    file: AirtableFile; 
    onConfirm: (file: AirtableFile, instructions?: string) => void;
    isDisabled?: boolean;
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
                color="primary"
                size="sm"
                className="flex-1"
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
                                        Delete {file.name}
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

    // Fetch activities for the current file
    const { activities, loading: activitiesLoading, error: activitiesError } = useActivities({
        documentId: file?.id, // Using documentId as generic field
        autoFetch: true
    });

    // Fetch linked documents (invoices and emails) for the current file
    // Temporarily disabled due to API issues - using fallback values
    const linkedItems: Array<{id: string; name: string; type: string}> = [];
    const invoices: Array<{id: string; name: string}> = [];
    const emails: Array<{id: string; name: string}> = [];
    const linkedDocsLoading = false;
    const linkedDocsError = null;
    
    // TODO: Re-enable when API is working
    // const { linkedItems, invoices, emails, loading: linkedDocsLoading, error: linkedDocsError } = useFileLinks(file?.id);

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
    const getStatusColor = (status: AirtableFile['status']) => {
        switch (status) {
            case 'Processed': return 'success';
            case 'Processing': return 'brand';
            case 'Queued': return 'warning';
            case 'Error': return 'error';
            case 'Attention': return 'warning';
            case 'Linked': return 'success';
            default: return 'gray';
        }
    };

    const getStatusDisplayName = (status: AirtableFile['status']) => {
        switch (status) {
            case 'Queued': return 'Queued';
            case 'Processing': return 'Processing';
            case 'Processed': return 'Processed';
            case 'Error': return 'Error';
            case 'Attention': return 'Needs Attention';
            case 'Linked': return 'Linked';
            default: return status;
        }
    };


    // Check if file has blocking issues
    const hasBlockingIssues = (file: AirtableFile) => {
        return file.status === 'Attention' || file.isDuplicate;
    };


    const currentFile = editedFile || file;

    // Render action buttons based on file status
    const renderActionButtons = () => {
        if (!currentFile) return null;

        const isQueued = currentFile.status === 'Queued';

        return (
            <div className="flex items-center gap-2">
                <ReprocessModal 
                    file={currentFile} 
                    onConfirm={(file, instructions) => onReprocess?.(file, instructions)}
                    isDisabled={isQueued}
                />
                
                <Button 
                    size="sm" 
                    color="secondary"
                    iconLeading={Trash01}
                    onClick={() => onDelete?.(currentFile)}
                    aria-label="Delete file"
                />
            </div>
        );
    };

    const tabs = [
        { id: "overview", label: "Overview" },
        { id: "links", label: "Links" },
        { id: "raw", label: "Raw" },
        { id: "activity", label: "Activity" }
    ];

    if (!file) {
        return (
            <div className={cx("w-full max-w-sm border-l border-secondary bg-primary", className)}>
                <div className="flex flex-col items-center justify-center py-12 px-6">
                    <div className="text-4xl mb-3">📄</div>
                    <h3 className="text-lg font-medium text-primary mb-2">No File Selected</h3>
                    <p className="text-tertiary text-center">Select a file to view details</p>
                </div>
            </div>
        );
    }

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
                            color={getStatusColor(currentFile?.status || 'Queued')}
                            type="color"
                        >
                            {getStatusDisplayName(currentFile?.status || 'Queued')}
                        </Badge>
                        {currentFile?.isDuplicate && (
                            <Badge size="sm" color="warning" type="color">
                                Duplicate
                            </Badge>
                        )}
                        {hasBlockingIssues(currentFile) ? (
                            <AlertTriangle className="w-4 h-4 text-warning-primary" />
                        ) : (
                            <CheckCircle className="w-4 h-4 text-success-primary" />
                        )}
                    </div>
                </div>

                {/* Show blocking issues alert */}
                {hasBlockingIssues(currentFile) && (
                    <div className="rounded-lg border p-3 mb-4 border-warning bg-warning-25 text-warning-700">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-4 h-4 text-warning-primary" />
                            <span className="text-sm font-medium">
                                {currentFile.isDuplicate ? 'Duplicate File' : 'Needs Attention'}
                            </span>
                        </div>
                        <p className="text-xs">
                            {currentFile.isDuplicate 
                                ? 'This file appears to be a duplicate of an existing file'
                                : 'This file requires manual review or has processing errors'
                            }
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
                        className="px-6 pt-2"
                    >
                        {(item) => <Tab key={item.id} id={item.id} label={item.label} />}
                    </TabList>
                </div>

                {/* Content */}
                <div ref={contentAreaRef} className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0 w-full max-w-full">
                    <TabPanel id="overview">
                        <div className="w-full max-w-full space-y-6">
                            <div>
                                <h3 className="flex items-center text-secondary text-sm font-semibold gap-0.5">
                                    File Name
                                    <span className="hidden text-brand-tertiary">*</span>
                                </h3>
                                <p className="text-tertiary text-sm">{currentFile?.name || '—'}</p>
                            </div>

                            <div>
                                <h3 className="flex items-center text-secondary text-sm font-semibold gap-0.5">
                                    Upload Date
                                    <span className="hidden text-brand-tertiary">*</span>
                                </h3>
                                <p className="text-tertiary text-sm">
                                    {currentFile?.uploadDate?.toLocaleDateString() || '—'}
                                </p>
                            </div>

                            <div>
                                <h3 className="flex items-center text-secondary text-sm font-semibold gap-0.5">
                                    Source
                                    <span className="hidden text-brand-tertiary">*</span>
                                </h3>
                                <p className="text-tertiary text-sm">{currentFile?.source || '—'}</p>
                            </div>

                            <div>
                                <h3 className="flex items-center text-secondary text-sm font-semibold gap-0.5">
                                    Pages
                                    <span className="hidden text-brand-tertiary">*</span>
                                </h3>
                                <p className="text-tertiary text-sm">{currentFile?.pages || '—'}</p>
                            </div>
                        </div>
                    </TabPanel>

                    <TabPanel id="links">
                        <div className="w-full max-w-full">
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
                                    invoices={invoices}
                                    emails={emails}
                                    emptyStateMessage="No documents linked to this file"
                                />
                            )}
                        </div>
                    </TabPanel>

                    <TabPanel id="raw">
                        <div className="w-full max-w-full">
                            <RawContentTab 
                                title="File Raw Content"
                                rawText={`File: ${currentFile?.name || ''}\nType: ${currentFile?.type || ''}\nVendor: ${currentFile?.vendor || ''}\nDocument Date: ${currentFile?.documentDate?.toLocaleDateString() || ''}\nAmount: ${currentFile?.amount ? new Intl.NumberFormat('en-US', {
                                    style: 'currency',
                                    currency: 'USD',
                                }).format(currentFile.amount) : ''}\nSource: ${currentFile?.source || ''}\nPages: ${currentFile?.pages || ''}\nUpload Date: ${currentFile?.uploadDate?.toLocaleDateString() || ''}`}
                                keyValues={{
                                    'File Name': currentFile?.name,
                                    'Type': currentFile?.type,
                                    'Vendor': currentFile?.vendor,
                                    'Document Date': currentFile?.documentDate?.toLocaleDateString(),
                                    'Amount': currentFile?.amount,
                                    'Source': currentFile?.source,
                                    'Pages': currentFile?.pages,
                                    'Upload Date': currentFile?.uploadDate?.toLocaleDateString()
                                }}
                            />
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
