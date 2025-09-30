import type { Invoice, DeliveryTicket } from "@/types/documents";

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
export function isMultiLineMode(invoice: Invoice | DeliveryTicket): boolean {
    return invoice.isMultilineCoding || false;
}

/**
 * Validates line total integrity for multi-line invoices
 */
export function validateLineTotals(invoice: Invoice | DeliveryTicket): ValidationIssue | null {
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
export function getRequiredFields(invoice: Invoice | DeliveryTicket): Array<{key: string, label: string, value: any}> {
    const baseFields = [
        { key: 'vendorName', label: 'Vendor Name', value: invoice.vendorName },
        { key: 'vendorCode', label: 'Vendor Code', value: invoice.vendorCode },
        { key: 'invoiceNumber', label: 'Invoice #', value: invoice.invoiceNumber },
        { key: 'invoiceDate', label: 'Invoice Date', value: invoice.invoiceDate },
    ];

    // Add team field for both invoices and delivery tickets
    // Team is now the standard field (Store Number is deprecated)
    baseFields.push({ key: 'team', label: 'Team', value: invoice.team && invoice.team.length > 0 ? invoice.team : null });

    // GL Account is no longer required per new requirements
    // if (!isMultiLineMode(invoice)) {
    //     baseFields.push(
    //         { key: 'glAccount', label: 'GL Account', value: invoice.glAccount || '' }
    //     );
    // }

    return baseFields;
}

/**
 * Validates missing required fields
 */
export function validateRequiredFields(invoice: Invoice | DeliveryTicket): ValidationIssue[] {
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

    // No advisory issues currently defined
    // Vendor code is now a required field

    return issues;
}

/**
 * Comprehensive invoice validation
 * Now primarily uses server-side validation from Airtable
 */
export function validateInvoice(invoice: Invoice | DeliveryTicket): ValidationResult {
    const issues: ValidationIssue[] = [];

    // Use server-side validation if available (from Airtable formula field)
    if (invoice.missingFieldsMessage) {
        // Parse the missing fields message (e.g., "Vendor Code, Amount")
        const hasBlockingIssues = invoice.missingFieldsMessage.trim().length > 0;
        if (hasBlockingIssues) {
            // Create a blocking issue for display
            issues.push({
                type: 'missing_field',
                message: invoice.missingFieldsMessage,
                blocking: true
            });
        }
    } else {
        // Fallback to client-side validation for backward compatibility
        // Required fields validation
        issues.push(...validateRequiredFields(invoice));

        // Line total validation (multi-line mode only)
        const lineTotalIssue = validateLineTotals(invoice);
        if (lineTotalIssue) {
            issues.push(lineTotalIssue);
        }

        // Advisory issues
        issues.push(...getAdvisoryIssues(invoice));
    }

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
export function hasBlockingIssues(invoice: Invoice | DeliveryTicket): boolean {
    return !validateInvoice(invoice).isValid;
}

/**
 * Get formatted message for missing required fields
 * Now reads from Airtable's server-side validation field
 */
export function getMissingFieldsMessage(invoice: Invoice | DeliveryTicket): string {
    // Use server-side validation from Airtable if available
    if (invoice.missingFieldsMessage) {
        return invoice.missingFieldsMessage;
    }
    
    // Fallback to client-side validation for backward compatibility
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

    // Return field names without "Missing:" prefix to match Airtable format
    const missingText = missingFields.length > 0 ? missingFields.join(', ') : '';
    const otherText = otherBlockingIssues.join('; ');
    
    return [missingText, otherText].filter(Boolean).join('; ');
}

/**
 * Get sort priority for invoice based on status and missing fields
 * Lower number = higher priority (sorted first)
 */
export function getInvoiceSortPriority(invoice: Invoice | DeliveryTicket): number {
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
export function sortInvoicesByPriority(invoices: (Invoice | DeliveryTicket)[]): (Invoice | DeliveryTicket)[] {
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
