"use strict";
/**
 * Auth resolution for abap-data-mcp.
 * Single-system, basic-auth only (a deliberate simplification of dassian-adt's
 * multi-system / OAuth auth.ts — this server only needs SAP_USER + SAP_PASSWORD).
 *
 *   SAP_URL      — e.g. https://your-sap-server:44300
 *   SAP_USER     — SAP user name
 *   SAP_PASSWORD — SAP password
 *   SAP_CLIENT   — SAP client (default: 100)
 *   SAP_LANGUAGE — logon language (default: EN)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveAuthConfig = resolveAuthConfig;
function resolveAuthConfig() {
    const url = process.env.SAP_URL;
    const user = process.env.SAP_USER;
    const password = process.env.SAP_PASSWORD;
    const client = process.env.SAP_CLIENT || '100';
    const language = process.env.SAP_LANGUAGE || 'EN';
    const missing = [];
    if (!url)
        missing.push('SAP_URL');
    if (!user)
        missing.push('SAP_USER');
    if (!password)
        missing.push('SAP_PASSWORD');
    if (missing.length > 0) {
        throw new Error(`Missing required environment variable(s): ${missing.join(', ')}. ` +
            `Copy .env.example to .env and fill in your SAP connection details.`);
    }
    return { url: url, user: user, password: password, client, language };
}
