# Install ToolForge as a plugin (Codex & Claude Code)

ToolForge ships as an **MCP server** — the standard "plug" that Codex, Claude Code (and Cursor) all
accept. Install it once and your recorded legacy-app tools appear inside the agent.

> **Two facts that make this easy:**
> 1. **The plugin needs no OpenAI key.** It only *replays* tools. (A key is only needed to *record*
>    new tools with `record.py` / `synthesize.py`.)
> 2. **It serves every tool dynamically.** Drop a new `tools/<name>.tool.json` in and it shows up —
>    no restart, no code change. (Run `toolforge_status` in your agent to see what's available.)

---

## 0. One-time setup

```powershell
cd C:\Users\yapho\CodexHackathon\toolforge
./setup.ps1
```

This makes a local `.venv`, installs the deps (`mcp`, `pyautogui`, …), and seeds `.env`. It prints
the **python interpreter path** to use below, e.g.
`C:\Users\yapho\CodexHackathon\toolforge\.venv\Scripts\python.exe`.

---

## 1a. Codex

Add ToolForge to `~/.codex/config.toml` (create the file if needed):

```toml
[mcp_servers.toolforge]
command = "C:/Users/yapho/CodexHackathon/toolforge/.venv/Scripts/python.exe"
args = ["C:/Users/yapho/CodexHackathon/toolforge/mcp_server.py"]
```

…or use the CLI:

```powershell
codex mcp add toolforge -- "C:/Users/yapho/CodexHackathon/toolforge/.venv/Scripts/python.exe" "C:/Users/yapho/CodexHackathon/toolforge/mcp_server.py"
```

Restart Codex, then ask it: **"Use the toolforge_status tool."** You should get back a JSON status
with the list of available tools. (Ready-to-paste block: [`install/codex-config.toml`](install/codex-config.toml).)
Reference: [OpenAI Codex — MCP](https://developers.openai.com/codex/mcp).

## 1b. Claude Code

This folder is already a plugin **and** a one-plugin marketplace. In Claude Code:

```
/plugin marketplace add C:\Users\yapho\CodexHackathon\toolforge
/plugin install toolforge@toolforge-dev
```

The plugin runs `mcp_server.py` via [`.mcp.json`](../.mcp.json). If you used the venv (recommended),
edit `.mcp.json`'s `"command"` to your `.venv\Scripts\python.exe` so Claude Code uses the right
interpreter. Then ask: **"Run the toolforge_status tool."**

---

## 2. Verify it works

In either agent, ask it to call **`toolforge_status`** (safe — it never touches your screen). You'll
get something like:

```json
{ "status": "ok", "server": "toolforge", "available_tools": [], "hint": "Record a new tool with ..." }
```

`available_tools` is empty until you record your first one — that's expected.

## 3. Add a real tool (the one part that uses your key + a live app)

```powershell
# with the target legacy app open and focused:
.\.venv\Scripts\python.exe record.py create_invoice "Create a new invoice for a customer with line items"
.\.venv\Scripts\python.exe synthesize.py create_invoice
```

Now `create_invoice` appears automatically in your agent — ask it: *"Create an invoice for Acme
Sdn Bhd, 10x Widget."* The agent calls the tool → ToolForge replays it on the live app.

---

## Smoke-test from the terminal (no agent needed)

```powershell
.\.venv\Scripts\python.exe scripts\mcp_py_smoke.py
```

Lists the tools the server exposes and calls `toolforge_status` over real MCP/stdio.
