# ToolForge MCP Server

A standalone, stdio-based [Model Context Protocol](https://modelcontextprotocol.io) server that exposes a **ToolForge-generated legacy-app API** as callable MCP tools. On startup it fetches the project's MCP manifest from a running ToolForge backend and registers each tool; every tool call is proxied to the generated REST API (`/g/:project/...`) using the project's API key. This lets Claude Desktop, Claude Code, or any MCP client drive the once-stranded legacy app (e.g. *Sage UBS Accounting v9*) through a clean tool interface.

## Launch

```bash
npm run mcp -- --project <projectId> --server http://localhost:8787 --key <apiKey>
```

| Flag        | Required | Default                 | Env fallback        |
|-------------|----------|-------------------------|---------------------|
| `--project` | yes      | —                       | `TOOLFORGE_PROJECT` |
| `--server`  | no       | `http://localhost:8787` | `TOOLFORGE_SERVER`  |
| `--key`     | yes      | —                       | `TOOLFORGE_KEY`     |

The exact, ready-to-run command (with your real project id and key) is also printed by the
ToolForge dashboard after a project is deployed, as `deliverables.mcpCommand`.

> All diagnostics are written to **stderr**. stdout is reserved for the MCP stdio transport.

## Claude Desktop config

Add this to your `claude_desktop_config.json` (replace the absolute path, project id, and key).
On macOS this file lives at `~/Library/Application Support/Claude/claude_desktop_config.json`;
on Windows at `%APPDATA%\Claude\claude_desktop_config.json`.

```json
{
  "mcpServers": {
    "toolforge-ubs": {
      "command": "npm",
      "args": [
        "run",
        "mcp",
        "--prefix",
        "<abs path>/toolforge/server",
        "--",
        "--project",
        "<projectId>",
        "--server",
        "http://localhost:8787",
        "--key",
        "<apiKey>"
      ]
    }
  }
}
```

Make sure the ToolForge backend is running (`npm run dev` from the repo root) and the project is
deployed before launching the MCP client — the server fetches its tool list from
`GET <server>/api/mcp/<projectId>/manifest` at startup.

## How a call is mapped

For each tool, the manifest carries a `rest: { method, path }`. When a tool is called:

1. `{param}` placeholders in `path` are filled from the call arguments (URL-encoded) and removed
   from the leftover args — e.g. `/customers/{code}` + `{ "code": "ACME01" }` → `/customers/ACME01`.
2. **GET/DELETE** → leftover args become a query string. **POST/PUT** → leftover args are sent as a
   JSON body (`content-type: application/json`).
3. The request goes to `<server>/g/<projectId><resolvedPath>` with header `x-api-key: <apiKey>`.
4. The result is returned as text content:
   `{ "request": { "method", "url" }, "status", "data" }` — flagged `isError` when `status >= 400`.

## Example tool calls

These names match the generated manifest (`mcpTool` on each endpoint). Argument shapes come from
each tool's `inputSchema`.

**`list_customers`** — `GET /customers`

```json
{ "name": "list_customers", "arguments": {} }
```

**`get_customer`** — `GET /customers/{code}` (path param)

```json
{ "name": "get_customer", "arguments": { "code": "ACME01" } }
```

**`create_invoice`** — `POST /invoices` (JSON body)

```json
{
  "name": "create_invoice",
  "arguments": {
    "customerCode": "ACME01",
    "date": "2026-06-25",
    "lines": [
      { "stockCode": "SKU-001", "qty": 2, "unitPrice": 150.0 }
    ]
  }
}
```

A successful `create_invoice` returns something like:

```json
{
  "request": { "method": "POST", "url": "http://localhost:8787/g/<projectId>/invoices" },
  "status": 201,
  "data": { "number": "INV-1042", "total": 318.0, "status": "unpaid" }
}
```
