import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { upload, handleMulterError } from '../middleware/upload.js';
import { checkDiskSpace } from '../middleware/checkDiskSpace.js';
import { uploadValidator } from '../middleware/uploadValidator.js';
import { extractTextFromFile, forensicScanPDF } from '../services/extractor.js';
import { logSystemActivity } from '../services/notifications.js';
import { getUserFiles, saveFileMetadata, getUserStorageUsage } from '../services/files.js';
import { auditFilePipeline, resolveMediaAbsolutePath } from '../services/fileValidationService.js';
import { processUploadedVideo } from '../services/videoProcessor.js';
import { optimizeUploadedImage } from '../services/mediaOptimizationService.js';
import { pool } from '../db/index.js';
import fs from 'fs/promises';
import crypto from 'crypto';
import path from 'path';

const router = express.Router();

router.post("/upload", authenticateToken, checkDiskSpace, upload.single('file'), handleMulterError, uploadValidator, async (req: any, res: any) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file attached' });

    const userId = req.user.id;
    const { originalname, filename, path: filePath, mimetype, size } = req.file;

    const [subRes, currentUsage] = await Promise.all([
      pool.query(`
        SELECT u.role, s.plan_id, s.status, p.limits 
        FROM users u
        LEFT JOIN subscriptions s ON u.id = s.user_id
        LEFT JOIN plans p ON s.plan_id = p.id
        WHERE u.id = $1
        ORDER BY CASE WHEN s.status = 'active' THEN 0 ELSE 1 END, s.current_period_end DESC NULLS LAST
        LIMIT 1
      `, [userId]),
      getUserStorageUsage(userId)
    ]);

    const row = subRes.rows[0] || {};
    const hasActiveSub = row.plan_id && row.status === 'active';
    const limits = typeof row.limits === 'object' && row.limits !== null ? row.limits : (typeof row.limits === 'string' ? JSON.parse(row.limits || '{}') : {});
    const storageLimit = limits['storage_mb'];
    
    let limitMb = typeof storageLimit === 'object' ? (storageLimit.monthly || storageLimit.daily) : storageLimit;
    
    if (row.role === 'admin') {
      limitMb = 'unlimited';
    } else if (!hasActiveSub) {
      limitMb = '20';
    }
    
    if (limitMb !== 'unlimited') {
      const allowedMb = limitMb ? parseInt(limitMb, 10) : 0;
      const limitBytes = allowedMb * 1024 * 1024;
      if (currentUsage + size > limitBytes) {
        return res.status(402).json({ 
          error: 'Storage quota exceeded', 
          message_ar: 'تجاوزت سعة التخزين المسموح بها ويرجى الاشتراك بخطة للاستمرار',
          message_en: 'Storage limit exceeded. Please activate a subscription plan to upload.',
          limit_mb: allowedMb 
        });
      }
    }

    let fileType = 'other';
    if (mimetype.startsWith('image/')) fileType = 'image';
    else if (mimetype === 'application/pdf') fileType = 'document';
    else if (mimetype.startsWith('text/')) fileType = 'document';
    else if (mimetype.startsWith('video/')) fileType = 'video';
    else if (mimetype.startsWith('audio/')) fileType = 'audio';

    let finalFilename = filename;
    let videoMetadata: any = {};
    let imageMetadata: any = {};
    let processedFileSize = size;

    const videoExtensions = ['mp4', 'mov', 'avi', 'webm', 'mkv', 'wmv', 'flv', '3gp'];
    const isVideoExtension = videoExtensions.some(ext => originalname.toLowerCase().endsWith('.' + ext));

    if (mimetype.startsWith('image/')) {
      try {
        console.log(`[File Router] Optimizing uploaded image with sharp: ${originalname}`);
        const optResult = await optimizeUploadedImage(filePath, originalname);
        finalFilename = optResult.filename;
        processedFileSize = optResult.size;
        imageMetadata = {
          width: optResult.width,
          height: optResult.height,
          format: optResult.format,
          isStandardized: true
        };
        console.log(`[File Router] Image optimized successfully. Resolution: ${optResult.width}x${optResult.height}, Size: ${optResult.size} bytes`);
      } catch (imgErr: any) {
        console.error('[File Router] Sharp image optimization error:', imgErr.message);
      }
    } else if (mimetype.startsWith('video/') || isVideoExtension) {
      try {
        const maxDuration = req.query.maxDuration ? parseInt(req.query.maxDuration as string, 10) : undefined;
        console.log(`[File Router] Processing uploaded video with FFmpeg: ${originalname}${maxDuration ? ` (Max duration: ${maxDuration}s)` : ''}`);
        const result = await processUploadedVideo(filePath, path.dirname(filePath), 'pvid', maxDuration);
        if (result.success && result.processedVideoUrl) {
          finalFilename = result.processedVideoUrl.replace('/uploads/', '');
          if (result.fileSize) processedFileSize = result.fileSize;
          videoMetadata = {
            thumbnailUrl: result.thumbnailUrl,
            duration: result.duration,
            width: result.width,
            height: result.height,
            resolution: result.resolution || `${result.width || 1280}x${result.height || 720}`,
            bitrate: result.bitrate,
            fileSize: result.fileSize,
            format: result.format,
            isStandardized: true
          };
          console.log(`[File Router] Video standardized successfully. Resolution: ${videoMetadata.resolution}, Duration: ${videoMetadata.duration}s, Bitrate: ${videoMetadata.bitrate}`);
        }
      } catch (videoErr: any) {
        console.error('[File Router] FFmpeg video processing error:', videoErr.message);
      }
    }

    const currentFilePath = path.join(path.dirname(filePath), finalFilename);
    const extractedText = await extractTextFromFile(currentFilePath, mimetype, originalname);
    
    let forensic = null;
    if (mimetype === 'application/pdf') {
      try {
        const fileBuffer = await fs.readFile(currentFilePath);
        forensic = forensicScanPDF(fileBuffer);
      } catch (err: any) {
        console.error('[PDF Bridge Ingest] File forensic scan failed:', err.message);
      }
    }

    const isPublicMedia = mimetype.startsWith('image/') || mimetype.startsWith('video/') || mimetype.startsWith('audio/') || isVideoExtension;
    const file = await saveFileMetadata(userId, {
      file_name: originalname,
      file_url: finalFilename,
      file_size: processedFileSize,
      mime_type: mimetype,
      file_type: fileType,
      metadata: { 
        is_public: isPublicMedia,
        isPublic: isPublicMedia,
        extractedText: extractedText.substring(0, 5000), 
        isProcessed: extractedText.length > 0,
        forensic,
        ...videoMetadata,
        ...imageMetadata
      }
    });

    const fileUrl = `/uploads/${finalFilename}`;
    const thumbnailUrl = videoMetadata.thumbnailUrl || '';

    try {
      if (true /* try-catch will handle */) {
        const fileBuf = await fs.readFile(currentFilePath);
        await pool.query('UPDATE user_files SET file_data = $1 WHERE id = $2', [fileBuf, file.id]);
        console.log(`[File Router] File data saved to PostgreSQL for ${finalFilename}`);
        
        // Ensure video or unoptimized file is also in media_assets if not already inserted by optimizeUploadedImage
        if (mimetype.startsWith('video/') || isVideoExtension || mimetype.startsWith('audio/') || mimetype.startsWith('application/pdf')) {
           const sha256Hash = crypto.createHash('sha256').update(fileBuf).digest('hex');
           const storedPath = `uploads/${finalFilename}`;
           let mContext = 'general';
           if (mimetype.startsWith('video/') || isVideoExtension) mContext = 'video';
           
           await pool.query(`
              INSERT INTO media_assets (
                stored_path, original_filename, context, format, width, height, size_bytes, sha256_hash, is_public,
                user_id, metadata, file_data
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
              ON CONFLICT (stored_path) DO UPDATE SET
                 context = EXCLUDED.context,
                 user_id = COALESCE(EXCLUDED.user_id, media_assets.user_id),
                 file_data = EXCLUDED.file_data,
                 updated_at = CURRENT_TIMESTAMP
           `, [
              storedPath, originalname, mContext, fileType, 
              videoMetadata.width || 0, videoMetadata.height || 0, processedFileSize, sha256Hash, isPublicMedia,
              userId, JSON.stringify(file.metadata), fileBuf
           ]);
           console.log(`[File Router] Registered asset in media_assets for ${finalFilename}`);
        }
      }
    } catch (dbErr: any) {
      console.error('[File Router] Failed to save file data to DB:', dbErr.message);
    }

    res.status(201).json({ 
      success: true, 
      file: { 
        ...file, 
        url: fileUrl, 
        thumbnailUrl, 
        resolution: videoMetadata.resolution,
        duration: videoMetadata.duration,
        bitrate: videoMetadata.bitrate,
        fileSize: processedFileSize
      }, 
      url: fileUrl,
      fileUrl, 
      thumbnailUrl,
      resolution: videoMetadata.resolution,
      duration: videoMetadata.duration,
      bitrate: videoMetadata.bitrate,
      fileSize: processedFileSize
    });
    await logSystemActivity(userId, 'file_upload', `Uploaded file: ${originalname}`, { fileId: file.id }, req);
  } catch (error: any) {
    console.error('File upload failed:', error);
    res.status(500).json({ error: 'Upload failed', details: error.message || String(error) });
  }
});

