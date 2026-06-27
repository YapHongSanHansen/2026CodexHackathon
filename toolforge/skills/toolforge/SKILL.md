---
name: toolforge
description: Use when the user wants to run a ToolForge-wrapped legacy desktop-app action (e.g. "create an invoice", or any workflow that was recorded into a ToolForge tool). Calls the generated MCP tools that drive the legacy app by replaying a recorded workflow.
---

# ToolForge tools

This plugin exposes your recorded legacy desktop-app workflows as callable MCP tools. The set is
**dynamic** — every `tools/*.tool.json` becomes a tool automatically.

## When to use
- The user asks to perform an action that matches an available ToolForge tool → call that tool with
  its parameters.
- If you are unsure what tools exist, call **`toolforge_status`** first (safe — it never touches the
  GUI) and read its `available_tools` list.

## How it works
Each tool replays a recorded, parameterized workflow on the live app via the ToolForge MCP server.
The target app must be **open and focused** on the machine running the server. The server only
replays — it has no LLM/API-key dependency.

## Notes
- Call `toolforge_status` when in doubt about which tools exist or whether the server is up.
- If parameter values are ambiguous, confirm them with the user before calling (a replay performs
  real clicks/keystrokes on their machine).
- Report the structured JSON result the tool returns.
