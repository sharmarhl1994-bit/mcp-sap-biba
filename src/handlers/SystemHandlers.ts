import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { BaseHandler } from './BaseHandler.js';
import { session_types } from 'abap-adt-api';
import type { ToolDefinition } from '../types/tools.js';
import { formatError } from '../lib/errors.js';

export class SystemHandlers extends BaseHandler {
  getTools(): ToolDefinition[] {
    return [
      {
        name: 'login',
        annotations: { idempotentHint: true },
        description:
          'Establish a stateful session with the SAP system. ' +
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

  async handle(toolName: string, args: any): Promise<any> {
    switch (toolName) {
      case 'login':       return this.handleLogin();
      case 'healthcheck': return this.handleHealthcheck();
      default: throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${toolName}`);
    }
  }

  private async handleLogin(): Promise<any> {
    try {
      this.adtclient.stateful = session_types.stateful;
      const result = await this.adtclient.login();
      return this.success({ loggedIn: true, result });
    } catch (error: any) {
      this.fail(formatError('login', error));
    }
  }

  private async handleHealthcheck(): Promise<any> {
    try {
      this.adtclient.stateful = session_types.stateful;
      await this.adtclient.login();
      return this.success({ healthy: true, timestamp: new Date().toISOString() });
    } catch (error: any) {
      return this.success({ healthy: false, error: error.message, timestamp: new Date().toISOString() });
    }
  }
}