router.post("/analyze-forensic", authenticateToken, checkDiskSpace, upload.single('file'), handleMulterError, uploadValidator, async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No document attached for diagnostic audit.' });
    }
    const { path: filePath, mimetype } = req.file;

    if (mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Forensic mode analytical scanner is restricted to PDF binary documents.' });
    }

    const fileBuffer = await fs.readFile(filePath);
    const forensicReport = forensicScanPDF(fileBuffer);

    await fs.unlink(filePath).catch(() => {});

    res.json({ success: true, forensic: forensicReport });
  } catch (error: any) {
    res.status(500).json({ error: 'Forensic diagnostic mapping failed.', details: error.message });
  }
});

router.get("/audit", authenticateToken, async (req: any, res: any) => {
  try {
    const report = await auditFilePipeline();
    res.json(report);
  } catch (error: any) {
    res.status(500).json({ error: 'File pipeline audit failed', details: error.message });
  }
});

router.post("/resolve-path", authenticateToken, async (req: any, res: any) => {
  try {
    const { url } = req.body;
    const resolved = await resolveMediaAbsolutePath(url);
    res.json(resolved);
  } catch (error: any) {
    res.status(500).json({ error: 'Path resolution failed', details: error.message });
  }
});

router.get("/", authenticateToken, async (req: any, res: any) => {
  try {
    const files = await getUserFiles(req.user.id);
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: 'Internal Error' });
  }
});

export default router;
