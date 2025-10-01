/**
 * OpenAI Vision API Client for OCR2
 * Handles image-to-text extraction using GPT-4o Vision
 */

import OpenAI from 'openai';
import { VisionAPIError, OCRResult, ImageChunk } from './types';
import { getOCR2Settings } from './config';
import { createLogger, measurePerformance } from './logger';
import { imageChunkToDataURI } from './image-chunker';

const logger = createLogger('VisionClient');
const settings = getOCR2Settings();

/**
 * OpenAI client instance
 */
let openaiClient: OpenAI | null = null;

/**
 * Get or create OpenAI client
 */
function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: settings.openai.apiKey,
      baseURL: settings.openai.baseUrl,
      timeout: settings.openai.timeoutSeconds * 1000,
    });
    
    logger.info('OpenAI client initialized', {
      model: settings.openai.model,
      baseUrl: settings.openai.baseUrl || 'default',
      timeout: `${settings.openai.timeoutSeconds}s`
    });
  }
  
  return openaiClient;
}

/**
 * Semaphore for rate limiting API calls
 */
class Semaphore {
  private permits: number;
  private promiseResolvers: (() => void)[] = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.promiseResolvers.push(resolve);
    });
  }

  release(): void {
    this.permits++;
    const resolve = this.promiseResolvers.shift();
    if (resolve) {
      this.permits--;
      resolve();
    }
  }
}

const semaphore = new Semaphore(settings.concurrency.maxParallelVisionCalls);

/**
 * Extract text from image chunk using OpenAI Vision API
 */
