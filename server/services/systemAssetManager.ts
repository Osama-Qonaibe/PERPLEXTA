import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import crypto from 'crypto';
import { pool } from '../db/index.js';
import { getCachedSystemSettings } from '../db/queries.js';

export interface IconVariantSpec {
  id: string;
  filename: string;
  width: number;
  height: number;
  format: 'png' | 'ico' | 'webp';
  purpose?: 'any' | 'maskable';
  description: string;
  category: 'favicon' | 'apple' | 'pwa' | 'tile';
  paddingPercent?: number; // e.g. 0.15 for 15% safe-zone margin
  background?: string; // hex or transparent
}

export interface GeneratedAssetMeta {
  id: string;
  filename: string;
  url: string;
  width: number;
  height: number;
  format: string;
  sizeBytes: number;
  purpose?: 'any' | 'maskable';
  category: 'favicon' | 'apple' | 'pwa' | 'tile';
  description: string;
  dataUri?: string;
  generatedAt: string;
}

export interface AssetGenerationResult {
  success: boolean;
  sourceType: string;
  sourceHash: string;
  generatedCount: number;
  assets: GeneratedAssetMeta[];
  timestamp: number;
}

/**
 * Complete standard specifications for Favicon, Apple Touch, and PWA manifest icon sizes.
 */
export const SYSTEM_ASSET_SPECS: IconVariantSpec[] = [
  // Favicons
  {
    id: 'favicon-16',
    filename: 'favicon-16x16.png',
    width: 16,
    height: 16,
    format: 'png',
    category: 'favicon',
    description: 'Crisp 16x16 browser tab favicon'
  },
  {
    id: 'favicon-32',
    filename: 'favicon-32x32.png',
    width: 32,
    height: 32,
    format: 'png',
    category: 'favicon',
    description: 'Standard 32x32 desktop & bookmark favicon'
  },
  {
    id: 'favicon-48',
    filename: 'favicon-48x48.png',
    width: 48,
    height: 48,
    format: 'png',
    category: 'favicon',
    description: 'High-DPI 48x48 browser favicon'
  },
  {
    id: 'favicon-ico',
    filename: 'favicon.ico',
    width: 48,
    height: 48,
    format: 'ico',
    category: 'favicon',
    description: 'Multi-resolution Windows & legacy browser ICO container (16/32/48)'
  },

  // Apple Touch Icons (iOS Safari & iPadOS)
  {
    id: 'apple-touch-icon',
    filename: 'apple-touch-icon.png',
    width: 180,
    height: 180,
    format: 'png',
    category: 'apple',
    description: 'iOS Safari home screen icon (180x180 PNG)'
  },
  {
    id: 'apple-touch-icon-180',
    filename: 'apple-touch-icon-180x180.png',
    width: 180,
    height: 180,
    format: 'png',
    category: 'apple',
    description: 'iOS iPhone Retina touch icon'
  },
  {
    id: 'apple-touch-icon-167',
    filename: 'apple-touch-icon-167x167.png',
    width: 167,
    height: 167,
    format: 'png',
    category: 'apple',
    description: 'iPad Pro touch icon (167x167)'
  },
  {
    id: 'apple-touch-icon-152',
    filename: 'apple-touch-icon-152x152.png',
    width: 152,
    height: 152,
    format: 'png',
    category: 'apple',
    description: 'iPad & iPad mini touch icon (152x152)'
  },

  // PWA Manifest Any-Purpose Icons (Android / Chrome / Desktop PWA)
  {
    id: 'pwa-192',
    filename: 'pwa-192x192.png',
    width: 192,
    height: 192,
    format: 'png',
    purpose: 'any',
    category: 'pwa',
    description: 'Standard Android home screen & PWA launcher icon'
  },
  {
    id: 'pwa-512',
    filename: 'pwa-512x512.png',
    width: 512,
    height: 512,
    format: 'png',
    purpose: 'any',
    category: 'pwa',
    description: 'High-resolution PWA splash screen & installer icon'
  },
  {
    id: 'android-chrome-192',
    filename: 'android-chrome-192x192.png',
    width: 192,
    height: 192,
    format: 'png',
    purpose: 'any',
    category: 'pwa',
    description: 'Android Chrome launcher icon (192x192)'
  },
  {
    id: 'android-chrome-512',
    filename: 'android-chrome-512x512.png',
    width: 512,
    height: 512,
    format: 'png',
    purpose: 'any',
    category: 'pwa',
    description: 'Android Chrome high-resolution icon (512x512)'
  },

  // PWA Maskable Icons (Android Adaptive Icons with Safe-Zone Padding)
  {
    id: 'pwa-maskable-192',
    filename: 'pwa-maskable-192x192.png',
    width: 192,
    height: 192,
    format: 'png',
    purpose: 'maskable',
    category: 'pwa',
    paddingPercent: 0.15,
    description: 'Android adaptive maskable icon with 15% safe-zone margin (192x192)'
  },
  {
    id: 'pwa-maskable-512',
    filename: 'pwa-maskable-512x512.png',
    width: 512,
    height: 512,
    format: 'png',
    purpose: 'maskable',
    category: 'pwa',
    paddingPercent: 0.15,
    description: 'Android adaptive maskable icon with 15% safe-zone margin (512x512)'
  },

  // Windows Tile
  {
    id: 'mstile-150',
    filename: 'mstile-150x150.png',
    width: 150,
    height: 150,
    format: 'png',
    category: 'tile',
    description: 'Windows Modern UI live tile icon'
  }
];

