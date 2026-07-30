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
  const result = await pool.query(
    `INSERT INTO user_files (user_id, file_name, file_url, file_size, mime_type, file_type, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [userId, data.file_name, data.file_url, data.file_size, data.mime_type, data.file_type, JSON.stringify(data.metadata)]
  );
  triggerFileCacheInvalidation(data.file_url);
  return result.rows[0];
}

export async function getUserStorageUsage(userId: string): Promise<number> {
  if (!pool) return 0;
  const result = await pool.query('SELECT SUM(file_size) as total FROM user_files WHERE user_id = $1', [userId]);
  return parseInt(result.rows[0].total || '0');
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
    const response = await fetch(imageData);
    if (!response.ok) {
      throw new Error(`Failed to download image from URL: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get('content-type');
    if (contentType) {
      mimeType = contentType;
      fileExtension = contentType.split('/')[1] || 'jpg';
    }
  } else {
    buffer = Buffer.from(imageData, 'base64');
  }

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
    const matches = videoData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length < 3) {
      throw new Error('Invalid base64 data video formatting');
    }
    mimeType = matches[1];
    fileExtension = mimeType.split('/')[1] || 'mp4';
    buffer = Buffer.from(matches[2], 'base64');
  } else if (videoData.startsWith('http://') || videoData.startsWith('https://')) {
    // If it's a known public sample video or is already perfectly publicly hosted, we don't need to cache/write it to disk
    if (videoData.includes('commondatastorage.googleapis.com') || videoData.includes('gtv-videos-bucket') || videoData.includes('sample')) {
      console.log(`[File Service] Video is from a standard public sample bucket. Bypassing disk save and returning original URL.`);
      return videoData;
    }

    let response: Response | null = null;
    try {
      response = await fetch(videoData, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/437.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          ...customHeaders
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
    } catch (err: any) {
      console.warn(`[File Service] First fetch attempt failed with User-Agent: ${err.message}. Retrying clean raw fetch...`);
      try {
        response = await fetch(videoData, {
          headers: customHeaders
        });
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