export async function extractTextFromChunk(chunk: ImageChunk): Promise<OCRResult> {
  const operation = async (): Promise<OCRResult> => {
    await semaphore.acquire();
    
    try {
      const client = getOpenAIClient();
      const dataUri = imageChunkToDataURI(chunk);
      
      logger.debug('Sending chunk to Vision API', {
        chunkIndex: chunk.chunkIndex,
        width: chunk.width,
        height: chunk.height,
        size: `${Math.round(chunk.data.length / 1024)}KB`
      });

      const response = await client.chat.completions.create({
        model: settings.openai.model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all text from this image. Preserve the original formatting, spacing, and layout as much as possible. Include all visible text including headers, footers, tables, and any annotations. Return only the extracted text with no additional commentary.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: dataUri,
                  detail: settings.openai.detailMode,
                },
              },
            ],
          },
        ],
        max_tokens: 4096,
        temperature: 0.1,
      });

      const extractedText = response.choices[0]?.message?.content?.trim() || '';
      
      const result: OCRResult = {
        text: extractedText,
        confidence: 1.0, // Vision API doesn't provide confidence scores
        processingTime: 0, // Will be set by measurePerformance
        tokensUsed: {
          input: response.usage?.prompt_tokens || 0,
          output: response.usage?.completion_tokens || 0,
          total: response.usage?.total_tokens || 0,
        },
      };

      logger.debug('Vision API response received', {
        chunkIndex: chunk.chunkIndex,
        textLength: extractedText.length,
        tokensUsed: result.tokensUsed.total,
      });

      return result;

    } finally {
      semaphore.release();
    }
  };

  try {
    const { result, duration } = await measurePerformance(
      operation,
      `Vision API call for chunk ${chunk.chunkIndex}`,
      'VisionClient'
    );

    result.processingTime = duration;
    return result;

  } catch (error) {
    logger.error('Vision API call failed', {
      chunkIndex: chunk.chunkIndex,
      error: error instanceof Error ? error.message : String(error)
    });

    if (error instanceof Error) {
      // Parse OpenAI API errors
      if (error.message.includes('rate_limit_exceeded')) {
        throw new VisionAPIError('Rate limit exceeded. Please try again later.', { 
          originalError: error,
          retryAfter: 60 
        });
      }
      
      if (error.message.includes('invalid_request_error')) {
        throw new VisionAPIError('Invalid request to Vision API', { originalError: error });
      }
      
      if (error.message.includes('timeout')) {
        throw new VisionAPIError('Vision API request timed out', { originalError: error });
      }
    }

    throw new VisionAPIError(
      `Vision API call failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { originalError: error, chunkIndex: chunk.chunkIndex }
    );
  }
}

/**
 * Extract text from multiple chunks with retry logic
 */
export async function extractTextFromChunks(chunks: ImageChunk[], pageIndex: number = 0): Promise<OCRResult[]> {
  logger.info('Processing chunks with Vision API', {
    totalChunks: chunks.length,
    pageIndex,
    concurrency: settings.concurrency.maxParallelVisionCalls
  });

  const results: OCRResult[] = [];
  const errors: Error[] = [];

  // Process chunks in parallel with concurrency control
  const chunkPromises = chunks.map(async (chunk, index) => {
    let attempt = 0;
    const maxAttempts = settings.openai.maxRetries + 1;

    while (attempt < maxAttempts) {
      try {
        const result = await extractTextFromChunk(chunk);
        return { index, result, error: null };
      } catch (error) {
        attempt++;
        
        if (attempt < maxAttempts) {
          const backoffDelay = settings.openai.retryBackoffSeconds * Math.pow(2, attempt - 1) * 1000;
          logger.warn(`Chunk ${chunk.chunkIndex} failed, retrying`, {
            attempt,
            maxAttempts,
            retryDelay: `${backoffDelay}ms`,
            error: error instanceof Error ? error.message : String(error)
          });
          
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        } else {
          logger.error(`Chunk ${chunk.chunkIndex} failed after all retries`, {
            attempts: maxAttempts,
            error: error instanceof Error ? error.message : String(error)
          });
          
          return { 
            index, 
            result: null, 
            error: error instanceof Error ? error : new Error(String(error))
          };
        }
      }
    }
  });

  // Wait for all chunks to complete
  const chunkResults = await Promise.all(chunkPromises);

  // Sort results by original index and separate successes from failures
  chunkResults.sort((a, b) => a.index - b.index);

  for (const chunkResult of chunkResults) {
    if (chunkResult.result) {
      results.push(chunkResult.result);
    } else if (chunkResult.error) {
      errors.push(chunkResult.error);
    }
  }

  logger.info('Chunk processing completed', {
    successful: results.length,
    failed: errors.length,
    totalChunks: chunks.length,
    successRate: `${Math.round((results.length / chunks.length) * 100)}%`
  });

  // If we have some results but also some errors, log warnings but continue
  if (errors.length > 0 && results.length > 0) {
    logger.warn('Some chunks failed but continuing with partial results', {
      failedChunks: errors.length,
      successfulChunks: results.length
    });
  }

  // If all chunks failed, throw an error
  if (results.length === 0 && errors.length > 0) {
    throw new VisionAPIError(
      `All ${chunks.length} chunks failed to process`,
      { errors, pageIndex }
    );
  }

  return results;
}

/**
 * Test OpenAI Vision API connection
 */
export async function testVisionAPI(): Promise<boolean> {
  try {
    logger.info('Testing Vision API connection');
    
    const client = getOpenAIClient();
    
    // Create a simple test image (1x1 white pixel)
    const testImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGA8Yy8AgAAAABJRU5ErkJggg==';
    
    const response = await client.chat.completions.create({
      model: settings.openai.model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'What do you see in this image?',
            },
            {
              type: 'image_url',
              image_url: {
                url: testImageData,
                detail: 'low',
              },
            },
          ],
        },
      ],
      max_tokens: 50,
    });

    const hasResponse = response.choices[0]?.message?.content?.length > 0;
    
    logger.info('Vision API test completed', {
      success: hasResponse,
      model: settings.openai.model,
      tokensUsed: response.usage?.total_tokens || 0
    });

    return hasResponse;

  } catch (error) {
    logger.error('Vision API test failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
}

/**
 * Get API usage statistics
 */
export function getAPIUsageStats() {
  // This would typically track usage across requests
  // For now, return basic info
  return {
    model: settings.openai.model,
    maxConcurrency: settings.concurrency.maxParallelVisionCalls,
    timeout: settings.openai.timeoutSeconds,
    retries: settings.openai.maxRetries,
  };
}
