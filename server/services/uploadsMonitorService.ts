import fs from 'fs/promises';
import path from 'path';
import { optimizeUploadedImage } from './mediaOptimizationService.js';

const uploadsDir = path.resolve(process.cwd(), 'uploads');

/**
 * Proactively scans the /uploads directory for non-optimized images (.jpg, .jpeg, .png)
 * and automatically generates compressed WebP versions to reduce payload sizes.
 */
export async function auditAndOptimizeUploadsFolder(): Promise<{ scanned: number; optimized: number; errors: number }> {
  let scanned = 0;
  let optimized = 0;
  let errors = 0;

  try {
    await fs.mkdir(uploadsDir, { recursive: true }).catch(() => {});
    const files = await fs.readdir(uploadsDir);

    const imageFiles = files.filter(f => {
      const lower = f.toLowerCase();
      return (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png')) &&
             !lower.includes('_opt') &&
             !lower.endsWith('.webp');
    });

    scanned = imageFiles.length;
    if (scanned === 0) {
      return { scanned: 0, optimized: 0, errors: 0 };
    }

    console.log(`[Uploads Monitor] Found ${scanned} non-optimized images in /uploads. Starting WebP auto-compression...`);

    for (const file of imageFiles) {
      const filePath = path.join(uploadsDir, file);
      const ext = path.extname(file);
      const baseName = path.basename(file, ext);
      const expectedWebp = `${baseName}_opt.webp`;
      const expectedWebpPath = path.join(uploadsDir, expectedWebp);

      try {
        const stats = await fs.stat(expectedWebpPath).catch(() => null);
        if (stats && stats.isFile()) {
          // Already optimized
          continue;
        }

        console.log(`[Uploads Monitor] Optimizing image: ${file} -> WebP`);
        await optimizeUploadedImage(filePath, file);
        optimized++;
      } catch (err: any) {
        errors++;
        console.error(`[Uploads Monitor] Failed to optimize ${file}:`, err?.message || err);
      }
    }

    if (optimized > 0) {
      console.log(`[Uploads Monitor] Successfully auto-optimized ${optimized} images to WebP format.`);
    }
  } catch (err: any) {
    console.error('[Uploads Monitor] Error reading uploads directory:', err?.message || err);
  }

  return { scanned, optimized, errors };
}

/**
 * Initializes proactive background monitoring for the /uploads folder.
 * Runs an initial check after 5 seconds, then every 15 minutes.
 */
export function initUploadsMonitor() {
  setTimeout(() => {
    auditAndOptimizeUploadsFolder().catch(err => {
      console.error('[Uploads Monitor] Initial audit failed:', err);
    });
  }, 5000);

  setInterval(() => {
    auditAndOptimizeUploadsFolder().catch(err => {
      console.error('[Uploads Monitor] Periodic audit failed:', err);
    });
  }, 15 * 60 * 1000);

  console.log('[Uploads Monitor] Background image optimizer service initialized.');
}
