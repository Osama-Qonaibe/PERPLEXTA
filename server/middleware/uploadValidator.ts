import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import type { Request, Response, NextFunction } from 'express';
import sharp from 'sharp';

export interface FileValidationResult {
  isValid: boolean;
  reason?: string;
  reasonAr?: string;
}

const MAX_ALLOWED_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

/**
 * Known magic byte signatures for common file formats
 */
function verifyMagicBytes(buffer: Buffer, ext: string, mimetype: string): { matches: boolean; detail?: string } {
  const hex = buffer.toString('hex', 0, Math.min(buffer.length, 32)).toLowerCase();

  switch (ext) {
    case '.png':
      // PNG magic number: 89 50 4e 47 0d 0a 1a 0a
      if (hex.startsWith('89504e470d0a1a0a') || hex.startsWith('89504e47')) {
        return { matches: true };
      }
      return { matches: false, detail: 'Invalid PNG header signature.' };

    case '.jpg':
    case '.jpeg':
      // JPEG magic number: ff d8 ff
      if (hex.startsWith('ffd8ff')) {
        return { matches: true };
      }
      return { matches: false, detail: 'Invalid JPEG/JPG header signature.' };

    case '.gif':
      // GIF magic number: 47 49 46 38 ("GIF87a" or "GIF89a")
      if (hex.startsWith('47494638')) {
        return { matches: true };
      }
      return { matches: false, detail: 'Invalid GIF header signature.' };

    case '.webp':
      // WEBP starts with "RIFF" (52 49 46 46) and "WEBP" at offset 8..11 (57 45 42 50)
      if (hex.startsWith('52494646') && buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
        return { matches: true };
      }
      return { matches: false, detail: 'Invalid WEBP header signature.' };

    case '.bmp':
      // BMP magic number: 42 4d ("BM")
      if (hex.startsWith('424d')) {
        return { matches: true };
      }
      return { matches: false, detail: 'Invalid BMP header signature.' };

    case '.pdf':
      // PDF magic number: %PDF- (25 50 44 46 2d)
      if (hex.startsWith('255044462d') || buffer.toString('ascii', 0, 10).includes('%PDF-')) {
        return { matches: true };
      }
      return { matches: false, detail: 'Invalid PDF header signature.' };

    case '.svg':
      // SVG: XML or SVG tag in initial text slice
      const textHead = buffer.toString('utf8', 0, Math.min(buffer.length, 512)).toLowerCase();
      if ((textHead.includes('<svg') || textHead.includes('<?xml')) && !textHead.includes('<script')) {
        return { matches: true };
      }
      return { matches: false, detail: 'Invalid or unsafe SVG content.' };

    case '.mp4':
    case '.mov':
    case '.m4v':
      // MP4 / MOV container: 'ftyp' at offset 4..8
      const ftypBox = buffer.subarray(4, 8).toString('ascii');
      if (ftypBox === 'ftyp' || ftypBox === 'moov' || ftypBox === 'mdat' || ftypBox === 'wide') {
        return { matches: true };
      }
      return { matches: false, detail: 'Invalid MP4/MOV container structure.' };

    case '.webm':
    case '.mkv':
      // EBML header for WebM/MKV: 1a 45 df a3
      if (hex.startsWith('1a45dfa3')) {
        return { matches: true };
      }
      return { matches: false, detail: 'Invalid WebM/MKV container structure.' };

    default:
      // For other types, allow if buffer exists and is non-empty
      return { matches: true };
  }
}

/**
 * Validates file integrity on disk before saving or processing
 */
