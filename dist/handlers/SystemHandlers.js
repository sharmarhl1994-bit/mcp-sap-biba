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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemHandlers = void 0;
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const BaseHandler_js_1 = require("./BaseHandler.js");
const abap_adt_api_1 = require("abap-adt-api");
const errors_js_1 = require("../lib/errors.js");
class SystemHandlers extends BaseHandler_js_1.BaseHandler {
    getTools() {
        return [
            {
                name: 'login',
                annotations: { idempotentHint: true },
                description: 'Establish a stateful session with the SAP system. ' +
                    'abap_table and abap_query call this automatically via withSession() — you only need ' +
                    'to call login() explicitly to verify credentials or force a fresh session.',
                inputSchema: { type: 'object', properties: {} }
            },
            {
                name: 'healthcheck',
                annotations: { readOnlyHint: true },
                description: 'Verify connectivity to the SAP system. Returns system ID and login status.',
                inputSchema: { type: 'object', properties: {} }
            }
        ];
    }
    handle(toolName, args) {
        return __awaiter(this, void 0, void 0, function* () {
            switch (toolName) {
                case 'login': return this.handleLogin();
                case 'healthcheck': return this.handleHealthcheck();
                default: throw new types_js_1.McpError(types_js_1.ErrorCode.MethodNotFound, `Unknown tool: ${toolName}`);
            }
        });
    }
    handleLogin() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.adtclient.stateful = abap_adt_api_1.session_types.stateful;
                const result = yield this.adtclient.login();
                return this.success({ loggedIn: true, result });
            }
            catch (error) {
                this.fail((0, errors_js_1.formatError)('login', error));
            }
        });
    }
    handleHealthcheck() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.adtclient.stateful = abap_adt_api_1.session_types.stateful;
                yield this.adtclient.login();
                return this.success({ healthy: true, timestamp: new Date().toISOString() });
            }
            catch (error) {
                return this.success({ healthy: false, error: error.message, timestamp: new Date().toISOString() });
            }
        });
    }
}
exports.SystemHandlers = SystemHandlers;
