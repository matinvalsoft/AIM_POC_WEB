"use client";

import { cx } from "@/utils/cx";
import type { AirtableEmail } from "@/lib/airtable/emails-hooks";

interface HTMLEmailViewerProps {
    email?: AirtableEmail;
    className?: string;
}

export const HTMLEmailViewer = ({ email, className }: HTMLEmailViewerProps) => {
    // Debug logging
    console.log('DEBUG: HTMLEmailViewer render', {
        hasEmail: !!email,
        email: email ? {
            id: email.id,
            subject: email.subject,
            hasBody: !!email.body,
            bodyLength: email.body?.length || 0,
            bodyPreview: email.body?.substring(0, 100)
        } : null
    });

    if (!email) {
        return (
            <div className={cx("flex flex-col bg-white h-full", className)}>
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <div className="text-6xl mb-4">📧</div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Email Selected</h3>
                        <p className="text-gray-500">Select an email from the left sidebar to view it here</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={cx("flex flex-col bg-white h-full overflow-hidden", className)}>
            <div className="flex-1 overflow-y-auto p-6">
                {email.body ? (
                    <div dangerouslySetInnerHTML={{ __html: email.body }} />
                ) : (
                    <div className="flex items-center justify-center py-12">
                        <p className="text-gray-500">No email content available</p>
                    </div>
                )}
            </div>
        </div>
    );
};
