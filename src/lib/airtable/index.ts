/**
 * Airtable integration for Next.js
 * 
 * This module provides a complete Airtable Web API integration with:
 * - Rate limiting and retry logic
 * - Type-safe CRUD operations  
 * - Formula builders for safe filtering
 * - React hooks for client-side usage
 * - Webhook support for real-time updates
 * - OAuth support for multi-tenant apps
 */

// Core client and types
export { AirtableClient, createAirtableClient, paginateAll } from './client';
export type {
  AirtableRecord,
  AirtableCreateRecord,
  AirtableUpdateRecord,
  AirtableListResponse,
  AirtableListParams,
  AirtableCreateParams,
  AirtableUpdateParams,
  AirtableDeleteParams,
  AirtableConfig,
  AirtableAttachment,
  AirtableSelectOption,
  AirtableCollaborator,
} from './types';

// Formula builders
export {
  buildFilter,
  buildCondition,
  buildLogicalFilter,
  escapeFieldName,
  escapeStringValue,
  formatValue,
  validateFieldNames,
  filters,
  examples as filterExamples,
} from './formula';

export type {
  FilterCondition,
  LogicalFilter,
  FilterOperator,
  LogicalOperator,
} from './formula';

// Configuration and environment
export {
  loadAirtableConfig,
  validateConfig,
  AIRTABLE_DEFAULTS,
  ENVIRONMENT_SETUP,
} from './config';

export type {
  AirtableEnvironmentConfig,
} from './config';

// React hooks (client-side only)
export {
  useAirtable,
  useAirtableRecords,
  useAirtableRecord,
} from './hooks';

// Invoice-specific hooks and transforms
export {
  useInvoices,
  useInvoicesByStatus,
  usePendingInvoices,
  useInvoicesNeedingCoding,
  useInvoiceCounts,
} from './invoice-hooks';

// Delivery ticket-specific hooks and transforms
export {
  useDeliveryTickets,
  useDeliveryTicketsByStatus,
  usePendingDeliveryTickets,
  useDeliveryTicketsNeedingCoding,
  useDeliveryTicketCounts,
} from './delivery-ticket-hooks';

export {
  transformAirtableToInvoice,
  transformInvoiceToAirtable,
  transformAirtableToDeliveryTicket,
  transformDeliveryTicketToAirtable,
  INVOICE_FIELDS,
  DELIVERY_TICKET_FIELDS,
} from './transforms';

// Webhook management (available in API routes)
// export { WebhookManager } from '@/app/api/airtable/webhooks/route';

/**
 * Quick start example:
 * 
 * ```typescript
 * // Server-side usage
 * import { createAirtableClient, filters, buildFilter } from '@/lib/airtable';
 * 
 * const client = createAirtableClient('appXXXXXXXXXXXXXX');
 * 
 * // List records with filtering
 * const filter = buildFilter(
 *   filters.and(
 *     filters.equals('Status', 'Active'),
 *     filters.contains('Name', 'John')
 *   )
 * );
 * 
 * const response = await client.listRecords('Contacts', {
 *   filterByFormula: filter,
 *   sort: [{ field: 'Created', direction: 'desc' }],
 *   pageSize: 50,
 * });
 * 
 * // Create records
 * await client.createRecords('Contacts', {
 *   records: [
 *     { fields: { Name: 'John Doe', Email: 'john@example.com' } },
 *     { fields: { Name: 'Jane Smith', Email: 'jane@example.com' } },
 *   ],
 * });
 * ```
 * 
 * ```typescript
 * // Client-side usage with React
 * import { useAirtable, filters, buildFilter } from '@/lib/airtable';
 * 
 * function ContactsList() {
 *   const { records, loading, error, create, update, delete: deleteRecords } = useAirtable('Contacts', {
 *     baseId: 'appXXXXXXXXXXXXXX',
 *     initialParams: {
 *       filterByFormula: buildFilter(filters.equals('Status', 'Active')),
 *       sort: [{ field: 'Name', direction: 'asc' }],
 *     },
 *   });
 * 
 *   if (loading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error}</div>;
 * 
 *   return (
 *     <div>
 *       {records.map(record => (
 *         <div key={record.id}>
 *           {record.fields.Name} - {record.fields.Email}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */

// Re-export everything for convenience
export * from './types';
export * from './schema-types';
export * from './client';
export * from './formula';
export * from './config';
export * from './hooks';
export * from './transforms';
export * from './invoice-hooks';
export * from './delivery-ticket-hooks';
export * from './teams-hooks';
export * from './utils';
