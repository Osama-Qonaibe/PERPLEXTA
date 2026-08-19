import path from 'path';
import fs from 'fs/promises';
import { getProviderKey, callAIProvider } from './ai.js';
import { getCachedOrchestratorConfig } from '../db/queries.js';
import * as _pdfFunc from 'pdf-parse';
import mammoth from 'mammoth';
import ExcelJS from 'exceljs';

// @ts-ignore
import { convert } from 'html-to-text';

const _pdf = (typeof _pdfFunc === 'function' ? _pdfFunc : (_pdfFunc as any).default || _pdfFunc) as any;
const convertHtmlToText = convert;

export const pdf = async (dataBuffer: Buffer) => {
  try {
    const PDFParse = _pdf.PDFParse || _pdf.default?.PDFParse;
    if (PDFParse) {
      const parser = new PDFParse({ data: dataBuffer });
      const result = await parser.getText();
      if (parser.destroy) await parser.destroy();
      return result;
    }
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

export interface ForensicReport {
  pdfVersion: string;
  isEncrypted: boolean;
  totalObjectsCount: number;
  interactiveJavascriptCount: number;
  optionalContentGroupsCount: number;
  embeddedFilesCount: number;
  actionsUriCount: number;
  incrementalEofCount: number;
  rootDefCount: number;
  flateStreamsCount: number;
  hiddenLayers: string[];
  anomalies: string[];
  metadata: {
    author: string;
    creator: string;
    producer: string;
    creationDate: string;
    modDate: string;
    title: string;
    subject: string;
  };
  detailedLog: string[];
}

export const forensicScanPDF = (dataBuffer: Buffer): ForensicReport => {
  const textStr = dataBuffer.toString('binary');
  const anomalies: string[] = [];
  const detailedLog: string[] = [];

  let pdfVersion = 'N/A';
  const verMatch = textStr.slice(0, 1024).match(/%PDF-(\d+\.\d+)/);
  if (verMatch) {
    pdfVersion = verMatch[1];
    detailedLog.push(`[Structural Analysis] Verified PDF version standard: %PDF-${pdfVersion}`);
  } else {
    anomalies.push('Standard PDF header %PDF- not found in first 1024 bytes. Possible structural obfuscation.');
  }

  const totalObjectsCount = (textStr.match(/\b\d+\s+\d+\s+obj\b/g) || []).length;
  const interactiveJavascriptCount = (textStr.match(/\/JS\b|\/JavaScript\b/gi) || []).length;
  const optionalContentGroupsCount = (textStr.match(/\/OCG\b|\/OCGs\b/g) || []).length;
  const embeddedFilesCount = (textStr.match(/\/EmbeddedFiles\b/gi) || []).length;
  const actionsUriCount = (textStr.match(/\/URI\b/gi) || []).length;
  const incrementalEofCount = (textStr.match(/%%EOF/g) || []).length;
  const rootDefCount = (textStr.match(/\/Root\s+\d+\s+\d+\s+R\b/g) || []).length;
  const flateStreamsCount = (textStr.match(/\/FlateDecode\b/g) || []).length;

  detailedLog.push(`[Object Discovery] Parsed ${totalObjectsCount} individual dictionary objects.`);
  detailedLog.push(`[Layer Discovery] Located ${optionalContentGroupsCount} Optional Content Groups (OCG) structures.`);
  detailedLog.push(`[Stream Ingestion] Identified ${flateStreamsCount} Flate-encoded compressed binary streams.`);

  const hiddenLayers: string[] = [];
  const ocgNameMatches = textStr.match(/\/Name\s*\((.*?)\)|\/Name\s*\/([a-zA-Z0-9_-]+)/g);
  if (ocgNameMatches && optionalContentGroupsCount > 0) {
    ocgNameMatches.forEach(m => {
      let name = '';
      if (m.includes('(')) {
        const start = m.indexOf('(') + 1;
        const end = m.lastIndexOf(')');
        if (start < end) name = m.substring(start, end);
      } else if (m.includes('/')) {
        const parts = m.split('/');
        name = parts[parts.length - 1];
      }
      name = name.trim();
      if (name && !['Name', 'Type', 'Properties'].includes(name) && !hiddenLayers.includes(name) && name.length < 60) {
        hiddenLayers.push(name);
      }
    });
  }

  if (hiddenLayers.length > 0) {
    detailedLog.push(`[Hidden Layer Map] Extracted designated layer hierarchy: [${hiddenLayers.join(', ')}]`);
  } else if (optionalContentGroupsCount > 0) {
    detailedLog.push(`[Hidden Layer Warning] OCG definitions detected, but layer labeling is obfuscated or stored in external resource dictionaries.`);
  }

  if (interactiveJavascriptCount > 0) {
    anomalies.push(`Interactive JavaScript dictionary reference detected (${interactiveJavascriptCount} occurrences). Possible active scripting layer.`);
    detailedLog.push(`[ALERT - Forensic] Identified active scripts in document scope.`);
  }
  if (embeddedFilesCount > 0) {
    anomalies.push(`Embedded external files dictionary index located (${embeddedFilesCount} occurrences). Possible secondary stealth payload package.`);
    detailedLog.push(`[ALERT - Forensic] Secure package layer contains embedded nested files.`);
  }
  if (incrementalEofCount > 1) {
    anomalies.push(`Multiple PDF end-of-file markers (%%EOF) located (${incrementalEofCount} occurrences). Indicates incremental content appending or trailer modification layers.`);
    detailedLog.push(`[ALERT - Forensic] Inconsistent document state: Incremental modification trailer block detected.`);
  }
  if (rootDefCount > 1) {
    anomalies.push(`Duplicate root document catalogs detected (${rootDefCount} occurrences). Classic technique for hiding alternate page trees in forensic audits.`);
    detailedLog.push(`[ALERT - Forensic] Multiple root descriptors found. Structure contains double page tree routing.`);
  }

  const extractMetaField = (field: string): string => {
    const bracketRegex = new RegExp(`\\/${field}\\s*\\(([^\\)]+)\\)`, 'i');
    const bracketMatch = textStr.match(bracketRegex);
    if (bracketMatch) return bracketMatch[1].trim();

    const hexRegex = new RegExp(`\\/${field}\\s*<([^>]+)>`, 'i');
    const hexMatch = textStr.match(hexRegex);
    if (hexMatch) {
      const hex = hexMatch[1].trim();
      try {
        let str = '';
        for (let i = 0; i < hex.length; i += 2) {
          str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
        }
        return str.replace(/[\x00-\x1F\x7F-\x9F]/g, "").trim();
      } catch (e) {
        return `Hex: ${hex}`;
      }
    }
    return 'N/A';
  };

  const author = extractMetaField('Author');
  const creator = extractMetaField('Creator');
  const producer = extractMetaField('Producer');
  const title = extractMetaField('Title');
  const subject = extractMetaField('Subject');
  const creationDate = extractMetaField('CreationDate');
  const modDate = extractMetaField('ModDate');

  detailedLog.push(`[Metadata Parser] Extracted Author: ${author !== 'N/A' ? author : 'None designated'}`);
  detailedLog.push(`[Metadata Parser] Extracted Creation Date: ${creationDate !== 'N/A' ? creationDate : 'None designated'}`);

  return {
    pdfVersion,
    isEncrypted: textStr.includes('/Encrypt'),
    totalObjectsCount,
    interactiveJavascriptCount,
    optionalContentGroupsCount,
    embeddedFilesCount,
    actionsUriCount,
    incrementalEofCount,
    rootDefCount,
    flateStreamsCount,
    hiddenLayers,
    anomalies,
    metadata: { author, creator, producer, title, subject, creationDate, modDate },
    detailedLog,
  };
};

export const perplextaMultimodalSense = async (dataBuffer: Buffer, mimeType: string, fileName: string): Promise<string> => {
  const config = await getCachedOrchestratorConfig('perplexta_analysis');
  if (!config) return 'Multimodal extraction unavailable: No orchestrator configuration found.';

  let provider = config.primary_provider;
  let model = config.primary_model;
  let apiKey = await getProviderKey(provider);

  if (!apiKey && config.fallback_1_provider) {
    provider = config.fallback_1_provider;
    model = config.fallback_1_model;
    apiKey = await getProviderKey(provider);
  }

  if (!apiKey) return 'API Key missing for multimodal sense orchestrator provider.';

  const fileData = {
    type: mimeType,
    data: dataBuffer.toString('base64'),
    name: fileName
  };

  try {
    const responseText = await callAIProvider(
      provider,
      model,
      apiKey,
      `Forensic analysis of ${mimeType} file "${fileName}". Extract all relevant data and metadata text clearly.`,
      '', // system prompt
      undefined, // onChunk
      [], // history
      { fileData }
    );
    return (responseText as string) || 'No extraction result.';
  } catch (e: any) {
    return `Extraction failed: ${e.message}`;
  }
};

const extractExcelText = async (dataBuffer: Buffer, mimeType: string): Promise<string> => {
  const workbook = new ExcelJS.Workbook();
  if (mimeType.includes('csv') || mimeType === 'text/plain') {
    await workbook.csv.read(require('stream').Readable.from(dataBuffer as any));
  } else {
    await workbook.xlsx.load(dataBuffer as any);
  }
  let fullText = '';
  workbook.eachSheet((sheet) => {
    fullText += `--- Sheet: ${sheet.name} ---\n`;
    sheet.eachRow((row) => {
      const values = (row.values as any[]).slice(1).map((v: any) => (v === null || v === undefined ? '' : String(v)));
      fullText += values.join('\t') + '\n';
    });
  });
  return fullText;
};

export const extractTextFromBuffer = async (dataBuffer: Buffer, mimeType: string, originalName: string = ''): Promise<string> => {
  try {
    if (!mimeType) mimeType = 'application/octet-stream';

    if (mimeType === 'application/pdf') {
      const res = await pdf(dataBuffer);
      return typeof res === 'string' ? res : (res.text || '');
    }

    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const res = await mammoth.extractRawText({ buffer: dataBuffer });
      return res.value;
    }

    if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) {
      return await extractExcelText(dataBuffer, mimeType);
    }

    if (mimeType === 'text/html' || mimeType === 'application/rtf') {
      return convertHtmlToText(dataBuffer.toString());
    }

    if (mimeType.startsWith('text/') || mimeType === 'application/json') {
      return dataBuffer.toString();
    }

    if (mimeType.startsWith('image/') || mimeType.startsWith('video/') || mimeType.startsWith('audio/')) {
      return await perplextaMultimodalSense(dataBuffer, mimeType, originalName);
    }

    return 'Unsupported file type for text extraction.';
  } catch (error: any) {
    console.error(`[Extractor] Error: ${error.message}`);
    return `Extraction Error: ${error.message}`;
  }
};

export const extractTextFromFile = async (filePath: string, mimeType: string, originalName: string): Promise<string> => {
  try {
    const dataBuffer = await fs.readFile(filePath);
    return await extractTextFromBuffer(dataBuffer, mimeType, originalName);
  } catch (error: any) {
    console.error(`[Extractor] Error reading file: ${error.message}`);
    return `Extraction Error: ${error.message}`;
  }
};
