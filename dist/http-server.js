#!/usr/bin/env node
"use strict";
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const http_1 = __importDefault(require("http"));
const crypto_1 = require("crypto");
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const streamableHttp_js_1 = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const abap_adt_api_1 = require("abap-adt-api");
const DataHandlers_js_1 = require("./handlers/DataHandlers.js");
const SystemHandlers_js_1 = require("./handlers/SystemHandlers.js");
const logger_js_1 = require("./lib/logger.js");
const errors_js_1 = require("./lib/errors.js");
// ── Config ─────────────────────────────────────────────────────────────────
const SAP_URL = process.env.SAP_URL;
const SAP_CLIENT = process.env.SAP_CLIENT || '100';
const SAP_LANGUAGE = process.env.SAP_LANGUAGE || 'EN';
const PORT = parseInt(process.env.MCP_PORT || '3000', 10);
const HOST = process.env.MCP_HOST || '0.0.0.0';
if (!SAP_URL) {
    console.error('ERROR: SAP_URL is required in .env');
    process.exit(1);
}
// sessionId → entry (session created on first MCP initialize request)
const sessions = new Map();
// Clean up sessions idle for more than 2 hours
setInterval(() => {
    const cutoff = Date.now() - 2 * 60 * 60 * 1000;
    for (const [id, entry] of sessions) {
        if (entry.lastSeen < cutoff) {
            entry.transport.close().catch(() => { });
            sessions.delete(id);
        }
    }
}, 10 * 60 * 1000);
// ── Build an MCP server wired to one user's ADTClient ───────────────────────
function buildMcpServer(user, password) {
    const client = new abap_adt_api_1.ADTClient(SAP_URL, user, password, SAP_CLIENT, SAP_LANGUAGE);
    client.stateful = abap_adt_api_1.session_types.stateful;
    const handlers = [
        new DataHandlers_js_1.DataHandlers(client),
        new SystemHandlers_js_1.SystemHandlers(client),
    ];
    const toolMap = new Map();
    const allTools = [];
    for (const h of handlers) {
        for (const tool of h.getTools()) {
            toolMap.set(tool.name, h);
            allTools.push(tool);
        }
    }
    const server = new index_js_1.Server({ name: 'abap-data-mcp', version: '1.0.0' }, { capabilities: { tools: {}, logging: {} } });
    const notify = (level, message) => __awaiter(this, void 0, void 0, function* () {
        try {
            yield server.sendLoggingMessage({ level, data: message });
        }
        catch (_) { }
    });
    for (const h of handlers)
        h.setNotify(notify);
    server.setRequestHandler(types_js_1.ListToolsRequestSchema, () => __awaiter(this, void 0, void 0, function* () {
        return ({
            tools: allTools.map(t => ({
                name: t.name,
                description: t.description,
                inputSchema: t.inputSchema,
                annotations: t.annotations
            }))
        });
    }));
    server.setRequestHandler(types_js_1.CallToolRequestSchema, (request) => __awaiter(this, void 0, void 0, function* () {
        const { name, arguments: args } = request.params;
        const handler = toolMap.get(name);
        if (!handler)
            throw new types_js_1.McpError(types_js_1.ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        try {
            return yield handler.validateAndHandle(name, args || {});
        }
        catch (error) {
            const info = (0, errors_js_1.parseAdtError)(error);
            const { headers, body } = info.httpStatus === 400 ? (0, logger_js_1.extractRawResponse)(error) : {};
            (0, logger_js_1.logToolError)({ tool: name, message: info.message, http_status: info.httpStatus, args, raw_headers: headers, raw_body: body });
            if (error instanceof types_js_1.McpError)
                throw error;
            throw new types_js_1.McpError(types_js_1.ErrorCode.InternalError, info.message);
        }
    }));
    const transport = new streamableHttp_js_1.StreamableHTTPServerTransport({
        sessionIdGenerator: () => (0, crypto_1.randomUUID)(),
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
function extractCredentials(req) {
    // Option 1: custom headers (preferred for Claude Desktop mcp config)
    const headerUser = req.headers['x-sap-user'];
    const headerPass = req.headers['x-sap-password'];
    if (headerUser && headerPass) {
        return {
            user: Array.isArray(headerUser) ? headerUser[0] : headerUser,
            password: Array.isArray(headerPass) ? headerPass[0] : headerPass
        };
    }
    // Option 2: standard HTTP Basic Auth  (Authorization: Basic base64(user:pass))
    const authHeader = req.headers['authorization'];
    if (authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith('Basic ')) {
        const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf-8');
        const colon = decoded.indexOf(':');
        if (colon > 0) {
            return {
                user: decoded.slice(0, colon),
                password: decoded.slice(colon + 1)
            };
        }
    }
    return null;
}
function handleRequest(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
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
        const sessionId = req.headers['mcp-session-id'];
        if (sessionId && sessions.has(sessionId)) {
            const entry = sessions.get(sessionId);
            entry.lastSeen = Date.now();
            yield entry.transport.handleRequest(req, res);
            return;
        }
        // ── New session: credentials required ────────────────────────────────────
        const creds = extractCredentials(req);
        if (!creds) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                error: 'SAP credentials required.',
                hint: 'Send x-sap-user and x-sap-password headers, or use HTTP Basic Auth.'
            }));
            return;
        }
        const { server, transport } = buildMcpServer(creds.user, creds.password);
        yield server.connect(transport);
        yield transport.handleRequest(req, res);
    });
}
// ── Start server ─────────────────────────────────────────────────────────────
const httpServer = http_1.default.createServer((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield handleRequest(req, res);
    }
    catch (err) {
        console.error('[http] unhandled error:', err.message || err);
        if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal server error' }));
        }
    }
}));
httpServer.listen(PORT, HOST, () => {
    console.log(`abap-data-mcp HTTP server listening on http://${HOST}:${PORT}/mcp`);
    console.log(`SAP system: ${SAP_URL} | client: ${SAP_CLIENT} | lang: ${SAP_LANGUAGE}`);
    console.log('Waiting for connections...');
});
