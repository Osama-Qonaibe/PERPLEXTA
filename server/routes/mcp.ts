import express from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { pool } from '../db/index.js';
import { executeTaskLogic } from '../services/orchestrator.js';

const router = express.Router();

// SSE Session storage with enhanced management
interface SseSession {
  id: string;
  res: express.Response;
  created: number;
  heartbeatInterval?: NodeJS.Timeout;
  sessionTimeout?: NodeJS.Timeout;
}

const sessions = new Map<string, SseSession>();

/**
 * SSE Endpoint with proper session lifecycle management
 * FIXES APPLIED:
 * 1. Added error handling on res.write() failures
 * 2. Added session timeout (30 minutes)
 * 3. Proper cleanup of intervals and timeouts
 * 4. Added error event handlers to prevent hanging connections
 */
router.get('/sse', (req, res) => {
  const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  const host = req.headers.host || 'perplexta.com';
  const baseUrl = `${protocol}://${host}`;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  const sessionId = crypto.randomUUID();
  const session: SseSession = {
    id: sessionId,
    res,
    created: Date.now(),
  };

  // Cleanup function to prevent memory leaks
  const cleanupSession = () => {
    if (session.heartbeatInterval) {
      clearInterval(session.heartbeatInterval);
      session.heartbeatInterval = undefined;
    }
    if (session.sessionTimeout) {
      clearTimeout(session.sessionTimeout);
      session.sessionTimeout = undefined;
    }
    sessions.delete(sessionId);
    console.log('[SSE] Session cleaned up:', sessionId);
  };

  sessions.set(sessionId, session);

  // Client must POST JSON-RPC payloads to this message url
  const messageUrl = `${baseUrl}/api/mcp/message?id=${sessionId}`;

  // Write initial protocol headers with error handling
  try {
    res.write(`event: endpoint\ndata: ${messageUrl}\n\n`);
  } catch (err) {
    console.error('[SSE] Failed to write endpoint:', err);
    cleanupSession();
    res.end();
    return;
  }

  // Heartbeat to maintain open tunnel with comprehensive error handling
  session.heartbeatInterval = setInterval(() => {
    if (res.writableEnded) {
      cleanupSession();
      return;
    }

    try {
      res.write(': heartbeat\n\n');
    } catch (err) {
      console.warn('[SSE] Heartbeat write failed:', (err as Error).message);
      cleanupSession();
    }
  }, 15000);

  // Session timeout: 30 minutes to prevent resource exhaustion
  session.sessionTimeout = setTimeout(() => {
    console.log('[SSE] Session timeout (30 min), closing:', sessionId);
    cleanupSession();
    try {
      res.end();
    } catch (e) {
      // Already closed
    }
  }, 30 * 60 * 1000);

  // Cleanup on connection close
  req.on('close', () => {
    console.log('[SSE] Client disconnected:', sessionId);
    cleanupSession();
  });

  // Error handling for request
  req.on('error', (err) => {
    console.error('[SSE] Connection error:', sessionId, (err as Error).message);
    cleanupSession();
  });

  // Error handling for response
  res.on('error', (err) => {
    console.error('[SSE] Response error:', sessionId, (err as Error).message);
    cleanupSession();
  });
});

/**
 * Message Endpoint
 * Decodes and executes JSON-RPC 2.0 payloads submitted by MCP clients.
 */
