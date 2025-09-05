# Airtable Integration for Next.js

This is a complete, production-ready Airtable integration for Next.js applications that follows Airtable's latest Web API guidelines and best practices.

## Features

✅ **Full CRUD operations** - Create, read, update, delete records  
✅ **Advanced querying** - Filtering, sorting, pagination  
✅ **Rate limiting** - Respects Airtable's 5 req/s per base limits  
✅ **Retry logic** - Exponential backoff with jitter  
✅ **Type safety** - Full TypeScript support  
✅ **React hooks** - Easy client-side integration  
✅ **Formula builders** - Safe filter construction  
✅ **Webhook support** - Real-time change notifications  
✅ **OAuth ready** - Multi-tenant support  
✅ **Server-side only** - All secrets kept secure  

## Quick Start

### 1. Environment Setup

Create a `.env.local` file with your Airtable credentials:

```bash
# Required: Your Personal Access Token
AIRTABLE_PAT=patXXXXXXXXXXXXXX.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Optional: Default base ID
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX

# Optional: For webhook support
AIRTABLE_WEBHOOK_SECRET=your_webhook_secret_here
```

Get your PAT from: https://airtable.com/create/tokens

### 2. Server-side Usage

```typescript
import { createAirtableClient, filters, buildFilter } from '@/lib/airtable';

const client = createAirtableClient('appXXXXXXXXXXXXXX');

// List records with filtering and sorting
const filter = buildFilter(
  filters.and(
    filters.equals('Status', 'Active'),
    filters.contains('Name', 'John')
  )
);

const response = await client.listRecords('Contacts', {
  filterByFormula: filter,
  sort: [{ field: 'Created', direction: 'desc' }],
  pageSize: 50,
});

// Create records
await client.createRecords('Contacts', {
  records: [
    { fields: { Name: 'John Doe', Email: 'john@example.com' } },
    { fields: { Name: 'Jane Smith', Email: 'jane@example.com' } },
  ],
});

// Update records
await client.updateRecords('Contacts', {
  records: [
    { id: 'recXXXXXXXXXXXXXX', fields: { Status: 'Inactive' } },
  ],
});

// Delete records
await client.deleteRecords('Contacts', {
  records: ['recXXXXXXXXXXXXXX', 'recYYYYYYYYYYYYYY'],
});
```

### 3. Client-side Usage with React

```typescript
import { useAirtable, filters, buildFilter } from '@/lib/airtable';

function ContactsList() {
  const { 
    records, 
    loading, 
    error, 
    create, 
    update, 
    delete: deleteRecords,
    hasMore,
    fetchMore 
  } = useAirtable('Contacts', {
    baseId: 'appXXXXXXXXXXXXXX',
    autoFetch: true,  // Explicit auto-fetch control
    initialParams: {
      filterByFormula: buildFilter(filters.equals('Status', 'Active')),
      sort: [{ field: 'Name', direction: 'asc' }],
    },
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {records.map(record => (
        <div key={record.id}>
          {record.fields.Name} - {record.fields.Email}
        </div>
      ))}
      {hasMore && (
        <button onClick={fetchMore}>Load More</button>
      )}
    </div>
  );
}
```

### 4. Specialized Invoice Hooks

For domain-specific use cases, create specialized hooks:

```typescript
import { useInvoices, useInvoiceCounts } from '@/lib/airtable';

function InvoicesPage() {
  // Fetches invoices with their related line items automatically
  const { invoices, loading, error, updateInvoice } = useInvoices({
    autoFetch: true
  });

  // Get status counts for badges
  const { counts } = useInvoiceCounts();

  const handleStatusUpdate = async (invoiceId: string, status: string) => {
    await updateInvoice(invoiceId, { status });
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Invoices ({counts.total})</h1>
      {invoices.map(invoice => (
        <div key={invoice.id}>
          {invoice.invoiceNumber} - ${invoice.amount}
          <span>Status: {invoice.status}</span>
          <span>Lines: {invoice.lines?.length || 0}</span>
        </div>
      ))}
    </div>
  );
}
```

## API Endpoints

The integration provides these Next.js API routes:

### GET `/api/airtable/[table]`

List records with pagination and filtering.

**Query Parameters:**
- `baseId` - Airtable base ID (optional if set in env)
- `view` - View name to use
- `pageSize` - Records per page (max 100)
- `offset` - Pagination cursor
- `filter` - Formula string for filtering
- `sort[0][field]` - Field to sort by
- `sort[0][direction]` - Sort direction (`asc` or `desc`)
- `fields[]` - Fields to include in response

**Example:**
```bash
GET /api/airtable/Contacts?pageSize=25&filter=AND({Status}="Active")&sort[0][field]=Name&sort[0][direction]=asc
```

### POST `/api/airtable/[table]`

Create records (single or batch).

**Body:**
```json
{
  "records": [
    { "fields": { "Name": "John Doe", "Email": "john@example.com" } },
    { "fields": { "Name": "Jane Smith", "Email": "jane@example.com" } }
  ],
  "typecast": true
}
```

### PATCH `/api/airtable/[table]`

Update records (batch).

**Body:**
```json
{
  "records": [
    { "id": "recXXXXXXXXXXXXXX", "fields": { "Status": "Inactive" } }
  ],
  "typecast": true
}
```

### DELETE `/api/airtable/[table]`

Delete records by ID.

**Body:**
```json
{
  "ids": ["recXXXXXXXXXXXXXX", "recYYYYYYYYYYYYYY"]
}
```

## Safe Formula Building

Use the formula builders to create safe filters:

