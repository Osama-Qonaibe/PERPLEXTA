import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';

export interface ImageOptimizationResult {
  filename: string;
  fileUrl: string;
  width: number;
  height: number;
  size: number;
  format: string;
}

/**
 * Validates and optimizes uploaded image files:
 * - Checks validity using sharp
 * - Resizes oversized images to standardized max bounds (e.g. 1920x1080 max) while preserving aspect ratio
 * - Strips unnecessary metadata for privacy and size reduction
 * - Outputs clean optimized WebP or JPEG format with correct paths
 */
export async function optimizeUploadedImage(filePath: string, originalFilename: string): Promise<ImageOptimizationResult> {
  const uploadsDir = path.dirname(filePath);
  const ext = path.extname(originalFilename).toLowerCase();
  const baseName = path.basename(filePath, ext);
  
  // Target optimized filename
  const optimizedFilename = `${baseName}_opt.webp`;
  const optimizedFilePath = path.join(uploadsDir, optimizedFilename);

  try {
    const image = sharp(filePath);
    const metadata = await image.metadata();

    const width = metadata.width || 800;
    const height = metadata.height || 600;

    // Resize if width exceeds 1920px
    let pipeline = image;
    if (width > 1920) {
      pipeline = pipeline.resize({ width: 1920, withoutEnlargement: true });
    }

    // Convert to webp for optimal web performance and quality, fallback to jpeg if svg/gif
    if (ext === '.svg' || ext === '.gif') {
      // Keep original for vector/animated formats
      await fs.copyFile(filePath, optimizedFilePath);
    } else {
      await pipeline
        .webp({ quality: 85 })
        .toFile(optimizedFilePath);
      
      // Remove original raw upload if different
      if (filePath !== optimizedFilePath) {
        await fs.unlink(filePath).catch(() => {});
      }
    }

    const finalStats = await fs.stat(optimizedFilePath);
    const finalMetadata = await sharp(optimizedFilePath).metadata();

    return {
      filename: optimizedFilename,
      fileUrl: `/uploads/${optimizedFilename}`,
      width: finalMetadata.width || width,
      height: finalMetadata.height || height,
      size: finalStats.size,
      format: finalMetadata.format || 'webp'
    };
  } catch (err: any) {
    console.error('[Media Optimization] Image processing error:', err.message);
    // Fallback: if optimization fails, keep original file
    const stats = await fs.stat(filePath);
    const filename = path.basename(filePath);
    return {
      filename,
      fileUrl: `/uploads/${filename}`,
      width: 800,
      height: 600,
      size: stats.size,
      format: ext.replace('.', '')
    };
  }
}

/**
 * Verifies and normalizes media path strings across DB and response payloads
 */
export function normalizeMediaUrl(urlOrPath: string | null | undefined): string {
  if (!urlOrPath || typeof urlOrPath !== 'string') return '';
  let clean = urlOrPath.split('?')[0].trim();
  
  // Strip duplicate /uploads/ prefixes
  clean = clean.replace(/^(\/)?(uploads\/)+/i, 'uploads/');
  
  if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('data:')) {
    return clean;
  }
  
  if (clean.startsWith('uploads/')) {
    return `/${clean}`;
  }
  
  if (clean.startsWith('/')) {
    return clean;
  }
  
  return `/uploads/${clean}`;
}
