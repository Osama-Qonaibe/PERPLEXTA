import path from 'path';
import fs from 'fs/promises';
import { pool } from '../db/index.js';
import { invalidateFilePermissionCache } from './filePermissionCache.js';

export interface PathResolutionResult {
  raw: string;
  cleanUrl: string;
  filename: string;
  absolutePath: string;
  exists: boolean;
  sizeOnDisk: number | null;
  isSafePath: boolean;
}

export interface MetadataDiscrepancy {
  type: 'MISSING_DISK_FILE' | 'UNTRACKED_DISK_FILE' | 'SIZE_MISMATCH' | 'MALFORMED_URL_PATH';
  file_url: string;
  details: string;
  dbSize?: number;
  diskSize?: number;
}

export interface FileAuditReport {
  timestamp: string;
  totalDbRecords: number;
  totalDiskFiles: number;
  discrepanciesCount: number;
  discrepancies: MetadataDiscrepancy[];
  status: 'CLEAN' | 'DISCREPANCIES_DETECTED';
}

/**
 * Cache invalidation hook to be called after file database commits or updates
 */
export function triggerFileCacheInvalidation(fileUrlOrName?: string) {
  try {
    invalidateFilePermissionCache(fileUrlOrName);
    console.log(`[File Validation Hook] Invalidated permission cache for: ${fileUrlOrName || 'ALL_CACHE'}`);
  } catch (err: any) {
    console.warn('[File Validation Hook] Cache invalidation warning:', err.message);
  }
}

/**
 * Verifies absolute path resolution and existence for any given file URL or filename
 */
export async function resolveMediaAbsolutePath(rawUrlOrPath: string): Promise<PathResolutionResult> {
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  
  if (!rawUrlOrPath || typeof rawUrlOrPath !== 'string') {
    return {
      raw: rawUrlOrPath || '',
      cleanUrl: '',
      filename: '',
      absolutePath: '',
      exists: false,
      sizeOnDisk: null,
      isSafePath: false,
    };
  }

  // Sanitize double uploads slashes or URL query params
  let clean = rawUrlOrPath.split('?')[0].trim();
  clean = clean.replace(/^(\/)?(uploads\/)+/i, 'uploads/');
  
  const filename = path.basename(clean);
  const cleanUrl = clean.startsWith('http') || clean.startsWith('data:') 
    ? clean 
    : (clean.startsWith('uploads/') ? `/${clean}` : (clean.startsWith('/') ? clean : `/uploads/${clean}`));

  const resolvedAbsolutePath = path.resolve(uploadsDir, filename);
  const isSafePath = resolvedAbsolutePath.startsWith(uploadsDir);

  let exists = false;
  let sizeOnDisk: number | null = null;

  if (isSafePath) {
    try {
      const stats = await fs.stat(resolvedAbsolutePath);
      if (stats.isFile()) {
        exists = true;
        sizeOnDisk = stats.size;
      }
    } catch {
      exists = false;
    }
  }

  return {
    raw: rawUrlOrPath,
    cleanUrl,
    filename,
    absolutePath: resolvedAbsolutePath,
    exists,
    sizeOnDisk,
    isSafePath,
  };
}

/**
 * Comprehensive Audit Service: Scans database records vs filesystem files,
 * detects orphaned DB rows, untracked disk files, size mismatches, and malformed URLs.
 */
