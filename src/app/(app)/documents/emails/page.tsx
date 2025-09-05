"use client";

import { useState, useEffect } from "react";
import { CompactEmailsList } from "@/components/documents/compact-emails-list";
import { HTMLEmailViewer } from "@/components/documents/html-email-viewer";
import { EmailDetailsPanel } from "@/components/documents/email-details-panel";
import { useEmails } from "@/lib/airtable/emails-hooks";
import { logStatusChange, logFieldEdit } from "@/lib/airtable/activity-logger";
import { cx } from "@/utils/cx";
import type { AirtableEmail } from "@/lib/airtable/emails-hooks";

export default function EmailsPage() {
    const [selectedEmailId, setSelectedEmailId] = useState<string>('');
    const [subView, setSubView] = useState('all');
    const [activeTab, setActiveTab] = useState('overview');
    
    // Use Airtable hook for emails
    const { emails, loading, error, updateEmail, deleteEmail, markAsProcessed, markAsIgnored, retryProcessing } = useEmails({
        autoFetch: true
    });

    // Debug logging
    useEffect(() => {
        console.log('DEBUG: emails state changed', {
            emailsCount: emails.length,
            selectedEmailId,
            loading,
            error,
            emailIds: emails.map(e => e.id),
            hasTargetEmail: emails.some(e => e.id === 'rec907bEkaUX4EHzA')
        });
    }, [emails, selectedEmailId, loading, error]);

    const selectedEmail = emails.find(email => email.id === selectedEmailId);
    
    // Debug selected email
    useEffect(() => {
        console.log('DEBUG: selectedEmail changed', {
            selectedEmailId,
            selectedEmail: selectedEmail ? {
                id: selectedEmail.id,
                subject: selectedEmail.subject,
                hasBody: !!selectedEmail.body,
                bodyLength: selectedEmail.body?.length || 0
            } : null
        });
    }, [selectedEmail, selectedEmailId]);

    // Helper function to check if an email has blocking issues
    const hasBlockingIssues = (email: AirtableEmail) => {
        // Emails need attention if they're in error state
        return email.status === 'Error';
    };

    // Get the filtered and sorted emails that match what the UI shows
    const filteredEmails = emails
        .filter(email => {
            // Apply sub-view filter
            switch (subView) {
                case 'needs_attention': return hasBlockingIssues(email);
                case 'linked': return email.status === 'Linked';
                case 'unlinked': return email.status === 'Unlinked';
                case 'error': return email.status === 'Error';
                case 'with_attachments': return (email.attachmentsCount || 0) > 0;
                case 'vendor_mapped': return email.vendor && email.vendor.trim() !== '';
                default: return true;
            }
        })
        .sort((a, b) => {
            // Sort by blocking issues first (most urgent)
            const aHasIssues = hasBlockingIssues(a);
            const bHasIssues = hasBlockingIssues(b);
            
            if (aHasIssues && !bHasIssues) return -1;
            if (!aHasIssues && bHasIssues) return 1;
            
            // Then by status priority (Error -> Unlinked -> Linked)
            const statusPriority = { 'Error': 3, 'Unlinked': 2, 'Linked': 1 };
            const aPriority = statusPriority[a.status] || 0;
            const bPriority = statusPriority[b.status] || 0;
            
            if (aPriority !== bPriority) {
                return bPriority - aPriority;
            }
            
            // Then by received date (most recent first)
            return b.received.getTime() - a.received.getTime();
        });

    // Set initial selection when emails load - use filtered emails
    useEffect(() => {
        if (filteredEmails.length > 0 && !selectedEmailId) {
            setSelectedEmailId(filteredEmails[0].id);
        }
    }, [filteredEmails, selectedEmailId]);

    const handleEmailUpdate = async (updatedEmail: AirtableEmail) => {
        try {
            const originalEmail = emails.find(email => email.id === updatedEmail.id);
            
            await updateEmail(updatedEmail.id, updatedEmail);
            
            // Log field edits (non-status changes)
            if (originalEmail) {
                const fieldsToCheck = [
                    'subject', 'fromName', 'fromEmail', 'vendor', 'processingAddress'
                ];
                
                for (const field of fieldsToCheck) {
                    const oldValue = originalEmail[field as keyof AirtableEmail];
                    const newValue = updatedEmail[field as keyof AirtableEmail];
                    
                    if (oldValue !== newValue) {
                        await logFieldEdit(
                            updatedEmail.id,
                            updatedEmail.subject,
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
            console.error('Failed to update email:', err);
            // You could add a toast notification here
        }
    };

    // Status change handlers
    const handleMarkAsProcessed = async (email: AirtableEmail, reason?: string) => {
        try {
            const oldStatus = email.status;
            await markAsProcessed(email.id, reason);
            
            // Log the activity
            await logStatusChange(
                email.id,
                email.subject,
                oldStatus,
                'Processed',
                'User', // TODO: Get actual user info
                reason || 'Email marked as processed'
            );
        } catch (err) {
            console.error('Failed to mark as processed:', err);
        }
    };

    const handleMarkAsIgnored = async (email: AirtableEmail, reason: string) => {
        try {
            const oldStatus = email.status;
            await markAsIgnored(email.id, reason);
            
            // Log the activity
            await logStatusChange(
                email.id,
                email.subject,
                oldStatus,
                'Ignored',
                'User', // TODO: Get actual user info
                `Email ignored: ${reason}`
            );
        } catch (err) {
            console.error('Failed to mark as ignored:', err);
        }
    };

    const handleRetryProcessing = async (email: AirtableEmail) => {
        try {
            const oldStatus = email.status;
            await retryProcessing(email.id);
            
            // Log the activity
            await logStatusChange(
                email.id,
                email.subject,
                oldStatus,
                'New',
                'User', // TODO: Get actual user info
                'Email processing retried'
            );
        } catch (err) {
            console.error('Failed to retry processing:', err);
        }
    };

    const handleCreateDocument = async (email: AirtableEmail, selectedAttachments: string[]) => {
        try {
            // This would trigger document creation from selected email attachments
            // For now, we'll mark the email as processed
            await handleMarkAsProcessed(email, 'Document created from attachments');
        } catch (err) {
            console.error('Failed to create document:', err);
        }
    };

    const handleLinkToDocument = async (email: AirtableEmail, documentId: string) => {
        try {
            // Link email to existing document
            await updateEmail(email.id, { status: 'Processed' });
            
            // Log the activity
            await logStatusChange(
                email.id,
                email.subject,
                email.status,
                'Processed',
                'User', // TODO: Get actual user info
                `Email linked to document ${documentId}`
            );
        } catch (err) {
            console.error('Failed to link to document:', err);
        }
    };

    const handleUpdateLinks = async (email: AirtableEmail) => {
        try {
            // Logic for updating email links would go here
            console.log('Update links for email:', email.id);
        } catch (error) {
            console.error('Failed to update links:', error);
        }
    };

    const handleDelete = async (email: AirtableEmail) => {
        try {
            await deleteEmail(email.id);
            
            // Clear selection if deleted email was selected
            if (selectedEmailId === email.id) {
                const remainingEmails = emails.filter(e => e.id !== email.id);
                setSelectedEmailId(remainingEmails.length > 0 ? remainingEmails[0].id : '');
            }
        } catch (err) {
            console.error('Failed to delete email:', err);
        }
    };

    // Show loading state
    if (loading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading emails...</p>
                </div>
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600 mb-4">Failed to load emails: {error}</p>
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
    if (emails.length === 0) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">📧</div>
                    <h2 className="text-xl font-semibold text-primary mb-2">No Emails</h2>
                    <p className="text-tertiary">No emails found. Check your email processing setup.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full w-full overflow-hidden min-h-0">
            {/* Left Column - Compact Emails List */}
            <div className="flex-shrink-0 h-full">
                <CompactEmailsList
                    emails={emails}
                    filteredEmails={filteredEmails}
                    selectedEmailId={selectedEmailId}
                    onSelectionChange={setSelectedEmailId}
                    subView={subView}
                    onSubViewChange={setSubView}
                />
            </div>

            {/* Center Column - HTML Email Viewer */}
            <div className="flex-1 min-w-0 overflow-hidden h-full">
                <HTMLEmailViewer 
                    email={selectedEmail} 
                />
            </div>

            {/* Right Column - Email Details */}
            <div className="flex-shrink-0 max-w-sm h-full">
                <EmailDetailsPanel
                    email={selectedEmail}
                    onSave={handleEmailUpdate}
                    onMarkAsProcessed={handleMarkAsProcessed}
                    onMarkAsIgnored={handleMarkAsIgnored}
                    onRetryProcessing={handleRetryProcessing}
                    onCreateDocument={handleCreateDocument}
                    onLinkToDocument={handleLinkToDocument}
                    onUpdateLinks={handleUpdateLinks}
                    onDelete={handleDelete}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                />
            </div>
        </div>
    );
}
