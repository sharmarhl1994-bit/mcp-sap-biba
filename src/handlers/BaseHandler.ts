import type { ToolDefinition } from '../types/tools';
import { ADTClient, session_types } from 'abap-adt-api';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { createLogger } from '../lib/logger';
import { parseAdtError } from '../lib/errors';

/** Send a progress/status message visible in the client UI. */
export type NotifyFn = (level: 'info' | 'warning' | 'error', message: string) => Promise<void>;

export abstract class BaseHandler {
  protected readonly adtclient: ADTClient;
  protected readonly logger = createLogger(this.constructor.name);
  private _notify?: NotifyFn;

  constructor(adtclient: ADTClient) {
    this.adtclient = adtclient;
  }

  /** Inject a progress notification function (sendLoggingMessage wrapper). */
  setNotify(fn: NotifyFn): void {
    this._notify = fn;
  }

  /**
   * Send a progress/status message visible in the client UI during long operations.
   * No-ops silently if logging capability is not available.
   */
  protected async notify(message: string, level: 'info' | 'warning' | 'error' = 'info'): Promise<void> {
    if (this._notify) {
      try { await this._notify(level, message); } catch (_) {}
    }
  }

  /**
   * Execute an ADT operation with automatic re-login on session timeout.
   * Every handler wraps client calls in this — it makes session errors invisible to users.
   */
  protected async withSession<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      const info = parseAdtError(error);
      if (info.isSessionTimeout) {
        this.logger.info('Session expired — clearing state and re-logging in');
        await this.notify('SAP session expired — reconnecting…');
        try {
          try { await this.adtclient.dropSession(); } catch (_) {}
          this.adtclient.stateful = session_types.stateful;
          await this.adtclient.login();
          return await fn();
        } catch (loginError: any) {
          await new Promise(r => setTimeout(r, 1500));
          try {
            await this.adtclient.login();
            return await fn();
          } catch (finalError: any) {
            throw new McpError(
              ErrorCode.InternalError,
              `Session expired and re-login failed: ${finalError.message || 'Unknown error'}`
            );
          }
        }
      }
      throw error;
    }
  }

  protected success(data: Record<string, any>) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ status: 'success', ...data }, null, 2)
      }]
    };
  }

  protected fail(message: string): never {
    throw new McpError(ErrorCode.InternalError, message);
  }

  /**
   * Validate required parameters from the tool schema, then dispatch to the handler.
   * Prevents "Cannot read properties of undefined" crashes by checking required
   * fields BEFORE any handler logic runs.
   */
  async validateAndHandle(toolName: string, args: any): Promise<any> {
    const tool = this.getTools().find(t => t.name === toolName);
    if (!tool) {
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${toolName}`);
    }

    // Normalize common LLM parameter-name mistakes before required-field validation
    if (args && !args.name && args.object_name) args.name = args.object_name;

    const required = (tool.inputSchema as any).required || [];
    const missing = required.filter((f: string) => {
      const val = args?.[f];
      return val === undefined || val === null || val === '';
    });

    if (missing.length > 0) {
      this.fail(`${toolName}: missing required parameter(s): ${missing.join(', ')}`);
    }

    return this.handle(toolName, args);
  }

  abstract getTools(): ToolDefinition[];
  abstract handle(toolName: string, args: any): Promise<any>;
}
