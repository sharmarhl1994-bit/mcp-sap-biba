#!/usr/bin/env node

/**
 * Central Streamable-HTTP MCP server.
 *
 * Deploy this on one machine inside the corporate network. Every user points
 * their Claude Desktop at the same URL and passes their own SAP credentials
 * in request headers — no local Node.js install required on each workstation.
 *
 * Credentials come from the MCP client via custom headers:
 *   x-sap-user     — SAP username
 *   x-sap-password — SAP password
 *
 * SAP_URL (and optionally SAP_CLIENT, SAP_LANGUAGE) are set in the server's
 * .env file once. Each user gets an isolated MCP server + ADTClient per session.
 */

import 'dotenv/config';
import http from 'http';
import { randomUUID } from 'crypto';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode
} from '@modelcontextprotocol/sdk/types.js';
import { ADTClient, session_types } from 'abap-adt-api';

import { DataHandlers }   from './handlers/DataHandlers.js';
import { SystemHandlers } from './handlers/SystemHandlers.js';
import { logToolError, extractRawResponse } from './lib/logger.js';
import { parseAdtError } from './lib/errors.js';
import type { BaseHandler } from './handlers/BaseHandler.js';
import type { ToolDefinition } from './types/tools.js';

// ── Config ─────────────────────────────────────────────────────────────────

const SAP_URL      = process.env.SAP_URL;
const SAP_CLIENT   = process.env.SAP_CLIENT   || '100';
const SAP_LANGUAGE = process.env.SAP_LANGUAGE || 'EN';
const PORT         = parseInt(process.env.MCP_PORT || '3000', 10);
const HOST         = process.env.MCP_HOST || '0.0.0.0';

if (!SAP_URL) {
  console.error('ERROR: SAP_URL is required in .env');
  process.exit(1);
}

 

interface SessionEntry {
  transport: StreamableHTTPServerTransport;
  server:    Server;
  lastSeen:  number;
}

// sessionId → entry (session created on first MCP initialize request)
const sessions = new Map<string, SessionEntry>();

// Clean up sessions idle for more than 2 hours
setInterval(() => {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  for (const [id, entry] of sessions) {
    if (entry.lastSeen < cutoff) {
      entry.transport.close().catch(() => {});
      sessions.delete(id);
    }
  }
}, 10 * 60 * 1000);

// ── Build an MCP server wired to one user's ADTClient ───────────────────────

function buildMcpServer(user: string, password: string): { server: Server; transport: StreamableHTTPServerTransport } {
  const client = new ADTClient(SAP_URL!, user, password, SAP_CLIENT, SAP_LANGUAGE);
  client.stateful = session_types.stateful;

  const handlers: BaseHandler[] = [
    new DataHandlers(client),
    new SystemHandlers(client),
  ];

  const toolMap = new Map<string, BaseHandler>();
  const allTools: ToolDefinition[] = [];
  for (const h of handlers) {
    for (const tool of h.getTools()) {
      toolMap.set(tool.name, h);
      allTools.push(tool);
    }
  }

  const server = new Server(
    { name: 'abap-data-mcp', version: '1.0.0' },
    { capabilities: { tools: {}, logging: {} } }
  );

  const notify = async (level: 'info' | 'warning' | 'error', message: string) => {
    try { await server.sendLoggingMessage({ level, data: message }); } catch (_) {}
  };
  for (const h of handlers) h.setNotify(notify);

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: allTools.map(t => ({
      name:        t.name,
      description: t.description,
      inputSchema: t.inputSchema,
      annotations: t.annotations
    }))
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const handler = toolMap.get(name);
    if (!handler) throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    try {
      return await handler.validateAndHandle(name, args || {});
    } catch (error: any) {
      const info = parseAdtError(error);
      const { headers, body } = info.httpStatus === 400 ? extractRawResponse(error) : {};
      logToolError({ tool: name, message: info.message, http_status: info.httpStatus, args, raw_headers: headers, raw_body: body });
      if (error instanceof McpError) throw error;
      throw new McpError(ErrorCode.InternalError, info.message);
    }
  });

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (sessionId) => {
      sessions.set(sessionId, { transport, server, lastSeen: Date.now() });
      console.log(`[session] ${sessionId} created for user: ${user}`);
    },
    onsessionclosed: (sessionId) => {
      sessions.delete(sessionId);
      console.log(`[session] ${sessionId} closed`);
    },
    enableJsonResponse: false
  });

  return { server, transport };
}

// ── HTTP request handler ─────────────────────────────────────────────────────

function extractCredentials(req: http.IncomingMessage): { user: string; password: string } | null {
  // Option 1: custom headers (preferred for Claude Desktop mcp config)
  const headerUser = req.headers['x-sap-user'];
  const headerPass = req.headers['x-sap-password'];
  if (headerUser && headerPass) {
    return {
      user:     Array.isArray(headerUser) ? headerUser[0] : headerUser,
      password: Array.isArray(headerPass) ? headerPass[0] : headerPass
    };
  }

  // Option 2: standard HTTP Basic Auth  (Authorization: Basic base64(user:pass))
  const authHeader = req.headers['authorization'];
  if (authHeader?.startsWith('Basic ')) {
    const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf-8');
    const colon = decoded.indexOf(':');
    if (colon > 0) {
      return {
        user:     decoded.slice(0, colon),
        password: decoded.slice(colon + 1)
      };
    }
  }

  return null;
}

async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  // CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Mcp-Session-Id, x-sap-user, x-sap-password, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url !== '/mcp') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found. Use POST /mcp' }));
    return;
  }

  // ── Session resume: existing session ─────────────────────────────────────
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (sessionId && sessions.has(sessionId)) {
    const entry = sessions.get(sessionId)!;
    entry.lastSeen = Date.now();
    await entry.transport.handleRequest(req, res);
    return;
  }

  // ── New session: credentials required ────────────────────────────────────
  const creds = extractCredentials(req);
  if (!creds) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'SAP credentials required.',
      hint:  'Send x-sap-user and x-sap-password headers, or use HTTP Basic Auth.'
    }));
    return;
  }

  const { server, transport } = buildMcpServer(creds.user, creds.password);

  await server.connect(transport);
  await transport.handleRequest(req, res);
}

// ── Start server ─────────────────────────────────────────────────────────────

const httpServer = http.createServer(async (req, res) => {
  try {
    await handleRequest(req, res);
  } catch (err: any) {
    console.error('[http] unhandled error:', err.message || err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  }
});

httpServer.listen(PORT, HOST, () => {
  console.log(`abap-data-mcp HTTP server listening on http://${HOST}:${PORT}/mcp`);
  console.log(`SAP system: ${SAP_URL} | client: ${SAP_CLIENT} | lang: ${SAP_LANGUAGE}`);
  console.log('Waiting for connections...');
});
