import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import { pool } from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';
import { upload, handleMulterError } from '../middleware/upload.js';
import { extractTextFromFile } from '../services/extractor.js';
import { logSystemActivity } from '../services/notifications.js';

const router = express.Router();
const uploadDir = path.join(process.cwd(), 'uploads');

router.post("/upload", authenticateToken, upload.single('file'), handleMulterError, async (req: any, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file attached' });

    const userId = req.user.id;
    const { originalname, filename, path: filePath, mimetype, size } = req.file;

    let fileType = 'other';
    if (mimetype.startsWith('image/')) fileType = 'image';
    else if (mimetype === 'application/pdf') fileType = 'document';
    else if (mimetype.startsWith('text/')) fileType = 'document';
    else if (mimetype.startsWith('video/')) fileType = 'video';
    else if (mimetype.startsWith('audio/')) fileType = 'audio';

    const extractedText = await extractTextFromFile(filePath, mimetype, originalname);
    const result = await pool.query(
      `INSERT INTO user_files (user_id, file_name, file_url, file_size, mime_type, file_type, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [userId, originalname, filename, size, mimetype, fileType, JSON.stringify({ 
        extractedText: extractedText.substring(0, 5000), 
        isProcessed: extractedText.length > 0
      })]
    );

    res.status(201).json({ success: true, file: result.rows[0] });
    await logSystemActivity(userId, 'file_upload', `Uploaded file: ${originalname}`, { fileId: result.rows[0].id }, req);
  } catch (error) {
    res.status(500).json({ error: 'Upload failed' });
  }
});

router.get("/", authenticateToken, async (req: any, res) => {
  try {
    const result = await pool.query('SELECT * FROM user_files WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Internal Error' });
  }
});

export default router;
