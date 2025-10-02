/**
 * Centralized error code definitions with icons and display text
 */

import { Copy01, AlertTriangle, XCircle, Clock, FileX02, AlertCircle, FileSearch02 } from "@untitledui/icons";
import type { ComponentType } from "react";

export interface ErrorCodeDefinition {
  code: string;
  displayName: string;
  icon: ComponentType<any>;
  color: 'warning' | 'error' | 'gray';
  description: string;
}

export const ERROR_CODES: Record<string, ErrorCodeDefinition> = {
  DUPLICATE_FILE: {
    code: 'DUPLICATE_FILE',
    displayName: 'Duplicate',
    icon: Copy01,
    color: 'error',
    description: 'This file is a duplicate of another file'
  },
  OCR_FAILED: {
    code: 'OCR_FAILED',
    displayName: 'OCR Failed',
    icon: FileSearch02,
    color: 'error',
    description: 'OCR processing failed or returned poor quality results'
  },
  PDF_CORRUPTED: {
    code: 'PDF_CORRUPTED',
    displayName: 'Corrupted File',
    icon: FileX02,
    color: 'error',
    description: 'PDF file is corrupted or unreadable'
  },
  UNSUPPORTED_FORMAT: {
    code: 'UNSUPPORTED_FORMAT',
    displayName: 'Unsupported Format',
    icon: AlertCircle,
    color: 'error',
    description: 'File format not supported for processing'
  },
  FILE_TOO_LARGE: {
    code: 'FILE_TOO_LARGE',
    displayName: 'File Too Large',
    icon: AlertTriangle,
    color: 'error',
    description: 'File exceeds size limits'
  },
  PROCESSING_ERROR: {
    code: 'PROCESSING_ERROR',
    displayName: 'Processing Error',
    icon: XCircle,
    color: 'error',
    description: 'An error occurred while processing this file'
  },
  VALIDATION_ERROR: {
    code: 'VALIDATION_ERROR',
    displayName: 'Validation Error',
    icon: AlertTriangle,
    color: 'error',
    description: 'This file failed validation checks'
  },
  TIMEOUT_ERROR: {
    code: 'TIMEOUT_ERROR',
    displayName: 'Timeout',
    icon: Clock,
    color: 'error',
    description: 'Processing timed out for this file'
  }
} as const;

/**
 * Get error code definition by code
 */
export function getErrorCodeDefinition(code?: string): ErrorCodeDefinition | null {
  if (!code) return null;
  return ERROR_CODES[code] || null;
}

/**
 * Check if a file has an error based on error code
 */
export function hasErrorCode(errorCode?: string): boolean {
  return !!errorCode && errorCode in ERROR_CODES;
}

/**
 * Get error description (centralized, consistent format)
 */
export function getErrorDescription(errorCode?: string): string {
  const definition = getErrorCodeDefinition(errorCode);
  if (!definition) return 'This file requires manual review or has processing errors';
  
  return definition.description;
}

/**
 * Get display name for error code (fallback to generic text)
 */
export function getErrorDisplayName(errorCode?: string): string {
  const definition = getErrorCodeDefinition(errorCode);
  return definition?.displayName || 'Needs Attention';
}

/**
 * Get icon for error code (fallback to AlertTriangle)
 */
export function getErrorIcon(errorCode?: string): ComponentType<any> {
  const definition = getErrorCodeDefinition(errorCode);
  return definition?.icon || AlertTriangle;
}

/**
 * Get color for error code (fallback to warning)
 */
export function getErrorColor(errorCode?: string): 'warning' | 'error' | 'gray' {
  const definition = getErrorCodeDefinition(errorCode);
  return definition?.color || 'warning';
}
