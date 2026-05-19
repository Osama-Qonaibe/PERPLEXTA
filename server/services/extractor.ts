import path from 'path';
import fs from 'fs/promises';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const _pdf = require('pdf-parse');
const mammoth = require('mammoth');
const XLSX = require('xlsx');
const { convert: convertHtmlToText } = require('html-to-text');

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

export const perplextaMultimodalSense = async (dataBuffer: Buffer, mimeType: string, fileName: string): Promise<string> => {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) return 'API Key missing for multimodal sense.';
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const base64Data = dataBuffer.toString('base64');
  
  const body = {
    contents: [{
      parts: [
        { text: `Forensic analysis of ${mimeType} file "${fileName}". Extract all relevant data.` },
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
    const data: any = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No extraction result.';
  } catch (e: any) {
    return `Extraction failed: ${e.message}`;
  }
};

export const extractTextFromFile = async (filePath: string, mimeType: string, originalName: string): Promise<string> => {
  try {
    const dataBuffer = await fs.readFile(filePath);
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
      const workbook = XLSX.read(dataBuffer, { type: 'buffer' });
      let fullText = '';
      workbook.SheetNames.forEach((name: string) => {
        fullText += `--- Sheet: ${name} ---\n${XLSX.utils.sheet_to_txt(workbook.Sheets[name])}\n`;
      });
      return fullText;
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
