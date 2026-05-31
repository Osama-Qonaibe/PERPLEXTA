import { Request, Response, NextFunction } from 'express';

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Requests that include the Authorization header (Bearer tokens) are intrinsically protected against CSRF 
  // because the browser cannot automatically include the header.
  if (req.headers.authorization) {
    return next();
  }

  const origin = (req.headers.origin as string) || (req.headers.referer as string);
  
  if (process.env.NODE_ENV === 'production' && origin) {
    try {
      const allowed: string[] = [];
      if (process.env.APP_URL) {
        allowed.push(process.env.APP_URL);
      }
      if (process.env.CORS_ALLOWED_ORIGINS) {
        allowed.push(...process.env.CORS_ALLOWED_ORIGINS.split(',').map((o: string) => o.trim()));
      }

      const originUrl = new URL(origin);
      const originStr = `${originUrl.protocol}//${originUrl.host}`;

      const isAllowed = allowed.some(domain => {
        if (!domain) return false;
        const cleanDomain = domain.endsWith('/') ? domain.slice(0, -1) : domain;
        // Strip trailing slashes or pathing to match only protocol + host
        try {
          const domUrl = new URL(cleanDomain);
          return `${domUrl.protocol}//${domUrl.host}` === originStr;
        } catch {
          return cleanDomain === originStr;
        }
      });

      if (!isAllowed) {
        return res.status(403).json({ error: 'CSRF protection: Untrusted or unauthorized origin blocked.' });
      }
    } catch {
      return res.status(403).json({ error: 'CSRF protection: Invalid request origin format.' });
    }
  }

  next();
}
