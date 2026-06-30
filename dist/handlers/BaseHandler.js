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
exports.BaseHandler = void 0;
const abap_adt_api_1 = require("abap-adt-api");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const logger_1 = require("../lib/logger");
const errors_1 = require("../lib/errors");
class BaseHandler {
    constructor(adtclient) {
        this.logger = (0, logger_1.createLogger)(this.constructor.name);
        this.adtclient = adtclient;
    }
    /** Inject a progress notification function (sendLoggingMessage wrapper). */
    setNotify(fn) {
        this._notify = fn;
    }
    /**
     * Send a progress/status message visible in the client UI during long operations.
     * No-ops silently if logging capability is not available.
     */
    notify(message_1) {
        return __awaiter(this, arguments, void 0, function* (message, level = 'info') {
            if (this._notify) {
                try {
                    yield this._notify(level, message);
                }
                catch (_) { }
            }
        });
    }
    /**
     * Execute an ADT operation with automatic re-login on session timeout.
     * Every handler wraps client calls in this — it makes session errors invisible to users.
     */
    withSession(fn) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield fn();
            }
            catch (error) {
                const info = (0, errors_1.parseAdtError)(error);
                if (info.isSessionTimeout) {
                    this.logger.info('Session expired — clearing state and re-logging in');
                    yield this.notify('SAP session expired — reconnecting…');
                    try {
                        try {
                            yield this.adtclient.dropSession();
                        }
                        catch (_) { }
                        this.adtclient.stateful = abap_adt_api_1.session_types.stateful;
                        yield this.adtclient.login();
                        return yield fn();
                    }
                    catch (loginError) {
                        yield new Promise(r => setTimeout(r, 1500));
                        try {
                            yield this.adtclient.login();
                            return yield fn();
                        }
                        catch (finalError) {
                            throw new types_js_1.McpError(types_js_1.ErrorCode.InternalError, `Session expired and re-login failed: ${finalError.message || 'Unknown error'}`);
                        }
                    }
                }
                throw error;
            }
        });
    }
    success(data) {
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify(Object.assign({ status: 'success' }, data), null, 2)
                }]
        };
    }
    fail(message) {
        throw new types_js_1.McpError(types_js_1.ErrorCode.InternalError, message);
    }
    /**
     * Validate required parameters from the tool schema, then dispatch to the handler.
     * Prevents "Cannot read properties of undefined" crashes by checking required
     * fields BEFORE any handler logic runs.
     */
    validateAndHandle(toolName, args) {
        return __awaiter(this, void 0, void 0, function* () {
            const tool = this.getTools().find(t => t.name === toolName);
            if (!tool) {
                throw new types_js_1.McpError(types_js_1.ErrorCode.MethodNotFound, `Unknown tool: ${toolName}`);
            }
            // Normalize common LLM parameter-name mistakes before required-field validation
            if (args && !args.name && args.object_name)
                args.name = args.object_name;
            const required = tool.inputSchema.required || [];
            const missing = required.filter((f) => {
                const val = args === null || args === void 0 ? void 0 : args[f];
                return val === undefined || val === null || val === '';
            });
            if (missing.length > 0) {
                this.fail(`${toolName}: missing required parameter(s): ${missing.join(', ')}`);
            }
            return this.handle(toolName, args);
        });
    }
}
exports.BaseHandler = BaseHandler;
