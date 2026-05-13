import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getUserMemories, addMemory, updateMemory, deleteMemory, pruneMemories } from '../services/memory.js';

const router = express.Router();

router.get("/", authenticateToken, async (req: any, res) => {
  try {
    const memories = await getUserMemories(req.user.id);
    res.json(memories);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch memories' });
  }
});

router.post("/", authenticateToken, async (req: any, res) => {
  try {
    const { fact, category, source, chatId } = req.body;
    if (!fact) return res.status(400).json({ error: 'Fact is required' });
    const memory = await addMemory(req.user.id, fact, category, source, chatId);
    res.json(memory);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to add memory' });
  }
});

router.put("/:id", authenticateToken, async (req: any, res) => {
  try {
    const { fact, category } = req.body;
    if (!fact) return res.status(400).json({ error: 'Fact is required' });
    const memory = await updateMemory(parseInt(req.params.id), req.user.id, fact, category);
    if (!memory) return res.status(404).json({ error: 'Memory not found' });
    res.json(memory);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update memory' });
  }
});

router.delete("/:id", authenticateToken, async (req: any, res) => {
  try {
    const success = await deleteMemory(parseInt(req.params.id), req.user.id);
    if (!success) return res.status(404).json({ error: 'Memory not found' });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete memory' });
  }
});

router.post("/prune", authenticateToken, async (req: any, res) => {
  try {
    const count = await pruneMemories(req.user.id);
    res.json({ success: true, pruned: count });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to prune memories' });
  }
});

export default router;