router.post('/message', async (req, res) => {
  const sessionId = req.query.id as string;
  const reqBody = req.body;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (!reqBody || typeof reqBody !== 'object') {
    return res.status(400).json({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32700, message: 'Parse error' }
    });
  }

  const { jsonrpc, id, method, params } = reqBody;

  if (jsonrpc !== '2.0') {
    return res.status(400).json({
      jsonrpc: '2.0',
      id: id || null,
      error: { code: -32600, message: 'Invalid Request: missing or invalid jsonrpc version' }
    });
  }

  // Resolve User ID via JWT authorization header if present
  let userId = 1; // Default integration/sandbox user ID
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      token = token.trim();
      if (token.startsWith('"') && token.endsWith('"')) {
        token = token.slice(1, -1);
      }
      const jwtSecret = process.env.JWT_SECRET;
      if (jwtSecret) {
        const decoded = jwt.verify(token, jwtSecret) as any;
        if (decoded && decoded.id) {
          userId = decoded.id;
        }
      }
    } catch (err) {
      console.warn('[MCP Server] JWT validation warning:', err);
    }
  }

  try {
    switch (method) {
      case 'initialize': {
        return res.json({
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: { listChanged: true },
              prompts: { listChanged: true },
              resources: { listChanged: true }
            },
            serverInfo: {
              name: 'Perplexta Platform MCP Server',
              version: '1.0.0'
            }
          }
        });
      }

      case 'tools/list': {
        let registeredTools: any[] = [];
        try {
          const dbTools = await pool.query('SELECT tool_id, task_description, task_description_ar FROM tool_orchestrator WHERE is_active = true');
          registeredTools = dbTools.rows;
        } catch (dbErr) {
          console.error('[MCP Server] Error querying tools from DB:', dbErr);
        }

        if (registeredTools.length === 0) {
          registeredTools = [
            { tool_id: 'chat', task_description: 'Elite strategic assistant for professional discourse and general logic.' },
            { tool_id: 'perplexta_analysis', task_description: 'Professional technical synthesis and deep digital strategic search.' },
            { tool_id: 'code', task_description: 'Master-level software engineering workstation and logic constructor.' },
            { tool_id: 'legal_analysis', task_description: 'Perplexta professional document auditing and legal synthesis.' }
          ];
        }

        const mcpToolsList = registeredTools.map(t => ({
          name: t.tool_id,
          description: t.task_description || t.task_description_ar || 'Perplexta advanced technical tool.',
          inputSchema: {
            type: 'object',
            properties: {
              prompt: {
                type: 'string',
                description: 'The query, input sequence, or analysis instructions.'
              }
            },
            required: ['prompt']
          }
        }));

        return res.json({
          jsonrpc: '2.0',
          id,
          result: {
            tools: mcpToolsList
          }
        });
      }

      case 'tools/call': {
        const toolName = params?.name;
        const toolArgs = params?.arguments || {};
        const runPrompt = toolArgs.prompt || '';

        if (!toolName) {
          return res.status(400).json({
            jsonrpc: '2.0',
            id,
            error: { code: -32602, message: 'Invalid params: name is required' }
          });
        }

        if (!runPrompt) {
          return res.status(400).json({
            jsonrpc: '2.0',
            id,
            error: { code: -32602, message: 'Invalid params: arguments.prompt is required' }
          });
        }

        const activeSession = sessionId ? sessions.get(sessionId) : null;
        if (activeSession && !activeSession.res.writableEnded) {
          try {
            activeSession.res.write(`event: log\ndata: ${JSON.stringify({ message: `Executing tool ${toolName} for query.` })}\n\n`);
          } catch (err) {
            console.warn('[MCP] Failed to write log event:', err);
          }
        }

        let buffer = '';
        const onChunk = (chunk: string) => {
          buffer += chunk;
          if (activeSession && !activeSession.res.writableEnded) {
            try {
              activeSession.res.write(`event: progress\ndata: ${JSON.stringify({ chunk })}\n\n`);
            } catch (err) {
              console.warn('[MCP] Failed to write progress event:', err);
            }
          }
        };

        const executionResult = await executeTaskLogic({
          tool_id: toolName,
          prompt: runPrompt
        }, userId, req, onChunk);

        const resultAsAny = executionResult as any;
        const summaryText = resultAsAny?.response || resultAsAny?.summary || resultAsAny?.result || buffer || resultAsAny?.text || JSON.stringify(executionResult);

        return res.json({
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: summaryText
              }
            ],
            isError: false
          }
        });
      }

      case 'prompts/list': {
        return res.json({
          jsonrpc: '2.0',
          id,
          result: {
            prompts: [
              {
                name: 'strategic-code-refactor',
                description: 'Execute high-precision strategic code review and architectural audits.',
                arguments: [
                  { name: 'code', description: 'The code chunk to audit.', required: true }
                ]
              },
              {
                name: 'digital-forensic-pdf',
                description: 'Extract structure, anomalies, and hidden properties from standard digital PDF exports.',
                arguments: [
                  { name: 'pdfUrl', description: 'Address link of the PDF file to scan.', required: true }
                ]
              }
            ]
          }
        });
      }

      case 'resources/list': {
        return res.json({
          jsonrpc: '2.0',
          id,
          result: {
            resources: [
              {
                uri: 'perplexta://docs/constitution',
                name: 'Perplexta Global Constitution',
                mimeType: 'text/markdown',
                description: 'The core sovereign executing protocol governing all AI tools and failsafe routines.'
              }
            ]
          }
        });
      }

      default: {
        return res.status(404).json({
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Method not found: ${method}` }
        });
      }
    }
  } catch (error: any) {
    console.error('[MCP Server] Execution error:', error);
    return res.status(500).json({
      jsonrpc: '2.0',
      id,
      error: {
        code: -32000,
        message: error.message || 'Server error during execution'
      }
    });
  }
});

export default router;
