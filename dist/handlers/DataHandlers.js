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
exports.DataHandlers = void 0;
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const BaseHandler_js_1 = require("./BaseHandler.js");
const errors_js_1 = require("../lib/errors.js");
const tablecontents_js_1 = require("abap-adt-api/build/api/tablecontents.js");
class DataHandlers extends BaseHandler_js_1.BaseHandler {
    getTools() {
        return [
            {
                name: 'abap_query',
                annotations: { readOnlyHint: true },
                description: 'Execute a SQL query against the SAP database via ADT. ' +
                    'Use OpenSQL syntax (FROM clause, WHERE, ORDER BY). ' +
                    'For complex data investigations, prefer abap_run which gives full ABAP logic. ' +
                    'NOTE: "Invalid query string. Only SELECT statement is allowed." errors come from the SAP ADT ' +
                    'endpoint itself — not from client-side validation. This can occur for tables with special ' +
                    'characters in names (e.g. /UI5/FILE), cluster tables, or views not accessible via the ' +
                    'datapreview endpoint. In these cases, use abap_run with a SELECT INTO TABLE statement instead.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        sql: { type: 'string', description: 'The SQL query string (parameter name is "sql", not "query"). OpenSQL syntax, e.g. SELECT * FROM VBRP WHERE VBELN = \'0090001234\' UP TO 10 ROWS' },
                        limit: { type: 'number', description: 'Max rows to return (default 100)' }
                    },
                    required: ['sql']
                }
            },
            {
                name: 'abap_table',
                annotations: { readOnlyHint: true },
                description: 'Read contents of an ABAP table or CDS view. ' +
                    'Supports an optional WHERE clause including LIKE, BETWEEN, and comparisons. ' +
                    'For multi-table joins or subqueries, use abap_query instead.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        name: { type: 'string', description: 'Table or CDS view name, e.g. VBRP or /DSN/C_CPR_SQL_VIEW' },
                        where: { type: 'string', description: 'Optional WHERE clause (OpenSQL), e.g. VBELN = \'0090001234\' or STATUS LIKE \'A%\'' },
                        limit: { type: 'number', description: 'Max rows to return (default 100)' }
                    },
                    required: ['name']
                }
            }
        ];
    }
    handle(toolName, args) {
        return __awaiter(this, void 0, void 0, function* () {
            switch (toolName) {
                case 'abap_query': return this.handleQuery(args);
                case 'abap_table': return this.handleTable(args);
                default: throw new types_js_1.McpError(types_js_1.ErrorCode.MethodNotFound, `Unknown tool: ${toolName}`);
            }
        });
    }
    handleQuery(args) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // The library's runQuery() omits Content-Type, causing a 400 on all systems.
                // Also strip UP TO N ROWS from the SQL — the endpoint uses ?rowNumber instead.
                let sql = args.sql || args.query || '';
                let rowNumber = args.limit || 100;
                const upToMatch = sql.match(/\bUP\s+TO\s+(\d+)\s+ROWS\b/i);
                if (upToMatch) {
                    rowNumber = parseInt(upToMatch[1], 10) || rowNumber;
                    sql = sql.replace(/\s*\bUP\s+TO\s+\d+\s+ROWS\b/i, '').trim();
                }
                const h = this.adtclient.h;
                const result = yield this.withSession(() => __awaiter(this, void 0, void 0, function* () {
                    const response = yield h.request(`/sap/bc/adt/datapreview/freestyle`, {
                        qs: { rowNumber },
                        headers: { Accept: 'application/*', 'Content-Type': 'text/plain' },
                        method: 'POST',
                        body: sql
                    });
                    // Use parseQueryResponse only (not decodeQueryResult) — decodeQueryResult calls
                    // decodeSapDate which crashes on undefined when a DATE column has a null value.
                    // Raw YYYYMMDD strings are fine for the LLM.
                    return (0, tablecontents_js_1.parseQueryResponse)(response.body);
                }));
                return this.success({ result });
            }
            catch (error) {
                const fromMatch = String(args.sql || args.query || '').match(/\bFROM\s+([^\s,()]+)/i);
                const hint = yield this.unknownColumnHint(fromMatch === null || fromMatch === void 0 ? void 0 : fromMatch[1], error);
                this.fail((0, errors_js_1.formatError)('abap_query', error) + hint);
            }
        });
    }
    /**
     * When a query fails with "Unknown column name", fetch the table/view's actual field list
     * and append it to the error — turning a dead-end error into a self-correcting one
     * (the caller sees the real columns and retries instead of escalating to abap_run).
     * Returns '' if the error isn't an unknown-column error, the table name is unknown, or
     * field discovery fails. Best-effort: never throws.
     */
    unknownColumnHint(tableName, error) {
        return __awaiter(this, void 0, void 0, function* () {
            const msg = String((error === null || error === void 0 ? void 0 : error.message) || '').toLowerCase();
            if (!tableName || !msg.includes('unknown column name'))
                return '';
            try {
                const h = this.adtclient.h;
                const cols = yield this.withSession(() => __awaiter(this, void 0, void 0, function* () {
                    const response = yield h.request(`/sap/bc/adt/datapreview/freestyle`, {
                        qs: { rowNumber: 1 },
                        headers: { Accept: 'application/*', 'Content-Type': 'text/plain' },
                        method: 'POST',
                        body: `SELECT * FROM ${tableName}`
                    });
                    const parsed = (0, tablecontents_js_1.parseQueryResponse)(response.body);
                    return ((parsed === null || parsed === void 0 ? void 0 : parsed.columns) || []).map((c) => c.name).filter(Boolean);
                }));
                if (cols.length) {
                    return ` Available columns on ${tableName.toUpperCase()}: ${cols.join(', ')}.`;
                }
            }
            catch (_) {
                // Discovery failed (e.g. structure, cluster table, or the name itself is wrong) — no hint.
            }
            return '';
        });
    }
    handleTable(args) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const limit = args.limit || 100;
                const where = args.where || '';
                // tableContents rejects LIKE/BETWEEN in WHERE — route through datapreview/freestyle instead
                const needsFreestyle = /\bLIKE\b|\bBETWEEN\b/i.test(where);
                if (needsFreestyle || where) {
                    const sql = where
                        ? `SELECT * FROM ${args.name} WHERE ${where}`
                        : `SELECT * FROM ${args.name}`;
                    const h = this.adtclient.h;
                    const result = yield this.withSession(() => __awaiter(this, void 0, void 0, function* () {
                        const response = yield h.request(`/sap/bc/adt/datapreview/freestyle`, {
                            qs: { rowNumber: limit },
                            headers: { Accept: 'application/*', 'Content-Type': 'text/plain' },
                            method: 'POST',
                            body: sql
                        });
                        return (0, tablecontents_js_1.parseQueryResponse)(response.body);
                    }));
                    return this.success({ result });
                }
                const result = yield this.withSession(() => this.adtclient.tableContents(args.name, limit, false, undefined));
                return this.success({ result });
            }
            catch (error) {
                const hint = yield this.unknownColumnHint(args.name, error);
                this.fail((0, errors_js_1.formatError)(`abap_table(${args.name})`, error) + hint);
            }
        });
    }
}
exports.DataHandlers = DataHandlers;
