import fs from 'fs/promises';
import path from 'path';

export const checkDiskSpace = async (req: any, res: any, next: any) => {
  try {
    const uploadDir = path.join(process.cwd(), 'uploads');
    const stats = await fs.statfs(uploadDir);
    // bytes available
    const availableBytes = stats.bavail * stats.bsize;
    const availableMB = availableBytes / (1024 * 1024);
    
    // Check if Content-Length exceeds available
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    
    // We want at least 150MB free OR at least the file size + 50MB
    const requiredMB = Math.max(150, (contentLength / (1024 * 1024)) + 50);

    if (availableMB < requiredMB) {
      console.warn(`[DiskCheck] Low disk space! Available: ${availableMB.toFixed(2)} MB. Rejecting upload.`);
      return res.status(503).json({
        error: 'The server is currently out of storage space. Please try again later or contact support.',
        errorAr: 'المساحة التخزينية في الخادم ممتلئة حالياً. يرجى المحاولة لاحقاً.'
      });
    }
    
    next();
  } catch (err) {
    console.error('[DiskCheck] Failed to check disk space:', err);
    next(); // Proceed anyway if statfs fails
  }
};
