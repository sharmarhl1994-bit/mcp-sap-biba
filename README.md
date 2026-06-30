# abap-data-mcp

A minimal MCP server for SAP ABAP **data access** via the ADT API. This is a
focused subset of [DassianInc/dassian-adt](https://github.com/DassianInc/dassian-adt),
exposing only 4 of its 25 tools:

| Category | Tool          | What it does                                                |
| -------- | ------------- | ------------------------------------------------------------ |
| Data     | `abap_table`  | Read contents of an ABAP table or CDS view (with WHERE/LIKE/BETWEEN). |
| Data     | `abap_query`  | Execute a freestyle OpenSQL query against the SAP database.  |
| System   | `login`       | Establish a stateful session with the SAP system.            |
| System   | `healthcheck` | Verify connectivity to the SAP system.                       |

No write, transport, source-editing, ATC, or run tools are included — this
server is **read-only by design**.

## Origins

Tool logic, error classification, and session-handling are taken directly
from `DassianInc/dassian-adt`'s `DataHandlers.ts` and `SystemHandlers.ts`
(MIT licensed), which in turn build on
[abap-adt-api](https://github.com/marcellourbani/abap-adt-api) by Marcello
Urbani. The server scaffold (`index.ts`, `BaseHandler.ts`) is a trimmed-down
reimplementation that drops the multi-system config, OAuth, MCP elicitation,
and HTTP-transport support found in the original, keeping only what these 4
tools need.

## Quick Start

### Prerequisites

- Node.js 18+
- Access to an SAP system with ADT enabled (port 44300)
- SAP user with read authorization on the relevant tables/views

### Install

```bash
npm install
npm run build
```

### Configure

```bash
cp .env.example .env
# Edit .env with your SAP connection details:
#   SAP_URL=https://your-sap-server:44300
#   SAP_USER=YOUR_USER
#   SAP_PASSWORD=YOUR_PASSWORD
#   SAP_CLIENT=100
#   SAP_LANGUAGE=EN
```

For self-signed certificates, add to `.env`:

```
NODE_TLS_REJECT_UNAUTHORIZED=0
```

### Connect to Claude Code / Claude Desktop

```json
{
  "mcpServers": {
    "abap-data": {
      "command": "node",
      "args": ["/path/to/abap-data-mcp/dist/index.js"],
      "env": {
        "SAP_URL": "https://your-sap-server:44300",
        "SAP_USER": "YOUR_USER",
        "SAP_PASSWORD": "YOUR_PASSWORD",
        "SAP_CLIENT": "100",
        "SAP_LANGUAGE": "EN"
      }
    }
  }
}
```

## Architecture

```
Client (Claude Code, Claude Desktop, etc.)
    |
    | MCP protocol (stdio)
    |
index.ts
    |
    +-- BaseHandler (session mgmt, validation)
    |       |
    |       +-- DataHandlers    (abap_table, abap_query)
    |       +-- SystemHandlers  (login, healthcheck)
    |
    +-- lib/errors.ts  (SAP error classification + hints)
    +-- lib/logger.ts  (JSON structured logging)
    +-- lib/auth.ts    (single-system basic-auth env resolution)
```

## Credits

- **[Dassian Inc.](https://github.com/DassianInc)** — `dassian-adt`, the source this server is trimmed from
- **[Mario Andreschak](https://github.com/mario-andreschak)** — original `mcp-abap-abap-adt-api` server scaffold
- **[Marcello Urbani](https://github.com/marcellourbani)** — `abap-adt-api` library powering all ADT HTTP communication

## License

MIT — see [LICENSE](./LICENSE).
