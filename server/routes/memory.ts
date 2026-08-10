import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getUserMemories, addMemory, updateMemory, deleteMemory, pruneMemories, getMemoryDiagnostics, runContextCleanup, smartCompressMemoryContext } from '../services/memory.js';


const router = express.Router();

router.get("/diagnostics", authenticateToken, async (req: any, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const diagnostics = await getMemoryDiagnostics(req.user.id, isAdmin);
    res.json(diagnostics);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch memory diagnostics' });
  }
});

router.post("/smart-compress", authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required for smart compression' });
    }
    const result = await smartCompressMemoryContext();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to run smart compression' });
  }
});

router.post("/cleanup-context", authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required for context cleanup' });
    }
    const ttlDays = req.body.ttlDays ? parseInt(req.body.ttlDays, 10) : 30;
    const result = await runContextCleanup(ttlDays);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to run context cleanup' });
  }
});



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
