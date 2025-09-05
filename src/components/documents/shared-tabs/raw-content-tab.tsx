"use client";

import React from 'react';
import { ButtonUtility } from '@/components/base/buttons/button-utility';
import { Copy01 } from '@untitledui/icons';
import { cx } from '@/utils/cx';

interface RawContentTabProps {
    title?: string;
    rawText: string;
    keyValues?: { [key: string]: string | number | null | undefined };
    onCopyText?: () => void;
    className?: string;
}

const formatKeyValue = (key: string, value: string | number | null | undefined): string => {
    if (value === null || value === undefined || value === '') {
        return '';
    }
    
    // Format currency values
    if (typeof value === 'number' && (key.toLowerCase().includes('amount') || key.toLowerCase().includes('total'))) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(value);
    }
    
    // Format date values
    if (value instanceof Date) {
        return value.toLocaleDateString();
    }
    
    return String(value);
};

export const RawContentTab: React.FC<RawContentTabProps> = ({ 
    title = "Raw Document Text",
    rawText,
    keyValues = {},
    onCopyText,
    className = ""
}) => {
    const handleCopyText = () => {
        if (onCopyText) {
            onCopyText();
        } else {
            navigator.clipboard.writeText(rawText);
        }
    };

    return (
        <div className={cx("space-y-4 w-full max-w-full", className)} style={{minWidth: 0}}>
            <div className="bg-secondary rounded-lg p-4 w-full max-w-full" style={{minWidth: 0}}>
                <div className="flex items-center justify-between mb-3 w-full max-w-full">
                    <h4 className="text-sm font-medium text-secondary truncate flex-1 min-w-0">{title}</h4>
                    <ButtonUtility 
                        size="xs" 
                        color="secondary"
                        icon={Copy01}
                        tooltip="Copy raw text"
                        onClick={handleCopyText}
                        className="flex-shrink-0 ml-2"
                    />
                </div>
                <div className="text-xs text-tertiary font-mono bg-tertiary rounded p-3 max-h-64 overflow-y-auto w-full max-w-full overflow-x-hidden" style={{minWidth: 0}}>
                    <div className="space-y-2 w-full max-w-full overflow-hidden" style={{minWidth: 0}}>
                        {/* Show key-value pairs first if provided */}
                        {Object.entries(keyValues).map(([key, value]) => {
                            const formattedValue = formatKeyValue(key, value);
                            if (!formattedValue) return null;
                            
                            return (
                                <p key={key} className="break-all w-full max-w-full overflow-hidden" style={{minWidth: 0}}>
                                    <strong className="break-normal">{key}:</strong> {formattedValue}
                                </p>
                            );
                        })}
                        
                        {/* Show raw text if no structured data or as fallback */}
                        {(Object.keys(keyValues).length === 0 || rawText !== JSON.stringify(keyValues)) && (
                            <div className="whitespace-pre-wrap break-words w-full max-w-full overflow-hidden" style={{minWidth: 0}}>
                                {rawText}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
