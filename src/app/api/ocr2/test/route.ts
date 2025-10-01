/**
 * OCR2 Test Endpoint
 * Health check and configuration validation
 */

import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Force Node.js runtime
export const runtime = 'nodejs';

/**
 * Check if OpenAI API key is configured
 */
function checkOpenAIConfig() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    return {
      configured: false,
      error: 'OPENAI_API_KEY not found in environment variables'
    };
  }
  
  if (!apiKey.startsWith('sk-')) {
    return {
      configured: false,
      error: 'OPENAI_API_KEY has invalid format (should start with sk-)'
    };
  }
  
  return {
    configured: true,
    model: process.env.OPENAI_MODEL_NAME || 'gpt-4o',
    keyLength: apiKey.length,
    keyPrefix: apiKey.substring(0, 7) + '...'
  };
}

/**
 * Check if Airtable is configured
 */
function checkAirtableConfig() {
  const baseId = process.env.AIRTABLE_BASE_ID;
  const pat = process.env.AIRTABLE_PAT;
  
  if (!baseId) {
    return {
      configured: false,
      error: 'AIRTABLE_BASE_ID not found in environment variables'
    };
  }
  
  if (!pat) {
    return {
      configured: false,
      error: 'AIRTABLE_PAT not found in environment variables'
    };
  }
  
  return {
    configured: true,
    baseId: baseId.substring(0, 7) + '...',
    tableName: process.env.AIRTABLE_TABLE_NAME || 'Files'
  };
}

/**
 * Check if poppler-utils is installed
 */
async function checkPopplerInstalled() {
  try {
    const { stdout } = await execAsync('which pdftoppm');
    const { stdout: version } = await execAsync('pdftoppm -v');
    
    const versionMatch = version.match(/version ([\d.]+)/);
    
    return {
      installed: true,
      path: stdout.trim(),
      version: versionMatch ? versionMatch[1] : 'unknown'
    };
  } catch (error) {
    return {
      installed: false,
      error: 'pdftoppm command not found. Please install poppler-utils: brew install poppler'
    };
  }
}

/**
 * Check if Sharp is available
 */
async function checkSharpInstalled() {
  try {
    const sharp = await import('sharp');
    return {
      installed: true,
      version: sharp.default.versions.sharp
    };
  } catch (error) {
    return {
      installed: false,
      error: 'Sharp module not found. Run: npm install sharp'
    };
  }
}

/**
 * Check if OpenAI module is available
 */
async function checkOpenAIInstalled() {
  try {
    await import('openai');
    return {
      installed: true
    };
  } catch (error) {
    return {
      installed: false,
      error: 'OpenAI module not found. Run: npm install openai'
    };
  }
}

/**
 * GET /api/ocr2/test
 * Test OCR2 configuration and dependencies
 */
export async function GET() {
  try {
    // Check all configurations and dependencies
    const [openaiConfig, airtableConfig, poppler, sharp, openai] = await Promise.all([
      checkOpenAIConfig(),
      checkAirtableConfig(),
      checkPopplerInstalled(),
      checkSharpInstalled(),
      checkOpenAIInstalled()
    ]);

    // Determine overall health status
    const isHealthy = 
      openaiConfig.configured &&
      airtableConfig.configured &&
      poppler.installed &&
      sharp.installed &&
      openai.installed;

    // Collect any errors
    const errors: string[] = [];
    if (!openaiConfig.configured) errors.push(openaiConfig.error || 'OpenAI not configured');
    if (!airtableConfig.configured) errors.push(airtableConfig.error || 'Airtable not configured');
    if (!poppler.installed) errors.push(poppler.error || 'Poppler not installed');
    if (!sharp.installed) errors.push(sharp.error || 'Sharp not installed');
    if (!openai.installed) errors.push(openai.error || 'OpenAI module not installed');

    const response = {
      status: isHealthy ? 'healthy' : 'error',
      service: 'OCR2 Test',
      message: isHealthy 
        ? 'OCR2 service is properly configured and ready to use' 
        : 'OCR2 service has configuration issues',
      configuration: {
        openai: openaiConfig,
        airtable: airtableConfig,
        poppler,
        sharp,
        openaiModule: openai
      },
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(
      response,
      { status: isHealthy ? 200 : 500 }
    );

  } catch (error) {
    console.error('OCR2 test endpoint error:', error);
    
    return NextResponse.json(
      {
        status: 'error',
        service: 'OCR2 Test',
        message: 'Failed to test OCR2 configuration',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
