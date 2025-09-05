/**
 * Airtable Webhooks handler for real-time change notifications
 * Handles webhook subscription management and change notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAirtableClient } from '@/lib/airtable/client';
import crypto from 'crypto';

// Force this route to use Node.js runtime for server-side operations
export const runtime = 'nodejs';

interface WebhookPayload {
  base: {
    id: string;
  };
  webhook: {
    id: string;
  };
  timestamp: string;
  changedTablesById: Record<string, {
    changedRecordsById: Record<string, {
      current?: {
        cellValuesByFieldId: Record<string, any>;
        createdTime: string;
      };
      previous?: {
        cellValuesByFieldId: Record<string, any>;
        createdTime: string;
      };
    }>;
    createdRecordsById: Record<string, any>;
    destroyedRecordIds: string[];
  }>;
}

interface WebhookSubscription {
  id: string;
  macSecretBase64: string;
  expirationTime: string;
  notificationUrl: string;
  isHookEnabled: boolean;
  cursorForNextPayload: number;
  includeCellValuesInFieldIds: string[];
  includePreviousCellValues: boolean;
  includeCreatedTime: boolean;
  areTablesIncluded: boolean;
  specification: {
    options: {
      filters: {
        dataTypes: string[];
        recordChangeScope?: string;
        watchDataInFieldIds?: string[];
      };
    };
  };
}

/**
 * Error response helper
 */
function errorResponse(message: string, status = 400) {
  return NextResponse.json(
    { error: { message, status } },
    { status }
  );
}

/**
 * Verify webhook signature using HMAC
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', Buffer.from(secret, 'base64'))
      .update(payload)
      .digest('base64');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return false;
  }
}

/**
 * Process webhook payload and handle change events
 */
async function processWebhookChanges(payload: WebhookPayload): Promise<void> {
  console.log('Processing webhook changes:', {
    baseId: payload.base.id,
    webhookId: payload.webhook.id,
    timestamp: payload.timestamp,
    tablesChanged: Object.keys(payload.changedTablesById).length,
  });

  // Process each changed table
  for (const [tableId, tableChanges] of Object.entries(payload.changedTablesById)) {
    console.log(`Processing changes for table ${tableId}:`, {
      changedRecords: Object.keys(tableChanges.changedRecordsById).length,
      createdRecords: Object.keys(tableChanges.createdRecordsById).length,
      destroyedRecords: tableChanges.destroyedRecordIds.length,
    });

    // Handle created records
    for (const [recordId, recordData] of Object.entries(tableChanges.createdRecordsById)) {
      await handleRecordCreated(tableId, recordId, recordData);
    }

    // Handle changed records
    for (const [recordId, changeData] of Object.entries(tableChanges.changedRecordsById)) {
      await handleRecordChanged(tableId, recordId, changeData);
    }

    // Handle destroyed records
    for (const recordId of tableChanges.destroyedRecordIds) {
      await handleRecordDestroyed(tableId, recordId);
    }
  }
}

/**
 * Handle record creation events
 */
async function handleRecordCreated(tableId: string, recordId: string, recordData: any): Promise<void> {
  console.log(`Record created in table ${tableId}:`, recordId);
  
  // TODO: Implement your logic here
  // Examples:
  // - Update cache/search index
  // - Send notifications
  // - Trigger workflows
  // - Update related systems
}

/**
 * Handle record change events
 */
async function handleRecordChanged(
  tableId: string,
  recordId: string,
  changeData: { current?: any; previous?: any }
): Promise<void> {
  console.log(`Record changed in table ${tableId}:`, recordId);
  
  // TODO: Implement your logic here
  // Examples:
  // - Compare current vs previous values
  // - Update cache/search index
  // - Send change notifications
  // - Audit trail logging
}

/**
 * Handle record deletion events
 */
async function handleRecordDestroyed(tableId: string, recordId: string): Promise<void> {
  console.log(`Record destroyed in table ${tableId}:`, recordId);
  
  // TODO: Implement your logic here
  // Examples:
  // - Remove from cache/search index
  // - Clean up related data
  // - Send deletion notifications
}

/**
 * POST /api/airtable/webhooks - Receive webhook notifications
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-airtable-content-mac');
    
    if (!signature) {
      return errorResponse('Missing webhook signature', 401);
    }

    // Get webhook secret from environment
    const webhookSecret = process.env.AIRTABLE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('AIRTABLE_WEBHOOK_SECRET not configured');
      return errorResponse('Webhook secret not configured', 500);
    }

    // Verify signature
    if (!verifyWebhookSignature(body, signature, webhookSecret)) {
      return errorResponse('Invalid webhook signature', 401);
    }

    // Parse payload
    const payload: WebhookPayload = JSON.parse(body);
    
    // Process changes asynchronously
    await processWebhookChanges(payload);
    
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to process webhook',
      500
    );
  }
}

/**
 * Helper functions for webhook management
 */
export class WebhookManager {
  private client: ReturnType<typeof createAirtableClient>;
  private baseId: string;

  constructor(baseId: string) {
    this.baseId = baseId;
    this.client = createAirtableClient(baseId);
  }

  /**
   * Create a new webhook subscription
   */
  async createWebhook(config: {
    notificationUrl: string;
    specification: {
      options: {
        filters: {
          dataTypes: ('tableData' | 'tableSchema')[];
          recordChangeScope?: 'tblXXXXXXXXXXXXXX' | 'viwXXXXXXXXXXXXXX';
          watchDataInFieldIds?: string[];
        };
      };
    };
    includePreviousCellValues?: boolean;
    includeCreatedTime?: boolean;
  }): Promise<WebhookSubscription> {
    const url = `https://api.airtable.com/v0/bases/${this.baseId}/webhooks`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_PAT}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to create webhook: ${error.error?.message}`);
    }

    return response.json();
  }

  /**
   * List existing webhooks
   */
  async listWebhooks(): Promise<{ webhooks: WebhookSubscription[] }> {
    const url = `https://api.airtable.com/v0/bases/${this.baseId}/webhooks`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_PAT}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to list webhooks: ${error.error?.message}`);
    }

    return response.json();
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    const url = `https://api.airtable.com/v0/bases/${this.baseId}/webhooks/${webhookId}`;
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_PAT}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to delete webhook: ${error.error?.message}`);
    }
  }

  /**
   * Refresh a webhook (extends expiration time)
   */
  async refreshWebhook(webhookId: string): Promise<WebhookSubscription> {
    const url = `https://api.airtable.com/v0/bases/${this.baseId}/webhooks/${webhookId}/refresh`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_PAT}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to refresh webhook: ${error.error?.message}`);
    }

    return response.json();
  }
}