export async function validateFileIntegrity(file: Express.Multer.File): Promise<FileValidationResult> {
  if (!file || !file.path) {
    return {
      isValid: false,
      reason: 'No file path found for validation.',
      reasonAr: 'لم يتم العثور على المسار المرفوع للتحقق.'
    };
  }

  // 1. Check if file exists on disk
  let stats: fs.Stats;
  try {
    stats = await fsPromises.stat(file.path);
  } catch {
    return {
      isValid: false,
      reason: 'Uploaded file could not be found on disk.',
      reasonAr: 'لم يتم العثور على الملف المرفوع على القرص.'
    };
  }

  // 2. File Size Checks
  if (stats.size === 0) {
    return {
      isValid: false,
      reason: 'Uploaded file is empty (0 bytes).',
      reasonAr: 'الملف المرفوع فارغ (0 بايت).'
    };
  }

  if (stats.size > MAX_ALLOWED_FILE_SIZE) {
    return {
      isValid: false,
      reason: `File size (${stats.size} bytes) exceeds maximum limit of 100MB.`,
      reasonAr: 'حجم الملف يتجاوز الحد الأقصى المسموح به (100 ميجابايت).'
    };
  }

  const ext = path.extname(file.originalname || file.filename || '').toLowerCase();
  const mimetype = (file.mimetype || '').toLowerCase();

  // 3. Header / Magic Byte Check
  let fileBuffer: Buffer;
  try {
    const handle = await fsPromises.open(file.path, 'r');
    const buffer = Buffer.alloc(1024);
    const { bytesRead } = await handle.read(buffer, 0, 1024, 0);
    await handle.close();
    fileBuffer = buffer.subarray(0, bytesRead);
  } catch (readErr: any) {
    return {
      isValid: false,
      reason: `Failed to read file header: ${readErr.message}`,
      reasonAr: 'تعذر قراءة ترويسة الملف المرفوع.'
    };
  }

  const magicCheck = verifyMagicBytes(fileBuffer, ext, mimetype);
  if (!magicCheck.matches) {
    return {
      isValid: false,
      reason: magicCheck.detail || 'File header signature does not match expected format.',
      reasonAr: 'توقيع ترويسة الملف لا يطابق الصيغة المتوقعة أو الملف تالف.'
    };
  }

  // 4. Image Pixel Integrity Check with Sharp (if it's an image format)
  const isRasterImage = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif', '.tiff'].includes(ext) || mimetype.startsWith('image/');
  if (isRasterImage && ext !== '.svg') {
    try {
      const metadata = await sharp(file.path).metadata();
      if (!metadata || !metadata.width || !metadata.height) {
        return {
          isValid: false,
          reason: 'Image metadata could not be decoded. File may be corrupted or truncated.',
          reasonAr: 'تعذر فك بيانات الصورة. قد يكون الملف تالفًا أو غير مكتمل.'
        };
      }
    } catch (sharpErr: any) {
      return {
        isValid: false,
        reason: `Corrupt image data: ${sharpErr.message}`,
        reasonAr: 'بيانات الصورة تالفة أو غير صالحة للفك.'
      };
    }
  }

  return { isValid: true };
}

/**
 * Express Middleware: Inspects req.file or req.files after upload, validates integrity,
 * and automatically purges corrupt files from disk before route handling.
 */
export async function uploadValidator(req: Request, res: Response, next: NextFunction): Promise<void> {
  const filesToValidate: Express.Multer.File[] = [];

  if (req.file) {
    filesToValidate.push(req.file);
  }

  if (req.files) {
    if (Array.isArray(req.files)) {
      filesToValidate.push(...req.files);
    } else if (typeof req.files === 'object') {
      for (const key of Object.keys(req.files)) {
        const fieldFiles = (req.files as Record<string, Express.Multer.File[]>)[key];
        if (Array.isArray(fieldFiles)) {
          filesToValidate.push(...fieldFiles);
        }
      }
    }
  }

  if (filesToValidate.length === 0) {
    return next();
  }

  for (const file of filesToValidate) {
    const result = await validateFileIntegrity(file);
    if (!result.isValid) {
      console.warn(`[Upload Validator] Corrupt or invalid file rejected: ${file.originalname || file.filename}. Reason: ${result.reason}`);

      // Immediately purge all files attached to this request to maintain clean disk state
      for (const cleanupFile of filesToValidate) {
        if (cleanupFile.path && fs.existsSync(cleanupFile.path)) {
          await fsPromises.unlink(cleanupFile.path).catch((unlinkErr) => {
            console.error(`[Upload Validator] Error unlinking corrupt file ${cleanupFile.path}:`, unlinkErr);
          });
        }
      }

      res.status(400).json({
        error: result.reasonAr || 'الملف المرفوع تالف أو يحتوي على بنية غير صالحة.',
        errorEn: result.reason || 'The uploaded file is corrupt or has an invalid header/structure.',
        details: result.reason
      });
      return;
    }
  }

  next();
}

export const validateUploadedFiles = uploadValidator;
