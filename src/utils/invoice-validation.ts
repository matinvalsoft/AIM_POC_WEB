import type { Invoice } from "@/types/documents";

export interface ValidationIssue {
    type: 'missing_field' | 'line_total_mismatch' | 'currency_invalid' | 'advisory';
    field?: string;
    message: string;
    blocking: boolean;
}

export interface ValidationResult {
    isValid: boolean;
    issues: ValidationIssue[];
    canMarkAsReviewed: boolean;
}

/**
 * Determines if invoice is in multi-line coding mode
 * Uses the isMultilineCoding flag to determine coding behavior
 */
export function isMultiLineMode(invoice: Invoice): boolean {
    return invoice.isMultilineCoding;
}

/**
 * Validates line total integrity for multi-line invoices
 */
export function validateLineTotals(invoice: Invoice): ValidationIssue | null {
    if (!isMultiLineMode(invoice)) {
        return null; // Not applicable to single-line mode
    }

    const lineSum = (invoice.lines || []).reduce((sum, line) => sum + line.amount, 0);
    const invoiceAmount = invoice.amount || 0;

    if (Math.abs(lineSum - invoiceAmount) > 0.001) { // Allow for floating point precision
        return {
            type: 'line_total_mismatch',
            message: 'Line totals don\'t match invoice total',
            blocking: true
        };
    }

    return null;
}

// Currency validation removed (not tracked)

/**
 * Gets required fields based on invoice mode
 */
export function getRequiredFields(invoice: Invoice): Array<{key: string, label: string, value: any}> {
    const baseFields = [
        { key: 'vendorName', label: 'Vendor', value: invoice.vendorName },
        { key: 'invoiceNumber', label: 'Invoice #', value: invoice.invoiceNumber },
        { key: 'invoiceDate', label: 'Invoice Date', value: invoice.invoiceDate },
        { key: 'amount', label: 'Amount', value: invoice.amount },
    ];

    // In single-line mode, also require coding fields
    if (!isMultiLineMode(invoice)) {
        baseFields.push(
            { key: 'project', label: 'Project (ISBN)', value: invoice.project || '' },
            { key: 'task', label: 'Task', value: invoice.task || '' },
            { key: 'costCenter', label: 'Cost Center', value: invoice.costCenter || '' },
            { key: 'glAccount', label: 'GL Account', value: invoice.glAccount || '' }
        );
    }

    return baseFields;
}

/**
 * Validates missing required fields
 */
export function validateRequiredFields(invoice: Invoice): ValidationIssue[] {
    const requiredFields = getRequiredFields(invoice);
    const missingFields = requiredFields.filter(field => !field.value);

    return missingFields.map(field => ({
        type: 'missing_field' as const,
        field: field.key,
        message: field.label,
        blocking: true
    }));
}

/**
 * Gets advisory issues (non-blocking)
 */
export function getAdvisoryIssues(invoice: Invoice): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Vendor code is advisory only
    if (!invoice.vendorCode) {
        issues.push({
            type: 'advisory',
            field: 'vendorCode',
            message: 'Vendor Code is missing (can be backfilled from master data)',
            blocking: false
        });
    }

    return issues;
}

/**
 * Comprehensive invoice validation
 */
export function validateInvoice(invoice: Invoice): ValidationResult {
    const issues: ValidationIssue[] = [];

    // Required fields validation
    issues.push(...validateRequiredFields(invoice));

    // Currency validation removed

    // Line total validation (multi-line mode only)
    const lineTotalIssue = validateLineTotals(invoice);
    if (lineTotalIssue) {
        issues.push(lineTotalIssue);
    }

    // Advisory issues
    issues.push(...getAdvisoryIssues(invoice));

    const blockingIssues = issues.filter(issue => issue.blocking);
    
    return {
        isValid: blockingIssues.length === 0,
        issues,
        canMarkAsReviewed: blockingIssues.length === 0
    };
}

/**
 * Helper to check if invoice has any blocking issues
 */
export function hasBlockingIssues(invoice: Invoice): boolean {
    return !validateInvoice(invoice).isValid;
}

/**
 * Get formatted message for missing required fields
 */
export function getMissingFieldsMessage(invoice: Invoice): string {
    const validation = validateInvoice(invoice);
    const missingFields = validation.issues
        .filter(issue => issue.type === 'missing_field')
        .map(issue => issue.message);
    
    const otherBlockingIssues = validation.issues
        .filter(issue => issue.blocking && issue.type !== 'missing_field')
        .map(issue => issue.message);

    const allBlockingMessages = [...missingFields, ...otherBlockingIssues];
    
    if (allBlockingMessages.length === 0) {
        return '';
    }

    const missingText = missingFields.length > 0 ? `Missing: ${missingFields.join(', ')}` : '';
    const otherText = otherBlockingIssues.join('; ');
    
    return [missingText, otherText].filter(Boolean).join('; ');
}

/**
 * Get sort priority for invoice based on status and missing fields
 * Lower number = higher priority (sorted first)
 */
export function getInvoiceSortPriority(invoice: Invoice): number {
    const status = invoice.status;
    const hasBlockingIssuesResult = hasBlockingIssues(invoice);

    switch (status) {
        case 'rejected':
            return 1;
        case 'open':
            // Drafts and edited with missing fields come before those without
            return hasBlockingIssuesResult ? 2 : 3;
        case 'pending':
            return 4;
        case 'approved':
            return 5;
        case 'exported':
            return 6;
        default:
            return 999; // Unknown status goes last
    }
}

/**
 * Sort invoices by priority: rejected, drafts/edited with missing fields, drafts/edited, pending, approved, exported
 */
export function sortInvoicesByPriority(invoices: Invoice[]): Invoice[] {
    return [...invoices].sort((a, b) => {
        const priorityA = getInvoiceSortPriority(a);
        const priorityB = getInvoiceSortPriority(b);
        
        if (priorityA !== priorityB) {
            return priorityA - priorityB;
        }
        
        // If same priority, sort by updated date (most recent first)
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
}
