# ToolForge — Handoff

> **For whoever picks this up next (future you, a teammate, or an AI session).** Snapshot of what
> ToolForge is, what's built, what's verified, and what's left. Last updated 2026-06-26.

---

## TL;DR — current status

- **Direction is decided:** ToolForge ships as an **installable plugin / MCP server** that drops into
  **Codex and Claude Code**. Install once → your recorded legacy-app tools appear in the agent → the
  agent calls them → they replay on the real app. (The "Composio shape", but for apps with **no API**.)
- **The real product is the Python engine** (`record → synthesize → serve`). It works.
- **The TypeScript "Conversion Studio" dashboard is a *simulated* demo and is parked** (kept for its
  visuals/pitch, not part of the plugin direction).
- **Biggest recent change:** `mcp_server.py` was rewritten to be **dynamic** (serves every recorded
  tool, no hardcoded `create_invoice`). It is **API-verified but NOT yet runtime-verified** — the
  smoke test still needs to run (see "Left to do").
- **No tools recorded yet** (`tools/` is empty), so the server currently exposes only the safe
  `toolforge_status` tool. Recording the first real tool is the next milestone.

---

## What ToolForge is

A way to turn legacy/desktop software that has **no API, no docs, no source** into a **callable tool**
any AI agent can use. You demonstrate a workflow once; a vision model records the steps; a text model
turns them into a named, parameterized tool; it's served over **REST + MCP**; calling it **replays the
actions on the live app**.

- Source-of-truth spec: `OneDrive/文档/Entrepreneurship and small business/ToolForge/ToolForge-Spec.md`
- Positioning: see [`docs/ToolForge-vs-Composio.md`](docs/ToolForge-vs-Composio.md) — *"Composio for the
  software Composio can't touch."*
- Full vision + diagrams: [`docs/ToolForge-Vision.md`](docs/ToolForge-Vision.md)

---

## Two stacks in this folder

| Stack | Files | Status |
|---|---|---|
| **Python engine** (the real product, the plugin) | `record.py`, `synthesize.py`, `executor.py`, `api.py`, `mcp_server.py`, `llm.py`, `config.py`, `check_models.py` | **Active direction.** Works (engine); plugin needs runtime verification |
| **TS "Conversion Studio"** (simulated demo) | `client/`, `server/`, `shared/` | **Parked.** Pretty, but fake data; not part of the plugin path |

---

## Repo map (Python engine)

```
record.py        Vision model drives the live app (pyautogui) and logs steps -> workflows/<name>.json
synthesize.py    Text model turns a recording into a typed tool          -> tools/<name>.tool.json
executor.py      Replays a tool's steps on the live app (substitutes {{params}})
api.py           FastAPI REST server: POST /tools/{name} (x-api-key) -> replays  (uvicorn api:app)
mcp_server.py    MCP server (stdio): serves ALL tools/*.tool.json dynamically + toolforge_status
llm.py           Provider-routing LLM client with cross-provider FAILOVER
config.py        Providers, model ids, fallback chains, keys
.claude-plugin/  Claude Code plugin packaging (plugin.json, marketplace.json)
.mcp.json        Plugin entry: runs `python mcp_server.py`
skills/toolforge/SKILL.md   Tells the agent when to call ToolForge tools
docs/            INSTALL-plugin.md, install/codex-config.toml, vision + composio docs, diagrams/
scripts/mcp_py_smoke.py     Terminal smoke test for the MCP server
setup.ps1        One-time: venv + deps + .env
```

The MCP server **only replays** tools → it needs **no LLM key**. Keys are only for `record.py` /
`synthesize.py`.

---

## How to run

### One-time setup
```powershell
cd C:\Users\yapho\CodexHackathon\toolforge
./setup.ps1     # creates .venv, installs requirements.txt, seeds .env
```
(Already done this session: `.venv` exists, deps installed incl. `mcp 1.28.0`, `pyautogui`, `openai`.)

### Install the plugin in an agent — see [`docs/INSTALL-plugin.md`](docs/INSTALL-plugin.md)
- **Codex:** add `[mcp_servers.toolforge]` to `~/.codex/config.toml` (template:
  [`docs/install/codex-config.toml`](docs/install/codex-config.toml)) → "use the toolforge_status tool".
