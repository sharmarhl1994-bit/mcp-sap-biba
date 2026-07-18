# abap-data-mcp

A minimal MCP server for SAP ABAP **data access** via the ADT API. Exposes 4 read-only tools:

| Tool          | What it does                                                        |
| ------------- | -------------------------------------------------------------------- |
| `abap_table`  | Read contents of an ABAP table or CDS view (with WHERE/LIKE/BETWEEN) |
| `abap_query`  | Execute a freestyle OpenSQL query against the SAP database           |
| `login`       | Establish a stateful session with the SAP system                     |
| `healthcheck` | Verify connectivity to the SAP system                                |

---

## Two deployment modes

### Mode 1 — stdio (single user, local machine)

Each user runs the server on their own machine. SAP credentials live in a local `.env` file.

### Mode 2 — HTTP (central server, multiple users) ← recommended for teams

**One server** runs on a machine that has network access to SAP. Every user points their Claude Desktop at the same URL and passes their own SAP credentials in request headers. No Node.js install needed on each workstation.

```
User A (Claude Desktop) ──── HTTPS ──┐
User B (Claude Desktop) ──── HTTPS ──┤── Central MCP Server (:3000) ──── SAP (on-premise)
User C (Claude Desktop) ──── HTTPS ──┘  (SAP_URL fixed in .env)
```

---

## Quick Start

### Prerequisites

- Node.js 18+ on the machine running the server
- SAP system with ADT enabled (port 44300 by default)
- SAP users with read authorisation on the relevant tables/views

### Install

```bash
git clone <this-repo>
cd abap-data-mcp
npm install
npm run build
```

### Configure `.env`

```bash
cp .env.example .env
```

**For HTTP mode** (central server — credentials come from each user's request headers):

```env
SAP_URL=https://your-sap-server:44300
SAP_CLIENT=100
SAP_LANGUAGE=EN
# NODE_TLS_REJECT_UNAUTHORIZED=0   # uncomment for self-signed certs

MCP_PORT=3000
MCP_HOST=0.0.0.0
```

**For stdio mode** (single user — credentials in `.env`):

```env
SAP_URL=https://your-sap-server:44300
SAP_USER=YOUR_USER
SAP_PASSWORD=YOUR_PASSWORD
SAP_CLIENT=100
SAP_LANGUAGE=EN
```

---

## Running the central HTTP server

```bash
npm run start:http
# abap-data-mcp HTTP server listening on http://0.0.0.0:3000/mcp
```

To run as a background service (Linux/systemd example):

```ini
# /etc/systemd/system/abap-data-mcp.service
[Unit]
Description=abap-data-mcp central MCP server

[Service]
WorkingDirectory=/opt/abap-data-mcp
ExecStart=/usr/bin/node dist/http-server.js
EnvironmentFile=/opt/abap-data-mcp/.env
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
systemctl enable --now abap-data-mcp
```

---

## Claude Desktop configuration

### HTTP mode (central server — each user uses their own SAP credentials)

Edit `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "abap-data": {
      "type": "http",
      "url": "http://YOUR-SERVER-IP:3000/mcp",
      "headers": {
        "x-sap-user": "YOUR_SAP_USER",
        "x-sap-password": "YOUR_SAP_PASSWORD"
      }
    }
  }
}
```

Replace `YOUR-SERVER-IP` with the IP/hostname of the machine running the central server, and each user fills in their own SAP credentials.

> **Note:** If `claude_desktop_config.json` does not support a `headers` field in your Claude Desktop version, use HTTP Basic Auth instead — set `"url"` to `"http://USER:PASSWORD@YOUR-SERVER-IP:3000/mcp"`.

### stdio mode (local, single user)

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

---

## How credentials work in HTTP mode

The server accepts credentials in two ways (checked in order):

1. **Custom headers** (recommended):
   ```
   x-sap-user: YOUR_USER
   x-sap-password: YOUR_PASSWORD
   ```

2. **HTTP Basic Auth**:
   ```
   Authorization: Basic base64(user:password)
   ```

Each unique session gets its own isolated `ADTClient` — users never share a SAP session. Idle sessions (no activity for 2 hours) are cleaned up automatically.

---

## Architecture

```
# stdio mode
Claude Desktop → stdio → index.js → ADTClient → SAP

# HTTP mode
Claude Desktop A ──┐
Claude Desktop B ──┤── http-server.js ──┬── ADTClient(userA) → SAP
Claude Desktop C ──┘  (port 3000)       ├── ADTClient(userB) → SAP
                                         └── ADTClient(userC) → SAP
```

```
src/
  http-server.ts      ← central HTTP entry point (HTTP mode)
  index.ts            ← stdio entry point (single-user mode)
  handlers/
    BaseHandler.ts    ← session management, validation
    DataHandlers.ts   ← abap_table, abap_query
    SystemHandlers.ts ← login, healthcheck
  lib/
    auth.ts           ← credential resolution (stdio mode)
    errors.ts         ← SAP error classification
    logger.ts         ← structured JSON logging
```

---

## Credits

- **[Dassian Inc.](https://github.com/DassianInc)** — `dassian-adt`, the source this server is trimmed from
- **[Mario Andreschak](https://github.com/mario-andreschak)** — original `mcp-abap-abap-adt-api` server scaffold
- **[Marcello Urbani](https://github.com/marcellourbani)** — `abap-adt-api` library powering all ADT HTTP communication

## License

MIT — see [LICENSE](./LICENSE).
