import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { BaseHandler } from './BaseHandler.js';
import type { ToolDefinition } from '../types/tools.js';
import { formatError } from '../lib/errors.js';
import { parseQueryResponse } from 'abap-adt-api/build/api/tablecontents.js';

export class DataHandlers extends BaseHandler {
  getTools(): ToolDefinition[] {
    return [
      {
        name: 'abap_query',
        annotations: { readOnlyHint: true },
        description:
          'Execute a SQL query against the SAP database via ADT. ' +
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
        description:
          'Read contents of an ABAP table or CDS view. ' +
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
      },
      {
        name: 'get_stock_ledger',
        annotations: { readOnlyHint: true },
        description:
          'Fetch a complete financial-year stock ledger for one material+plant in a single call. ' +
          'Runs MAP/MRP, Opening/Closing stock (MARDH+MBEWH), all MATDOC movements, FG (PRDO), RTS, ' +
          'and Taxable Value queries in PARALLEL and returns one combined result. ' +
          'Use this INSTEAD OF calling abap_query multiple times for a stock ledger report.',
        inputSchema: {
          type: 'object',
          properties: {
            matnr: { type: 'string', description: 'Material number, e.g. PFS10693' },
            plant: { type: 'string', description: 'Plant code, e.g. 1100' },
            fyStartYear: { type: 'number', description: 'Calendar year in which April falls, e.g. 2025 for FY2025-26' },
            validate: { type: 'boolean', description: 'Run MB5B balance identity check (Closing = Opening + Receipts − Issues). Adds one extra query. Default: false — only set true if numbers look suspicious or user explicitly asks to validate.' }
          },
          required: ['matnr', 'plant', 'fyStartYear']
        }
      }
    ];
  }

