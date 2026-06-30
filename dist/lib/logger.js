"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logToolError = logToolError;
exports.extractRawResponse = extractRawResponse;
exports.createLogger = createLogger;
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const ERROR_LOG_FILE = process.env.ADT_ERROR_LOG
    || path.join(os.homedir(), '.abap-data-mcp', 'errors.jsonl');
function compactArgs(args) {
    const out = {};
    for (const [k, v] of Object.entries(args)) {
        if (typeof v === 'string' && v.length > 120)
            out[k] = v.slice(0, 120) + `…(+${v.length - 120})`;
        else
            out[k] = v;
    }
    return out;
}
function logToolError(entry) {
    const { args } = entry, rest = __rest(entry, ["args"]);
    const record = Object.assign(Object.assign({ ts: new Date().toISOString() }, rest), (args ? { args: compactArgs(args) } : {}));
    try {
        fs.mkdirSync(path.dirname(ERROR_LOG_FILE), { recursive: true });
        fs.appendFileSync(ERROR_LOG_FILE, JSON.stringify(record) + '\n');
    }
    catch (_) { }
}
function extractRawResponse(error) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const headers = (_c = (_b = (_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.headers) !== null && _b !== void 0 ? _b : error === null || error === void 0 ? void 0 : error.headers) !== null && _c !== void 0 ? _c : undefined;
    let bodyRaw = (_h = (_g = (_e = (_d = error === null || error === void 0 ? void 0 : error.response) === null || _d === void 0 ? void 0 : _d.data) !== null && _e !== void 0 ? _e : (_f = error === null || error === void 0 ? void 0 : error.response) === null || _f === void 0 ? void 0 : _f.body) !== null && _g !== void 0 ? _g : error === null || error === void 0 ? void 0 : error.body) !== null && _h !== void 0 ? _h : undefined;
    let body;
    if (typeof bodyRaw === 'string')
        body = bodyRaw;
    else if (bodyRaw != null) {
        try {
            body = JSON.stringify(bodyRaw);
        }
        catch (_j) {
            body = String(bodyRaw);
        }
    }
    return {
        headers: headers ? Object.assign({}, headers) : undefined,
        body: body ? body.slice(0, 500) : undefined
    };
}
function createLogger(name) {
    return {
        error: (message, meta) => log('error', name, message, meta),
        warn: (message, meta) => log('warn', name, message, meta),
        info: (message, meta) => log('info', name, message, meta),
        debug: (message, meta) => log('debug', name, message, meta)
    };
}
function log(level, name, message, meta) {
    const timestamp = new Date().toISOString();
    const logEntry = Object.assign({ timestamp,
        level, service: name, message }, meta);
    const logString = JSON.stringify(logEntry, null, 2);
    switch (level) {
        case 'error':
            console.error(logString);
            break;
        case 'warn':
            console.warn(logString);
            break;
        case 'info':
            console.info(logString);
            break;
        case 'debug':
            console.debug(logString);
            break;
    }
}