// In-memory cache of generated asset buffers for zero-latency dynamic serving
const assetMemoryCache = new Map<string, {
  buffer: Buffer;
  mime: string;
  etag: string;
  width: number;
  height: number;
  updatedAt: number;
}>();

let lastGenerationTimestamp = 0;
let lastSourceHash = '';

/**
 * Builds a binary ICO container file packing multiple PNG buffers (16x16, 32x32, 48x48)
 * adhering to the Windows ICO file format specification.
 */
export function buildIcoFromPngBuffers(pngFrames: { width: number; height: number; buffer: Buffer }[]): Buffer {
  const numImages = pngFrames.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const totalHeaderAndDirSize = headerSize + (numImages * dirEntrySize);

  let currentOffset = totalHeaderAndDirSize;
  const dirEntries: Buffer[] = [];

  for (const frame of pngFrames) {
    const entry = Buffer.alloc(dirEntrySize);
    // Width (0 means 256)
    entry.writeUInt8(frame.width >= 256 ? 0 : frame.width, 0);
    // Height (0 means 256)
    entry.writeUInt8(frame.height >= 256 ? 0 : frame.height, 1);
    // Color count (0 for 32-bit PNG)
    entry.writeUInt8(0, 2);
    // Reserved
    entry.writeUInt8(0, 3);
    // Color planes (1)
    entry.writeUInt16LE(1, 4);
    // Bits per pixel (32)
    entry.writeUInt16LE(32, 6);
    // Size of image data in bytes
    entry.writeUInt32LE(frame.buffer.length, 8);
    // Offset of image data from beginning of file
    entry.writeUInt32LE(currentOffset, 12);

    dirEntries.push(entry);
    currentOffset += frame.buffer.length;
  }

  // Header
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // Reserved (0)
  header.writeUInt16LE(1, 2); // Type 1 = ICO
  header.writeUInt16LE(numImages, 4); // Count

  return Buffer.concat([header, ...dirEntries, ...pngFrames.map(f => f.buffer)]);
}

/**
 * Resolves source image input (base64 string, disk file path, URL, or raw Buffer) into a clean Buffer.
 */
