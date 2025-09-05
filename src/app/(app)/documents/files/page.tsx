"use client";

import { useState, useEffect } from "react";
import { CompactFilesList } from "@/components/documents/compact-files-list";
import { PDFViewer } from "@/components/documents/pdf-viewer";
import { FileDetailsPanel } from "@/components/documents/file-details-panel";
import { useFiles } from "@/lib/airtable/files-hooks";
import { logStatusChange, logFieldEdit } from "@/lib/airtable/activity-logger";
import { cx } from "@/utils/cx";
import type { AirtableFile } from "@/lib/airtable/files-hooks";

export default function FilesPage() {
    const [selectedFileId, setSelectedFileId] = useState<string>('');
    const [subView, setSubView] = useState('all');
    const [activeTab, setActiveTab] = useState('overview');
    
    // Use Airtable hook for files
    const { files, loading, error, updateFile, createFile, deleteFile, archiveFile } = useFiles({
        autoFetch: true
    });

    const selectedFile = files.find(file => file.id === selectedFileId);

    // Helper function to check if a file has blocking issues
    const hasBlockingIssues = (file: AirtableFile) => {
        // Files need attention if they're in attention state or are duplicates
        return file.status === 'Attention' || file.isDuplicate;
    };

    // Get the filtered and sorted files that match what the UI shows
    const filteredFiles = files
        .filter(file => {
            // Apply sub-view filter
            switch (subView) {
                case 'needs_attention': return hasBlockingIssues(file);
                case 'queued': return file.status === 'Queued';
                case 'processing': return file.status === 'Processing';
                case 'processed': return file.status === 'Processed';
                case 'error': return file.status === 'Error';
                case 'linked': return file.isLinked;
                case 'duplicates': return file.isDuplicate;
                default: return true;
            }
        })
        .sort((a, b) => {
            // Sort by blocking issues first (most urgent)
            const aHasIssues = hasBlockingIssues(a);
            const bHasIssues = hasBlockingIssues(b);
            
            if (aHasIssues && !bHasIssues) return -1;
            if (!aHasIssues && bHasIssues) return 1;
            
            // Then by status priority (Error -> Attention -> Processing -> Queued -> Processed)
            const statusPriority = { 'Error': 5, 'Attention': 4, 'Processing': 3, 'Queued': 2, 'Processed': 1 };
            const aPriority = statusPriority[a.status] || 0;
            const bPriority = statusPriority[b.status] || 0;
            
            if (aPriority !== bPriority) {
                return bPriority - aPriority;
            }
            
            // Then by upload date (most recent first)
            if (a.uploadDate && b.uploadDate) {
                return b.uploadDate.getTime() - a.uploadDate.getTime();
            }
            if (a.uploadDate && !b.uploadDate) return -1;
            if (!a.uploadDate && b.uploadDate) return 1;
            
            // Finally by name
            return a.name.localeCompare(b.name);
        });

    // Set initial selection when files load - use filtered files
    useEffect(() => {
        if (filteredFiles.length > 0 && !selectedFileId) {
            setSelectedFileId(filteredFiles[0].id);
        }
    }, [filteredFiles, selectedFileId]);

    const handleFileUpdate = async (updatedFile: AirtableFile) => {
        try {
            const originalFile = files.find(file => file.id === updatedFile.id);
            
            await updateFile(updatedFile.id, updatedFile);
            
            // Log field edits (non-status changes)
            if (originalFile) {
                const fieldsToCheck = [
                    'name', 'type', 'vendor', 'documentDate', 'amount', 'source', 'pages'
                ];
                
                for (const field of fieldsToCheck) {
                    const oldValue = originalFile[field as keyof AirtableFile];
                    const newValue = updatedFile[field as keyof AirtableFile];
                    
                    if (oldValue !== newValue) {
                        await logFieldEdit(
                            updatedFile.id,
                            updatedFile.name,
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
            console.error('Failed to update file:', err);
            // You could add a toast notification here
        }
    };

    // Status change handlers
    const handleMarkAsLinked = async (file: AirtableFile) => {
        try {
            const oldStatus = file.status;
            await updateFile(file.id, { status: 'Linked' });
            
            // Log the activity
            await logStatusChange(
                file.id,
                file.name,
                oldStatus,
                'Linked',
                'User', // TODO: Get actual user info
                'File marked as linked'
            );
        } catch (err) {
            console.error('Failed to mark as linked:', err);
        }
    };

    const handleMarkAsNeedsAttention = async (file: AirtableFile) => {
        try {
            const oldStatus = file.status;
            await updateFile(file.id, { status: 'Needs attention' });
            
            // Log the activity
            await logStatusChange(
                file.id,
                file.name,
                oldStatus,
                'Needs attention',
                'User', // TODO: Get actual user info
                'File marked as needing attention'
            );
        } catch (err) {
            console.error('Failed to mark as needs attention:', err);
        }
    };

    const handleArchive = async (file: AirtableFile) => {
        try {
            await archiveFile(file.id);
            
            // Log the activity
            await logStatusChange(
                file.id,
                file.name,
                file.status,
                'Archived',
                'User', // TODO: Get actual user info
                'File archived'
            );
        } catch (err) {
            console.error('Failed to archive file:', err);
        }
    };

    const handleDelete = async (file: AirtableFile) => {
        try {
            await deleteFile(file.id);
            
            // Clear selection if deleted file was selected
            if (selectedFileId === file.id) {
                const remainingFiles = files.filter(f => f.id !== file.id);
                setSelectedFileId(remainingFiles.length > 0 ? remainingFiles[0].id : '');
            }
        } catch (err) {
            console.error('Failed to delete file:', err);
        }
    };

    const handleReprocess = async (file: AirtableFile) => {
        try {
            // Reset file status to queued for reprocessing
            await updateFile(file.id, { 
                status: 'Queued',
                relatedInvoices: []  // Clear existing links
            });
        } catch (error) {
            console.error('Failed to reprocess file:', error);
        }
    };

    // Show loading state
    if (loading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading files...</p>
                </div>
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600 mb-4">Failed to load files: {error}</p>
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
    if (files.length === 0) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">📁</div>
                    <h2 className="text-xl font-semibold text-primary mb-2">No Files</h2>
                    <p className="text-tertiary">No files found. Upload some documents to get started.</p>
                </div>
            </div>
        );
    }

            return (
            <div className="flex h-full w-full overflow-hidden min-h-0">
                {/* Left Column - Compact Files List */}
                <div className="flex-shrink-0 h-full">
                    <CompactFilesList
                        files={files}
                        filteredFiles={filteredFiles}
                        selectedFileId={selectedFileId}
                        onSelectionChange={setSelectedFileId}
                        subView={subView}
                        onSubViewChange={setSubView}
                    />
                </div>

                {/* Center Column - PDF Viewer */}
                <div className="flex-1 min-w-0 overflow-hidden h-full">
                    <PDFViewer 
                        document={selectedFile} 
                    />
                </div>

                {/* Right Column - File Details */}
                <div className="flex-shrink-0 max-w-sm h-full">
                    <FileDetailsPanel
                        file={selectedFile}
                        onSave={handleFileUpdate}
                        onMarkAsLinked={handleMarkAsLinked}
                        onMarkAsNeedsAttention={handleMarkAsNeedsAttention}
                        onArchive={handleArchive}
                        onDelete={handleDelete}
                        onReprocess={handleReprocess}
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                    />
                </div>
            </div>
        );
}