  async handle(toolName: string, args: any): Promise<any> {
    switch (toolName) {
      case 'abap_query': return this.handleQuery(args);
      case 'abap_table': return this.handleTable(args);
      case 'get_stock_ledger': return this.handleStockLedger(args);
      default: throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${toolName}`);
    }
  }

  private async handleQuery(args: any): Promise<any> {
    try {
      // The library's runQuery() omits Content-Type, causing a 400 on all systems.
      // Also strip UP TO N ROWS from the SQL — the endpoint uses ?rowNumber instead.
      let sql: string = args.sql || args.query || '';
      let rowNumber: number = args.limit || 100;
      const upToMatch = sql.match(/\bUP\s+TO\s+(\d+)\s+ROWS\b/i);
      if (upToMatch) {
        rowNumber = parseInt(upToMatch[1], 10) || rowNumber;
        sql = sql.replace(/\s*\bUP\s+TO\s+\d+\s+ROWS\b/i, '').trim();
      }

      const h = (this.adtclient as any).h;
      const result = await this.withSession(async () => {
        const response = await h.request(
          `/sap/bc/adt/datapreview/freestyle`,
          {
            qs: { rowNumber },
            headers: { Accept: 'application/*', 'Content-Type': 'text/plain' },
            method: 'POST',
            body: sql
          }
        );
        // Use parseQueryResponse only (not decodeQueryResult) — decodeQueryResult calls
        // decodeSapDate which crashes on undefined when a DATE column has a null value.
        // Raw YYYYMMDD strings are fine for the LLM.
        return parseQueryResponse(response.body);
      });
      return this.success({ result });
    } catch (error: any) {
      const fromMatch = String(args.sql || args.query || '').match(/\bFROM\s+([^\s,()]+)/i);
      const hint = await this.unknownColumnHint(fromMatch?.[1], error);
      this.fail(formatError('abap_query', error) + hint);
    }
  }

  /**
   * When a query fails with "Unknown column name", fetch the table/view's actual field list
   * and append it to the error — turning a dead-end error into a self-correcting one
   * (the caller sees the real columns and retries instead of escalating to abap_run).
   * Returns '' if the error isn't an unknown-column error, the table name is unknown, or
   * field discovery fails. Best-effort: never throws.
   */
  private async unknownColumnHint(tableName: string | undefined, error: any): Promise<string> {
    const msg = String(error?.message || '').toLowerCase();
    if (!tableName || !msg.includes('unknown column name')) return '';
    try {
      const h = (this.adtclient as any).h;
      const cols: string[] = await this.withSession(async () => {
        const response = await h.request(`/sap/bc/adt/datapreview/freestyle`, {
          qs: { rowNumber: 1 },
          headers: { Accept: 'application/*', 'Content-Type': 'text/plain' },
          method: 'POST',
          body: `SELECT * FROM ${tableName}`
        });
        const parsed: any = parseQueryResponse(response.body);
        return (parsed?.columns || []).map((c: any) => c.name).filter(Boolean);
      });
      if (cols.length) {
        return ` Available columns on ${tableName.toUpperCase()}: ${cols.join(', ')}.`;
      }
    } catch (_) {
      // Discovery failed (e.g. structure, cluster table, or the name itself is wrong) — no hint.
    }
    return '';
  }

  private async handleTable(args: any): Promise<any> {
    try {
      const limit = args.limit || 100;
      const where = args.where || '';
      // tableContents rejects LIKE/BETWEEN in WHERE — route through datapreview/freestyle instead
      const needsFreestyle = /\bLIKE\b|\bBETWEEN\b/i.test(where);
      if (needsFreestyle || where) {
        const sql = where
          ? `SELECT * FROM ${args.name} WHERE ${where}`
          : `SELECT * FROM ${args.name}`;
        const h = (this.adtclient as any).h;
        const result = await this.withSession(async () => {
          const response = await h.request(
            `/sap/bc/adt/datapreview/freestyle`,
            {
              qs: { rowNumber: limit },
              headers: { Accept: 'application/*', 'Content-Type': 'text/plain' },
              method: 'POST',
              body: sql
            }
          );
          return parseQueryResponse(response.body);
        });
        return this.success({ result });
      }
      const result = await this.withSession(() =>
        this.adtclient.tableContents(args.name, limit, false, undefined)
      );
      return this.success({ result });
    } catch (error: any) {
      const hint = await this.unknownColumnHint(args.name, error);
      this.fail(formatError(`abap_table(${args.name})`, error) + hint);
    }
  }
  /**
     * Runs a raw SQL string through the ADT freestyle endpoint and parses the result.
     * Shared by handleQuery() and handleStockLedger().
     */
  private async runRawSql(sql: string, rowNumber: number = 500): Promise<any> {
    const h = (this.adtclient as any).h;
    return this.withSession(async () => {
      const response = await h.request(
        `/sap/bc/adt/datapreview/freestyle`,
        {
          qs: { rowNumber },
          headers: { Accept: 'application/*', 'Content-Type': 'text/plain' },
          method: 'POST',
          body: sql
        }
      );
      return parseQueryResponse(response.body);
    });
  }

  /**
   * India FY: LFMON 01=April ... 12=March. LFGJA = year in which April falls.
   */
  private getFYPeriods(fyStartYear: number) {
    return {
      openingLfgja: String(fyStartYear - 1), openingLfmon: '12', // March of prior FY
      closingLfgja: String(fyStartYear), closingLfmon: '12',     // March of current FY
      budatFrom: `${fyStartYear}0401`,
      budatTo: `${fyStartYear + 1}0331`,
    };
  }

  /**
   * MARDH with fallback scan. Fast path: try LFMON=12 first (works 95%+ of the time).
   * Slow path only triggers when LFMON=12 genuinely has no record — so normal
   * requests never pay the extra latency.
   */
  private async getMardhWithFallback(matnrPadded: string, plant: string, lfgja: string): Promise<any> {
    let result = await this.runRawSql(
      `SELECT WERKS, LGORT, LABST FROM MARDH WHERE MATNR = '${matnrPadded}' AND WERKS = '${plant}' AND LFGJA = '${lfgja}' AND LFMON = '12'`
    );
    if (result?.values?.length) return result;

    for (let lfmon = 11; lfmon >= 1; lfmon--) {
      const lfmonPadded = String(lfmon).padStart(2, '0');
      result = await this.runRawSql(
        `SELECT WERKS, LGORT, LABST FROM MARDH WHERE MATNR = '${matnrPadded}' AND WERKS = '${plant}' AND LFGJA = '${lfgja}' AND LFMON = '${lfmonPadded}'`
      );
      if (result?.values?.length) return result;
    }
    return { values: [] }; // truly no record anywhere in the FY — Qty = 0
  }

  /**
   * Composite tool: fires every stock-ledger sub-query IN PARALLEL (Promise.all)
   * instead of Claude calling abap_query 8-10+ times sequentially.
   */
  private async handleStockLedger(args: any): Promise<any> {
    try {
      const { matnr, plant } = args;
      const fyStartYear: number = args.fyStartYear;
      const validate: boolean = !!args.validate;
      const p = this.getFYPeriods(fyStartYear);
      const matnrPadded = String(matnr).padStart(18, '0');

      const sql = {
        map: `SELECT Material, Plant, MovingAveragePrice FROM I_ProductValuation WHERE Material = '${matnrPadded}' AND Plant = '${plant}'`,
        openingMbewh: `SELECT BWKEY, LBKUM, SALK3 FROM MBEWH WHERE MATNR = '${matnrPadded}' AND BWKEY = '${plant}' AND LFGJA = '${p.openingLfgja}' AND LFMON = '${p.openingLfmon}'`,
        closingMbewh: `SELECT BWKEY, LBKUM, SALK3 FROM MBEWH WHERE MATNR = '${matnrPadded}' AND BWKEY = '${plant}' AND LFGJA = '${p.closingLfgja}' AND LFMON = '${p.closingLfmon}'`,
        matdoc: `SELECT BWART, SHKZG, KZBWS, MENGE, DMBTR FROM MATDOC WHERE MATNR = '${matnrPadded}' AND WERKS = '${plant}' AND BUDAT BETWEEN '${p.budatFrom}' AND '${p.budatTo}' AND BWART IN ('541','251','601','252','602','701','702','561','562','309')`,
        afpo: `SELECT PWERK, MATNR, PSMNG, WEWRT FROM AFPO WHERE PWERK = '${plant}' AND MATNR = '${matnrPadded}' AND DGLTP BETWEEN '${p.budatFrom}' AND '${p.budatTo}'`,
        taxable: `SELECT SUM( VBRP~KZWI3 ) AS TAXABLE_VALUE FROM VBRP INNER JOIN VBRK ON VBRP~VBELN = VBRK~VBELN WHERE VBRP~MATNR = '${matnrPadded}' AND VBRP~WERKS = '${plant}' AND VBRK~ERDAT BETWEEN '${p.budatFrom}' AND '${p.budatTo}'`,
        rts: `SELECT EKPO~EBELN, EKPO~MENGE, EKPO~NETWR FROM EKPO INNER JOIN EKKO ON EKPO~EBELN = EKKO~EBELN WHERE EKPO~MATNR = '${matnrPadded}' AND EKPO~WERKS = '${plant}' AND EKKO~BSART IN ('ZCAP','ZCON','ZDFG','ZMRP','ZPKG','ZPRO','ZRAW','ZRET','ZSER','ZSUB') AND EKKO~AEDAT BETWEEN '${p.budatFrom}' AND '${p.budatTo}'`,
        identity: `SELECT SUM(CASE WHEN SHKZG='S' THEN MENGE ELSE 0 END) AS RECEIPTS, SUM(CASE WHEN SHKZG='H' THEN MENGE ELSE 0 END) AS ISSUES FROM MATDOC WHERE MATNR = '${matnrPadded}' AND WERKS = '${plant}' AND BUDAT BETWEEN '${p.budatFrom}' AND '${p.budatTo}'`,
      };

      // MRP needs 2 chained calls (A938 -> KONP) but still runs alongside everything else.
      const mrpFetch = (async () => {
        const a938 = await this.runRawSql(
          `SELECT KNUMH FROM A938 WHERE KSCHL = 'ZMRP' AND KAPPL = 'V' AND MATNR = '${matnrPadded}' ORDER BY DATAB DESCENDING UP TO 1 ROWS`
        );
        const knumh = a938?.values?.[0]?.KNUMH;
        if (!knumh) return null;
        return this.runRawSql(`SELECT KBETR FROM KONP WHERE KNUMH = '${knumh}'`);
      })();

      // Everything independent fires at once. Validation identity only runs if asked for.
      const [
        map, openingMardh, openingMbewh, closingMardh, closingMbewh,
        matdoc, afpo, taxable, rts, mrp, identity,
      ] = await Promise.all([
        this.runRawSql(sql.map),
        this.getMardhWithFallback(matnrPadded, plant, p.openingLfgja),
        this.runRawSql(sql.openingMbewh),
        this.getMardhWithFallback(matnrPadded, plant, p.closingLfgja),
        this.runRawSql(sql.closingMbewh),
        this.runRawSql(sql.matdoc, 2000),
        this.runRawSql(sql.afpo),
        this.runRawSql(sql.taxable),
        this.runRawSql(sql.rts),
        mrpFetch,
        validate ? this.runRawSql(sql.identity) : Promise.resolve(null),
      ]);

      const result = this.assembleLedger({
        map, openingMardh, openingMbewh, closingMardh, closingMbewh,
        matdoc, afpo, taxable, rts, mrp, identity, validate,
      });
      return this.success({ result });
    } catch (error: any) {
      this.fail(formatError('get_stock_ledger', error));
    }
  }

  /** Sums LABST across all LGORT rows returned by a MARDH query. */
  private sumLabst(parsed: any): number {
    return (parsed?.values || []).reduce((sum: number, r: any) => sum + (Number(r.LABST) || 0), 0);
  }

  /** Buckets raw MATDOC rows into named report columns — plain deterministic code, no LLM. */
  private bucketMatdoc(parsed: any) {
    const b = {
      rtvQty: 0, saleQty: 0, saleMrpValue: 0, saleReverseQty: 0,
      qty701Up: 0, qty702Down: 0, net561_562Qty: 0, net561_562Value: 0, qty309: 0,
    };
    for (const r of parsed?.values || []) {
      const qty = Number(r.MENGE) || 0;
      const val = Number(r.DMBTR) || 0;
      if (r.BWART === '541' && r.KZBWS === 'O') b.rtvQty += qty;
      else if ((r.BWART === '251' || r.BWART === '601') && r.SHKZG === 'H') { b.saleQty += qty; b.saleMrpValue += val; }
      else if (r.BWART === '252' || r.BWART === '602') b.saleReverseQty += qty;
      else if (r.BWART === '701' && r.SHKZG === 'S') b.qty701Up += qty;
      else if (r.BWART === '702' && r.SHKZG === 'H') b.qty702Down += qty;
      else if (r.BWART === '561') { b.net561_562Qty += qty; b.net561_562Value += val; }
      else if (r.BWART === '562') { b.net561_562Qty -= qty; b.net561_562Value -= val; }
      else if (r.BWART === '309') b.qty309 += qty;
    }
    return b;
  }

  /** Combines all parallel results + does the small post-fetch derivations. */
  private assembleLedger(raw: any) {
    const map = Number(raw.map?.values?.[0]?.MovingAveragePrice) || 0;
    const mrp = Number(raw.mrp?.values?.[0]?.KBETR) || 0;

    const openingQty = this.sumLabst(raw.openingMardh);
    const closingQty = this.sumLabst(raw.closingMardh);
    const openingValue = Number(raw.openingMbewh?.values?.[0]?.SALK3) || openingQty * map;
    const closingValue = Number(raw.closingMbewh?.values?.[0]?.SALK3) || closingQty * map;

    const buckets = this.bucketMatdoc(raw.matdoc);
    const rtvValue = buckets.rtvQty * map;
    const saleReverseValue = buckets.saleReverseQty * mrp;

    const fgPrdoRows = raw.afpo?.values || [];
    const fgPrdoQty = fgPrdoRows.reduce((s: number, r: any) => s + (Number(r.PSMNG) || 0), 0);
    const fgPrdoValue = fgPrdoRows.reduce((s: number, r: any) => s + (Number(r.WEWRT) || 0), 0);

    const rtsRows = raw.rts?.values || [];
    const rtsQty = rtsRows.reduce((s: number, r: any) => s + (Number(r.MENGE) || 0), 0);
    const rtsValue = rtsRows.reduce((s: number, r: any) => s + (Number(r.NETWR) || 0), 0);

    const taxableValue = Number(raw.taxable?.values?.[0]?.TAXABLE_VALUE) || 0;

    const result: any = {
      map, mrp,
      openingQty, openingValue,
      closingQty, closingValue,
      ...buckets, rtvValue, saleReverseValue,
      fgPrdoQty, fgPrdoValue,
      rtsQty, rtsValue,
      taxableValue,
    };

    if (raw.validate && raw.identity) {
      const receipts = Number(raw.identity?.values?.[0]?.RECEIPTS) || 0;
      const issues = Number(raw.identity?.values?.[0]?.ISSUES) || 0;
      const expectedClosing = openingQty + receipts - issues;
      result.balanceCheck = {
        expectedClosingQty: expectedClosing,
        actualClosingQty: closingQty,
        matches: Math.abs(expectedClosing - closingQty) < 0.001,
      };
    }

    return result;
  }

}
