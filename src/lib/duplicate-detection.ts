/**
 * Duplicate detection service using file hashes
 */

import { createAirtableClient } from '@/lib/airtable/client';
import { compareHashes, isValidHash } from '@/utils/file-hash';

export interface DuplicateDetectionResult {
  isDuplicate: boolean;
  duplicateRecord?: {
    id: string;
    name: string;
    uploadDate?: string;
    createdTime?: string;
    fileHash: string;
  };
  confidence: number;
  reason: string;
}

/**
 * Check if a file hash already exists in the database
 */
export async function checkFileHashDuplicate(
  fileHash: string,
  baseId: string
): Promise<DuplicateDetectionResult> {
  if (!isValidHash(fileHash)) {
    return {
      isDuplicate: false,
      confidence: 0,
      reason: 'Invalid hash format provided'
    };
  }

  try {
    const airtableClient = createAirtableClient(baseId);
    
    // Search for existing files with the same hash
    const response = await airtableClient.listRecords('Files', {
      filterByFormula: `{File Hash} = "${fileHash}"`,
      maxRecords: 5, // Get up to 5 matches for analysis
      fields: ['Name', 'Created At', 'File Hash', 'Status', 'Source']
    });
    
    if (response.records && response.records.length > 0) {
      const duplicateRecord = response.records[0];
      
      return {
        isDuplicate: true,
        duplicateRecord: {
          id: duplicateRecord.id,
          name: duplicateRecord.fields.Name || 'Unknown',
          uploadDate: duplicateRecord.fields['Created At'], // Use Created At instead of Upload Date
          createdTime: duplicateRecord.createdTime,
          fileHash: duplicateRecord.fields['File Hash'] || ''
        },
        confidence: 1.0, // Hash match is 100% confidence
        reason: `Exact file hash match found. Original file: "${duplicateRecord.fields.Name}"`
      };
    }
    
    return {
      isDuplicate: false,
      confidence: 0,
      reason: 'No matching file hash found'
    };
  } catch (error) {
    console.error('Error checking for hash duplicates:', error);
    return {
      isDuplicate: false,
      confidence: 0,
      reason: `Error during duplicate check: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Mark a file as duplicate and update error fields
 */
export async function markFileAsDuplicate(
  recordId: string,
  duplicateOfId: string,
  baseId: string
): Promise<boolean> {
  try {
    const airtableClient = createAirtableClient(baseId);
    
    await airtableClient.updateRecords('Files', {
      records: [
        {
          id: recordId,
          fields: {
            'Status': 'Attention',
            'Error Code': 'DUPLICATE_FILE',
            'Error Description': `This file is a duplicate of record ${duplicateOfId}`,
            'Error Link': `https://airtable.com/app${baseId}/${recordId}`
          }
        }
      ]
    });
    
    return true;
  } catch (error) {
    console.error('Error marking file as duplicate:', error);
    return false;
  }
}

/**
 * Get all files with the same hash (for analysis)
 */
export async function getFilesByHash(
  fileHash: string,
  baseId: string
): Promise<any[]> {
  if (!isValidHash(fileHash)) {
    return [];
  }

  try {
    const airtableClient = createAirtableClient(baseId);
    
    const response = await airtableClient.listRecords('Files', {
      filterByFormula: `{File Hash} = "${fileHash}"`,
      sort: [{ field: 'Created At', direction: 'asc' }]
    });
    
    return response.records || [];
  } catch (error) {
    console.error('Error getting files by hash:', error);
    return [];
  }
}

/**
 * Batch check for duplicates across multiple files
 */
export async function batchCheckDuplicates(
  fileHashes: string[],
  baseId: string
): Promise<Map<string, DuplicateDetectionResult>> {
  const results = new Map<string, DuplicateDetectionResult>();
  
  // Process in batches to avoid rate limits
  const batchSize = 10;
  for (let i = 0; i < fileHashes.length; i += batchSize) {
    const batch = fileHashes.slice(i, i + batchSize);
    
    const batchPromises = batch.map(hash => 
      checkFileHashDuplicate(hash, baseId).then(result => ({ hash, result }))
    );
    
    const batchResults = await Promise.all(batchPromises);
    
    batchResults.forEach(({ hash, result }) => {
      results.set(hash, result);
    });
    
    // Small delay between batches
    if (i + batchSize < fileHashes.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

/**
 * Generate duplicate detection report
 */
export async function generateDuplicateReport(baseId: string): Promise<{
  totalFiles: number;
  duplicateGroups: Array<{
    hash: string;
    files: any[];
    count: number;
  }>;
  duplicateCount: number;
}> {
  try {
    const airtableClient = createAirtableClient(baseId);
    
    // Get all files with hashes
    const response = await airtableClient.listRecords('Files', {
      fields: ['Name', 'File Hash', 'Upload Date', 'Status', 'Source'],
      filterByFormula: `{File Hash} != ""`
    });
    
    const files = response.records || [];
    const hashGroups = new Map<string, any[]>();
    
    // Group files by hash
    files.forEach(file => {
      const hash = file.fields['File Hash'];
      if (hash) {
        if (!hashGroups.has(hash)) {
          hashGroups.set(hash, []);
        }
        hashGroups.get(hash)!.push(file);
      }
    });
    
    // Find duplicate groups (more than 1 file with same hash)
    const duplicateGroups = Array.from(hashGroups.entries())
      .filter(([_, files]) => files.length > 1)
      .map(([hash, files]) => ({
        hash,
        files,
        count: files.length
      }))
      .sort((a, b) => b.count - a.count);
    
    const duplicateCount = duplicateGroups.reduce((sum, group) => sum + group.count - 1, 0);
    
    return {
      totalFiles: files.length,
      duplicateGroups,
      duplicateCount
    };
  } catch (error) {
    console.error('Error generating duplicate report:', error);
    return {
      totalFiles: 0,
      duplicateGroups: [],
      duplicateCount: 0
    };
  }
}
