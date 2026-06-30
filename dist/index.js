#!/usr/bin/env node
"use strict";
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
const dotenv_1 = require("dotenv");
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const abap_adt_api_1 = require("abap-adt-api");
const path_1 = __importDefault(require("path"));
const DataHandlers_js_1 = require("./handlers/DataHandlers.js");
const SystemHandlers_js_1 = require("./handlers/SystemHandlers.js");
const auth_js_1 = require("./lib/auth.js");
const logger_js_1 = require("./lib/logger.js");
const errors_js_1 = require("./lib/errors.js");
(0, dotenv_1.config)({ path: path_1.default.resolve(__dirname, '../.env') });
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const auth = (0, auth_js_1.resolveAuthConfig)();
        const client = new abap_adt_api_1.ADTClient(auth.url, auth.user, auth.password, auth.client, auth.language);
        client.stateful = abap_adt_api_1.session_types.stateful;
        const handlers = [
            new DataHandlers_js_1.DataHandlers(client),
            new SystemHandlers_js_1.SystemHandlers(client),
        ];
        const notifyFn = (_level, _message) => __awaiter(this, void 0, void 0, function* () {
            // No-op by default; wired to server.sendLoggingMessage below once the server exists.
        });
        for (const h of handlers)
            h.setNotify(notifyFn);
        // Build a flat tool-name -> handler map
        const toolMap = new Map();
        const allTools = [];
        for (const h of handlers) {
            for (const tool of h.getTools()) {
                toolMap.set(tool.name, h);
                allTools.push(tool);
            }
        }
        const server = new index_js_1.Server({
            name: 'abap-data-mcp',
            version: '1.0.0'
        }, {
            capabilities: {
                tools: {},
                logging: {}
            }
        });
        // Rewire notify to actually use the server's logging capability now that it exists
        const realNotify = (level, message) => __awaiter(this, void 0, void 0, function* () {
            try {
                yield server.sendLoggingMessage({ level, data: message });
            }
            catch (_) { }
        });
        for (const h of handlers)
            h.setNotify(realNotify);
        server.setRequestHandler(types_js_1.ListToolsRequestSchema, () => __awaiter(this, void 0, void 0, function* () {
            return {
                tools: allTools.map(t => ({
                    name: t.name,
                    description: t.description,
                    inputSchema: t.inputSchema,
                    annotations: t.annotations
                }))
            };
        }));
        server.setRequestHandler(types_js_1.CallToolRequestSchema, (request) => __awaiter(this, void 0, void 0, function* () {
            const { name, arguments: args } = request.params;
            const handler = toolMap.get(name);
            if (!handler) {
                throw new types_js_1.McpError(types_js_1.ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
            }
            try {
                return yield handler.validateAndHandle(name, args || {});
            }
            catch (error) {
                const info = (0, errors_js_1.parseAdtError)(error);
                const { headers, body } = info.httpStatus === 400 ? (0, logger_js_1.extractRawResponse)(error) : {};
                (0, logger_js_1.logToolError)({
                    tool: name,
                    message: info.message,
                    http_status: info.httpStatus,
                    args,
                    raw_headers: headers,
                    raw_body: body
                });
                if (error instanceof types_js_1.McpError)
                    throw error;
                throw new types_js_1.McpError(types_js_1.ErrorCode.InternalError, info.message);
            }
        }));
        const transport = new stdio_js_1.StdioServerTransport();
        yield server.connect(transport);
        console.error('abap-data-mcp running on stdio (tools: abap_table, abap_query, login, healthcheck)');
    });
}
main().catch((err) => {
    console.error('Fatal error starting abap-data-mcp:', err);
    process.exit(1);
});
