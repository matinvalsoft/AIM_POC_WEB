"use client";

import { useState } from "react";
import { DialogTrigger, ModalOverlay, Modal, Dialog } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { X } from "@untitledui/icons";
import { cx } from "@/utils/cx";
import { PDFViewer } from "@/components/documents/pdf-viewer";
import { HTMLEmailViewer } from "@/components/documents/html-email-viewer";
import { DocumentDetailsPanel } from "@/components/documents/document-details-panel";
import { EmailDetailsPanel } from "@/components/documents/email-details-panel";
import { FileDetailsPanel } from "@/components/documents/file-details-panel";
import type { Invoice } from "@/types/documents";
import type { AirtableFile } from "@/lib/airtable/files-hooks";
import type { AirtableEmail } from "@/lib/airtable/emails-hooks";

interface ViewItemModalProps {
    item: {
        id: string;
        name: string;
        type: string;
    };
    // Full document data for proper viewing
    documentData?: Invoice | AirtableFile | AirtableEmail;
    trigger?: React.ReactNode;
    className?: string;
}

// Type guards to determine document type
const isInvoice = (doc: any): doc is Invoice => {
    return doc && 'invoiceNumber' in doc && 'vendorName' in doc;
};

const isFile = (doc: any): doc is AirtableFile => {
    return doc && 'name' in doc && 'uploadDate' in doc && !('subject' in doc);
};

const isEmail = (doc: any): doc is AirtableEmail => {
    return doc && 'subject' in doc && 'fromEmail' in doc;
};

export const ViewItemModal = ({ item, documentData, trigger, className }: ViewItemModalProps) => {
    // Tab state management for details panels
    const [activeTab, setActiveTab] = useState(() => {
        // Set appropriate default tab based on document type
        if (isInvoice(documentData)) return 'extracted';
        if (isEmail(documentData)) return 'overview'; 
        if (isFile(documentData)) return 'overview';
        return 'overview';
    });

    const defaultTrigger = (
        <Button size="sm" color="secondary">
            View
        </Button>
    );

    // Determine document type and get appropriate display name
    const getDocumentType = () => {
        if (isInvoice(documentData)) return 'Invoice';
        if (isFile(documentData)) return 'File';
        if (isEmail(documentData)) return 'Email';
        return item.type;
    };

    const getDocumentName = () => {
        if (isInvoice(documentData)) return documentData.invoiceNumber;
        if (isFile(documentData)) return documentData.name;
        if (isEmail(documentData)) return documentData.subject;
        return item.name;
    };

    return (
        <DialogTrigger>
            {trigger || defaultTrigger}
            <ModalOverlay isDismissable>
                {({ state }) => (
                    <Modal className={cx("max-w-7xl h-[90vh]", className)}>
                        <Dialog>
                            <div className="bg-white rounded-xl shadow-xl w-full h-full flex flex-col">
                                {/* Header */}
                                <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
                                    <div className="min-w-0 flex-1">
                                        <h2 className="text-lg font-semibold text-gray-900">
                                            {getDocumentType()}
                                        </h2>
                                        <p className="text-sm text-gray-500 mt-1 truncate">
                                            {getDocumentName()}
                                        </p>
                                    </div>
                                    <Button
                                        size="sm"
                                        color="secondary"
                                        iconLeading={X}
                                        aria-label="Close modal"
                                        onPress={() => state.close()}
                                    />
                                </div>

                                {/* Content - Split View */}
                                <div className="flex-1 flex overflow-hidden">
                                    {/* Left: Viewer (70% width, maximized) */}
                                    <div className="w-[70%] border-r border-gray-200 flex flex-col">
                                        {isEmail(documentData) ? (
                                            <HTMLEmailViewer 
                                                email={documentData} 
                                                className="h-full"
                                            />
                                        ) : (
                                            <PDFViewer 
                                                document={documentData || undefined} 
                                                className="h-full"
                                            />
                                        )}
                                    </div>

                                    {/* Right: Details Panel (30% width) */}
                                    <div className="w-[30%] flex flex-col overflow-hidden">
                                        {isInvoice(documentData) ? (
                                            <DocumentDetailsPanel 
                                                document={documentData} 
                                                className="h-full"
                                                activeTab={activeTab}
                                                onTabChange={setActiveTab}
                                            />
                                        ) : isEmail(documentData) ? (
                                            <EmailDetailsPanel 
                                                email={documentData} 
                                                className="h-full"
                                                activeTab={activeTab}
                                                onTabChange={setActiveTab}
                                            />
                                        ) : isFile(documentData) ? (
                                            <FileDetailsPanel 
                                                file={documentData} 
                                                className="h-full"
                                                activeTab={activeTab}
                                                onTabChange={setActiveTab}
                                            />
                                        ) : (
                                            // Fallback if no document data
                                            <div className="flex-1 flex items-center justify-center p-8">
                                                <div className="text-center">
                                                    <div className="text-6xl mb-4">📄</div>
                                                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                                                        No Document Data
                                                    </h3>
                                                    <p className="text-gray-600 mb-4">
                                                        Unable to load {item.type.toLowerCase()} details.
                                                    </p>
                                                    <div className="bg-gray-50 rounded-lg p-4 text-left max-w-sm">
                                                        <h4 className="font-medium text-gray-900 mb-2">Available Info:</h4>
                                                        <ul className="text-sm text-gray-600 space-y-1">
                                                            <li><strong>ID:</strong> {item.id}</li>
                                                            <li><strong>Name:</strong> {item.name}</li>
                                                            <li><strong>Type:</strong> {item.type}</li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Dialog>
                    </Modal>
                )}
            </ModalOverlay>
        </DialogTrigger>
    );
};
