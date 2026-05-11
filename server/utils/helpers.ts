import express from 'express';

export const getBaseUrl = (req: express.Request) => {
  const protocol = req.get('x-forwarded-proto') || req.protocol;
  const host = req.get('x-forwarded-host') || req.get('host');
  const envUrl = process.env.VITE_APP_URL || process.env.APP_URL;
  let origin = `${protocol}://${host}`;
  if (envUrl && envUrl.startsWith('http')) origin = envUrl;
  return origin.endsWith('/') ? origin.slice(0, -1) : origin;
};

export const getRedirectUri = (req?: any) => {
  let baseUrl = process.env.APP_URL;
  if (!baseUrl && req) {
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    baseUrl = `${protocol}://${host}`;
  }
  if (!baseUrl) baseUrl = 'http://localhost:3000';
  return `${baseUrl.replace(/\/$/, '')}/api/auth/google/callback`;
};

export const extractFollowUps = (text: string): { cleanText: string, followUps: string[] } => {
  const followUpRegex = /\[FOLLOW_UPS\]\n?([\s\S]*)$|\[أسئلة_متابعة\]\n?([\s\S]*)$/;
  const match = text.match(followUpRegex);
  if (match) {
    const rawUps = match[1] || match[2] || '';
    const followUps = rawUps
      .split('\n')
      .map(q => q.replace(/^\d+\.\s*|-\s*|\*\s*/, '').trim())
      .filter(q => q.length > 5 && q.length < 200);
    const cleanText = text.replace(followUpRegex, '').trim();
    return { cleanText, followUps };
  }
  return { cleanText: text, followUps: [] };
};
