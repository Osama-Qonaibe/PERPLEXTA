import { Router } from "express";
import { pool } from "../../db/index.js";
import { authenticate, adminOnly } from "../../middleware/auth.js";
import { 
  getDatabaseRegistry, 
  saveDatabaseConfig, 
  testDatabaseConnection, 
  exportDatabase, 
  importDatabase 
} from "../../services/admin.js";
import { runDatabaseMigrations } from "../../db/migrations.js";

const router = Router();
router.use(authenticate, adminOnly);

async function auditLog(userId: any, action: string, type: string, details: object) {
  try {
    await pool.query(
      'INSERT INTO system_logs (user_id, action, type, details) VALUES ($1, $2, $3, $4)',
      [userId, action, type, JSON.stringify(details)]
    );
  } catch {}
}

// GET /api/admin/databases
router.get("/", async (req, res) => {
  try {
    const registry = await getDatabaseRegistry();
    res.json(registry);
  } catch {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/admin/databases/registry
router.get("/registry", async (req, res) => {
  try {
    const registry = await getDatabaseRegistry();
    res.json(registry);
  } catch {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/admin/databases/save
router.post("/save", async (req, res) => {
  try {
    const result = await saveDatabaseConfig(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/admin/databases/test
router.post("/test", async (req, res) => {
  try {
    const { host, port, database, user } = req.body;
    if (!host || !database) return res.status(400).json({ error: 'host and database are required' });
    const result = await testDatabaseConnection(req.body);
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/admin/databases/migrate
router.post("/migrate", async (req, res) => {
  try {
    const { type } = req.body;
    await runDatabaseMigrations(type || 'additive');
    await auditLog((req as any).user?.id, 'Run Database Migrations', 'system', { type });
    res.json({ success: true, message: 'Migrations completed' });
  } catch {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/admin/databases/export
router.get("/export", async (req, res) => {
  try {
    const backup = await exportDatabase(req.query.type as any);
    res.json(backup);
  } catch {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/admin/databases/import
router.post("/import", async (req, res) => {
  try {
    const { backup, targetType } = req.body;
    if (!backup || typeof backup !== 'object') return res.status(400).json({ error: 'Invalid backup payload' });
    if (!targetType) return res.status(400).json({ error: 'targetType is required' });
    const result = await importDatabase(backup, targetType);
    await auditLog((req as any).user?.id, 'Import Database', 'system', { targetType });
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
