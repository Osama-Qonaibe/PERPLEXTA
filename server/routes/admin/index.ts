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

export default router;
