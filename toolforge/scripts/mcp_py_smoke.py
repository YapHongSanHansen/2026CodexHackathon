"""
Smoke-test the ToolForge MCP server over real MCP/stdio (no agent needed).
Lists the exposed tools and calls the safe `toolforge_status` tool.

Run from the repo root:  .\.venv\Scripts\python.exe scripts\mcp_py_smoke.py
"""
import asyncio
import sys
from pathlib import Path

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

ROOT = Path(__file__).resolve().parent.parent
SERVER = str(ROOT / "mcp_server.py")


async def main() -> int:
    params = StdioServerParameters(command=sys.executable, args=[SERVER], cwd=str(ROOT))
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            listed = await session.list_tools()
            names = [t.name for t in listed.tools]
            print(f"TOOLS/LIST -> {len(names)} tool(s): {', '.join(names)}")

            res = await session.call_tool("toolforge_status", {})
            text = res.content[0].text if res.content else "(no content)"
            print("TOOLS/CALL toolforge_status ->")
            print(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