- **Claude Code:** `/plugin marketplace add <this folder>` → `/plugin install toolforge@toolforge-dev`
  → "run the toolforge_status tool".

### Record a real tool (uses your key + a live app)
```powershell
.\.venv\Scripts\python.exe record.py create_invoice "Create a new invoice for a customer with line items"
.\.venv\Scripts\python.exe synthesize.py create_invoice
```
The new tool then appears in the agent automatically (the server re-reads `tools/` per request).

---

## LLM providers (the `llm.py` router)

Two providers, both via the OpenAI SDK, with **per-capability failover chains** (`config.py`):
- **vision** chain: `openai` → `grafilab` (OpenAI best at GUI control)
- **text** chain: `grafilab` → `openai` (GrafiLab cheaper for synthesis)
- Any error (network/timeout/4xx/5xx/refusal/empty) fails over to the next provider; a dead key is
  circuit-broken for the run. Configure in `.env` (`OPENAI_API_KEY`, `GRAFILAB_*`, `VISION_CHAIN`,
  `TEXT_CHAIN`, model ids).

⚠️ **GrafiLab caveat:** the default `GRAFILAB_BASE_URL=https://api.grafilab.ai/v1` **does not resolve
(DNS)**. Until the real endpoint + exact model ids are set (from the GrafiLab dashboard), GrafiLab is
skipped on connection error and **everything runs on OpenAI** — which works. Run `check_models.py` to
list a provider's model ids.

---

## Status: done vs. left

**Done**
- Python engine works (record/synthesize/executor/api).
- `llm.py` dual-provider failover + `config.py` registry; `record.py`/`synthesize.py` use it.
- `mcp_server.py` made **dynamic** (all `tools/*.tool.json` + `toolforge_status`); hardcoded single
  tool removed. *API-verified against `mcp 1.28.0`.*
- `requirements.txt` → low-level `mcp` SDK; `setup.ps1`; `scripts/mcp_py_smoke.py`.
- Per-agent install docs (Codex + Claude Code); generalized `SKILL.md`; `marketplace.json` de-"demo".
- venv created + deps installed.
- Vision + Composio docs with diagrams.

**Left to do**
1. **Runtime-verify the MCP server** (was blocked mid-session): 
   ```powershell
   .\.venv\Scripts\python.exe scripts\mcp_py_smoke.py
   ```
   Expect `TOOLS/LIST -> 1 tool(s): toolforge_status` + a JSON status. Fix `mcp_server.py` if needed.
2. **Record the first real tool** (`tools/` is empty) to prove the end-to-end loop in an agent.
3. **Resolve GrafiLab** endpoint + model ids, or keep running OpenAI-only.
4. **Doc drift:** `HOW-TO-USE.md` still describes the OLD single-tool / FastMCP flow — update it to point
   at `docs/INSTALL-plugin.md` and the dynamic server.
5. **`.mcp.json`** uses `command: "python"`; point it at `.venv\Scripts\python.exe` for reliability.
6. *(Optional)* an `npx toolforge` wrapper for a "node.js-feel" install (thin Node launcher → Python).

---

## Known caveats

- **GUI replay is coordinate-based** → brittle if windows move/resize. The target app must be **open and
  focused** on the machine running the server. Self-healing replay (re-look at the screen each run) is
  the planned V2.
- **TS dashboard** legacy store is global across projects (a demo simplification) — but the TS stack is
  parked, so it doesn't matter for the plugin direction.

---

## Reference docs

- Vision + diagrams: [`docs/ToolForge-Vision.md`](docs/ToolForge-Vision.md)
- Composio positioning: [`docs/ToolForge-vs-Composio.md`](docs/ToolForge-vs-Composio.md)
- Install guide: [`docs/INSTALL-plugin.md`](docs/INSTALL-plugin.md)
- Engine's own guide (note: pre-plugin, needs the update above): `HOW-TO-USE.md`
- Build/finish plan: `C:\Users\yapho\.claude\plans\sharded-scribbling-mountain.md`
