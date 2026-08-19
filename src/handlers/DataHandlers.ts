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
          'Fetch a complete financial-year stock ledger for ONE material+plant in a single call. ' +
          'Runs MAP (MBEW.VERPR), MRP (A938+KONP), Opening/Closing stock (MARDH+MBEWH), all MSEG movements ' +
          '(STO Outward 641, STO Inward 101, Sales 251/601/633, Sale Reverse, 701/702, 561/562, 309/310), ' +
          'FG PRDO (AFKO+AFPO), RTS (EKPO+EKKO), and Taxable Value (VBRP+VBRK) in PARALLEL. ' +
          'Use get_stock_ledger_batch for multi-material reports — do NOT call this in a loop.',
        inputSchema: {
          type: 'object',
          properties: {
            matnr: { type: 'string', description: 'Material number, e.g. PFS10693' },
            plant: { type: 'string', description: 'Plant code, e.g. 1100' },
            fyStartYear: { type: 'number', description: 'Calendar year in which April falls, e.g. 2025 for FY2025-26' },
            validate: { type: 'boolean', description: 'Run MB5B balance identity check. Default: false.' }
          },
          required: ['matnr', 'plant', 'fyStartYear']
        }
      },
      {
        name: 'get_stock_ledger_batch',
        annotations: { readOnlyHint: true },
        description:
          'Fetch stock ledger data for UP TO 500 materials in one call using batched IN+GROUP BY queries. ' +
          'ALL movement columns returned per material: MAP, MRP, Opening/Closing stock qty+value, ' +
          'STO Outward (641), STO Inward (101), Sales (251/601/633), Sale Reverse (252/602/631/632/634/653), ' +
          'FG PRDO (AFKO+AFPO WEMNG/WEWRT), RTS (EKPO+EKKO), Taxable Value (VBRP+VBRK KZWI3), ' +
          '701 up, 702 down, 561/562 net, 309/310. ' +
          'Use this for ALL multi-material stock ledger reports. ' +
          'Workflow: (1) get material list from ZSTL_MASTER_DATA, (2) split into batches ≤500, ' +
          '(3) call this tool once per batch, (4) merge rows by matnr.',
        inputSchema: {
          type: 'object',
          properties: {
            matnrs: {
              type: 'array',
              description: 'Array of material numbers (raw or zero-padded, max 500). E.g. ["PFS10693","PFS10694"]',
              items: { type: 'string' }
            },
            plant: { type: 'string', description: 'Plant code, e.g. 1100' },
            fyStartYear: { type: 'number', description: 'Calendar year in which April falls, e.g. 2025 for FY2025-26' }
          },
          required: ['matnrs', 'plant', 'fyStartYear']
        }
      }
    ];
  }

  async handle(toolName: string, args: any): Promise<any> {
    switch (toolName) {
      case 'abap_query':             return this.handleQuery(args);
      case 'abap_table':             return this.handleTable(args);
      case 'get_stock_ledger':       return this.handleStockLedger(args);
      case 'get_stock_ledger_batch': return this.handleStockLedgerBatch(args);
      default: throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${toolName}`);
    }
  }

  private async handleQuery(args: any): Promise<any> {
    try {
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
        return parseQueryResponse(response.body);
      });
      return this.success({ result });
    } catch (error: any) {
      const fromMatch = String(args.sql || args.query || '').match(/\bFROM\s+([^\s,()]+)/i);
      const hint = await this.unknownColumnHint(fromMatch?.[1], error);
      this.fail(formatError('abap_query', error) + hint);
    }
  }

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
    } catch (_) {}
    return '';
  }

  private async handleTable(args: any): Promise<any> {
    try {
      const limit = args.limit || 100;
      const where = args.where || '';
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

  /** India FY: LFMON 01=April ... 12=March. LFGJA = year in which April falls. */
  private getFYPeriods(fyStartYear: number) {
    return {
      openingLfgja: String(fyStartYear - 1), openingLfmon: '12',
      closingLfgja: String(fyStartYear),     closingLfmon: '12',
      budatFrom: `${fyStartYear}0401`,
      budatTo:   `${fyStartYear + 1}0331`,
    };
  }

  /** MARDH with fallback scan for single-material use. */
  private async getMardhWithFallback(matnrPadded: string, plant: string, lfgja: string): Promise<any> {
    let result = await this.runRawSql(
      `SELECT WERKS, LGORT, LABST FROM MARDH WHERE MATNR = '${matnrPadded}' AND WERKS = '${plant}' AND LFGJA = '${lfgja}' AND LFMON = '12'`
    );
    if (result?.values?.length) return result;
    for (let lfmon = 11; lfmon >= 1; lfmon--) {
      const lm = String(lfmon).padStart(2, '0');
      result = await this.runRawSql(
        `SELECT WERKS, LGORT, LABST FROM MARDH WHERE MATNR = '${matnrPadded}' AND WERKS = '${plant}' AND LFGJA = '${lfgja}' AND LFMON = '${lm}'`
      );
      if (result?.values?.length) return result;
    }
    return { values: [] };
  }

  // ─── Single-material stock ledger ─────────────────────────────────────────────

  private async handleStockLedger(args: any): Promise<any> {
    try {
      const { matnr, plant } = args;
      const fyStartYear: number = args.fyStartYear;
      const validate: boolean = !!args.validate;
      const p = this.getFYPeriods(fyStartYear);
      const m = String(matnr).padStart(18, '0');

      const mrpFetch = (async () => {
        const a938 = await this.runRawSql(
          `SELECT KNUMH FROM A938 WHERE KSCHL = 'ZMRP' AND KAPPL = 'V' AND MATNR = '${m}' ORDER BY DATAB DESCENDING UP TO 1 ROWS`
        );
        const knumh = a938?.values?.[0]?.KNUMH;
        if (!knumh) return null;
        return this.runRawSql(`SELECT KBETR FROM KONP WHERE KNUMH = '${knumh}'`);
      })();

      // Validate balance: two separate queries instead of CASE WHEN (ADT doesn't support it)
      const validateFetch = validate
        ? Promise.all([
            this.runRawSql(
              `SELECT SUM( MENGE ) AS RECEIPTS FROM MSEG ` +
              `WHERE MATBF = '${m}' AND WERKS = '${plant}' AND SHKZG = 'S' ` +
              `AND BUDAT BETWEEN '${p.budatFrom}' AND '${p.budatTo}'`
            ),
            this.runRawSql(
              `SELECT SUM( MENGE ) AS ISSUES FROM MSEG ` +
              `WHERE MATBF = '${m}' AND WERKS = '${plant}' AND SHKZG = 'H' ` +
              `AND BUDAT BETWEEN '${p.budatFrom}' AND '${p.budatTo}'`
            ),
          ])
        : Promise.resolve(null);

      const [
        mapR, openMardhR, openMbewhR, closeMardhR, closeMbewhR,
        msegSaleR, msegSaleRevR, msegStoOutR, mseg701R, mseg702R,
        mseg561R, mseg562R, mseg309R,
        stoInR, fgR, rtsR, taxR, mrpR, validateR,
      ] = await Promise.all([
        // MAP — MBEW.VERPR
        this.runRawSql(`SELECT MATNR, VERPR FROM MBEW WHERE MATNR = '${m}' AND BWKEY = '${plant}' AND BWTAR = ''`),
        this.getMardhWithFallback(m, plant, p.openingLfgja),
        this.runRawSql(`SELECT BWKEY, LBKUM, SALK3 FROM MBEWH WHERE MATNR = '${m}' AND BWKEY = '${plant}' AND BWTAR = '' AND LFGJA = '${p.openingLfgja}' AND LFMON = '${p.openingLfmon}'`),
        this.getMardhWithFallback(m, plant, p.closingLfgja),
        this.runRawSql(`SELECT BWKEY, LBKUM, SALK3 FROM MBEWH WHERE MATNR = '${m}' AND BWKEY = '${plant}' AND BWTAR = '' AND LFGJA = '${p.closingLfgja}' AND LFMON = '${p.closingLfmon}'`),

        // MSEG: one query per movement group — ADT freestyle does not support CASE WHEN
        this.runRawSql(
          `SELECT SUM( MENGE ) AS SALE_QTY FROM MSEG WHERE MATBF = '${m}' AND WERKS = '${plant}' ` +
          `AND BWART IN ('251','601','633') AND SHKZG = 'H' ` +
          `AND BUDAT BETWEEN '${p.budatFrom}' AND '${p.budatTo}'`
        ),
        this.runRawSql(
          `SELECT SUM( MENGE ) AS SALE_REV_QTY FROM MSEG WHERE MATBF = '${m}' AND WERKS = '${plant}' ` +
          `AND BWART IN ('252','602','631','632','634','653') AND SHKZG = 'S' ` +
          `AND BUDAT BETWEEN '${p.budatFrom}' AND '${p.budatTo}'`
        ),
        this.runRawSql(
          `SELECT SUM( MENGE ) AS STO_OUT_QTY FROM MSEG WHERE MATBF = '${m}' AND WERKS = '${plant}' ` +
          `AND BWART = '641' AND XAUTO = '' ` +
          `AND BUDAT BETWEEN '${p.budatFrom}' AND '${p.budatTo}'`
        ),
        this.runRawSql(
          `SELECT SUM( MENGE ) AS QTY_701 FROM MSEG WHERE MATBF = '${m}' AND WERKS = '${plant}' ` +
          `AND BWART = '701' AND SHKZG = 'S' ` +
          `AND BUDAT BETWEEN '${p.budatFrom}' AND '${p.budatTo}'`
        ),
        this.runRawSql(
          `SELECT SUM( MENGE ) AS QTY_702, SUM( SALK3 ) AS VAL_702 FROM MSEG WHERE MATBF = '${m}' AND WERKS = '${plant}' ` +
          `AND BWART = '702' AND SHKZG = 'H' ` +
          `AND BUDAT BETWEEN '${p.budatFrom}' AND '${p.budatTo}'`
        ),
        this.runRawSql(
          `SELECT SUM( MENGE ) AS QTY_561, SUM( SALK3 ) AS VAL_561 FROM MSEG WHERE MATBF = '${m}' AND WERKS = '${plant}' ` +
          `AND BWART = '561' AND BUDAT BETWEEN '${p.budatFrom}' AND '${p.budatTo}'`
        ),
        this.runRawSql(
          `SELECT SUM( MENGE ) AS QTY_562, SUM( SALK3 ) AS VAL_562 FROM MSEG WHERE MATBF = '${m}' AND WERKS = '${plant}' ` +
          `AND BWART = '562' AND BUDAT BETWEEN '${p.budatFrom}' AND '${p.budatTo}'`
        ),
        this.runRawSql(
          `SELECT SUM( MENGE ) AS QTY_309_310, SUM( SALK3 ) AS VAL_309_310 FROM MSEG WHERE MATBF = '${m}' AND WERKS = '${plant}' ` +
          `AND BWART IN ('309','310') AND BUDAT BETWEEN '${p.budatFrom}' AND '${p.budatTo}'`
        ),

        // STO Inward — MSEG 101 + EKKO STO types
        this.runRawSql(
          `SELECT SUM( MSEG~MENGE ) AS STO_IN_QTY ` +
          `FROM MSEG INNER JOIN EKKO ON MSEG~EBELN = EKKO~EBELN ` +
          `WHERE MSEG~MATBF = '${m}' AND MSEG~WERKS = '${plant}' ` +
          `AND MSEG~BWART = '101' AND MSEG~XAUTO = '' ` +
          `AND MSEG~BUDAT BETWEEN '${p.budatFrom}' AND '${p.budatTo}' ` +
          `AND EKKO~BSART IN ('ZITR','ZITS','ZRTW','ZRTV','ZIBT','ZIBI','ZFRC','ZFRT','ZASI','ZAST','ZBAS')`
        ),
        // FG PRDO — AFPO+AFKO join, WEMNG (not PSMNG), AFKO.STRMP date filter
        this.runRawSql(
          `SELECT SUM( AFPO~WEMNG ) AS FG_QTY, SUM( AFPO~WEWRT ) AS FG_VALUE ` +
          `FROM AFPO INNER JOIN AFKO ON AFPO~AUFNR = AFKO~AUFNR ` +
          `WHERE AFPO~PWERK = '${plant}' AND AFPO~MATNR = '${m}' ` +
          `AND AFKO~STRMP BETWEEN '${p.budatFrom}' AND '${p.budatTo}'`
        ),
        // RTS — EKPO+EKKO, no ZCAP/ZCON
        this.runRawSql(
          `SELECT SUM( EKPO~MENGE ) AS RTS_QTY, SUM( EKPO~NETWR ) AS RTS_VALUE ` +
          `FROM EKPO INNER JOIN EKKO ON EKPO~EBELN = EKKO~EBELN ` +
          `WHERE EKPO~MATNR = '${m}' AND EKPO~WERKS = '${plant}' ` +
          `AND EKKO~BSART IN ('ZDFG','ZMRP','ZPKG','ZPRO','ZRAW','ZRET','ZSER','ZSUB') ` +
          `AND EKKO~AEDAT BETWEEN '${p.budatFrom}' AND '${p.budatTo}'`
        ),
        // Taxable Value — VBRP+VBRK join, KZWI3
        this.runRawSql(
          `SELECT SUM( VBRP~KZWI3 ) AS TAXABLE_VALUE FROM VBRP INNER JOIN VBRK ON VBRP~VBELN = VBRK~VBELN ` +
          `WHERE VBRP~MATNR = '${m}' AND VBRP~WERKS = '${plant}' ` +
          `AND VBRK~ERDAT BETWEEN '${p.budatFrom}' AND '${p.budatTo}'`
        ),
        mrpFetch,
        validateFetch,
      ]);

      const map = Number(mapR?.values?.[0]?.VERPR) || 0;
      const mrp = Number(mrpR?.values?.[0]?.KBETR) || 0;
      const openingQty   = this.sumLabst(openMardhR);
      const closingQty   = this.sumLabst(closeMardhR);
      const openingValue = Number(openMbewhR?.values?.[0]?.SALK3) || openingQty * map;
      const closingValue = Number(closeMbewhR?.values?.[0]?.SALK3) || closingQty * map;
      const stoInQty     = Number(stoInR?.values?.[0]?.STO_IN_QTY) || 0;
      const fgPrdoQty    = Number(fgR?.values?.[0]?.FG_QTY) || 0;
      const fgPrdoValue  = Number(fgR?.values?.[0]?.FG_VALUE) || 0;
      const rtsQty       = Number(rtsR?.values?.[0]?.RTS_QTY) || 0;
      const rtsValue     = Number(rtsR?.values?.[0]?.RTS_VALUE) || 0;
      const taxableValue = Number(taxR?.values?.[0]?.TAXABLE_VALUE) || 0;
      const saleQty      = Number(msegSaleR?.values?.[0]?.SALE_QTY) || 0;
      const saleRevQty   = Number(msegSaleRevR?.values?.[0]?.SALE_REV_QTY) || 0;
      const stoOutQty    = Number(msegStoOutR?.values?.[0]?.STO_OUT_QTY) || 0;
      const qty701Up     = Number(mseg701R?.values?.[0]?.QTY_701) || 0;
      const qty702Down   = Number(mseg702R?.values?.[0]?.QTY_702) || 0;
      const val702       = Number(mseg702R?.values?.[0]?.VAL_702) || 0;
      const qty561       = Number(mseg561R?.values?.[0]?.QTY_561) || 0;
      const val561       = Number(mseg561R?.values?.[0]?.VAL_561) || 0;
      const qty562       = Number(mseg562R?.values?.[0]?.QTY_562) || 0;
      const val562       = Number(mseg562R?.values?.[0]?.VAL_562) || 0;
      const qty309_310   = Number(mseg309R?.values?.[0]?.QTY_309_310) || 0;
      const val309_310   = Number(mseg309R?.values?.[0]?.VAL_309_310) || 0;

      const result: any = {
        map, mrp,
        openingQty, openingValue,
        closingQty, closingValue,
        stoOutQty,            stoOutValue:      stoOutQty * map,
        stoInQty,             stoInValue:       stoInQty * map,
        saleQty,              saleMrpValue:     saleQty * mrp,
        saleRevQty,           saleRevValue:     saleRevQty * mrp,
        qty701Up,
        qty702Down,           val702,
        net561_562Qty:        qty561 - qty562,
        net561_562Value:      val561 - val562,
        qty309_310,           val309_310,
        fgPrdoQty, fgPrdoValue,
        rtsQty, rtsValue,
        taxableValue,
      };

      if (validate && validateR) {
        const [receiptsR, issuesR] = validateR as any[];
        const receipts = Number(receiptsR?.values?.[0]?.RECEIPTS) || 0;
        const issues   = Number(issuesR?.values?.[0]?.ISSUES) || 0;
        const expected = openingQty + receipts - issues;
        result.balanceCheck = {
          expectedClosingQty: expected,
          actualClosingQty:   closingQty,
          matches: Math.abs(expected - closingQty) < 0.001,
        };
      }

      return this.success({ result });
    } catch (error: any) {
      this.fail(formatError('get_stock_ledger', error));
    }
  }

  // ─── Batch stock ledger ────────────────────────────────────────────────────────

  private async handleStockLedgerBatch(args: any): Promise<any> {
    try {
      const { matnrs, plant, fyStartYear } = args;
      if (!Array.isArray(matnrs) || matnrs.length === 0) throw new Error('matnrs must be a non-empty array');
      if (matnrs.length > 500) throw new Error('Maximum 500 materials per batch — split into smaller batches');

      const p = this.getFYPeriods(fyStartYear);
      const padded = (matnrs as string[]).map(x => String(x).padStart(18, '0'));
      const inList = padded.map(x => `'${x}'`).join(',');

      // ── All queries fire in parallel ──────────────────────────────────────────
      // MSEG is split into one query per movement group because the SAP ADT
      // datapreview freestyle endpoint does not support CASE WHEN expressions.
      // Each split query has a narrow BWART filter, so it's faster anyway.
      const [
        mapR, a938R,
        opMardhR, clMardhR, opMbewhR, clMbewhR,
        msegSaleR, msegSaleRevR, msegStoOutR,
        mseg701R, mseg702R, mseg561R, mseg562R, mseg309R,
        stoInR, rtsR, fgR, taxR,
      ] = await Promise.all([
        // MAP — MBEW.VERPR (not I_ProductValuation, not MBEWH.VERPR)
        this.runRawSql(
          `SELECT MATNR, VERPR FROM MBEW WHERE MATNR IN (${inList}) AND BWKEY = '${plant}' AND BWTAR = ''`,
          600
        ),
        // MRP step 1 — A938: all records; JS picks most-recent DATAB per MATNR
        this.runRawSql(
          `SELECT MATNR, KNUMH, DATAB FROM A938 WHERE KSCHL = 'ZMRP' AND KAPPL = 'V' AND MATNR IN (${inList})`,
          5000
        ),
        // Opening stock qty — MARDH, SUM across all LGORTs
        this.runRawSql(
          `SELECT MATNR, SUM( LABST ) AS OPENING_QTY FROM MARDH ` +
          `WHERE MATNR IN (${inList}) AND WERKS = '${plant}' ` +
          `AND LFGJA = '${p.openingLfgja}' AND LFMON = '${p.openingLfmon}' GROUP BY MATNR`,
          600
        ),
        // Closing stock qty — MARDH
        this.runRawSql(
          `SELECT MATNR, SUM( LABST ) AS CLOSING_QTY FROM MARDH ` +
          `WHERE MATNR IN (${inList}) AND WERKS = '${plant}' ` +
          `AND LFGJA = '${p.closingLfgja}' AND LFMON = '${p.closingLfmon}' GROUP BY MATNR`,
          600
        ),
        // Opening stock value — MBEWH.SALK3
        this.runRawSql(
          `SELECT MATNR, SALK3 AS OPENING_VALUE FROM MBEWH ` +
          `WHERE MATNR IN (${inList}) AND BWKEY = '${plant}' AND BWTAR = '' ` +
          `AND LFGJA = '${p.openingLfgja}' AND LFMON = '${p.openingLfmon}'`,
          600
        ),
        // Closing stock value — MBEWH.SALK3
        this.runRawSql(
          `SELECT MATNR, SALK3 AS CLOSING_VALUE FROM MBEWH ` +
          `WHERE MATNR IN (${inList}) AND BWKEY = '${plant}' AND BWTAR = '' ` +
          `AND LFGJA = '${p.closingLfgja}' AND LFMON = '${p.closingLfmon}'`,
          600
        ),

        // ── MSEG: one query per movement group (no CASE WHEN — ADT does not support it) ──
        this.runRawSql(
          `SELECT MATBF, SUM( MENGE ) AS SALE_QTY FROM MSEG ` +
          `WHERE MATBF IN (${inList}) AND WERKS = '${plant}' ` +
          `AND BWART IN ('251','601','633') AND SHKZG = 'H' ` +
          `AND BUDAT BETWEEN '${p.budatFrom}' AND '${p.budatTo}' GROUP BY MATBF`,
          600
        ),
        this.runRawSql(
          `SELECT MATBF, SUM( MENGE ) AS SALE_REV_QTY FROM MSEG ` +
          `WHERE MATBF IN (${inList}) AND WERKS = '${plant}' ` +
          `AND BWART IN ('252','602','631','632','634','653') AND SHKZG = 'S' ` +
          `AND BUDAT BETWEEN '${p.budatFrom}' AND '${p.budatTo}' GROUP BY MATBF`,
          600
        ),
        this.runRawSql(
          `SELECT MATBF, SUM( MENGE ) AS STO_OUT_QTY FROM MSEG ` +
          `WHERE MATBF IN (${inList}) AND WERKS = '${plant}' ` +
          `AND BWART = '641' AND XAUTO = '' ` +
          `AND BUDAT BETWEEN '${p.budatFrom}' AND '${p.budatTo}' GROUP BY MATBF`,
          600
        ),
        this.runRawSql(
          `SELECT MATBF, SUM( MENGE ) AS QTY_701 FROM MSEG ` +
          `WHERE MATBF IN (${inList}) AND WERKS = '${plant}' ` +
          `AND BWART = '701' AND SHKZG = 'S' ` +
          `AND BUDAT BETWEEN '${p.budatFrom}' AND '${p.budatTo}' GROUP BY MATBF`,
          600
        ),
        this.runRawSql(
          `SELECT MATBF, SUM( MENGE ) AS QTY_702, SUM( SALK3 ) AS VAL_702 FROM MSEG ` +
          `WHERE MATBF IN (${inList}) AND WERKS = '${plant}' ` +
          `AND BWART = '702' AND SHKZG = 'H' ` +
          `AND BUDAT BETWEEN '${p.budatFrom}' AND '${p.budatTo}' GROUP BY MATBF`,
          600
        ),
        this.runRawSql(
          `SELECT MATBF, SUM( MENGE ) AS QTY_561, SUM( SALK3 ) AS VAL_561 FROM MSEG ` +
          `WHERE MATBF IN (${inList}) AND WERKS = '${plant}' ` +
          `AND BWART = '561' AND BUDAT BETWEEN '${p.budatFrom}' AND '${p.budatTo}' GROUP BY MATBF`,
          600
        ),
        this.runRawSql(
          `SELECT MATBF, SUM( MENGE ) AS QTY_562, SUM( SALK3 ) AS VAL_562 FROM MSEG ` +
          `WHERE MATBF IN (${inList}) AND WERKS = '${plant}' ` +
          `AND BWART = '562' AND BUDAT BETWEEN '${p.budatFrom}' AND '${p.budatTo}' GROUP BY MATBF`,
          600
        ),
        this.runRawSql(
          `SELECT MATBF, SUM( MENGE ) AS QTY_309_310, SUM( SALK3 ) AS VAL_309_310 FROM MSEG ` +
          `WHERE MATBF IN (${inList}) AND WERKS = '${plant}' ` +
          `AND BWART IN ('309','310') AND BUDAT BETWEEN '${p.budatFrom}' AND '${p.budatTo}' GROUP BY MATBF`,
          600
        ),

        // STO Inward — MSEG BWART=101 + EKKO STO document types
        this.runRawSql(
          `SELECT MSEG~MATBF AS MATNR, SUM( MSEG~MENGE ) AS STO_IN_QTY ` +
          `FROM MSEG INNER JOIN EKKO ON MSEG~EBELN = EKKO~EBELN ` +
          `WHERE MSEG~MATBF IN (${inList}) AND MSEG~WERKS = '${plant}' ` +
          `AND MSEG~BWART = '101' AND MSEG~XAUTO = '' ` +
          `AND MSEG~BUDAT BETWEEN '${p.budatFrom}' AND '${p.budatTo}' ` +
          `AND EKKO~BSART IN ('ZITR','ZITS','ZRTW','ZRTV','ZIBT','ZIBI','ZFRC','ZFRT','ZASI','ZAST','ZBAS') ` +
          `GROUP BY MSEG~MATBF`,
          2000
        ),
        // RTS — EKPO+EKKO, ZCAP and ZCON excluded
        this.runRawSql(
          `SELECT EKPO~MATNR, SUM( EKPO~MENGE ) AS RTS_QTY, SUM( EKPO~NETWR ) AS RTS_VALUE ` +
          `FROM EKPO INNER JOIN EKKO ON EKPO~EBELN = EKKO~EBELN ` +
          `WHERE EKPO~MATNR IN (${inList}) AND EKPO~WERKS = '${plant}' ` +
          `AND EKKO~BSART IN ('ZDFG','ZMRP','ZPKG','ZPRO','ZRAW','ZRET','ZSER','ZSUB') ` +
          `AND EKKO~AEDAT BETWEEN '${p.budatFrom}' AND '${p.budatTo}' GROUP BY EKPO~MATNR`,
          2000
        ),
        // FG PRDO — AFPO+AFKO, WEMNG (not PSMNG), date filter on AFKO.STRMP
        this.runRawSql(
          `SELECT AFPO~MATNR, SUM( AFPO~WEMNG ) AS FG_QTY, SUM( AFPO~WEWRT ) AS FG_VALUE ` +
          `FROM AFPO INNER JOIN AFKO ON AFPO~AUFNR = AFKO~AUFNR ` +
          `WHERE AFPO~MATNR IN (${inList}) AND AFPO~PWERK = '${plant}' ` +
          `AND AFKO~STRMP BETWEEN '${p.budatFrom}' AND '${p.budatTo}' GROUP BY AFPO~MATNR`,
          2000
        ),
        // Taxable Value — VBRP+VBRK, KZWI3
        this.runRawSql(
          `SELECT VBRP~MATNR, SUM( VBRP~KZWI3 ) AS TAXABLE_VALUE ` +
          `FROM VBRP INNER JOIN VBRK ON VBRP~VBELN = VBRK~VBELN ` +
          `WHERE VBRP~MATNR IN (${inList}) AND VBRP~WERKS = '${plant}' ` +
          `AND VBRK~ERDAT BETWEEN '${p.budatFrom}' AND '${p.budatTo}' GROUP BY VBRP~MATNR`,
          2000
        ),
      ]);

      // ── Round 2: MRP step 2 — KONP for the KNUMHs found in A938 ─────────────
      const mrpKnumhMap = this.buildMrpKnumhMap(a938R);
      const knumhSet = [...new Set(Object.values(mrpKnumhMap))].filter(Boolean);
      let konpR: any = { values: [] };
      if (knumhSet.length > 0) {
        konpR = await this.runRawSql(
          `SELECT KNUMH, KBETR FROM KONP WHERE KNUMH IN (${knumhSet.map(k => `'${k}'`).join(',')})`,
          1000
        );
      }

      // ── Build lookup maps ─────────────────────────────────────────────────────
      const mapLkp     = this.toLookupNum(mapR,       'MATNR', 'VERPR');
      const mrpLkp     = this.buildMrpKbetrLookup(mrpKnumhMap, konpR);
      const opQtyLkp   = this.toLookupNum(opMardhR,   'MATNR', 'OPENING_QTY');
      const clQtyLkp   = this.toLookupNum(clMardhR,   'MATNR', 'CLOSING_QTY');
      const opValLkp   = this.toLookupNum(opMbewhR,   'MATNR', 'OPENING_VALUE');
      const clValLkp   = this.toLookupNum(clMbewhR,   'MATNR', 'CLOSING_VALUE');
      const saleLkp    = this.toLookupNum(msegSaleR,   'MATBF', 'SALE_QTY');
      const saleRevLkp = this.toLookupNum(msegSaleRevR,'MATBF', 'SALE_REV_QTY');
      const stoOutLkp  = this.toLookupNum(msegStoOutR, 'MATBF', 'STO_OUT_QTY');
      const q701Lkp    = this.toLookupNum(mseg701R,    'MATBF', 'QTY_701');
      const q702Lkp    = this.toLookupNum(mseg702R,    'MATBF', 'QTY_702');
      const v702Lkp    = this.toLookupNum(mseg702R,    'MATBF', 'VAL_702');
      const q561Lkp    = this.toLookupNum(mseg561R,    'MATBF', 'QTY_561');
      const v561Lkp    = this.toLookupNum(mseg561R,    'MATBF', 'VAL_561');
      const q562Lkp    = this.toLookupNum(mseg562R,    'MATBF', 'QTY_562');
      const v562Lkp    = this.toLookupNum(mseg562R,    'MATBF', 'VAL_562');
      const q309Lkp    = this.toLookupNum(mseg309R,    'MATBF', 'QTY_309_310');
      const v309Lkp    = this.toLookupNum(mseg309R,    'MATBF', 'VAL_309_310');
      const stoInLkp   = this.toLookupNum(stoInR,      'MATNR', 'STO_IN_QTY');
      const rtsLkp     = this.toRowLookup(rtsR,        'MATNR');
      const fgLkp      = this.toRowLookup(fgR,         'MATNR');
      const taxLkp     = this.toLookupNum(taxR,        'MATNR', 'TAXABLE_VALUE');

      // ── Assemble one row per material ─────────────────────────────────────────
      const rows = padded.map(matnr => {
        const map    = mapLkp[matnr]    ?? 0;
        const mrp    = mrpLkp[matnr]    ?? 0;
        const opQty  = opQtyLkp[matnr]  ?? 0;
        const clQty  = clQtyLkp[matnr]  ?? 0;
        const opVal  = opValLkp[matnr]  ?? (opQty * map);
        const clVal  = clValLkp[matnr]  ?? (clQty * map);
        const saleQty    = saleLkp[matnr]    ?? 0;
        const saleRevQty = saleRevLkp[matnr] ?? 0;
        const stoOutQty  = stoOutLkp[matnr]  ?? 0;
        const stoInQty   = stoInLkp[matnr]   ?? 0;
        const qty561     = q561Lkp[matnr]    ?? 0;
        const val561     = v561Lkp[matnr]    ?? 0;
        const qty562     = q562Lkp[matnr]    ?? 0;
        const val562     = v562Lkp[matnr]    ?? 0;
        const rt = rtsLkp[matnr] ?? {};
        const fg = fgLkp[matnr]  ?? {};
        return {
          matnr,
          map, mrp,
          openingQty: opQty,    openingValue: opVal,
          closingQty: clQty,    closingValue: clVal,
          stoOutQty,            stoOutValue:      stoOutQty * map,
          stoInQty,             stoInValue:       stoInQty  * map,
          saleQty,              saleMrpValue:     saleQty   * mrp,
          saleRevQty,           saleRevValue:     saleRevQty * mrp,
          qty701Up:             q701Lkp[matnr]   ?? 0,
          qty702Down:           q702Lkp[matnr]   ?? 0,
          val702:               v702Lkp[matnr]   ?? 0,
          net561_562Qty:        qty561 - qty562,
          net561_562Value:      val561 - val562,
          qty309_310:           q309Lkp[matnr]   ?? 0,
          val309_310:           v309Lkp[matnr]   ?? 0,
          rtsQty:    Number(rt.RTS_QTY)           || 0,
          rtsValue:  Number(rt.RTS_VALUE)         || 0,
          fgPrdoQty: Number(fg.FG_QTY)            || 0,
          fgPrdoValue: Number(fg.FG_VALUE)        || 0,
          taxableValue: taxLkp[matnr]             ?? 0,
        };
      });

      return this.success({ rows, count: rows.length, plant, fyStartYear });
    } catch (error: any) {
      this.fail(formatError('get_stock_ledger_batch', error));
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  private sumLabst(parsed: any): number {
    return (parsed?.values || []).reduce((s: number, r: any) => s + (Number(r.LABST) || 0), 0);
  }

  /** A938 result → MATNR→KNUMH map, keeping most-recent DATAB per material. */
  private buildMrpKnumhMap(a938R: any): Record<string, string> {
    const best: Record<string, { datab: string; knumh: string }> = {};
    for (const r of a938R?.values || []) {
      if (!r.MATNR || !r.KNUMH) continue;
      const prev = best[r.MATNR];
      if (!prev || r.DATAB > prev.datab) best[r.MATNR] = { datab: r.DATAB, knumh: r.KNUMH };
    }
    const out: Record<string, string> = {};
    for (const [matnr, { knumh }] of Object.entries(best)) out[matnr] = knumh;
    return out;
  }

  /** Combine KNUMH map + KONP result → MATNR→MRP lookup. */
  private buildMrpKbetrLookup(knumhMap: Record<string, string>, konpR: any): Record<string, number> {
    const knumhToKbetr: Record<string, number> = {};
    for (const r of konpR?.values || []) {
      if (r.KNUMH) knumhToKbetr[r.KNUMH] = Number(r.KBETR) || 0;
    }
    const out: Record<string, number> = {};
    for (const [matnr, knumh] of Object.entries(knumhMap)) out[matnr] = knumhToKbetr[knumh] || 0;
    return out;
  }

  /** Build MATNR→number lookup from a query result. */
  private toLookupNum(r: any, keyField: string, valueField: string): Record<string, number> {
    const out: Record<string, number> = {};
    for (const row of r?.values || []) {
      if (row[keyField] != null) out[row[keyField]] = Number(row[valueField]) || 0;
    }
    return out;
  }

  /** Build MATNR→full-row lookup from a query result. */
  private toRowLookup(r: any, keyField: string): Record<string, any> {
    const out: Record<string, any> = {};
    for (const row of r?.values || []) {
      if (row[keyField] != null) out[row[keyField]] = row;
    }
    return out;
  }
}
