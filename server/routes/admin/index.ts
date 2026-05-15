import { Router } from "express";
import keysRouter from "./keys.js";
import statsRouter from "./stats.js";
import usersRouter from "./users.js";
import financialRouter from "./financial.js";
import orchestratorRouter from "./orchestrator.js";
import databasesRouter from "./databases.js";
import emailsRouter from "./emails.js";
import maintenanceRouter from "./maintenance.js";
import plansRouter from "./plans.js";

const router = Router();

router.use("/", statsRouter);
router.use("/api-keys", keysRouter);
router.use("/users", usersRouter);
router.use("/financial", financialRouter);
router.use("/orchestrator", orchestratorRouter);
router.use("/databases", databasesRouter);
router.use("/emails", emailsRouter);
router.use("/maintenance", maintenanceRouter);
router.use("/plans", plansRouter);

// Special case for backward compatibility or paths that don't fit the prefix
// Since statsRouter is at "/", it handles its own prefixes like /stats, /health etc.
// But some routers like keysRouter were mapped to /api-keys.
// Wait, if I mount keysRouter at "/api-keys", then inside keys.ts, router.get("/") becomes /api-keys.
// Let's check keys.ts content.
/*
router.get("/", async (req, res) => { ... GET /api/admin/api-keys
*/
// Correct.

export default router;
