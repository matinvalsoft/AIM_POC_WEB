/**
 * Airtable Web API client with rate limiting and retry logic
 * Follows Airtable's rate limits: 5 req/s per base, 50 req/s per token
 */

import {
  AirtableConfig,
  AirtableListParams,
  AirtableListResponse,
  AirtableCreateParams,
  AirtableUpdateParams,
  AirtableDeleteParams,
  AirtableRecord,
  AirtableErrorResponse,
  RetryConfig,
  RateLimitInfo,
} from './types';

export class AirtableClient {
  private config: AirtableConfig;
  private retryConfig: RetryConfig;
  private rateLimitInfo: Map<string, RateLimitInfo> = new Map();

  constructor(config: AirtableConfig) {
    this.config = {
      apiUrl: 'https://api.airtable.com/v0',
      ...config,
    };

    this.retryConfig = {
      maxRetries: 5,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffFactor: 2,
    };
  }

  /**
   * Rate limiting per base (5 req/s per base)
   */
  private async rateLimit(baseId: string): Promise<void> {
    const key = `base:${baseId}`;
    const info = this.rateLimitInfo.get(key) || {
      requestsPerSecond: 5,
      lastRequestTime: 0,
      requestQueue: [],
    };

    const now = Date.now();
    const timeSinceLastRequest = now - info.lastRequestTime;
    const minInterval = 1000 / info.requestsPerSecond; // 200ms for 5 req/s

    if (timeSinceLastRequest < minInterval) {
      const delay = minInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    info.lastRequestTime = Date.now();
    this.rateLimitInfo.set(key, info);
  }

  /**
   * Exponential backoff with jitter
   */
  private async delay(attempt: number, retryAfter?: number): Promise<void> {
    if (retryAfter) {
      // Use Retry-After header if provided
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      return;
    }

    const baseDelay = this.retryConfig.baseDelay;
    const exponentialDelay = baseDelay * Math.pow(this.retryConfig.backoffFactor, attempt);
    const jitteredDelay = exponentialDelay * (0.5 + Math.random() * 0.5);
    const delay = Math.min(jitteredDelay, this.retryConfig.maxDelay);

    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Make HTTP request with retry logic
   */
  private async makeRequest<T>(
    url: string,
    options: RequestInit,
    attempt = 0
  ): Promise<T> {
    await this.rateLimit(this.config.baseId);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${this.config.token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      // Handle rate limiting
      if (response.status === 429) {
        if (attempt >= this.retryConfig.maxRetries) {
          throw new Error(`Rate limit exceeded after ${this.retryConfig.maxRetries} retries`);
        }

        const retryAfter = response.headers.get('Retry-After');
        await this.delay(attempt, retryAfter ? parseInt(retryAfter) : undefined);
        return this.makeRequest<T>(url, options, attempt + 1);
      }

      // Handle other errors
      if (!response.ok) {
        const errorData: AirtableErrorResponse = await response.json().catch(() => ({
          error: {
            type: 'UNKNOWN_ERROR',
            message: `HTTP ${response.status}: ${response.statusText}`,
          },
        }));

        throw new Error(`Airtable API Error: ${errorData.error.message}`);
      }

      return response.json();
    } catch (error) {
      // Retry on network errors
      if (attempt < this.retryConfig.maxRetries && error instanceof TypeError) {
        await this.delay(attempt);
        return this.makeRequest<T>(url, options, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Build URL with query parameters
   */
  private buildUrl(table: string, params?: Record<string, any>): string {
    const baseUrl = `${this.config.apiUrl}/${this.config.baseId}/${encodeURIComponent(table)}`;
    
    if (!params) return baseUrl;

    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(item => searchParams.append(key, String(item)));
        } else {
          searchParams.append(key, String(value));
        }
      }
    });

    const queryString = searchParams.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }

  /**
   * List records with pagination support
   */
  async listRecords(table: string, params: AirtableListParams = {}): Promise<AirtableListResponse> {
    const queryParams: Record<string, any> = {};

    if (params.view) queryParams.view = params.view;
    if (params.pageSize) queryParams.pageSize = Math.min(params.pageSize, 100);
    if (params.offset) queryParams.offset = params.offset;
    if (params.maxRecords) queryParams.maxRecords = params.maxRecords;
    if (params.filterByFormula) queryParams.filterByFormula = params.filterByFormula;
    if (params.fields) params.fields.forEach(field => queryParams['fields[]'] = field);
    
    if (params.sort) {
      params.sort.forEach((sortField, index) => {
        queryParams[`sort[${index}][field]`] = sortField.field;
        queryParams[`sort[${index}][direction]`] = sortField.direction;
      });
    }

    const url = this.buildUrl(table, queryParams);
    return this.makeRequest<AirtableListResponse>(url, { method: 'GET' });
  }

  /**
   * Get all records by paginating through all pages
   */
  async getAllRecords(table: string, params: AirtableListParams = {}): Promise<AirtableRecord[]> {
    const allRecords: AirtableRecord[] = [];
    let offset: string | undefined;

    do {
      const response = await this.listRecords(table, { ...params, offset });
      allRecords.push(...response.records);
      offset = response.offset;
    } while (offset);

    return allRecords;
  }

  /**
   * Create records (single or batch)
   */
  async createRecords(
    table: string,
    params: AirtableCreateParams
  ): Promise<{ records: AirtableRecord[] }> {
    const url = this.buildUrl(table);
    return this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Update records (single or batch)
   */
  async updateRecords(
    table: string,
    params: AirtableUpdateParams
  ): Promise<{ records: AirtableRecord[] }> {
    const url = this.buildUrl(table);
    return this.makeRequest(url, {
      method: 'PATCH',
      body: JSON.stringify(params),
    });
  }

  /**
   * Delete records
   */
  async deleteRecords(table: string, params: AirtableDeleteParams): Promise<{ records: Array<{ id: string; deleted: boolean }> }> {
    const url = this.buildUrl(table);
    return this.makeRequest(url, {
      method: 'DELETE',
      body: JSON.stringify(params),
    });
  }

  /**
   * Get a single record by ID
   */
  async getRecord(table: string, recordId: string): Promise<AirtableRecord> {
    const url = `${this.config.apiUrl}/${this.config.baseId}/${encodeURIComponent(table)}/${recordId}`;
    return this.makeRequest<AirtableRecord>(url, { method: 'GET' });
  }
}

/**
 * Create Airtable client instance
 */
export function createAirtableClient(baseId: string, token?: string): AirtableClient {
  const pat = token || process.env.AIRTABLE_PAT;
  
  if (!pat) {
    throw new Error('Airtable Personal Access Token (PAT) is required. Set AIRTABLE_PAT environment variable.');
  }

  if (!baseId) {
    throw new Error('Airtable Base ID is required.');
  }

  return new AirtableClient({
    baseId,
    token: pat,
  });
}

/**
 * Utility function to paginate through all records
 */
export async function paginateAll<T>(
  listFn: (offset?: string) => Promise<{ records: T[]; offset?: string }>
): Promise<T[]> {
  const allRecords: T[] = [];
  let offset: string | undefined;

  do {
    const response = await listFn(offset);
    allRecords.push(...response.records);
    offset = response.offset;
  } while (offset);

  return allRecords;
}