export async function resolveSourceImageBuffer(sourceInput?: string | Buffer | null): Promise<{ buffer: Buffer; format: string; hash: string } | null> {
  const uploadsDir = path.join(process.cwd(), 'uploads');
  const publicDir = path.join(process.cwd(), 'public');

  let rawBuffer: Buffer | null = null;
  let detectedFormat = 'png';

  if (Buffer.isBuffer(sourceInput) && sourceInput.length > 0) {
    rawBuffer = sourceInput;
  } else if (typeof sourceInput === 'string' && sourceInput.trim()) {
    const trimmed = sourceInput.trim();
    if (trimmed.startsWith('data:image/')) {
      const match = trimmed.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (match) {
        detectedFormat = match[1].toLowerCase() === 'svg+xml' ? 'svg' : match[1].toLowerCase();
        rawBuffer = Buffer.from(match[2], 'base64');
      }
    } else {
      // Disk path or relative URL
      const cleanPath = trimmed.replace(/^\//, '');
      const candidates = [
        path.join(process.cwd(), cleanPath),
        path.join(uploadsDir, path.basename(cleanPath)),
        path.join(publicDir, path.basename(cleanPath)),
        path.join(uploadsDir, 'system_logo.webp'),
        path.join(uploadsDir, 'system_logo.png')
      ];

      for (const cand of candidates) {
        if (existsSync(cand)) {
          try {
            rawBuffer = await fs.readFile(cand);
            const ext = path.extname(cand).replace('.', '').toLowerCase();
            detectedFormat = ext === 'svg' ? 'svg' : (ext || 'png');
            break;
          } catch {
            // continue
          }
        }
      }
    }
  }

  // If no source supplied or found, query system settings from DB
  if (!rawBuffer) {
    try {
      const settings = await getCachedSystemSettings();
      const candidateVal = settings?.logo_url || settings?.logo_light_url || settings?.favicon_url;
      if (candidateVal && typeof candidateVal === 'string') {
        const res = await resolveSourceImageBuffer(candidateVal);
        if (res) return res;
      }
    } catch (e: any) {
      console.warn('[AssetManager] DB source logo resolution warning:', e.message);
    }
  }

  // Ultimate fallback: check existing logo files on disk or default SVG
  if (!rawBuffer) {
    const defaultPaths = [
      path.join(uploadsDir, 'system_logo.webp'),
      path.join(uploadsDir, 'system_logo.png'),
      path.join(publicDir, 'icon.svg'),
      path.join(publicDir, 'uploads', 'system_logo.webp')
    ];

    for (const dp of defaultPaths) {
      if (existsSync(dp)) {
        try {
          rawBuffer = await fs.readFile(dp);
          detectedFormat = path.extname(dp).replace('.', '').toLowerCase() || 'png';
          break;
        } catch {
          // continue
        }
      }
    }
  }

  // Create default fallback brand icon if completely missing
  if (!rawBuffer || rawBuffer.length === 0) {
    const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#181715"/>
          <stop offset="100%" stop-color="#0a0a09"/>
        </linearGradient>
        <linearGradient id="gemGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#10b981"/>
          <stop offset="100%" stop-color="#059669"/>
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill="url(#bgGrad)"/>
      <polygon points="256,96 400,192 400,320 256,416 112,320 112,192" fill="none" stroke="url(#gemGrad)" stroke-width="28" stroke-linejoin="round"/>
      <circle cx="256" cy="256" r="64" fill="url(#gemGrad)"/>
    </svg>`;
    rawBuffer = Buffer.from(fallbackSvg, 'utf8');
    detectedFormat = 'svg';
  }

  const hash = crypto.createHash('sha256').update(rawBuffer).digest('hex');
  return { buffer: rawBuffer, format: detectedFormat, hash };
}

/**
 * Generates all favicon, apple-touch-icon, and PWA manifest icon sizes from a single source logo.
 * Writes outputs to both `public/` and `uploads/`, updates in-memory cache, and syncs `manifest.json`.
 */
export async function generateAppIconsFromSource(
  sourceInput?: string | Buffer | null,
  options: { force?: boolean; registerInMediaAssets?: boolean } = {}
): Promise<AssetGenerationResult> {
  const resolved = await resolveSourceImageBuffer(sourceInput);
  if (!resolved) {
    throw new Error('Failed to resolve source logo image.');
  }

  const { buffer: sourceBuffer, format: sourceFormat, hash: sourceHash } = resolved;

  // Skip redundant generation if source hasn't changed and not forced
  if (!options.force && lastSourceHash === sourceHash && assetMemoryCache.size >= SYSTEM_ASSET_SPECS.length) {
    const cachedList: GeneratedAssetMeta[] = [];
    for (const spec of SYSTEM_ASSET_SPECS) {
      const cached = assetMemoryCache.get(spec.filename);
      if (cached) {
        cachedList.push({
          id: spec.id,
          filename: spec.filename,
          url: `/${spec.filename}`,
          width: cached.width,
          height: cached.height,
          format: spec.format,
          sizeBytes: cached.buffer.length,
          purpose: spec.purpose,
          category: spec.category,
          description: spec.description,
          generatedAt: new Date(cached.updatedAt).toISOString()
        });
      }
    }
    return {
      success: true,
      sourceType: sourceFormat,
      sourceHash,
      generatedCount: cachedList.length,
      assets: cachedList,
      timestamp: lastGenerationTimestamp
    };
  }

  const publicDir = path.join(process.cwd(), 'public');
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!existsSync(publicDir)) mkdirSync(publicDir, { recursive: true });
  if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });

  const isSvg = sourceFormat === 'svg' || sourceBuffer.toString('utf8', 0, 100).includes('<svg');
  
  // Sharp instance of source image (use high density for SVGs to ensure ultra-crisp rasterization)
  const createSharpInstance = () => {
    return isSvg
      ? sharp(sourceBuffer, { density: 300 })
      : sharp(sourceBuffer);
  };

  const results: GeneratedAssetMeta[] = [];
  const icoFrames: { width: number; height: number; buffer: Buffer }[] = [];

  // 1. Generate individual PNG sizes first
  for (const spec of SYSTEM_ASSET_SPECS) {
    if (spec.format === 'ico') continue; // Handled after generating 16, 32, 48 PNG frames

    let outputBuffer: Buffer;
    const { width, height, paddingPercent } = spec;

    if (paddingPercent && paddingPercent > 0) {
      // Maskable icon with safe-zone padding:
      // Inner logo occupies (1 - 2 * paddingPercent) of total canvas (e.g. 70% of 512 = ~358px)
      const innerSize = Math.round(width * (1 - 2 * paddingPercent));
      const innerBuffer = await createSharpInstance()
        .resize(innerSize, innerSize, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png({ compressionLevel: 9 })
        .toBuffer();

      // Create a solid dark/clean container canvas matching the brand background
      const baseCanvas = await sharp({
        create: {
          width,
          height,
          channels: 4,
          background: { r: 24, g: 23, b: 21, alpha: 1 } // #181715 perplexta dark surface
        }
      }).png().toBuffer();

      outputBuffer = await sharp(baseCanvas)
        .composite([{ input: innerBuffer, gravity: 'center' }])
        .png({ compressionLevel: 9 })
        .toBuffer();
    } else {
      // Standard transparent or crisp fitted icon
      outputBuffer = await createSharpInstance()
        .resize(width, height, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png({ compressionLevel: 9 })
        .toBuffer();
    }

    // Collect frames for multi-res ICO container
    if (width === 16 || width === 32 || width === 48) {
      icoFrames.push({ width, height, buffer: outputBuffer });
    }

    // Save to public/ and uploads/
    const publicTarget = path.join(publicDir, spec.filename);
    const uploadsTarget = path.join(uploadsDir, spec.filename);

    await Promise.all([
      fs.writeFile(publicTarget, outputBuffer),
      fs.writeFile(uploadsTarget, outputBuffer)
    ]);

    // Store in-memory cache
    const etag = `"${crypto.createHash('md5').update(outputBuffer).digest('hex')}"`;
    assetMemoryCache.set(spec.filename, {
      buffer: outputBuffer,
      mime: 'image/png',
      etag,
      width,
      height,
      updatedAt: Date.now()
    });

    // Also register aliases
    if (spec.id === 'apple-touch-icon') {
      assetMemoryCache.set('apple-touch-icon-precomposed.png', {
        buffer: outputBuffer,
        mime: 'image/png',
        etag,
        width,
        height,
        updatedAt: Date.now()
      });
      await fs.writeFile(path.join(publicDir, 'apple-touch-icon-precomposed.png'), outputBuffer).catch(() => {});
    }

    results.push({
      id: spec.id,
      filename: spec.filename,
      url: `/${spec.filename}`,
      width,
      height,
      format: 'png',
      sizeBytes: outputBuffer.length,
      purpose: spec.purpose,
      category: spec.category,
      description: spec.description,
      dataUri: `data:image/png;base64,${outputBuffer.toString('base64')}`,
      generatedAt: new Date().toISOString()
    });
  }

  // 2. Generate composite multi-resolution favicon.ico
  if (icoFrames.length > 0) {
    // Sort frames ascending: 16x16, 32x32, 48x48
    icoFrames.sort((a, b) => a.width - b.width);
    const icoBuffer = buildIcoFromPngBuffers(icoFrames);

    const publicIco = path.join(publicDir, 'favicon.ico');
    const uploadsIco = path.join(uploadsDir, 'favicon.ico');

    await Promise.all([
      fs.writeFile(publicIco, icoBuffer),
      fs.writeFile(uploadsIco, icoBuffer)
    ]);

    const icoEtag = `"${crypto.createHash('md5').update(icoBuffer).digest('hex')}"`;
    assetMemoryCache.set('favicon.ico', {
      buffer: icoBuffer,
      mime: 'image/x-icon',
      etag: icoEtag,
      width: 48,
      height: 48,
      updatedAt: Date.now()
    });

    results.unshift({
      id: 'favicon-ico',
      filename: 'favicon.ico',
      url: '/favicon.ico',
      width: 48,
      height: 48,
      format: 'ico',
      sizeBytes: icoBuffer.length,
      category: 'favicon',
      description: 'Multi-resolution Windows & browser ICO container (16/32/48)',
      dataUri: `data:image/x-icon;base64,${icoBuffer.toString('base64')}`,
      generatedAt: new Date().toISOString()
    });
  }

  // 3. Update public/manifest.json on disk to reflect compliant PWA icon sizes
  await syncManifestFileWithGeneratedIcons();

  // 4. Optionally register in media_assets database table
  if (options.registerInMediaAssets !== false && pool) {
    try {
      for (const asset of results) {
        const storedPath = `uploads/${asset.filename}`;
        await pool.query(`
          INSERT INTO media_assets (
            stored_path, original_filename, context, format, width, height, size_bytes, sha256_hash, is_public, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9)
          ON CONFLICT (stored_path) DO UPDATE SET
            format = EXCLUDED.format,
            width = EXCLUDED.width,
            height = EXCLUDED.height,
            size_bytes = EXCLUDED.size_bytes,
            sha256_hash = EXCLUDED.sha256_hash,
            updated_at = CURRENT_TIMESTAMP
        `, [
          storedPath,
          asset.filename,
          'pwa_asset',
          asset.format,
          asset.width,
          asset.height,
          asset.sizeBytes,
          crypto.createHash('sha256').update(asset.filename).digest('hex'),
          JSON.stringify({ purpose: asset.purpose, category: asset.category, description: asset.description })
        ]).catch(() => {});
      }
    } catch (dbErr: any) {
      console.warn('[AssetManager] media_assets sync warning:', dbErr.message);
    }
  }

  lastGenerationTimestamp = Date.now();
  lastSourceHash = sourceHash;

  console.log(`[AssetManager] Successfully generated ${results.length} systematic icons (favicons, apple-touch-icons, PWA manifest icons) from source logo.`);

  return {
    success: true,
    sourceType: sourceFormat,
    sourceHash,
    generatedCount: results.length,
    assets: results,
    timestamp: lastGenerationTimestamp
  };
}

/**
 * Synchronizes public/manifest.json on disk with the full, W3C-compliant PWA icon specifications.
 */
export async function syncManifestFileWithGeneratedIcons(): Promise<void> {
  try {
    const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
    let manifestData: any = {};

    if (existsSync(manifestPath)) {
      const raw = await fs.readFile(manifestPath, 'utf8');
      try {
        manifestData = JSON.parse(raw);
      } catch {
        manifestData = {};
      }
    }

    const settings = await getCachedSystemSettings();
    const siteNameEn = settings?.site_name_en || settings?.site_name || 'Perplexta';
    const siteNameAr = settings?.site_name_ar || 'بيربليكستا';
    const siteDesc = settings?.site_description_en || 'Professional Elite Technical Analysis & AI Orchestration Platform with Dual-Database Architecture.';

    manifestData.id = manifestData.id || '/';
    manifestData.start_url = manifestData.start_url || '/';
    manifestData.scope = manifestData.scope || '/';
    manifestData.display = 'standalone';
    manifestData.name = `${siteNameAr} - ${siteNameEn}`;
    manifestData.short_name = siteNameEn;
    manifestData.description = siteDesc;
    manifestData.background_color = '#faf9f5';
    manifestData.theme_color = '#181715';
    manifestData.orientation = 'any';
    manifestData.categories = ['productivity', 'utilities', 'artificial intelligence', 'finance', 'business'];

    // Standardized, high-fidelity PWA icon set with separate any and maskable declarations
    manifestData.icons = [
      {
        src: '/pwa-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/pwa-maskable-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/pwa-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/favicon-32x32.png',
        sizes: '32x32',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/favicon-16x16.png',
        sizes: '16x16',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any'
      }
    ];

    manifestData.shortcuts = [
      {
        name: 'New Chat',
        short_name: 'Chat',
        description: 'Start a fresh AI session',
        url: '/',
        icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }]
      },
      {
        name: 'Rewards Center',
        short_name: 'Rewards',
        description: 'Manage points & rewards',
        url: '/rewards',
        icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }]
      }
    ];

    await fs.writeFile(manifestPath, JSON.stringify(manifestData, null, 2), 'utf8');
  } catch (err: any) {
    console.warn('[AssetManager] syncManifestFile warning:', err.message);
  }
}

/**
 * Retrieves an in-memory or disk-persisted asset buffer for zero-latency HTTP streaming.
 */
export function getSystemAssetBuffer(filename: string): {
  buffer: Buffer;
  mime: string;
  etag: string;
} | null {
  const cleanName = path.basename(filename.split('?')[0]);
  
  // 1. In-memory cache hit
  const cached = assetMemoryCache.get(cleanName);
  if (cached) {
    return {
      buffer: cached.buffer,
      mime: cached.mime,
      etag: cached.etag
    };
  }

  // 2. Check public directory
  const publicPath = path.join(process.cwd(), 'public', cleanName);
  if (existsSync(publicPath)) {
    try {
      const buffer = readFileSync(publicPath);
      const ext = path.extname(cleanName).toLowerCase();
      const mime = ext === '.ico' ? 'image/x-icon' : (ext === '.svg' ? 'image/svg+xml' : (ext === '.webp' ? 'image/webp' : 'image/png'));
      const etag = `"${crypto.createHash('md5').update(buffer).digest('hex')}"`;
      
      assetMemoryCache.set(cleanName, {
        buffer,
        mime,
        etag,
        width: 0,
        height: 0,
        updatedAt: Date.now()
      });

      return { buffer, mime, etag };
    } catch {
      // continue
    }
  }

  // 3. Check uploads directory
  const uploadsPath = path.join(process.cwd(), 'uploads', cleanName);
  if (existsSync(uploadsPath)) {
    try {
      const buffer = readFileSync(uploadsPath);
      const ext = path.extname(cleanName).toLowerCase();
      const mime = ext === '.ico' ? 'image/x-icon' : (ext === '.svg' ? 'image/svg+xml' : (ext === '.webp' ? 'image/webp' : 'image/png'));
      const etag = `"${crypto.createHash('md5').update(buffer).digest('hex')}"`;
      
      assetMemoryCache.set(cleanName, {
        buffer,
        mime,
        etag,
        width: 0,
        height: 0,
        updatedAt: Date.now()
      });

      return { buffer, mime, etag };
    } catch {
      // continue
    }
  }

  return null;
}

/**
 * Returns current status of all system assets with live previews and verification indicators.
 */
export async function getSystemAssetsStatus(): Promise<{
  isReady: boolean;
  lastGeneratedAt: string | null;
  totalAssets: number;
  assets: GeneratedAssetMeta[];
}> {
  const publicDir = path.join(process.cwd(), 'public');
  const assets: GeneratedAssetMeta[] = [];

  for (const spec of SYSTEM_ASSET_SPECS) {
    const cached = assetMemoryCache.get(spec.filename);
    const diskPath = path.join(publicDir, spec.filename);
    const fileExists = Boolean(cached || existsSync(diskPath));

    let size = 0;
    let dataUri: string | undefined;

    if (cached) {
      size = cached.buffer.length;
      dataUri = `data:${cached.mime};base64,${cached.buffer.toString('base64')}`;
    } else if (existsSync(diskPath)) {
      try {
        const buf = await fs.readFile(diskPath);
        size = buf.length;
        const mime = spec.format === 'ico' ? 'image/x-icon' : 'image/png';
        dataUri = `data:${mime};base64,${buf.toString('base64')}`;
      } catch {
        // continue
      }
    }

    assets.push({
      id: spec.id,
      filename: spec.filename,
      url: `/${spec.filename}`,
      width: spec.width,
      height: spec.height,
      format: spec.format,
      sizeBytes: size,
      purpose: spec.purpose,
      category: spec.category,
      description: spec.description,
      dataUri,
      generatedAt: lastGenerationTimestamp ? new Date(lastGenerationTimestamp).toISOString() : new Date().toISOString()
    });
  }

  const allExist = assets.every(a => a.sizeBytes > 0);

  return {
    isReady: allExist,
    lastGeneratedAt: lastGenerationTimestamp ? new Date(lastGenerationTimestamp).toISOString() : null,
    totalAssets: assets.length,
    assets
  };
}

/**
 * System startup bootstrapper: ensures all icons exist on disk or auto-generates them immediately.
 */
export async function initializeSystemAssetSuite(): Promise<void> {
  try {
    const publicDir = path.join(process.cwd(), 'public');
    const essentialFiles = ['favicon.ico', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png', 'pwa-maskable-512x512.png'];
    const missingAny = essentialFiles.some(f => !existsSync(path.join(publicDir, f)));

    if (missingAny || assetMemoryCache.size === 0) {
      console.log('[AssetManager] Generating systematic platform and PWA asset suite...');
      await generateAppIconsFromSource(null, { force: false });
    }
  } catch (err: any) {
    console.warn('[AssetManager] Startup icon initialization non-blocking warning:', err.message);
  }
}
