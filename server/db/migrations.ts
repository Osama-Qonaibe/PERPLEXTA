/**
 * PERPLEXTA DATABASE MIGRATIONS - MODULAR FORWARDER
 * Re-exports the clean, decomposed migration suite from ./migrations/index.js
 * Segregated by database pools: Core, Ledger, External, Security.
 */

export * from './migrations/index.js';