export async function auditFilePipeline(): Promise<FileAuditReport> {
  const discrepancies: MetadataDiscrepancy[] = [];
  const uploadsDir = path.resolve(process.cwd(), 'uploads');

  await fs.mkdir(uploadsDir, { recursive: true }).catch(() => {});

  let dbRows: any[] = [];
  if (pool) {
    try {
      const dbRes = await pool.query('SELECT id, user_id, file_name, file_url, file_size FROM user_files');
      dbRows = dbRes.rows;
    } catch (err: any) {
      console.error('[File Audit Service] Failed to fetch user_files records:', err.message);
    }
  }

  const trackedFilenamesInDb = new Set<string>();

  // 1. Audit Database Records
  for (const row of dbRows) {
    const rawUrl = row.file_url || '';
    if (rawUrl.includes('/uploads/uploads/')) {
      discrepancies.push({
        type: 'MALFORMED_URL_PATH',
        file_url: rawUrl,
        details: `Record ID ${row.id} contains redundant nested uploads path: ${rawUrl}`
      });
    }

    const resolution = await resolveMediaAbsolutePath(rawUrl);
    if (resolution.filename) {
      trackedFilenamesInDb.add(resolution.filename);
    }

    if (!resolution.exists) {
      discrepancies.push({
        type: 'MISSING_DISK_FILE',
        file_url: rawUrl,
        details: `Record ID ${row.id} (${row.file_name}) registered in DB but file missing at path: ${resolution.absolutePath}`
      });
    } else if (resolution.sizeOnDisk !== null && row.file_size && Math.abs(resolution.sizeOnDisk - parseInt(row.file_size, 10)) > 1024) {
      discrepancies.push({
        type: 'SIZE_MISMATCH',
        file_url: rawUrl,
        dbSize: parseInt(row.file_size, 10),
        diskSize: resolution.sizeOnDisk,
        details: `Record ID ${row.id} registered size ${row.file_size} B, actual disk size ${resolution.sizeOnDisk} B`
      });
    }
  }

  // 2. Audit Disk Files against DB
  let diskFiles: string[] = [];
  try {
    diskFiles = await fs.readdir(uploadsDir);
  } catch (err: any) {
    console.error('[File Audit Service] Failed to readdir uploads:', err.message);
  }

  for (const diskFile of diskFiles) {
    if (diskFile.startsWith('.')) continue; // ignore hidden files
    if (!trackedFilenamesInDb.has(diskFile)) {
      // Check if referenced in public domain tables before declaring orphaned
      let isReferencedElsewhere = false;
      if (pool) {
        try {
          const pattern = `%${diskFile}%`;
          const altCheck = await pool.query(`
            SELECT (
              EXISTS(SELECT 1 FROM blog_articles WHERE image_url LIKE $1) OR
              EXISTS(SELECT 1 FROM bulletin_ads WHERE image_url LIKE $1 OR video_url LIKE $1 OR author_avatar LIKE $1) OR
              EXISTS(SELECT 1 FROM marketplace_items WHERE image_url LIKE $1 OR preview_url LIKE $1 OR video_url LIKE $1 OR download_url LIKE $1) OR
              EXISTS(SELECT 1 FROM advertisements WHERE image_url LIKE $1) OR
              EXISTS(SELECT 1 FROM forum_posts WHERE image_url LIKE $1) OR
              EXISTS(SELECT 1 FROM users WHERE avatar LIKE $1) OR
              EXISTS(SELECT 1 FROM bulletin_pages WHERE avatar_url LIKE $1 OR cover_url LIKE $1)
            ) AS is_ref
          `, [pattern]);
          if (altCheck.rows[0]?.is_ref) {
            isReferencedElsewhere = true;
          }
        } catch {}
      }

      if (!isReferencedElsewhere) {
        discrepancies.push({
          type: 'UNTRACKED_DISK_FILE',
          file_url: `/uploads/${diskFile}`,
          details: `Physical file ${diskFile} exists in /uploads/ directory but is not tracked in user_files or domain records`
        });
      }
    }
  }

  const report: FileAuditReport = {
    timestamp: new Date().toISOString(),
    totalDbRecords: dbRows.length,
    totalDiskFiles: diskFiles.length,
    discrepanciesCount: discrepancies.length,
    discrepancies,
    status: discrepancies.length === 0 ? 'CLEAN' : 'DISCREPANCIES_DETECTED'
  };

  if (discrepancies.length > 0) {
    console.warn(`[File Audit Service] Discrepancies detected: ${discrepancies.length} issues logged.`);
    for (const d of discrepancies.slice(0, 10)) {
      console.warn(`  - [${d.type}] ${d.details}`);
    }
  } else {
    console.log(`[File Audit Service] Pipeline clean. All ${dbRows.length} DB records and ${diskFiles.length} disk files verified.`);
  }

  return report;
}
