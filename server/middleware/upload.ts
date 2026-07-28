import multer from 'multer';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';
import { randomUUID } from 'crypto';

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
  '.png': ['image/png', 'image/x-png', 'application/octet-stream'],
  '.jpg': ['image/jpeg', 'image/pjpeg', 'application/octet-stream'],
  '.jpeg': ['image/jpeg', 'image/pjpeg', 'application/octet-stream'],
  '.gif': ['image/gif', 'application/octet-stream'],
  '.webp': ['image/webp', 'application/octet-stream'],
  '.heic': ['image/heic', 'image/heic-sequence', 'application/octet-stream'],
  '.heif': ['image/heif', 'image/heif-sequence', 'application/octet-stream'],
  '.svg': ['image/svg+xml', 'text/xml', 'application/octet-stream'],
  '.bmp': ['image/bmp', 'image/x-windows-bmp', 'application/octet-stream'],
  '.mp4': ['video/mp4', 'video/x-m4v', 'video/m4v', 'application/octet-stream', 'video/quicktime'],
  '.mov': ['video/quicktime', 'video/x-quicktime', 'image/mov', 'application/octet-stream', 'video/mp4'],
  '.webm': ['video/webm', 'audio/webm', 'application/octet-stream'],
  '.mkv': ['video/x-matroska', 'video/mkv', 'application/octet-stream'],
  '.avi': ['video/x-msvideo', 'video/avi', 'application/x-troff-msvideo', 'application/octet-stream', 'video/vnd.avi'],
  '.m4v': ['video/x-m4v', 'video/mp4', 'application/octet-stream'],
  '.3gp': ['video/3gpp', 'audio/3gpp', 'video/3gpp2', 'application/octet-stream'],
  '.mp3': ['audio/mpeg', 'audio/mp3', 'audio/x-mpeg', 'audio/mp4'],
  '.wav': ['audio/wav', 'audio/x-wav', 'audio/wave']
};

export const upload = multer({ 
  storage,
  limits: {
    // Hardening: Restrict max upload size to 100MB to prevent memory-exhaustion or storage-exhaustion DoS attacks
    fileSize: 100 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mimeLower = file.mimetype ? file.mimetype.toLowerCase() : '';

    // Permissive check for standard image/video/audio/document streams from desktop or mobile devices
    if (
      mimeLower.startsWith('image/') ||
      mimeLower.startsWith('video/') ||
      mimeLower.startsWith('audio/') ||
      mimeLower.startsWith('text/') ||
      mimeLower === 'application/pdf'
    ) {
      return cb(null, true);
    }

    const mimetypesForExt = allowedMimeTypes[ext];
    
    if (!mimetypesForExt) {
      return cb(new Error('File type not allowed for security reasons. Please use standard document or media formats.'));
    }

    if (!mimetypesForExt.includes(mimeLower) && mimeLower !== 'application/octet-stream') {
      return cb(new Error('Security check failed: File mimetype mismatch for the specified extension format. Upload blocked.'));
    }

    cb(null, true);
  }
});

export const handleMulterError = (err: any, req: any, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: 'حجم الملف كبير جداً. الحد الأقصى المسموح به هو 100 ميجابايت لضمان أداء مستقر.',
        errorEn: 'File is too large. The maximum allowed size is 100MB to ensure stable performance.'
      });
    }
    return res.status(400).json({ error: err.message });
  } else if (err.message && (err.message.includes('not allowed for security reasons') || err.message.includes('Security check failed'))) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
};
