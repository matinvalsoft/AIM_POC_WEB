# 🚨 HTTP 500 Error Fix - Missing Environment Variables

## The Problem
The `useFileCounts` hook is failing with HTTP 500 because your `.env.local` file is missing. The application needs environment variables to connect to Airtable.

## The Solution

### Step 1: Create `.env.local` file
```bash
cp ENV_TEMPLATE.txt .env.local
```

### Step 2: Fill in your actual values in `.env.local`

**REQUIRED** - Replace these placeholders:
- `AIRTABLE_BASE_ID` - Your new Airtable base ID
- `AIRTABLE_PAT` - Your Airtable Personal Access Token 
- `NEXT_PUBLIC_AIRTABLE_BASE_ID` - Same as AIRTABLE_BASE_ID (for client-side)
- `OPENAI_API_KEY` - Your OpenAI key (you said you have this)
- `BLOB_READ_WRITE_TOKEN` - Your Vercel Blob token (you said you have this)

### Step 3: Get your Airtable credentials

**Airtable Base ID:**
1. Go to your Airtable base
2. Click "Help" → "API documentation" 
3. Your base ID starts with `app` (e.g., `appXXXXXXXXXXXXXX`)

**Airtable Personal Access Token:**
1. Go to https://airtable.com/create/tokens
2. Create a new token with these scopes:
   - `data.records:read`
   - `data.records:write` 
   - `schema.bases:read`
3. Add your base to the token

### Step 4: Restart your dev server
```bash
npm run dev
```

## What was wrong:
- All Airtable hooks were trying to access environment variables that didn't exist
- The `useFileCounts` hook specifically failed because `BASE_ID` was undefined
- Without the `.env.local` file, the app couldn't connect to your Airtable base

## After fixing:
✅ `useFileCounts` will work  
✅ File upload → Airtable → OCR workflow will work  
✅ All Airtable operations will work  

The HTTP 500 error will be resolved once you create the `.env.local` file with the correct values.