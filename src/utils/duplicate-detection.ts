/**
 * Duplicate detection utilities for Files and Email processing
 * Updated to use file hash-based detection
 */

import type { AirtableFile } from "@/lib/airtable/files-hooks";
import { checkFileHashDuplicate } from "@/lib/duplicate-detection";
import { compareHashes } from "./file-hash";


export interface DuplicateResult {
    isDuplicate: boolean;
    duplicateOf?: string;
    confidence: number;
    reason: string;
}

export interface CandidateDocument {
    id: string;
    type: string;
    status: 'New' | 'Duplicate';
    duplicateOf?: string;
    confidence?: number;
}

/**
 * Detect if a file is a duplicate of existing files
 * Primary method: File hash comparison (most reliable)
 * Fallback: Metadata-based detection for legacy files
 */
export function detectFileDuplicates(
    file: AirtableFile, 
    existingFiles: AirtableFile[],
    baseId?: string
): DuplicateResult {
    // Primary: Hash-based duplicate detection (most reliable)
    if (file.fileHash) {
        const hashDuplicate = findHashDuplicate(file, existingFiles);
        if (hashDuplicate.isDuplicate) {
            return hashDuplicate;
        }
    }

    // Fallback: Metadata-based duplicate detection for files without hash
    const wholeFileDuplicate = findWholeFileDuplicate(file, existingFiles);
    if (wholeFileDuplicate.isDuplicate) {
        return wholeFileDuplicate;
    }

    // Within-file duplicate detection (for scanned documents with multiple sub-documents)
    const withinFileDuplicate = findWithinFileDuplicates(file, existingFiles);
    if (withinFileDuplicate.isDuplicate) {
        return withinFileDuplicate;
    }

    return {
        isDuplicate: false,
        confidence: 0,
        reason: 'No duplicates detected'
    };
}

/**
 * Find hash-based duplicates (most reliable method)
 */
function findHashDuplicate(
    file: AirtableFile,
    existingFiles: AirtableFile[]
): DuplicateResult {
    if (!file.fileHash) {
        return {
            isDuplicate: false,
            confidence: 0,
            reason: 'No file hash available for comparison'
        };
    }

    for (const existing of existingFiles) {
        if (existing.id === file.id) continue;
        
        if (existing.fileHash && compareHashes(file.fileHash, existing.fileHash)) {
            return {
                isDuplicate: true,
                duplicateOf: existing.id,
                confidence: 1.0,
                reason: `Exact file hash match with "${existing.name}"`
            };
        }
    }

    return {
        isDuplicate: false,
        confidence: 0,
        reason: 'No matching file hash found'
    };
}

/**
 * Find whole-file duplicates based on file content matching
 */
function findWholeFileDuplicate(
    file: AirtableFile, 
    existingFiles: AirtableFile[]
): DuplicateResult {
    for (const existing of existingFiles) {
        if (existing.id === file.id) continue;

        // Exact name match
        if (file.name === existing.name) {
            return {
                isDuplicate: true,
                duplicateOf: existing.id,
                confidence: 1.0,
                reason: `Exact filename match: ${file.name}`
            };
        }

        // Similar name with same vendor and amount
        if (
            file.vendor === existing.vendor &&
            file.amount === existing.amount &&
            file.vendor && existing.vendor &&
            file.amount && existing.amount
        ) {
            const nameSimilarity = calculateStringSimilarity(file.name, existing.name);
            if (nameSimilarity > 0.8) {
                return {
                    isDuplicate: true,
                    duplicateOf: existing.id,
                    confidence: nameSimilarity,
                    reason: `Similar filename with matching vendor and amount`
                };
            }
        }

        // Same document date, vendor, and amount (likely same invoice)
        if (
            file.documentDate && existing.documentDate &&
            file.vendor === existing.vendor &&
            file.amount === existing.amount &&
            file.documentDate.getTime() === existing.documentDate.getTime() &&
            file.vendor && file.amount
        ) {
            return {
                isDuplicate: true,
                duplicateOf: existing.id,
                confidence: 0.95,
                reason: `Same date, vendor, and amount`
            };
        }
    }

    return {
        isDuplicate: false,
        confidence: 0,
        reason: 'No whole-file duplicates found'
    };
}

/**
 * Find within-file duplicates (e.g., multiple invoices in one scanned document)
 */
function findWithinFileDuplicates(
    file: AirtableFile, 
    existingFiles: AirtableFile[]
): DuplicateResult {
    // This would require more sophisticated analysis of the file content
    // For now, we'll use heuristics based on metadata
    
    if (!file.pages || file.pages <= 1) {
        return {
            isDuplicate: false,
            confidence: 0,
            reason: 'Single page file, no within-file duplicates possible'
        };
    }

    // Check for files with similar vendor but different amounts (might be line items of same invoice)
    const suspiciousFiles = existingFiles.filter(existing => 
        existing.id !== file.id &&
        existing.vendor === file.vendor &&
        existing.documentDate && file.documentDate &&
        Math.abs(existing.documentDate.getTime() - file.documentDate.getTime()) < 24 * 60 * 60 * 1000 // Same day
    );

    if (suspiciousFiles.length > 0) {
        return {
            isDuplicate: true,
            duplicateOf: suspiciousFiles[0].id,
            confidence: 0.7,
            reason: `Multiple files from same vendor on same date - possible within-file duplicates`
        };
    }

    return {
        isDuplicate: false,
        confidence: 0,
        reason: 'No within-file duplicates detected'
    };
}

