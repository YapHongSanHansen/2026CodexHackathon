"""
REST API exposing generated tools. Each call replays the recorded steps on the LIVE app
(which must be open/focused on this machine), substituting parameters.

Run:   uvicorn api:app --port 8000
"""
import json
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException, Request

import config
import executor

app = FastAPI(title="ToolForge")


def load_tool(name):
    p = Path("tools") / f"{name}.tool.json"
    if not p.exists():
        raise HTTPException(404, f"no tool '{name}' — run synthesize.py first")
    return json.loads(p.read_text())


@app.get("/tools")
def list_tools():
    return [p.name.replace(".tool.json", "") for p in Path("tools").glob("*.tool.json")]


@app.post("/tools/{tool_name}")
async def run_tool(tool_name: str, request: Request, x_api_key: str = Header(None)):
    if x_api_key != config.TOOLFORGE_API_KEY:
        raise HTTPException(401, "bad or missing x-api-key")
    args = await request.json()
    tool = load_tool(tool_name)
    return executor.run(tool, args)
