"use client";

import { useEffect, useRef } from "react";
import { Tabs, TabList, Tab, TabPanel } from "@/components/application/tabs/tabs";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Badge } from "@/components/base/badges/badges";
import { AlertTriangle, CheckCircle, Mail01, Paperclip, Trash01, RefreshCw05, Link01, File01, CheckCheck } from "@untitledui/icons";
import { cx } from "@/utils/cx";
import { LinksTab, RawContentTab, ActivityTimeline } from "@/components/documents/shared-tabs";
import { useActivities } from "@/lib/airtable";
import { useEmailLinks } from "@/lib/airtable/linked-documents-hooks";
import type { AirtableEmail } from "@/lib/airtable/emails-hooks";

interface EmailDetailsPanelProps {
    email?: AirtableEmail;
    className?: string;
    onSave?: (email: AirtableEmail) => void;
    onMarkAsProcessed?: (email: AirtableEmail, reason?: string) => void;
    onMarkAsIgnored?: (email: AirtableEmail, reason: string) => void;
    onRetryProcessing?: (email: AirtableEmail) => void;
    onCreateDocument?: (email: AirtableEmail) => void;
    onLinkToDocument?: (email: AirtableEmail, documentId: string) => void;
    onUpdateLinks?: (email: AirtableEmail) => void;
    onDelete?: (email: AirtableEmail) => void;
    activeTab?: string;
    onTabChange?: (tab: string) => void;
}



export const EmailDetailsPanel = ({ 
    email, 
    className, 
    onSave,
    onMarkAsProcessed,
    onMarkAsIgnored,
    onRetryProcessing,
    onCreateDocument,
    onLinkToDocument,
    onUpdateLinks,
    onDelete,
    activeTab = "overview",
    onTabChange,
}: EmailDetailsPanelProps) => {

    
    // Refs for scroll delegation
    const panelRef = useRef<HTMLDivElement>(null);
    const contentAreaRef = useRef<HTMLDivElement>(null);



    // Fetch activities for the current email
    const { activities, loading: activitiesLoading, error: activitiesError } = useActivities({
        documentId: email?.id, // Using documentId as generic field
        autoFetch: true
    });

    // Fetch linked documents (files and invoices) for the current email
    const { linkedItems, files, invoices, loading: linkedDocsLoading, error: linkedDocsError } = useEmailLinks(email?.id);

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
    const getStatusColor = (status: AirtableEmail['status']) => {
        switch (status) {
            case 'Processed': return 'success';
            case 'Needs attention': return 'warning';
            case 'New': return 'gray';
            default: return 'gray';
        }
    };

    const getAttachmentIcon = (type: string) => {
        switch (type) {
            case 'Invoice': return Receipt;
            case 'PO': return FileCheck02;
            case 'Bank': return CreditCard01;
            default: return File01;
        }
    };





    const tabs = [
        { id: "overview", label: "Overview" },
        { id: "links", label: "Links" },
        { id: "raw", label: "Raw" },
        { id: "activity", label: "Activity" }
    ];

    // Move all hooks before any conditional returns
    const currentEmail = email;

    if (!email) {
        return (
            <div className={cx("w-full max-w-sm border-l border-secondary bg-primary", className)}>
                <div className="flex flex-col items-center justify-center py-12 px-6">
                    <div className="text-4xl mb-3">📧</div>
                    <h3 className="text-lg font-medium text-primary mb-2">No Email Selected</h3>
                    <p className="text-tertiary text-center">Select an email to view details</p>
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
                        {(currentEmail?.attachmentsCount || 0) > 0 && (
                            <div className="flex items-center gap-0.5">
                                <Paperclip className="w-4 h-4 text-tertiary" />
                                <span className="text-xs text-tertiary">{currentEmail.attachmentsCount}</span>
                            </div>
                        )}
                        {(currentEmail?.attention && currentEmail.attention.trim() !== '') && (
                            <AlertTriangle className="w-4 h-4 text-fg-warning-primary" title="Needs attention" />
                        )}
                    </div>
                </div>

                {/* Primary Actions */}
                {currentEmail && (
                    <div className="flex items-center gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onUpdateLinks?.(currentEmail)}
                            className="flex-1"
                            disabled={!currentEmail}
                        >
                            Update Links
                        </Button>
                        <Button 
                            size="sm" 
                            color="secondary"
                            iconLeading={Trash01}
                            onClick={() => onDelete?.(currentEmail)}
                            aria-label="Delete email"
                        />
                    </div>
                )}

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
                        <div className="w-full max-w-full">
                            <dl className="flex flex-col gap-6 w-full max-w-full">
                            <div className="flex flex-col gap-2">
                                <dt className="text-sm font-medium text-tertiary">From</dt>
                                <dd>
                                    <p className="text-md font-medium text-secondary">
                                        {currentEmail?.fromName || '—'} {currentEmail?.fromEmail && `<${currentEmail.fromEmail}>`}
                                    </p>
                                </dd>
                            </div>
                            <div className="flex flex-col gap-2">
                                <dt className="text-sm font-medium text-tertiary">Subject</dt>
                                <dd>
                                    <p className="text-md font-medium text-secondary">{currentEmail?.subject || '—'}</p>
                                </dd>
                            </div>
                            <div className="flex flex-col gap-2">
                                <dt className="text-sm font-medium text-tertiary">Received</dt>
                                <dd>
                                    <p className="text-md font-medium text-secondary">
                                        {currentEmail?.received?.toLocaleDateString() || '—'}
                                    </p>
                                </dd>
                            </div>
                            <div className="flex flex-col gap-2">
                                <dt className="text-sm font-medium text-tertiary">Processing Address</dt>
                                <dd>
                                    <p className="text-md font-medium text-secondary">{currentEmail?.processingAddress || '—'}</p>
                                </dd>
                            </div>
                        </dl>
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
                                    files={files}
                                    invoices={invoices}
                                    emptyStateMessage="No documents linked to this email"
                                />
                            )}
                        </div>
                    </TabPanel>

                    <TabPanel id="raw">
                        <div className="w-full max-w-full">
                            <RawContentTab 
                                title="Email Raw Content"
                                rawText={`Subject: ${currentEmail?.subject || ''}\nFrom: ${currentEmail?.fromName || ''} <${currentEmail?.fromEmail || ''}>\nTo: ${currentEmail?.toEmails?.join(', ') || ''}\nReceived: ${currentEmail?.received?.toLocaleDateString() || ''}\nProcessing Address: ${currentEmail?.processingAddress || ''}`}
                                keyValues={{
                                    'Subject': currentEmail?.subject,
                                    'From Name': currentEmail?.fromName,
                                    'From Email': currentEmail?.fromEmail,
                                    'To': currentEmail?.toEmails?.join(', '),
                                    'Received': currentEmail?.received?.toLocaleDateString(),
                                    'Processing Address': currentEmail?.processingAddress
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
