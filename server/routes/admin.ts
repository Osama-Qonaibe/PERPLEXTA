import express from 'express';
import globalRouter from './admin/global.js';
import infraRouter from './admin/infra.js';
import orchestratorRouter from './admin/orchestrator.js';
import economyRouter from './admin/economy.js';
import usersRouter from './admin/users.js';

const router = express.Router();

/**
 * PERPLEXTA SOVEREIGN ADMIN ROUTER
 * Orchestrates modular administrative pathways.
 */

// Global System Monitoring & Logs
router.use('/', globalRouter);

// Infrastructure (DB, Keys, Stripe)
router.use('/', infraRouter);

// AI Routing & Orchestration
router.use('/orchestrator', orchestratorRouter);

// Economy, Plans & Ledger
router.use('/', economyRouter);

// User & Identity Management
router.use('/', usersRouter);

export default router;
