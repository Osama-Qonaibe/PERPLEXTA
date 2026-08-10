import express from 'express';
import { GoogleGenAI } from "@google/genai";
import { getProviderKey } from '../services/ai.js';

const router = express.Router();

router.post('/suggest-meta', async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Content is required' });

  try {
    // Dynamically retrieve the API key configured by the Admin, falling back to process.env
    let apiKey: string | null = await getProviderKey('google');
    if (!apiKey) {
      apiKey = process.env.GEMINI_API_KEY || null;
    }

    if (!apiKey) {
      return res.status(503).json({ 
        error: 'AI features are currently disabled. Please configure your Google Gemini API key in the Admin Panel.',
        error_ar: 'خدمات الذكاء الاصطناعي معطلة حالياً. يرجى تهيئة مفتاح API الخاص بـ Google Gemini من لوحة التحكم.'
      });
    }

    // Lazily initialize client
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });

    const prompt = `Based on the following body content, suggest a high-performing meta-title (max 60 chars) and meta-description (max 160 chars). Return the result strictly in JSON format: {"metaTitle": "...", "metaDescription": "..."}. \n\nContent: ${content}`;
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // Using standard stable flash model
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    res.json(JSON.parse(text));
  } catch (err: any) {
    console.error('AI suggest meta error:', err);
    res.status(500).json({ error: 'AI suggestion failed' });
  }
});

export default router;