```typescript
import { filters, buildFilter } from '@/lib/airtable';

// Simple filters
const activeContacts = buildFilter(filters.equals('Status', 'Active'));
const searchResults = buildFilter(filters.contains('Name', 'John'));

// Complex filters with AND/OR
const complexFilter = buildFilter(
  filters.and(
    filters.equals('Status', 'Active'),
    filters.or(
      filters.contains('Name', 'John'),
      filters.contains('Email', '@company.com')
    ),
    filters.not(filters.isEmpty('Phone'))
  )
);

// Field validation (prevents injection)
const isValid = validateFieldNames(filter, ['Name', 'Email', 'Status', 'Phone']);
```

## Webhook Support

Set up real-time change notifications:

```typescript
import { WebhookManager } from '@/lib/airtable';

const webhookManager = new WebhookManager('appXXXXXXXXXXXXXX');

// Create webhook
const webhook = await webhookManager.createWebhook({
  notificationUrl: 'https://yourdomain.com/api/airtable/webhooks',
  specification: {
    options: {
      filters: {
        dataTypes: ['tableData'],
        recordChangeScope: 'tblXXXXXXXXXXXXXX', // Optional: specific table
      },
    },
  },
  includePreviousCellValues: true,
});

// The webhook endpoint at /api/airtable/webhooks will:
// 1. Verify the signature
// 2. Parse the payload
// 3. Call your custom handlers for create/update/delete events
```

## Rate Limiting & Error Handling

The client automatically handles:

- **Rate limits** - 5 requests/second per base, 50 requests/second per token
- **Retry logic** - Exponential backoff with jitter on failures
- **Error normalization** - Consistent error format across all operations

```typescript
// All operations are automatically rate-limited and retried
try {
  const records = await client.listRecords('Table');
} catch (error) {
  // Errors are normalized with helpful messages
  console.error(error.message);
}
```

## Field Types Support

The integration supports all Airtable field types:

- **Text** - Single line text, long text, email, URL, phone
- **Numbers** - Number, currency, percent, duration
- **Dates** - Date, date/time, created time, last modified time  
- **Selections** - Single select, multiple select
- **Links** - Link to another record
- **Attachments** - File attachments
- **Formulas** - Formula fields (read-only)
- **Special** - Checkbox, rating, barcode, etc.

## OAuth for Multi-tenant Apps

For multi-tenant applications, implement OAuth:

```typescript
// 1. Redirect user to Airtable OAuth
const authUrl = `https://airtable.com/oauth2/v1/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=data.records:read data.records:write`;

// 2. Handle callback and exchange code for tokens
// 3. Store tokens per user (encrypted)
// 4. Use tokens in client instead of PAT
```

## Demo Component

A complete demo component is available at `src/components/examples/airtable-demo.tsx` showing:

- Configuration setup
- CRUD operations
- Filtering and pagination
- Error handling
- Loading states

## Best Practices

1. **Environment Variables** - Always use PAT in server environment, never expose in client
2. **Rate Limiting** - The client handles this automatically
3. **Field Validation** - Use `validateFieldNames()` to prevent formula injection
4. **Error Handling** - Wrap operations in try/catch blocks
5. **Pagination** - Use `hasMore` and `fetchMore` for large datasets
6. **Caching** - Consider implementing cache invalidation on webhook events
7. **React Hooks Rules** - Always call hooks at the top level, never inside conditions or loops
8. **Dependency Management** - Use `useCallback` and `useMemo` properly to prevent infinite loops
9. **Batch Operations** - Fetch related data in parallel, not sequentially
10. **Loading States** - Always show appropriate loading and error states
11. **Optimistic Updates** - Update local state immediately for better UX

## Troubleshooting

### Common Issues

**"PAT is required" error:**
- Ensure `AIRTABLE_PAT` is set in your `.env.local` file
- Verify the PAT has proper scopes (data.records:read, data.records:write)

**Rate limit errors:**
- The client handles this automatically with backoff
- Check if you're making too many parallel requests

**Invalid formula errors:**
- Use the formula builders instead of raw strings
- Validate field names with `validateFieldNames()`

**Webhook not receiving events:**
- Verify the webhook URL is publicly accessible
- Check the signature verification with correct secret
- Ensure webhook hasn't expired (7 days default)

**Infinite API request loops:**
- Check `useEffect` dependencies - avoid including functions that change on every render
- Use `useCallback` for functions passed as dependencies
- Set `autoFetch: true` explicitly and avoid triggering fetches in effects

**React Hooks violations:**
- Always call all hooks before any conditional returns
- Never call hooks inside loops, conditions, or nested functions
- Move `useMemo` and `useCallback` calls to the top of components

**Loading states stuck:**
- Check for concurrent request prevention in hooks
- Ensure loading states are properly reset in finally blocks
- Verify error handling doesn't leave loading=true

**Next.js 15 compatibility:**
- Ensure `params` in API routes are awaited: `const resolvedParams = await params`
- Update route handlers to use `Promise<{ param: string }>` type

## File Structure

```
src/lib/airtable/
├── index.ts              # Main exports
├── types.ts              # TypeScript definitions
├── client.ts             # Core Airtable client
├── formula.ts            # Safe formula builders
├── config.ts             # Configuration utilities
├── hooks.ts              # Generic React hooks
├── invoice-hooks.ts      # Specialized invoice hooks
├── transforms.ts         # Data transformation utilities
└── utils.ts              # Helper utilities (debounce, cache)

src/app/api/airtable/
├── [table]/route.ts      # CRUD endpoint handlers
├── schema/route.ts       # Schema retrieval endpoint
└── webhooks/route.ts     # Webhook receiver

src/components/examples/
└── airtable-demo.tsx     # Demo component
```

## Dependencies

The integration uses only built-in Next.js and browser APIs:
- `fetch` for HTTP requests
- `crypto` for webhook signature verification
- React hooks for client-side state management

No additional packages required! 🎉
