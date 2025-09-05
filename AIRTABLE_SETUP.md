# Airtable Integration Setup

## Quick Setup

### Option 1: Automated Setup (Recommended)

Run the setup script to create your `.env.local` file interactively:

```bash
node setup-airtable-env.js
```

This will:
- Prompt you for your Airtable credentials
- Create a properly configured `.env.local` file
- Provide next steps

### Option 2: Manual Setup

Create a `.env.local` file in your project root with the following content:

```bash
# Airtable Integration Environment Variables

# ==============================================================================
# REQUIRED VARIABLES
# ==============================================================================

# Your Airtable Personal Access Token (PAT)
# Get from: https://airtable.com/create/tokens
AIRTABLE_PAT=your_personal_access_token_here

# ==============================================================================
# OPTIONAL VARIABLES
# ==============================================================================

# Default Airtable Base ID (can also be provided via API calls)
# Format: appXXXXXXXXXXXXXX
AIRTABLE_BASE_ID=your_base_id_here

# ==============================================================================
# WEBHOOK CONFIGURATION (Optional)
# ==============================================================================

# Webhook secret for signature verification
# AIRTABLE_WEBHOOK_SECRET=your_webhook_secret_here

# ==============================================================================
# OAUTH CONFIGURATION (Optional - for multi-tenant apps)
# ==============================================================================

# OAuth Client ID from your Airtable OAuth app
# AIRTABLE_CLIENT_ID=your_oauth_client_id_here

# OAuth Client Secret from your Airtable OAuth app
# AIRTABLE_CLIENT_SECRET=your_oauth_client_secret_here

# OAuth Redirect URI (must match what's configured in Airtable)
# AIRTABLE_REDIRECT_URI=http://localhost:3000/api/airtable/oauth/callback

# ==============================================================================
# PERFORMANCE TUNING (Optional)
# ==============================================================================

# Rate limiting per base (default: 5 requests per second)
AIRTABLE_RATE_LIMIT_PER_BASE=5

# Rate limiting per token (default: 50 requests per second)  
AIRTABLE_RATE_LIMIT_PER_TOKEN=50

# Enable in-memory caching for schema lookups (default: true)
AIRTABLE_ENABLE_CACHE=true

# Cache TTL in seconds (default: 300 = 5 minutes)
AIRTABLE_CACHE_TTL=300
```

## Getting Your Credentials

### 1. Personal Access Token (PAT) - Required

1. Go to [https://airtable.com/create/tokens](https://airtable.com/create/tokens)
2. Click "Create new token"
3. Give it a name like "Next.js App Integration"
4. Add these scopes:
   - `data.records:read`
   - `data.records:write`
   - `schema.bases:read` (optional, for field validation)
5. Add your base(s) to the token
6. Copy the token and replace `your_personal_access_token_here` in your `.env.local`

**Example PAT format:**
```
patXXXXXXXXXXXXXX.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### 2. Base ID - Optional

1. Open your Airtable base in the browser
2. Look at the URL: `https://airtable.com/appXXXXXXXXXXXXXX/...`
3. The part that starts with "app" is your Base ID
4. Replace `your_base_id_here` in your `.env.local`

**Example Base ID format:**
```
appXXXXXXXXXXXXXX
```

> **Note:** You can also provide the Base ID at runtime via API calls if you prefer not to set a default.

### 3. Webhook Secret - Optional

If you plan to use webhooks for real-time updates:

1. Webhooks are created programmatically via the API
2. The secret will be provided when you create the webhook
3. See `/app/api/airtable/webhooks/route.ts` for webhook management

### 4. OAuth Credentials - Optional

For multi-tenant applications:

1. Create an OAuth integration following [Airtable's OAuth guide](https://airtable.com/developers/web/guides/oauth-integrations)
2. Get your Client ID and Secret from the OAuth app settings
3. Configure the redirect URI to match your app

## Testing Your Setup

### 1. Use the Demo Component

```typescript
import { AirtableDemo } from '@/components/examples/airtable-demo';

export default function TestPage() {
  return <AirtableDemo />;
}
```

### 2. Quick API Test

```typescript
// In a server component or API route
import { createAirtableClient } from '@/lib/airtable';

const client = createAirtableClient('appXXXXXXXXXXXXXX'); // or use env var
const records = await client.listRecords('YourTableName');
console.log('Found records:', records.records.length);
```

### 3. React Hook Test

```typescript
// In a client component
'use client';
import { useAirtable } from '@/lib/airtable';

export function TestComponent() {
  const { records, loading, error } = useAirtable('YourTableName', {
    baseId: 'appXXXXXXXXXXXXXX', // or use env var
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      Found {records.length} records
    </div>
  );
}
```

## Security Checklist

- [ ] `.env.local` is in your `.gitignore` (Next.js includes this by default)
- [ ] PAT has minimum required scopes
- [ ] Different tokens for development, staging, and production
- [ ] Secrets are never exposed in client-side code
- [ ] Regular token rotation for production

## Troubleshooting

### "PAT is required" Error
- Verify `AIRTABLE_PAT` is set in `.env.local`
- Check the PAT has proper scopes
- Ensure the PAT hasn't expired

### "Base not found" Error
- Verify your Base ID format (starts with `app`)
- Check the PAT has access to the specific base
- Try providing Base ID via code instead of env var

### Rate Limit Errors
- The client handles rate limits automatically
- Reduce concurrent requests if needed
- Check you're not exceeding 5 req/s per base

### CORS Errors
- All Airtable calls must be server-side
- Use the provided API routes, not direct calls from client
- Never expose PAT in browser code

## Next Steps

1. ✅ Set up environment variables
2. 🧪 Test with the demo component
3. 📖 Read the [full documentation](./AIRTABLE_INTEGRATION.md)
4. 🚀 Start building your integration!

## Environment File Location

Your `.env.local` file should be in the root of your Next.js project:

```
your-nextjs-app/
├── .env.local          ← Create this file here
├── package.json
├── next.config.mjs
├── src/
│   ├── app/
│   ├── lib/airtable/   ← Integration code
│   └── components/
└── ...
```
