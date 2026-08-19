import express from 'express';
import { callAIProvider, getProviderKey, getProviderUrlKey } from '../services/ai.js';
import { getCachedOrchestratorConfig } from '../db/queries.js';
import { generateContextualFollowUpsFallback } from '../utils/helpers.js';

const router = express.Router();

router.post('/generate-followups', async (req, res) => {
  const { lastMessage, userQuery } = req.body;
  if (!lastMessage) return res.status(400).json({ error: 'Last message is required' });

  try {
    const orchestrator = await getCachedOrchestratorConfig('chat');
    const provider = orchestrator?.primary_provider;
    const model = orchestrator?.primary_model;

    if (!provider || !model) {
      return res.json(generateContextualFollowUpsFallback(userQuery || '', lastMessage, 'ar', 'chat'));
    }

    let apiKey: string | null = await getProviderKey(provider);
    let urlKey: string | null = await getProviderUrlKey(provider);

    if (!apiKey) {
      return res.json(generateContextualFollowUpsFallback(userQuery || '', lastMessage, 'ar', 'chat'));
    }

    const prompt = `Based on the user query and the assistant response, generate 3 context-aware, highly actionable follow-up question suggestions that the user would naturally ask next to dive deeper into the exact topic.
    Return the result strictly as a JSON list of strings: ["Suggestion 1", "Suggestion 2", "Suggestion 3"].
    
    User Query: ${userQuery || ''}
    Assistant Response: ${lastMessage}`;
    
    const messages = [{ role: 'user', content: prompt }];

    try {
      let text = await callAIProvider(provider, model, apiKey, prompt, '', undefined, messages, {}, urlKey || undefined);
      
      // Cleanup common markdown JSON blocks
      if (text.startsWith('```json')) text = text.replace(/```json\n?/, '');
      if (text.startsWith('```')) text = text.replace(/```\n?/, '');
      if (text.endsWith('```')) text = text.replace(/\n?```/, '');

      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return res.json(parsed);
      }
    } catch (err: any) {
      // Ignore provider specific errors and fallback
    }

    // Fallback to local contextual generator
    return res.json(generateContextualFollowUpsFallback(userQuery || '', lastMessage, 'ar', 'chat'));
  } catch (err: any) {
    console.warn('AI follow-up suggestion error handled gracefully:', err?.message || err);
    return res.json(generateContextualFollowUpsFallback(userQuery || '', lastMessage, 'ar', 'chat'));
  }
});

router.post('/suggest-meta', async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Content is required' });

  try {
    const orchestrator = await getCachedOrchestratorConfig('perplexta_analysis');
    const provider = orchestrator?.primary_provider;
    const model = orchestrator?.primary_model;

    if (!model || !provider) {
      return res.status(503).json({ error: 'Orchestrator not configured' });
    }

    let apiKey: string | null = await getProviderKey(provider);
    let urlKey: string | null = await getProviderUrlKey(provider);

    if (!apiKey) {
      return res.status(503).json({ error: 'AI key not found in vault for provider: ' + provider });
    }

    const prompt = `Based on the following body content, suggest a high-performing meta-title (max 60 chars) and meta-description (max 160 chars). Return the result strictly in JSON format: {"metaTitle": "...", "metaDescription": "..."}. \n\nContent: ${content}`;
    const messages = [{ role: 'user', content: prompt }];

    let text = await callAIProvider(provider, model, apiKey, prompt, '', undefined, messages, {}, urlKey || undefined);
    
    // Cleanup JSON markdown
    if (text.startsWith('```json')) text = text.replace(/```json\n?/, '');
    if (text.startsWith('```')) text = text.replace(/```\n?/, '');
    if (text.endsWith('```')) text = text.replace(/\n?```/, '');

    res.json(JSON.parse(text));
  } catch (err: any) {
    console.error('AI suggest meta error:', err);
    res.status(500).json({ error: 'AI suggestion failed' });
  }
});

export default router;
