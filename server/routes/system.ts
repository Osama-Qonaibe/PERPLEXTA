import express from 'express';
import { authenticateAdmin, authenticateToken } from '../middleware/auth.js';
import { getSystemSettings, updateSystemSettings, getEconomySettings, updateEconomySettings } from '../services/system.js';

const router = express.Router();

router.get("/settings", async (req, res) => {
  try {
    const settings = await getSystemSettings();
    res.json(settings);
  } catch (error: any) {
    console.error('[Settings] getSystemSettings failed:', error);
    res.status(500).json({ error: 'Internal Error', detail: error?.message || String(error) });
  }
});

router.get("/economy", async (req, res) => {
  try {
    const economy = await getEconomySettings();
    res.json(economy);
  } catch (error: any) {
    console.error('[Economy] getEconomySettings failed:', error);
    res.status(500).json({ error: 'Internal Error', detail: error?.message || String(error) });
  }
});

router.post("/admin/settings", authenticateAdmin, async (req, res) => {
  try {
    const result = await updateSystemSettings(req.body);
    res.json(result);
  } catch (error: any) {
    console.error('[Settings] updateSystemSettings failed:', error);
    res.status(500).json({ error: 'Internal Error', detail: error?.message || String(error) });
  }
});

router.post("/admin/economy", authenticateAdmin, async (req, res) => {
  try {
    const result = await updateEconomySettings(req.body);
    res.json(result);
  } catch (error: any) {
    console.error('[Economy] updateEconomySettings failed:', error);
    res.status(500).json({ error: 'Internal Error', detail: error?.message || String(error) });
  }
});

export default router;
