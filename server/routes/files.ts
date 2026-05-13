import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { upload, handleMulterError } from '../middleware/upload.js';
import { extractTextFromFile } from '../services/extractor.js';
import { logSystemActivity } from '../services/notifications.js';
import { getUserFiles, saveFileMetadata, getUserStorageUsage } from '../services/files.js';
import { pool } from '../db/index.js';

const router = express.Router();

router.post("/upload", authenticateToken, upload.single('file'), handleMulterError, async (req: any, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file attached' });

    const userId = req.user.id;
    const { originalname, filename, path: filePath, mimetype, size } = req.file;

    // --- Sovereign Storage Quota Enforcement ---
    const [subRes, currentUsage] = await Promise.all([
      pool.query(`
        SELECT p.limits 
        FROM users u
        LEFT JOIN subscriptions s ON u.id = s.user_id
        LEFT JOIN plans p ON (s.plan_id = p.id OR (s.plan_id IS NULL AND p.name_en = 'Starter'))
        WHERE u.id = $1
      `, [userId]),
      getUserStorageUsage(userId)
    ]);

    const limits = subRes.rows[0]?.limits || {};
    const storageLimit = limits['storage_mb'];
    
    // storage_mb can be a number or {"daily": ..., "monthly": ...} 
    // In our case we use 'monthly' field from the UI as the TOTAL quota in MB
    let limitMb = typeof storageLimit === 'object' ? (storageLimit.monthly || storageLimit.daily) : storageLimit;
    
    if (limitMb && limitMb !== 'unlimited') {
      const limitBytes = parseInt(limitMb) * 1024 * 1024;
      if (currentUsage + size > limitBytes) {
        return res.status(402).json({ 
          error: 'Storage quota exceeded', 
          message_ar: 'تجاوزت سعة التخزين المسموح بها',
          limit_mb: limitMb 
        });
      }
    }
    // --------------------------------------------

    let fileType = 'other';
    if (mimetype.startsWith('image/')) fileType = 'image';
    else if (mimetype === 'application/pdf') fileType = 'document';
    else if (mimetype.startsWith('text/')) fileType = 'document';
    else if (mimetype.startsWith('video/')) fileType = 'video';
    else if (mimetype.startsWith('audio/')) fileType = 'audio';

    const extractedText = await extractTextFromFile(filePath, mimetype, originalname);
    
    const file = await saveFileMetadata(userId, {
      file_name: originalname,
      file_url: filename,
      file_size: size,
      mime_type: mimetype,
      file_type: fileType,
      metadata: { 
        extractedText: extractedText.substring(0, 5000), 
        isProcessed: extractedText.length > 0
      }
    });

    res.status(201).json({ success: true, file });
    await logSystemActivity(userId, 'file_upload', `Uploaded file: ${originalname}`, { fileId: file.id }, req);
  } catch (error) {
    res.status(500).json({ error: 'Upload failed' });
  }
});

router.get("/", authenticateToken, async (req: any, res) => {
  try {
    const files = await getUserFiles(req.user.id);
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: 'Internal Error' });
  }
});

export default router;