/**
 * Generate candidate documents from file attachments with duplicate detection
 */
export function generateDocumentCandidates(
    file: AirtableFile,
    attachments: any[], // Mock attachments data
    existingDocuments: any[]
): CandidateDocument[] {
    return attachments.map((attachment, index) => {
        const candidateId = `candidate_${file.id}_${index}`;
        
        // Check if this attachment would create a duplicate document
        const isDuplicateDocument = existingDocuments.some(doc => 
            doc.vendor === file.vendor &&
            doc.amount === file.amount &&
            doc.date === file.documentDate
        );

        return {
            id: candidateId,
            type: attachment.type || file.type,
            status: isDuplicateDocument ? 'Duplicate' : 'New',
            duplicateOf: isDuplicateDocument ? 'existing_doc_id' : undefined,
            confidence: isDuplicateDocument ? 0.85 : undefined
        };
    });
}

/**
 * Detect duplicate emails based on message content and metadata
 */
export function detectEmailDuplicates(
    email: any,
    existingEmails: any[]
): DuplicateResult {
    for (const existing of existingEmails) {
        if (existing.id === email.id) continue;

        // Exact message ID match
        if (email.messageId === existing.messageId && email.messageId) {
            return {
                isDuplicate: true,
                duplicateOf: existing.id,
                confidence: 1.0,
                reason: `Exact message ID match`
            };
        }

        // Same thread ID (conversation continuation)
        if (email.threadId === existing.threadId && email.threadId) {
            // This is not necessarily a duplicate, just related
            continue;
        }

        // Similar subject, same sender, close time frame
        const subjectSimilarity = calculateStringSimilarity(email.subject, existing.subject);
        const timeDiff = Math.abs(email.received.getTime() - existing.received.getTime());
        const sameDay = timeDiff < 24 * 60 * 60 * 1000;

        if (
            email.fromEmail === existing.fromEmail &&
            subjectSimilarity > 0.9 &&
            sameDay
        ) {
            return {
                isDuplicate: true,
                duplicateOf: existing.id,
                confidence: subjectSimilarity,
                reason: `Very similar subject from same sender within 24 hours`
            };
        }

        // Identical subject and sender (likely resend or forward)
        if (
            email.subject === existing.subject &&
            email.fromEmail === existing.fromEmail &&
            sameDay
        ) {
            return {
                isDuplicate: true,
                duplicateOf: existing.id,
                confidence: 0.95,
                reason: `Identical subject and sender within 24 hours`
            };
        }
    }

    return {
        isDuplicate: false,
        confidence: 0,
        reason: 'No duplicate emails detected'
    };
}

/**
 * Handle duplicate file processing rules
 */
export function handleFileDuplicateRules(file: AirtableFile): {
    canCreateDocument: boolean;
    canLinkToDocument: boolean;
    allowedActions: string[];
    blockedActions: string[];
    message: string;
} {
    if (!file.isDuplicate) {
        return {
            canCreateDocument: true,
            canLinkToDocument: true,
            allowedActions: ['create', 'link', 'archive', 'delete'],
            blockedActions: [],
            message: 'All actions available'
        };
    }

    return {
        canCreateDocument: false,
        canLinkToDocument: false,
        allowedActions: ['view', 'archive', 'delete'],
        blockedActions: ['create', 'link'],
        message: `Duplicate file - only view, archive, and delete allowed. Original: ${file.duplicateOf}`
    };
}

/**
 * Handle within-file duplicate processing
 */
export function processWithinFileDuplicates(
    candidates: CandidateDocument[]
): {
    newCandidates: CandidateDocument[];
    duplicateCandidates: CandidateDocument[];
    canProceed: boolean;
    warnings: string[];
} {
    const newCandidates = candidates.filter(c => c.status === 'New');
    const duplicateCandidates = candidates.filter(c => c.status === 'Duplicate');
    
    const warnings = duplicateCandidates.map(duplicate => 
        `Candidate "${duplicate.id}" is a duplicate of ${duplicate.duplicateOf}`
    );

    return {
        newCandidates,
        duplicateCandidates,
        canProceed: newCandidates.length > 0,
        warnings
    };
}

/**
 * Calculate string similarity using Levenshtein distance
 */
function calculateStringSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;
    
    const len1 = str1.length;
    const len2 = str2.length;
    
    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;

    const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(null));

    for (let i = 0; i <= len1; i++) {
        matrix[i][0] = i;
    }

    for (let j = 0; j <= len2; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1, // deletion
                matrix[i][j - 1] + 1, // insertion
                matrix[i - 1][j - 1] + cost // substitution
            );
        }
    }

    const distance = matrix[len1][len2];
    const maxLength = Math.max(len1, len2);
    return 1 - (distance / maxLength);
}

/**
 * Batch duplicate detection for multiple files
 */
export function batchDetectDuplicates(
    files: AirtableFile[]
): Map<string, DuplicateResult> {
    const results = new Map<string, DuplicateResult>();
    
    // Sort files by creation date to ensure we're checking against earlier files
    const sortedFiles = [...files].sort((a, b) => {
        const aTime = a.createdAt?.getTime() || 0;
        const bTime = b.createdAt?.getTime() || 0;
        return aTime - bTime;
    });

    for (let i = 0; i < sortedFiles.length; i++) {
        const file = sortedFiles[i];
        const previousFiles = sortedFiles.slice(0, i);
        const result = detectFileDuplicates(file, previousFiles);
        results.set(file.id, result);
    }

    return results;
}


