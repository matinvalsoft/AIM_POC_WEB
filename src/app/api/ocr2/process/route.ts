/**
 * OCR2 Processing API Route
 * Endpoint for processing files with OCR and updating Airtable
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAirtableClient } from '@/lib/airtable/client';
import { processPDFFromURL } from '@/lib/ocr2/orchestrator-clean';
import { getOCR2Settings, validateSettings } from '@/lib/ocr2/config';
import { createLogger } from '@/lib/ocr2/logger';
import { ProcessFileRequest, ProcessFileResponse, AirtableUpdateError } from '@/lib/ocr2/types';
import { setRecordError } from '@/lib/airtable/error-handler';

// Force Node.js runtime for server-side processing
export const runtime = 'nodejs';

const logger = createLogger('OCR2-API');

/**
 * Validate request payload
 */
function validateRequest(body: any): { isValid: boolean; error?: string; data?: ProcessFileRequest } {
  if (!body) {
    return { isValid: false, error: 'No request body provided' };
  }

  const { file_url, record_id, options } = body;

  if (!file_url || typeof file_url !== 'string') {
    return { isValid: false, error: 'Missing or invalid file_url' };
  }

  if (!record_id || typeof record_id !== 'string') {
    return { isValid: false, error: 'Missing or invalid record_id' };
  }

  return {
    isValid: true,
    data: { file_url, record_id, options }
  };
}

/**
 * Update Airtable record with extracted text
 */
async function updateAirtableRecord(
  recordId: string,
  extractedText: string,
  processingTime: number
): Promise<boolean> {
  try {
    const settings = getOCR2Settings();
    const airtableClient = createAirtableClient(settings.airtable.baseId);

    // Update fields in the Files table
    const updateData = {
      'Raw Text': extractedText,
      Status: 'Processed' as const,
    };

    logger.info('Updating Airtable record', {
      recordId,
      textLength: extractedText.length,
      processingTime: `${processingTime}ms`
    });

    const response = await airtableClient.updateRecords(settings.airtable.tableName, {
      records: [{
        id: recordId,
        fields: updateData
      }],
      typecast: true
    });

    const updatedRecord = response.records[0];
    logger.info('Airtable record updated successfully', {
      recordId: updatedRecord.id,
      fields: Object.keys(updatedRecord.fields)
    });

    return true;

  } catch (error) {
    logger.error('Airtable update failed', {
      recordId,
      error: error instanceof Error ? error.message : String(error)
    });

    throw new AirtableUpdateError(
      `Failed to update Airtable record ${recordId}`,
      { originalError: error, recordId }
    );
  }
}

/**
 * Handle OCR processing errors
 */
function handleProcessingError(error: any, recordId: string): ProcessFileResponse {
  logger.error('OCR processing failed', {
    recordId,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined
  });

  // Try to update Airtable with error status using error code system
  (async () => {
    try {
      const settings = getOCR2Settings();
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Determine error code based on error type
      let errorCode: 'OCR_FAILED' | 'PDF_CORRUPTED' | 'PROCESSING_ERROR' | 'TIMEOUT_ERROR' = 'OCR_FAILED';
      
      // Check for specific error patterns
      if (errorMessage.toLowerCase().includes('corrupt') || 
          errorMessage.toLowerCase().includes('invalid pdf') ||
          errorMessage.toLowerCase().includes('malformed')) {
        errorCode = 'PDF_CORRUPTED';
      } else if (errorMessage.toLowerCase().includes('timeout') ||
                 errorMessage.toLowerCase().includes('timed out')) {
        errorCode = 'TIMEOUT_ERROR';
      } else if (!errorMessage.toLowerCase().includes('ocr')) {
        errorCode = 'PROCESSING_ERROR';
      }
      
      await setRecordError({
        recordId,
        errorCode,
        baseId: settings.airtable.baseId
      });
      
      logger.info('Updated record with error code', { recordId, errorCode });
    } catch (updateError) {
      logger.error('Failed to update record with error status', { recordId, updateError });
    }
  })();

  return {
    status: 'error',
    record_id: recordId,
    file_url: '',
    error: error instanceof Error ? error.message : 'Unknown processing error',
    airtable_updated: false
  };
}


/**
 * POST /api/ocr2/process
 * Process a file with OCR and update Airtable record
 */
export async function POST(request: NextRequest) {
  try {
    // Validate environment and settings
    try {
      const settings = getOCR2Settings();
      validateSettings(settings);
    } catch (configError) {
      logger.error('OCR2 configuration error', { error: configError });
      return NextResponse.json(
        { 
          status: 'error',
          error: 'OCR2 service configuration error',
          details: configError instanceof Error ? configError.message : String(configError)
        },
        { status: 500 }
      );
    }

    // Parse and validate request
    const body = await request.json();
    const validation = validateRequest(body);
    
    if (!validation.isValid) {
      logger.warn('Invalid request', { error: validation.error, body });
      return NextResponse.json(
        { status: 'error', error: validation.error },
        { status: 400 }
      );
    }

    const { file_url, record_id, options } = validation.data!;

    logger.info('Starting OCR processing', {
      recordId: record_id,
      fileUrl: file_url.substring(0, 50) + '...',
      options
    });

    try {
      // Process the PDF file using the clean orchestrator
      const extractedText = await processPDFFromURL(file_url);

      if (!extractedText || extractedText.trim().length === 0) {
        logger.warn('No text extracted from file', { recordId: record_id, fileUrl: file_url });
        return NextResponse.json(handleProcessingError(
          new Error('No text could be extracted from the file'),
          record_id
        ), { status: 422 });
      }

      // Update Airtable record
      let airtableUpdated = false;
      try {
        airtableUpdated = await updateAirtableRecord(record_id, extractedText, 0);
      } catch (airtableError) {
        // File was processed successfully, but Airtable update failed
        logger.warn('File processed but Airtable update failed', {
          recordId: record_id,
          textLength: extractedText.length,
          airtableError: airtableError instanceof Error ? airtableError.message : String(airtableError)
        });
      }

      const response: ProcessFileResponse = {
        status: 'success',
        record_id,
        file_url,
        extracted_text_length: extractedText.length,
        airtable_updated: airtableUpdated,
        processing_summary: {
          totalTokensUsed: 0, // Would need full processing result for this
          totalProcessingTime: 0, // Handled internally by orchestrator
          averageChunksPerPage: 0,
          successRate: 100,
          errors: []
        }
      };

      if (!airtableUpdated) {
        response.message = 'File processed successfully but Airtable update failed';
      }

      logger.info('OCR processing completed successfully', {
        recordId: record_id,
        textLength: extractedText.length,
        airtableUpdated
      });

      return NextResponse.json(response);

    } catch (processingError) {
      return NextResponse.json(
        handleProcessingError(processingError, record_id),
        { status: 500 }
      );
    }

  } catch (error) {
    logger.error('Unexpected API error', {
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json(
      {
        status: 'error',
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ocr2/process
 * Health check and service information
 */
export async function GET() {
  try {
    const settings = getOCR2Settings();
    validateSettings(settings);

    return NextResponse.json({
      status: 'healthy',
      service: 'OCR2',
      version: '1.0.0',
      features: [
        'PDF text extraction',
        'OCR processing',
        'Airtable integration',
        'Parallel processing',
        'Error recovery'
      ],
      configuration: {
        maxPagesPerDoc: settings.pdf.maxPagesPerDoc,
        maxConcurrency: settings.concurrency.maxParallelVisionCalls,
        model: settings.openai.model,
        airtableTable: settings.airtable.tableName
      }
    });

  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: 'Service configuration error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
