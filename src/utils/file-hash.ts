/**
 * File hash generation utilities for duplicate detection
 */

import crypto from 'crypto';

/**
 * Generate SHA-256 hash from file buffer (for server-side use)
 */
export async function generateFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const nodeBuffer = Buffer.from(buffer);
  return crypto.createHash('sha256').update(nodeBuffer).digest('hex');
}

/**
 * Generate SHA-256 hash from buffer (for server-side use)
 */
export function generateBufferHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Generate SHA-256 hash from ArrayBuffer (for client-side use)
 */
export async function generateArrayBufferHash(arrayBuffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Compare two file hashes for exact match
 */
export function compareHashes(hash1: string, hash2: string): boolean {
  return hash1.toLowerCase() === hash2.toLowerCase();
}

/**
 * Validate hash format (64 character hex string for SHA-256)
 */
export function isValidHash(hash: string): boolean {
  return /^[a-fA-F0-9]{64}$/.test(hash);
}
