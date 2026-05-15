import express from 'express';
import globalRouter from './global.js';
import infraRouter from './infra.js';
import orchestratorRouter from './orchestrator.js';
import economyRouter from './economy.js';
import usersRouter from './users.js';

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
