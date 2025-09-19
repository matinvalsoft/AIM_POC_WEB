"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/base/buttons/button';
import { FileDownload02, LinkExternal01, File01, Image01, PlayCircle, MusicNote01, Archive } from '@untitledui/icons';
import type { AirtableAttachment } from '@/lib/airtable/types';
import { cx } from '@/utils/cx';

interface AttachmentViewerProps {
  attachments: AirtableAttachment[];
  className?: string;
  maxHeight?: string;
}

interface AttachmentItemProps {
  attachment: AirtableAttachment;
  isSelected: boolean;
  onSelect: () => void;
}

const AttachmentItem = ({ attachment, isSelected, onSelect }: AttachmentItemProps) => {
  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return Image01;
    if (type.startsWith('video/')) return PlayCircle;
    if (type.startsWith('audio/')) return MusicNote01;
    if (type.includes('pdf')) return File01;
    if (type.includes('zip') || type.includes('tar') || type.includes('rar')) return Archive;
    return File01;
  };

  const getFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const FileIcon = getFileIcon(attachment.type);

  return (
    <div 
      className={cx(
        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
        isSelected 
          ? "border-primary-300 bg-primary-50" 
          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
      )}
      onClick={onSelect}
    >
      <FileIcon className="h-5 w-5 text-gray-600" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {attachment.filename}
        </p>
        <p className="text-xs text-gray-500">
          {getFileSize(attachment.size)} • {attachment.type}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          color="secondary"
          iconLeading={FileDownload02}
          onClick={(e) => {
            e.stopPropagation();
            window.open(attachment.url, '_blank');
          }}
          aria-label="Download attachment"
        />
        <Button
          size="sm"
          color="secondary"
          iconLeading={LinkExternal01}
          onClick={(e) => {
            e.stopPropagation();
            window.open(attachment.url, '_blank');
          }}
          aria-label="Open in new tab"
        />
      </div>
    </div>
  );
};

const AttachmentPreview = ({ attachment }: { attachment: AirtableAttachment }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isImage = attachment.type.startsWith('image/');
  const isPDF = attachment.type.includes('pdf');
  const isVideo = attachment.type.startsWith('video/');
  const isAudio = attachment.type.startsWith('audio/');

  // Quick loading states - no delays, immediate response
  const handleLoad = () => setLoading(false);
  const handleError = () => {
    setLoading(false);
    setError('Failed to load attachment');
  };

  // Reset states when attachment changes
  useEffect(() => {
    setError(null);
    setLoading(false); // Start optimistic - assume it will load fast
  }, [attachment.id]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <File01 className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Preview</h3>
        <p className="text-gray-500 mb-4">{attachment.filename}</p>
        <Button
          color="primary"
          iconLeading={FileDownload02}
          onClick={() => window.open(attachment.url, '_blank')}
        >
          Download File
        </Button>
      </div>
    );
  }

  if (isPDF) {
    // Use object tag for direct PDF display - fast and lightweight
    return (
      <div className="w-full h-full bg-gray-100">
        <object
          data={attachment.url}
          type="application/pdf"
          className="w-full h-full"
          onLoad={handleLoad}
          onError={handleError}
        >
          {/* Fallback if object tag fails */}
          <div className="flex flex-col items-center justify-center h-full p-8">
            <File01 className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">PDF Preview</h3>
            <p className="text-gray-500 mb-4">{attachment.filename}</p>
            <div className="flex gap-2">
              <Button
                color="primary"
                iconLeading={LinkExternal01}
                onClick={() => window.open(attachment.url, '_blank')}
              >
                Open PDF
              </Button>
              <Button
                color="secondary"
                iconLeading={FileDownload02}
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = attachment.url;
                  link.download = attachment.filename;
                  link.click();
                }}
              >
                Download
              </Button>
            </div>
          </div>
        </object>
      </div>
    );
  }

  if (isImage) {
    return (
      <div className="h-full flex items-center justify-center p-4 bg-gray-50">
        <img 
          src={attachment.url} 
          alt={attachment.filename}
          className="max-h-full max-w-full object-contain shadow-lg rounded"
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
        />
      </div>
    );
  }

  if (isVideo) {
    return (
      <div className="h-full flex items-center justify-center p-4 bg-black">
        <video 
          src={attachment.url}
          controls 
          className="max-h-full max-w-full shadow-lg rounded"
          onLoadedData={handleLoad}
          onError={handleError}
          preload="metadata"
        >
          Your browser does not support video playback.
        </video>
      </div>
    );
  }

  if (isAudio) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 bg-gray-50">
        <MusicNote01 className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-4">{attachment.filename}</h3>
        <audio 
          src={attachment.url} 
          controls 
          className="w-full max-w-md"
          onLoadedData={handleLoad}
          onError={handleError}
          preload="metadata"
        >
          Your browser does not support audio playback.
        </audio>
      </div>
    );
  }

  // Fallback for other file types
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-gray-50">
      <File01 className="h-12 w-12 text-gray-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">{attachment.filename}</h3>
      <p className="text-gray-500 mb-2">
        {(attachment.size / 1024 / 1024).toFixed(2)} MB • {attachment.type}
      </p>
      <p className="text-sm text-gray-600 mb-4">
        This file type cannot be previewed in the browser.
      </p>
      <Button
        color="primary"
        iconLeading={FileDownload02}
        onClick={() => window.open(attachment.url, '_blank')}
      >
        Download File
      </Button>
    </div>
  );
};

export const AttachmentViewer = ({ attachments, className, maxHeight = "h-full" }: AttachmentViewerProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Reset selection when attachments change (e.g., switching invoices)
  useEffect(() => {
    setSelectedIndex(0);
  }, [attachments]);

  if (!attachments || attachments.length === 0) {
    return (
      <div className={cx("flex flex-col items-center justify-center text-center p-8", maxHeight, className)}>
        <File01 className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Attachments Available</h3>
        <p className="text-gray-500">This document does not have any attachments from Airtable.</p>
      </div>
    );
  }

  const selectedAttachment = attachments[selectedIndex];

  return (
    <div className={cx("flex flex-col", maxHeight, className)}>
      {/* Attachment List - Only show if multiple attachments, hidden for single PDFs */}
      {attachments.length > 1 && (
        <div className="border-b border-gray-200 p-4 bg-gray-50">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Attachments ({attachments.length})
          </h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {attachments.map((attachment, index) => (
              <AttachmentItem
                key={attachment.id}
                attachment={attachment}
                isSelected={index === selectedIndex}
                onSelect={() => setSelectedIndex(index)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Attachment Preview - No custom header for single attachments */}
      <div className="flex-1 overflow-hidden">
        <AttachmentPreview attachment={selectedAttachment} />
      </div>
    </div>
  );
};

export default AttachmentViewer;
