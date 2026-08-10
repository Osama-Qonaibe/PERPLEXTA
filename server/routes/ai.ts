import express from 'express';
import { GoogleGenAI } from "@google/genai";

const router = express.Router();

let aiEnabled = true;

// Initialize AI client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
  httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
});

router.post('/suggest-meta', async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Content is required' });
  if (!aiEnabled) return res.status(503).json({ error: 'AI features are currently disabled' });

  try {
    const prompt = `Based on the following body content, suggest a high-performing meta-title (max 60 chars) and meta-description (max 160 chars). Return the result strictly in JSON format: {"metaTitle": "...", "metaDescription": "..."}. \n\nContent: ${content}`;
    
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    res.json(JSON.parse(text));
  } catch (err: any) {
    if (err.status === 400 || (err.message && err.message.includes('API key'))) {
      aiEnabled = false;
      console.error('[AI Routes] AI features disabled due to invalid API key.');
    }
    console.error('AI suggest meta error:', err);
    res.status(500).json({ error: 'AI suggestion failed' });
  }
});

export default router;
