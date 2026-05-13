import express from 'express';
import { authenticateAdmin, authenticateToken } from '../middleware/auth.js';
import { getSystemSettings, updateSystemSettings, getEconomySettings, updateEconomySettings } from '../services/system.js';

const router = express.Router();

router.get("/settings", async (req, res) => {
  try {
    const settings = await getSystemSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Internal Error' });
  }
});

router.get("/economy", async (req, res) => {
  try {
    const economy = await getEconomySettings();
    res.json(economy);
  } catch (error) {
    res.status(500).json({ error: 'Internal Error' });
  }
});

router.post("/admin/settings", authenticateAdmin, async (req, res) => {
  try {
    const result = await updateSystemSettings(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Internal Error' });
  }
});

router.post("/admin/economy", authenticateAdmin, async (req, res) => {
  try {
    const result = await updateEconomySettings(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Internal Error' });
  }
});

export default router;
