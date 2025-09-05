"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { FileUpload } from "@/components/application/file-upload/file-upload-base";
import { Button } from "@/components/base/buttons/button";
import { Folder } from "@untitledui/icons";

interface UploadedFile {
    id: string;
    name: string;
    size: number;
    progress: number;
    failed?: boolean;
    type?: string;
}

export default function UploadPage() {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const router = useRouter();

    // Check if all files are uploaded
    const allFilesComplete = useMemo(() => {
        return files.length > 0 && files.every(file => file.progress === 100 && !file.failed);
    }, [files]);

    // Check if any files are currently uploading
    const hasActiveUploads = useMemo(() => {
        return files.some(file => file.progress < 100 && !file.failed);
    }, [files]);

    const simulateFileUpload = (uploadedFiles: FileList) => {
        const newFiles: UploadedFile[] = Array.from(uploadedFiles).map((file) => ({
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            size: file.size,
            progress: 0,
            type: file.type,
        }));

        setFiles((prev) => [...prev, ...newFiles]);

        // Simulate upload progress for each file
        newFiles.forEach((file) => {
            const interval = setInterval(() => {
                setFiles((prev) =>
                    prev.map((f) => {
                        if (f.id === file.id) {
                            const newProgress = Math.min(f.progress + Math.random() * 30, 100);
                            if (newProgress === 100) {
                                clearInterval(interval);
                            }
                            return { ...f, progress: newProgress };
                        }
                        return f;
                    })
                );
            }, 200);
        });
    };

    const handleDelete = (fileId: string) => {
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
    };

    const handleRetry = (fileId: string) => {
        setFiles((prev) =>
            prev.map((f) =>
                f.id === fileId ? { ...f, failed: false, progress: 0 } : f
            )
        );

        // Restart upload simulation
        const interval = setInterval(() => {
            setFiles((prev) =>
                prev.map((f) => {
                    if (f.id === fileId) {
                        const newProgress = Math.min(f.progress + Math.random() * 30, 100);
                        if (newProgress === 100) {
                            clearInterval(interval);
                        }
                        return { ...f, progress: newProgress };
                    }
                    return f;
                })
            );
        }, 200);
    };

    return (
        <div className="container mx-auto max-w-4xl p-6">
            <div className="mb-8">
                <h1 className="text-2xl font-semibold text-secondary mb-2">Upload Files</h1>
                <p className="text-tertiary mb-4">
                    Upload your documents, images, and other files. Drag and drop files or click to browse.
                </p>
                
                {hasActiveUploads && (
                    <div className="bg-brand-50 border border-brand-200 rounded-lg p-4 mb-4">
                        <p className="text-sm font-medium text-brand-800 mb-1">Upload in progress</p>
                        <p className="text-sm text-brand-700">
                            Please keep this page open while your files are uploading. Do not close the browser or navigate away.
                        </p>
                    </div>
                )}

                {allFilesComplete && (
                    <div className="bg-success-50 border border-success-200 rounded-lg p-4 mb-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-success-800 mb-1">All uploads complete!</p>
                                <p className="text-sm text-success-700">
                                    Your files have been successfully uploaded.
                                </p>
                            </div>
                            <Button 
                                color="primary" 
                                size="sm"
                                onClick={() => router.push('/documents/files')}
                                className="flex items-center gap-2"
                            >
                                <Folder className="size-4" />
                                View Files
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <FileUpload.Root>
                <FileUpload.DropZone
                    hint="All document types accepted - PDF, DOC, XLS, images, and more up to 50MB each"
                    maxSize={50 * 1024 * 1024} // 50MB
                    allowsMultiple={true}
                    onDropFiles={simulateFileUpload}
                    onDropUnacceptedFiles={(rejectedFiles) => {
                        console.log("Rejected files:", rejectedFiles);
                        // Handle rejected files (show error message, etc.)
                    }}
                    onSizeLimitExceed={(oversizedFiles) => {
                        console.log("Oversized files:", oversizedFiles);
                        // Handle oversized files (show error message, etc.)
                    }}
                />

                {files.length > 0 && (
                    <div>
                        <h2 className="text-lg font-medium text-secondary mb-4">
                            Uploading {files.length} file{files.length !== 1 ? 's' : ''}
                        </h2>
                        <FileUpload.List>
                            {files.map((file) => (
                                <FileUpload.ListItemProgressBar
                                    key={file.id}
                                    name={file.name}
                                    size={file.size}
                                    progress={file.progress}
                                    failed={file.failed}
                                    onDelete={() => handleDelete(file.id)}
                                    onRetry={() => handleRetry(file.id)}
                                />
                            ))}
                        </FileUpload.List>
                    </div>
                )}
            </FileUpload.Root>
        </div>
    );
}
