import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { upload, handleMulterError } from '../middleware/upload.js';
import { extractTextFromFile, forensicScanPDF } from '../services/extractor.js';
import { logSystemActivity } from '../services/notifications.js';
import { getUserFiles, saveFileMetadata, getUserStorageUsage } from '../services/files.js';
import { pool } from '../db/index.js';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();

router.post("/upload", authenticateToken, upload.single('file'), handleMulterError, async (req: any, res: any) => {
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
      `, [userId]),
      getUserStorageUsage(userId)
    ]);

    const row = subRes.rows[0] || {};
    const hasActiveSub = row.plan_id && row.status === 'active';
    const limits = row.limits || {};
    const storageLimit = limits['storage_mb'];
    
    let limitMb = typeof storageLimit === 'object' ? (storageLimit.monthly || storageLimit.daily) : storageLimit;
    
    // Non-admin without any active subscription gets 0 limit
    if (row.role !== 'admin' && !hasActiveSub) {
      limitMb = '0';
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

    const extractedText = await extractTextFromFile(filePath, mimetype, originalname);
    
    let forensic = null;
    if (mimetype === 'application/pdf') {
      try {
        const fileBuffer = await fs.readFile(filePath);
        forensic = forensicScanPDF(fileBuffer);
      } catch (err: any) {
        console.error('[PDF Bridge Ingest] File forensic scan failed:', err.message);
      }
    }

    const file = await saveFileMetadata(userId, {
      file_name: originalname,
      file_url: filename,
      file_size: size,
      mime_type: mimetype,
      file_type: fileType,
      metadata: { 
        extractedText: extractedText.substring(0, 5000), 
        isProcessed: extractedText.length > 0,
        forensic
      }
    });

    res.status(201).json({ success: true, file });
    await logSystemActivity(userId, 'file_upload', `Uploaded file: ${originalname}`, { fileId: file.id }, req);
  } catch (error) {
    res.status(500).json({ error: 'Upload failed' });
  }
});

router.post("/analyze-forensic", authenticateToken, upload.single('file'), handleMulterError, async (req: any, res: any) => {
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

    // Clean up temporary file immediately to satisfy Zero-Clutter and security rules
    await fs.unlink(filePath).catch(() => {});

    res.json({ success: true, forensic: forensicReport });
  } catch (error: any) {
    res.status(500).json({ error: 'Forensic diagnostic mapping failed.', details: error.message });
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
