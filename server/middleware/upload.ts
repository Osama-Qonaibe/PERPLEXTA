import multer from 'multer';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(process.cwd(), 'uploads');
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueId = randomUUID();
    cb(null, `${uniqueId}${ext}`);
  }
});

// Explicit Mapping between extensions and safe verified mimetypes to prevent PHP rename bypasses
const allowedMimeTypes: Record<string, string[]> = {
  '.pdf': ['application/pdf'],
  '.doc': ['application/msword'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.txt': ['text/plain'],
  '.rtf': ['application/rtf', 'text/rtf'],
  '.json': ['application/json'],
  '.xls': ['application/vnd.ms-excel'],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  '.csv': ['text/csv', 'application/csv', 'application/vnd.ms-excel', 'text/comma-separated-values', 'text/plain'],
  '.png': ['image/png'],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.gif': ['image/gif'],
  '.webp': ['image/webp'],
  '.mp4': ['video/mp4'],
  '.mp3': ['audio/mpeg', 'audio/mp3'],
  '.wav': ['audio/wav', 'audio/x-wav']
};

export const upload = multer({ 
  storage,
  limits: {
    // Hardening: Restrict max upload size to 15MB to prevent memory-exhaustion or storage-exhaustion DoS attacks
    fileSize: 15 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mimetypesForExt = allowedMimeTypes[ext];
    
    if (!mimetypesForExt) {
      return cb(new Error('File type not allowed for security reasons. Please use standard document or media formats.'));
    }

    if (!mimetypesForExt.includes(file.mimetype.toLowerCase())) {
      return cb(new Error('Security check failed: File mimetype mismatch for the specified extension format. Upload blocked.'));
    }

    cb(null, true);
  }
});

export const handleMulterError = (err: any, req: any, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: 'حجم الملف كبير جداً. الحد الأقصى المسموح به هو 15 ميجابايت لضمان أداء مستقر.',
        errorEn: 'File is too large. The maximum allowed size is 15MB to ensure stable performance.'
      });
    }
    return res.status(400).json({ error: err.message });
  } else if (err.message && (err.message.includes('not allowed for security reasons') || err.message.includes('Security check failed'))) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
};
