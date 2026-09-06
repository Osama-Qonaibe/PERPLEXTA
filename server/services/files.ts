import { pool } from '../db/index.js';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { triggerFileCacheInvalidation } from './fileValidationService.js';

export async function getUserFiles(userId: string) {
  if (!pool) throw new Error('Database initializing');
  const result = await pool.query('SELECT * FROM user_files WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
  return result.rows;
}

export async function saveFileMetadata(userId: string, data: {
  file_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  file_type: string;
  metadata: any;
}) {
  if (!pool) throw new Error('Database initializing');

  const existing = await pool.query(
    'SELECT id, file_version FROM user_files WHERE user_id = $1 AND file_url = $2 LIMIT 1',
    [userId, data.file_url]
  );

  let result;
  if (existing.rows.length > 0) {
    const newVersion = (existing.rows[0].file_version || 1) + 1;
    result = await pool.query(
      `UPDATE user_files 
       SET file_name = $1, file_size = $2, mime_type = $3, file_type = $4, metadata = $5, file_version = $6, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $7 AND file_url = $8 RETURNING *`,
      [data.file_name, data.file_size, data.mime_type, data.file_type, JSON.stringify(data.metadata), newVersion, userId, data.file_url]
    );
  } else {
    result = await pool.query(
      `INSERT INTO user_files (user_id, file_name, file_url, file_size, mime_type, file_type, metadata, file_version)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 1) RETURNING *`,
      [userId, data.file_name, data.file_url, data.file_size, data.mime_type, data.file_type, JSON.stringify(data.metadata)]
    );
  }

  triggerFileCacheInvalidation(data.file_url);
  return result.rows[0];
}

export async function getUserStorageUsage(userId: string): Promise<number> {
  if (!pool) return 0;
  const result = await pool.query('SELECT SUM(file_size) as total FROM user_files WHERE user_id = $1', [userId]);
  return parseInt(result.rows[0].total || '0');
}

function isBufferValidImage(
  buffer: Buffer,
  fallbackMimeType?: string
): { isValid: boolean; mimeType: string; fileExtension: string } {
  if (!buffer || buffer.length < 100) {
    return { isValid: false, mimeType: '', fileExtension: '' };
  }

  // Reject text / HTML / JSON error payloads immediately
  const textSample = buffer.toString('utf8', 0, Math.min(buffer.length, 256)).trim().toLowerCase();
  if (
    textSample.startsWith('<html') ||
    textSample.startsWith('<!doctype') ||
    textSample.startsWith('{"') ||
    textSample.startsWith('[{') ||
    textSample.startsWith('internal server error') ||
    textSample.startsWith('error') ||
    textSample.startsWith('access denied') ||
    textSample.startsWith('unauthorized') ||
    textSample.startsWith('<error')
  ) {
    return { isValid: false, mimeType: '', fileExtension: '' };
  }

  const hex = buffer.toString('hex', 0, 12).toLowerCase();

  // PNG
  if (hex.startsWith('89504e47')) {
    return { isValid: true, mimeType: 'image/png', fileExtension: 'png' };
  }
  // JPEG (starts with FF D8)
  if (hex.startsWith('ffd8')) {
    return { isValid: true, mimeType: 'image/jpeg', fileExtension: 'jpg' };
  }
  // GIF (starts with 47 49 46 38 -> 'GIF8')
  if (hex.startsWith('47494638')) {
    return { isValid: true, mimeType: 'image/gif', fileExtension: 'gif' };
  }
  // WEBP (starts with 52 49 46 46 and 8-12 is 57 45 42 50 -> 'RIFF' ... 'WEBP')
  if (hex.startsWith('52494646')) {
    const webpIndicator = buffer.subarray(8, 12).toString('ascii');
    if (webpIndicator === 'WEBP') {
      return { isValid: true, mimeType: 'image/webp', fileExtension: 'webp' };
    }
  }
  // AVIF / HEIC (ftyp at bytes 4-7)
  const ftyp = buffer.subarray(4, 8).toString('ascii');
  if (ftyp === 'ftyp') {
    const brand = buffer.subarray(8, 12).toString('ascii').toLowerCase();
    if (brand.includes('avif') || brand.includes('avis')) {
      return { isValid: true, mimeType: 'image/avif', fileExtension: 'avif' };
    }
    if (brand.includes('heic') || brand.includes('heif') || brand.includes('mif1')) {
      return { isValid: true, mimeType: 'image/heic', fileExtension: 'heic' };
    }
  }
  // BMP (starts with 42 4d -> 'BM')
  if (hex.startsWith('424d')) {
    return { isValid: true, mimeType: 'image/bmp', fileExtension: 'bmp' };
  }
  // TIFF (49 49 2a 00 or 4d 4d 00 2a)
  if (hex.startsWith('49492a00') || hex.startsWith('4d4d002a')) {
    return { isValid: true, mimeType: 'image/tiff', fileExtension: 'tiff' };
  }
  // ICO / CUR (00 00 01 00 or 00 00 02 00)
  if (hex.startsWith('00000100') || hex.startsWith('00000200')) {
    return { isValid: true, mimeType: 'image/x-icon', fileExtension: 'ico' };
  }
  // SVG (XML starts with '<' or '<?xml' or '<svg')
  if (textSample.startsWith('<svg') || textSample.startsWith('<?xml') || textSample.includes('<svg')) {
    return { isValid: true, mimeType: 'image/svg+xml', fileExtension: 'svg' };
  }

  // Fallback for valid binary buffers with known image HTTP Content-Type (minimum 500 bytes)
  if (buffer.length >= 500 && fallbackMimeType && fallbackMimeType.startsWith('image/')) {
    const cleanMime = fallbackMimeType.split(';')[0].trim().toLowerCase();
    let ext = cleanMime.split('/')[1] || 'jpg';
    if (ext === 'jpeg') ext = 'jpg';
    if (ext === 'svg+xml') ext = 'svg';
    return { isValid: true, mimeType: cleanMime, fileExtension: ext };
  }

  return { isValid: false, mimeType: '', fileExtension: '' };
}

function isBufferValidVideo(buffer: Buffer): { isValid: boolean; mimeType: string; fileExtension: string } {
  if (!buffer || buffer.length < 12) {
    return { isValid: false, mimeType: '', fileExtension: '' };
  }
  const hex = buffer.toString('hex', 0, 12).toLowerCase();

  // MP4 has 'ftyp' at bytes 4-7
  const ftypBox = buffer.subarray(4, 8).toString('ascii');
  if (ftypBox === 'ftyp' || ftypBox === 'moov' || ftypBox === 'mdat' || ftypBox === 'wide') {
    return { isValid: true, mimeType: 'video/mp4', fileExtension: 'mp4' };
  }

  // WebM/MKV starts with EBML (1a 45 df a3)
  if (hex.startsWith('1a45dfa3')) {
    return { isValid: true, mimeType: 'video/webm', fileExtension: 'webm' };
  }

  // OGG (OggS container, starts with 4f 67 67 53)
  if (hex.startsWith('4f676753')) {
    return { isValid: true, mimeType: 'video/ogg', fileExtension: 'ogg' };
  }

  // AVI (RIFF and AVI List, starts with 52 49 46 46)
  if (hex.startsWith('52494646')) {
    const aviIndicator = buffer.subarray(8, 12).toString('ascii');
    if (aviIndicator === 'AVI ') {
      return { isValid: true, mimeType: 'video/x-msvideo', fileExtension: 'avi' };
    }
  }

  return { isValid: false, mimeType: '', fileExtension: '' };
}

export async function saveGeneratedImageToDisk(userId: string, imageData: string): Promise<string> {
  const uploadDir = path.join(process.cwd(), 'uploads');
  // Confirm uploads directory exists
  await fs.mkdir(uploadDir, { recursive: true }).catch(() => {});

  let buffer: Buffer;
  let fileExtension = 'jpg';
  let mimeType = 'image/jpeg';

  if (imageData.startsWith('data:')) {
    const matches = imageData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length < 3) {
      throw new Error('Invalid base64 data image formatting');
    }
    mimeType = matches[1];
    fileExtension = mimeType.split('/')[1] || 'jpg';
    buffer = Buffer.from(matches[2], 'base64');
  } else if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
    const response = await fetch(imageData, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    if (!response.ok) {
      throw new Error(`Failed to download image from URL (${imageData}): ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get('content-type');
    if (contentType) {
      mimeType = contentType.split(';')[0].trim().toLowerCase();
      fileExtension = mimeType.split('/')[1] || 'jpg';
    }
  } else {
    const cleanB64 = imageData.trim().replace(/^["']|["']$/g, '');
    buffer = Buffer.from(cleanB64, 'base64');
  }

  // Validate buffer integrity & format
  const validation = isBufferValidImage(buffer, mimeType);
  if (!validation.isValid) {
    throw new Error('Generated file payload is not a valid or supported image format (محتوى الصورة غير صالح أو غير مدعوم)');
  }
  mimeType = validation.mimeType;
  fileExtension = validation.fileExtension;

  const randomFilename = `${Date.now()}-${crypto.randomUUID()}.${fileExtension}`;
  const filePath = path.join(uploadDir, randomFilename);

  await fs.writeFile(filePath, buffer);

  // Register the file metadata
  await saveFileMetadata(userId, {
    file_name: `Perplexta_Gen_${Date.now()}.${fileExtension}`,
    file_url: randomFilename,
    file_size: buffer.length,
    mime_type: mimeType,
    file_type: 'image',
    metadata: {
      generated: true,
      origin: 'AI_Orchestrator_Studio'
    }
  });

  return `/uploads/${randomFilename}`;
}

export async function saveGeneratedVideoToDisk(userId: string, videoData: string, customHeaders?: Record<string, string>): Promise<string> {
  const uploadDir = path.join(process.cwd(), 'uploads');
  // Confirm uploads directory exists
  await fs.mkdir(uploadDir, { recursive: true }).catch(() => {});

  let buffer: Buffer;
  let fileExtension = 'mp4';
  let mimeType = 'video/mp4';

  if (videoData.startsWith('data:')) {
    try {
      const commaIndex = videoData.indexOf(',');
      if (commaIndex !== -1) {
        const header = videoData.substring(0, commaIndex);
        const rawBase64 = videoData.substring(commaIndex + 1).replace(/\s+/g, '');
        const mimeMatch = header.match(/data:([^;]+)/);
        if (mimeMatch && mimeMatch[1]) {
          mimeType = mimeMatch[1];
          const ext = mimeType.split('/')[1];
          if (ext) fileExtension = ext.split('+')[0];
        }
        buffer = Buffer.from(rawBase64, 'base64');
      } else {
        const cleanData = videoData.replace(/^data:[^;]+;base64,/, '').replace(/\s+/g, '');
        buffer = Buffer.from(cleanData, 'base64');
      }
    } catch (b64Err: any) {
      console.error(`[File Service] Base64 video parsing failed: ${b64Err.message}`);
      return videoData;
    }
  } else if (videoData.startsWith('http://') || videoData.startsWith('https://')) {
    // If it's a known public sample video or is already perfectly publicly hosted, we don't need to cache/write it to disk
    if (videoData.includes('commondatastorage.googleapis.com') || videoData.includes('gtv-videos-bucket') || videoData.includes('sample')) {
      console.log(`[File Service] Video is from a standard public sample bucket. Bypassing disk save and returning original URL.`);
      return videoData;
    }

    let response: Response | null = null;
    try {
      const controller = new AbortController();
      const tId = setTimeout(() => controller.abort(), 15000);
      response = await fetch(videoData, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/437.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          ...customHeaders
        },
        signal: controller.signal
      });
      clearTimeout(tId);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
    } catch (err: any) {
      console.warn(`[File Service] First fetch attempt failed with User-Agent: ${err.message}. Retrying clean raw fetch...`);
      try {
        const controller2 = new AbortController();
        const tId2 = setTimeout(() => controller2.abort(), 15000);
        response = await fetch(videoData, {
          headers: customHeaders,
          signal: controller2.signal
        });
        clearTimeout(tId2);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }
      } catch (cleanFetchErr: any) {
        console.error(`[File Service] Resilient fallback: Raw retry also failed: ${cleanFetchErr.message}. Returning original URL.`);
        return videoData;
      }
    }

    try {
      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      const contentType = response.headers.get('content-type');
      if (contentType) {
        mimeType = contentType;
        fileExtension = contentType.split('/')[1] || 'mp4';
      }
    } catch (bufferErr: any) {
      console.error(`[File Service] Failed to read arrayBuffer from response: ${bufferErr.message}. Returning original URL.`);
      return videoData;
    }
  } else {
    buffer = Buffer.from(videoData, 'base64');
  }

  // Validate video buffer integrity & format
  const validation = isBufferValidVideo(buffer);
  if (!validation.isValid) {
    throw new Error('Generated file payload is not a valid or supported video format (محتوى الفيديو غير صالح أو غير مدعوم)');
  }
  mimeType = validation.mimeType;
  fileExtension = validation.fileExtension;

  const randomFilename = `${Date.now()}-${crypto.randomUUID()}.${fileExtension}`;
  const filePath = path.join(uploadDir, randomFilename);

  await fs.writeFile(filePath, buffer);

  // Register the file metadata
  await saveFileMetadata(userId, {
    file_name: `Perplexta_Video_${Date.now()}.${fileExtension}`,
    file_url: randomFilename,
    file_size: buffer.length,
    mime_type: mimeType,
    file_type: 'video',
    metadata: {
      generated: true,
      origin: 'AI_Orchestrator_Studio'
    }
  });

  return `/uploads/${randomFilename}`;
}

export async function saveGeneratedAudioToDisk(userId: string, audioBase64: string, mimeType = 'audio/wav', prompt = 'AI_Track', lyrics = ''): Promise<string> {
  const uploadDir = path.join(process.cwd(), 'uploads');
  // Confirm uploads directory exists
  await fs.mkdir(uploadDir, { recursive: true }).catch(() => {});

  const buffer = Buffer.from(audioBase64, 'base64');
  let fileExtension = 'wav';
  if (mimeType.includes('mp3')) fileExtension = 'mp3';
  else if (mimeType.includes('mpeg')) fileExtension = 'mp3';
  else if (mimeType.includes('ogg')) fileExtension = 'ogg';

  const randomFilename = `${Date.now()}-${crypto.randomUUID()}.${fileExtension}`;
  const filePath = path.join(uploadDir, randomFilename);

  await fs.writeFile(filePath, buffer);

  // Register the file metadata
  await saveFileMetadata(userId, {
    file_name: `${prompt.replace(/[^a-zA-Z0-9\s_\u0600-\u06FF-]/g, '').substring(0, 30) || 'Perplexta_Audio'}_${Date.now()}.${fileExtension}`,
    file_url: randomFilename,
    file_size: buffer.length,
    mime_type: mimeType,
    file_type: 'audio',
    metadata: {
      generated: true,
      origin: 'AI_Orchestrator_Audio_Studio',
      lyrics,
      prompt
    }
  });

  return `/uploads/${randomFilename}`;
}

