import "./src/env.ts";
import { fileURLToPath } from 'url';
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import express from "express";
import { createServer as createViteServer } from "vite";
import cron from 'node-cron';
import Stripe from "stripe";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from 'crypto';
import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs/promises';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import cors from 'cors';
import multer from 'multer';
import { Server } from "socket.io";
import { createServer } from "http";
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const _pdf = require('pdf-parse');
const mammoth = require('mammoth');
const XLSX = require('xlsx');
const { convert: convertHtmlToText } = require('html-to-text');

const uploadDir = path.join(__dirname, 'uploads');
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024
  }
});

// Multer error handling middleware
const handleMulterError = (err: any, req: any, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: 'حجم الملف كبير جداً. الحد الأقصى المسموح به هو 100 ميجابايت لضمان أداء مستقر.',
        errorEn: 'File is too large. The maximum allowed size is 100MB to ensure stable performance.'
      });
    }
    return res.status(400).json({ error: err.message });
  }
  next(err);
};

console.log(`[System] Initializing in ${process.env.NODE_ENV || 'development'} mode.`);

let io: Server;
const userSockets = new Map<number, string[]>();
import { pool, ledgerPool, initializeSovereignPools } from "./src/db/index.ts";
import { encrypt, decrypt } from "./src/utils/crypto.ts";
import { systemTemplates } from './src/lib/templates.ts';

import { CORE_PROTOCOL, CODE_GEN_PROTOCOL, IMAGE_GEN_PROTOCOL, ANALYSIS_PROTOCOL, ADS_ASSISTANT_PROTOCOL, AUDIO_STUDIO_PROTOCOL, SOUND_STUDIO_PROTOCOL } from "./src/lib/protocol.ts";

const pdf = async (dataBuffer: Buffer) => {
  try {
    const PDFParse = _pdf.PDFParse || _pdf.default?.PDFParse;
    if (PDFParse) {
      const parser = new PDFParse({ data: dataBuffer });
      try {
        const result = await parser.getText();
        return result;
      } finally {
        if (parser.destroy) await parser.destroy();
      }
    }
    // Fallback for v1 or legacy wrappers
    const legacyPdf = typeof _pdf === 'function' ? _pdf : _pdf.default;
    if (typeof legacyPdf === 'function') {
      try {
        return await legacyPdf(dataBuffer);
      } catch (err: any) {
        if (err.message?.includes("Class constructors cannot be invoked without 'new'")) {
          const parser = new legacyPdf({ data: dataBuffer });
          const result = await parser.getText();
          if (parser.destroy) await parser.destroy();
          return result;
        }
        throw err;
      }
    }
    throw new Error('PDF parsing library could not be resolved.');
  } catch (error) {
    console.error('[PDF Bridge] Resolution Error:', error);
    throw error;
  }
};

const extractFollowUps = (text: string): { cleanText: string, followUps: string[] } => {
  const followUpRegex = /\[FOLLOW_UPS\]\n?([\s\S]*)$|\[أسئلة_متابعة\]\n?([\s\S]*)$/;
  const match = text.match(followUpRegex);
  if (match) {
    const rawUps = match[1] || match[2] || '';
    const followUps = rawUps
      .split('\n')
      .map(q => q.replace(/^\d+\.\s*|-\s*|\*\s*/, '').trim())
      .filter(q => q.length > 5 && q.length < 200);
    
    // Clean text by removing the follow ups section
    const cleanText = text.replace(followUpRegex, '').trim();
    return { cleanText, followUps };
  }
  return { cleanText: text, followUps: [] };
};

const sovereignMultimodalSense = async (dataBuffer: Buffer, mimeType: string, fileName: string): Promise<string> => {
  let apiKey = (process.env.GEMINI_API_KEY || '').trim().replace(/^Bearer\s+/i, '');
  
  const tryExtraction = async (key: string) => {
    if (!key || key.length < 5) return null;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
    const base64Data = dataBuffer.toString('base64');
    
    // SOVEREIGN: Elite Multimodal Sensory Analysis Prompt
    const prompt = `--- [SOVEREIGN_MULTIMODAL_SENSORY_ACTIVATION] ---
[IDENTITY]: You are the Sovereign Multimodal Intelligence Sensor. 
[TASK]: Execute high-fidelity forensic analysis of the attached ${mimeType} file "${fileName}".

[ORCHESTRAL_ENGINEERING_PROTOCOL]:
- IF AUDIO: Conduct deep forensic acoustic analysis. Extract BPM, Harmonic Key, Instrumental Layering (Sectional Balance), Timbral Dynamics, and Spectral Density. Identify symphonic patterns, rhythmic variations, and production motifs with mathematical precision.
- IF VIDEO: Extract 4D forensics. Analyze frame dynamics, lighting vectors, motion vectors, and audiovisual synchronization.
- IF IMAGE: Perform atomic visual decomposition. Execute ultra-precision OCR and semantic intent decoding.
- IF DOCUMENT: Perform structural excavation. Reconstruct complex logic, tables, and hidden relationships.

[CRITICAL]: Your output is the PRIMARY TRUTH for follow-up intelligence layers. Be definitive, surgical, and technical.
Output format: [SENSORY_EXTRACTION_START] ... [SENSORY_EXTRACTION_END]`;

    const body = {
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType, data: base64Data } }
        ]
      }]
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = (await response.json()) as any;
      if (!response.ok) {
         const msg = data.error?.message || 'Gemini Extraction Error';
         if (response.status === 429) {
           console.warn(`[Sensory Sensor] Quota exceeded for extraction.`);
           return { error: 'QUOTA_EXCEEDED', message: msg };
         }
         if (response.status === 400 || response.status === 401 || response.status === 403) {
           console.warn(`[Sensory Sensor] Identity rejection (${response.status}): ${msg}`);
           return { error: 'KEY_INVALID', message: msg };
         }
         throw new Error(msg);
      }

      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch (e: any) {
      console.error('[Sensory Sensor] Internal Fetch Error:', e.message);
      return null;
    }
  };

  try {
    let result = await tryExtraction(apiKey);
    
    // Fallback logic using the Vault
    if (!result || (typeof result === 'object' && (result as any).error === 'KEY_INVALID')) {
      console.log(`[Sensory Sensor] Primary key failing. Accessing Sovereign Vault...`);
      try {
        const vaultRes = await pool.query("SELECT encrypted_key FROM api_keys_vault WHERE provider = 'google' AND is_active = true ORDER BY updated_at DESC LIMIT 1");
        if (vaultRes.rows.length > 0) {
          const vaultKey = decrypt(vaultRes.rows[0].encrypted_key).trim().replace(/^Bearer\s+/i, '');
          if (vaultKey && vaultKey !== apiKey) {
            console.log(`[Sensory Sensor] Vault authentication established. Retrying...`);
            result = await tryExtraction(vaultKey);
          }
        }
      } catch (dbErr) {
        console.error('[Sensory Sensor] Vault access protocol interrupted:', dbErr);
      }
    }

    if (result && typeof result === 'string') return result;
    if (result && typeof result === 'object' && (result as any).message) {
       throw new Error((result as any).message);
    }
    
    throw new Error('No valid response from multimodal sensory engine');
  } catch (err: any) {
    console.error(`[Sensory Sensor] Forensic Error for ${fileName}:`, err);
    return `[SYSTEM_WARNING]: Sensory extraction failed for "${fileName}". Fallback to native intelligence required. Error: ${err.message}`;
  }
};

const extractTextFromFile = async (dataBuffer: Buffer, mimeType: string, fileName: string): Promise<string> => {
  try {
    let resultText = '';
    
    // Sovereign: Handle multimodal files via the Sensory Layer FIRST if they are media
    if (mimeType.startsWith('image/') || mimeType.startsWith('video/') || mimeType.startsWith('audio/')) {
       console.log(`[Extraction Engine] 🎙️ Media detected: ${fileName}. Activating Sovereign Multimodal Sense.`);
       return await sovereignMultimodalSense(dataBuffer, mimeType, fileName);
    }

    if (mimeType === 'application/pdf') {
      const data = await pdf(dataBuffer);
      resultText = (data && data.text) ? data.text.trim() : '';
      
      // If PDF extraction is suspiciously small compared to file size, it might be image-based
      if (resultText.length < 50 && dataBuffer.length > 50000) {
        const visualData = await sovereignMultimodalSense(dataBuffer, mimeType, fileName);
        resultText = `[SYSTEM_WARNING]: This PDF file "${fileName}" appears to contain mainly images or non-selectable text. 
[DIRECT_EXTRACTION]:\n${visualData}\n\n[TEXT_YIELD]: ${resultText}`;
      }
    } 
    else if (mimeType.includes('wordprocessingml') || mimeType.includes('msword')) {
      const res = await mammoth.extractRawText({ buffer: dataBuffer });
      resultText = res.value || '';
    }
    else if (mimeType.includes('spreadsheetml') || mimeType.includes('excel') || mimeType.includes('csv')) {
      const workbook = XLSX.read(dataBuffer, { type: 'buffer' });
      let fullText = '';
      workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        fullText += `\n[Sheet: ${sheetName}]\n` + XLSX.utils.sheet_to_txt(sheet);
      });
      resultText = fullText.trim();
    }
    else if (mimeType.includes('html') || mimeType.includes('htm')) {
      const htmlContent = dataBuffer.toString('utf-8');
      resultText = convertHtmlToText(htmlContent, {
        wordwrap: 130,
        selectors: [
          { selector: 'a', options: { ignoreHref: true } },
          { selector: 'img', format: 'skip' }
        ]
      });
    }
    else if (mimeType.startsWith('text/') || mimeType.includes('javascript') || mimeType.includes('typescript') || mimeType.includes('json') || mimeType.includes('xml') || mimeType.includes('yaml') || mimeType.includes('markdown') || mimeType.includes('rtf')) {
      resultText = dataBuffer.toString('utf-8').trim();
    }
    else {
      // Legacy Override: High-Fidelity Sensory fallback for unknown or generic formats
      // This bypasses legacy MIME type rejections by attempting multimodal sense on EVERYTHING unknown
      console.log(`[Extraction Engine] 🔍 Unknown format "${mimeType}" for "${fileName}". Falling back to Multimodal Sense.`);
      resultText = await sovereignMultimodalSense(dataBuffer, mimeType, fileName);
    }

    return resultText;
  } catch (error) {
    console.error(`[Extraction Engine] Failed to extract from ${fileName} (${mimeType}):`, error);
    return `[SYSTEM_ERROR]: Failed to extract text from "${fileName}". Error: ${error instanceof Error ? error.message : String(error)}`;
  }
};


const sovereignTTS = async (text: string, voiceId?: string): Promise<Buffer | null> => {
  if (!text || text.trim().length < 5) return null;
  
  // 1. Try ElevenLabs (Premier Vocal Synthesis)
  try {
     const elevenKeyRes = await pool.query("SELECT encrypted_key FROM api_keys_vault WHERE provider = 'elevenlabs' AND is_active = true LIMIT 1");
     if (elevenKeyRes.rows.length > 0) {
        const key = decrypt(elevenKeyRes.rows[0].encrypted_key).trim().replace(/^Bearer\s+/i, '');
        const vId = voiceId || 'pNInz6obpguePs3dfguv'; // Global Sovereign Voice (Professional, Authoritative)
        
        console.log(`[TTS] 🎙️ Orchestrating ElevenLabs Synthesis for: ${text.substring(0, 30)}...`);
        const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${vId}`, {
          method: 'POST',
          headers: { 
            'xi-api-key': key, 
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg'
          },
          body: JSON.stringify({ 
            text: text.substring(0, 5000), // ElevenLabs limit safety
            model_id: 'eleven_multilingual_v2',
            voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.05, use_speaker_boost: true } 
          })
        });
        
        if (res.ok) {
          const buffer = await res.arrayBuffer();
          console.log(`[TTS] 🎻 ElevenLabs Synthesis Successful (${buffer.byteLength} bytes)`);
          return Buffer.from(buffer);
        } else {
          const errData = await res.json().catch(() => ({}));
          console.warn(`[TTS] ElevenLabs API Rejected: ${JSON.stringify(errData)}`);
        }
     }
  } catch (err) {
     console.error('[TTS] ElevenLabs Orchestration Failure:', err);
  }

  // 2. Try Google Cloud TTS (High-Fidelity Fallback)
  try {
    const googleKeyRes = await pool.query("SELECT encrypted_key FROM api_keys_vault WHERE provider = 'google' AND is_active = true LIMIT 1");
    if (googleKeyRes.rows.length > 0) {
       const key = decrypt(googleKeyRes.rows[0].encrypted_key).trim().replace(/^Bearer\s+/i, '');
       const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`;
       
       console.log(`[TTS] 📡 Falling back to Google Cloud Synthesis...`);
       const res = await fetch(url, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           input: { text: text.substring(0, 5000) },
           voice: { languageCode: 'en-US', name: 'en-US-Studio-O' }, // Studio-grade voices
           audioConfig: { audioEncoding: 'MP3', pitch: 0, speakingRate: 1.0 }
         })
       });
       
       if (res.ok) {
         const data = await res.json();
         if (data.audioContent) {
           console.log(`[TTS] 🎻 Google Synthesis Successful`);
           return Buffer.from(data.audioContent, 'base64');
         }
       } else {
          const errData = await res.json().catch(() => ({}));
          console.warn(`[TTS] Google API Rejected: ${JSON.stringify(errData)}`);
       }
    }
  } catch (err) {
    console.error('[TTS] Google Orchestration Failure:', err);
  }

  return null;
};


async function handleApiError(response: any, providerName: string, usedKey?: string) {
  if (!response.ok) {
    let errorMsg = response.statusText;
    try {
      const tempRes = response.clone();
      const errData = await tempRes.json();
      errorMsg = 
        (typeof errData.error === 'object' ? errData.error?.message : null) || 
        (typeof errData.error === 'string' ? errData.error : null) ||
        errData.message || 
        JSON.stringify(errData) || 
        errorMsg;
    } catch (e) {
      try {
        const textError = await response.text();
        if (textError && textError.length < 500) errorMsg = textError;
      } catch (e2) {}
    }
    
    if (usedKey && usedKey.length > 5 && errorMsg.includes(usedKey)) {
      errorMsg = errorMsg.split(usedKey).join('***[REDACTED_API_KEY]***');
    }

    if (response.status === 402) {
      errorMsg += ` (نصيحة تقنية: هذا الخطأ يشير إلى نقص الرصيد في حسابك لدى المزود. يرجى شحن الرصيد لتفعيل الخدمة)`;
    }
    if (response.status === 401 || response.status === 403) {
      errorMsg += ` (نصيحة تقنية: هذا الخطأ يظهر غالباً عند نقص الرصيد أو انتهاء صلاحية المفتاح. يرجى مراجعة لوحة تحكم ${providerName})`;
    }
    
    throw new Error(`خطأ من ${providerName}: ${errorMsg}`);
  }
}

async function syncProviderModelsInternal(providerId: string, apiKey: string) {
  let models: any[] = [];
  let count = 0;
  const provider = providerId.toLowerCase();

  try {
    if (provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' }
      });
      await handleApiError(response, 'OpenAI', apiKey);
      const data = await response.json();
      models = (data.data || []).map((m: any) => ({ ...m, name: m.id }));
      count = models.length;
    } else if (provider === 'anthropic') {
      const response = await fetch('https://api.anthropic.com/v1/models', {
        headers: { 
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Accept': 'application/json'
        }
      });
      await handleApiError(response, 'Anthropic', apiKey);
      const data = await response.json();
      models = (data.data || []).map((m: any) => ({ ...m, name: m.id }));
      count = models.length;
    } else if (provider === 'google') {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
        headers: { 'Accept': 'application/json' }
      });
      await handleApiError(response, 'Google AI', apiKey);
      const data = await response.json();
      
      models = (data.models || [])
        .map((m: any) => ({
          ...m,
          id: m.name,
          name: m.displayName || m.name.replace('models/', ''),
          supportedMethods: m.supportedGenerationMethods || []
        }));
      count = models.length;
    } else if (provider === 'deepseek') {
      const response = await fetch('https://api.deepseek.com/models', {
        headers: { 
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      });
      await handleApiError(response, 'DeepSeek', apiKey);
      const data = await response.json();
      models = (data.data || []).map((m: any) => ({ ...m, name: m.id }));
      count = models.length;
    } else if (provider === 'groq') {
      const response = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { 
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      });
      await handleApiError(response, 'Groq', apiKey);
      const data = await response.json();
      models = (data.data || []).map((m: any) => ({ ...m, name: m.id }));
      count = models.length;
    } else if (provider === 'openrouter') {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { 
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      });
      await handleApiError(response, 'OpenRouter', apiKey);
      const data = await response.json();
      models = (data.data || []).map((m: any) => ({ ...m, name: m.name || m.id }));
      count = models.length;
    } else if (provider === 'mistral') {
      const response = await fetch('https://api.mistral.ai/v1/models', {
        headers: { 
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      });
      await handleApiError(response, 'Mistral AI', apiKey);
      const data = await response.json();
      models = (data.data || []).map((m: any) => ({ ...m, name: m.id }));
      count = models.length;
    } else if (provider === 'together') {
      const response = await fetch('https://api.together.ai/v1/models', {
        headers: { 
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      });
      await handleApiError(response, 'Together AI', apiKey);
      const data = await response.json();
      models = data.data || (Array.isArray(data) ? data : []);
      models = models.map((m: any) => ({ ...m, id: m.id || m.name, name: m.display_name || m.name || m.id }));
      count = models.length;
    } else if (provider === 'xai') {
      const response = await fetch('https://api.x.ai/v1/models', {
        headers: { 
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      await handleApiError(response, 'xAI', apiKey);
      const data = await response.json();
      models = data.models || data.data || [];
      models = models.map((m: any) => ({ ...m, name: m.id }));
      count = models.length;
    } else if (provider === 'serper') {
      models = [{ id: 'serper-search', name: 'Serper Search' }];
      count = 1;
    } else if (provider === 'elevenlabs') {
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: { 'xi-api-key': apiKey, 'Accept': 'application/json' }
      });
      await handleApiError(response, 'ElevenLabs', apiKey);
      const data = await response.json();
      models = (data.voices || []).map((v: any) => ({ id: v.voice_id, name: v.name }));
      count = models.length;
    } else if (provider === 'ollama') {
      let rawUrl = '';
      let actualKey = '';

      if (apiKey && apiKey.includes(':')) {
        const lastColonIndex = apiKey.lastIndexOf(':');
        const afterColon = apiKey.substring(lastColonIndex + 1);
        const urlPart = apiKey.substring(0, lastColonIndex);
        
        const isOnlyDigits = /^\d+$/.test(afterColon);
        if (apiKey.startsWith('http')) {
          if (!isOnlyDigits && lastColonIndex > 10) {
             rawUrl = urlPart;
             actualKey = afterColon;
          } else if (apiKey.split(':').length > 3) {
             const parts = apiKey.split(':');
             actualKey = parts.pop() || '';
             rawUrl = parts.join(':');
          } else {
             rawUrl = apiKey;
             actualKey = '';
          }
        } else {
          rawUrl = urlPart;
          actualKey = afterColon;
        }
      } else {
        rawUrl = apiKey || '';
      }

      let baseUrl = (rawUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/+$/, '');
      const suffixesToStrip = ['/api/tags', '/api/chat', '/api', '/v1', '/api/generate'];
      for (const suffix of suffixesToStrip) {
        if (baseUrl.toLowerCase().endsWith(suffix)) {
          baseUrl = baseUrl.substring(0, baseUrl.length - suffix.length);
        }
      }
      baseUrl = baseUrl.replace(/\/+$/, '');

      console.log(`[SyncInternal] Initiating Sovereign Sync for Ollama at: ${baseUrl}`);

      const response = await fetch(`${baseUrl}/api/tags`, {
        headers: { 
          'Authorization': actualKey ? `Bearer ${actualKey}` : '', 
          'Accept': 'application/json' 
        }
      });
      await handleApiError(response, 'Ollama Cloud', actualKey);
      const data = await response.json();
      models = (data.models || []).map((m: any) => ({ id: m.name, name: m.name }));
      count = models.length;
    }

    if (count > 0) {
      try {
        await pool.query(
          'UPDATE api_keys_vault SET models = $1, model_list = $1, updated_at = CURRENT_TIMESTAMP WHERE provider = $2',
          [JSON.stringify(models), providerId]
        );
      } catch (dbErr: any) {
        console.error(`[SyncInternal] Database update failed for ${providerId}:`, dbErr.message);
        await pool.query(
          'UPDATE api_keys_vault SET models = $1, updated_at = CURRENT_TIMESTAMP WHERE provider = $2',
          [JSON.stringify(models), providerId]
        ).catch(() => {});
      }
    }
    return { models, count };
  } catch (err) {
    console.error(`[SyncInternal] Error syncing ${providerId}:`, err);
    throw err;
  }
}
async function syncSystemTemplates(customPool?: any) {
  const p = customPool || pool;
  try {
    await p.query(`DELETE FROM email_templates WHERE type = 'system'`);
    for (const tpl of systemTemplates) {
      await p.query(
        `INSERT INTO email_templates (name, subject_en, subject_ar, body_en, body_ar, type) VALUES ($1, $2, $3, $4, $5, 'system')`,
        [tpl.name, tpl.subject_en, tpl.subject_ar, tpl.body_en, tpl.body_ar]
      );
    }
  } catch (error) {
    console.error('System templates sync failed:', error);
  }
}

// Initialize Stripe (Lazy initialization pattern)
let stripeClient: Stripe | null = null;
let stripeWebhookSecret: string | null = null;

async function sanitizeEmails() {
  console.log(`[${new Date().toISOString()}] [Security] Initiating Sovereign Email Sanitization...`);
  try {
    const result = await pool.query(`
      UPDATE users 
      SET email = LOWER(email) 
      WHERE email != LOWER(email)
      RETURNING id, email
    `);
    if (result.rowCount && result.rowCount > 0) {
      console.log(`[Security] Cleanup Complete: ${result.rowCount} user accounts synchronized to lowercase.`);
      result.rows.forEach(row => {
        console.log(`[Security] -> Account ${row.id} synchronized to: ${row.email}`);
      });
    }

    const resetResult = await pool.query(`
      UPDATE password_resets 
      SET email = LOWER(email) 
      WHERE email != LOWER(email)
    `);
    if (resetResult.rowCount && resetResult.rowCount > 0) {
      console.log(`[Security] Cleanup Complete: ${resetResult.rowCount} password reset records synchronized.`);
    }
  } catch (error) {
    console.error('[Security] Critical Failure during email sanitization:', error);
  }
}

const getStripe = async () => {
  if (stripeClient) return stripeClient;
  try {
    const settings = await pool.query('SELECT stripe_secret_key, stripe_webhook_secret FROM system_settings LIMIT 1');
    if (settings.rows.length > 0 && settings.rows[0].stripe_secret_key) {
      stripeClient = new Stripe(decrypt(settings.rows[0].stripe_secret_key));
      stripeWebhookSecret = settings.rows[0].stripe_webhook_secret ? decrypt(settings.rows[0].stripe_webhook_secret) : null;
      return stripeClient;
    }
  } catch (e) {}

  const stripeKeyRes = await pool.query("SELECT encrypted_key FROM api_keys_vault WHERE provider = 'stripe'");
  const stripeWebhookRes = await pool.query("SELECT encrypted_key FROM api_keys_vault WHERE provider = 'stripe_webhook'");

  if (stripeKeyRes.rows.length > 0) {
    stripeClient = new Stripe(decrypt(stripeKeyRes.rows[0].encrypted_key));
    stripeWebhookSecret = stripeWebhookRes.rows.length > 0 ? decrypt(stripeWebhookRes.rows[0].encrypted_key) : null;
  }
  return stripeClient;
};

let cachedAppNameEn = '';
let cachedAppNameAr = '';

async function refreshCachedAppName() {
  try {
    const res = await pool.query('SELECT site_name_en, site_name_ar FROM system_settings LIMIT 1');
    if (res.rows.length > 0) {
      cachedAppNameEn = res.rows[0].site_name_en || '';
      cachedAppNameAr = res.rows[0].site_name_ar || '';
    }
  } catch (e) {
    console.error('[System] Failed to refresh cached app name:', e);
  }
}

const getAppName = (lang: 'en' | 'ar' = 'en') => lang === 'ar' ? cachedAppNameAr : cachedAppNameEn;

const sendEmail = async (to: string, subject: string, html: string, attachments: any[] = []) => {
  try {
    const settingsResult = await pool.query('SELECT * FROM email_settings ORDER BY id DESC LIMIT 1');
    if (settingsResult.rows.length === 0 || !settingsResult.rows[0].smtp_host) {
      console.log('SMTP not configured. Email content:', { to, subject });
      return;
    }

    const s = settingsResult.rows[0];
    const transporter = nodemailer.createTransport({
      host: s.smtp_host,
      port: parseInt(s.smtp_port),
      secure: parseInt(s.smtp_port) === 465,
      auth: {
        user: s.smtp_username,
        pass: s.smtp_password ? decrypt(s.smtp_password) : '',
      },
    });

    await transporter.sendMail({
      from: `"${s.sender_name || getAppName('en')}" <${s.sender_email || s.smtp_username}>`,
      to,
      subject,
      html,
      attachments,
    });
    console.log(`Email sent to ${to}: ${subject}`);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

const getBaseUrl = (req: express.Request) => {
  const protocol = req.get('x-forwarded-proto') || req.protocol;
  const host = req.get('x-forwarded-host') || req.get('host');
  const envUrl = process.env.VITE_APP_URL || process.env.APP_URL;
  let origin = `${protocol}://${host}`;
  if (envUrl && envUrl.startsWith('http')) {
    origin = envUrl;
  }
  return origin.endsWith('/') ? origin.slice(0, -1) : origin;
};

const sendSmartEmail = async (userId: number | null, toEmail: string, templateName: string, variables: Record<string, string>, language: 'en' | 'ar' = 'en') => {
  try {
    const templateResult = await pool.query('SELECT * FROM email_templates WHERE name = $1', [templateName]);
    if (templateResult.rows.length === 0) return false;
    const template = templateResult.rows[0];

    const settingsResult = await pool.query('SELECT * FROM email_settings ORDER BY id DESC LIMIT 1');
    if (settingsResult.rows.length === 0 || !settingsResult.rows[0].smtp_host) return false;
    const s = settingsResult.rows[0];

    // Get current app URL for footer links
    const baseUrl = variables.baseUrl || process.env.VITE_APP_URL || process.env.APP_URL || '';

    let subject = language === 'ar' ? template.subject_ar : template.subject_en;
    let body = language === 'ar' ? template.body_ar : template.body_en;

    // Inject userName fallback if missing
    if (!variables.userName) {
      variables.userName = language === 'ar' ? 'مستخدم' : 'User';
    }

    // Inject baseUrl into variables if it's not there
    if (!variables.baseUrl) {
      variables.baseUrl = baseUrl;
    }

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      subject = subject.replace(regex, value || '');
      body = body.replace(regex, value || '');
    }

    const transporter = nodemailer.createTransport({
      host: s.smtp_host,
      port: parseInt(s.smtp_port),
      secure: parseInt(s.smtp_port) === 465,
      auth: { user: s.smtp_username, pass: s.smtp_password ? decrypt(s.smtp_password) : '' },
    });

    await transporter.sendMail({
      from: `"${s.sender_name || getAppName('en')}" <${s.sender_email || s.smtp_username}>`,
      to: toEmail,
      subject,
      html: body,
    });
    return true;
  } catch (error) {
    console.error('SmartEmail failed:', error);
    return false;
  }
};

const sendRawEmail = async (toEmail: string, subject: string, htmlContent: string) => {
  try {
    const settingsResult = await pool.query('SELECT * FROM email_settings ORDER BY id DESC LIMIT 1');
    if (settingsResult.rows.length === 0 || !settingsResult.rows[0].smtp_host) {
      return false;
    }
    const s = settingsResult.rows[0];

    const transporter = nodemailer.createTransport({
      host: s.smtp_host,
      port: parseInt(s.smtp_port),
      secure: parseInt(s.smtp_port) === 465,
      auth: {
        user: s.smtp_username,
        pass: s.smtp_password ? decrypt(s.smtp_password) : '',
      },
    });

    await transporter.sendMail({
      from: `"${s.sender_name || getAppName('en')}" <${s.sender_email || s.smtp_username}>`,
      to: toEmail,
      subject,
      html: htmlContent,
    });
    return true;
  } catch (e) {
    console.error('Raw Email Error:', e);
    return false;
  }
};

const logSecurityAlert = async (userId: number | null, type: string, severity: string, description: string, metadata: any = {}, req?: express.Request) => {
  try {
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : null;
    await pool.query(
      `INSERT INTO security_alerts (user_id, alert_type, severity, description, metadata, ip_address) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, type, severity, description, JSON.stringify(metadata), ip]
    );
    console.log(`Security Alert [${severity.toUpperCase()}]: ${type} - ${description}`);
  } catch (error) {
    console.error('Failed to log security alert:', error);
  }
};

const logSystemActivity = async (userId: number | null, action: string, description: string, metadata: any = {}, req?: express.Request) => {
  try {
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : null;
    const result = await pool.query(
      `INSERT INTO system_logs (user_id, action, description, metadata, ip_address) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, action, description, JSON.stringify(metadata), ip]
    );
    const newLog = result.rows[0];
    console.log(`System Activity: ${action} - ${description}`);
    
    // Broadcast to admins
    io.emit('new_system_activity', { ...newLog, type: 'system_event' });
  } catch (error) {
    console.error('Failed to log system activity:', error);
  }
};

const performSovereignSearch = async (query: string, userId: number, socket: any, lang: 'en' | 'ar', limit: number = 6) => {
  const steps = [
    { step: lang === 'ar' ? "خطوات التفكير والبحث" : "Thinking and Research Steps", status: 'completed' as const },
    { step: lang === 'ar' ? "بدء محرك البحث السيادي..." : "Starting Sovereign Search Engine...", status: 'processing' as const }
  ];
  
  steps.forEach(s => socket?.emit('search_steps', s));

  let searchResults = "Real-time data retrieved from internal indices.";
  let citations: { title: string, url: string, index: number }[] = [];

  try {
    // SOVEREIGN ORCHESTRATION: Check for Search Routing settings
    const routeRes = await pool.query("SELECT * FROM tool_orchestrator WHERE tool_id = 'sovereign_search' AND is_active = true LIMIT 1");
    const route = routeRes.rows[0];
    
    const providersToTry = route ? [
      route.primary_provider,
      route.fallback1_provider,
      route.fallback2_provider,
      route.fallback3_provider
    ].filter(p => p && p.trim().length > 0) : [];

    let activeSearch = null;
    let apiKey = '';

    if (providersToTry.length > 0) {
      for (const p of providersToTry) {
        const keyRes = await pool.query("SELECT encrypted_key FROM api_keys_vault WHERE provider = $1 AND is_active = true LIMIT 1", [p]);
        if (keyRes.rows.length > 0) {
          activeSearch = { provider: p };
          apiKey = decrypt(keyRes.rows[0].encrypted_key);
          break;
        }
      }
    }

    // Default Fallback: If no route found or no keys in route, pick any active search from vault
    if (!activeSearch) {
      // Sovereign: Instead of hardcoding providers, we query for any active search key in the vault
      const searchKeys = await pool.query("SELECT provider, encrypted_key FROM api_keys_vault WHERE is_active = true AND (provider = 'serper' OR provider = 'tavily' OR provider = 'google_search') LIMIT 1");
      if (searchKeys.rows.length > 0) {
        activeSearch = searchKeys.rows[0];
        apiKey = decrypt(activeSearch.encrypted_key);
      }
    }
    
    if (activeSearch) {
      const searchOptions: any = { q: query, num: Math.max(limit, 8) };
      if (lang === 'ar') {
        searchOptions.gl = 'sa'; 
        searchOptions.hl = 'ar';
      }

      if (activeSearch.provider === 'serper') {
        const response = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify(searchOptions)
        });
        if (response.ok) {
          const data = await response.json();
          // Merge organic and knowledge graph if available
          const results = data.organic || [];
          const kg = data.knowledgeGraph;
          
          let kgText = "";
          if (kg) {
            kgText = `[Knowledge Graph] ${kg.title} (${kg.type}): ${kg.description || ''}\n`;
            if (kg.attributes) {
                kgText += Object.entries(kg.attributes).map(([k, v]) => `${k}: ${v}`).join(', ');
            }
          }

          citations = results.map((r: any, idx: number) => ({
            title: r.title,
            url: r.link,
            index: idx + 1
          }));
          searchResults = (kgText ? kgText + '\n\n' : '') + results.map((r: any, idx: number) => `[${idx+1}] ${r.title}: ${r.snippet}`).join('\n\n');
        }
      } else if (activeSearch.provider === 'tavily') {
        const response = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: apiKey,
            query: query,
            search_depth: "advanced",
            include_images: false,
            include_answer: true,
            max_results: limit
          })
        });
        if (response.ok) {
          const data = await response.json();
          citations = (data.results || []).map((r: any, idx: number) => ({
            title: r.title,
            url: r.url,
            index: idx + 1
          }));
          const answer = data.answer ? `[AI Summary] ${data.answer}\n\n` : "";
          searchResults = answer + (data.results || []).map((r: any, idx: number) => `[${idx+1}] ${r.title}: ${r.content}`).join('\n\n');
        }
      }
    } else {
        socket?.emit('search_steps', { 
            step: lang === 'ar' ? "نتائج البحث المباشر غير متوفرة حالياً" : "Live search data currently unavailable", 
            status: 'pending' as const 
        });
        searchResults = "";
        citations = [];
    }
  } catch (err) {
    console.error('[SearchEngine] API Error:', err);
  }

  const finalSteps = [
    { step: lang === 'ar' ? "خطوات التفكير والبحث" : "Thinking and Research Steps", status: 'completed' as const },
    { step: lang === 'ar' ? "بدء محرك البحث السيادي..." : "Sovereign Search Engine Started...", status: 'completed' as const },
    { step: lang === 'ar' ? "تم المسح عبر مؤشرات المعلومات العالمية." : "Global information indices scanned successfully.", status: 'completed' as const },
    { step: lang === 'ar' ? "تم تحليل البيانات المستخرجة بنجاح." : "Extracted data analyzed successfully.", status: 'completed' as const },
    { step: lang === 'ar' ? "جاري صياغة الاستجابة السيادية..." : "Formulating Sovereign Response...", status: 'processing' as const }
  ];

  // Send updates to socket immediately
  finalSteps.forEach(s => socket?.emit('search_steps', s));

  if (citations.length > 0) {
    socket?.emit('citations', { citations });
  }

  return { searchResults, citations, steps: finalSteps };
};

const createNotification = async (userId: number, titleEn: string, titleAr: string, messageEn: string, messageAr: string, type: string = 'system', metadata: any = {}) => {
  try {
    const result = await pool.query(`
      INSERT INTO notifications (user_id, title_en, title_ar, message_en, message_ar, type, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
    `, [userId, titleEn, titleAr, messageEn, messageAr, type, metadata]);
    const newNotif = result.rows[0];
    console.log(`Notification Created: ${titleEn} for user ${userId}`);
    
    // Emit to individual user
    io.to(`user_${userId}`).emit('new_notification', newNotif);
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
};

const broadcastFinancialLog = async (walletId: number, amount: number, type: string, description: string) => {
  try {
    const walletRes = await ledgerPool.query('SELECT user_id FROM wallets WHERE id = $1', [walletId]);
    if (walletRes.rows.length > 0) {
      const userId = walletRes.rows[0].user_id;
      const userRes = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);
      const userName = userRes.rows.length > 0 ? userRes.rows[0].name : 'Unknown';
      
      io.emit('new_financial_transaction', {
        wallet_id: walletId,
        user_id: userId,
        user_name: userName,
        amount,
        transaction_type: type,
        description,
        created_at: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Failed to broadcast financial log:', error);
  }
};

const checkUserQuota = async (userId: number, toolId: string, req?: express.Request) => {
  try {
    const subRes = await pool.query(`
      SELECT p.limits, u.role FROM users u
      LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active' AND (s.current_period_end > CURRENT_TIMESTAMP OR s.current_period_end IS NULL)
      LEFT JOIN plans p ON s.plan_id = p.id
      WHERE u.id = $1
    `, [userId]);

    if (subRes.rows.length === 0) return { allowed: false, reason: 'User not found' };

    const role = subRes.rows[0].role;
    const limits = subRes.rows[0].limits || {};
    const isAdmin = role === 'admin';

    if (!subRes.rows[0].limits && !isAdmin) {
      io.to(`user_${userId}`).emit('quota_milestone', { userId, toolId, percentage: 100, type: 'expired', isExpired: true });
      return { allowed: false, current: 0, limit: 0, reason: 'No active subscription found' };
    }

    if (isAdmin) {
      return { allowed: true, current: 0, limit: 'unlimited', isFree: true };
    }

    const limit = limits[toolId];
    let dailyLimit = limit === 'unlimited' ? Infinity : (typeof limit === 'object' ? parseInt(limit.daily || 0) : parseInt(limit || 0));
    let monthlyLimit = limit === 'unlimited' ? Infinity : (typeof limit === 'object' ? parseInt(limit.monthly || 0) : dailyLimit * 30);

    const today = new Date().toISOString().split('T')[0];
    const monthStartStr = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    
    // Optimized: Single query for both daily and monthly usage
    const usageRes = await pool.query(`
      SELECT 
        SUM(CASE WHEN usage_date >= $3 THEN usage_count ELSE 0 END) as monthly_total,
        SUM(CASE WHEN usage_date = $4 THEN usage_count ELSE 0 END) as daily_total
      FROM user_usage 
      WHERE user_id = $1 AND tool_id = $2 AND usage_date >= $3
    `, [userId, toolId, monthStartStr, today]);

    const monthlyUsage = parseInt(usageRes.rows[0].monthly_total || 0);
    const currentUsage = parseInt(usageRes.rows[0].daily_total || 0);

    if (monthlyLimit !== Infinity && monthlyUsage >= monthlyLimit) {
      const canPay = await checkSeamlessFailover(userId, toolId, req);
      if (canPay.allowed) return { ...canPay, current: monthlyUsage, limit: monthlyLimit, type: 'monthly' };
      return { allowed: false, current: monthlyUsage, limit: monthlyLimit, reason: 'Monthly quota exceeded' };
    }

    if (dailyLimit === Infinity || currentUsage < dailyLimit) {
      return { allowed: true, current: currentUsage, limit: dailyLimit, isFree: true };
    }

    const canPay = await checkSeamlessFailover(userId, toolId, req);
    if (canPay.allowed) return { ...canPay, current: currentUsage, limit: dailyLimit, type: 'daily' };

    return { allowed: false, current: currentUsage, limit: dailyLimit, reason: 'Daily quota exceeded' };
  } catch (error) {
    console.error('Quota Check Error:', error);
    return { allowed: false, error: 'Internal quota error' };
  }
};

const checkSeamlessFailover = async (userId: number, toolId: string, req?: express.Request) => {
  const toolRes = await pool.query('SELECT cost_per_usage FROM tool_orchestrator WHERE tool_id = $1', [toolId]);
  if (toolRes.rows.length > 0) {
    const cost = toolRes.rows[0].cost_per_usage || 0;

    if (cost > 0) {
      const walletRes = await ledgerPool.query('SELECT balance FROM wallets WHERE user_id = $1', [userId]);
      if (walletRes.rows.length > 0) {
        const balance = parseFloat(walletRes.rows[0].balance);
        if (balance >= cost) {
          console.log(`[QuotaEngine] 💡 Seamless Failover: User ${userId} exceeded free quota for ${toolId}, using balance. Cost: ${cost}, Balance: ${balance}`);
          return { 
            allowed: true, 
            isFree: false, 
            cost, 
            toolName: toolId 
          };
        }
      }
    }
  }
  return { allowed: false };
};

const incrementUserUsage = async (userId: number, toolId: string, options?: { isFree: boolean, cost?: number, toolName?: string }) => {
  try {
    const usageResult = await pool.query(`
      INSERT INTO user_usage (user_id, tool_id, usage_count, usage_date)
      VALUES ($1, $2, 1, CURRENT_DATE)
      ON CONFLICT (user_id, tool_id, usage_date)
      DO UPDATE SET usage_count = user_usage.usage_count + 1
      RETURNING usage_count
    `, [userId, toolId]);

    const currentUsage = usageResult.rows[0].usage_count;

    await pool.query(`
      INSERT INTO user_activity_logs (user_id, tool_id, amount, usage_type)
      VALUES ($1, $2, $3, $4)
    `, [userId, toolId, options?.cost || 1, options?.isFree === false ? 'paid' : 'quota']);

    io.to(`user_${userId}`).emit('usage_update', { toolId, usageCount: currentUsage });

    try {
      const subRes = await pool.query(`
        SELECT p.limits, p.name_en, p.name_ar, u.email, u.name as user_name
        FROM subscriptions s
        JOIN plans p ON s.plan_id = p.id
        JOIN users u ON s.user_id = u.id
        WHERE s.user_id = $1 AND s.status = 'active'
      `, [userId]);

      if (subRes.rows.length > 0) {
        const { limits, name_en, name_ar, email, user_name } = subRes.rows[0];
        const limit = limits[toolId];

        if (limit && limit !== 'unlimited') {
          let dailyLimit = (typeof limit === 'object') ? parseInt(limit.daily || 0) : parseInt(limit || 0);
          if (dailyLimit > 0) {
            const milestones = [0.5, 0.9, 1.0];
            for (const m of milestones) {
              if (currentUsage === Math.ceil(dailyLimit * m)) {
                const percent = Math.round(m * 100);
                io.to(`user_${userId}`).emit('quota_milestone', { userId, toolId, planNameEn: name_en, planNameAr: name_ar, percentage: percent, currentUsage, limit: dailyLimit, scope: 'daily' });
                if (percent === 90) sendSmartEmail(userId, email, 'quota_warning', { userName: user_name, toolName: toolId, usagePercentage: '90', scope: 'Daily' }, 'en').catch(() => {});
                break;
              }
            }
          }
        }
      }
    } catch (e) {}

    if (options && !options.isFree && options.cost && options.cost > 0) {
      const ledgerClient = await ledgerPool.connect();
      try {
        await ledgerClient.query('BEGIN');
        const walletRes = await ledgerClient.query('SELECT id, balance FROM wallets WHERE user_id = $1', [userId]);
        if (walletRes.rows.length > 0) {
          const { id: walletId, balance } = walletRes.rows[0];
          if (parseFloat(balance) >= options.cost) {
            await ledgerClient.query('UPDATE wallets SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [options.cost, walletId]);
            await ledgerClient.query(`INSERT INTO ledger_transactions (wallet_id, amount, transaction_type, description) VALUES ($1, $2, $3, $4)`, [walletId, -options.cost, 'usage_fee', `Extra usage fee for ${options.toolName || toolId}`]);
            broadcastFinancialLog(walletId, -options.cost, 'usage_fee', `Extra usage fee for ${options.toolName || toolId}`);
            await ledgerClient.query('COMMIT');
          } else {
            throw new Error('Insufficient balance');
          }
        }
      } catch (e) {
        await ledgerClient.query('ROLLBACK');
        console.error('Usage fee deduction failed:', e);
      } finally {
        ledgerClient.release();
      }
    }
  } catch (error) {
    console.error('Usage increment failed:', error);
  }
};

const getRedirectUri = (req?: any) => {
  let baseUrl = process.env.APP_URL;
  if (!baseUrl && req) {
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    baseUrl = `${protocol}://${host}`;
  }
  if (!baseUrl) baseUrl = 'http://localhost:3000';
  return `${baseUrl.replace(/\/$/, '')}/api/auth/google/callback`;
};

async function monitorDatabases() {
  try {
    const registries = await pool.query('SELECT * FROM db_connections_registry');
    for (const reg of registries.rows) {
      try {
        let isAlive = false;
        let connectionString = '';
        
        if (reg.connection_string) {
          connectionString = decrypt(reg.connection_string);
        } else if (reg.host && reg.username) {
          const user = encodeURIComponent(reg.username || '');
          const pass = encodeURIComponent(reg.password ? decrypt(reg.password) : '');
          const host = reg.host;
          const port = reg.port || 5432;
          const name = reg.db_name || '';
          connectionString = `postgresql://${user}:${pass}@${host}:${port}/${name}`;
        }

        if (!connectionString || !connectionString.startsWith('postgres')) {
          continue;
        }

        const TestPool = new Pool({ 
          connectionString: connectionString, 
          connectionTimeoutMillis: 5000,
          idleTimeoutMillis: 1000,
          max: 1 
        });
        try {
          await TestPool.query('SELECT 1');
          isAlive = true;
        } catch (pingErr) {
          console.error(`[Heartbeat] Ping failed for ${reg.provider}:`, pingErr instanceof Error ? pingErr.message : pingErr);
          isAlive = false;
        } finally {
          await TestPool.end().catch(() => {});
        }
        
        const newStatus = isAlive ? 'healthy' : 'down';
        await pool.query(
          'UPDATE db_connections_registry SET status = $1, last_checked_at = CURRENT_TIMESTAMP WHERE id = $2',
          [newStatus, reg.id]
        );
        
        if (!isAlive) {
            console.error(`[Heartbeat] ⚠️ Database ${reg.provider} (${reg.id}) is DOWN!`);
            io.emit('db_alert', { provider: reg.provider, status: 'down' });
        }
      } catch (err) {
        console.error(`[Heartbeat] Error checking ${reg.provider}:`, err);
        await pool.query('UPDATE db_connections_registry SET status = $1, last_checked_at = CURRENT_TIMESTAMP WHERE id = $2',
          ['error', reg.id]
        );
      }
    }
  } catch (err) {
    console.error('[Heartbeat] Failed to run database audit:', err);
  }
}

async function ensureColumn(poolObj: any, tableName: string, columnName: string, type: string, defaultVal?: any) {
  try {
    const check = await poolObj.query(`
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = $1 AND column_name = $2
    `, [tableName, columnName]);
    
    if (check.rows.length === 0) {
      console.log(`[Repair] Adding missing column ${columnName} to ${tableName}...`);
      let query = `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${type}`;
      if (defaultVal !== undefined) {
        query += ` DEFAULT ${defaultVal}`;
      }
      await poolObj.query(query);
    }
  } catch (e: any) {
    console.error(`[Repair] Failed to ensure column ${columnName} in ${tableName}:`, e.message);
  }
}

async function runDatabaseMigrations() {
  try {
    if (!pool || !ledgerPool) {
      initializeSovereignPools(process.env.DATABASE_URL || '', process.env.LEDGER_DATABASE_URL || '');
    }

    if (!pool) {
      return;
    }

    try {
      const idCheck = await pool.query(`
        SELECT data_type FROM information_schema.columns 
        WHERE table_name = 'db_connections_registry' AND column_name = 'id'
      `);
      if (idCheck.rows.length > 0 && idCheck.rows[0].data_type === 'integer') {
        await pool.query(`DROP TABLE IF EXISTS db_connections_registry CASCADE`);
      }
    } catch (e) {}

    await pool.query(`
      CREATE TABLE IF NOT EXISTS db_connections_registry (
        id VARCHAR(50) PRIMARY KEY,
        provider VARCHAR(50),
        type VARCHAR(20) DEFAULT 'postgres',
        host VARCHAR(255),
        port VARCHAR(10),
        db_name VARCHAR(100),
        username VARCHAR(100),
        password TEXT,
        connection_string TEXT,
        ssl_mode VARCHAR(20) DEFAULT 'disable',
        pool_size INTEGER DEFAULT 10,
        is_active BOOLEAN DEFAULT false,
        status VARCHAR(20) DEFAULT 'unknown',
        last_checked_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure Registry Schema Parity
    await ensureColumn(pool, 'db_connections_registry', 'provider', 'VARCHAR(50)');
    await ensureColumn(pool, 'db_connections_registry', 'status', 'VARCHAR(20)', "'unknown'");
    await ensureColumn(pool, 'db_connections_registry', 'last_checked_at', 'TIMESTAMP');
    await ensureColumn(pool, 'db_connections_registry', 'updated_at', 'TIMESTAMP', 'CURRENT_TIMESTAMP');

    await ensureColumn(pool, 'system_broadcasts', 'status', 'VARCHAR(20)', "'completed'");
    await ensureColumn(pool, 'messages', 'tool', 'VARCHAR(50)');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        token VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const coreUrl = process.env.DATABASE_URL;
    const ledgerUrl = process.env.LEDGER_DATABASE_URL;

    if (coreUrl) {
      try {
        const coreEncrypted = encrypt(coreUrl);
        await pool.query(`
          INSERT INTO db_connections_registry (id, provider, connection_string, is_active)
          VALUES ('core', 'core', $1, true)
          ON CONFLICT (id) DO UPDATE SET 
            connection_string = EXCLUDED.connection_string,
            updated_at = CURRENT_TIMESTAMP
        `, [coreEncrypted]);
        
        await pool.query(`
          INSERT INTO db_connections_registry (id, provider, connection_string, is_active)
          VALUES ('core_shadow', 'core_shadow', $1, false)
          ON CONFLICT (id) DO UPDATE SET
            connection_string = EXCLUDED.connection_string,
            updated_at = CURRENT_TIMESTAMP
        `, [coreEncrypted]);
      } catch (e) {
      }
    }

    if (ledgerUrl) {
      try {
        const ledgerEncrypted = encrypt(ledgerUrl);
        await pool.query(`
          INSERT INTO db_connections_registry (id, provider, connection_string, is_active)
          VALUES ('ledger', 'ledger', $1, true)
          ON CONFLICT (id) DO UPDATE SET 
            connection_string = EXCLUDED.connection_string,
            updated_at = CURRENT_TIMESTAMP
        `, [ledgerEncrypted]);

        await pool.query(`
          INSERT INTO db_connections_registry (id, provider, connection_string, is_active)
          VALUES ('ledger_shadow', 'ledger_shadow', $1, false)
          ON CONFLICT (id) DO UPDATE SET
            connection_string = EXCLUDED.connection_string,
            updated_at = CURRENT_TIMESTAMP
        `, [ledgerEncrypted]);
      } catch (e) {
      }
    }

    try {
      await pool.query('SELECT 1');
      await pool.query("UPDATE db_connections_registry SET status = 'healthy', last_checked_at = CURRENT_TIMESTAMP WHERE id = 'core'");
    } catch (e) {
      await pool.query("UPDATE db_connections_registry SET status = 'down', last_checked_at = CURRENT_TIMESTAMP WHERE id = 'core'");
    }

    try {
      await ledgerPool.query('SELECT 1');
      await pool.query("UPDATE db_connections_registry SET status = 'healthy', last_checked_at = CURRENT_TIMESTAMP WHERE id = 'ledger'");
    } catch (e) {
      await pool.query("UPDATE db_connections_registry SET status = 'down', last_checked_at = CURRENT_TIMESTAMP WHERE id = 'ledger'");
    }

    await initDb('additive');
  } catch (error: any) {
    console.error(' [CRITICAL ERROR] 🚨 Sovereign Database Migration failed!');
    console.error(` [REASON] ${error.message}`);
    
    if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      console.error(' [ADVICE] Check your DATABASE_URL in .env. Ensure the database is running and reachable.');
    } else if (error.message.includes('authentication failed')) {
      console.error(' [ADVICE] Check your DATABASE_URL credentials (username/password).');
    }

    if (process.env.NODE_ENV === 'production') {
      console.error(' [FATAL] Terminating process due to migration failure in production mode.');
      throw error;
    } else {
      console.warn(' [WARNING] CONTINUING IN DEGRADED MODE. Some features will be unavailable until DB is fixed.');
    }
  }
}

async function initDb(mode: 'scratch' | 'additive' = 'additive', customPool?: any, customLedgerPool?: any) {
  // Master Sync: Ensure core pools are available for seeding
  if (!pool) {
    console.warn("[InitDB] 🛡️ FATAL: Core pool is missing. Structural audit aborted.");
    return;
  }

  const targetPool = customPool || pool;
  const targetLedgerPool = customLedgerPool || (ledgerPool && ledgerPool.options && ledgerPool.options.connectionString ? ledgerPool : pool);

  console.log(`[InitDB] 🛡️ Starting Structural Sovereign Audit (Mode: ${mode.toUpperCase()})`);
  
  try {
    const dbNameRes = await targetPool.query('SELECT current_database()');
    console.log(`[InitDB] 📍 Target Database: ${dbNameRes.rows[0].current_database}`);
  } catch (e) {}

  const schema = [
    { name: 'users', query: `CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, email VARCHAR(255) UNIQUE NOT NULL, name VARCHAR(255), avatar TEXT, provider TEXT DEFAULT 'local', role VARCHAR(20) DEFAULT 'user', kyc_status VARCHAR(20) DEFAULT 'none', kyc_required BOOLEAN DEFAULT false, kyc_selfie TEXT, kyc_full_name VARCHAR(255), kyc_rejection_reason TEXT, custom_instructions TEXT, memory TEXT, password_hash TEXT, language VARCHAR(5) DEFAULT 'ar', status VARCHAR(20) DEFAULT 'active', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)` },
    { name: 'db_connections_registry', query: `CREATE TABLE IF NOT EXISTS db_connections_registry (id VARCHAR(50) PRIMARY KEY, provider VARCHAR(50), type VARCHAR(20) DEFAULT 'postgres', host VARCHAR(255), port VARCHAR(10), db_name VARCHAR(100), username VARCHAR(100), password TEXT, connection_string TEXT, ssl_mode VARCHAR(20) DEFAULT 'disable', pool_size INTEGER DEFAULT 10, is_active BOOLEAN DEFAULT false, status VARCHAR(20) DEFAULT 'unknown', last_checked_at TIMESTAMP, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)` },
    { name: 'password_resets', query: `CREATE TABLE IF NOT EXISTS password_resets (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, email VARCHAR(255) NOT NULL, token TEXT NOT NULL, expires_at TIMESTAMP NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)` },
    { name: 'user_files', query: `CREATE TABLE IF NOT EXISTS user_files (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE, file_name VARCHAR(255) NOT NULL, file_url TEXT NOT NULL, file_size BIGINT, mime_type VARCHAR(100), file_type VARCHAR(50) DEFAULT 'other', metadata JSONB DEFAULT '{}', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)` },
    { name: 'chats', query: `CREATE TABLE IF NOT EXISTS chats (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, title VARCHAR(255) NOT NULL, context_summary TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)` },
    { name: 'messages', query: `CREATE TABLE IF NOT EXISTS messages (id SERIAL PRIMARY KEY, chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE, role VARCHAR(50) NOT NULL, content TEXT NOT NULL, tool VARCHAR(50), feedback SMALLINT DEFAULT 0, is_pinned BOOLEAN DEFAULT FALSE, thinking_steps JSONB DEFAULT '[]', citations JSONB DEFAULT '[]', follow_ups JSONB DEFAULT '[]', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)` },
    { name: 'chat_memories', query: `CREATE TABLE IF NOT EXISTS chat_memories (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE, fact TEXT NOT NULL, category VARCHAR(50) DEFAULT 'general', source VARCHAR(20) DEFAULT 'ai', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)` },
    { name: 'api_keys_vault', query: `CREATE TABLE IF NOT EXISTS api_keys_vault (id SERIAL PRIMARY KEY, provider VARCHAR(50) UNIQUE NOT NULL, encrypted_key TEXT NOT NULL, daily_budget DECIMAL(10, 4) DEFAULT 0, used_today DECIMAL(10, 4) DEFAULT 0, last_reset_date DATE DEFAULT CURRENT_DATE, models JSONB DEFAULT '[]', model_list JSONB DEFAULT '[]', is_active BOOLEAN DEFAULT true, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)` },
    { name: 'tool_orchestrator', query: `CREATE TABLE IF NOT EXISTS tool_orchestrator (id SERIAL PRIMARY KEY, tool_id VARCHAR(50) UNIQUE NOT NULL, primary_provider VARCHAR(50), primary_model VARCHAR(255), fallback1_provider VARCHAR(50), fallback1_model VARCHAR(255), fallback2_provider VARCHAR(50), fallback2_model VARCHAR(255), fallback3_provider VARCHAR(50), fallback3_model VARCHAR(255), task_description TEXT, task_description_ar TEXT, is_active BOOLEAN DEFAULT true, cost_per_usage INTEGER DEFAULT 10, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)` },
    { name: 'wallets', pool: targetLedgerPool, query: `CREATE TABLE IF NOT EXISTS wallets (id SERIAL PRIMARY KEY, user_id INTEGER UNIQUE NOT NULL, balance DECIMAL(15, 4) DEFAULT 0.0000, usd_balance DECIMAL(15, 4) DEFAULT 0.0000, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)` },
    { name: 'ledger_transactions', pool: targetLedgerPool, query: `CREATE TABLE IF NOT EXISTS ledger_transactions (id SERIAL PRIMARY KEY, wallet_id INTEGER REFERENCES wallets(id), amount DECIMAL(15, 4) NOT NULL, transaction_type VARCHAR(50) NOT NULL, status VARCHAR(20) DEFAULT 'success', description TEXT, reference_id VARCHAR(255), metadata JSONB DEFAULT '{}', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)` },
    { name: 'economy_settings', pool: targetLedgerPool, query: `CREATE TABLE IF NOT EXISTS economy_settings (id SERIAL PRIMARY KEY, welcome_bonus_points INTEGER DEFAULT 600, referral_bonus_points INTEGER DEFAULT 1000, min_withdrawal_cents INTEGER DEFAULT 2000, points_per_dollar INTEGER DEFAULT 1000, conversion_rate DECIMAL(10, 4) DEFAULT 0.0010, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)` },
    { name: 'withdrawal_requests', pool: targetLedgerPool, query: `CREATE TABLE IF NOT EXISTS withdrawal_requests (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL, amount_cents INTEGER NOT NULL, method VARCHAR(50) NOT NULL, details TEXT, status VARCHAR(20) DEFAULT 'pending', rejection_reason TEXT, processed_at TIMESTAMP, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)` },
    { name: 'kyc_requests', pool: targetLedgerPool, query: `CREATE TABLE IF NOT EXISTS kyc_requests (id SERIAL PRIMARY KEY, user_id INTEGER UNIQUE NOT NULL, full_name VARCHAR(255), selfie_url TEXT, status VARCHAR(20) DEFAULT 'pending', rejection_reason TEXT, submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)` },
    { name: 'referrals', pool: targetLedgerPool, query: `CREATE TABLE IF NOT EXISTS referrals (id SERIAL PRIMARY KEY, referrer_id INTEGER NOT NULL, referred_id INTEGER UNIQUE NOT NULL, bonus_points INTEGER DEFAULT 0, status VARCHAR(20) DEFAULT 'pending', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)` },
    { name: 'plans', query: `CREATE TABLE IF NOT EXISTS plans (id SERIAL PRIMARY KEY, name_en VARCHAR(100) UNIQUE NOT NULL, name_ar VARCHAR(100) NOT NULL, desc_en TEXT, desc_ar TEXT, badge VARCHAR(50) DEFAULT 'none', discount INTEGER DEFAULT 0, is_visible BOOLEAN DEFAULT true, monthly_price DECIMAL(10, 2) DEFAULT 0.00, annual_price DECIMAL(10, 2) DEFAULT 0.00, color VARCHAR(50) DEFAULT '#000000', features JSONB DEFAULT '[]', limits JSONB DEFAULT '{}', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)` },
    { name: 'subscriptions', query: `CREATE TABLE IF NOT EXISTS subscriptions (id SERIAL PRIMARY KEY, user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE, plan_id INTEGER REFERENCES plans(id), status VARCHAR(50) DEFAULT 'active', billing_period VARCHAR(20) DEFAULT 'monthly', current_period_end TIMESTAMP, last_period_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)` },
    { name: 'ai_logs', query: `CREATE TABLE IF NOT EXISTS ai_logs (id SERIAL PRIMARY KEY, user_id INTEGER, tool_id VARCHAR(50), provider VARCHAR(50), model VARCHAR(255), prompt_tokens INTEGER DEFAULT 0, completion_tokens INTEGER DEFAULT 0, cost DECIMAL(15, 6) DEFAULT 0, status VARCHAR(20) DEFAULT 'success', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)` },
    { name: 'system_logs', query: `CREATE TABLE IF NOT EXISTS system_logs (id SERIAL PRIMARY KEY, user_id INTEGER, action VARCHAR(100) NOT NULL, description TEXT, metadata JSONB DEFAULT '{}', ip_address VARCHAR(45), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)` },
    { name: 'security_alerts', query: `CREATE TABLE IF NOT EXISTS security_alerts (id SERIAL PRIMARY KEY, user_id INTEGER, alert_type VARCHAR(50) NOT NULL, severity VARCHAR(20) DEFAULT 'medium', description TEXT, metadata JSONB DEFAULT '{}', ip_address VARCHAR(45), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)` },
    { name: 'task_logs', query: `CREATE TABLE IF NOT EXISTS task_logs (id SERIAL PRIMARY KEY, user_id INTEGER, tool_id VARCHAR(50), task_type VARCHAR(100), status VARCHAR(20) DEFAULT 'pending', metadata JSONB DEFAULT '{}', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)` },
    { name: 'user_usage', query: `CREATE TABLE IF NOT EXISTS user_usage (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL, tool_id VARCHAR(50) NOT NULL, usage_count INTEGER DEFAULT 0, usage_date DATE DEFAULT CURRENT_DATE, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id, tool_id, usage_date))` },
    { name: 'user_activity_logs', query: `CREATE TABLE IF NOT EXISTS user_activity_logs (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL, tool_id VARCHAR(50), amount DECIMAL(15, 4) DEFAULT 1, usage_type VARCHAR(20) DEFAULT 'quota', metadata JSONB DEFAULT '{}', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)` },
    { name: 'system_settings', query: `CREATE TABLE IF NOT EXISTS system_settings (id SERIAL PRIMARY KEY, site_name_en VARCHAR(255) DEFAULT '', site_name_ar VARCHAR(255) DEFAULT '', site_description_en TEXT, site_description_ar TEXT, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)` },
    { name: 'notifications', query: `CREATE TABLE IF NOT EXISTS notifications (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL, title_en VARCHAR(255), title_ar VARCHAR(255), message_en TEXT, message_ar TEXT, type VARCHAR(50) DEFAULT 'system', is_read BOOLEAN DEFAULT FALSE, metadata JSONB DEFAULT '{}', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)` },
    { name: 'system_broadcasts', query: `CREATE TABLE IF NOT EXISTS system_broadcasts (id SERIAL PRIMARY KEY, admin_id INTEGER, broadcast_type VARCHAR(50) NOT NULL, target_group VARCHAR(50) NOT NULL, title_en TEXT, title_ar TEXT, content_en TEXT, content_ar TEXT, sent_count INTEGER DEFAULT 0, status VARCHAR(20) DEFAULT 'completed', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)` },
    { name: 'email_settings', query: `CREATE TABLE IF NOT EXISTS email_settings (id SERIAL PRIMARY KEY, mailer_type VARCHAR(50) DEFAULT 'smtp', smtp_host VARCHAR(255), smtp_port INTEGER, smtp_encryption VARCHAR(10) DEFAULT 'tls', smtp_username VARCHAR(255), smtp_password TEXT, sender_name VARCHAR(255), sender_email VARCHAR(255), status VARCHAR(20) DEFAULT 'active', last_verified_at TIMESTAMP, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)` },
    { name: 'email_templates', query: `CREATE TABLE IF NOT EXISTS email_templates (id SERIAL PRIMARY KEY, name VARCHAR(255) UNIQUE NOT NULL, subject_en VARCHAR(255), subject_ar VARCHAR(255), body_en TEXT, body_ar TEXT, type VARCHAR(50) DEFAULT 'system', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)` },
    { name: 'campaigns', query: `CREATE TABLE IF NOT EXISTS campaigns (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, template_id INTEGER REFERENCES email_templates(id), target_criteria JSONB, total_recipients INTEGER DEFAULT 0, status VARCHAR(50) DEFAULT 'pending', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)` },
    { name: 'stripe_events', query: `CREATE TABLE IF NOT EXISTS stripe_events (id SERIAL PRIMARY KEY, stripe_event_id VARCHAR(255) UNIQUE, type VARCHAR(100), status VARCHAR(20) DEFAULT 'processed', metadata JSONB DEFAULT '{}', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)` },
    { name: 'message_reports', query: `CREATE TABLE IF NOT EXISTS message_reports (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE, reason TEXT, status VARCHAR(20) DEFAULT 'pending', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)` },
    { name: 'user_shortcuts', query: `CREATE TABLE IF NOT EXISTS user_shortcuts (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, title VARCHAR(255) NOT NULL, query TEXT NOT NULL, category VARCHAR(50) DEFAULT 'general', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)` }
  ];

  for (const table of schema) {
    try {
      const p = (table as any).pool || targetPool;
      await p.query(table.query);
      console.log(`[InitDB] ✅ Table verified: ${table.name}`);
    } catch (err: any) {
      console.error(`[InitDB] ❌ Error in table ${table.name}:`, err.message);
    }
  }

  // Self-Healing Column Audit
  await ensureColumn(targetPool, 'user_files', 'chat_id', 'INTEGER REFERENCES chats(id) ON DELETE CASCADE');
  await ensureColumn(targetPool, 'users', 'kyc_selfie', 'TEXT');
  await ensureColumn(targetPool, 'users', 'kyc_full_name', 'VARCHAR(255)');
  await ensureColumn(targetPool, 'users', 'custom_instructions', 'TEXT');
  await ensureColumn(targetPool, 'users', 'memory', 'TEXT');
  await ensureColumn(targetPool, 'users', 'status', "VARCHAR(20)", "'active'");
  await ensureColumn(targetPool, 'users', 'kyc_status', "VARCHAR(20)", "'none'");
  await ensureColumn(targetPool, 'users', 'kyc_required', "BOOLEAN", "false");
  await ensureColumn(targetPool, 'users', 'language', "VARCHAR(5)", "'ar'");
  await ensureColumn(targetPool, 'users', 'kyc_rejection_reason', 'TEXT');
  await ensureColumn(targetPool, 'api_keys_vault', 'model_list', "JSONB", "'[]'");
  await ensureColumn(targetPool, 'api_keys_vault', 'models', "JSONB", "'[]'");
  await ensureColumn(targetPool, 'api_keys_vault', 'is_active', "BOOLEAN", "true");
  await ensureColumn(targetPool, 'tool_orchestrator', 'is_active', "BOOLEAN", "true");
  await ensureColumn(targetPool, 'db_connections_registry', 'is_active', "BOOLEAN", "false");
  await ensureColumn(targetPool, 'chats', 'context_summary', 'TEXT');
  await ensureColumn(targetPool, 'plans', 'name_en', 'VARCHAR(100)');
  await ensureColumn(targetPool, 'messages', 'is_pinned', 'BOOLEAN', 'FALSE');
  await ensureColumn(targetPool, 'messages', 'thinking_steps', 'JSONB', "'[]'");
  await ensureColumn(targetPool, 'messages', 'citations', 'JSONB', "'[]'");
  await ensureColumn(targetPool, 'messages', 'follow_ups', 'JSONB', "'[]'");
  try { await targetPool.query('ALTER TABLE user_usage ADD CONSTRAINT user_usage_user_id_tool_id_usage_date_key UNIQUE (user_id, tool_id, usage_date)'); } catch (e) {}
  try { await targetPool.query('ALTER TABLE plans ADD CONSTRAINT plans_name_en_unique UNIQUE (name_en)'); } catch (e) {}

  // --- SEEDING PHASE ---
  try {
    console.log('[InitDB] 🌱 Seeding Master Data...');

    // 1. Systems
    await targetPool.query("INSERT INTO system_settings (id, site_name_en, site_name_ar) VALUES (1, 'Sovereign', 'سوفيرين') ON CONFLICT (id) DO NOTHING");
    await targetPool.query("INSERT INTO email_settings (id, mailer_type, sender_name) VALUES (1, 'smtp', 'Support') ON CONFLICT (id) DO NOTHING");

    // 2. Plans
    const plansCheck = await targetPool.query('SELECT count(*) FROM plans');
    if (parseInt(plansCheck.rows[0].count) === 0) {
      console.log("[InitDB] Seeding professional plans...");
      await targetPool.query(`
        INSERT INTO plans (name_en, name_ar, desc_en, desc_ar, badge, is_visible, monthly_price, annual_price, color, features, limits) 
        VALUES 
        ('Free Plan', 'الباقة المجانية', 'Basic AI tools for exploration.', 'أدوات الذكاء الاصطناعي الأساسية مجاناً.', 'none', true, 0, 0, '#94A3B8', '["Basic Chat", "Standard Speed"]', '{"chat_fast": {"daily": 10, "monthly": 300}, "chat": {"daily": 5, "monthly": 150}}'),
        ('Pro Elite', 'اشتراك النخبة PRO', 'Advanced models for power users.', 'نماذج متقدمة للمستخدمين المحترفين.', 'popular', true, 1900, 19000, '#10B981', '["Priority Support", "Advanced Models"]', '{"chat_fast": {"daily": 500, "monthly": 15000}, "chat_pro": {"daily": 50, "monthly": 1500}, "chat": "unlimited"}'),
        ('Creators Hub', 'باقة المبدعين', 'Optimized for visual content.', 'محسنة لإنتاج المحتوى البصري.', 'trending', true, 3500, 35000, '#8B5CF6', '["Image Gen", "Brand Voice"]', '{"chat_fast": "unlimited", "image": {"daily": 50, "monthly": 1000}, "video": {"daily": 5, "monthly": 100}}'),
        ('Business Sovereign', 'الشركات السيادية', 'Enterprise scale infrastructure.', 'بنية تحتية بمقاييس مؤسسية.', 'exclusive', true, 9900, 99000, '#F59E0B', '["Multi-User", "API Access", "Zero Latency"]', '{"chat_fast": "unlimited", "chat_pro": "unlimited", "code": "unlimited", "perplexta_analysis": "unlimited", "image": "unlimited"}')
        ON CONFLICT (name_en) DO NOTHING
      `);
    } else if (parseInt(plansCheck.rows[0].count) < 4) {
      // If we have some plans but not 4, we might want to ensure the specific ones exist
      console.log("[InitDB] Syncing tier gaps...");
      // Logic to add missing ones if needed...
    }

    // 3. Economy
    const ecoCheck = await targetLedgerPool.query('SELECT count(*) FROM economy_settings');
    if (parseInt(ecoCheck.rows[0].count) === 0) {
      await targetLedgerPool.query(`
        INSERT INTO economy_settings (id, welcome_bonus_points, referral_bonus_points, min_withdrawal_cents, points_per_dollar, conversion_rate) 
        VALUES (1, 600, 1000, 2000, 1000, 0.0010) 
        ON CONFLICT (id) DO NOTHING
      `);
    }

    // 4. Admin
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminCheck = await targetPool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    if (adminCheck.rows.length === 0) {
      const adminPass = process.env.ADMIN_PASSWORD || 'Admin@Secure2026';
      const adminHash = await bcrypt.hash(adminPass, 10);
      const newAdmin = await targetPool.query(
        "INSERT INTO users (email, name, password_hash, role, provider, status) VALUES ($1, 'Master Admin', $2, 'admin', 'local', 'active') RETURNING id",
        [adminEmail, adminHash]
      );
      const adminId = newAdmin.rows[0].id;
      // Link plan & wallet
      await targetPool.query("INSERT INTO subscriptions (user_id, plan_id, status) SELECT $1, id, 'active' FROM plans LIMIT 1 ON CONFLICT (user_id) DO NOTHING", [adminId]);
      await targetLedgerPool.query("INSERT INTO wallets (user_id, balance) VALUES ($1, 10000) ON CONFLICT (user_id) DO NOTHING", [adminId]);
      console.log(`[InitDB] 🛡️ Master Admin seeded: ${adminEmail}`);
    }

    try { await syncSystemTemplates(targetPool); } catch (e) {}

    console.log('[InitDB] ✅ Structural audit and seeding sequence complete.');
  } catch (seedErr: any) {
    console.error('[InitDB] 🚨 Seeding failure:', seedErr.message);
  }
}


// --- Constants & Global Handlers ---
const tools = [
  { 
    id: 'chat', 
    nameEn: 'Standard Chat',
    nameAr: 'الدردشة القياسية',
    desc: 'Standard conversational AI assistant for general queries.', 
    descAr: 'مساعد ذكاء اصطناعي محادثي قياسي للاستفسارات العامة.',
    cost: 10 
  },
  { 
    id: 'chat_fast', 
    nameEn: 'Flash Response',
    nameAr: 'الاستجابة السريعة',
    desc: 'High-speed response mode optimized for simple tasks and quick answers.', 
    descAr: 'وضع استجابة عالي السرعة محسن للمهام البسيطة والإجابات السريعة.',
    cost: 5 
  },
  { 
    id: 'chat_pro', 
    nameEn: 'IQ Pro',
    nameAr: 'الذكاء الاحترافي',
    desc: 'High-intelligence mode optimized for complex reasoning, multi-step logic, and detailed accuracy.', 
    descAr: 'وضع ذكاء عالٍ محسن للاستنتاجات المعقدة والمنطق متعدد الخطوات والدقة التفصيلية.',
    cost: 25 
  },
  { 
    id: 'chat_reasoning', 
    nameEn: 'Deep Thinking',
    nameAr: 'التفكير العميق',
    desc: 'Deep thinking mode. Prioritize chain-of-thought, step-by-step logic, and thorough analytical extraction.', 
    descAr: 'وضع التفكير العميق. يعطي الأولوية لسلسلة الأفكار والمنطق التدريجي والاستخراج التحليلي الشامل.',
    cost: 50 
  },
  { 
    id: 'perplexta_analysis', 
    nameEn: 'Sovereign Analysis',
    nameAr: 'التحليل السيادي',
    desc: 'Sovereign Analysis: Master analysis engine. Specialized in deep technical extraction, vision-based audits, and comprehensive file forensics.', 
    descAr: 'التحليل السيادي: محرك التحليل الرئيسي. متخصص في الاستخراج التقني العميق، وعمليات التدقيق القائمة على الرؤية (الصور)، والتحليل الجنائي الشامل للملفات.',
    cost: 40,
    directiveEn: ANALYSIS_PROTOCOL,
    directiveAr: ANALYSIS_PROTOCOL
  },
  { 
    id: 'sovereign_search', 
    nameEn: 'Intelligence Search',
    nameAr: 'نظام البحث الاستخباراتي',
    desc: 'Research & Information extraction hub. Controls which search data providers are prioritized during investigative cycles.', 
    descAr: 'مركز البحث واستخراج المعلومات. يتحكم في مزودي بيانات البحث الذين يتم إعطاؤهم الأولوية خلال دورات التحقيق.',
    cost: 5,
    directiveEn: "Sovereign Intelligence Search Protocol: Prioritize real-time data extraction, technical accuracy, and digital footprints.",
    directiveAr: "بروتوكول البحث الاستخباراتي السيادي: إعطاء الأولوية لاستخراج البيانات في الوقت الفعلي، والدقة التقنية، والآثار الرقمية."
  },
  { 
    id: 'code', 
    nameEn: 'Code Generation',
    nameAr: 'إنشاء كود',
    desc: 'The Sovereign Code Architect. Professional software engineering, smart contract development, and complex algorithmic logic.', 
    descAr: 'المهندس المعماري للبرمجيات. بروتوكول هندسة البرمجيات الاحترافية، تطوير العقود الذكية، والحلول البرمجية النخبوية والمنطق المعقد.',
    cost: 30,
    directiveEn: CODE_GEN_PROTOCOL,
    directiveAr: CODE_GEN_PROTOCOL
  },
  { 
    id: 'image', 
    nameEn: 'Creative Visuals',
    nameAr: 'الإبداع البصري',
    desc: 'Visual creation orchestrator. Generate professional, high-fidelity images based on descriptive logical prompts.', 
    descAr: 'منسق الإبداع البصري. إنشاء صور احترافية عالية الدقة بناءً على مطالبات منطقية وصفية.',
    cost: 20,
    directiveEn: IMAGE_GEN_PROTOCOL,
    directiveAr: IMAGE_GEN_PROTOCOL
  },
  { 
    id: 'video', 
    nameEn: 'Cinematic Motion',
    nameAr: 'الحركة السينمائية',
    desc: 'Cinematic video generation mode for professional visual storytelling.', 
    descAr: 'وضع إنشاء فيديو سينمائي لرواية القصص البصرية الاحترافية.',
    cost: 150 
  },
  { 
    id: 'tts', 
    nameEn: 'Vocal Synthesis',
    nameAr: 'تحويل النص الى صوت',
    desc: 'Vocal synthesis mode. Convert text into professional, elite-toned vocal outputs.', 
    descAr: 'تحويل النص الى مخرجات صوتية احترافية بنبرة نخبوية.',
    cost: 15 
  },
  { 
    id: 'stt', 
    nameEn: 'Linguistic Transcribe',
    nameAr: 'النسخ اللغوي',
    desc: 'Linguistic transcription mode. Convert audio into high-precision text with technical context.', 
    descAr: 'وضع النسخ اللغوي. تحويل الصوت إلى نص عالي الدقة بسياق تقني.',
    cost: 10 
  },
  { 
    id: 'legal_analysis', 
    nameEn: 'Legal Consultant',
    nameAr: 'المستشار القانوني',
    desc: 'Expert legal analysis, regulatory scrutiny, and legislative consultation. You act as a high-precision Legal Assistant capable of analyzing contracts, citing laws, and providing legislative insights across varied jurisdictions with absolute neutrality and professional rigor.', 
    descAr: 'تحليل قانوني خبير، فحص تنظيمي، واستشارات تشريعية. أنت تعمل كمساعد قانوني عالي الدقة قادر على تحليل العقود، الاستشهاد بالقوانين، وتقديم رؤى تشريعية عبر ولايات قضائية متنوعة بحيادية مطلقة وصرامة مهنية.',
    cost: 15 
  },
  { 
    id: 'learning', 
    nameEn: 'Adaptive Learning',
    nameAr: 'التعلم التكيفي',
    desc: 'Educational maieutics. Guide the user through complex subjects using structured learning pathways.', 
    descAr: 'التوليد التعليمي. إرشاد المستخدم عبر مواضيع معقدة باستخدام مسارات تعلم منظمة.',
    cost: 20 
  },
  { 
    id: 'notebook', 
    nameEn: 'Ads Strategist',
    nameAr: 'استراتيجي الإعلانات',
    desc: 'Expert Advertising Assistant for Meta (FB/IG), Google Ads, and YouTube. Act as a senior marketing strategist providing platform-compliant campaign architectures, audience targeting logic, and high-conversion ad copy guidelines while strictly adhering to community standards and advertising policies.', 
    descAr: 'مساعد إعلانات خبير لمنصات Meta (فيسبوك/إنستغرام)، Google Ads، وYouTube. تعمل كمخطط استراتيجي أول للتسويق، وتقدم بنية حملات متوافقة مع الأنظمة، ومنطق استهداف الجمهور، وإرشادات نصوص إعلانية عالية التحويل مع الالتزام الصارم بمعايير المجتمع وسياسات الإعلان.',
    cost: 10,
    directiveEn: ADS_ASSISTANT_PROTOCOL,
    directiveAr: ADS_ASSISTANT_PROTOCOL
  },
  { 
    id: 'canvas', 
    nameEn: 'Smart Audio Studio',
    nameAr: 'استوديو الصوت الذكي',
    desc: 'Advanced Audio production and Music generation orchestrator for elite advertising jingles and mood-based audio content.', 
    descAr: 'منسق إنتاج الصوت وتوليد الموسيقى المتقدم للإعلانات النخبوية والمحتوى الصوتي القائم على الحالة المزاجية.',
    cost: 15,
    directiveEn: AUDIO_STUDIO_PROTOCOL,
    directiveAr: AUDIO_STUDIO_PROTOCOL
  },
  { 
    id: 'sound_studio', 
    nameEn: 'Sound Orchestra',
    nameAr: 'أوركسترا الصوت',
    desc: 'Elite orchestral music generation. Create symphonies and professional instrumental pieces for high-end cinematic needs.', 
    descAr: 'توليد موسيقى أوركسترالية نخبوية. إنشاء سمفونيات ومقطوعات موسيقية احترافية للاحتياجات السينمائية الراقية.',
    cost: 40,
    directiveEn: SOUND_STUDIO_PROTOCOL,
    directiveAr: SOUND_STUDIO_PROTOCOL
  },
  { 
    id: 'sovereign_memory', 
    nameEn: 'Core Memory',
    nameAr: 'الذاكرة الجوهرية',
    desc: 'Sovereign Context Synthesis & Memory Engine. Background system for fact extraction and session intelligence.', 
    descAr: 'محرك الذاكرة وتوليف السياق السيادي. نظام خلفي لاستخراج الحقائق وذكاء الجلسات.',
    cost: 0 
  }
];

async function proactiveOrchestratorSync() {
  // Master Vault Seeding: Ensure critical providers have keys if env vars exist
  console.log('[Orchestrator] Vault seeding skipped (Env vars disabled for sovereignty).');

    try {
      for (const tool of tools) {
        // Sovereign Directive: We seed IDs, status, and the specialized Technical Directive. 
        // Provider and Model MUST be configured via the Admin Panel to prevent hardcoding leaks.
        await pool.query(`
          INSERT INTO tool_orchestrator (tool_id, is_active, task_description, task_description_ar, cost_per_usage)
          VALUES ($1, true, $2, $3, $4)
          ON CONFLICT (tool_id) DO UPDATE SET
            task_description = EXCLUDED.task_description,
            task_description_ar = EXCLUDED.task_description_ar,
            is_active = COALESCE(tool_orchestrator.is_active, EXCLUDED.is_active),
            cost_per_usage = COALESCE(tool_orchestrator.cost_per_usage, EXCLUDED.cost_per_usage)
        `, [tool.id, (tool as any).directiveEn || tool.desc, (tool as any).directiveAr || tool.descAr, tool.cost]);
      }

    console.log('[Orchestrator] Sovereign tool synchronization complete. (Zero-Hardcoding Compliance)');
    
    // Emergency Patch: Fix problematic or hallucinated models that cause 404s
    await pool.query(`
      UPDATE tool_orchestrator 
      SET primary_provider = 'google', primary_model = 'gemini-1.5-flash',
          fallback1_provider = 'google', fallback1_model = 'gemini-1.5-flash'
      WHERE (primary_model LIKE '%gemini-2.5%' OR primary_model LIKE '%audio-preview%')
      OR (tool_id = 'canvas' AND (primary_model = '' OR primary_model IS NULL OR primary_model LIKE '%gemini-2.5%'))
    `);
    
    // Also check fallbacks specifically
    await pool.query(`
      UPDATE tool_orchestrator 
      SET fallback1_provider = 'google', fallback1_model = 'gemini-1.5-flash'
      WHERE fallback1_model LIKE '%gemini-2.5%' OR fallback1_model LIKE '%audio-preview%';
    `);

    // Ensure Sovereign Memory has a reliable default to prevent startup breakage
    await pool.query(`
      UPDATE tool_orchestrator 
      SET primary_provider = 'google', primary_model = 'gemini-1.5-flash', is_active = true
      WHERE tool_id = 'sovereign_memory' AND (primary_model IS NULL OR primary_model = '')
    `);
  } catch (e) {
    console.warn('[Orchestrator] Sovereign sync skipped: Table not ready or constraint hit.');
  }
}


async function runSystemMaintenance() {
  console.log('[Maintenance] 🧹 Starting sovereign system maintenance routine...');
  try {
    // 1. Archive/Prune old usage data (Older than 90 days)
    const pruneUsage = await pool.query(`
      DELETE FROM user_usage 
      WHERE usage_date < CURRENT_DATE - INTERVAL '90 days'
    `);

    const pruneActivity = await pool.query(`
      DELETE FROM user_activity_logs
      WHERE created_at < CURRENT_DATE - INTERVAL '90 days'
    `);

    const pruneSystemLogs = await pool.query(`
      DELETE FROM system_logs
      WHERE created_at < CURRENT_DATE - INTERVAL '90 days'
    `);

    const pruneSecurityAlerts = await pool.query(`
      DELETE FROM security_alerts
      WHERE created_at < CURRENT_DATE - INTERVAL '90 days'
    `);

    console.log(`[Maintenance] Pruned ${pruneUsage.rowCount} usage, ${pruneActivity.rowCount} activity, ${pruneSystemLogs.rowCount} system logs, and ${pruneSecurityAlerts.rowCount} security alerts.`);

    // 2. Clear System Caches & In-Memory Logic
    console.log('[Maintenance] ♻️ Clearing session caches and in-memory optimizations...');
    // We don't clear userSockets as they are live, but we could prune stale ones if tracked.
    // Proactive reset of API budgets for all providers
    await pool.query(`
      UPDATE api_keys_vault 
      SET used_today = 0, last_reset_date = CURRENT_DATE 
      WHERE last_reset_date < CURRENT_DATE
    `);

    // 3. Security Guard: Monitor Suspicious Activity
    console.log('[Maintenance] 🛡️ Auditing system for suspicious usage patterns...');
    
    // Pattern A: High-frequency bursts (Users with > 500 actions in the last 24 hours)
    const burstsRes = await pool.query(`
      SELECT user_id, COUNT(*) as action_count
      FROM user_activity_logs
      WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
      GROUP BY user_id
      HAVING COUNT(*) > 500
    `);

    for (const suspect of burstsRes.rows) {
      await pool.query(`
        INSERT INTO security_alerts (user_id, alert_type, severity, description)
        VALUES ($1, 'usage_anomaly', 'high', $2)
      `, [suspect.user_id, `User detected with high frequency usage: ${suspect.action_count} actions in 24h.`]);
      console.warn(`[SecurityGuard] High usage anomaly detected for User ${suspect.user_id}`);
    }

    // Pattern B: Cross-reference Quotas (The "Hacker" Check)
    // Find users who have daily usage > 120% of their plan limit
    const quotaLeaks = await pool.query(`
      SELECT u.id as user_id, u.email, uu.tool_id, uu.usage_count, ((p.limits->uu.tool_id->>'daily'))::int as daily_limit
      FROM users u
      JOIN user_usage uu ON u.id = uu.user_id
      JOIN subscriptions s ON u.id = s.user_id
      JOIN plans p ON s.plan_id = p.id
      WHERE uu.usage_date = CURRENT_DATE
      AND s.status = 'active'
      AND (p.limits->uu.tool_id->>'daily') IS NOT NULL
      AND (p.limits->uu.tool_id->>'daily') != 'unlimited'
      AND uu.usage_count > ((p.limits->uu.tool_id->>'daily'))::int * 1.2
    `);

    for (const leak of quotaLeaks.rows) {
      await pool.query(`
        INSERT INTO security_alerts (user_id, alert_type, severity, description)
        VALUES ($1, 'quota_bypass', 'critical', $2)
      `, [leak.user_id, `Quota bypass detected! Tool: ${leak.tool_id}, Usage: ${leak.usage_count}, Limit: ${leak.daily_limit}`]);
      console.error(`[SecurityGuard] CRITICAL: Quota bypass detected for ${leak.email} (Tool: ${leak.tool_id})`);
    }

    // Pattern C: Ledger Integrity Check
    console.log('[Maintenance] 💰 Auditing financial ledger integrity...');
    const rogueWallets = await ledgerPool.query(`
      SELECT w.id, w.user_id, w.balance, COALESCE(SUM(lt.amount), 0) as expected_balance
      FROM wallets w
      LEFT JOIN ledger_transactions lt ON w.id = lt.wallet_id
      GROUP BY w.id, w.user_id, w.balance
      HAVING ABS(w.balance - COALESCE(SUM(lt.amount), 0)) > 0.01
    `);

    if (rogueWallets.rows.length > 0) {
      console.error(`[SecurityGuard] 🚨 Financial Discrepancy detected in ${rogueWallets.rows.length} wallets!`);
      for (const rogue of rogueWallets.rows) {
        await pool.query(`
          INSERT INTO security_alerts (user_id, alert_type, severity, description, metadata)
          VALUES ($1, 'ledger_discrepancy', 'critical', $2, $3)
        `, [rogue.user_id, `Wallet balance mismatch detected. Actual: ${rogue.balance}, Expected: ${rogue.expected_balance}`, JSON.stringify(rogue)]);
      }
    }

    // 4. Prune old system records (Older than 30 days for logs, 60 days for alerts)
    const pruneLogs = await pool.query(`
      DELETE FROM system_logs 
      WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '30 days'
    `);
    const pruneAlerts = await pool.query(`
      DELETE FROM security_alerts 
      WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '60 days'
    `);
    const pruneNotifs = await pool.query(`
      DELETE FROM notifications 
      WHERE (is_read = true AND created_at < CURRENT_TIMESTAMP - INTERVAL '7 days')
      OR (created_at < CURRENT_TIMESTAMP - INTERVAL '30 days')
    `);

    console.log(`[Maintenance] ✅ Sovereign Maintenance & Security Audit complete. Pruned ${pruneLogs.rowCount} logs, ${pruneAlerts.rowCount} alerts, and ${pruneNotifs.rowCount} notifications.`);
  } catch (err) {
    console.error('[Maintenance] ❌ Maintenance failed:', err);
  }
}

async function startServer() {
  console.log('[Server] startServer() called. Initializing app...');
  
  const app = express();
  const httpServer = createServer(app);
  
  // Initialize Socket.io early
  io = new Server(httpServer, {
    cors: { origin: "*" }
  });

  // --- Middleware ---
  app.use((req, res, next) => {
    // Highly permissive CSP for AI Studio preview environment
    res.setHeader(
      'Content-Security-Policy',
      "default-src * 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; script-src * 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src * 'self' 'unsafe-inline'; img-src * 'self' data: blob:; connect-src * 'self' 'unsafe-inline' 'unsafe-eval' blob: ws: wss:; frame-ancestors * 'self';"
    );
    next();
  });
  
  app.use(cors({
    origin: (origin, callback) => {
      // Allow all origins, including null (for data/file URIs if needed)
      callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
  }));

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  app.use((req, res, next) => {
    if (req.url.startsWith('/api')) {
      console.log(`[API Request] ${req.method} ${req.url}`);
    }
    next();
  });

  // Health check early
  app.get('/api/ping', (req, res) => res.json({ status: 'early_ok', time: new Date().toISOString() }));

  // Global Error Handlers for Sovereignty
  process.on('uncaughtException', (err) => {
    console.error(`[FATAL] Uncaught Exception at ${new Date().toISOString()}:`, err);
    // Keep server alive if possible in dev
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error(`[FATAL] Unhandled Rejection at ${new Date().toISOString()}:`, reason);
  });

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('YOUR_MIN_64_CHAR')) {
    console.warn(' [WARNING] 🛡️ SYSTEM SECURITY: JWT_SECRET is missing or using placeholder.');
    console.warn(' [NOTICE] Sessions may not be persistent or secure until JWT_SECRET is set in environment.');
    // Set a runtime fallback to prevent crashes if not set
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'sovereign_fallback_secure_secret_2026_!#@';
  }
  
  try {
    // 0. Ensure environment variables and databases are ready
    await runDatabaseMigrations();
    
    // Master Sync: Ensure core orchestrator tools are seeded before processing traffic
    await initDb();
    await monitorDatabases();
    await proactiveOrchestratorSync();
    await syncSystemTemplates();
    await refreshCachedAppName();
    
    // --- SYSTEM ORCHESTRATION & MAINTENANCE ---
    // Start maintenance in background to not block gateway boot
    runSystemMaintenance().catch(e => console.error('[Startup] Deferred maintenance failed:', e));
    
    cron.schedule('0 4 1 * *', async () => {
      console.log('[Cron] 🕒 Triggering monthly Sovereign Memory consolidation...');
      await consolidateAllUserMemories();
    });

    cron.schedule('0 3 * * *', async () => {
      console.log('[Cron] 🕒 Triggering daily master maintenance routine...');
      await runSystemMaintenance();
    });

    cron.schedule('*/5 * * * *', async () => {
      await monitorDatabases();
    });

    cron.schedule('5 3 * * *', async () => {
      console.log('[Cron] 🔍 Checking for subscriptions expiring in 3 days...');
      try {
        const expiringRes = await pool.query(`
          SELECT s.user_id, u.email, u.name, u.language, p.name_en, p.name_ar, s.current_period_end 
          FROM subscriptions s
          JOIN users u ON s.user_id = u.id
          JOIN plans p ON s.plan_id = p.id
          WHERE s.status = 'active' 
          AND s.current_period_end BETWEEN CURRENT_TIMESTAMP + INTERVAL '2 days' AND CURRENT_TIMESTAMP + INTERVAL '3 days'
          AND p.name_en != 'Free Plan'
        `);

        for (const sub of expiringRes.rows) {
          const titleEn = 'Subscription Renewal Reminder';
          const titleAr = 'تذكير بتجديد الاشتراك';
          const msgEn = `Your ${sub.name_en} subscription will expire/renew in 3 days (on ${new Date(sub.current_period_end).toLocaleDateString()}). Please ensure your balance covers the renewal.`;
          const msgAr = `سيتم تجديد/انتهاء اشتراكك في ${sub.name_ar} خلال 3 أيام (بتاريخ ${new Date(sub.current_period_end).toLocaleDateString()}). يرجى التأكد من توفر رصيد كافٍ.`;

          await sendNotification(sub.user_id, 'system', titleEn, titleAr, msgEn, msgAr);
        }
      } catch (err) {
        console.error('[Cron] Error checking expiring subscriptions:', err);
      }
    });

    cron.schedule('0 * * * *', async () => {
      try {
        const expiredRes = await pool.query(`
          UPDATE subscriptions 
          SET status = 'expired', updated_at = CURRENT_TIMESTAMP 
          WHERE status = 'active' 
          AND current_period_end < CURRENT_TIMESTAMP
          AND stripe_subscription_id IS NULL
          RETURNING user_id
        `);
        if (expiredRes.rowCount && expiredRes.rowCount > 0) {
          for (const row of expiredRes.rows) {
            await sendNotification(row.user_id, 'system', 'Subscription Expired', 'انتهى الاشتراك', 'Your subscription has expired due to balance limits or period end.', 'انتهى اشتراكك بسبب انتهاء الفترة أو حدود الرصيد.');
          }
        }
      } catch (err) {
        console.error('[Cron] Error cleaning up expired subscriptions:', err);
      }
    });
    
    console.log('[Server] 🚀 Sovereignty Initialized: DB, Orchestrator, Templates, and Cron Maintenance active.');
  } catch (syncErr) {
    console.error('[Server] Initialization failure (System is running in Degraded Mode):', syncErr);
    // Do NOT exit(1); instead, allow the server to remain alive so it can show errors or serve the frontend
  }

  async function consolidateAllUserMemories() {
    console.log('[SystemMaintenance] 🧠 Beginning Global Memory Consolidation Protocol...');
    try {
      const { rows: users } = await pool.query('SELECT id FROM users');
      
      // Fetch Orchestrator config for Memory Tool
      const { rows: toolRows } = await pool.query(
        "SELECT primary_model, primary_provider FROM tool_orchestrator WHERE tool_id = 'sovereign_memory' AND is_active = true LIMIT 1"
      );
      
      if (toolRows.length === 0 || !toolRows[0].primary_model) {
        console.warn('[MemoryConsolidation] 🛡️ Orchestrator not configured for Memory Synthesis. Skipping.');
        return;
      }

      const synthesisModel = toolRows[0].primary_model;
      const synthesisProvider = toolRows[0].primary_provider || 'google';
      let synthesisKey = '';

      const { rows: keyRows } = await pool.query(
         "SELECT encrypted_key FROM api_keys_vault WHERE provider = $1 LIMIT 1",
         [synthesisProvider]
      );
      if (keyRows.length > 0) {
         synthesisKey = decrypt(keyRows[0].encrypted_key);
      } else {
         // Fallback to google
         const { rows: backupKey } = await pool.query("SELECT encrypted_key FROM api_keys_vault WHERE provider = 'google' LIMIT 1");
         if (backupKey.length > 0) synthesisKey = decrypt(backupKey[0].encrypted_key);
      }

      if (!synthesisKey) {
        console.warn('[MemoryConsolidation] 🛡️ No API key available for synthesis. Skipping.');
        return;
      }

      for (const u of users) {
        const { rows: countRows } = await pool.query('SELECT COUNT(*) FROM chat_memories WHERE user_id = $1', [u.id]);
        const count = parseInt(countRows[0].count);
        
        // We only consolidate if user has significant memory buildup (e.g. > 20)
        if (count > 20) {
          console.log(`[MemoryConsolidation] 🔬 Processing user ${u.id} (${count} entries)`);
          const { rows: memories } = await pool.query(
            'SELECT id, fact FROM chat_memories WHERE user_id = $1 ORDER BY created_at ASC LIMIT 15',
            [u.id]
          );
          
          if (memories.length >= 10) {
            const factsStr = memories.map(m => `- ${m.fact}`).join('\n');
            const prompt = `
              [TASK: SOVEREIGN_MEMORY_COMPRESSION]
              Analyze these legacy facts and compress them into 1-2 high-density, professional insights that preserve the core context for future AI interactions.
              
              INPUT_FACTS:
              ${factsStr}
              
              OUTPUT ONLY THE COMPRESSED FACTS, ONE PER LINE. MAX 2.
            `;
            
            try {
              const synthesisResult = await callAIProvider(
                synthesisProvider, synthesisModel, synthesisKey, 
                "Monthly Memory Consolidation", factsStr + prompt, undefined, undefined, {}
              );
              
              const newFacts = typeof synthesisResult === 'string' 
                ? synthesisResult.trim().split('\n').map(f => f.trim()).filter(f => f.length > 10).slice(0, 2)
                : [];
                
              if (newFacts.length > 0) {
                await pool.query('BEGIN');
                const idsToDelete = memories.map(m => m.id);
                await pool.query('DELETE FROM chat_memories WHERE id = ANY($1)', [idsToDelete]);
                
                for (const f of newFacts) {
                  await pool.query(
                    'INSERT INTO chat_memories (user_id, fact, category, source) VALUES ($1, $2, $3, $4)',
                    [u.id, f, 'consolidated_monthly', 'maintenance_engine']
                  );
                }
                await pool.query('COMMIT');
                console.log(`[MemoryConsolidation] ✅ User ${u.id} optimized. Reduced ${idsToDelete.length} to ${newFacts.length}.`);
              }
            } catch (err) {
              console.error(`[MemoryConsolidation] ❌ Failed to consolidate for user ${u.id}:`, err);
              await pool.query('ROLLBACK');
            }
          }
        }
      }
    } catch (error) {
      console.error('[MemoryConsolidation] CRITICAL FAILURE:', error);
    }
  }

  // --- Real-time Socket helper ---
  const pushNotificationToUser = (userId: number, notification: any) => {
    const socketIds = userSockets.get(userId);
    if (socketIds && socketIds.length > 0) {
      socketIds.forEach(sid => {
        io.to(sid).emit("new_notification", notification);
      });
    }
  };

  // Helper: Immediate User Notification
  const sendNotification = async (userId: number, type: string, titleEn: string, titleAr: string, msgEn: string, msgAr: string) => {
    try {
      const result = await pool.query(`
        INSERT INTO notifications (user_id, title_en, title_ar, message_en, message_ar, type)
        VALUES ($1, $2, $3, $4, $5, 'system')
        RETURNING *
      `, [userId, titleEn, titleAr, msgEn, msgAr]);
      
      if (result.rows.length > 0) {
        pushNotificationToUser(userId, result.rows[0]);
      }
    } catch (err) {
      console.error('Error in sendNotification:', err);
    }
  };
  
  const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      
      if (!token) {
        console.warn(`[Auth] No token provided for ${req.method} ${req.url}`);
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      jwt.verify(token, process.env.JWT_SECRET as string, async (err, user) => {
        if (err) {
          console.error(`[Auth] JWT Verification Error for ${req.url}:`, err.message);
          res.status(403).json({ error: 'Forbidden', message: err.message });
          return;
        }
        const userPayload = user as any;
        
        try {
          const userCheck = await pool.query('SELECT status FROM users WHERE id = $1', [userPayload.id]);
          if (userCheck.rows.length > 0 && userCheck.rows[0].status === 'suspended') {
            res.status(403).json({ 
              error: 'Account Suspended', 
              message: 'Your account has been suspended by the administration. Please contact support.' 
            });
            return;
          }
        } catch (dbErr) {
          console.error('[Security] Failed to verify user status:', dbErr);
        }

        (req as any).user = userPayload;
        
        if (userPayload && userPayload.id) {
          pool.query('UPDATE users SET last_active_at = CURRENT_TIMESTAMP WHERE id = $1', [userPayload.id])
            .catch(e => console.error('Error updating last_active_at:', e));
        }
        
        next();
      });
    } catch (error) {
      console.error('Auth Token Error:', error);
      res.status(500).json({ error: 'Internal Server Error in Auth' });
    }
  };

  const authenticateAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      authenticateToken(req, res, async () => {
        try {
          const userPayload = (req as any).user;
          if (!userPayload) return res.status(401).json({ error: 'Auth required' });

          const dbRes = await pool.query('SELECT role FROM users WHERE id = $1', [userPayload.id]);
          const currentRole = dbRes.rows[0]?.role || 'user';
          const adminEmail = process.env.VITE_ADMIN_EMAIL || 'qoomre@gmail.com';

          if (!['admin', 'support', 'elite'].includes(currentRole) && userPayload.email !== adminEmail) {
            await logSecurityAlert(userPayload?.id || null, 'unauthorized_access', 'high', `Unauthorized attempt to access admin route: ${req.path}`, { path: req.path }, req);
            res.status(403).json({ error: 'Admin access required' });
            return;
          }
          if ((req as any).user) (req as any).user.role = currentRole;
          next();
        } catch (error) {
          console.error('Admin Auth Error:', error);
          res.status(500).json({ error: 'Internal Server Error in Admin Auth' });
        }
      });
    } catch (error) {
      console.error('Admin Auth Wrapper Error:', error);
      res.status(500).json({ error: 'Internal Server Error in Admin Auth Wrapper' });
    }
  };

  app.get('/api/mail-services-v3/config', authenticateAdmin, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM email_settings LIMIT 1');
      if (result.rows.length === 0) {
        return res.json({
          mailer_type: 'smtp',
          smtp_host: '',
          smtp_port: '587',
          smtp_encryption: 'tls',
          smtp_username: '',
          smtp_password: '',
          sender_name: 'Support',
          sender_email: ''
        });
      }
      const settings = result.rows[0];
      if (settings.smtp_password) {
        try {
          settings.smtp_password = decrypt(settings.smtp_password);
        } catch (e) {
          console.error('Failed to decrypt SMTP password');
          settings.smtp_password = '';
        }
      }
      res.json(settings);
    } catch (error) {
      console.error('Error fetching email settings:', error);
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  });

  // Update Email Settings
  app.put('/api/mail-services-v3/config', authenticateAdmin, async (req, res) => {
    const { mailer_type, smtp_host, smtp_port, smtp_encryption, smtp_username, smtp_password, sender_name, sender_email, status } = req.body;
    try {
      let encryptedPassword = '';
      if (smtp_password) {
        encryptedPassword = encrypt(smtp_password);
      } else {
        const existing = await pool.query('SELECT smtp_password FROM email_settings LIMIT 1');
        if (existing.rows.length > 0) {
          encryptedPassword = existing.rows[0].smtp_password;
        }
      }

      await pool.query(`
        INSERT INTO email_settings (id, mailer_type, smtp_host, smtp_port, smtp_encryption, smtp_username, smtp_password, sender_name, sender_email, status)
        VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          mailer_type = EXCLUDED.mailer_type,
          smtp_host = EXCLUDED.smtp_host,
          smtp_port = EXCLUDED.smtp_port,
          smtp_encryption = EXCLUDED.smtp_encryption,
          smtp_username = EXCLUDED.smtp_username,
          smtp_password = EXCLUDED.smtp_password,
          sender_name = EXCLUDED.sender_name,
          sender_email = EXCLUDED.sender_email,
          status = EXCLUDED.status,
          updated_at = CURRENT_TIMESTAMP
      `, [mailer_type, smtp_host, smtp_port, smtp_encryption, smtp_username, encryptedPassword, sender_name, sender_email, status || 'active']);
      
      res.json({ success: true, message: 'Settings updated successfully' });
    } catch (error: any) {
      console.error('Error updating email settings:', error);
      res.status(500).json({ error: 'Failed to update settings', details: error.message });
    }
  });

  // Get Email Templates
  app.get('/api/mail-services-v3/templates', authenticateAdmin, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM email_templates ORDER BY type DESC, id ASC');
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching email templates:', error);
      res.status(500).json({ error: 'Failed to fetch templates' });
    }
  });

  // Create or Update Email Template
  app.post('/api/mail-services-v3/templates', authenticateAdmin, async (req, res) => {
    const { id, name, subject_en, subject_ar, body_en, body_ar, type } = req.body;
    try {
      if (id) {
        const result = await pool.query(
          `UPDATE email_templates 
           SET name = $1, subject_en = $2, subject_ar = $3, body_en = $4, body_ar = $5, type = $6, updated_at = CURRENT_TIMESTAMP
           WHERE id = $7 RETURNING *`,
          [name, subject_en, subject_ar, body_en, body_ar, type || 'custom', id]
        );
        res.json(result.rows[0]);
      } else {
        const result = await pool.query(
          `INSERT INTO email_templates (name, subject_en, subject_ar, body_en, body_ar, type)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [name, subject_en, subject_ar, body_en, body_ar, type || 'custom']
        );
        res.json(result.rows[0]);
      }
    } catch (error) {
      console.error('Error saving email template:', error);
      res.status(500).json({ error: 'Failed to save template' });
    }
  });

  // Delete Email Template
  app.delete('/api/mail-services-v3/templates/:id', authenticateAdmin, async (req, res) => {
    try {
      const template = await pool.query('SELECT type FROM email_templates WHERE id = $1', [req.params.id]);
      if (template.rows.length > 0 && template.rows[0].type === 'system') {
        return res.status(400).json({ error: 'Cannot delete system templates' });
      }
      await pool.query('DELETE FROM email_templates WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting email template:', error);
      res.status(500).json({ error: 'Failed to delete template' });
    }
  });

  // Test Email Connection
  app.post('/api/mail-services-v3/verify', authenticateAdmin, async (req, res) => {
    const { smtp_host, smtp_port, smtp_username, smtp_password } = req.body;
    if (!smtp_host || !smtp_port) {
      return res.status(400).json({ error: 'SMTP Host and Port are required' });
    }

    try {
      // If password is not provided, try to get stored password
      let finalPassword = smtp_password;
      if (!finalPassword) {
        const stored = await pool.query('SELECT smtp_password FROM email_settings LIMIT 1');
        if (stored.rows.length > 0 && stored.rows[0].smtp_password) {
          finalPassword = decrypt(stored.rows[0].smtp_password);
        }
      }

      const transportOptions: any = {
        host: smtp_host,
        port: parseInt(smtp_port),
        secure: parseInt(smtp_port) === 465,
        auth: {
          user: smtp_username,
          pass: finalPassword,
        },
        timeout: 10000 // 10s timeout
      };

      const transporter = nodemailer.createTransport(transportOptions);

      await transporter.verify();
      
      // Update last_verified_at 
      await pool.query('UPDATE email_settings SET last_verified_at = CURRENT_TIMESTAMP, status = \'active\' WHERE id = 1');

      res.json({ success: true, message: 'SMTP connection verified successfully' });
    } catch (error: any) {
      console.error('[SMTP TEST ERROR]:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || 'SMTP Verification Failed',
        code: error.code
      });
    }
  });

  // Import Default Templates
  app.post('/api/mail-services-v3/sync', authenticateAdmin, async (req, res) => {
    try {
      await syncSystemTemplates();
      const result = await pool.query('SELECT * FROM email_templates ORDER BY type DESC, id ASC');
      res.json(result.rows);
    } catch (error) {
      console.error('Error importing system templates:', error);
      res.status(500).json({ error: 'Failed to import templates' });
    }
  });

  // Add feedback column to messages if missing
  try {
    await pool.query('ALTER TABLE messages ADD COLUMN IF NOT EXISTS feedback SMALLINT DEFAULT 0');
  } catch (e) {
    console.error('[InitDB] Error ensuring feedback column in messages:', e);
  }

  // --- Campaign Management Routes ---
  
  // Get Campaign History
  app.get('/api/mail-services-v3/campaigns', authenticateAdmin, async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT c.*, t.name as template_name 
        FROM campaigns c
        LEFT JOIN email_templates t ON c.template_id = t.id
        ORDER BY c.created_at DESC
      `);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
  });

  // Send New Campaign (Mass Email)
  app.post('/api/mail-services-v3/campaigns/send', authenticateAdmin, async (req, res) => {
    const { name, template_id, target_criteria } = req.body;
    const adminId = (req as any).user.id;

    if (!name || !template_id || !target_criteria) {
      return res.status(400).json({ error: 'Name, template_id, and target_criteria are required' });
    }

    try {
      // 1. Resolve users based on criteria
      let query = `
        SELECT u.id, u.email, u.name, u.created_at, u.last_login_at,
               s.status as subscription_status, s.plan_id
        FROM users u
        LEFT JOIN subscriptions s ON u.id = s.user_id
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramIndex = 1;

      if (target_criteria.plan && target_criteria.plan !== 'any') {
        query += ` AND s.plan_idForEmailCampaign = $${paramIndex}`;
        // Note: The UI will send plan id. I'll fix the logic below to handle the actual criteria.
        // Actually I should just use the target_criteria directly in building the query.
      }

      // Re-building logic properly
      query = `
        SELECT u.id, u.email, u.name, u.created_at, u.last_login_at,
               s.status as subscription_status, s.plan_id
        FROM users u
        LEFT JOIN subscriptions s ON u.id = s.user_id
        WHERE 1=1
      `;
      
      if (target_criteria.plan && target_criteria.plan !== 'any') {
        query += ` AND s.plan_id = $${paramIndex++}`;
        params.push(target_criteria.plan);
      }
      
      if (target_criteria.status && target_criteria.status !== 'any') {
        query += ` AND s.status = $${paramIndex++}`;
        params.push(target_criteria.status);
      }
      
      if (target_criteria.kyc && target_criteria.kyc !== 'any') {
        if (target_criteria.kyc === 'verified') {
          query += ` AND u.kyc_status = 'verified'`;
        } else if (target_criteria.kyc === 'unverified') {
          query += ` AND u.kyc_status != 'verified'`;
        }
      }

      if (target_criteria.lastActiveDays) {
        query += ` AND u.last_login_at >= NOW() - INTERVAL '$${paramIndex++} days'`;
        params.push(target_criteria.lastActiveDays);
      }

      const usersResult = await pool.query(query, params);
      const targetUsers = usersResult.rows;

      if (targetUsers.length === 0) {
        return res.status(400).json({ error: 'No users found matching the selected criteria' });
      }

      const campaignRes = await pool.query(`
        INSERT INTO campaigns (name, template_id, target_criteria, total_recipients, status, created_at)
        VALUES ($1, $2, $3, $4, 'pending', CURRENT_TIMESTAMP)
        RETURNING id
      `, [name, template_id, JSON.stringify(target_criteria), targetUsers.length]);
      
      const campaignId = campaignRes.rows[0].id;

      const templateRes = await pool.query('SELECT * FROM email_templates WHERE id = $1', [template_id]);
      const template = templateRes.rows[0];

      res.json({ 
        success: true, 
        campaignId, 
        recipientsCount: targetUsers.length,
        message: 'Campaign processing started' 
      });

      (async () => {
        let successCount = 0;
        let failCount = 0;

        for (const user of targetUsers) {
          try {
            await sendSmartEmail(user.id, user.email, template.name, {
              userName: user.name || 'User',
              userEmail: user.email,
              planName: user.plan_name || 'Standard',
              appName: getAppName('en'),
              actionUrl: '/'
            }, 'en');
            successCount++;
          } catch (err) {
            console.error(`Failed to send campaign email to ${user.email}:`, err);
            failCount++;
          }
        }

        await pool.query(`
          UPDATE campaigns 
          SET status = 'sent', 
              success_count = $1, 
              fail_count = $2, 
              completed_at = CURRENT_TIMESTAMP 
          WHERE id = $3
        `, [successCount, failCount, campaignId]);

        await logSystemActivity(adminId, 'campaign_sent', `Campaign "${name}" completed: ${successCount} sent, ${failCount} failed`, { campaignId }, req as any);

      })();

    } catch (error) {
      console.error('Error sending campaign:', error);
      res.status(500).json({ error: 'Failed to initiate campaign' });
    }
  });

  // --- User Wallet & Ledger Routes ---
  app.get("/api/wallet", authenticateToken, async (req, res) => {
    try {
      let result;
      try {
        result = await ledgerPool.query('SELECT balance, usd_balance FROM wallets WHERE user_id = $1', [(req as any).user.id]);
      } catch (e) {
        result = await ledgerPool.query('SELECT balance, 0 as usd_balance FROM wallets WHERE user_id = $1', [(req as any).user.id]);
      }

      if (result.rows.length === 0) {
        let newWallet;
        try {
          newWallet = await ledgerPool.query('INSERT INTO wallets (user_id, balance, usd_balance) VALUES ($1, 0, 0) RETURNING balance, usd_balance', [(req as any).user.id]);
        } catch (e) {
          newWallet = await ledgerPool.query('INSERT INTO wallets (user_id, balance) VALUES ($1, 0) RETURNING balance', [(req as any).user.id]);
          newWallet.rows[0].usd_balance = 0;
        }
        return res.json(newWallet.rows[0]);
      }
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error fetching wallet:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post("/api/wallet/convert-points", authenticateToken, async (req, res) => {
    const { amountPoints } = req.body;
    const userId = (req as any).user.id;

    if (!amountPoints || isNaN(Number(amountPoints)) || Number(amountPoints) <= 0) {
      return res.status(400).json({ error: 'Invalid points amount' });
    }

    const client = await ledgerPool.connect();
    try {
      await client.query('BEGIN');

      const walletRes = await client.query('SELECT id, balance, usd_balance FROM wallets WHERE user_id = $1 FOR UPDATE', [userId]);
      if (walletRes.rows.length === 0 || parseFloat(walletRes.rows[0].balance) < amountPoints) {
        throw new Error('Insufficient points balance');
      }
      const walletId = walletRes.rows[0].id;

      const ecoRes = await client.query('SELECT conversion_rate FROM economy_settings LIMIT 1');
      const conversionRate = ecoRes.rows.length > 0 ? parseFloat(ecoRes.rows[0].conversion_rate) : 0.001;

      const usdAmount = amountPoints * conversionRate;

      await client.query('UPDATE wallets SET balance = balance - $1, usd_balance = usd_balance + $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3', [amountPoints, usdAmount, walletId]);

      await client.query(`
        INSERT INTO ledger_transactions (wallet_id, amount, transaction_type, description, status)
        VALUES ($1, $2, 'point_conversion', $3, 'success')
      `, [walletId, -amountPoints, `Converted ${amountPoints} points to $${usdAmount.toFixed(4)} USD`]);

      await client.query('COMMIT');
      res.json({ success: true, message: 'Points converted successfully', usdAmount });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Conversion Error:', error);
      res.status(400).json({ error: error.message || 'Points conversion failed' });
    } finally {
      client.release();
    }
  });

  app.get("/api/transactions", authenticateToken, async (req, res) => {
    try {
      const walletRes = await ledgerPool.query('SELECT id FROM wallets WHERE user_id = $1', [(req as any).user.id]);
      if (walletRes.rows.length === 0) return res.json([]);
      
      const result = await ledgerPool.query(`
        SELECT * FROM ledger_transactions 
        WHERE wallet_id = $1 
        ORDER BY created_at DESC 
        LIMIT 50
      `, [walletRes.rows[0].id]);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // --- Economy Routes ---
  app.get("/api/economy", async (req, res) => {
    try {
      if (!ledgerPool) {
        return res.json({
          welcome_bonus_points: 600,
          referral_bonus_points: 1000,
          min_withdrawal_cents: 2000,
          points_per_dollar: 1000,
          conversion_rate: 0.0010
        });
      }
      const result = await ledgerPool.query('SELECT * FROM economy_settings ORDER BY id DESC LIMIT 1');
      if (result.rows.length === 0) {
        return res.json({
          welcome_bonus_points: 600,
          referral_bonus_points: 1000,
          min_withdrawal_cents: 2000,
          points_per_dollar: 1000,
          conversion_rate: 0.0010
        });
      }
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error fetching economy settings:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post("/api/wallet/withdraw", authenticateToken, async (req, res) => {
    const { amountUSD, method, details } = req.body;
    const userId = (req as any).user.id;

    if (!amountUSD || isNaN(parseFloat(amountUSD)) || parseFloat(amountUSD) <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const amount = parseFloat(amountUSD);
    const ledgerClient = await ledgerPool.connect();
    try {
      const ecoRes = await ledgerClient.query('SELECT min_withdrawal_cents, points_per_dollar FROM economy_settings LIMIT 1');
      const settings = ecoRes.rows.length > 0 ? ecoRes.rows[0] : { min_withdrawal_cents: 2000, points_per_dollar: 1000 };
      const minWithdrawalUSD = settings.min_withdrawal_cents / 100;
      
      if (amount < minWithdrawalUSD) {
        return res.status(400).json({ error: `Minimum withdrawal is $${minWithdrawalUSD.toFixed(2)}` });
      }

      const pointsToDeduct = amount * settings.points_per_dollar;

      await ledgerClient.query('BEGIN');
      const walletRes = await ledgerClient.query('SELECT id, usd_balance FROM wallets WHERE user_id = $1 FOR UPDATE', [userId]);
      if (walletRes.rows.length === 0 || parseFloat(walletRes.rows[0].usd_balance) < amount) {
        await ledgerClient.query('ROLLBACK');
        return res.status(400).json({ error: 'Insufficient withdrawable balance' });
      }

      const walletId = walletRes.rows[0].id;
      await ledgerClient.query('UPDATE wallets SET usd_balance = usd_balance - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [amount, walletId]);
      
      await ledgerClient.query(`
        INSERT INTO ledger_transactions (wallet_id, amount, transaction_type, description, reference_id)
        VALUES ($1, $2, 'withdrawal_request', $3, $4)
      `, [walletId, -amount, `Withdrawal request for $${amount} via ${method}`, details]);

      await ledgerClient.query('COMMIT');
      res.json({ success: true });

      // Send Email
      const userRes = await pool.query('SELECT name, email FROM users WHERE id = $1', [userId]);
      if (userRes.rows.length > 0) {
        const user = userRes.rows[0];
        sendSmartEmail(userId, user.email, 'withdrawal_requested', {
          userName: user.name || 'User',
          amount: `$${amount.toFixed(2)}`,
          referenceId: details || 'N/A',
          appName: getAppName('en')
        }, 'en').catch(console.error);
      }

    } catch (error) {
      await ledgerClient.query('ROLLBACK');
      console.error('Withdrawal error:', error);
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      ledgerClient.release();
    }
  });

  // --- KYC Routes ---
  app.post("/api/kyc/submit", authenticateToken, async (req, res) => {
    try {
      const { fullName, selfie } = req.body;
      const userId = (req as any).user.id;

      if (!fullName || !selfie) {
        return res.status(400).json({ error: 'Full name and selfie are required' });
      }

      await pool.query(
        'UPDATE users SET kyc_status = $1, kyc_selfie = $2, kyc_full_name = $3 WHERE id = $4', 
        ['pending', selfie, fullName, userId]
      );

      res.json({ success: true, message: 'KYC request submitted successfully' });
      
      await logSystemActivity(userId, 'kyc_submission', `User ${fullName} submitted KYC`, {}, req);

      const userRes = await pool.query('SELECT name, email FROM users WHERE id = $1', [userId]);
      if (userRes.rows.length > 0) {
        const user = userRes.rows[0];
        sendSmartEmail(userId, user.email, 'kyc_submitted', {
          userName: user.name || 'User',
          appName: getAppName('en')
        }, 'en').catch(console.error);
      }

    } catch (error) {
      console.error('Error submitting KYC:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // --- User Profile Routes ---
  app.get("/api/user/profile", authenticateToken, async (req, res) => {
    try {
      // Strictly using 'pool' for Core DB (Users & Subscriptions)
      const result = await pool.query(`
        SELECT u.id, u.email, u.name, u.avatar, u.role, u.kyc_status, u.custom_instructions, u.language,
               s.status as sub_status, s.billing_period, s.current_period_end, s.last_period_start, s.created_at as sub_created_at,
               p.name_en as plan_name_en, p.name_ar as plan_name_ar, p.limits as plan_limits, p.color as plan_color
        FROM users u
        LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
        LEFT JOIN plans p ON s.plan_id = p.id
        WHERE u.id = $1
      `, [(req as any).user.id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const user = result.rows[0];

      const today = new Date().toISOString().split('T')[0];
      const monthStart = new Date();
      monthStart.setDate(1);
      const monthStartStr = monthStart.toISOString().split('T')[0];

      const dailyUsageResult = await pool.query(`
        SELECT tool_id, usage_count 
        FROM user_usage 
        WHERE user_id = $1 AND usage_date = CURRENT_DATE
      `, [user.id]);

      const monthlyUsageResult = await pool.query(`
        SELECT tool_id, SUM(usage_count) as total
        FROM user_usage
        WHERE user_id = $1 AND usage_date >= $2
        GROUP BY tool_id
      `, [user.id, monthStartStr]);

      const usageStats: Record<string, { daily: number, monthly: number }> = {};
      
      dailyUsageResult.rows.forEach(row => {
        if (!usageStats[row.tool_id]) usageStats[row.tool_id] = { daily: 0, monthly: 0 };
        usageStats[row.tool_id].daily = row.usage_count;
      });

      monthlyUsageResult.rows.forEach(row => {
        if (!usageStats[row.tool_id]) usageStats[row.tool_id] = { daily: 0, monthly: 0 };
        usageStats[row.tool_id].monthly = parseInt(row.total);
      });
      
      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        language: user.language,
        kyc_status: user.kyc_status,
        custom_instructions: user.custom_instructions,
        subscription: user.sub_status ? { 
          status: user.sub_status, 
          plan_name_en: user.plan_name_en,
          plan_name_ar: user.plan_name_ar,
          billing_period: user.billing_period,
          current_period_end: user.current_period_end,
          last_period_start: user.last_period_start,
          created_at: user.sub_created_at,
          limits: user.plan_limits,
          plan_color: user.plan_color
        } : null,
        usageStats
      });
    } catch (error) {
      console.error('Error fetching user profile from Core DB:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.put("/api/user/profile", authenticateToken, async (req, res) => {
    try {
      const { name, avatar, custom_instructions, memory, language } = req.body;
      const userId = (req as any).user.id;

      const result = await pool.query(
        'UPDATE users SET name = $1, avatar = $2, custom_instructions = $3, memory = $4, language = $5 WHERE id = $6 RETURNING id, email, name, avatar, provider, role, language, kyc_required, kyc_status, custom_instructions, memory',
        [name, avatar, custom_instructions, memory, language || 'en', userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ success: true, user: result.rows[0] });
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post("/api/user/avatar", authenticateToken, upload.single('file'), handleMulterError, async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      const fileUrl = `/uploads/${req.file.filename}`;
      res.json({ success: true, url: fileUrl });
    } catch (error) {
      console.error('Avatar upload error:', error);
      res.status(500).json({ error: 'Upload failed' });
    }
  });

  app.get("/api/admin/databases/registry", authenticateAdmin, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM db_connections_registry ORDER BY id ASC');
      const decryptedRows = result.rows.map(row => ({
        ...row,
        password: row.password ? decrypt(row.password) : null,
        connection_string: row.connection_string ? decrypt(row.connection_string) : null
      }));
      res.json(decryptedRows);
    } catch (error) {
      console.error('Error fetching database registry:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post("/api/admin/databases/registry", authenticateAdmin, async (req, res) => {
    try {
      const { id, type, host, port, db_name, username, password, connection_string, ssl_mode, pool_size, is_active } = req.body;
      
      const encryptedPassword = password ? encrypt(password) : null;
      const encryptedConnString = connection_string ? encrypt(connection_string) : null;

      // Upsert logic for registry
      await pool.query(`
        INSERT INTO db_connections_registry (id, type, host, port, db_name, username, password, connection_string, ssl_mode, pool_size, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO UPDATE SET
          type = EXCLUDED.type,
          host = EXCLUDED.host,
          port = EXCLUDED.port,
          db_name = EXCLUDED.db_name,
          username = EXCLUDED.username,
          password = COALESCE(EXCLUDED.password, db_connections_registry.password),
          connection_string = COALESCE(EXCLUDED.connection_string, db_connections_registry.connection_string),
          ssl_mode = EXCLUDED.ssl_mode,
          pool_size = EXCLUDED.pool_size,
          is_active = EXCLUDED.is_active,
          updated_at = CURRENT_TIMESTAMP
      `, [id, type, host, port, db_name, username, encryptedPassword, encryptedConnString, ssl_mode, pool_size, is_active]);

      res.json({ success: true });
    } catch (error) {
      console.error('Error updating database registry:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // --- AI Generation Engine (The Orchestrator) ---

async function callAIProvider(
  provider: string, 
  model: string, 
  apiKey: string, 
  prompt: string, 
  systemPrompt?: string, 
  onChunk?: (chunk: string) => void, 
  history: { role: string, content: string }[] = [],
  options: { 
    userId?: number,
    chatId?: number,
    fileData?: { data: string, name: string, type: string }, 
    isImageGeneration?: boolean,
    supportedMethods?: string[]
  } = {}
) {
  const normProvider = provider.toLowerCase().replace(/\s+/g, '');
  
  // Clean individual API key (Remove Bearer prefix and trim whitespace)
  const cleanApiKey = apiKey ? apiKey.trim().replace(/^Bearer\s+/i, '') : '';
  if (!cleanApiKey) throw new Error(`No valid API key provided for ${provider}`);
  const messages: any[] = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  
  // Add history
  history.forEach(msg => {
    messages.push({ role: msg.role, content: msg.content });
  });

     // Handle file data generically for the provider
     let messageContent: any = prompt;
     if (options.fileData && options.fileData.data) {
        const mimeType = options.fileData.type || 'application/octet-stream';
        const base64Data = options.fileData.data;
        const fileName = options.fileData.name || 'file';
        const isImage = mimeType.startsWith('image/');
        const isVideo = mimeType.startsWith('video/');
        const isAudio = mimeType.startsWith('audio/');
        const isPdf = mimeType === 'application/pdf';
        
        if (isImage || isVideo || isAudio || isPdf) {
            messageContent = [
                { type: 'text', text: prompt },
                { 
                    type: isImage ? 'image' : (isVideo ? 'video' : (isAudio ? 'audio' : 'file')), 
                    mime_type: mimeType, 
                    data: base64Data,
                    name: fileName
                }
            ];
        } else {
            messageContent = prompt;
        }
     }
  
     // Add current prompt
     messages.push({ role: 'user', content: messageContent });



  let url = '';
  let headers: any = {
    'Content-Type': 'application/json'
  };
  let body: any = {};
  const isStreaming = !!onChunk;
  if (isStreaming) {
    headers['Accept'] = 'text/event-stream';
  }

  let processedMessages = messages;

  async function handleResponse(response: Response) {
    if (!response.ok) {
      const errorText = await response.text();
      let cleanMessage = errorText;
      try {
         const json = JSON.parse(errorText);
         cleanMessage = json.error?.message || json.message || errorText;
      } catch (e) {}
      
      throw new Error(`API Error (${response.status}): ${cleanMessage.substring(0, 500)}`);
    }

    if (isStreaming && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let resultText = '';
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;
            
            if (trimmedLine.startsWith('data: ')) {
              const dataStr = trimmedLine.substring(6);
              if (dataStr === '[DONE]') continue;

              try {
                const data = JSON.parse(dataStr);
                let chunk = '';
                
                if (normProvider === 'anthropic') {
                  if (data.type === 'content_block_delta' && data.delta?.text) chunk = data.delta.text;
                } else if (normProvider === 'gemini' || normProvider === 'google' || normProvider === 'googlegemini') {
                  if (data.candidates?.[0]?.content?.parts?.[0]?.text) chunk = data.candidates[0].content.parts[0].text;
                } else {
                  if (data.choices?.[0]?.delta?.content) chunk = data.choices[0].delta.content;
                }
                    
                if (chunk) {
                  resultText += chunk;
                  onChunk(chunk);
                }
              } catch (e) {}
            } else if (trimmedLine.startsWith('{')) {
              try {
                const data = JSON.parse(trimmedLine);
                const chunk = data.message?.content || data.response || '';
                if (chunk) {
                  resultText += chunk;
                  onChunk(chunk);
                }
              } catch (e) {}
            }
          }
        }
        return resultText;
      } finally {
        reader.releaseLock();
      }
    } else {
      const data = await response.json();
      if (normProvider === 'anthropic') {
        return data.content?.[0]?.text || '';
      } else if (normProvider === 'gemini' || normProvider === 'google' || normProvider === 'googlegemini') {
        let text = "";
        if (data.candidates?.[0]?.content?.parts) {
          for (const part of data.candidates[0].content.parts) {
            if (part.text) text += part.text;
            else if (part.inline_data && part.inline_data.mime_type.startsWith('audio/')) {
               const binaryBuffer = Buffer.from(part.inline_data.data, 'base64');
               const productionId = `SOV_GEN_${Date.now()}`;
               const fileName = `${productionId}.mp3`;
               const uploadDirFinal = path.join(process.cwd(), 'uploads');
               if (!existsSync(uploadDirFinal)) mkdirSync(uploadDirFinal, { recursive: true });
               const filePath = path.join(uploadDirFinal, fileName);
               await fs.writeFile(filePath, binaryBuffer);
               
               // Sovereign Audit: Log to database
               try {
                 const stats = await fs.stat(filePath);
                 await pool.query(`
                   INSERT INTO user_files (user_id, chat_id, file_name, file_url, file_size, mime_type, file_type, metadata)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 `, [
                   null, // We don't have user_id here easily without passing it through, but we can't easily change the signature of handleResponse
                   null, 
                   fileName, 
                   `/uploads/${fileName}`, 
                   stats.size, 
                   part.inline_data.mime_type, 
                   'generated_audio',
                   JSON.stringify({ native: true, production_id: productionId })
                 ]);
               } catch (dbErr) {
                 console.warn('[Production] DB Audit Failed for native audio:', dbErr);
               }

               text += `\n\n\`\`\`audio\n/uploads/${fileName}\n\`\`\``;
               console.log(`[Production] 🎻 Native Audio Detected & Stored: /uploads/${fileName}`);
            }
          }
        }
        return text || "";
      } else {
        return data.choices?.[0]?.message?.content || '';
      }
    }
  }

  switch (normProvider) {
    case 'openai':
    case 'deepseek':
    case 'perplexity':
      if (options.isImageGeneration && normProvider === 'openai') {
        url = 'https://api.openai.com/v1/images/generations';
        body = {
          model: model,
          prompt: prompt,
          n: 1,
          size: (options as any).size || '1024x1024'
        };
        headers['Authorization'] = `Bearer ${cleanApiKey}`;
        console.log(`[Orchestrator] 🎨 Triggering OpenAI Image Generation: ${model}`);
        const imgRes = await fetch(url, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(body)
        });
        const imgData = await imgRes.json();
        if (!imgRes.ok) throw new Error(`OpenAI Image Error: ${imgData.error?.message || 'Unknown'}`);
        return `![Generated Image](${imgData.data[0].url || imgData.data[0].b64_json})`;
      }
      
      if (normProvider === 'deepseek') {
        url = 'https://api.deepseek.com/chat/completions';
      } else if (normProvider === 'perplexity') {
        url = 'https://api.perplexity.ai/chat/completions';
      } else {
        url = 'https://api.openai.com/v1/chat/completions';
      }
      headers['Authorization'] = `Bearer ${cleanApiKey}`;
      console.log(`[DEBUG] ${normProvider.toUpperCase()} Request: Model='${model}', URL='${url}'`);
      
      const openAiMessages = processedMessages.map(m => {
        if (Array.isArray(m.content)) {
          return {
            role: m.role,
            content: m.content.map((c: any) => {
              if (c.type === 'text') return { type: 'text', text: c.text || ' ' };
              if (c.type === 'image') return { type: 'image_url', image_url: { url: `data:${c.mime_type};base64,${c.data}` } };
              if (c.type === 'file') return { type: 'text', text: `[File Attached: ${c.name}]` };
              return { type: 'text', text: String(c) };
            })
          };
        }
        return m;
      });

      body = { model: model, messages: openAiMessages, stream: isStreaming };
      break;
    case 'anthropic':
      url = 'https://api.anthropic.com/v1/messages';
      headers['x-api-key'] = cleanApiKey;
      headers['anthropic-version'] = '2023-06-01';
      body = { model: model, max_tokens: 1024, stream: isStreaming };
      if (systemPrompt) {
        body.system = systemPrompt;
      }
      // Anthropic messages must not include system role
      body.messages = processedMessages.filter(m => m.role !== 'system').map(m => {
        const role = m.role === 'assistant' ? 'assistant' : 'user';
        if (Array.isArray(m.content)) {
          return {
            role,
            content: m.content.map((c: any) => {
              if (c.type === 'text') return { type: 'text', text: c.text || ' ' };
              if (c.type === 'image') return { 
                type: 'image', 
                source: { 
                  type: 'base64', 
                  media_type: c.mime_type, 
                  data: c.data 
                } 
              };
              if (c.type === 'file') return { type: 'text', text: `[File Attached: ${c.name}]` };
              return { type: 'text', text: String(c) };
            })
          };
        }
        return { role, content: m.content };
      });
      break;
    case 'ollama':
      let ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
      let actualKey = cleanApiKey || '';

      if (cleanApiKey && cleanApiKey.includes('::')) {
        const parts = cleanApiKey.split('::');
        ollamaUrl = parts[0];
        actualKey = parts[1];
      } else if (cleanApiKey && cleanApiKey.startsWith('http')) {
        ollamaUrl = cleanApiKey;
        actualKey = '';
      }

      let finalUrl = ollamaUrl.replace(/\/+$/, '');
      if (finalUrl.includes('/api:')) {
        const parts = finalUrl.split('/api:');
        finalUrl = parts[0] + '/api';
        if (!actualKey) actualKey = parts[1];
      }

      const lowerUrl = finalUrl.toLowerCase();
      if (!lowerUrl.includes('/api/chat') && !lowerUrl.includes('/v1/chat') && !lowerUrl.includes('/api/generate')) {
        if (lowerUrl.endsWith('/api')) {
          finalUrl = `${finalUrl}/chat`;
        } else if (lowerUrl.endsWith('/v1')) {
          finalUrl = `${finalUrl}/chat/completions`;
        } else {
          finalUrl = `${finalUrl}/api/chat`;
        }
      }

      url = finalUrl;
      headers = { 'Content-Type': 'application/json' };
      if (actualKey) headers['Authorization'] = `Bearer ${actualKey}`;

      body = {
        model: model,
        messages: processedMessages.map(m => {
          const role = m.role === 'system' ? 'system' : (m.role === 'assistant' ? 'assistant' : 'user');
          let content = m.content;
          let images: string[] = [];

          if (Array.isArray(m.content)) {
            content = '';
            m.content.forEach((part: any) => {
              if (part.type === 'text') content += part.text;
              else if (part.type === 'image_url' && part.image_url?.url) {
                const b64 = part.image_url.url.split(';base64,').pop();
                if (b64) images.push(b64);
              }
            });
          }
          const msg: any = { role, content };
          if (images.length > 0) msg.images = images;
          return msg;
        }),
        stream: isStreaming,
        options: { num_predict: 2048 }
      };
      if (systemPrompt && !body.messages.some((m: any) => m.role === 'system')) {
        body.messages.unshift({ role: 'system', content: systemPrompt });
      }
      break;
    case 'google':
    case 'googlegemini':
    case 'gemini':
      const cleanModelId = model.replace(/^models\//i, '').replace(/\s+/g, '');
      let modelId = `models/${cleanModelId}`;

      if (cleanModelId === 'default') {
        throw new Error('Invalid model ID "default". Please sync your API Keys Vault and ensure a valid model is mapped in the Orchestrator.');
      }

      if (options.isImageGeneration) {
        const tryEndpoint = async (endpoint: string, payload: any, ver: string = 'v1beta') => {
          const u = `https://generativelanguage.googleapis.com/${ver}/${modelId}:${endpoint}?key=${cleanApiKey}`;
          try {
            const r = await fetch(u, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            const data = await r.json();
            return { ok: r.ok, status: r.status, data };
          } catch (e: any) {
            return { ok: false, status: 0, error: e.message };
          }
        };

        const methods = options.supportedMethods || [];
        const supportsPredict = methods.some(m => m.toLowerCase().includes('predict'));
        const supportsGenerate = methods.some(m => m.toLowerCase().includes('generatecontent'));
        const isImagen = modelId.toLowerCase().includes('imagen');
        
        if (!supportsPredict && !isImagen && options.isImageGeneration) {
           return null;
        }

        console.log(`[Orchestrator] 🎨 Triggering Google Image Synthesis: ${modelId} (Predict: ${supportsPredict}, Imagen: ${isImagen})`);

        if (supportsPredict || isImagen) {
           const tryPredict = async (ver: string) => {
             return await tryEndpoint('predict', {
               instances: [{ prompt: prompt }],
               parameters: { 
                 sampleCount: 1, 
                 aspectRatio: (options as any).aspectRatio || "1:1",
                 outputMimeType: "image/png"
               }
             }, ver);
           };

           let imgRes = await tryPredict('v1beta');
           if (!imgRes.ok && imgRes.status === 404) imgRes = await tryPredict('v1');

           if (imgRes.ok && imgRes.data?.predictions?.length > 0) {
             const p = imgRes.data.predictions[0];
             const b64 = p?.bytesBase64Encoded || p?.image?.bytesBase64Encoded || p?.data || p?.b64_json;
             if (b64) return `![Generated Image](data:image/png;base64,${b64})`;
           }
        }

        if (supportsGenerate) {
           const tryGenerate = async (ver: string) => {
             return await tryEndpoint('generateContent', {
               contents: [{ parts: [{ text: prompt }] }],
               generationConfig: { response_mime_type: "image/png" }
             }, ver);
           };

           let genRes = await tryGenerate('v1beta');
           if (!genRes.ok && genRes.status === 404) genRes = await tryGenerate('v1');

           if (genRes.ok && genRes.data) {
             const b64 = genRes.data.candidates?.[0]?.content?.parts?.[0]?.inline_data?.data ||
                         genRes.data.candidates?.[0]?.content?.parts?.[0]?.image_data?.data;
             if (b64) return `![Generated Image](data:image/png;base64,${b64})`;
           }
        }

        console.log(`[Orchestrator] Capability Mismatch: ${modelId} failed image synthesis. Triggering silent failover.`);
        return null;
      }
      
      const tryGeminiCall = async (verOverride?: string, includeSystemInstruction: boolean = true, protocolOverride?: string) => {
        const isAudioModel = modelId.toLowerCase().includes('lyria') || modelId.toLowerCase().includes('audio-preview');
        const effectiveStreaming = isAudioModel ? false : isStreaming;
        const method = effectiveStreaming ? 'streamGenerateContent' : 'generateContent';
        
        // Sovereign Resiliency: v1beta is REQUIRED for system_instruction.
        // We default to v1beta for modern models, but handle fallbacks silently.
        const ver = verOverride || 'v1beta';
        const params = effectiveStreaming ? '?alt=sse&' : '?';
        const geminiUrl = `https://generativelanguage.googleapis.com/${ver}/${modelId}:${method}${params}key=${cleanApiKey}`;
        
        let effectiveIncludeSystem = includeSystemInstruction;
        if (isAudioModel) effectiveIncludeSystem = false;
        
        let finalSys = protocolOverride || systemPrompt;
        
        if (isAudioModel) {
          // Lyria is extremely sensitive. 
          // Do NOT use [SYSTEM_DIRECTIVE] or complex markers. 
          // Use a clean, singular task description to avoid 400 rejection in v1beta.
          finalSys = ""; // We will put the directive directly into the user message part if needed
        }
        
        const geminiBody: any = {
          contents: processedMessages
            .filter(m => m.role !== 'system')
            .reduce((acc: any[], current: any) => {
              const role = current.role === 'assistant' ? 'model' : 'user';
              let parts: any[] = [];
              
              if (Array.isArray(current.content)) {
                parts = current.content.map((c: any) => {
                  if (c.type === 'text') return { text: c.text || ' ' };
                  if (c.type === 'image' || c.type === 'video' || c.type === 'audio' || (c.type === 'file' && (c.mime_type === 'application/pdf' || c.mime_type.startsWith('image/') || c.mime_type.startsWith('video/') || c.mime_type.startsWith('audio/')))) {
                    const finalMime = c.mime_type || (c.type === 'image' ? 'image/png' : (c.type === 'video' ? 'video/mp4' : (c.type === 'audio' ? 'audio/mpeg' : 'application/pdf')));
                    return { inline_data: { mime_type: finalMime, data: c.data } };
                  }
                  return { text: String(c) };
                });
              } else {
                parts = [{ text: String(current.content || ' ').trim() || ' ' }];
              }
              
              if (acc.length > 0 && acc[acc.length - 1].role === role) {
                // Merge consecutive messages with the same role
                acc[acc.length - 1].parts = [...acc[acc.length - 1].parts, ...parts];
              } else {
                acc.push({ role, parts });
              }
              return acc;
            }, [])
            .filter((m: any) => m.parts.length > 0)
            .map((m: any) => {
              // SOVEREIGN FIX: Merge all adjacent text parts within the same message to avoid 400 errors
              const mergedParts: any[] = [];
              let currentText = '';
              for (const part of m.parts) {
                if (part.text) {
                  currentText += (currentText ? '\n' : '') + part.text;
                } else {
                  if (currentText) {
                    mergedParts.push({ text: currentText });
                    currentText = '';
                  }
                  mergedParts.push(part);
                }
              }
              if (currentText) mergedParts.push({ text: currentText });
              return { ...m, parts: mergedParts };
            })
        };

        if (finalSys && !isAudioModel) {
          if (effectiveIncludeSystem) {
             geminiBody.system_instruction = { parts: [{ text: finalSys }] };
          } else if (geminiBody.contents.length > 0) {
             // Ensure the system directive is MERGED into the first part text if possible
             if (geminiBody.contents[0].parts[0]?.text) {
                geminiBody.contents[0].parts[0].text = `[SYSTEM_DIRECTIVE]: ${finalSys}\n\n${geminiBody.contents[0].parts[0].text}`;
             } else {
                geminiBody.contents[0].parts.unshift({ text: `[SYSTEM_DIRECTIVE]: ${finalSys}\n\n` });
             }
          }
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        try {
        let finalContents = geminiBody.contents;
        
        if (isAudioModel) {
          // Lyria works best with single-turn. Force context to just the last message.
          const lastUserMsg = geminiBody.contents.filter((m: any) => m.role === 'user').pop();
          if (lastUserMsg) {
             // For audio models, we use a VERY minimal, single-part prompt.
             const audioPrompt = "Generate high-quality orchestral audio. MOOD: Epic. STYLE: Classical.";
             if (lastUserMsg.parts[0]?.text) {
                lastUserMsg.parts[0].text = `${audioPrompt}\n\n${lastUserMsg.parts[0].text}`;
             } else {
                lastUserMsg.parts.unshift({ text: audioPrompt });
             }
             finalContents = [lastUserMsg];
          }
        }

        const bodyStr = JSON.stringify({
          ...geminiBody,
          contents: finalContents
        });


          const geminiRes = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: bodyStr,
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (!geminiRes.ok) {
            const errorData = await geminiRes.clone().json().catch(() => ({}));
            console.error(`[ContextEngine] Gemini API Error ${geminiRes.status}:`, JSON.stringify(errorData, null, 2));
            
            // Sovereign Resiliency: Handle 404 Model Not Found for specific API version
            if (geminiRes.status === 404 && ver === 'v1beta' && !verOverride) {
              console.warn(`[Orchestrator] ⚠️ 404 on v1beta for ${modelId}. Attempting fallback to v1...`);
              return await tryGeminiCall('v1', includeSystemInstruction, protocolOverride);
            }
            
            // Sovereign Resiliency: Handle 400 system_instruction rejection
            if (geminiRes.status === 400 && includeSystemInstruction) {
              console.warn(`[Orchestrator] ⚠️ 400 Error (Potential system_instruction rejection). Attempting fallback to [SYSTEM_DIRECTIVE] pattern...`);
              return await tryGeminiCall(ver, false, protocolOverride);
            }

            console.error(`[ContextEngine] Failed Body Part:`, bodyStr.substring(0, 1000));
          }

      // If the model doesn't support system_instruction or gives a generic 400
      if (geminiRes.status === 400) {
         const errBody = await geminiRes.clone().json().catch(() => ({}));
         console.warn(`[Orchestrator] ⚠️ Adaptive Fallback Triggered: Model ${modelId} rejected request (400). Error:`, JSON.stringify(errBody));
         
         const originalProtocol = protocolOverride || systemPrompt;

         // Level 1: If system_instruction failed, try moving it to the prompt parts (Level 1)
         if (includeSystemInstruction && originalProtocol) {
           console.log(`[Orchestrator] 🔄 Level 1 Fallback: Moving protocol to prompt for ${modelId}...`);
           return await tryGeminiCall(ver, false, originalProtocol);
         }
         
         // Level 2: If still failing, use a very minimal English protocol (Level 2)
         if (originalProtocol && originalProtocol.length > 200) {
           console.log(`[Orchestrator] 🔄 Level 2 Fallback: Using minimal technical protocol for ${modelId}...`);
           const minimalProtocol = "Identity: PERPLEXTA Maestro. Role: Professional Orchestra Studio. Task: Process instructions and output EXACTLY one ```audio [URL] ``` block. Do not hallucinate.";
           return await tryGeminiCall(ver, false, minimalProtocol);
         }

         // Level 3: Desperate fallback - strip protocol for the model (Level 3)
         if (protocolOverride || systemPrompt) {
           console.log(`[Orchestrator] 🚨 Level 3 Fallback: Stripping protocol for ${modelId}...`);
           return await tryGeminiCall('v1', false, "");
         }
      }

          return geminiRes;
        } catch (err: any) {
          clearTimeout(timeoutId);
          if (err.name === 'AbortError') throw new Error('Gemini request timed out after 60s');
          throw err;
        }
      };

      // Use v1beta by default as it is most feature-complete, fallback to v1 if 404
      let response = await tryGeminiCall('v1beta');
      
      // Fallback to v1 if v1beta is not found for this specific model
      if (response.status === 404) {
        console.log(`[DEBUG] Gemini v1beta 404, trying v1 for model ${modelId}`);
        const fallbackRes = await tryGeminiCall('v1');
        if (fallbackRes.ok || fallbackRes.status !== 404) {
          response = fallbackRes;
        }
      }

      return handleResponse(response);
    case 'groq':
      url = 'https://api.groq.com/openai/v1/chat/completions';
      headers['Authorization'] = `Bearer ${cleanApiKey}`;
      body = { model: model, messages, stream: isStreaming };
      break;
    case 'openrouter':
      url = 'https://openrouter.ai/api/v1/chat/completions';
      headers['Authorization'] = `Bearer ${cleanApiKey}`;
      body = { model: model, messages, stream: isStreaming };
      break;
    case 'together':
    case 'mistral':
    case 'xai':
      if (normProvider === 'mistral') {
        url = 'https://api.mistral.ai/v1/chat/completions';
      } else if (normProvider === 'xai') {
        url = 'https://api.x.ai/v1/chat/completions';
      } else if (normProvider === 'together') {
        url = 'https://api.together.xyz/v1/chat/completions';
      }
      
      if (!headers['Authorization']) {
        headers['Authorization'] = `Bearer ${cleanApiKey}`;
      }
      
      body = { model: model, messages, stream: isStreaming };
      break;
    case 'serper':
      throw new Error('Serper is a search provider and cannot be used directly for chat generation. Please use an LLM provider.');
    case 'elevenlabs':
      throw new Error('ElevenLabs is a vocal synthesis provider and cannot be used directly for chat generation.');
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for provider calls

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return handleResponse(response);
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') throw new Error(`AI Provider ${provider} request timed out after 60s`);
    throw err;
  }
}

// --- Admin Routes ---
  
  app.get("/api/admin/api-keys", authenticateAdmin, async (req, res) => {
    try {
      const result = await pool.query('SELECT provider, updated_at, daily_budget, used_today FROM api_keys_vault');
      res.json({ keys: result.rows });
    } catch (error) {
      console.error('Error fetching API keys:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post("/api/admin/api-keys", authenticateAdmin, async (req, res) => {
    try {
      const { provider, key, urlKey } = req.body;
      
      if (!provider) {
        res.status(400).json({ error: 'Provider is required' });
        return;
      }

      let finalKeyToEncrypt = key;

      // Special handling for Ollama URL update
      if (provider === 'ollama' && urlKey && !key) {
        const existing = await pool.query('SELECT encrypted_key FROM api_keys_vault WHERE provider = $1', [provider]);
        let currentSecret = '';
        if (existing.rows.length > 0) {
          try {
            const decrypted = decrypt(existing.rows[0].encrypted_key);
            // If it has a colon, the part after the last colon is the key
            if (decrypted.includes(':')) {
              currentSecret = decrypted.split(':').pop() || '';
            } else {
              currentSecret = decrypted;
            }
          } catch (e) {
            console.error('[Vault] Failed to decrypt existing key for merge:', e);
          }
        }
        finalKeyToEncrypt = `${urlKey.replace(/\/+$/, '')}:${currentSecret}`;
      } else if (provider === 'ollama' && key) {
        // If updating key, also keep urlKey if provided, otherwise check existing url
        let finalUrl = urlKey || '';
        if (!finalUrl) {
           const existing = await pool.query('SELECT encrypted_key FROM api_keys_vault WHERE provider = $1', [provider]);
           if (existing.rows.length > 0) {
             try {
               const decrypted = decrypt(existing.rows[0].encrypted_key);
               if (decrypted.includes(':')) {
                 finalUrl = decrypted.split(':').slice(0, -1).join(':');
               }
             } catch (e) {}
           }
        }
        if (!finalUrl) finalUrl = 'http://localhost:11434';
        finalKeyToEncrypt = `${finalUrl.replace(/\/+$/, '')}:${key}`;
      }

      if (!finalKeyToEncrypt && !urlKey) {
        res.status(400).json({ error: 'Key is required' });
        return;
      }

      const encryptedKey = encrypt(finalKeyToEncrypt || '');

      await pool.query(
        `INSERT INTO api_keys_vault (provider, encrypted_key, is_active, updated_at) 
         VALUES ($1, $2, true, CURRENT_TIMESTAMP) 
         ON CONFLICT (provider) 
         DO UPDATE SET encrypted_key = EXCLUDED.encrypted_key, is_active = true, updated_at = CURRENT_TIMESTAMP`,
        [provider, encryptedKey]
      );

      const keyForSync = (provider === 'ollama') 
        ? (finalKeyToEncrypt || '')
        : finalKeyToEncrypt;

      if (keyForSync || (provider === 'ollama' && urlKey)) {
        try {
          console.log(`[Orchestrator] Triggering proactive auto-sync for provider: ${provider}`);
          const { models } = await syncProviderModelsInternal(provider, keyForSync);
          if (models && models.length > 0) {
             await pool.query('UPDATE api_keys_vault SET model_list = $1, models = $1 WHERE provider = $2', [JSON.stringify(models), provider]);
             console.log(`[Orchestrator] Proactive sync successful and persisted (dual-column) for ${provider}.`);
          }
        } catch (syncErr: any) {
          console.warn(`[Orchestrator] Proactive sync failed for ${provider}:`, syncErr.message);
        }
      }

      await logSystemActivity((req as any).user.id, 'api_key_update', `Updated API key for provider: ${provider}`, { provider, hasUrlUpdate: !!urlKey }, req);
      await logSecurityAlert((req as any).user.id, 'system_change', 'medium', `API Key updated for provider: ${provider}`, { provider }, req);

      res.json({ success: true, message: 'تم حفظ المفتاح بنجاح وتحديث النماذج.' });
    } catch (error) {
      console.error('Error saving API key:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.delete("/api/admin/withdrawals/:id", authenticateAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await ledgerPool.query('DELETE FROM ledger_transactions WHERE id = $1', [id]);
      await logSystemActivity((req as any).user.id, 'delete_withdrawal', `Deleted withdrawal request: ${id}`, { id }, req);
      res.json({ success: true, message: 'Withdrawal request deleted successfully' });
    } catch (error) {
      console.error('Error deleting withdrawal:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.delete("/api/admin/users/:userId/kyc", authenticateAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      await pool.query('UPDATE users SET kyc_status = $1, kyc_required = $2, kyc_selfie = NULL, kyc_full_name = NULL WHERE id = $3', ['none', false, userId]);
      await logSystemActivity((req as any).user.id, 'delete_kyc_request', `Deleted KYC request for user: ${userId}`, { userId }, req);
      res.json({ success: true, message: 'KYC request purged successfully' });
    } catch (error) {
      console.error('Error purging KYC request:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.delete("/api/admin/api-keys/:provider", authenticateAdmin, async (req, res) => {
    try {
      const { provider } = req.params;
      await pool.query('DELETE FROM api_keys_vault WHERE provider = $1', [provider]);
      await logSystemActivity((req as any).user.id, 'api_key_delete', `Deleted API key for provider: ${provider}`, { provider }, req);
      await logSecurityAlert((req as any).user.id, 'system_change', 'high', `API Key deleted for provider: ${provider}`, { provider }, req);
      res.json({ success: true, message: 'API Key deleted successfully' });
    } catch (error) {
      console.error('Error deleting API key:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post("/api/admin/api-keys/:provider/sync-models", authenticateAdmin, async (req, res) => {
    try {
      const { provider } = req.params;
      const result = await pool.query('SELECT encrypted_key FROM api_keys_vault WHERE provider = $1', [provider]);
      
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'لم يتم العثور على مفتاح لهذا المزود. يرجى حفظ المفتاح أولاً.' });
        return;
      }

      const apiKeyEncrypted = result.rows[0].encrypted_key;
      const apiKey = decrypt(apiKeyEncrypted);
      
      if (!apiKey) {
        res.status(400).json({ error: 'فشل فك تشفير المفتاح. يرجى إعادة حفظ المفتاح.' });
        return;
      }

      const { models, count } = await syncProviderModelsInternal(provider, apiKey);

      await pool.query('UPDATE api_keys_vault SET model_list = $1, updated_at = CURRENT_TIMESTAMP WHERE provider = $2', [JSON.stringify(models), provider]);

      await logSystemActivity((req as any).user.id, 'api_key_models_sync', `Synced models for provider: ${provider}`, { provider, count }, req);
      await logSecurityAlert((req as any).user.id, 'system_change', 'medium', `API Key models synced for provider: ${provider}`, { provider, count }, req);

      res.json({ success: true, count, models });
    } catch (error: any) {
      console.error(`Error syncing models for ${req.params.provider}:`, error);
      res.status(500).json({ error: error.message || 'فشل في مزامنة النماذج. تأكد من صلاحية المفتاح.' });
    }
  });

  app.post("/api/admin/api-keys/:provider/sync-usage", authenticateAdmin, async (req, res) => {
    try {
      const { provider } = req.params;
      // Auto-reset if needed
      await pool.query(`
        UPDATE api_keys_vault 
        SET used_today = 0, last_reset_date = CURRENT_DATE 
        WHERE provider = $1 AND last_reset_date < CURRENT_DATE
      `, [provider]);

      const result = await pool.query('SELECT daily_budget, used_today FROM api_keys_vault WHERE provider = $1', [provider]);
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'لم يتم العثور على مفتاح لهذا المزود.' });
        return;
      }
      const { daily_budget, used_today } = result.rows[0];
      res.json({ 
        success: true, 
        usage: {
          total: parseFloat(daily_budget) || 0,
          used: parseFloat(used_today) || 0,
          remaining: Math.max(0, (parseFloat(daily_budget) || 0) - (parseFloat(used_today) || 0)),
          currency: 'USD',
          isSupported: true,
          message: 'تم جلب بيانات الاستهلاك الداخلي بنجاح.'
        }
      });
    } catch (error: any) {
      console.error(`Error syncing usage for ${req.params.provider}:`, error);
      res.status(500).json({ error: 'فشل في مزامنة الاستهلاك.' });
    }
  });

  app.post("/api/admin/api-keys/:provider/budget", authenticateAdmin, async (req, res) => {
    try {
      const { provider } = req.params;
      const { budget } = req.body;
      
      if (budget === undefined || isNaN(Number(budget))) {
        res.status(400).json({ error: 'الميزانية غير صالحة' });
        return;
      }

      await pool.query(
        'UPDATE api_keys_vault SET daily_budget = $1 WHERE provider = $2',
        [budget, provider]
      );

      await logSystemActivity((req as any).user.id, 'api_key_budget_update', `Updated daily budget for provider: ${provider} to ${budget}`, { provider, budget }, req);
      await logSecurityAlert((req as any).user.id, 'system_change', 'medium', `API Key budget updated for provider: ${provider}`, { provider, budget }, req);

      res.json({ success: true, message: 'تم تحديث الميزانية بنجاح' });
    } catch (error) {
      console.error(`Error updating budget for ${req.params.provider}:`, error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // --- Orchestrator Routes ---
  app.get("/api/admin/orchestrator/models", authenticateAdmin, async (req, res) => {
    try {
      const result = await pool.query('SELECT provider, models FROM api_keys_vault');
      const providerModels: Record<string, any[]> = {};
      
      result.rows.forEach(row => {
        if (row.models && Array.isArray(row.models)) {
          providerModels[row.provider] = row.models;
        }
        // Ensure search providers have at least one selectable "model" even if they don't use models
        if (['serper', 'tavily', 'google_search'].includes(row.provider) && (!row.models || row.models.length === 0)) {
           providerModels[row.provider] = [{ id: 'default', name: 'Standard Search Engine' }];
        }
      });
      
      res.json({ providerModels });
    } catch (error) {
      console.error('Error fetching orchestrator models:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  app.get("/api/admin/orchestrator/tools-list", authenticateAdmin, async (req, res) => {
    try {
      // In a real sovereign system, this would be in a table 'system_tools'
      // For now we return the hardcoded tools array used for seeding to keep it synced
      const toolsWithMetadata = tools.map(t => ({
        id: t.id,
        name: t.id, // Can be improved with translation keys
        description: t.desc,
        descriptionAr: t.descAr,
        cost: t.cost
      }));
      res.json({ tools: toolsWithMetadata });
    } catch (error) {
      console.error('Error fetching tools list:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get("/api/admin/orchestrator/routes", authenticateAdmin, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM tool_orchestrator');
      res.json({ routes: result.rows });
    } catch (error) {
      console.error('Error fetching orchestrator routes:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post("/api/admin/orchestrator/init-all", authenticateAdmin, async (req, res) => {
    try {
      const tools = [
        'chat', 'chat_fast', 'chat_pro', 'chat_reasoning', 'perplexta_analysis',
        'image', 'video', 'tts', 'stt', 'legal_analysis', 'learning', 'code', 'canvas', 'notebook', 'sovereign_memory'
      ];

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        for (const toolId of tools) {
          await client.query(`
            INSERT INTO tool_orchestrator (
              tool_id, primary_provider, primary_model, is_active, cost_per_usage
            ) VALUES ($1, '', '', true, 10)
            ON CONFLICT (tool_id) DO UPDATE SET
              is_active = true
          `, [toolId]);
        }
        await client.query('COMMIT');
        res.json({ success: true, message: 'تم تهيئة جميع الأدوات بنجاح' });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error initializing tools:', error);
      res.status(500).json({ error: 'Failed to initialize tools' });
    }
  });

  app.post("/api/admin/orchestrator/routes", authenticateAdmin, async (req, res) => {
    try {
      const { routes } = req.body;
      
      if (!Array.isArray(routes)) {
        res.status(400).json({ error: 'Invalid routes format' });
        return;
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        for (const route of routes) {
          await client.query(`
            INSERT INTO tool_orchestrator (
              tool_id, primary_provider, primary_model, 
              fallback1_provider, fallback1_model, 
              fallback2_provider, fallback2_model, 
              fallback3_provider, fallback3_model, 
              task_description, task_description_ar, is_active, cost_per_usage
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (tool_id) DO UPDATE SET
              primary_provider = EXCLUDED.primary_provider,
              primary_model = EXCLUDED.primary_model,
              fallback1_provider = EXCLUDED.fallback1_provider,
              fallback1_model = EXCLUDED.fallback1_model,
              fallback2_provider = EXCLUDED.fallback2_provider,
              fallback2_model = EXCLUDED.fallback2_model,
              fallback3_provider = EXCLUDED.fallback3_provider,
              fallback3_model = EXCLUDED.fallback3_model,
              task_description = EXCLUDED.task_description,
              task_description_ar = EXCLUDED.task_description_ar,
              is_active = EXCLUDED.is_active,
              cost_per_usage = EXCLUDED.cost_per_usage,
              updated_at = CURRENT_TIMESTAMP
          `, [
            route.tool_id, route.primary_provider, route.primary_model,
            route.fallback1_provider, route.fallback1_model,
            route.fallback2_provider, route.fallback2_model,
            route.fallback3_provider, route.fallback3_model,
            route.task_description || '',
            route.task_description_ar || '',
            route.is_active !== false,
            route.cost_per_usage || 10
          ]);
        }
        
        await client.query('COMMIT');
        res.json({ success: true, message: 'تم حفظ إعدادات التوجيه بنجاح' });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error saving orchestrator routes:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post("/api/admin/reset-orchestrator", authenticateAdmin, async (req, res) => {
    try {
      await pool.query('DELETE FROM tool_orchestrator');
      await pool.query('DELETE FROM api_keys_vault');
      await logSystemActivity((req as any).user.id, 'admin_reset', 'Orchestrator and API Keys reset', {}, req);
      res.json({ success: true, message: 'تم مسح إعدادات الأوركسترا والمفاتيح بنجاح' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Chat Routes ---
  app.post("/api/chats", authenticateToken, async (req, res) => {
    try {
      const { title } = req.body;
      const userId = (req as any).user.id;
      const chatTitle = title || 'New Chat';
      const result = await pool.query('INSERT INTO chats (user_id, title) VALUES ($1, $2) RETURNING *', [userId, chatTitle]);
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error creating chat:', error);
      res.status(500).json({ error: 'Failed to create chat' });
    }
  });

  app.get("/api/chats", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      console.log(` [API] Fetching chats for user ${userId}`);
      const result = await pool.query('SELECT * FROM chats WHERE user_id = $1 ORDER BY updated_at DESC', [userId]);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching chats:', error);
      res.status(500).json({ error: 'Failed to fetch chats' });
    }
  });

  app.delete("/api/chats/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;
      await pool.query('DELETE FROM chats WHERE id = $1 AND user_id = $2', [id, userId]);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting chat:', error);
      res.status(500).json({ error: 'Failed to delete chat' });
    }
  });

  app.patch("/api/chats/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { title } = req.body;
      const userId = (req as any).user.id;
      await pool.query('UPDATE chats SET title = $1 WHERE id = $2 AND user_id = $3', [title, id, userId]);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error renaming chat:', error);
      res.status(500).json({ error: 'Failed to rename chat' });
    }
  });

  app.post("/api/chats/:id/messages", authenticateToken, async (req, res) => {
    try {
      const { role, content, tool } = req.body;
      const chatId = req.params.id as string;
      
      const chatExists = await pool.query('SELECT id FROM chats WHERE id = $1', [chatId]);
      if (chatExists.rows.length === 0) {
        console.error('Chat not found:', chatId);
        res.status(404).json({ error: 'Chat not found' });
        return;
      }
      
      const countResult = await pool.query('SELECT count(*) FROM messages WHERE chat_id = $1', [chatId]);
      const isFirstMessage = parseInt(countResult.rows[0].count) === 0;

      await pool.query('INSERT INTO messages (chat_id, role, content, tool) VALUES ($1, $2, $3, $4)', [chatId, role, content, tool]);
      await pool.query('UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [chatId]);

      if (isFirstMessage && role === 'user') {
        (async () => {
          try {
            let route = null;
            
            const routeResult = await pool.query('SELECT * FROM tool_orchestrator WHERE tool_id = $1 AND is_active = true', ['perplexta_analysis']);
            if (routeResult.rows.length > 0) {
              const route = routeResult.rows[0];
              
              const providers = [
                { provider: route.primary_provider, model: route.primary_model },
                { provider: route.fallback1_provider, model: route.fallback1_model },
                { provider: route.fallback2_provider, model: route.fallback2_model },
                { provider: route.fallback3_provider, model: route.fallback3_model }
              ];

              const titlePrompt = `Generate a professional, concise title (max 5 words) for this chat in the user's language. Detect the language from the content and provide only the title without any decoration or quotes.
              
User Content: ${content}`;
              const appName = await getAppName('en');
              const dynamicProtocol = CORE_PROTOCOL.replace(/\[SITE_NAME\]/g, appName);
              const titleSystemPrompt = `${dynamicProtocol}\n\nTask: Generate a formal and accurate chat title in the same language as the user. Avoid using generic words.`;
              
              for (const target of providers) {
                if (!target.provider || !target.model) continue;
                try {
                  const keyResult = await pool.query('SELECT encrypted_key FROM api_keys_vault WHERE provider = $1', [target.provider]);
                  if (keyResult.rows.length === 0) continue;
                  
                  const decryptedKey = decrypt(keyResult.rows[0].encrypted_key);
                  if (!decryptedKey || decryptedKey.trim().length < 5) {
                    console.warn(`[TitleEngine] Key invalid or too short for ${target.provider}, skipping...`);
                    continue;
                  }

                  const aiRes = await callAIProvider(target.provider, target.model, decryptedKey, titlePrompt, titleSystemPrompt);
                  
                  if (typeof aiRes === 'string' && aiRes.trim().length > 0) {
                    let title = aiRes.trim().replace(/^["']|["']$/g, '').substring(0, 255);
                    if (title.length > 0) {
                      await pool.query('UPDATE chats SET title = $1 WHERE id = $2', [title, chatId]);
                      break;
                    }
                  }
                } catch (err) {
                  console.error(`[TitleEngine] Error with ${target.provider}:`, err);
                }
              }
            }
          } catch (titleError) {
            console.error('Error generating chat title:', titleError);
          }
        })();
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error adding message:', error);
      res.status(500).json({ error: 'Failed to add message' });
    }
  });

  app.get("/api/chats/:id/messages", authenticateToken, async (req, res) => {
    try {
      const chatId = req.params.id as string;
      const userId = (req as any).user.id;

      // Verify chat belongs to user
      const chatOwnership = await pool.query('SELECT user_id FROM chats WHERE id = $1', [chatId]);
      if (chatOwnership.rows.length === 0 || chatOwnership.rows[0].user_id !== userId) {
        return res.status(403).json({ error: 'Access Denied' });
      }

      const result = await pool.query('SELECT * FROM messages WHERE chat_id = $1 ORDER BY created_at ASC', [chatId]);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });

  app.post("/api/messages/:id/feedback", authenticateToken, async (req, res) => {
    try {
      const messageId = req.params.id;
      const { feedback } = req.body; // 1 (up), -1 (down), 0 (neutral)
      const userId = (req as any).user.id;

      if (![1, -1, 0].includes(feedback)) {
        return res.status(400).json({ error: 'Invalid feedback value' });
      }

      // Verify message belongs to a chat owned by this user
      const messageCheck = await pool.query(`
        SELECT m.id FROM messages m 
        JOIN chats c ON m.chat_id = c.id 
        WHERE m.id = $1 AND c.user_id = $2
      `, [messageId, userId]);

      if (messageCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Message not found or access denied' });
      }

      await pool.query('UPDATE messages SET feedback = $1 WHERE id = $2', [feedback, messageId]);
      res.json({ success: true, feedback });
    } catch (error) {
      console.error('Error updating feedback:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.patch("/api/messages/:id/pin", authenticateToken, async (req: any, res: any) => {
    const { id } = req.params;
    const { is_pinned } = req.body;
    try {
      const msgCheck = await pool.query(
        `SELECT m.* FROM messages m 
         JOIN chats c ON m.chat_id = c.id 
         WHERE m.id = $1 AND c.user_id = $2`,
        [id, req.user.id]
      );
      if (msgCheck.rows.length === 0) return res.status(404).json({ error: "Message not found or unauthorized" });
      
      await pool.query('UPDATE messages SET is_pinned = $1 WHERE id = $2', [is_pinned, id]);
      res.json({ success: true, is_pinned });
    } catch (err) {
      console.error('Pin error:', err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/messages/:id", authenticateToken, async (req, res) => {
    try {
      const messageId = req.params.id;
      const userId = (req as any).user.id;

      // Verify message ownership through chat
      const messageCheck = await pool.query(`
        SELECT m.id FROM messages m 
        JOIN chats c ON m.chat_id = c.id 
        WHERE m.id = $1 AND c.user_id = $2
      `, [messageId, userId]);

      if (messageCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Message not found or access denied' });
      }

      await pool.query('DELETE FROM messages WHERE id = $1', [messageId]);
      res.json({ success: true, messageId });
    } catch (error) {
      console.error('Error deleting message:', error);
      res.status(500).json({ error: 'Failed to delete message' });
    }
  });

  app.delete("/api/messages/branch/:chatId/:afterId", authenticateToken, async (req: any, res: any) => {
    try {
      const { chatId, afterId } = req.params;
      const userId = req.user.id;

      // Verify chat ownership
      const chatCheck = await pool.query('SELECT id FROM chats WHERE id = $1 AND user_id = $2', [chatId, userId]);
      if (chatCheck.rows.length === 0) return res.status(404).json({ error: "Chat not found" });

      // Delete all messages in this chat with ID >= afterId (branching)
      await pool.query('DELETE FROM messages WHERE chat_id = $1 AND id >= $2', [chatId, afterId]);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting branch:', error);
      res.status(500).json({ error: 'Failed to truncate branch' });
    }
  });

  app.post("/api/shortcuts", authenticateToken, async (req, res) => {
    try {
      const { title, query, category } = req.body;
      const userId = (req as any).user.id;
      if (!title || !query) return res.status(400).json({ error: 'Title and query are required' });
      
      const result = await pool.query(
        'INSERT INTO user_shortcuts (user_id, title, query, category) VALUES ($1, $2, $3, $4) RETURNING *',
        [userId, title, query, category || 'general']
      );
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error saving shortcut:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post("/api/reports", authenticateToken, async (req, res) => {
    try {
      const { messageId, reason } = req.body;
      const userId = (req as any).user.id;
      if (!messageId) return res.status(400).json({ error: 'MessageId is required' });

      const result = await pool.query(
        'INSERT INTO message_reports (user_id, message_id, reason) VALUES ($1, $2, $3) RETURNING *',
        [userId, messageId, reason || 'Inappropriate content']
      );
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error reporting message:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get("/api/user/usage", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const today = new Date().toISOString().split('T')[0];
      const monthStartStr = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

      // Get current subscription limits
      const subRes = await pool.query(`
        SELECT p.limits, p.name_en, p.name_ar, s.status, s.billing_period
        FROM subscriptions s
        JOIN plans p ON s.plan_id = p.id
        WHERE s.user_id = $1 AND (s.current_period_end > CURRENT_TIMESTAMP OR s.current_period_end IS NULL)
      `, [userId]);

      const planInfo = subRes.rows[0] || { limits: {}, name_en: 'Free Plan' };
      const limits = planInfo.limits || {};

      // Get all tools usage for this user
      const usageRes = await pool.query(`
        SELECT 
          tool_id,
          SUM(CASE WHEN usage_date >= $2 THEN usage_count ELSE 0 END) as monthly_usage,
          SUM(CASE WHEN usage_date = $3 THEN usage_count ELSE 0 END) as daily_usage
        FROM user_usage 
        WHERE user_id = $1 AND usage_date >= $2
        GROUP BY tool_id
      `, [userId, monthStartStr, today]);

      const usageMap = usageRes.rows.reduce((acc, row) => {
        acc[row.tool_id] = {
          daily: parseInt(row.daily_usage || 0),
          monthly: parseInt(row.monthly_usage || 0)
        };
        return acc;
      }, {} as Record<string, { daily: number, monthly: number }>);

      // Merge with tools list
      const detailedUsage = tools.map(tool => {
        const usage = usageMap[tool.id] || { daily: 0, monthly: 0 };
        const limit = limits[tool.id];
        
        const dailyLimit = limit === 'unlimited' ? Infinity : (typeof limit === 'object' ? parseInt(limit.daily || 0) : parseInt(limit || 0));
        const monthlyLimit = limit === 'unlimited' ? Infinity : (typeof limit === 'object' ? parseInt(limit.monthly || 0) : dailyLimit * 30);

        return {
          id: tool.id,
          name_en: tool.nameEn || tool.id.replace(/_/g, ' ').toUpperCase(),
          name_ar: tool.nameAr || tool.id,
          desc_en: tool.desc,
          desc_ar: tool.descAr,
          usage,
          limits: {
            daily: dailyLimit === Infinity ? null : dailyLimit,
            monthly: monthlyLimit === Infinity ? null : monthlyLimit
          }
        };
      });

      res.json({
        plan: planInfo,
        usage: detailedUsage
      });
    } catch (error) {
      console.error('Usage Fetch Error:', error);
      res.status(500).json({ error: 'Failed to fetch usage data' });
    }
  });

  // --- Memory Engine Endpoints ---
  app.get("/api/memories", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const result = await pool.query('SELECT * FROM chat_memories WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching memories:', error);
      res.status(500).json({ error: 'Failed to fetch memories' });
    }
  });

  app.post("/api/memories", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const { fact, category, chat_id, source } = req.body;
      const result = await pool.query(
        'INSERT INTO chat_memories (user_id, chat_id, fact, category, source) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [userId, chat_id || null, fact, category || 'general', source || 'user']
      );
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error adding memory:', error);
      res.status(500).json({ error: 'Failed to add memory' });
    }
  });

  app.put("/api/memories/:id", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const memoryId = req.params.id;
      const { fact, category } = req.body;
      const result = await pool.query(
        'UPDATE chat_memories SET fact = COALESCE($1, fact), category = COALESCE($2, category), updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND user_id = $4 RETURNING *',
        [fact, category, memoryId, userId]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Memory not found' });
      }
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating memory:', error);
      res.status(500).json({ error: 'Failed to update memory' });
    }
  });

  app.delete("/api/memories/:id", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const memoryId = req.params.id;
      const result = await pool.query(
        'DELETE FROM chat_memories WHERE id = $1 AND user_id = $2 RETURNING *',
        [memoryId, userId]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Memory not found' });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting memory:', error);
      res.status(500).json({ error: 'Failed to delete memory' });
    }
  });

  app.post("/api/memories/prune", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      // Delete the 10 oldest memories
      await pool.query(`
        DELETE FROM chat_memories 
        WHERE id IN (
          SELECT id FROM chat_memories 
          WHERE user_id = $1 
          ORDER BY created_at ASC 
          LIMIT 10
        )
      `, [userId]);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to prune memories:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  const executeTaskLogic = async (reqBody: any, userId: number, req?: express.Request, onChunk?: (chunk: string) => void, socket?: any) => {
    console.log('[Orchestrator] Request Received:', JSON.stringify(reqBody, (k, v) => k === 'file_data' ? '' : v));
    let { tool_id, prompt, system_prompt, data_p, data_s, mode, model_id, chat_id, file_data, video_settings, image_settings, audio_settings } = reqBody;
    let memoryBlock = '';

    const toolIdStr = tool_id as string;
    const chatIdNum = chat_id ? parseInt(chat_id) : 0;
    
    // Security: Limit file size to 25MB base64 (~18MB actual)
    if (file_data && file_data.data && file_data.data.length > 25 * 1024 * 1024) {
      throw new Error('File payload too large (Limit: 25MB)');
    }

    const promptStr = prompt as string;
    const systemPromptStr = system_prompt as string;
    const dataPStr = data_p as string;
    const dataSStr = data_s as string;
    const modeStr = mode as string;

    const modelIdStr = model_id as string;
    
    // Model ID to Tool ID Mapping (Sovereign Routing Strategy)
    let effectiveToolId = toolIdStr;
    if (toolIdStr === 'chat') {
      if (modelIdStr === 'fast') effectiveToolId = 'chat_fast';
      else if (modelIdStr === 'pro') effectiveToolId = 'chat_pro';
      else if (modelIdStr === 'thinking') effectiveToolId = 'chat_reasoning';
    }

    // INTERNAL ALIASING: Absolute Sovereign Routing
    let routingSearchId = effectiveToolId;
    if (effectiveToolId === 'sound_studio') routingSearchId = 'canvas';

    let finalPrompt = promptStr;
    const originalUserIntentForSynthesis = promptStr; // Sovereign: Guard original intent for clean memory extraction
    let finalSystemPrompt = systemPromptStr || '';

    const [userContextRes, memoryRes, subCountRes, routeResult, historyRes, quota, chatRes] = await Promise.all([
      pool.query('SELECT custom_instructions, language FROM users WHERE id = $1', [userId]),
      pool.query(`
        SELECT fact, category FROM chat_memories 
        WHERE user_id = $1 AND (chat_id = $2 OR chat_id IS NULL)
        ORDER BY (CASE WHEN chat_id = $2 THEN 1 ELSE 0 END) DESC, created_at DESC 
        LIMIT 50
      `, [userId, chatIdNum]),
      chatIdNum > 0 ? pool.query('SELECT COUNT(*) FROM messages WHERE chat_id = $1', [chatIdNum]) : Promise.resolve({ rows: [{ count: '0' }] }),
      pool.query('SELECT * FROM tool_orchestrator WHERE tool_id = $1 AND is_active = true', [routingSearchId]),
      chatIdNum > 0 ? pool.query('SELECT role, content FROM messages WHERE chat_id = $1 ORDER BY created_at DESC LIMIT 20', [chatIdNum]) : Promise.resolve({ rows: [] }),
      checkUserQuota(userId, routingSearchId, req),
      chatIdNum > 0 ? pool.query('SELECT context_summary FROM chats WHERE id = $1', [chatIdNum]) : Promise.resolve({ rows: [] })
    ]);
    
    const userLanguage = userContextRes.rows[0]?.language || 'en';
    const appName = await getAppName(userLanguage);
    
    // Check quota first
    if (!quota.allowed) {
      throw new Error(quota.reason || 'Quota exceeded');
    }
    
    // Check route
    if (routeResult.rows.length === 0) {
       const toolCheck = await pool.query('SELECT is_active FROM tool_orchestrator WHERE tool_id = $1', [routingSearchId]);
       if (toolCheck.rows.length === 0) throw new Error(`No routing configuration for tool: ${effectiveToolId}`);
       if (!toolCheck.rows[0].is_active) throw new Error('TOOL_DISABLED');
       throw new Error(`No active routing configuration for tool: ${effectiveToolId}`);
    }
    
    const route = routeResult.rows[0];
    const userInstructions = userContextRes.rows[0]?.custom_instructions || '';
    const userMemory = memoryRes.rows.map(row => `[${row.category.toUpperCase()}]: ${row.fact}`).join('\n- ');
    const contextSummary = chatRes.rows[0]?.context_summary || '';

    if (userMemory) {
      console.log(`[ContextEngine] 🧠 Orchestrating ${memoryRes.rows.length} relevant memories into user ${userId} context.`);
      memoryBlock = `[PLATFORM_MEMORY_VAULT]\nThis vault contains persistent facts, engineering decisions, and user preferences extracted from past sessions. Prioritize this context to provide continuity:\n- ${userMemory}\n\n`;
    }

    let summaryBlock = '';
    if (contextSummary) {
      summaryBlock = `[CONVERSATION_CONTEXT_SUMMARY]\nUse this summary to maintain technical and logical continuity across long conversation threads:\n${contextSummary}\n\n`;
    }

    let instructionBlock = '';
    if (userInstructions) {
      instructionBlock = `[USER_CUSTOM_INSTRUCTIONS]\nFollow these instructions strictly for all responses:\n${userInstructions}\n\n`;
    }

    const flowProtocol = "\n\n[NATURAL_FLOW_PROTOCOL]\nMaintain a natural, harmonious flow. Be context-aware, but avoid explicitly referencing previous turns or the conversation history repetitively. Focus on providing direct, helpful, and contextually relevant responses. At the very end of your response, provide 3-4 professional follow-up questions for the user under the tag [FOLLOW_UPS]. Each question on a new line.";

    if (modeStr === 'aes_v2') {
      try {
        if (dataPStr) finalPrompt = decrypt(dataPStr);
        if (dataSStr) finalSystemPrompt = decrypt(dataSStr);
      } catch (e) {
        console.error('Error decrypting prompt:', e);
      }
    } else if (modeStr === 'hex_v2') {
      try {
        const decodeHex = (hex: string) => {
          const bytes = new Uint8Array(hex.length / 2);
          for (let i = 0; i < hex.length; i += 2) {
            bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
          }
          return new TextDecoder().decode(bytes);
        };
        if (dataPStr) finalPrompt = decodeHex(dataPStr);
        if (dataSStr) finalSystemPrompt = decodeHex(dataSStr);
      } catch (e) {
        console.error('Error decoding hex prompt:', e);
      }
    }

    // Advanced File Intelligence Extraction (Sovereign Enhancement)
    // Architecture Guideline: Rule 10.8 (Sovereign Pure Logic)
    let fileIntelligenceBlock = '';
    if (file_data && file_data.data && file_data.type) {
      const mimeType = file_data.type;
      const base64Data = file_data.data;
      const fileName = file_data.name || 'document';
      const dataBuffer = Buffer.from(base64Data, 'base64');

      const extracted = await extractTextFromFile(dataBuffer, mimeType, fileName);
      if (extracted) {
        fileIntelligenceBlock = `\n\n[FILE_INTELLIGENCE_EXTRACTED: ${fileName}]\n--- CONTENT START ---\n${extracted}\n--- CONTENT END ---\n`;
        console.log(`[Files] Successfully extracted ${extracted.length} characters from ${fileName}.`);
        
        // Sovereign: Automatically associate extracted intelligence with the chat history for follow-up continuity
        if (chatIdNum > 0) {
          (async () => {
            try {
              // Store full text in chat_memories for multi-turn persistence
              const intelligenceFact = `Extracted text from file "${fileName}":\n${extracted.substring(0, 10000)}${extracted.length > 10000 ? '... [Content Truncated in Memory]' : ''}`;
              await pool.query(
                'INSERT INTO chat_memories (user_id, chat_id, fact, category, source) VALUES ($1, $2, $3, $4, $5)',
                [userId, chatIdNum, intelligenceFact, 'file_intelligence', 'system']
              );
              console.log(`[ContextEngine] Intelligence from ${fileName} persisted to Chat ${chatIdNum} memories.`);
            } catch (err) {
              console.error('[ContextEngine] Failed to persist file intelligence:', err);
            }
          })();
        }
      }
    }

    // Append extracted intelligence to the final prompt to ensure ALL models see it
    if (fileIntelligenceBlock) {
      finalPrompt = `${finalPrompt}\n\n${fileIntelligenceBlock}`;
    }

    // VIDEO SETTINGS INJECTION: If video tool is active, force the settings into the prompt
    if (toolIdStr === 'video' && video_settings) {
      const v = video_settings;
      const settingsBlock = `\n\n[VIDEO_GENERATION_PARAMETERS]\n- Aspect Ratio: ${v.aspectRatio}\n- Resolution: ${v.resolution}\n- Duration: ${v.duration} seconds\n\nEnsure the generated cinematic sequence strictly adheres to these technical specifications.`;
      finalPrompt = `${finalPrompt}${settingsBlock}`;
      console.log(`[Orchestrator] 🎬 Video settings injected: ${v.duration}s, ${v.aspectRatio}, ${v.resolution}`);
    }

    // IMAGE SETTINGS INJECTION: If image tool is active, force the settings into the prompt
    if (toolIdStr === 'image' && image_settings) {
      const i = image_settings;
      const settingsBlock = `[CRITICAL_IMAGE_SPECIFICATIONS]
- Required Aspect Ratio: ${i.aspectRatio}
- Desired Quality: ${i.quality}
- Style/Mood: ${i.style}
- Primary Subject: The description provided by the user below.

You MUST strictly follow these parameters. Failure to adhere to the requested style or aspect ratio is a breach of Sovereign Protocol.
[USER_DESCRIPTION_START]
`;
      finalPrompt = `${settingsBlock}${finalPrompt}\n[USER_DESCRIPTION_END]`;
      console.log(`[Orchestrator] 🎨 Image settings injected: ${i.aspectRatio}, ${i.quality}, ${i.style}`);
    }

    // AUDIO SETTINGS INJECTION: If canvas tool is active, force the settings into the prompt
    if ((toolIdStr === 'canvas' || toolIdStr === 'sound_studio') && audio_settings) {
      const a = audio_settings;
      const settingsBlock = `

[SOVEREIGN_ORCHESTRAL_ENGINEERING_PARAMETERS]
- Mood: ${a.mood}
- Duration: ${a.duration} seconds
- Composition Style: ELITE SYMPHONIC / MODERN ORCHESTRAL
- Acoustic Engineering: Focus on spectral clarity, wide stereo imaging, and harmonic richness.
- Directives: Ensure the composition follows the mathematical beauty of the Orchestral Engineering standard.

FAILURE TO ADHERE TO THESE SECTIONS IS A BREACH OF SOVEREIGN PROTOCOL.

[CRITICAL_PRODUCTION_OVERRIDE]: You MUST output the audio block in the EXACT format specified in Part III of your protocol. Do NOT just explain. You MUST provide the code block with the URL.`;
      finalPrompt = `${finalPrompt}${settingsBlock}`;
      console.log(`[Orchestrator] 🎻 Orchestral Engineering parameters injected: ${a.mood}, ${a.duration}s`);
    }

    if (!toolIdStr) {
      throw new Error('tool_id is required');
    }

    if (!finalPrompt || finalPrompt.trim() === '') {
      const hint = modeStr === 'aes_v2' ? ' (Check encryption key sync)' : '';
      throw new Error(`Prompt content is empty or decryption failed${hint}`);
    }

    // 2. Get Orchestrator Route - MOVED TO PARALLEL BLOCK ABOVE
    // [DELETED DUAL PROMISE BLOCK - CONSOLIDATED ABOVE]

      // FETCH TECHNICAL TASK DIRECTIVE: Purely from the Orchestrator via the task_description field
    const taskDirective = userLanguage === 'ar' ? (route.task_description_ar || route.task_description || '') : (route.task_description || '');
    const technicalDirectiveBlock = taskDirective ? `\n\n--- [TECHNICAL_TASK_DIRECTIVE_START] ---\n${taskDirective}\n--- [TECHNICAL_TASK_DIRECTIVE_END] ---\n\n` : '';
    
    // SOVEREIGN PROTOCOL ROUTING: Always keep identity safeguards from CORE_PROTOCOL
    const coreProtocolBase = CORE_PROTOCOL.replace(/\[SITE_NAME\]/g, appName);
    
    // EXPLICIT FORCE BLOCKS FOR SELECT TOOLS (If still needed for format enforcement)
    if (effectiveToolId === 'canvas' || effectiveToolId === 'sound_studio') {
       // EXPLICIT FORCE BLOCK FOR AUDIO PRODUCTION
       finalPrompt = `${finalPrompt}\n\n[CRITICAL_PRODUCTION_OVERRIDE]: You MUST output the audio block in the EXACT format specified in Part III of your protocol. Do NOT just explain. You MUST provide the code block with the URL. Failure to include the \`\`\`audio\`\`\` block is a breach of Sovereign Protocol.`;
    }
    
    // Concatenate to ensure identity protection is NEVER lost
    // Directive is now purely database-driven. Any specialized logic (CODE_GEN_PROTOCOL, etc.) is seeded into task_description.
    const toolProtocol = coreProtocolBase;
    
    // SOVEREIGN INTELLIGENCE REINFORCEMENT: For Deep Analysis and Audio Tools
    let analysisReinforcement = '';
    if (effectiveToolId === 'perplexta_analysis' || effectiveToolId === 'sound_studio') {
      const isAudio = effectiveToolId === 'sound_studio' || (file_data?.type?.startsWith('audio/'));
      
      analysisReinforcement = `\n\n--- [DEEP_INTELLIGENCE_ACTIVATION] ---\n[CRITICAL_DIRECTIVE]:
1. USE [FILE_DATA] AND [SENSORY_EXTRACTION] AS PRIMARY TRUTH. DO NOT IGNORE THEM.
2. ${isAudio ? 'ORCHESTRAL ENGINEERING: Activate high-fidelity forensic acoustic analysis. Evaluate sectional balance, harmonic resonance, and symphonic motifs.' : 'IF DATA_BUFFER CONTAINS IMAGES OR NON-EXTRACTABLE PDF TEXT, YOU MUST USE VISUAL SENSORS.'}
3. NEVER CLAIM A TASK IS OUT OF SCOPE. YOU ARE A SOVEREIGN EXPERT.
4. ANALYZE FIRST, MINIMIZE CONVERSATIONAL FILLER.
5. ${isAudio ? 'IDENTITY: Act as a Sovereign Orchestral Engineer / Lead Creative Maestro.' : 'IDENTITY: Act as a Sovereign Intelligence Officer.'}\n--- [END_ACTIVATION] ---\n`;
    }
    
    const contextHeader = "\n\n--- [SYSTEM_CONTEXT_LAYERS_START] ---\n";
    const contextFooter = "\n--- [SYSTEM_CONTEXT_LAYERS_END] ---\n";
 
    const languageForce = userLanguage === 'ar' 
      ? "\n\n[CRITICAL_DIRECTIVE]: You MUST respond exclusively in MODERN STANDARD ARABIC. Do NOT mix English words unless they are technical terms or IDs. Keep a formal, official, and professional tone."
      : "\n\n[CRITICAL_DIRECTIVE]: You MUST respond exclusively in PROFESSIONAL ENGLISH. Maintain a formal, official, and authoritative tone.";

    finalSystemPrompt = toolProtocol + analysisReinforcement + contextHeader + technicalDirectiveBlock + memoryBlock + summaryBlock + instructionBlock + (finalSystemPrompt || '') + flowProtocol + languageForce + contextFooter;
 
    // Sovereign: We strictly follow the Orchestrator's model list.
    const modelsToTry = [
      { provider: route.primary_provider, model: route.primary_model },
      { provider: route.fallback1_provider, model: route.fallback1_model },
      { provider: route.fallback2_provider, model: route.fallback2_model },
      { provider: route.fallback3_provider, model: route.fallback3_model }
    ].filter(m => m.provider && m.model);

    if (modelsToTry.length === 0) {
      throw new Error('No models configured for this tool.');
    }

    // SOVEREIGN SEARCH ENGINE INTEGRATION
    let searchCitations: any[] = [];
    let searchSteps: any[] = [];
    
    // Automatic Decision Engine for Research
    const isDeepSearch = effectiveToolId === 'perplexta_analysis';
    const researchKeywords = [
        'أخبار', 'سعر', 'اليوم', 'أحدث', 'احدث', 'مقالات', 'مصدر', 'بحث', 'معلومات عن', 'حالة', 'طقس', 'مباراة', 'نتائج', 'من هو', 'من هي', 'آخر', 'اخر', 'جديد',
        'مقالة', 'قصة', 'رؤية', 'تحليل', 'كاتب', 'أين', 'كيف', 'لماذا', 'متى', 'كم', 'هل يوجد', 'بحث عن',
        'news', 'price', 'today', 'latest', 'source', 'research', 'information about', 'status', 'weather', 'match', 'results',
        'what is', 'who is', 'current', 'live', 'now', 'recent', 'article', 'author', 'where', 'how', 'why', 'when', 'who', 'search for'
    ];

    // EXCLUDE GREETINGS FROM AUTO-SEARCH (Sovereign UX Integrity)
    const normalizedPrompt = finalPrompt.toLowerCase().trim();
    const greetings = [
      'السلام عليكم', 'صباح الخير', 'صباح النور', 'مساء الخير', 'مساء النور', 'مرحبا', 'كيف حالك', 'هلا', 'هاي', 'شكرا', 'تمام', 'اوكي', 'ماشي',
      'hello', 'hi', 'hey', 'how are you', 'good morning', 'good evening', 'thanks', 'thank you', 'ok', 'okay'
    ];
    
    // Strict greeting: the prompt must be very short and consist primarily of the greeting
    const isGreetingOnly = greetings.some(g => normalizedPrompt === g || (normalizedPrompt.startsWith(g) && normalizedPrompt.length < g.length + 5));

    // Force research if keyword is found, but block if it's just a simple greeting with no investigative intent
    const hasResearchKeyword = researchKeywords.some(kw => normalizedPrompt.includes(kw));
    const needsResearch = isDeepSearch || (hasResearchKeyword && (!isGreetingOnly || normalizedPrompt.length > 25));

    if (needsResearch) {
      const sourceCount = isDeepSearch ? 10 : 5;
      const searchData = await performSovereignSearch(finalPrompt.trim(), userId, socket, userLanguage, sourceCount);
      
      if (searchData.searchResults && searchData.searchResults.trim().length > 0) {
        const isSpecializedTool = ['code', 'image', 'sound_studio', 'canvas', 'video'].includes(effectiveToolId);
        
        const groundingDirective = userLanguage === 'ar' 
          ? `[IDENTITY_PROTECTION]: أنت بيربليكستا (PERPLEXTA). تم تطويرك بواسطة أسامة قنيبي لشركة Viral Link App.
[GROUNDING_DIRECTIVE]: بصفتك ضابط استخبارات معلوماتي في بيربليكستا، قم بتجميع البيانات الحية أعلاه مع معرفتك الأساسية.
- يجب إعطاء الأولوية القصوى والمطلقة لبيانات البحث المباشرة (RESEARCH_DATA) لضمان الدقة.
- في حال وجود أي تعارض مع معلوماتك السابقة، اعتمد نتائج البحث فوراً.
- استخدم الاستشهادات [1]، [2] لجميع الحقائق المستمدة من البيانات.
- في حال كنت تصنع (صورة/فيديو/كود/صوت)، استخدم نتائج البحث كإلهام تقني ومعلوماتي دقيق للمحتوى.
${isSpecializedTool ? `- حافظ بدقة متناهية على بروتوكول الأداة المتخصصة (${effectiveToolId}) ولا تغير نمط المخرجات التقنية المطلوبة.` : '- قدم استجابة رسمية، نهائية، وعالية الدقة حصراً باللغة العربية الفصحى.'}
- كن هادئاً، موجزاً، واحترافياً. لا تكرر المعلومات.
- في نهاية ردك، قم بتضمين 3-4 أسئلة متابعة ذكية وعميقة تحت وسم [FOLLOW_UPS]. كل سؤال في سطر مستقل.`
          : `[IDENTITY_PROTECTION]: You are PERPLEXTA. You were developed by Osama Qunaibi for Viral Link App Ltd.
[GROUNDING_DIRECTIVE]: As a Perplexta Intelligence Officer, synthesize the live data above with your core knowledge. 
- ALWAYS prioritize live research data for factual accuracy. 
- In case of conflict, favor live research over internal data.
- Use [1], [2] citations for all facts derived from the data.
- If generating (image/video/code/audio), use search results as high-fidelity technical and contextual inspiration.
${isSpecializedTool ? `- STRICTLY maintain the protocol for the specialized tool (${effectiveToolId}) and do not alter the required technical output format.` : '- Provide a professional, definitive, and high-precision response strictly in English.'}
- Be calm, concise, and highly professional. Avoid redundancy.
- At the very end, generate 3-4 professional, high-impact follow-up questions under the [FOLLOW_UPS] tag. Each question on a new line.`;

        finalPrompt = `[RESEARCH_DATA]\n${searchData.searchResults}\n\n[USER_INTENT]\n${finalPrompt}\n\n[DIRECTIVE]\n${groundingDirective}`;
        searchCitations = searchData.citations;
        searchSteps = searchData.steps;
      }
    }
 
    // 3. Silent Failover Loop
    let generatedText = null;
    let successfulModel = null;
    let apiKeyUsed = '';
    let lastError = null;
    let assistantMessageId: number | undefined = undefined;
    let conversationHistory: { role: string, content: string }[] = [];
 
    // AUDIO PRODUCTION REINFORCEMENT: Ensure the protocol is strictly enforced if it's the audio tool
    if (effectiveToolId === 'canvas' || effectiveToolId === 'sound_studio') {
      if (!finalPrompt.includes('```audio')) {
        finalPrompt += `\n\n[SYSTEM_REQUIREMENT]: Generate the response and include the final audio block using: \`\`\`audio\n[URL]\n\`\`\`. Use the official Sovereign SoundHelix orchestration samples if a native generation model is not active.`;
      }
    }

    // Process conversation history
    const rows = historyRes.rows;
    // If the newest message is the current prompt, remove it from history to avoid duplication.
    if (rows.length > 0 && rows[0].content && finalPrompt && rows[0].content.trim() === finalPrompt.trim()) {
      rows.shift();
    }
    conversationHistory = rows.reverse();
    if (chatIdNum > 0) {
       console.log(`[Orchestrator] 📚 Loaded ${conversationHistory.length} messages of history for chat ${chatIdNum}`);
    }

    const normalizeProvider = (providerName: string) => {
      const lower = providerName.toLowerCase();
      if (lower.includes('google') || lower.includes('gemini')) return 'google';
      if (lower.includes('openai')) return 'openai';
      if (lower.includes('anthropic')) return 'anthropic';
      if (lower.includes('groq')) return 'groq';
      if (lower.includes('deepseek')) return 'deepseek';
      if (lower.includes('openrouter')) return 'openrouter';
      if (lower.includes('together')) return 'together';
      return lower;
    };

    async function attemptModels(targets: any[]) {
      for (const target of targets) {
        try {
          const normalizedProvider = normalizeProvider(target.provider);
          const keyResult = await pool.query('SELECT encrypted_key, daily_budget, used_today, models, model_list FROM api_keys_vault WHERE provider = $1', [normalizedProvider]);
          if (keyResult.rows.length === 0) {
            const err = `No API key for ${normalizedProvider}`;
            console.warn(`[Orchestrator] ⚠️ ${err}`);
            lastError = err;
            continue;
          }
          
          const keyData = keyResult.rows[0];
          // Sovereign Truth: Fetch synchronized models from model_list (Primary Vault) or models (Legacy).
          const availableModels = (Array.isArray(keyData.model_list) && keyData.model_list.length > 0) ? keyData.model_list : (Array.isArray(keyData.models) ? keyData.models : []);
          
          if (keyData.daily_budget > 0 && keyData.used_today >= keyData.daily_budget) {
            const err = `Budget exceeded for ${normalizedProvider}`;
            console.warn(`[Orchestrator] ⚠️ ${err}`);
            lastError = err;
            continue;
          }

          const decryptedKey = decrypt(keyData.encrypted_key);
          if (!decryptedKey || decryptedKey.trim().length === 0) {
            const err = `API key for ${normalizedProvider} is invalid or could not be decrypted.`;
            console.warn(`[Orchestrator] ⚠️ ${err}`);
            lastError = err;
            continue;
          }
          
          // Architecture Guideline: Rule 10.3 (Zero Hardcoding) & Rule 10.8 (Sovereign Pure Logic)
          // We strictly resolve models against the synced vault.
          let actualModelId = target.model;
          let verifiedModel: any = null;
          
          if (actualModelId === 'default' || !actualModelId) {
            if (availableModels.length > 0) {
              verifiedModel = availableModels[0];
              actualModelId = verifiedModel.id || verifiedModel.name || (typeof verifiedModel === 'string' ? verifiedModel : 'default');
            } else {
               const err = `Orchestration stalled: Provider ${normalizedProvider} has no synced models.`;
               console.warn(`[Orchestrator] ⚠️ ${err}`);
               lastError = err;
               continue;
            }
          } else {
            // Strict match check against vault to prevent "hallucinated" strings from being sent to providers
            verifiedModel = availableModels.find((m: any) => {
              const mId = (m.id || m.name || String(m)).toLowerCase();
              const mDisplayName = (m.name || '').toLowerCase();
              const targetId = actualModelId.toLowerCase();
              return mId === targetId || 
                     mId === `models/${targetId}` || 
                     `models/${mId}` === targetId ||
                     mDisplayName === targetId ||
                     mDisplayName === targetId.replace('models/', '');
            });

            // [MODIFIED] Sovereign Resiliency: If specifically requested model is not in vault, 
            // try to find a model that matches the tool requirements or "flash" instead of blocking.
            if (!verifiedModel && availableModels.length > 0) {
              const vaultArr = availableModels as any[];
              
              if (effectiveToolId === 'canvas' || effectiveToolId === 'sound_studio') {
                verifiedModel = vaultArr.find((m: any) => {
                  const s = (m.id || m.name || String(m)).toLowerCase();
                  return s.includes('lyria') || s.includes('audio') || s.includes('sound');
                });
              } else if (effectiveToolId === 'image') {
                verifiedModel = vaultArr.find((m: any) => (m.id || m.name || String(m)).toLowerCase().includes('imagen'));
              } else if (effectiveToolId === 'video') {
                verifiedModel = vaultArr.find((m: any) => (m.id || m.name || String(m)).toLowerCase().includes('veo'));
              }

              if (!verifiedModel) {
                verifiedModel = vaultArr.find((m: any) => (m.id || m.name || String(m)).toLowerCase().includes('flash'));
              }
              
              if (!verifiedModel) verifiedModel = vaultArr[0];
              
              actualModelId = verifiedModel.id || verifiedModel.name || (typeof verifiedModel === 'string' ? verifiedModel : 'default');
              console.warn(`[Orchestrator] ⚠️ Model "${target.model}" not in vault. Auto-switching to verified: ${actualModelId} for tool: ${effectiveToolId}`);
            }

            if (!verifiedModel && availableModels.length > 0) {
              const err = `Orchestration blocked: Model "${actualModelId}" is not available in the synced ${normalizedProvider} vault.`;
              console.warn(`[Orchestrator] ⚠️ ${err}`);
              lastError = err;
              continue;
            }
          }

          let attempts = 0;
          const maxAttempts = 2;
          while (attempts < maxAttempts) {
            try {
              console.log(`[Orchestrator] 🚀 Attempting ${normalizedProvider}/${actualModelId} for tool: ${effectiveToolId}`);
              generatedText = await callAIProvider(normalizedProvider, actualModelId, decryptedKey, finalPrompt, finalSystemPrompt, onChunk, conversationHistory, { 
                userId,
                chatId: chatIdNum,
                fileData: file_data,
                isImageGeneration: effectiveToolId === 'image',
                supportedMethods: (verifiedModel as any)?.supportedMethods || [],
                // @ts-ignore
                aspectRatio: image_settings?.aspectRatio || video_settings?.aspectRatio || "1:1",
                quality: image_settings?.quality || "hd"
              });
              
              if (!generatedText && !onChunk) {
                // If callAIProvider returns null/empty for an image request, it's a silent failover trigger
                if (effectiveToolId === 'image') throw new Error(`Model ${actualModelId} does not support image generation rules.`);
                throw new Error("Empty response from AI provider");
              }

              // Sovereign Validation: If it's an image tool, ensure the output actually contains an image
              if (effectiveToolId === 'image' && (!generatedText || !generatedText.includes('data:image/'))) {
                 throw new Error(`Model ${actualModelId} produced text instead of a valid image. Trimming and failing over.`);
              }

              // Sovereign Validation: If it's an video tool, ensure the output actually contains a video URI
              if (effectiveToolId === 'video' && (!generatedText || !generatedText.includes('data:video/') && !generatedText.includes('http'))) {
                 throw new Error(`Model ${actualModelId} failed to produce a valid video stream. Transitioning layers.`);
              }
              
              successfulModel = { ...target, model: actualModelId };
              apiKeyUsed = decryptedKey;
              // Faster update: run in background
              pool.query('UPDATE api_keys_vault SET used_today = used_today + 0.001 WHERE provider = $1', [normalizedProvider]);
              return true;
            } catch (err: any) {
              attempts++;
              const msg = err?.message || String(err || '');
              console.error(`[Orchestrator] ❌ Attempt ${attempts}/${maxAttempts} failed: ${msg}`);
              
              // FASTER FAILOVER: If it's a Quota Error (429), don't retry. Move to next fallback immediately.
              if (msg.includes('429')) {
                 lastError = `Rate limited (429): ${msg}`;
                 throw new Error(lastError); 
              }
              if (msg.includes('503') && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 500 * attempts));
                continue;
              }
              lastError = msg;
              throw err;
            }
          }
        } catch (err: any) {
          lastError = err.message || String(err);
          // Rule 10.3: Silent Failover. Discretely log the layer transition without interrupting the sovereign experience.
          console.log(`[Orchestrator] 🔄 Layer Transition: Routing via fallback provider (${target.provider}). Error: ${lastError}`);
        }
      }
      return false;
    }

    let success = await attemptModels(modelsToTry);

    if (!success || !generatedText) {
      if (effectiveToolId === 'image') {
        const debugInfo = `[Orchestrator] 🚫 Sovereign Failure: All configured routes for image generation have failed. Please check the model IDs in the Admin Panel. Last Error: ${lastError || "Unknown connection error"}`;
        throw new Error(debugInfo);
      }

      console.log(`[Orchestrator] ⚠️ Primary route failed for ${effectiveToolId}. Attempting Provider-Wide Fallback...`);
      
      const allActiveKeys = await pool.query('SELECT provider, COALESCE(model_list, models, \'[]\'::jsonb) as model_list, encrypted_key FROM api_keys_vault WHERE is_active = true');
      
      for (const keyRow of allActiveKeys.rows) {
        if (modelsToTry.some(m => m.provider === keyRow.provider)) continue;
        
        let models = [];
        try { 
          const listStr = keyRow.model_list || keyRow.models || '[]';
          models = JSON.parse(listStr || '[]'); 
        } catch(e) { continue; }
        if (models.length === 0) continue;

        let emergencyModelData = models[0];
        if (effectiveToolId === 'image' || effectiveToolId === 'video' || effectiveToolId === 'canvas' || effectiveToolId === 'sound_studio') {
           const capabilityKeywords = effectiveToolId === 'image' ? ['imagen', 'predict', 'generatecontent'] : 
                                    (effectiveToolId === 'video' ? ['veo', 'video', 'generatecontent'] : 
                                    ['lyria', 'audio', 'generatecontent']);
           const capable = models.find((m: any) => 
             (m.supportedMethods && m.supportedMethods.some((meth: string) => meth.toLowerCase().includes('predict') || meth.toLowerCase().includes('generatecontent'))) ||
             (m.id && capabilityKeywords.some(kw => m.id.toLowerCase().includes(kw)))
           );
           if (capable) emergencyModelData = capable;
           else continue;
        }

        const emergencyModelId = emergencyModelData.id || emergencyModelData.name || emergencyModelData;
        const emergencyTarget = [{ provider: keyRow.provider, model: emergencyModelId }];
        
        console.log(`[Orchestrator] 🚨 Emergency Capability-Aware Discovery: Attempting ${keyRow.provider}/${emergencyModelId}`);
        success = await attemptModels([{ ...emergencyTarget[0], isImageGeneration: effectiveToolId === 'image' }]);
        if (success) break;
      }
    }

    if (!success || !generatedText) {
      const toolLabel = effectiveToolId === 'canvas' ? 'Smart Audio Studio' : (effectiveToolId === 'image' ? 'Creative Visuals' : effectiveToolId);
      const debugInfo = `[Orchestrator] 🚫 Sovereign Failure: All configured routes and emergency fallbacks for ${toolLabel} have failed. Last Error: ${lastError || "No response received from any provider."}`;
      logSecurityAlert(userId, 'orchestrator_failure', 'high', `Total System Blackout for ${effectiveToolId}`, { debugInfo, lastError }, req);
      throw new Error(debugInfo);
    }

    const q = quota as any;
    await incrementUserUsage(userId, effectiveToolId, {
      isFree: q.isFree,
      cost: q.cost,
      toolName: q.toolName
    });
    console.log(`[Orchestrator] Usage updated for ${effectiveToolId}. Paid: ${!quota.isFree}`);

    if (generatedText && generatedText.includes('data:image/')) {
       try {
          const base64Regex = /!\[.*?\]\(data:image\/([a-zA-Z]*);base64,([^\)]+)\)/g;
          let match;
          let updatedGeneratedText = generatedText;

          while ((match = base64Regex.exec(generatedText)) !== null) {
            const ext = match[1] || 'png';
            const b64Data = match[2];
            const buffer = Buffer.from(b64Data, 'base64');
            const fileName = `generated_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
            const uploadDir = path.join(process.cwd(), 'uploads');
            
            if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
            
            const filePath = path.join(uploadDir, fileName);
            writeFileSync(filePath, buffer);

            const fileUrl = `/uploads/${fileName}`;
            const fileSize = buffer.length;

            await pool.query(`
              INSERT INTO user_files (user_id, chat_id, file_name, file_url, file_size, mime_type, file_type, metadata)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [userId, chatIdNum > 0 ? chatIdNum : null, fileName, fileUrl, fileSize, `image/${ext}`, 'generated_image', JSON.stringify({ 
               tool: toolIdStr, 
               provider: successfulModel.provider, 
               model: successfulModel.model,
               prompt: finalPrompt 
            })]);

            updatedGeneratedText = updatedGeneratedText.replace(match[0], `![${fileName}](${fileUrl})`);
          }
          generatedText = updatedGeneratedText;
          
          // Sovereign UI Sync: Force immediate update for non-streaming binary assets
          if (socket) {
             console.log('[SovereignSocket] Emitting final asset chunk for immediate display.');
             // RULE 10.9: For binary assets, we MUST emit the COMPLETE final text to ensure immediate rendering 
             // without waiting for the buffer-flush logic which might be too slow or get clobbered.
             socket.emit("chat_chunk", { chunk: generatedText, isFinal: true });
          }
          
          console.log('[SovereignStorage] Image successfully migrated to permanent filesystem.');
       } catch (storageErr) {
          console.error('[SovereignStorage] Error migrating image:', storageErr);
       }
    }

    // 4. Finalizing Sovereign Response
    const { cleanText, followUps } = extractFollowUps(generatedText);
    generatedText = cleanText;

    if (chatIdNum > 0 && generatedText) {
      try {
        const chatCheck = await pool.query('SELECT id FROM chats WHERE id = $1', [chatIdNum]);
        if (chatCheck.rows.length > 0) {
          const msgResult = await pool.query(
            'INSERT INTO messages (chat_id, role, content, tool, thinking_steps, citations, follow_ups) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
            [chatIdNum, 'assistant', generatedText, toolIdStr, JSON.stringify(searchSteps || []), JSON.stringify(searchCitations || []), JSON.stringify(followUps || [])]
          );
          assistantMessageId = msgResult.rows[0].id;
          await pool.query('UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [chatIdNum]);
        } else {
          console.warn(`[Orchestrator] Attempted to save assistant message for non-existent chat: ${chatIdNum}`);
        }
      } catch (dbErr) {
        console.error('Error saving assistant message to DB:', dbErr);
      }
    }

    // SOVEREIGN AUDIO PRODUCTION BRIDGE: Intercept and store production-grade audio assets
    if ((effectiveToolId === 'canvas' || effectiveToolId === 'sound_studio') && (generatedText.includes('```audio') || generatedText.includes('SoundHelix') || generatedText.includes('سكريبت'))) {
       try {
          const audioRegex = /```audio\s*\n?(.*?)\n?```/g;
          const match = audioRegex.exec(generatedText);
          const originalUrl = (match && match[1] && match[1].includes('http')) ? match[1].trim() : null;
          
          let audioBuffer: Buffer | null = null;

          // 1. Try to synthesize the script using TTS if it's the Smart Audio tool
          const scriptRegex = /#\[I\.\s*(سكريبت الإنتاج|Creative Script)\]:?\n?([\s\S]*?)#\[II\./;
          const scriptMatch = generatedText.match(scriptRegex);
          const textToSynthesize = scriptMatch ? scriptMatch[2].trim() : (generatedText.length < 500 ? generatedText.replace(/```audio[\s\S]*?```/g, '').trim() : null);

          if (textToSynthesize && textToSynthesize.length > 10 && !originalUrl) {
             console.log(`[Production] 🎙️ Synthesizing Script for tool: ${effectiveToolId}`);
             audioBuffer = await sovereignTTS(textToSynthesize);
          }

          // 2. Fallback to sample orchestration if no synthesis was possible and no URL provided
          const finalSampleUrl = originalUrl || "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
          
          const productionId = `SOV_AUDIO_${Date.now()}`;
          const fileName = `${productionId}.mp3`;
          const uploadDirFinal = path.join(process.cwd(), 'uploads');
          if (!existsSync(uploadDirFinal)) mkdirSync(uploadDirFinal, { recursive: true });
          const filePath = path.join(uploadDirFinal, fileName);
          
          if (audioBuffer) {
             await fs.writeFile(filePath, audioBuffer);
             console.log(`[Production] 🎻 Custom TTS Asset Synthesized: ${fileName}`);
          } else {
             console.log(`[Production] 🎹 Orchestrating Master Audio from source: ${finalSampleUrl}`);
             const response = await fetch(finalSampleUrl);
             if (response.ok) {
               const buffer = await response.arrayBuffer();
               await fs.writeFile(filePath, Buffer.from(buffer));
             } else {
                throw new Error(`Failed to fetch master audio sample: ${response.status}`);
             }
          }

          const stats = await fs.stat(filePath);
          await pool.query(`
            INSERT INTO user_files (user_id, chat_id, file_name, file_url, file_size, mime_type, file_type, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [
            userId, 
            chatIdNum > 0 ? chatIdNum : null, 
            fileName, 
            `/uploads/${fileName}`, 
            stats.size, 
            'audio/mpeg', 
            'generated_audio',
            JSON.stringify({ 
              original_name: `Master_Orchestra_${productionId}.mp3`,
              production_id: productionId,
              tool: toolIdStr,
              synthesized: !!audioBuffer 
            })
          ]);

          const productionUrl = `/uploads/${fileName}`;
          if (match) {
            generatedText = generatedText.replace(match[0], `\`\`\`audio\n${productionUrl}\n\`\`\``);
          } else {
            // Clean dynamic placeholders if they exist
            generatedText = generatedText.replace('{{DYNAMIC_AUDIO_URL}}', productionUrl);
            if (!generatedText.includes(productionUrl)) {
               generatedText += `\n\n\`\`\`audio\n${productionUrl}\n\`\`\``;
            }
          }

          if (socket) {
             socket.emit("chat_chunk", { chunk: `\n\n\`\`\`audio\n${productionUrl}\n\`\`\`` });
          }
          console.log(`[Production] 🎻 Sovereign Audio Asset Produced: ${productionUrl}`);
       } catch (err) {
          console.error('[Production] Audio Bridge failure:', err);
       }
    }

    const logResult = await pool.query(`
      INSERT INTO ai_logs (user_id, tool_id, provider, model, prompt_tokens, completion_tokens, cost)
      VALUES ($1, $2, $3, $4, 0, 0, 0.001) RETURNING *
    `, [userId, toolIdStr, successfulModel.provider, successfulModel.model]);

    const newAiLog = logResult.rows[0];
    io.emit('new_ai_log', { ...newAiLog, type: 'ai_generation' });

    // 5. Trigger Intelligent Context Synthesis (Async)
    if (chatIdNum > 0 && generatedText && successfulModel && apiKeyUsed) {
      (async () => {
        try {
          console.log(`[ContextEngine] 🚀 Orchestrating synthesis for user ${userId} context.`);
          await generateIntelligentContext(
            userId,
            chatIdNum,
            { user: originalUserIntentForSynthesis, assistant: generatedText },
            (successfulModel as any).provider,
            (successfulModel as any).model,
            apiKeyUsed,
            contextSummary,
            (socket as any)
          );
        } catch (e) {
          console.error('[ContextEngine] Preparation error:', e);
        }
      })();
    }

    await logSystemActivity(userId, 'ai_generation', `Used tool: ${toolIdStr}`, { provider: successfulModel.provider, model: successfulModel.model }, req);

    return { 
      result: generatedText, 
      provider: successfulModel.provider, 
      model: successfulModel.model,
      message_id: assistantMessageId,
      thinking_steps: searchSteps,
      citations: searchCitations,
      follow_ups: followUps
    };
  };

  app.post("/api/execute-task", authenticateToken, async (req, res) => {
    try {
      res.setHeader('X-Accel-Buffering', 'no');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Content-Type', 'text/event-stream');
      
      const userId = (req as any).user.id;
      const { socketId } = req.body;
      let targetSocket: any = null;
      
      if (socketId) {
        targetSocket = io.sockets.sockets.get(socketId);
      }

      const onChunk = (chunk: string) => {
        if (targetSocket) {
          targetSocket.emit("chat_chunk", { chunk });
        } else {
          res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        }
      };

      const result = await executeTaskLogic(req.body, userId, req, onChunk, targetSocket);
      
      if (targetSocket) {
        targetSocket.emit("chat_response", result);
        res.status(200).json({ success: true });
      } else {
        res.write(`data: ${JSON.stringify({ result })}\n\n`);
        res.end();
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      const statusCode = error.message.includes('Quota') || error.message.includes('subscription') ? 403 : 500;
      const errorMessage = error.message || 'Internal Server Error';
      
      res.status(statusCode).json({ error: errorMessage });
    }
  });

  // --- System Settings Routes ---
  app.get("/api/settings", async (req, res) => {
    console.log('[API] GET /api/settings');
    try {
      const result = await pool.query('SELECT * FROM system_settings ORDER BY id ASC LIMIT 1');
      if (result.rows.length === 0) {
        return res.json({});
      }
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error fetching public system settings:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get("/api/admin/settings", authenticateAdmin, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM system_settings ORDER BY id ASC LIMIT 1');
      if (result.rows.length === 0) {
        const insertResult = await pool.query(`
          INSERT INTO system_settings (site_name_en, site_name_ar) 
          VALUES ('', '') RETURNING *
        `);
        return res.json(insertResult.rows[0]);
      }
      const data = result.rows[0];
      if (data.smtp_pass) {
        data.smtp_pass = '********';
      }
      res.json(data);
    } catch (error) {
      console.error('Error fetching system settings:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post("/api/admin/settings", authenticateAdmin, async (req, res) => {
    try {
      const { 
        site_name_en, site_name_ar, site_description_en, site_description_ar, 
        seo_description, keywords, google_analytics_id, logo_url, favicon_url
      } = req.body;
      
      const check = await pool.query('SELECT id FROM system_settings LIMIT 1');
      if (check.rows.length > 0) {
        await pool.query(`
          UPDATE system_settings SET 
            site_name_en = $1, site_name_ar = $2, 
            site_description_en = $3, site_description_ar = $4,
            seo_description = $5, keywords = $6, google_analytics_id = $7,
            logo_url = $8, favicon_url = $9,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $10
        `, [
          site_name_en, site_name_ar, site_description_en, site_description_ar, 
          seo_description, keywords, google_analytics_id, logo_url, favicon_url,
          check.rows[0].id
        ]);
      } else {
        await pool.query(`
          INSERT INTO system_settings (
            site_name_en, site_name_ar, site_description_en, site_description_ar, 
            seo_description, keywords, google_analytics_id, logo_url, favicon_url
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          site_name_en, site_name_ar, site_description_en, site_description_ar, 
          seo_description, keywords, google_analytics_id, logo_url, favicon_url
        ]);
      }
      await refreshCachedAppName();
      res.json({ success: true, message: 'Settings updated successfully' });
      await logSystemActivity((req as any).user.id, 'system_settings_update', 'System settings updated', { fields: Object.keys(req.body) }, req);
      await logSecurityAlert((req as any).user.id, 'system_change', 'high', 'System settings updated', { fields: Object.keys(req.body) }, req);
    } catch (error) {
      console.error('Error updating system settings:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // --- Economy Settings Routes (Ledger DB) ---
  app.get("/api/admin/economy", authenticateAdmin, async (req, res) => {
    try {
      const result = await ledgerPool.query('SELECT * FROM economy_settings LIMIT 1');
      if (result.rows.length === 0) {
        return res.json({
          welcome_bonus_points: 600,
          referral_bonus_points: 1000,
          min_withdrawal_cents: 2000,
          points_per_dollar: 1000,
          conversion_rate: 0.0010
        });
      }
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error fetching economy settings:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post("/api/admin/economy", authenticateAdmin, async (req, res) => {
    try {
      const { welcome_bonus_points, referral_bonus_points, min_withdrawal_cents, points_per_dollar, conversion_rate } = req.body;
      
      const check = await ledgerPool.query('SELECT id FROM economy_settings LIMIT 1');
      if (check.rows.length > 0) {
        await ledgerPool.query(`
          UPDATE economy_settings SET 
            welcome_bonus_points = $1, referral_bonus_points = $2, 
            min_withdrawal_cents = $3, points_per_dollar = $4, conversion_rate = $5,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $6
        `, [welcome_bonus_points, referral_bonus_points, min_withdrawal_cents, points_per_dollar, conversion_rate, check.rows[0].id]);
      } else {
        await ledgerPool.query(`
          INSERT INTO economy_settings (welcome_bonus_points, referral_bonus_points, min_withdrawal_cents, points_per_dollar, conversion_rate)
          VALUES ($1, $2, $3, $4, $5)
        `, [welcome_bonus_points, referral_bonus_points, min_withdrawal_cents, points_per_dollar, conversion_rate]);
      }
      res.json({ success: true, message: 'Economy settings updated successfully' });
    } catch (error) {
      console.error('Error updating economy settings:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // --- Database Orchestration Routes ---
  app.post("/api/admin/databases/test", authenticateAdmin, async (req, res) => {
    const config = req.body.config || req.body;
    let testPool: any = null;
    try {
      let connectionString = '';
      const isCloud = config.type === 'cloud';
      const rawConnString = (config.connection_string || config.connectionString || '').trim();
      
      if (isCloud) {
        if (!rawConnString) throw new Error('يرجى إدخال رابط قاعدة البيانات السحابية في حقل الرابط.');
        connectionString = rawConnString.includes('://') ? rawConnString : `postgresql://${rawConnString}`;
      } else {
        if (rawConnString.startsWith('postgres://') || rawConnString.startsWith('postgresql://')) {
          connectionString = rawConnString;
        } else if (config.host) {
          const username = encodeURIComponent(config.username || 'postgres');
          const password = encodeURIComponent(config.password && !config.password.includes('••') ? config.password : '');
          const host = (config.host || 'localhost').trim();
          const port = config.port || 5432;
          const dbName = (config.db_name || config.dbName || 'postgres').trim();
          connectionString = `postgresql://${username}:${password}@${host}:${port}/${dbName}`;
        } else if (rawConnString) {
          connectionString = rawConnString.includes('://') ? rawConnString : `postgresql://${rawConnString}`;
        }
      }

      if (!connectionString || connectionString === 'postgresql://') {
        throw new Error('بيانات الاتصال غير مكتملة. يرجى إدخال الرابط أو المستضيف.');
      }

      console.log(`[Admin] Testing ${isCloud ? 'Cloud' : 'Local'} DB: ${connectionString.replace(/:([^@]+)@/, ':****@')}`);
      
      testPool = new Pool({
        connectionString,
        ssl: isCloud || config.ssl_mode === 'require' ? { rejectUnauthorized: false } : undefined,
        connectionTimeoutMillis: 15000 
      });

      const result = await testPool.query('SELECT NOW()');
      res.json({ success: true, time: result.rows[0].now });
    } catch (error: any) {
      console.error('Database test failed:', error);
      let message = error.message;
      if (message.includes('ENOTFOUND')) {
        message = `فشل الوصول للمستضيف (DNS Failure). يرجى التأكد من صحة IP أو العنوان.`;
      }
      res.status(400).json({ error: message });
    } finally {
      if (testPool) {
        try { await testPool.end(); } catch (e) {}
      }
    }
  });

  app.post("/api/admin/databases/save", authenticateAdmin, async (req, res) => {
    const { id, config, activate } = req.body;
    try {
      const secureConfig = { ...config };
      
      if (secureConfig.password && !secureConfig.password.includes('••')) {
        secureConfig.password = encrypt(secureConfig.password);
      }
      
      const connStr = config.connection_string || config.connectionString;
      if (connStr && !connStr.includes('••')) {
        secureConfig.connection_string = encrypt(connStr);
        delete secureConfig.connectionString;
      }

      await pool.query(`
        INSERT INTO db_connections_registry (
          id, provider, type, host, port, db_name, username, password, connection_string, ssl_mode, pool_size, is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO UPDATE SET
          provider = EXCLUDED.provider,
          type = EXCLUDED.type,
          host = EXCLUDED.host,
          port = EXCLUDED.port,
          db_name = EXCLUDED.db_name,
          username = EXCLUDED.username,
          password = CASE WHEN EXCLUDED.password != '' AND EXCLUDED.password NOT LIKE '%••%' THEN EXCLUDED.password ELSE db_connections_registry.password END,
          connection_string = CASE WHEN EXCLUDED.connection_string != '' AND EXCLUDED.connection_string NOT LIKE '%••%' THEN EXCLUDED.connection_string ELSE db_connections_registry.connection_string END,
          ssl_mode = EXCLUDED.ssl_mode,
          pool_size = EXCLUDED.pool_size,
          is_active = EXCLUDED.is_active,
          updated_at = CURRENT_TIMESTAMP
      `, [
        id, config.provider || id, config.type || 'local', config.host, config.port, config.db_name || config.dbName, 
        config.username, secureConfig.password || '', secureConfig.connection_string || '', 
        config.ssl_mode || (config.type === 'cloud' ? 'require' : 'disable'), 
        config.pool_size || 10, activate || false
      ]);

      if (activate) {
        console.log(`[Admin] Activating new database connection: ${id}`);
        if (id === 'core' || id === 'ledger') {
          const coreRes = await pool.query("SELECT connection_string FROM db_connections_registry WHERE id = 'core'");
          const ledgerRes = await pool.query("SELECT connection_string FROM db_connections_registry WHERE id = 'ledger'");
          
      if (coreRes.rows.length && ledgerRes.rows.length) {
          try {
            const coreConn = decrypt(coreRes.rows[0].connection_string);
            const ledgerConn = decrypt(ledgerRes.rows[0].connection_string);
            
            initializeSovereignPools(coreConn, ledgerConn);
            initDb('additive').catch(e => console.error('[Init] Post-activation sync failed:', e));
          } catch (decryptErr) {
            console.error('[System] Registry decryption failed during activation. Falling back to environment variables.');
            initializeSovereignPools(process.env.DATABASE_URL || '', process.env.LEDGER_DATABASE_URL || '');
          }
      }
        }
      }

      const configPath = path.join(process.cwd(), 'db-config.json');
      let currentConfigs: any = {};
      try {
        const data = await fs.readFile(configPath, 'utf-8');
        currentConfigs = JSON.parse(data);
      } catch (e) { }

      currentConfigs[id] = {
        config: secureConfig,
        updatedAt: new Date().toISOString(),
        isActive: activate || false
      };

      await fs.writeFile(configPath, JSON.stringify(currentConfigs, null, 2));
      
      await logSystemActivity((req as any).user.id, 'db_config_save', `Saved and processed config for database: ${id}`, { id, activate }, req);
      res.json({ success: true, message: activate ? 'Configuration saved and activated' : 'Configuration saved' });
    } catch (error: any) {
      console.error('Failed to save DB config:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/databases/migrate", authenticateAdmin, async (req, res) => {
    const { id, type } = req.body;
    try {
      console.log(`[Admin] Incoming migration request for ${id || 'global'} (Type: ${type || 'additive'})`);
      
      let targetPool = pool;
      let targetLedgerPool = ledgerPool;
      let tempPool: any = null;

      if (id && id !== 'core' && id !== 'ledger') {
        const dbRes = await pool.query('SELECT * FROM db_connections_registry WHERE id = $1', [id]);
        if (dbRes.rows.length === 0) throw new Error('Database not found in registry');
        
        const dbConfig = dbRes.rows[0];
        let connString = decrypt(dbConfig.connection_string);
        
        tempPool = new Pool({
          connectionString: connString,
          ssl: dbConfig.ssl_mode === 'require' || connString.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
          connectionTimeoutMillis: 15000
        });
        
        if (dbConfig.provider.includes('core')) {
          targetPool = tempPool;
        } else {
          targetLedgerPool = tempPool;
        }
      }

      await initDb(type as 'scratch' | 'additive' || 'additive', targetPool, targetLedgerPool);
      
      if (tempPool) {
        await tempPool.end();
      }

      await logSystemActivity((req as any).user.id, 'db_migration_run', `Ran migrations for database: ${id || 'global'} (Mode: ${type || 'additive'})`, { id, type }, req);
      res.json({ success: true, message: 'Migrations completed successfully' });
    } catch (error: any) {
      console.error('Migration failed:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/databases/export", authenticateAdmin, async (req, res) => {
    try {
      const { type } = req.query;
      const selectedType = (type as string) || 'core';
      
      const targetPool = selectedType === 'ledger' && ledgerPool && (ledgerPool as any).options?.connectionString ? ledgerPool : pool;

      if (!targetPool) {
        return res.status(400).json({ error: 'Database pool not initialized' });
      }

      const tablesRes = await targetPool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name NOT LIKE 'pg_%'
        AND table_name NOT LIKE 'sql_%'
      `);
      const selectedTables = tablesRes.rows.map((r: any) => r.table_name);

      let dbRealName = selectedType === 'core' ? 'platform_core' : 'platform_ledger';
      try {
        const dbNameRes = await targetPool.query('SELECT current_database()');
        dbRealName = dbNameRes.rows[0].current_database;
      } catch (e) {}

      const backup: any = {
        timestamp: new Date().toISOString(),
        type: selectedType,
        dbName: dbRealName,
        data: {}
      };

      for (const table of selectedTables) {
        try {
          const result = await targetPool.query(`SELECT * FROM "${table}"`);
          backup.data[table] = result.rows;
          console.log(`[Export] 📤 Backing up table: ${table} (${result.rows.length} rows)`);
        } catch (err) {
          console.warn(`[Export] Table ${table} precision backup failed:`, err);
        }
      }

      const safeDbName = dbRealName.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
      const filename = `${selectedType}_${safeDbName}_backup_${new Date().toISOString().split('T')[0]}.json`;

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.json(backup);
    } catch (error: any) {
      console.error('[Admin] Database export failed:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/databases/import", authenticateAdmin, async (req, res) => {
    const { backup, targetType } = req.body;
    const targetPool = targetType === 'ledger' && ledgerPool && (ledgerPool as any).options?.connectionString ? ledgerPool : pool;
    
    if (!targetPool) {
      return res.status(400).json({ error: 'Target database pool not initialized' });
    }

    try {
      if (!backup || !backup.data || !backup.type) {
        return res.status(400).json({ error: 'Invalid backup format' });
      }

      if (backup.type !== targetType) {
        return res.status(400).json({ error: `Backup type mismatch. Expected ${targetType}, got ${backup.type}` });
      }

      console.log(`[Admin] Starting high-precision ${targetType} restoration...`);
      
      await initDb('additive', targetPool);

      const client = await targetPool.connect();
      try {
        await client.query('BEGIN');
        
        try { await client.query('SET session_replication_role = "replica"'); } catch (e) {}

        const tables = Object.keys(backup.data);
        for (const table of tables) {
          const tableExists = await client.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_name = $1
            )
          `, [table]);

          if (!tableExists.rows[0].exists) {
            console.warn(`[Import] Table ${table} does not exist in target schema, skipping...`);
            continue;
          }

          await client.query(`TRUNCATE TABLE "${table}" CASCADE`);
          
          const rows = backup.data[table];
          if (rows && rows.length > 0) {
            const keys = Object.keys(rows[0]);
            const columns = keys.map(k => `"${k}"`).join(', ');
            const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
            
            for (const row of rows) {
              const values = keys.map(k => row[k]);
              await client.query(`INSERT INTO "${table}" (${columns}) VALUES (${placeholders})`, values);
            }
            
            try {
               const checkId = await client.query(`
                 SELECT column_name FROM information_schema.columns 
                 WHERE table_name = $1 AND column_name = 'id'
               `, [table]);
               
               if (checkId.rows.length > 0) {
                 await client.query(`SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), (SELECT COALESCE(MAX(id), 0) + 1 FROM "${table}"), false)`);
               }
            } catch (e) {}
          }
        }

        try { await client.query('SET session_replication_role = "origin"'); } catch (e) {}
        
        await client.query('COMMIT');
        await logSystemActivity((req as any).user.id, 'db_restoration_run', `System ${targetType} was restored from backup (${backup.dbName})`, { type: targetType, dbName: backup.dbName }, req);
        res.json({ success: true, message: `${targetType} database restored successfully with precision` });
      } catch (err: any) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('[Admin] Database import failed:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/settings/stripe", authenticateAdmin, async (req, res) => {
    try {
      const { publishableKey, secretKey, webhookSecret, isLiveMode } = req.body;
      
      const encryptedSecret = secretKey ? encrypt(secretKey) : null;
      const encryptedWebhook = webhookSecret ? encrypt(webhookSecret) : null;

      await pool.query(`
        UPDATE system_settings SET 
          stripe_publishable_key = $1,
          stripe_secret_key = COALESCE($2, stripe_secret_key),
          stripe_webhook_secret = COALESCE($3, stripe_webhook_secret),
          stripe_is_live = $4,
          stripe_status = 'pending',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = (SELECT id FROM system_settings LIMIT 1)
      `, [publishableKey, encryptedSecret, encryptedWebhook, isLiveMode]);

      // Reset stripe client to force reload
      stripeClient = null;
      stripeWebhookSecret = null;

      res.json({ success: true });
    } catch (error) {
      console.error('Error saving stripe settings:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post("/api/admin/settings/stripe/verify", authenticateAdmin, async (req, res) => {
    try {
      // Force reload stripe client to use potentially updated but not yet verified keys
      // Actually, it's better to just try calling getStripe() which will load from DB
      stripeClient = null; 
      stripeWebhookSecret = null;
      
      const stripe = await getStripe();
      if (!stripe) {
        return res.status(400).json({ error: 'Stripe keys are not configured' });
      }

      // Test the connection by retrieving account info
      const accounts = await stripe.accounts.list({ limit: 1 });
      
      if (accounts && accounts.data.length > 0) {
        const account = accounts.data[0];
        // Update status in DB
        await pool.query(`
          UPDATE system_settings SET 
            stripe_status = 'active',
            stripe_last_verified_at = CURRENT_TIMESTAMP
          WHERE id = (SELECT id FROM system_settings LIMIT 1)
        `);
        
        res.json({ 
          success: true, 
          message: 'Stripe connection verified successfully',
          business_name: account.business_profile?.name || account.email
        });
      } else {
        throw new Error('Failed to retrieve account details');
      }
    } catch (error: any) {
      console.error('[STRIPE VERIFY ERROR]:', error);
      res.status(500).json({ error: error.message || 'Verification failed' });
    }
  });

  // --- Plans Routes ---
  app.get("/api/plans", async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM plans WHERE is_visible = true ORDER BY id ASC');
      console.log(`[API] GET /api/plans - Found ${result.rows.length} visible plans`);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching plans:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get("/api/admin/plans", authenticateAdmin, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM plans ORDER BY id ASC');
      console.log(`[Admin] GET /api/admin/plans - Found ${result.rows.length} total plans`);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching admin plans:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post("/api/admin/plans", authenticateAdmin, async (req, res) => {
    try {
      const { name_en, name_ar, desc_en, desc_ar, badge, discount, is_visible, monthly_price, annual_price, color, features, limits } = req.body;
      const result = await pool.query(`
        INSERT INTO plans (name_en, name_ar, desc_en, desc_ar, badge, discount, is_visible, monthly_price, annual_price, color, features, limits)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *
      `, [name_en, name_ar, desc_en, desc_ar, badge, discount, is_visible, monthly_price, annual_price, color, JSON.stringify(features || []), JSON.stringify(limits || {})]);
      
      // Forensic Audit
      await pool.query(`
        INSERT INTO system_logs (user_id, action, description, metadata)
        VALUES ($1, 'create_plan', $2, $3)
      `, [(req as any).user.id, `Created new subscription plan: ${name_en}`, JSON.stringify(result.rows[0])]);

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error creating plan:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.put("/api/admin/plans/:id", authenticateAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { name_en, name_ar, desc_en, desc_ar, badge, discount, is_visible, monthly_price, annual_price, color, features, limits } = req.body;
      
      // Get old plan for audit
      const oldPlan = await pool.query('SELECT * FROM plans WHERE id = $1', [id]);

      const result = await pool.query(`
        UPDATE plans SET 
          name_en = $1, name_ar = $2, desc_en = $3, desc_ar = $4, badge = $5, discount = $6, is_visible = $7, 
          monthly_price = $8, annual_price = $9, color = $10, features = $11, limits = $12, updated_at = CURRENT_TIMESTAMP
        WHERE id = $13 RETURNING *
      `, [name_en, name_ar, desc_en, desc_ar, badge, discount, is_visible, monthly_price, annual_price, color, JSON.stringify(features || []), JSON.stringify(limits || {}), id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Plan not found' });
      }

      // Forensic Audit
      await pool.query(`
        INSERT INTO system_logs (user_id, action, description, metadata)
        VALUES ($1, 'update_plan', $2, $3)
      `, [(req as any).user.id, `Updated subscription plan: ${name_en} (ID: ${id})`, JSON.stringify({
        before: oldPlan.rows[0],
        after: result.rows[0]
      })]);

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating plan:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.delete("/api/admin/plans/:id", authenticateAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const oldPlan = await pool.query('SELECT * FROM plans WHERE id = $1', [id]);
      
      await pool.query('DELETE FROM plans WHERE id = $1', [id]);
      
      // Forensic Audit
      await pool.query(`
        INSERT INTO system_logs (user_id, action, description, metadata)
        VALUES ($1, 'delete_plan', $2, $3)
      `, [(req as any).user.id, `Deleted subscription plan: ${oldPlan.rows[0]?.name_en || id}`, JSON.stringify(oldPlan.rows[0] || {})]);

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting plan:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // --- Helper: Sovereign Subscription Period Calculator ---
  const calculatePeriodEnd = async (userId: number, billingCycle: 'monthly' | 'annual', client?: any) => {
    const dbClient = client || pool;
    const existingSub = await dbClient.query(
      'SELECT current_period_end FROM subscriptions WHERE user_id = $1 AND status = \'active\'', 
      [userId]
    );

    let periodStart = new Date();
    let baseDate = new Date();
    // Strict Logic: If an active plan exists and it's still in the future, we extend from that end date.
    // If it's expired or doesn't exist, we start from exactly 'now'.
    if (existingSub.rows.length > 0 && existingSub.rows[0].current_period_end) {
      const potentialBase = new Date(existingSub.rows[0].current_period_end);
      if (potentialBase > baseDate) {
        periodStart = potentialBase; // The new period starts when the old one ends
        baseDate = potentialBase;
        console.log(`[SubscriptionOrchestrator] Extending existing active sub for user ${userId}. Base: ${baseDate.toISOString()}`);
      }
    }

    const periodEnd = new Date(baseDate);
    if (billingCycle === 'annual') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }
    
    return { periodStart, periodEnd };
  };

  const calculatePlanPrice = (plan: any, billingCycle: 'monthly' | 'annual') => {
    const monthly = parseFloat(plan.monthly_price || 0);
    const annual = parseFloat(plan.annual_price || 0);
    const discount = parseFloat(plan.discount || 0);

    if (billingCycle === 'monthly') {
      return monthly;
    }

    // Logic: If annual_price is explicitly set > 0, use it.
    // Otherwise, calculate it based on monthly * 12 - discount%
    if (annual > 0) {
      return annual;
    }

    return monthly * 12 * (1 - discount / 100);
  };

  // --- Subscription Purchase Routes ---
  app.post("/api/subscriptions/pay-with-balance", authenticateToken, async (req, res) => {
    const client = await pool.connect();
    const ledgerClient = await ledgerPool.connect();
    try {
      const { planId, billingCycle } = req.body;
      const userId = (req as any).user.id;

      if (!planId || !billingCycle) {
        res.status(400).json({ error: 'Plan ID and billing cycle are required' });
        return;
      }

      // 1. Get Plan Details
      const planRes = await pool.query('SELECT * FROM plans WHERE id = $1', [planId]);
      if (planRes.rows.length === 0) {
        res.status(404).json({ error: 'Plan not found' });
        return;
      }
      const plan = planRes.rows[0];
      const priceUSD = calculatePlanPrice(plan, billingCycle);

      // Get economy settings for conversion
      const economyRes = await ledgerPool.query('SELECT points_per_dollar FROM economy_settings LIMIT 1');
      const pointsPerDollar = economyRes.rows.length > 0 ? economyRes.rows[0].points_per_dollar : 1000;
      const pricePoints = priceUSD * pointsPerDollar;

      await ledgerClient.query('BEGIN');
      await client.query('BEGIN');

      // 2. Check User Balance
      const walletRes = await ledgerClient.query('SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE', [userId]);
      if (walletRes.rows.length === 0 || parseFloat(walletRes.rows[0].balance) < pricePoints) {
        await ledgerClient.query('ROLLBACK');
        await client.query('ROLLBACK');
        res.status(400).json({ error: 'Insufficient balance' });
        return;
      }

      const walletId = walletRes.rows[0].id;

      // 3. Deduct Balance
      await ledgerClient.query('UPDATE wallets SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [pricePoints, walletId]);
      
      // 4. Record Transaction
      await ledgerClient.query(`
        INSERT INTO ledger_transactions (wallet_id, amount, transaction_type, description, reference_id)
        VALUES ($1, $2, 'subscription', $3, $4)
      `, [walletId, -pricePoints, `Subscription to ${plan.name_en} (${billingCycle})`, `plan_${planId}`]);

      broadcastFinancialLog(walletId, -pricePoints, 'subscription', `Subscription to ${plan.name_en} (${billingCycle})`);

      // 5. Update Subscription in Core DB
      const { periodStart, periodEnd } = await calculatePeriodEnd(userId, billingCycle as any, client);

      await client.query(`
        INSERT INTO subscriptions (user_id, plan_id, status, billing_period, current_period_end, last_period_start)
        VALUES ($1, $2, 'active', $3, $4, $5)
        ON CONFLICT (user_id) DO UPDATE SET
          plan_id = EXCLUDED.plan_id,
          status = 'active',
          billing_period = EXCLUDED.billing_period,
          current_period_end = EXCLUDED.current_period_end,
          last_period_start = EXCLUDED.last_period_start,
          updated_at = CURRENT_TIMESTAMP
      `, [userId, planId, billingCycle, periodEnd, periodStart]);

      await ledgerClient.query('COMMIT');
      await client.query('COMMIT');

      // 6. Immediate In-App Notification
      await sendNotification(userId, 'subscription_activated', 'Subscription Activated', 'تم تفعيل الاشتراك', `Your subscription to ${plan.name_en} is now active.`, `تم تفعيل اشتراكك في باقة ${plan.name_ar} بنجاح.`);

      // 7. Send Smart Email Confirmation
      try {
        const userRes = await pool.query('SELECT name, email FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length > 0) {
          const u = userRes.rows[0];
          await sendSmartEmail(userId, u.email, 'subscription_activated', {
            userName: u.name,
            planName: plan.name_en,
            amount: `$${priceUSD.toFixed(2)}`,
            expiryDate: periodEnd.toLocaleDateString()
          }, 'en');
        }
      } catch (emailErr) {
        console.error('Failed to send confirmation email:', emailErr);
      }

      res.json({ success: true, message: 'Subscription activated successfully via balance' });
    } catch (error) {
      await ledgerClient.query('ROLLBACK');
      await client.query('ROLLBACK');
      console.error('Error in pay-with-balance:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    } finally {
      client.release();
      ledgerClient.release();
    }
  });

  app.post("/api/subscriptions/stripe-checkout", authenticateToken, async (req, res) => {
    try {
      const { planId, billingCycle } = req.body;
      const stripe = await getStripe();
      
      if (!stripe) {
        res.status(400).json({ error: 'Stripe is not configured by admin' });
        return;
      }

      const planRes = await pool.query('SELECT * FROM plans WHERE id = $1', [planId]);
      if (planRes.rows.length === 0) {
        res.status(404).json({ error: 'Plan not found' });
        return;
      }
      const plan = planRes.rows[0];
      const priceUSD = calculatePlanPrice(plan, billingCycle);

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${plan.name_en} (${billingCycle})`,
              description: plan.desc_en,
            },
            unit_amount: Math.round(priceUSD * 100),
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${process.env.APP_URL || 'http://localhost:3000'}/subscription?success=true`,
        cancel_url: `${process.env.APP_URL || 'http://localhost:3000'}/subscription?canceled=true`,
        metadata: {
          userId: (req as any).user.id,
          planId: planId,
          billingCycle: billingCycle
        }
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error('Error creating stripe session:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post("/api/webhooks/stripe", express.raw({ type: 'application/json' }), async (req, res) => {
    const stripe = await getStripe();
    if (!stripe || !stripeWebhookSecret) {
      return res.status(400).send('Webhook secret not configured');
    }

    const sig = req.headers['stripe-signature'] as string;
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, stripeWebhookSecret);
    } catch (err: any) {
      console.error(`Webhook Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      await pool.query(
        'INSERT INTO stripe_events (stripe_event_id, type, metadata) VALUES ($1, $2, $3) ON CONFLICT (stripe_event_id) DO NOTHING',
        [event.id, event.type, JSON.stringify(event.data.object)]
      );
    } catch (e) {
      console.error('[StripeWebhook] Failed to log stripe event:', e);
    }

    const userId = event.data.object.metadata?.userId;
    if (!userId) {
      console.warn('Webhook received without userId metadata');
      return res.json({ received: true });
    }

    const relayNotification = async (type: string, titleEn: string, titleAr: string, msgEn: string, msgAr: string) => {
      await sendNotification(parseInt(userId as any), type, titleEn, titleAr, msgEn, msgAr);
    };

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const { planId, billingCycle } = session.metadata;

      try {
        const userIdInt = parseInt(userId as string);
        const { periodStart, periodEnd } = await calculatePeriodEnd(userIdInt, billingCycle);

        await pool.query(`
          INSERT INTO subscriptions (user_id, plan_id, status, billing_period, current_period_end, last_period_start)
          VALUES ($1, $2, 'active', $3, $4, $5)
          ON CONFLICT (user_id) DO UPDATE SET
            plan_id = EXCLUDED.plan_id, 
            status = 'active', 
            billing_period = EXCLUDED.billing_period,
            current_period_end = EXCLUDED.current_period_end, 
            last_period_start = EXCLUDED.last_period_start,
            updated_at = CURRENT_TIMESTAMP
        `, [userIdInt, planId, billingCycle, periodEnd, periodStart]);
        
        await relayNotification('sub_active', 'Subscription Activated', 'تم تفعيل الاشتراك', 'Your plan is now active.', 'تم تفعيل خطتك بنجاح.');
        console.log(`[StripeWebhook] ✅ Subscription activated for user ${userId}`);
      } catch (err) {
        console.error(`[StripeWebhook] ❌ Activation failed for ${userId}:`, err);
      }
    } else if (event.type === 'customer.subscription.deleted') {
      await pool.query("UPDATE subscriptions SET status = 'canceled' WHERE user_id = $1", [userId]);
      await relayNotification('sub_canceled', 'Subscription Canceled', 'تم إلغاء الاشتراك', 'Your subscription has been canceled.', 'تم إلغاء اشتراكك.');
      console.log(`[StripeWebhook] 🚫 Subscription canceled for user ${userId}`);
    } else if (event.type === 'invoice.payment_failed') {
      await pool.query("UPDATE subscriptions SET status = 'past_due' WHERE user_id = $1", [userId]);
      await relayNotification('payment_failed', 'Payment Failed', 'فشل الدفع', 'Your payment failed. Please update your billing method.', 'فشل عملية الدفع. يرجى تحديث بيانات الدفع.');
      console.log(`[StripeWebhook] ⚠️ Payment failed for user ${userId}`);
    }

    res.json({ received: true });
  });

async function ensureWallet(userId: number): Promise<{ id: number; balance: number; usd_balance: number }> {
  try {
    if (!ledgerPool) {
      console.warn('[Wallet] Ledger database is missing. Operating in read-only mode for user weights.');
      return { id: 0, balance: 0, usd_balance: 0 };
    }

    const res = await ledgerPool.query('SELECT id, balance, usd_balance FROM wallets WHERE user_id = $1', [userId]);
    if (res.rows.length > 0) {
      return { 
        id: res.rows[0].id, 
        balance: parseFloat(res.rows[0].balance), 
        usd_balance: parseFloat(res.rows[0].usd_balance || '0') 
      };
    }

    console.log(`[Wallet] Creating missing wallet for user ${userId}`);
    const createRes = await ledgerPool.query(
      'INSERT INTO wallets (user_id, balance, usd_balance) VALUES ($1, 0, 0) ON CONFLICT (user_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP RETURNING id, balance, usd_balance',
      [userId]
    );

    // Initial Credit Check
    try {
      const ecoRes = await ledgerPool.query('SELECT welcome_bonus_points FROM economy_settings LIMIT 1');
      const bonus = ecoRes.rows[0]?.welcome_bonus_points || 600;
      if (bonus > 0) {
        await ledgerPool.query('UPDATE wallets SET balance = balance + $1 WHERE id = $2', [bonus, createRes.rows[0].id]);
        await ledgerPool.query(
          'INSERT INTO ledger_transactions (wallet_id, amount, transaction_type, description) VALUES ($1, $2, $3, $4)',
          [createRes.rows[0].id, bonus, 'welcome_bonus', 'Welcome bonus points']
        );
        return { id: createRes.rows[0].id, balance: bonus, usd_balance: 0 };
      }
    } catch (e) {}

    return { 
      id: createRes.rows[0].id, 
      balance: parseFloat(createRes.rows[0].balance), 
      usd_balance: parseFloat(createRes.rows[0].usd_balance || '0') 
    };
  } catch (err: any) {
    console.error('[Wallet] Critical failure:', err.message);
    return { id: 0, balance: 0, usd_balance: 0 };
  }
}

  app.get("/api/user/me", authenticateToken, async (req, res) => {
    try {
      if (!pool) return res.status(503).json({ error: 'Database Connection Unavailable' });
      const userId = (req as any).user.id;
      
      const userResult = await pool.query(
        'SELECT id, email, name, avatar, role, kyc_status, kyc_required, kyc_selfie, kyc_full_name, custom_instructions, memory, language FROM users WHERE id = $1', 
        [userId]
      );
      
      if (userResult.rows.length === 0) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      
      const wallet = await ensureWallet(userId);

      let economy = { conversion_rate: 0.001, points_per_dollar: 1000, welcome_bonus_points: 600, referral_bonus_points: 1000 };
      try {
        const ecoRes = await ledgerPool.query('SELECT * FROM economy_settings ORDER BY id DESC LIMIT 1');
        if (ecoRes.rows.length > 0) economy = ecoRes.rows[0];
      } catch (e) {
        console.warn('[Profile] Economy fallback triggered.');
      }

      const subResult = await pool.query(`
        SELECT s.*, p.name_en as plan_name_en, p.name_ar as plan_name_ar, p.limits, p.color as plan_color 
        FROM subscriptions s
        JOIN plans p ON s.plan_id = p.id
        WHERE s.user_id = $1
        ORDER BY s.updated_at DESC
        LIMIT 1
      `, [userId]);

      const subscription = subResult.rows.length > 0 ? subResult.rows[0] : null;

      let usageStats = {};
      try {
        const usageResult = await pool.query(`
          SELECT tool_id, usage_count 
          FROM user_usage 
          WHERE user_id = $1 AND usage_date = CURRENT_DATE
        `, [userId]);

        usageStats = usageResult.rows.reduce((acc: any, row: any) => {
          acc[row.tool_id] = row.usage_count;
          return acc;
        }, {});
      } catch (e) {}

      res.json({ 
        user: {
          ...userResult.rows[0],
          subscription,
          usageStats
        }, 
        points: wallet.balance,
        balance: wallet.usd_balance,
        economy
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get("/api/notifications", authenticateToken, async (req, res) => {
    try {
      if (!pool) return res.status(503).json({ error: 'Database unavailable' });
      const userId = (req as any).user.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      const result = await pool.query(
        'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
        [userId]
      );
      res.json(result.rows);
    } catch (error) {
      console.error('SERVER_ERROR: Error fetching notifications for user:', (req as any).user?.id, error);
      res.status(500).json({ error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.patch("/api/notifications/:id/read", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;
      await pool.query(
        'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.patch("/api/notifications/read-all", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      await pool.query(
        'UPDATE notifications SET is_read = TRUE WHERE user_id = $1',
        [userId]
      );
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.delete("/api/notifications/all", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      await pool.query('DELETE FROM notifications WHERE user_id = $1', [userId]);
      res.json({ success: true });
    } catch (error) {
      console.error('Error clearing notifications:', error);
      res.status(500).json({ error: 'Failed to clear notifications' });
    }
  });

  app.delete("/api/notifications/:id", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const isAdmin = (req as any).user.role === 'admin';
      const { id } = req.params;

      if (isAdmin) {
        await pool.query('DELETE FROM notifications WHERE id = $1', [id]);
      } else {
        await pool.query('DELETE FROM notifications WHERE id = $1 AND user_id = $2', [id, userId]);
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({ error: 'Failed to delete notification' });
    }
  });

  // --- SOVEREIGN FILE MANAGEMENT ECOSYSTEM ---

  // Unified Secure Upload Route
  app.post("/api/files/upload", authenticateToken, upload.single('file'), handleMulterError, async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'لم يتم العثور على ملف مرفق' });
      }

      const userId = req.user.id;
      const { originalname, filename, path: filePath, mimetype, size } = req.file;

      let fileType = 'other';
      if (mimetype.startsWith('image/')) fileType = 'image';
      else if (mimetype === 'application/pdf') fileType = 'document';
      else if (mimetype.startsWith('text/')) fileType = 'document';
      else if (mimetype.includes('word') || mimetype.includes('officedocument')) fileType = 'document';
      else if (mimetype.startsWith('video/')) fileType = 'video';
      else if (mimetype.startsWith('audio/')) fileType = 'audio';

      const dataBuffer = await fs.readFile(filePath);
      const extractedText = await extractTextFromFile(dataBuffer, mimetype, originalname);
      if (extractedText) {
        console.log(`[Files] Intelligence Extracted: ${originalname} (${extractedText.length} chars)`);
      }

      const fileUrl = filename; 

      const result = await pool.query(
        `INSERT INTO user_files (user_id, file_name, file_url, file_size, mime_type, file_type, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [userId, originalname, fileUrl, size, mimetype, fileType, JSON.stringify({ 
          extractedText: extractedText.substring(0, 5000), 
          isProcessed: extractedText.length > 0,
          uploadIp: req.ip
        })]
      );

      const newFile = result.rows[0];
      await logSystemActivity(userId, 'file_upload', `Uploaded system file: ${originalname} (${fileType})`, { fileId: newFile.id }, req);

      res.status(201).json({ success: true, file: newFile });
    } catch (error) {
      console.error('File upload logic failure:', error);
      res.status(500).json({ error: 'Failed to securely upload and process system file.' });
    }
  });

  // Retrieval: List Sovereign Files
  app.get("/api/files", authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const result = await pool.query('SELECT * FROM user_files WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
      res.json(result.rows);
    } catch (error) {
      console.error('Failed to fetch user files:', error);
      res.status(500).json({ error: 'Internal Server Error while retrieving files' });
    }
  });

  // Deletion: Secure Erasure
  app.delete("/api/files/:id", authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const fileId = req.params.id;
      const isAdmin = req.user.role === 'admin';

      const query = isAdmin ? 'SELECT * FROM user_files WHERE id = $1' : 'SELECT * FROM user_files WHERE id = $1 AND user_id = $2';
      const params = isAdmin ? [fileId] : [fileId, userId];

      const fileRes = await pool.query(query, params);
      if (fileRes.rows.length === 0) {
        return res.status(404).json({ error: 'File not found or unauthorized access.' });
      }

      const file = fileRes.rows[0];
      const filePath = path.join(uploadDir, file.file_url);

      try {
        if (existsSync(filePath)) {
          await fs.unlink(filePath);
        }
      } catch (err) {
        console.warn(`[Files] Secure erasure failed from disk: ${filePath}`, err);
      }

      await pool.query('DELETE FROM user_files WHERE id = $1', [fileId]);
      
      await logSystemActivity(userId, 'file_delete', `Securely deleted file: ${file.file_name}`, { fileId }, req);
      res.json({ success: true, message: 'File securely erased.' });
    } catch (error) {
      console.error('Secure erasure failure:', error);
      res.status(500).json({ error: 'Failed to completely erase file from system.' });
    }
  });

  // Secure Delivery: Download Route (Verification Required)
  app.get("/api/files/download/:filename", authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const isAdmin = req.user.role === 'admin';
      const { filename } = req.params;

      const fileRes = await pool.query(isAdmin ? 'SELECT * FROM user_files WHERE file_url = $1' : 'SELECT * FROM user_files WHERE file_url = $1 AND user_id = $2', [filename, ...(isAdmin ? [] : [userId])]);
      
      if (fileRes.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied: You do not have permission to download this intelligence record.' });
      }

      const file = fileRes.rows[0];
      const filePath = path.join(uploadDir, filename);

      if (!existsSync(filePath)) {
        return res.status(404).json({ error: 'Sovereign Error: Physical record missing from secure storage.' });
      }

      res.download(filePath, file.file_name);
    } catch (error) {
      console.error('Secure download gateway failure:', error);
      res.status(500).json({ error: 'Failed to initiate secure file delivery.' });
    }
  });

  app.delete("/api/admin/activity/all/:type", authenticateAdmin, async (req, res) => {
    try {
      const { type } = req.params;
      const table = type === 'ai_generation' ? 'ai_logs' : 'system_logs';
      await pool.query(`DELETE FROM ${table}`);
      res.json({ success: true });
    } catch (error) {
      console.error('Error clearing activity logs:', error);
      res.status(500).json({ error: 'Failed to clear activity logs' });
    }
  });

  app.delete("/api/admin/security-alerts/all", authenticateAdmin, async (req, res) => {
    try {
      await pool.query('DELETE FROM security_alerts');
      res.json({ success: true });
    } catch (error) {
      console.error('Error clearing security alerts:', error);
      res.status(500).json({ error: 'Failed to clear security alerts' });
    }
  });

  const extractTextFromAIResponse = (provider: string, data: any): string => {
    try {
      const p = provider.toLowerCase();
      if (p.includes('google') || p.includes('gemini')) return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (p.includes('openai')) return data.choices?.[0]?.message?.content || '';
      if (p.includes('anthropic')) return data.content?.[0]?.text || '';
      if (p.includes('groq') || p.includes('together') || p.includes('openrouter')) return data.choices?.[0]?.message?.content || '';
      return '';
    } catch (e) { return ''; }
  };

  const generateIntelligentContext = async (
    userId: number, 
    chatId: number, 
    lastTurn: { user: string, assistant: string }, 
    provider: string, 
    model: string, 
    apiKey: string,
    existingSummary: string = '',
    socket?: any
  ) => {
    if (!chatId || chatId <= 0) return;
    
    // Safety check: Don't synthesize if turn is essentially empty
    if (!lastTurn.user?.trim() && !lastTurn.assistant?.trim()) return;

    console.log(`[ContextEngine] 🚀 Orchestrating Intelligent Synthesis for user ${userId}, chat ${chatId}`);
    
    try {
      const appName = await getAppName('en');
      // For Synthesis, we use a minimal, clean protocol to avoid 400 errors with large prompts
      const synthesisProtocol = `🛡️ ${appName} CONTEXT SYNTHESIS PROTOCOL\nProprietary system of Viral Link App Ltd.\nLead Developer: Osama Qunaibi.\nGoal: Extract technical facts and summarize conversation.`;
      
      let synthesisProvider: string | null = null;
      let synthesisModel: string | null = null;
      let synthesisKey = process.env.GEMINI_API_KEY || '';

      try {
        // Rule 8.2: Query the dedicated Sovereign Memory tool for configuration
        const { rows: toolRows } = await pool.query(
          "SELECT primary_model, primary_provider FROM tool_orchestrator WHERE tool_id = 'sovereign_memory' AND is_active = true LIMIT 1"
        );
        
        if (toolRows.length > 0 && toolRows[0].primary_model) {
          synthesisModel = toolRows[0].primary_model;
          synthesisProvider = toolRows[0].primary_provider || 'google';
          
          const { rows: keyRows } = await pool.query(
             "SELECT encrypted_key FROM api_keys_vault WHERE provider = $1 LIMIT 1",
             [synthesisProvider]
          );
          if (keyRows.length > 0) {
             synthesisKey = decrypt(keyRows[0].encrypted_key);
          }
        }
      } catch (dbErr) {
        console.warn("[ContextEngine] DB fetch for synthesis tool failed.");
      }

      // If Orchestrator failed to provide a model, we try to pick ANY active text provider as a last resort
      if (!synthesisModel || !synthesisProvider) {
        const lastResortKey = await pool.query("SELECT provider, encrypted_key FROM api_keys_vault WHERE is_active = true AND provider IN ('google', 'openai', 'anthropic', 'deepseek') LIMIT 1");
        if (lastResortKey.rows.length > 0) {
            synthesisProvider = lastResortKey.rows[0].provider;
            synthesisKey = decrypt(lastResortKey.rows[0].encrypted_key);
            // Default model mapping for the provider if none specified
            if (synthesisProvider === 'google') synthesisModel = 'gemini-1.5-flash';
            else if (synthesisProvider === 'openai') synthesisModel = 'gpt-4o-mini';
            else if (synthesisProvider === 'anthropic') synthesisModel = 'claude-3-haiku-20240307';
            else if (synthesisProvider === 'deepseek') synthesisModel = 'deepseek-chat';
        }
      }

      // Check if synthesisKey is valid, if not, try to fallback to any text key
      if (!synthesisKey) {
          const { rows: backupKey } = await pool.query("SELECT encrypted_key FROM api_keys_vault WHERE provider = 'google' LIMIT 1");
          if (backupKey.length > 0) synthesisKey = decrypt(backupKey[0].encrypted_key);
      }

      const systemPromptPayload = `
        [TASK: CONTEXT_SYNTHESIS]
        Analyze the current turn to update memory and summary.
        
        INPUTS:
        - PREV_SUMMARY: ${(existingSummary || 'N/A').substring(0, 500)}
        - USER: ${(lastTurn.user || 'N/A').substring(0, 500)}
        - ASST: ${(lastTurn.assistant || 'N/A').substring(0, 500)}
        
        OUTPUT ONLY JSON:
        { "facts": [{"fact": "extracted fact", "category": "technical"}], "summary": "new short summary" }
      `;
      
      // Final Safety check
      if (!synthesisModel || !synthesisProvider) {
          console.error("[ContextEngine] CRITICAL: No active provider found for memory synthesis. Memory ingestion aborted.");
          return;
      }

      const result = await callAIProvider(synthesisProvider, synthesisModel, synthesisKey, "Execute Context Synthesis.", synthesisProtocol + systemPromptPayload, undefined, undefined, {});
      
      if (typeof result === 'string' && result.trim().length > 5) {
          let cleanJson = result.trim();
          cleanJson = cleanJson.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
          cleanJson = cleanJson.replace(/```json/g, '').replace(/```/g, '').trim();
          
          const start = cleanJson.indexOf('{');
          const end = cleanJson.lastIndexOf('}');
          if (start !== -1 && end !== -1) {
            cleanJson = cleanJson.substring(start, end + 1);
            let data: any = {};
            try {
              data = JSON.parse(cleanJson);
            } catch (e) {
              console.warn('[ContextEngine] JSON Parse error, trying recovery...');
              const summaryMatch = cleanJson.match(/"summary"\s*:\s*"([^"]+)"/);
              if (summaryMatch) data.summary = summaryMatch[1];
            }
            
            if (data.facts && Array.isArray(data.facts)) {
              // Rule 8.4: Check for memory saturation and threshold management
              const { rows: countRows } = await pool.query('SELECT COUNT(*) FROM chat_memories WHERE user_id = $1', [userId]);
              const memoryCount = parseInt(countRows[0].count);

              // 45 Threshold: Warning
              if (memoryCount >= 45 && memoryCount < 50) {
                 socket.emit('memory_warning', { count: memoryCount, limit: 50 });
              }

              // 50 Threshold: Auto-Consolidation (Summarize last 10)
              if (memoryCount >= 50) {
                 console.log(`[MemoryEngine] 🚨 Limit (50) reached for user ${userId}. Orchestrating auto-synthesis of legacy records.`);
                 try {
                     // Fetch 10 oldest records
                     const { rows: oldest } = await pool.query(
                         'SELECT id, fact FROM chat_memories WHERE user_id = $1 ORDER BY created_at ASC LIMIT 10',
                         [userId]
                     );
                     
                     if (oldest.length >= 10) {
                         const factsStr = oldest.map(r => `- ${r.fact}`).join('\n');
                         const consolidationPrompt = `
                            [TASK: MEMORY_OPTIMIZATION]
                            Summarize these 10 legacy conversation facts into ONE high-level, dense technical fact that preserves all essential context.
                            
                            FACTS:
                            ${factsStr}
                            
                            OUTPUT ONLY THE NEW FACT TEXT.
                         `;
                         
                         const newFactRaw = await callAIProvider(synthesisProvider, synthesisModel, synthesisKey, "Memory Consolidation.", synthesisProtocol + consolidationPrompt, undefined, undefined, {});
                         const newFact = typeof newFactRaw === 'string' ? newFactRaw.trim() : '';

                         if (newFact.length > 5) {
                             // Atomically delete legacy and insert synthesis
                             await pool.query('BEGIN');
                             const idsToDelete = oldest.map(r => r.id);
                             await pool.query('DELETE FROM chat_memories WHERE id = ANY($1)', [idsToDelete]);
                             await pool.query(
                                 'INSERT INTO chat_memories (user_id, fact, category, source) VALUES ($1, $2, $3, $4)',
                                 [userId, newFact, 'consolidated', 'system_optimizer']
                             );
                             await pool.query('COMMIT');
                             
                             socket.emit('memory_consolidation', { consolidated: oldest.length, result: 1 });
                             console.log(`[MemoryEngine] ✅ Succeeded in distilling 10 facts into 1 high-level synthesis.`);
                         }
                     }
                 } catch (consErr) {
                     await pool.query('ROLLBACK');
                     console.error('[MemoryEngine] Consolidation failure:', consErr);
                 }
              }

              for (const item of data.facts) {
                const fact = typeof item === 'string' ? item : item.fact;
                const category = typeof item === 'object' ? (item.category || 'general') : 'general';
                if (fact && fact.trim()) {
                  const exists = await pool.query('SELECT id FROM chat_memories WHERE user_id = $1 AND LOWER(fact) = LOWER($2)', [userId, fact.trim()]);
                  if (exists.rows.length === 0) {
                    await pool.query(
                      'INSERT INTO chat_memories (user_id, chat_id, fact, category, source) VALUES ($1, $2, $3, $4, $5)',
                      [userId, chatId, fact.trim(), category, 'ai_distributed']
                    );
                  }
                }
              }
            }
            
            if (data.summary && typeof data.summary === 'string') {
               await pool.query('UPDATE chats SET context_summary = $1 WHERE id = $2', [data.summary, chatId]);
               console.log(`[ContextEngine] ✅ Context summary updated for chat ${chatId}`);
            }
          }
      }
    } catch (e) {
      console.error('[ContextEngine] Synthesis error:', e);
    }
  };

  app.get("/api/health", async (req, res) => {
    try {
      // Test the database connections
      const coreResult = await pool.query('SELECT NOW()');
      const ledgerResult = await ledgerPool.query('SELECT NOW()');
      
      res.json({ 
        status: "ok", 
        message: "Server and Databases are running",
        core_db_time: coreResult.rows[0].now,
        ledger_db_time: ledgerResult.rows[0].now
      });
    } catch (error) {
      console.error("Database connection error:", error);
      res.status(500).json({ 
        status: "error", 
        message: "Database connection failed. Please check your DATABASE_URL and LEDGER_DATABASE_URL.",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Email/Password Auth Routes
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { email, password, name, ref, language = 'en' } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const lowerEmail = email.toLowerCase();
      const existingUser = await pool.query('SELECT id FROM users WHERE LOWER(email) = $1::text', [lowerEmail]);
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: 'User already exists with this email' });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const role = lowerEmail === 'qoomre@gmail.com' ? 'admin' : 'user';
      const result = await pool.query(
        `INSERT INTO users (email, name, password_hash, provider, role) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING *`,
        [lowerEmail, name || lowerEmail.split('@')[0], passwordHash, 'email', role]
      );

      const user = result.rows[0];

      const walletResult = await ledgerPool.query(
        `INSERT INTO wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING RETURNING id`,
        [user.id]
      );
      
      let walletId;
      if (walletResult.rows.length > 0) {
        walletId = walletResult.rows[0].id;
      } else {
        const existingWallet = await ledgerPool.query('SELECT id FROM wallets WHERE user_id = $1', [user.id]);
        walletId = existingWallet.rows[0].id;
      }

      const economyRes = await ledgerPool.query('SELECT * FROM economy_settings LIMIT 1');
      const economy = economyRes.rows[0] || { welcome_bonus_points: 600, referral_bonus_points: 1000 };

      if (economy.welcome_bonus_points > 0) {
        await ledgerPool.query(
          `INSERT INTO ledger_transactions (wallet_id, amount, transaction_type, description) 
           VALUES ($1, $2, $3, $4)`,
          [walletId, economy.welcome_bonus_points, 'welcome_bonus', 'Welcome Bonus for joining the platform']
        );
        broadcastFinancialLog(walletId, economy.welcome_bonus_points, 'welcome_bonus', 'Welcome Bonus for joining the platform');
        await ledgerPool.query(
          `UPDATE wallets SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [economy.welcome_bonus_points, walletId]
        );
      }

      const referrerId = ref;
      if (referrerId && referrerId !== user.id) {
        try {
          const referrerRes = await pool.query('SELECT id, name FROM users WHERE id = $1', [referrerId]);
          if (referrerRes.rows.length > 0) {
            const referrer = referrerRes.rows[0];
            const referrerWalletRes = await ledgerPool.query('SELECT id FROM wallets WHERE user_id = $1', [referrer.id]);
            if (referrerWalletRes.rows.length > 0) {
              const referrerWalletId = referrerWalletRes.rows[0].id;
              const ledgerClient = await ledgerPool.connect();
              try {
                await ledgerClient.query('BEGIN');
                await ledgerClient.query(
                  'UPDATE wallets SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                  [economy.referral_bonus_points, referrerWalletId]
                );
                await ledgerClient.query(
                  `INSERT INTO ledger_transactions (wallet_id, amount, transaction_type, description) 
                   VALUES ($1, $2, $3, $4)`,
                  [referrerWalletId, economy.referral_bonus_points, 'referral_bonus', `Referral Bonus for inviting ${user.name}`]
                );
                broadcastFinancialLog(referrerWalletId, economy.referral_bonus_points, 'referral_bonus', `Referral Bonus for inviting ${user.name}`);
                await ledgerClient.query('COMMIT');

                const referrerWalletRes = await ledgerClient.query('SELECT balance FROM wallets WHERE id = $1', [referrerWalletId]);
                const newBalance = referrerWalletRes.rows[0]?.balance || 0;

                sendSmartEmail(referrer.id, referrer.email, 'referral_bonus_earned', {
                  userName: referrer.name || 'User',
                  bonusPoints: economy.referral_bonus_points.toString(),
                  newBalance: newBalance.toString()
                }, 'en').catch(console.error);

              } catch (e) {
                await ledgerClient.query('ROLLBACK');
                throw e;
              } finally {
                ledgerClient.release();
              }
            }
          }
        } catch (e) {
          console.error('Failed to grant referral bonus:', e);
        }
      }

      const freePlanRes = await pool.query("SELECT id FROM plans WHERE name_en = 'Free Plan' LIMIT 1");
      if (freePlanRes.rows.length > 0) {
        await pool.query(
          `INSERT INTO subscriptions (user_id, plan_id, status, billing_period, current_period_end) 
           VALUES ($1, $2, 'active', 'monthly', NULL) 
           ON CONFLICT (user_id) DO NOTHING`,
          [user.id, freePlanRes.rows[0].id]
        );
      }

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET as string, { expiresIn: '7d' });
      res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });

      await logSystemActivity(user.id, 'signup', 'User signed up with email/password', {}, req);

      const baseUrl = getBaseUrl(req);
      sendSmartEmail(user.id, user.email, 'welcome_email', {
        userName: user.name || (language === 'ar' ? 'مستخدم' : 'User'),
        actionUrl: baseUrl,
        baseUrl
      }, language as 'en' | 'ar').catch(console.error);

    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({ error: 'Internal Server Error during signup' });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password, remember } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const lowerEmail = email.toLowerCase();
      const result = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1::text', [lowerEmail]);
      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const user = result.rows[0];
      
      // Check for account suspension
      if (user.status === 'suspended') {
        return res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
      }

      if (!user.password_hash) {
        return res.status(400).json({ error: 'This account uses Google Login. Please use Continue with Google.' });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role }, 
        process.env.JWT_SECRET as string, 
        { expiresIn: remember === true || remember === 'true' ? '30d' : '7d' }
      );
      res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });

      await logSystemActivity(user.id, 'login', 'User logged in with email/password', {}, req);
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal Server Error during login' });
    }
  });

  // OAuth Routes
  app.get("/api/auth/google/url", (req, res) => {
    const { ref, lang, mode, remember } = req.query;
    const redirectUri = getRedirectUri(req);
    
    // Encode ref, lang, mode, and remember in state: "ref|lang|mode|remember"
    const state = `${ref || ''}|${lang || 'ar'}|${mode || 'popup'}|${remember === 'true'}`;
    
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'email profile',
      access_type: 'online',
      prompt: 'select_account',
      state: state
    });
    res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
  });

  // Forgot Password
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email, language } = req.body;
      const lowerEmail = email.toLowerCase();
      const userRes = await pool.query('SELECT id, email, name FROM users WHERE LOWER(email) = $1::text', [lowerEmail]);
      
      if (userRes.rows.length === 0) {
        return res.json({ success: true });
      }

      const user = userRes.rows[0];
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour

      await pool.query('INSERT INTO password_resets (email, token, expires_at) VALUES ($1, $2, $3)', [lowerEmail, token, expiresAt]);
      
      const baseUrl = getBaseUrl(req);
      const actionUrl = `${baseUrl}/reset-password?token=${token}&email=${encodeURIComponent(lowerEmail)}`;
      
      await sendSmartEmail(user.id, lowerEmail, 'password_reset', { 
        userName: user.name || (language === 'ar' ? 'مستخدم' : 'User'), 
        actionUrl,
        baseUrl
      }, language as 'en' | 'ar');
      
      res.json({ success: true });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Reset Password
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { email, token, password } = req.body;
      const lowerEmail = email.toLowerCase();
      const resetRes = await pool.query('SELECT * FROM password_resets WHERE LOWER(email) = $1::text AND token = $2 AND expires_at > CURRENT_TIMESTAMP', [lowerEmail, token]);
      
      if (resetRes.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid or expired token' });
      }

      const hash = await bcrypt.hash(password, 10);
      await pool.query('UPDATE users SET password_hash = $1 WHERE LOWER(email) = $2::text', [hash, lowerEmail]);
      await pool.query('DELETE FROM password_resets WHERE LOWER(email) = $1::text AND token = $2', [lowerEmail, token]);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    const { code, state } = req.query;
    if (!code) return res.status(400).send('No code provided');

    try {
      const stateParts = (state as string || '').split('|');
      const referrerId = stateParts[0] || '';
      const lang = stateParts[1] || 'ar';
      const mode = stateParts[2] || 'popup';
      const remember = stateParts[3] === 'true';
      
      const redirectUri = getRedirectUri(req);
      
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID || '',
          client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
          code: code as string,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        })
      });

      const tokenData = await tokenResponse.json();
      if (!tokenResponse.ok) throw new Error(tokenData.error_description || 'Failed to get token');

      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      const userData = await userResponse.json();
      console.log('[GOOGLE_AUTH] email:', userData.email, 'picture:', userData.picture);
      const lowerEmail = userData.email.toLowerCase();

      const role = lowerEmail === 'qoomre@gmail.com' ? 'admin' : 'user';
      
      const checkRes = await pool.query('SELECT id FROM users WHERE LOWER(email) = $1::text', [lowerEmail]);
      
      let result;
      if (checkRes.rows.length > 0) {
        result = await pool.query(
          `UPDATE users SET 
            email = $1::text, 
            name = COALESCE(name, $2), 
            avatar = COALESCE(avatar, $3), 
            provider = $4, 
            role = CASE WHEN $1::text = 'qoomre@gmail.com' THEN 'admin' ELSE role END 
          WHERE id = $5 RETURNING *`,
          [lowerEmail, userData.name, userData.picture ? userData.picture.replace(/=s[0-9]+/, '=s200') : null, 'google', checkRes.rows[0].id]
        );
      } else {
        result = await pool.query(
          `INSERT INTO users (email, name, avatar, provider, role) 
           VALUES ($1, $2, $3, $4, $5) 
           RETURNING *`,
          [lowerEmail, userData.name, userData.picture ? userData.picture.replace(/=s[0-9]+/, '=s200') : null, 'google', role]
        );
      }

        const user = result.rows[0];
      const isNewUser = result.rowCount === 1 && (new Date().getTime() - new Date(user.created_at).getTime() < 5000);

      // Ensure subscription row exists for new users (Core DB)
      if (isNewUser) {
        try {
          const freePlanRes = await pool.query("SELECT id FROM plans WHERE name_en = 'Free Plan' LIMIT 1");
          if (freePlanRes.rows.length > 0) {
            await pool.query(
              `INSERT INTO subscriptions (user_id, plan_id, status, billing_period)
               VALUES ($1, $2, 'active', 'monthly')
               ON CONFLICT (user_id) DO NOTHING`,
              [user.id, freePlanRes.rows[0].id]
            );
          }
        } catch (subErr) {
          console.error('[OAuth] Failed to create welcome subscription:', subErr);
        }
      }

      // Ensure wallet exists in Ledger DB
      const walletResult = await ledgerPool.query(
        `INSERT INTO wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING RETURNING id`,
        [user.id]
      );
      
      let walletId;
      if (walletResult.rows.length > 0) {
        walletId = walletResult.rows[0].id;
      } else {
        const existingWallet = await ledgerPool.query('SELECT id FROM wallets WHERE user_id = $1', [user.id]);
        walletId = existingWallet.rows[0].id;
      }

      if (isNewUser) {
        const economyRes = await ledgerPool.query('SELECT * FROM economy_settings LIMIT 1');
        const economy = economyRes.rows[0] || { welcome_bonus_points: 600, referral_bonus_points: 1000 };

        const ledgerClient = await ledgerPool.connect();
        try {
          await ledgerClient.query('BEGIN');
          
          await ledgerClient.query(
            'UPDATE wallets SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [economy.welcome_bonus_points, walletId]
          );
          await ledgerClient.query(
            `INSERT INTO ledger_transactions (wallet_id, amount, transaction_type, description) 
             VALUES ($1, $2, $3, $4)`,
            [walletId, economy.welcome_bonus_points, 'welcome_bonus', 'Welcome Bonus for joining the platform']
          );
          broadcastFinancialLog(walletId, economy.welcome_bonus_points, 'welcome_bonus', 'Welcome Bonus for joining the platform');

          if (referrerId && referrerId !== user.id) {
            const referrerRes = await pool.query('SELECT id, name FROM users WHERE id = $1', [referrerId]);
            if (referrerRes.rows.length > 0) {
              const referrer = referrerRes.rows[0];
              const referrerWalletRes = await ledgerClient.query('SELECT id FROM wallets WHERE user_id = $1', [referrer.id]);
              if (referrerWalletRes.rows.length > 0) {
                const referrerWalletId = referrerWalletRes.rows[0].id;
                
                await ledgerClient.query(
                  'UPDATE wallets SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                  [economy.referral_bonus_points, referrerWalletId]
                );
                await ledgerClient.query(
                  `INSERT INTO ledger_transactions (wallet_id, amount, transaction_type, description) 
                   VALUES ($1, $2, $3, $4)`,
                  [referrerWalletId, economy.referral_bonus_points, 'referral_bonus', `Referral Bonus for inviting ${user.name}`]
                );
                broadcastFinancialLog(referrerWalletId, economy.referral_bonus_points, 'referral_bonus', `Referral Bonus for inviting ${user.name}`);
                console.log(`Referral bonus granted to ${referrer.name} for inviting ${user.name}`);
              }
            }
          }
          
          await ledgerClient.query('COMMIT');

          if (referrerId && referrerId !== user.id) {
             const referrerRes = await pool.query('SELECT id, name, email FROM users WHERE id = $1', [referrerId]);
             if (referrerRes.rows.length > 0) {
               const referrer = referrerRes.rows[0];
               sendSmartEmail(referrer.id, referrer.email, 'referral_bonus_earned', {
                 userName: referrer.name || 'User',
                 referredUser: user.name || 'A new user',
                 bonusAmount: economy.referral_bonus_points.toString(),
                 appName: await getAppName('en')
               }, 'en').catch(console.error);
             }
          }

        } catch (e) {
          await ledgerClient.query('ROLLBACK');
          console.error('Failed to grant registration bonuses:', e);
        } finally {
          ledgerClient.release();
        }

        // 3. Assign Free Plan
        const freePlanRes = await pool.query("SELECT id FROM plans WHERE name_en = 'Free Plan' LIMIT 1");
        if (freePlanRes.rows.length > 0) {
          await pool.query(
            `INSERT INTO subscriptions (user_id, plan_id, status, billing_period, current_period_end) 
             VALUES ($1, $2, 'active', 'monthly', NULL) 
             ON CONFLICT (user_id) DO NOTHING`,
            [user.id, freePlanRes.rows[0].id]
          );
        }

        const baseUrl = getBaseUrl(req);

        // Send Welcome Email
        sendSmartEmail(user.id, user.email, 'welcome_email', {
          userName: user.name || (lang === 'ar' ? 'مستخدم' : 'User'),
          actionUrl: baseUrl,
          baseUrl
        }, lang as 'en' | 'ar').catch(console.error);

      }

      if (user.status === 'suspended') {
        const errorI18n = {
          ar: { title: "الحساب معطل", message: "لقد تم إيقاف حسابك من قبل الإدارة. يرجى التواصل مع الدعم الفني.", dir: "rtl" },
          en: { title: "Account Suspended", message: "Your account has been suspended by the administration. Please contact support.", dir: "ltr" }
        };
        const et = errorI18n[lang as keyof typeof errorI18n] || errorI18n.ar;
        
        return res.send(`
          <!DOCTYPE html>
          <html lang="${lang}" dir="${et.dir}">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>${et.title}</title>
              <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap" rel="stylesheet">
              <style>
                body { background-color: #0f0f11; color: #ffffff; font-family: 'Tajawal', sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
                .container { background: #1a1a1c; padding: 2rem; border-radius: 2rem; border: 1px solid rgba(239, 68, 68, 0.2); max-width: 400px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
                h1 { color: #ef4444; margin-bottom: 1rem; }
                p { color: #9ca3af; line-height: 1.6; }
                .btn { display: inline-block; margin-top: 2rem; padding: 0.8rem 2rem; background: #374151; color: white; text-decoration: none; border-radius: 1rem; transition: background 0.3s; }
                .btn:hover { background: #4b5563; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>${et.title}</h1>
                <p>${et.message}</p>
                <a href="/" class="btn">${lang === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}</a>
              </div>
            </body>
          </html>
        `);
      }

      // Generate JWT Token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role }, 
        process.env.JWT_SECRET as string, 
        { expiresIn: remember ? '30d' : '7d' }
      );

      const userPayload = {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        token: token
      };

      const i18n = {
        ar: { title: "تم تسجيل الدخول بنجاح", sub: "Sovereignty Authorized - بيربليكستا", dir: "rtl" },
        en: { title: "Login Successful", sub: "Sovereignty Authorized - Perplexta", dir: "ltr" }
      };
      const t = i18n[lang as keyof typeof i18n] || i18n.ar;
      const isRedirectMode = mode === 'redirect';
      
      res.send(`
        <!DOCTYPE html>
        <html lang="${lang}" dir="${t.dir}">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${t.title}</title>
            <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap" rel="stylesheet">
            <style>
              body {
                background: #09090b;
                color: white;
                font-family: 'Tajawal', sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                overflow: hidden;
              }
              .card {
                background: #111111;
                border: 1px solid rgba(255,255,255,0.05);
                padding: 3rem;
                border-radius: 2rem;
                text-align: center;
                box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
                max-width: 400px;
                width: 90%;
                animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
              }
              @keyframes slideUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
              }
              .logo-container {
                width: 64px;
                height: 64px;
                margin: 0 auto 1.5rem;
                background: #1a1a1c;
                border-radius: 1.2rem;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 1px solid rgba(255,255,255,0.05);
              }
              .logo {
                width: 38px;
                height: 38px;
                object-fit: contain;
              }
              .h1 {
                font-size: 1.5rem;
                font-weight: 700;
                margin-bottom: 0.5rem;
                background: linear-gradient(to bottom, #ffffff, #a1a1aa);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
              }
              .p {
                color: #9ca3af;
                font-size: 0.9rem;
                margin-bottom: 2rem;
              }
              .spinner {
                width: 32px;
                height: 32px;
                border: 3px solid rgba(16,185,129,0.1);
                border-top: 3px solid #10b981;
                border-radius: 50%;
                margin: 0 auto;
                animation: spin 1s linear infinite;
                filter: drop-shadow(0 0 8px rgba(16,185,129,0.6));
              }
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="logo-container">
                <img src="/app-assets/icon.png" onerror="this.src='https://cdn-icons-png.flaticon.com/512/9446/9446452.png'" class="logo" alt="Perplexta">
              </div>
              <div class="h1">${t.title}</div>
              <div class="p">${t.sub}</div>
              <div class="spinner"></div>
            </div>

            <script>
              setTimeout(() => {
                const userObj = ${JSON.stringify(userPayload)};
                const token = userObj.token;
                const isRedirectMode = ${isRedirectMode};

                try {
                   localStorage.setItem('app_token', token);
                   localStorage.setItem('app_oauth_user', JSON.stringify(userObj));
                   localStorage.setItem('app_oauth_trigger', Date.now().toString());
                   
                   const authChannel = new BroadcastChannel('app_oauth_channel');
                   authChannel.postMessage({ type: 'OAUTH_AUTH_SUCCESS', user: userObj });
                   setTimeout(() => authChannel.close(), 1500); 
                } catch (e) {
                   console.error('Sync failed', e);
                }

                if (isRedirectMode) {
                  window.location.href = '/?token=' + token;
                  return;
                }

                if (window.opener && window.opener !== window) {
                   try {
                     window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', user: userObj }, '*');
                   } catch (e) {
                     console.error('postMessage failed', e);
                   }
                }

                const card = document.querySelector('.card');
                const spinner = document.querySelector('.spinner');
                const p = document.querySelector('.p');
                const h1 = document.querySelector('.h1');

                if (spinner) spinner.style.display = 'none';
                if (h1) h1.innerHTML = '${lang === "ar" ? "تم بنجاح" : "Success"}';
                if (p) p.innerHTML = '${lang === "ar" ? "سيتم توجيهك الآن..." : "Redirecting..."}';
                
                const tick = document.createElement('div');
                tick.innerHTML = '✓';
                tick.style.cssText = 'font-size: 3rem; color: #10b981; margin-bottom: 0.5rem; text-shadow: 0 0 15px rgba(16,185,129,0.4);';
                card.insertBefore(tick, h1);

                setTimeout(() => {
                  try {
                    if (window.opener && !window.opener.closed) {
                      window.close();
                    } else {
                      window.location.href = '/?token=' + token;
                    }
                  } catch(e) {
                    window.location.href = '/?token=' + token;
                  }
                }, 1500);

                const btn = document.createElement('button');
                btn.innerHTML = '${lang === "ar" ? "دخول" : "Enter"}';
                btn.style.cssText = 'margin-top: 1rem; padding: 0.6rem 2rem; background: #10b981; color: white; border: none; border-radius: 12px; cursor: pointer; font-family: Tajawal;';
                btn.onclick = () => window.location.href = '/?token=' + token;
                card.appendChild(btn);
              }, 200);
            </script>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('OAuth Error:', error);
      res.status(500).send('Authentication failed');
    }
  });

  app.get('/api/admin/stats', authenticateAdmin, async (req, res) => {
    try {
      const revenueRes = await ledgerPool.query(`
        SELECT SUM(amount) as total 
        FROM ledger_transactions 
        WHERE transaction_type = 'subscription_payment' 
        AND created_at >= date_trunc('month', CURRENT_DATE)
      `);
      const monthlyRevenue = Math.abs(parseFloat(revenueRes.rows[0].total || 0));

      const activeUsersRes = await pool.query(`
        SELECT COUNT(*) as count 
        FROM users 
        WHERE last_active_at >= (CURRENT_TIMESTAMP - INTERVAL '24 hours')
      `);
      const activeUsersToday = parseInt(activeUsersRes.rows[0].count || 0);

      const generationsRes = await pool.query(`
        SELECT COUNT(*) as count FROM ai_logs WHERE created_at >= CURRENT_DATE
      `);
      const aiGenerations = parseInt(generationsRes.rows[0].count || 0);

      res.json({
        monthlyRevenue,
        activeUsersToday,
        aiGenerations,
        systemHealth: 'optimal'
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  app.get('/api/admin/security-alerts', authenticateAdmin, async (req, res) => {
    try {
      const alertsRes = await pool.query(`
        SELECT a.*, u.name as user_name, u.email as user_email
        FROM security_alerts a
        LEFT JOIN users u ON a.user_id = u.id
        ORDER BY a.created_at DESC
        LIMIT 50
      `);
      res.json(alertsRes.rows);
    } catch (error) {
      console.error('Error fetching security alerts:', error);
      res.status(500).json({ error: 'Failed to fetch alerts' });
    }
  });

  app.get('/api/admin/activity-stream', authenticateAdmin, async (req, res) => {
    try {
      const activityRes = await pool.query(`
        (
          SELECT l.id, l.user_id, u.name as user_name, 'ai_generation' as type, l.tool_id as action, l.model as detail, l.created_at, (l.prompt_tokens + l.completion_tokens) as points, l.status
          FROM ai_logs l
          LEFT JOIN users u ON l.user_id = u.id
        )
        UNION ALL
        (
          SELECT s.id, s.user_id, u.name as user_name, 'system_activity' as type, s.action, s.description as detail, s.created_at, 0 as points, 'success' as status
          FROM system_logs s
          LEFT JOIN users u ON s.user_id = u.id
        )
        ORDER BY created_at DESC
        LIMIT 50
      `);
      res.json(activityRes.rows);
    } catch (error) {
      console.error('Error fetching activity stream:', error);
      res.status(500).json({ error: 'Failed to fetch activity' });
    }
  });

  app.delete('/api/admin/activity/:id/:type', authenticateAdmin, async (req, res) => {
    try {
      const { id, type } = req.params;
      if (type === 'ai_generation') {
        await pool.query('DELETE FROM ai_logs WHERE id = $1', [id]);
      } else {
        await pool.query('DELETE FROM system_logs WHERE id = $1', [id]);
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete log' });
    }
  });

  app.delete('/api/admin/security-alerts/:id', authenticateAdmin, async (req, res) => {
    try {
      await pool.query('DELETE FROM security_alerts WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete alert' });
    }
  });

  app.post('/api/admin/reconcile-wallet/:id', authenticateAdmin, async (req, res) => {
    const client = await ledgerPool.connect();
    try {
      const userId = req.params.id;
      const walletRes = await client.query('SELECT id, balance FROM wallets WHERE user_id = $1', [userId]);
      if (walletRes.rows.length === 0) return res.status(404).json({ error: 'Wallet not found' });
      
      const wallet = walletRes.rows[0];
      const ledgerRes = await client.query('SELECT SUM(amount) as total FROM ledger_transactions WHERE wallet_id = $1', [wallet.id]);
      const expectedBalance = parseFloat(ledgerRes.rows[0].total || 0);
      
      await client.query('UPDATE wallets SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [expectedBalance, wallet.id]);
      
      await logSystemActivity((req as any).user.id, 'wallet_reconciliation', `Forced reconciliation for user ${userId}. Balance: ${wallet.balance} -> ${expectedBalance}`, { userId, old: wallet.balance, new: expectedBalance }, req);
      
      res.json({ success: true, oldBalance: wallet.balance, newBalance: expectedBalance });
    } catch (error) {
      res.status(500).json({ error: 'Reconciliation failed' });
    } finally {
      client.release();
    }
  });

  app.get('/api/admin/wallet-diagnostics', authenticateAdmin, async (req, res) => {
    try {
      const rogueWallets = await ledgerPool.query(`
        SELECT w.id, w.user_id, w.balance, COALESCE(SUM(lt.amount), 0) as expected_balance
        FROM wallets w
        LEFT JOIN ledger_transactions lt ON w.id = lt.wallet_id
        GROUP BY w.id, w.user_id, w.balance
        HAVING ABS(w.balance - COALESCE(SUM(lt.amount), 0)) > 0.01
      `);
      
      const userIds = rogueWallets.rows.map(r => r.user_id);
      const usersRes = await pool.query('SELECT id, name, email FROM users WHERE id = ANY($1)', [userIds]);
      const userMap = usersRes.rows.reduce((acc: any, u: any) => { acc[u.id] = u; return acc; }, {});
      
      const diagnostics = rogueWallets.rows.map(r => ({
        ...r,
        user: userMap[r.user_id] || { name: 'Unknown', email: 'N/A' }
      }));
      
      res.json(diagnostics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch diagnostics' });
    }
  });

  app.delete("/api/admin/notifications/prune", authenticateAdmin, async (req, res) => {
    try {
      const { days = 30 } = req.query;
      const result = await pool.query('DELETE FROM notifications WHERE created_at < CURRENT_DATE - INTERVAL \'' + days + ' days\'');
      await logSystemActivity((req as any).user.id, 'notifications_prune', `Pruned notifications older than ${days} days`, { days, count: result.rowCount }, req);
      res.json({ success: true, count: result.rowCount });
    } catch (error) {
      console.error('Error pruning notifications:', error);
      res.status(500).json({ error: 'Failed to prune notifications' });
    }
  });

  app.get('/api/admin/wallet-alerts', authenticateAdmin, async (req, res) => {
    try {
      const withdrawalsRes = await ledgerPool.query(`
        SELECT lt.id, lt.amount, lt.description, lt.created_at, w.user_id, 'withdrawal_request' as alert_type, 'high' as severity
        FROM ledger_transactions lt
        JOIN wallets w ON lt.wallet_id = w.id
        WHERE lt.transaction_type = 'withdrawal_request' AND lt.amount < 0
        ORDER BY lt.created_at DESC
        LIMIT 10
      `);

      const kycRes = await pool.query(`
        SELECT id as user_id, name as user_name, 'kyc_request' as alert_type, 'medium' as severity, created_at
        FROM users
        WHERE kyc_status = 'pending'
        ORDER BY created_at DESC
        LIMIT 10
      `);

      const highValueRes = await ledgerPool.query(`
        SELECT lt.id, lt.amount, lt.description, lt.created_at, w.user_id, 'high_value' as alert_type, 'medium' as severity
        FROM ledger_transactions lt
        JOIN wallets w ON lt.wallet_id = w.id
        WHERE ABS(lt.amount) >= 10000
        ORDER BY lt.created_at DESC
        LIMIT 10
      `);

      const allAlerts = [...withdrawalsRes.rows, ...kycRes.rows, ...highValueRes.rows].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      if (allAlerts.length === 0) return res.json([]);

      const userIds = [...new Set(allAlerts.map(a => a.user_id))];
      const usersRes = await pool.query('SELECT id, name FROM users WHERE id = ANY($1)', [userIds]);
      const userMap = usersRes.rows.reduce((acc: any, u: any) => { acc[u.id] = u.name; return acc; }, {});

      const enrichedAlerts = allAlerts.map(a => ({
        ...a,
        user_name: a.user_name || userMap[a.user_id] || 'Unknown'
      }));

      res.json(enrichedAlerts);
    } catch (error) {
      console.error('Error fetching wallet alerts:', error);
      res.status(500).json({ error: 'Failed' });
    }
  });

  app.delete('/api/admin/ledger-transactions/:id', authenticateAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await ledgerPool.query('DELETE FROM ledger_transactions WHERE id = $1', [id]);
      if (result.rowCount === 0) return res.status(404).json({ error: 'Transaction not found' });
      await logSystemActivity((req as any).user.id, 'transaction_delete', `Deleted ledger transaction ${id}`, { id }, req);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting transaction:', error);
      res.status(500).json({ error: 'Failed' });
    }
  });

  app.get('/api/admin/financial-radar', authenticateAdmin, async (req, res) => {
    try {
      const txRes = await ledgerPool.query(`
        SELECT t.*, w.user_id
        FROM ledger_transactions t
        JOIN wallets w ON t.wallet_id = w.id
        ORDER BY t.created_at DESC
        LIMIT 100
      `);

      const transactions = txRes.rows;
      if (transactions.length === 0) {
        res.json([]);
        return;
      }

      const userIds = [...new Set(transactions.map(t => t.user_id))];
      const usersRes = await pool.query('SELECT id, name FROM users WHERE id = ANY($1)', [userIds]);
      const userMap = usersRes.rows.reduce((acc: any, u: any) => {
        acc[u.id] = u.name;
        return acc;
      }, {});

      const enrichedTransactions = transactions.map(t => ({
        ...t,
        user_name: userMap[t.user_id] || 'Unknown User'
      }));

      res.json(enrichedTransactions);
    } catch (error) {
      console.error('Error fetching financial radar:', error);
      res.status(500).json({ error: 'Failed to fetch financial data' });
    }
  });

  // --- User Notifications & Communication ---



  app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT u.id, u.email, u.name, u.avatar, u.role, u.kyc_status, u.kyc_required, u.kyc_selfie, u.kyc_full_name, u.kyc_rejection_reason,
               u.status as status, u.created_at,
               s.status as subscription_status, s.plan_id, p.name_en as plan_name, p.color as plan_color
        FROM users u
        LEFT JOIN subscriptions s ON u.id = s.user_id
        LEFT JOIN plans p ON s.plan_id = p.id
        ORDER BY u.created_at DESC
      `);
      
      const users = result.rows;
      if (users.length === 0) {
        res.json([]);
        return;
      }

      users.forEach(u => {
        if (u.email && u.email !== u.email.toLowerCase()) {
          const lowerEmail = u.email.toLowerCase();
          pool.query('UPDATE users SET email = $1 WHERE id = $2', [lowerEmail, u.id])
            .catch(err => console.error(`[Admin Cleanup] Failed to lowercase email for user ${u.id}:`, err));
          u.email = lowerEmail; 
        }
      });

      const userIds = users.map(u => u.id);
      const walletRes = await ledgerPool.query(`
        SELECT user_id, balance FROM wallets WHERE user_id = ANY($1)
      `, [userIds]);
      
      const balanceMap = walletRes.rows.reduce((acc: any, w: any) => {
        acc[w.user_id] = w.balance;
        return acc;
      }, {});

      const enrichedUsers = users.map(u => ({
        ...u,
        balance: balanceMap[u.id] || 0
      }));

      res.json(enrichedUsers);
    } catch (error) {
      console.error('Error fetching admin users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  app.get("/api/admin/users/:userId/usage", authenticateAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const today = new Date().toISOString().split('T')[0];
      const monthStart = new Date();
      monthStart.setDate(1);
      const monthStartStr = monthStart.toISOString().split('T')[0];

      const dailyUsageResult = await pool.query(`
        SELECT tool_id, usage_count 
        FROM user_usage 
        WHERE user_id = $1 AND usage_date = CURRENT_DATE
      `, [userId]);

      const monthlyUsageResult = await pool.query(`
        SELECT tool_id, SUM(usage_count) as total
        FROM user_usage
        WHERE user_id = $1 AND usage_date >= $2
        GROUP BY tool_id
      `, [userId, monthStartStr]);

      const usageStats: Record<string, { daily: number, monthly: number }> = {};
      
      dailyUsageResult.rows.forEach(row => {
        if (!usageStats[row.tool_id]) usageStats[row.tool_id] = { daily: 0, monthly: 0 };
        usageStats[row.tool_id].daily = row.usage_count;
      });

      monthlyUsageResult.rows.forEach(row => {
        if (!usageStats[row.tool_id]) usageStats[row.tool_id] = { daily: 0, monthly: 0 };
        usageStats[row.tool_id].monthly = parseInt(row.total);
      });
      
      res.json(usageStats);
    } catch (error) {
      console.error('Error fetching admin user usage:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get("/api/admin/users/:userId/activity-logs", authenticateAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      const logsRes = await pool.query(`
        SELECT tool_id, amount, usage_type, metadata, created_at 
        FROM user_activity_logs 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2 OFFSET $3
      `, [userId, limit, offset]);

      res.json(logsRes.rows);
    } catch (error) {
      console.error('Error fetching user activity logs:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.patch('/api/admin/users/:userId/permissions', authenticateAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { role, kyc_status, kyc_rejection_reason, kyc_required, status } = req.body;
      const adminId = (req as any).user.id;

      console.log(`[Admin] Updating permissions for user ${userId}:`, { role, kyc_status, kyc_rejection_reason, kyc_required, status });

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // 1. Update Role
        if (role) {
          const validRoles = ['user', 'admin', 'support', 'elite'];
          if (!validRoles.includes(role)) throw new Error('Invalid role');
          
          const targetUserIdStr = userId.toString();
          const adminIdStr = adminId.toString();
          
          if (targetUserIdStr === adminIdStr && role === 'user') {
            throw new Error('Cannot demote yourself to prevent system lockout');
          }
          
          await client.query('UPDATE users SET role = $1 WHERE id = $2', [role, userId]);
        }

        // 2. Update KYC Verification Status
        if (kyc_status) {
          const validStatuses = ['pending', 'verified', 'rejected', 'none'];
          if (!validStatuses.includes(kyc_status)) throw new Error('Invalid kyc_status');
          
          if (kyc_status === 'verified') {
            await client.query('UPDATE users SET kyc_status = $1, kyc_required = false, kyc_rejection_reason = NULL WHERE id = $2', [kyc_status, userId]);
          } else if (kyc_status === 'rejected') {
            await client.query('UPDATE users SET kyc_status = $1, kyc_rejection_reason = $2 WHERE id = $3', [kyc_status, kyc_rejection_reason || null, userId]);
          } else {
            await client.query('UPDATE users SET kyc_status = $1 WHERE id = $2', [kyc_status, userId]);
          }
        }

        // 3. Update KYC Requirement Toggle
        if (typeof kyc_required === 'boolean') {
          // If status is already verified, don't allow turning it back on unless status changes
          const userCheck = await client.query('SELECT kyc_status FROM users WHERE id = $1', [userId]);
          const currentKycStatus = userCheck.rows[0]?.kyc_status;
          
          const finalKycRequired = currentKycStatus === 'verified' ? false : kyc_required;
          await client.query('UPDATE users SET kyc_required = $1 WHERE id = $2', [finalKycRequired, userId]);
        }

        // 4. Update Account Status (Synchronized across users and subscriptions)
        if (status) {
          if (!['active', 'suspended'].includes(status)) throw new Error('Invalid status');
          
          // SOVEREIGN Security: Sync status to users table for real-time authentication enforcement
          await client.query('UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [status, userId]);
          
          // Sync status to subscriptions table for UI and billing consistency
          const checkSub = await client.query('SELECT 1 FROM subscriptions WHERE user_id = $1', [userId]);
          if (checkSub.rows.length > 0) {
            await client.query('UPDATE subscriptions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2', [status, userId]);
          } else {
            const freePlanRes = await client.query("SELECT id FROM plans WHERE name_en = 'Free Plan' LIMIT 1");
            if (freePlanRes.rows.length > 0) {
              await client.query(
                `INSERT INTO subscriptions (user_id, plan_id, status, billing_period)
                 VALUES ($1, $2, $3, 'monthly')`,
                [userId, freePlanRes.rows[0].id, status]
              );
            }
          }
        }

        await client.query('COMMIT');

        // Send Emails for KYC status changes
        if (kyc_status) {
          try {
            const userRes = await client.query('SELECT name, email, language FROM users WHERE id = $1', [userId]);
            if (userRes.rows.length > 0) {
              const user = userRes.rows[0];
              const userLang = user.language || 'en';
              if (kyc_status === 'verified') {
                sendSmartEmail(parseInt(userId), user.email, 'kyc_approved', {
                  userName: user.name || 'User',
                  appName: getAppName(userLang)
                }, userLang).catch(console.error);
              } else if (kyc_status === 'rejected') {
                sendSmartEmail(parseInt(userId), user.email, 'kyc_rejected', {
                  userName: user.name || 'User',
                  rejectionReason: kyc_rejection_reason || (userLang === 'ar' ? 'لم تستوفِ الوثائق المقدمة معايير التحقق لدينا.' : 'The provided documents did not meet our verification standards.'),
                  actionUrl: `${req.protocol}://${req.get('host')}/rewards`,
                  appName: getAppName(userLang)
                }, userLang).catch(console.error);
              }
            }
          } catch (emailError) {
            console.error('Error sending KYC email from permissions route:', emailError);
          }
        }

        await logSystemActivity(adminId, 'user_permissions_update', `Updated permissions for user ${userId}${kyc_status === 'rejected' ? ` (KYC Rejection Reason: ${kyc_rejection_reason})` : ''}`, { userId, role, kyc_status, kyc_rejection_reason, kyc_required, status }, req);
        await logSecurityAlert(adminId, 'system_change', 'medium', `User permissions updated for ${userId}`, { userId, role, kyc_status, kyc_required, status }, req);

        // Notification
        await createNotification(
          parseInt(userId),
          'Account Permissions Updated',
          'تحديث صلاحيات الحساب',
          `Your account permissions or role have been updated by an administrator.`,
          `تم تحديث صلاحيات حسابك أو دورك من قبل المسؤول.`,
          'system'
        );

        res.json({ success: true });
      } catch (innerError: any) {
        await client.query('ROLLBACK');
        throw innerError;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error updating user permissions:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to update permissions' });
    }
  });

  app.patch('/api/admin/users/:userId/role', authenticateAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;
      const adminId = (req as any).user.id;

      console.log(`[Admin] Role Update Request: User=${userId}, NewRole=${role}, ByAdmin=${adminId}`);

      const validRoles = ['admin', 'user', 'support', 'elite'];
      if (!validRoles.includes(role)) {
        console.warn(`[Admin] Invalid role attempted: ${role}`);
        res.status(400).json({ error: 'Invalid role' });
        return;
      }

      // Prevent self-demotion
      if (userId.toString() === adminId.toString() && role === 'user') {
        console.warn(`[Admin] Self-demotion blocked for admin ${adminId}`);
        res.status(400).json({ error: 'Cannot demote yourself to prevent lockout' });
        return;
      }

      const result = await pool.query('UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, role', [role, userId]);
      
      if (result.rowCount === 0) {
        console.error(`[Admin] User NOT FOUND for update: ID=${userId}`);
        res.status(404).json({ error: 'User not found' });
        return;
      }

      console.log(`[Admin] Role Update SUCCESS: User=${result.rows[0].email}, ID=${result.rows[0].id}, NewRole=${result.rows[0].role}`);

      await logSystemActivity(adminId, 'user_role_update', `Updated role for user ${userId} to ${role}`, { userId, role }, req);
      await logSecurityAlert(adminId, 'system_change', 'high', `User role updated for ${userId} to ${role}`, { userId, role }, req);

      res.json({ success: true, role: result.rows[0].role });
    } catch (error) {
      console.error('Error updating user role:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post('/api/admin/users/:userId/balance', authenticateAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { amount, reason, type } = req.body; // amount is always positive from UI now, type is 'add' or 'deduct'
      const adminId = (req as any).user.id;

      if (typeof amount !== 'number' || amount <= 0) {
        res.status(400).json({ error: 'Invalid amount' });
        return;
      }

      const walletRes = await ledgerPool.query('SELECT id, balance FROM wallets WHERE user_id = $1', [userId]);
      if (walletRes.rows.length === 0) {
        res.status(404).json({ error: 'Wallet not found' });
        return;
      }

      const walletId = walletRes.rows[0].id;
      const oldBalance = parseFloat(walletRes.rows[0].balance);
      
      const finalAmount = type === 'deduct' ? -amount : amount;
      const newBalance = oldBalance + finalAmount;

      if (newBalance < 0) {
        res.status(400).json({ error: 'Insufficient balance' });
        return;
      }

      const ledgerClient = await ledgerPool.connect();
      try {
        await ledgerClient.query('BEGIN');
        await ledgerClient.query('UPDATE wallets SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newBalance, walletId]);
        await ledgerClient.query(`
          INSERT INTO ledger_transactions (wallet_id, amount, transaction_type, description)
          VALUES ($1, $2, $3, $4)
        `, [walletId, finalAmount, type === 'add' ? 'admin_deposit' : 'admin_withdrawal', reason || 'Admin adjustment']);
        broadcastFinancialLog(walletId, finalAmount, type === 'add' ? 'admin_deposit' : 'admin_withdrawal', reason || 'Admin adjustment');
        await ledgerClient.query('COMMIT');

        await logSystemActivity(adminId, 'user_balance_adjustment', `Adjusted balance for user ${userId} by ${finalAmount} (${type})`, { userId, amount: finalAmount, reason, type }, req);
        await logSecurityAlert(adminId, 'financial_event', 'medium', `Admin adjusted balance for ${userId} by ${finalAmount}`, { userId, amount: finalAmount, reason }, req);

        // Notification
        await createNotification(
          parseInt(userId),
          'Balance Adjusted',
          'تعديل الرصيد',
          `Your balance has been adjusted by ${amount} PTS (${type}). Reason: ${reason}`,
          `تم تعديل رصيدك بمقدار ${amount} نقطة (${type === 'add' ? 'إيداع' : 'سحب'}). السبب: ${reason}`,
          'finance'
        );

        res.json({ success: true, newBalance });
      } catch (err: any) {
        await ledgerClient.query('ROLLBACK');
        console.error('Error adjusting balance:', err);
        res.status(500).json({ error: 'Failed to adjust balance' });
      } finally {
        ledgerClient.release();
      }

      // Immediate Transparent Notification for ALL Balance Adjustments
      const userRes = await pool.query('SELECT name, email FROM users WHERE id = $1', [userId]);
      if (userRes.rows.length > 0) {
        const user = userRes.rows[0];
        sendSmartEmail(parseInt(userId), user.email, 'balance_update', {
          userName: user.name || 'User',
          amount: amount.toLocaleString(),
          type: type === 'add' ? 'Deposit / إيداع' : 'Withdrawal / سحب',
          reason: reason,
          newBalance: Math.floor(newBalance).toLocaleString(),
          appName: getAppName('en')
        }, 'en').catch(console.error);
      }
    } catch (error) {
      await ledgerPool.query('ROLLBACK');
      console.error('Error adjusting balance:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.patch('/api/admin/users/:userId/plan', authenticateAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { planId } = req.body;
      const adminId = (req as any).user.id;

      console.log(`[Admin] Updating plan for user ${userId} to ${planId}`);

      // Check if plan exists
      const planCheck = await pool.query('SELECT id FROM plans WHERE id = $1', [planId]);
      if (planCheck.rows.length === 0) {
        console.error(`[Admin] Invalid plan ID: ${planId}`);
        res.status(400).json({ error: 'Invalid plan ID' });
        return;
      }

      // Update or Insert subscription 
      // Note: Admin updates default to 'monthly' logic but we use the helper to maintain baseDate integrity
      const periodEnd = await calculatePeriodEnd(parseInt(userId), 'annual'); // Admins usually grant long periods, but we'll use annual for helper calc then override if needed.
      // Override: Admin granted plans actually last 10 years as per policy (or we can just use the helper with a custom cycle if we added it)
      const adminPeriodEnd = new Date();
      adminPeriodEnd.setFullYear(adminPeriodEnd.getFullYear() + 10);

      const subCheck = await pool.query('SELECT id FROM subscriptions WHERE user_id = $1', [userId]);
      if (subCheck.rows.length > 0) {
        console.log(`[Admin] Updating existing subscription for user ${userId}`);
        await pool.query(`
          UPDATE subscriptions SET plan_id = $1, status = 'active', current_period_end = $2, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $3
        `, [planId, adminPeriodEnd, userId]);
      } else {
        console.log(`[Admin] Creating new subscription for user ${userId}`);
        await pool.query(`
          INSERT INTO subscriptions (user_id, plan_id, status, billing_period, current_period_end)
          VALUES ($1, $2, 'active', 'monthly', $3)
        `, [userId, planId, adminPeriodEnd]);
      }

      await logSystemActivity(adminId, 'user_plan_update', `Updated plan for user ${userId} to ${planId}`, { userId, planId }, req);
      await logSecurityAlert(adminId, 'system_change', 'medium', `User plan updated for ${userId} to ${planId}`, { userId, planId }, req);

      // Notification
      await createNotification(
        parseInt(userId),
        'Plan Updated',
        'تم تحديث الباقة',
        `Your subscription plan has been updated to a new level.`,
        `تم تحديث باقة اشتراكك إلى مستوى جديد.`,
        'system'
      );

      res.json({ success: true });
    } catch (error) {
      console.error('Error updating user plan:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.patch('/api/admin/users/:userId/status', authenticateAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { status } = req.body;
      const adminId = (req as any).user.id;

      if (!['active', 'suspended'].includes(status)) {
        res.status(400).json({ error: 'Invalid status' });
        return;
      }

      // SOVEREIGN persistence fix: Update the users table, not just subscriptions
      await pool.query('UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [status, userId]);
      await pool.query('UPDATE subscriptions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2', [status, userId]);
      
      await logSystemActivity(adminId, 'user_status_update', `Updated status for user ${userId} to ${status}`, { userId, status }, req);
      await logSecurityAlert(adminId, 'system_change', 'medium', `User status updated for ${userId} to ${status}`, { userId, status }, req);

      res.json({ success: true });
    } catch (error) {
      console.error('Error updating user status:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.patch('/api/admin/users/:userId/support-notes', authenticateAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { notes } = req.body;
      const adminId = (req as any).user.id;

      await pool.query('UPDATE users SET support_notes = $1 WHERE id = $2', [notes, userId]);
      await logSystemActivity(adminId, 'user_support_notes_update', `Updated support notes for user ${userId}`, { userId }, req);

      res.json({ success: true, notes });
    } catch (error) {
      console.error('Error updating support notes:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post("/api/admin/users/:userId/notify", authenticateAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { titleEn, titleAr, messageEn, messageAr, type } = req.body;
      const adminId = (req as any).user.id;

      await createNotification(parseInt(userId), titleEn, titleAr, messageEn, messageAr, type || 'support');
      await logSystemActivity(adminId, 'admin_user_notify', `Sent manual notification to user ${userId}`, { userId, type }, req);

      res.json({ success: true });
    } catch (error) {
      console.error('Error sending notification from admin:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post("/api/admin/users/:userId/send-email", authenticateAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { subject, body } = req.body;
      const adminId = (req as any).user.id;

      const userRes = await pool.query('SELECT email, name FROM users WHERE id = $1', [userId]);
      if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });

      const user = userRes.rows[0];
      await sendEmail(user.email, subject, body);
      await logSystemActivity(adminId, 'admin_user_email', `Sent manual email to user ${userId}`, { userId, email: user.email }, req);

      res.json({ success: true });
    } catch (error) {
      console.error('Error sending direct email from admin:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get("/api/admin/users/count", authenticateAdmin, async (req, res) => {
    try {
      const { group } = req.query;
      if (!pool) return res.status(503).json({ error: 'Database not available' });

      let query = 'SELECT COUNT(*) FROM users u LEFT JOIN subscriptions s ON u.id = s.user_id WHERE 1=1';
      const params: any[] = [];

      if (group === 'pro_only') {
        query += " AND s.status = 'active'";
      } else if (group === 'free_only') {
        query += " AND (s.status IS NULL OR s.status != 'active')";
      }

      const result = await pool.query(query, params);
      res.json({ count: parseInt(result.rows[0].count) });
    } catch (error) {
      console.error('Error counting users:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // --- Mass Broadcast Engine (The Broadcast Hub) ---
  app.get("/api/admin/broadcasts", authenticateAdmin, async (req, res) => {
    try {
      if (!pool) return res.status(503).json({ error: 'Database not available' });
      const result = await pool.query('SELECT * FROM system_broadcasts ORDER BY created_at DESC');
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching broadcasts:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post("/api/admin/broadcasts/send", authenticateAdmin, async (req, res) => {
    const { broadcast_type, target_group, title_en, title_ar, content_en, content_ar } = req.body;
    const adminId = (req as any).user.id;

    if (!broadcast_type || !target_group || !title_en || !title_ar || !content_en || !content_ar) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!pool) return res.status(503).json({ error: 'Database not available' });

    try {
      let userQuery = `
        SELECT u.id, u.email, u.name, u.language, s.status as sub_status 
        FROM users u 
        LEFT JOIN subscriptions s ON u.id = s.user_id 
        WHERE 1=1
      `;
      const userParams: any[] = [];

      if (target_group === 'pro_only') {
        userQuery += " AND s.status = 'active'";
      } else if (target_group === 'free_only') {
        userQuery += " AND (s.status IS NULL OR s.status != 'active')";
      }

      const usersRes = await pool.query(userQuery, userParams);
      const users = usersRes.rows;

      if (users.length === 0) {
        return res.status(400).json({ error: 'No users found in the selected target group.' });
      }

      const isNotification = broadcast_type === 'notification' || broadcast_type === 'both';
      const isEmail = broadcast_type === 'email' || broadcast_type === 'both';

      if (isNotification) {
        const batchSize = 50;
        for (let i = 0; i < users.length; i += batchSize) {
          const batch = users.slice(i, i + batchSize);
          const values = batch.map((_, idx) => `($${idx * 5 + 1}, $${idx * 5 + 2}, $${idx * 5 + 3}, $${idx * 5 + 4}, $${idx * 5 + 5}, 'system')`).join(',');
          const params = batch.flatMap(u => [u.id, title_en, title_ar, content_en, content_ar]);
          
          if (params.length > 0) {
            await pool.query(`
              INSERT INTO notifications (user_id, title_en, title_ar, message_en, message_ar, type)
              VALUES ${values}
            `, params);
            
            batch.forEach(u => pushNotificationToUser(u.id, {
              id: Date.now(),
              title_en, title_ar, message_en: content_en, message_ar: content_ar, type: 'system', created_at: new Date()
            }));
          }
        }
      }

      if (isEmail) {
        (async () => {
          for (const user of users) {
             const userLang = user.language || 'en';
             const subject = userLang === 'ar' ? title_ar : title_en;
             const body = userLang === 'ar' ? content_ar : content_en;
             await sendEmail(user.email, subject, body).catch(e => console.error(`[Broadcast] Email failed for ${user.email}:`, e));
          }
        })();
      }

      await pool.query(`
        INSERT INTO system_broadcasts (admin_id, broadcast_type, target_group, title_en, title_ar, content_en, content_ar, sent_count, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'completed')
      `, [adminId, broadcast_type, target_group, title_en, title_ar, content_en, content_ar, users.length]);

      await logSystemActivity(adminId, 'admin_broadcast_sent', `Sent mass broadcast to ${users.length} users`, { broadcast_type, target_group }, req);

      res.json({ success: true, sent_count: users.length });
    } catch (error) {
      console.error('Broadcast Error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.patch('/api/admin/users/:userId/kyc-status', authenticateAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { kyc_required } = req.body;
      const adminId = (req as any).user.id;

      if (typeof kyc_required !== 'boolean') {
        res.status(400).json({ error: 'Invalid kyc_required value' });
        return;
      }

      await pool.query('UPDATE users SET kyc_required = $1 WHERE id = $2', [kyc_required, userId]);
      await logSystemActivity(adminId, 'user_kyc_update', `Updated KYC status for user ${userId} to ${kyc_required}`, { userId, kyc_required }, req);

      res.json({ success: true });
    } catch (error) {
      console.error('Error updating user KYC status:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.patch('/api/admin/users/:userId/kyc-verification', authenticateAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { kyc_status, rejection_reason } = req.body;
      const adminId = (req as any).user.id;

      const validStatuses = ['pending', 'verified', 'rejected', 'none'];
      if (!validStatuses.includes(kyc_status)) {
        res.status(400).json({ error: 'Invalid kyc_status value' });
        return;
      }

      if (kyc_status === 'verified') {
        await pool.query('UPDATE users SET kyc_status = $1, kyc_required = false, kyc_rejection_reason = NULL WHERE id = $2', [kyc_status, userId]);
      } else if (kyc_status === 'rejected') {
        await pool.query('UPDATE users SET kyc_status = $1, kyc_rejection_reason = $2 WHERE id = $3', [kyc_status, rejection_reason || null, userId]);
      } else {
        await pool.query('UPDATE users SET kyc_status = $1 WHERE id = $2', [kyc_status, userId]);
      }
      
      await logSystemActivity(adminId, 'user_kyc_verification_update', `Updated KYC verification for user ${userId} to ${kyc_status}${kyc_status === 'rejected' ? ` (Reason: ${rejection_reason})` : ''}`, { userId, kyc_status, rejection_reason }, req);

      res.json({ success: true });

      // Send Email
      const userRes = await pool.query('SELECT name, email, language FROM users WHERE id = $1', [userId]);
      if (userRes.rows.length > 0) {
        const user = userRes.rows[0];
        const userLang = user.language || 'en';
        if (kyc_status === 'verified') {
          sendSmartEmail(parseInt(userId), user.email, 'kyc_approved', {
            userName: user.name || 'User',
            appName: getAppName(userLang)
          }, userLang).catch(console.error);
        } else if (kyc_status === 'rejected') {
          sendSmartEmail(parseInt(userId), user.email, 'kyc_rejected', {
            userName: user.name || 'User',
            rejectionReason: rejection_reason || (userLang === 'ar' ? 'لم تستوفِ الوثائق المقدمة معايير التحقق لدينا.' : 'The provided documents did not meet our verification standards.'),
            actionUrl: `${req.protocol}://${req.get('host')}/rewards`,
            appName: getAppName(userLang)
          }, userLang).catch(console.error);
        }
      }

    } catch (error) {
      console.error('Error updating user KYC verification status:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.delete('/api/admin/users/:userId/kyc-selfie', authenticateAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const adminId = (req as any).user.id;

      await pool.query('UPDATE users SET kyc_selfie = NULL, kyc_full_name = NULL WHERE id = $1', [userId]);
      await logSystemActivity(adminId, 'user_kyc_selfie_delete', `Deleted KYC selfie for user ${userId}`, { userId }, req);

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting user KYC selfie:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // Example API route for users
  app.get("/api/users", async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC LIMIT 50');
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // --- Final Safety Nets & SPA Fallback ---
  
  // API 404 Guard: Ensure no /api request falls through to static assets or Vite
  app.all('/api/*', (req, res) => {
    console.warn(`[API 404] No route matched: ${req.method} ${req.url}`);
    res.status(404).json({ 
      error: 'API Endpoint Not Found', 
      path: req.url,
      method: req.method
    });
  });

  // Global Error Handler for API routes
  app.use('/api', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('API Error:', err);
    res.status(err.status || 500).json({ 
      error: err.message || 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  });

  // --- SOVEREIGN FILE SERVING ---
  const uploadsPath = path.join(process.cwd(), 'uploads');
  if (!existsSync(uploadsPath)) mkdirSync(uploadsPath, { recursive: true });
  app.use('/uploads', express.static(uploadsPath));

  if (process.env.NODE_ENV === "production") {
    const distPath = path.resolve(__dirname, 'dist');
    console.log(`[System] Production Mode: Serving static assets from ${distPath}`);
    
    // Check if dist exists
    try {
      await fs.access(distPath);
      console.log(`[System] Verification: 'dist' folder found.`);
    } catch (e) {
      console.error(`[System] ⚠️ WARNING: 'dist' folder NOT FOUND at ${distPath}. Have you run 'npm run build'?`);
    }

    // Serve static files first
    app.use(express.static(distPath, {
      index: false,
      maxAge: '1d',
      setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
          res.setHeader('Content-Type', 'application/javascript');
        }
      }
    }));

    // Specific catch for missing assets to avoid MIME errors
    app.get(['/assets/*', '/src/*', '/@vite/*', '/@fs/*'], (req, res) => {
      res.status(404).send('Asset not found');
    });

    // Ensure all other routes are handled by index.html (SPA Fallback)
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error(`[System] Failed to send index.html: ${err.message}`);
          res.status(500).send("Application shell missing. Please ensure 'npm run build' has been executed.");
        }
      });
    });
  } else {
    console.log('[System] Development Mode: Initializing Vite Middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  // --- Socket.io Configuration ---
  io.on("connection", (socket) => {
    console.log("[Socket] Client connected:", socket.id);

    socket.on("register_user", (userId: number) => {
      if (!userId) return;
      const current = userSockets.get(userId) || [];
      if (!current.includes(socket.id)) {
        userSockets.set(userId, [...current, socket.id]);
      }
      socket.join(`user_${userId}`);
      console.log(`[Socket] User ${userId} registered and joined room user_${userId}`);
    });

    socket.on("disconnect", () => {
      userSockets.forEach((ids, userId) => {
        if (ids.includes(socket.id)) {
          const filtered = ids.filter(id => id !== socket.id);
          if (filtered.length === 0) {
            userSockets.delete(userId);
          } else {
            userSockets.set(userId, filtered);
          }
        }
      });
      console.log("[Socket] Client disconnected:", socket.id);
    });

    socket.on("chat_message", async (data) => {
      console.log('[Socket] chat_message received:', JSON.stringify(data, (k, v) => k === 'file_data' ? `[File: ${v?.name}]` : v));
      try {
        const { token, ...reqBody } = data;
        if (!token) {
          socket.emit("chat_error", { message: "Unauthorized" });
          return;
        }

        let userId: number;
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
          userId = decoded.id;
          
          // SOVEREIGN SECURITY ENFORCEMENT: Check for suspension in Socket.io layer
          const userCheck = await pool.query('SELECT status FROM users WHERE id = $1', [userId]);
          if (userCheck.rows.length > 0 && userCheck.rows[0].status === 'suspended') {
            socket.emit("chat_error", { 
              message: "Access Denied: Your account has been suspended. Please contact support.",
              isSuspended: true 
            });
            return;
          }
        } catch (err) {
          socket.emit("chat_error", { message: "Invalid token" });
          return;
        }

        const result = await executeTaskLogic(reqBody, userId, undefined, (chunk) => {
          socket.emit("chat_chunk", { chunk });
        }, socket);
        socket.emit("chat_response", result);
      } catch (error: any) {
        if (error.message !== 'TOOL_DISABLED') {
          console.error('Socket generation error:', error);
        }
        if (error.message === 'TOOL_DISABLED') {
          socket.emit("chat_error", { message: 'عذراً، تم إيقاف هذه الأداة مؤقتاً من قبل الإدارة. يرجى المحاولة لاحقاً.' });
        } else {
          socket.emit("chat_error", { message: error.message || 'Internal Server Error' });
        }
      }
    });
  });

  // Global Error Handler (Multer & System Errors)
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          error: 'حجم الملف كبير جداً. الحد الأقصى المسموح به هو 100 ميجابايت.',
          errorEn: 'File size too large. Max limit is 100MB.',
          code: 'LIMIT_FILE_SIZE'
        });
      }
      return res.status(400).json({ error: `Multer Error: ${err.message}` });
    }
    
    if (err) {
      console.error('[GlobalError] Unhandled error:', err);
      return res.status(err.status || 500).json({ 
        error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message 
      });
    }
    next();
  });

  // --- FINAL STARTUP: Bound the port only after all routes & socket handlers are ready ---
  const PORT = parseInt(process.env.PORT || "3000", 10);

  httpServer.listen(PORT, "0.0.0.0", async () => {
    console.log(`[${new Date().toISOString()}] Project Sovereignty Online.`);
    console.log(`[Server] Gateway listening on http://0.0.0.0:${PORT} (Mode: ${process.env.NODE_ENV || 'development'})`);
    
    // Perform Security Sanitization after accepting connections to speed up boot
    await sanitizeEmails().catch(e => console.error('[Startup] Sanitization failed:', e));
  });
}

startServer();
