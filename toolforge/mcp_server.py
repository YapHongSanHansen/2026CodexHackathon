"""
ToolForge MCP server — exposes EVERY recorded tool in tools/*.tool.json as a callable
MCP tool, so any MCP client (Claude Code, Codex, Cursor) can drive the legacy app.

Dynamic: tools are re-read on every request, so a newly recorded/synthesized tool shows
up without restarting the server. The target app must be open and focused on this machine
when a replay tool is called.

This server only REPLAYS tools — it needs no OpenAI key (only record.py / synthesize.py do).

Run standalone:  python mcp_server.py
"""
import asyncio
import json
from pathlib import Path

from mcp.server.lowlevel import Server
import mcp.server.stdio
from mcp import types

HERE = Path(__file__).parent
TOOLS_DIR = HERE / "tools"
STATUS_TOOL = "toolforge_status"
OPERATE_TOOL = "operate_app"
OPERATE_STATUS_TOOL = "operate_status"

server = Server("toolforge")


def _vision_key_present() -> bool:
    """True if any provider in the vision chain has a key — without importing pyautogui."""
    try:
        import config
        return any(
            (config.PROVIDERS.get(n) or {}).get("api_key") for n in config.VISION_CHAIN
        )
    except Exception:
        return False


def load_tools() -> dict:
    """Load every tools/*.tool.json. Re-read on each call so new tools appear live."""
    tools: dict = {}
    if TOOLS_DIR.exists():
        for p in sorted(TOOLS_DIR.glob("*.tool.json")):
            try:
                t = json.loads(p.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError):
                continue  # skip a malformed/locked file rather than crash the server
            if isinstance(t, dict) and t.get("name"):
                tools[t["name"]] = t
    return tools


@server.list_tools()
async def list_tools() -> list[types.Tool]:
    out = [
        types.Tool(
            name=STATUS_TOOL,
            description=(
                "Check that ToolForge is running and list the legacy-app tools it can call. "
                "Safe: does not touch the GUI."
            ),
            inputSchema={"type": "object", "properties": {}, "additionalProperties": False},
        ),
        types.Tool(
            name=OPERATE_STATUS_TOOL,
            description=(
                "Report whether the live-operation crew is ready (is a vision LLM key configured?). "
                "Safe: does not touch the GUI or call any model."
            ),
            inputSchema={"type": "object", "properties": {}, "additionalProperties": False},
        ),
        types.Tool(
            name=OPERATE_TOOL,
            description=(
                "Operate the live app to accomplish a goal described in plain English, using a "
                "self-healing crew of AI agents (plan -> look at the screen -> act -> verify, each "
                "step). Use this when no recorded tool fits, or to do a one-off task. The target app "
                "must be OPEN and visible on this machine. Set dry_run=true to preview the plan + "
                "first action without touching anything. Destructive actions (delete/send/submit) "
                "require allow_destructive=true. Needs a vision LLM key (see operate_status)."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "goal": {"type": "string", "description": "What to accomplish, in plain English."},
                    "app_hint": {"type": "string", "description": "Optional window-title fragment to focus first."},
                    "save_as": {"type": "string", "description": "Optional: on success, save the steps as this recording name for later synthesis into a reusable tool."},
                    "dry_run": {"type": "boolean", "description": "Plan + propose the first action only; execute nothing.", "default": False},
                    "allow_destructive": {"type": "boolean", "description": "Permit delete/send/submit/pay-type actions.", "default": False},
                    "max_steps": {"type": "integer", "description": "Hard cap on steps (default 25).", "default": 25},
                },
                "required": ["goal"],
                "additionalProperties": False,
            },
        ),
    ]
    for t in load_tools().values():
        desc = t.get("description") or f"Run the '{t['name']}' workflow on the live legacy app."
        out.append(
            types.Tool(
                name=t["name"],
                description=desc + " (Replays on the live app — the target app must be open and focused on this machine.)",
                inputSchema=t.get("parameters") or {"type": "object", "properties": {}},
            )
        )
    return out


@server.call_tool()
async def call_tool(name: str, arguments: dict | None) -> list[types.TextContent]:
    args = arguments or {}

    # Safe liveness/inventory tool — never touches the GUI.
    if name == STATUS_TOOL:
        tools = load_tools()
        payload = {
            "status": "ok",
            "server": "toolforge",
            "tools_dir": str(TOOLS_DIR),
            "available_tools": list(tools.keys()),
            "live_operation": OPERATE_TOOL,
            "hint": 'Record a tool: python record.py <name> "<goal>" then python synthesize.py <name>. '
                    f'Or operate live with the {OPERATE_TOOL} tool.',
        }
        return [types.TextContent(type="text", text=json.dumps(payload, indent=2))]

    # Safe readiness check for the live crew — no GUI, no model call.
    if name == OPERATE_STATUS_TOOL:
        ready = _vision_key_present()
        payload = {
            "status": "ok",
            "live_operation_ready": ready,
            "note": ("vision LLM key detected — operate_app can run" if ready
                     else "no vision LLM key configured — set OPENAI_API_KEY (or a provider in VISION_CHAIN) in .env"),
            "reminder": "The target app must be open and visible when operate_app is called.",
        }
        return [types.TextContent(type="text", text=json.dumps(payload, indent=2))]

    # Live self-healing operation — lazy-import so the server still starts/lists without pyautogui.
    if name == OPERATE_TOOL:
        try:
            import agent_loop
            result = agent_loop.operate(
                goal=args["goal"],
                app_hint=args.get("app_hint"),
                save_as=args.get("save_as"),
                dry_run=bool(args.get("dry_run", False)),
                allow_destructive=bool(args.get("allow_destructive", False)),
                max_steps=int(args.get("max_steps", 25)),
            )
        except KeyError:
            result = {"status": "error", "error": "missing required field 'goal'"}
        except Exception as e:
            result = {"status": "error", "tool": OPERATE_TOOL, "error": str(e)}
        return [types.TextContent(type="text", text=json.dumps(result, indent=2))]

    tools = load_tools()
    tool = tools.get(name)
    if tool is None:
        avail = ", ".join(tools.keys()) or "(none recorded yet)"
        return [types.TextContent(
            type="text",
            text=json.dumps({"status": "error", "error": f"unknown tool '{name}'. Available: {avail}"}),
        )]

    # Import the GUI executor lazily: the server can start + list + report status even on a
    # machine without pyautogui/a display. pyautogui is only needed to actually replay.
    try:
        import executor
        result = executor.run(tool, args)
    except Exception as e:  # GUI/import errors — report, never crash the server
        return [types.TextContent(
            type="text",
            text=json.dumps({"status": "error", "tool": name, "error": str(e)}),
        )]
    return [types.TextContent(type="text", text=json.dumps(result, indent=2))]


async def main():
    async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())


if __name__ == "__main__":
    asyncio.run(main())
