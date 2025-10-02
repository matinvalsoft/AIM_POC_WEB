"use client";

import { useRef } from "react";
import { cx } from "@/utils/cx";
import type { Invoice } from "@/types/documents";
import type { AirtableFile } from "@/lib/airtable/files-hooks";

import { AttachmentViewer } from "./attachment-viewer";
import type { AirtableAttachment } from "@/lib/airtable/types";

type ViewerDocument = Invoice | AirtableFile | any;

interface PDFViewerProps {
    document?: ViewerDocument;
    className?: string;
    keyboardNav?: any;
}

// Simplified PDF viewer - only shows attachments from Airtable

export const PDFViewer = ({ document, className, keyboardNav }: PDFViewerProps) => {
    const containerRef = useRef<HTMLDivElement | null>(null);

    // Get attachments from the document
    const getAttachments = (): AirtableAttachment[] => {
        if (!document) return [];
        
        // Check for attachments property on the document
        if ('attachments' in document && document.attachments) {
            return document.attachments;
        }
        
        return [];
    };

    const attachments = getAttachments();

    // No additional logic needed - just render attachments

    if (!document) {
        return (
            <div className={cx("flex flex-col bg-secondary h-full", className)}>
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <div className="text-6xl mb-4">📄</div>
                        <h3 className="text-lg font-medium text-primary mb-2">No Document Selected</h3>
                        <p className="text-tertiary">Select a document from the left sidebar to view it here</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={cx("flex flex-col bg-secondary h-full", className)}>
            {/* Content Area - Just show attachments */}
            <div ref={containerRef} className="flex-1 overflow-hidden">
                <AttachmentViewer 
                    attachments={attachments}
                    className="h-full"
                />
            </div>
        </div>
    );
};

