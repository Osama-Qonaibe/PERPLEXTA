import express from 'express';
import net from 'net';
import dns from 'dns';

export const getBaseUrl = (req: express.Request) => {
  const envUrl = process.env.VITE_APP_URL || process.env.APP_URL;
  if (envUrl && envUrl.startsWith('http')) {
    return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
  }
  const protocol = req.get('x-forwarded-proto') || req.protocol;
  let host = req.get('x-forwarded-host') || req.get('host') || 'localhost:3000';
  
  const hostClean = host.split(',')[0].trim();
  const hostRegex = /^[a-zA-Z0-9.-]+(:\d+)?$/;
  if (!hostRegex.test(hostClean)) {
    host = 'localhost:3000';
  } else {
    host = hostClean;
  }

  const origin = `${protocol}://${host}`;
  return origin.endsWith('/') ? origin.slice(0, -1) : origin;
};

export const getRedirectUri = (req?: any) => {
  let baseUrl = process.env.APP_URL;
  if (!baseUrl && req) {
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    let host = req.headers.host || 'localhost:3000';
    const hostClean = host.split(',')[0].trim();
    const hostRegex = /^[a-zA-Z0-9.-]+(:\d+)?$/;
    if (!hostRegex.test(hostClean)) {
      host = 'localhost:3000';
    } else {
      host = hostClean;
    }
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

export function isPrivateIP(ip: string): boolean {
  if (!net.isIP(ip)) return false;
  
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4) return true; // Treat invalid IPv4 as unsafe
    
    // Loopback 127.0.0.0/8
    if (parts[0] === 127) return true;
    // Private ranges: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
    if (parts[0] === 10) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    // Link local 169.254.0.0/16 (crucial for metadata.google.internal)
    if (parts[0] === 169 && parts[1] === 254) return true;
    // Broadcast 0.0.0.0/8
    if (parts[0] === 0) return true;
    
    return false;
  }
  
  if (net.isIPv6(ip)) {
    const norm = ip.toLowerCase();
    if (norm === '::1' || norm === '0:0:0:0:0:0:0:1' || norm === '::ffff:127.0.0.1') return true;
    if (norm.startsWith('fe80:')) return true;
    if (norm.startsWith('fc') || norm.startsWith('fd')) return true;
    if (norm === '::' || norm === '0:0:0:0:0:0:0:0') return true;
    return false;
  }
  
  return true;
}

export async function isSafeHost(hostOrConnStr: string): Promise<boolean> {
  if (!hostOrConnStr) return false;
  
  let host = hostOrConnStr;
  
  const connStr = hostOrConnStr.trim();
  if (connStr.includes('://')) {
    try {
      const parsed = new URL(connStr);
      host = parsed.hostname;
    } catch {
      const match = connStr.match(/@([^/:]+)/);
      if (match) {
        host = match[1];
      }
    }
  } else {
    // splits port
    const parts = connStr.split(':');
    if (parts.length > 0) {
      host = parts[0];
    }
  }
  
  host = host.trim().toLowerCase();
  
  // Quick pre-flight matches
  if (
    host === 'localhost' ||
    host === 'localhost.localdomain' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.lan') ||
    host.endsWith('.test') ||
    host.endsWith('.invalid')
  ) {
    return false;
  }
  
  if (net.isIP(host)) {
    return !isPrivateIP(host);
  }
  
  try {
    const lookup = await dns.promises.lookup(host);
    if (lookup && lookup.address) {
      return !isPrivateIP(lookup.address);
    }
  } catch {
    // DNS failed, unsafe or unreachable anyway
    return false;
  }
  
  return true;
}

/**
 * Normalizes Eastern Arabic numerals (٠, ١, ٢, ...) in a text to standard Western Arabic numerals (0, 1, 2, ...).
 */
export function normalizeArabicNumerals(text: string): string {
  return text
    .replace(/[٠0]/g, '0')
    .replace(/[١1]/g, '1')
    .replace(/[٢2]/g, '2')
    .replace(/[٣3]/g, '3')
    .replace(/[٤4]/g, '4')
    .replace(/[٥5]/g, '5')
    .replace(/[٦6]/g, '6')
    .replace(/[٧7]/g, '7')
    .replace(/[٨8]/g, '8')
    .replace(/[٩9]/g, '9');
}

