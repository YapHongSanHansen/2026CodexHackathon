# How to use this — ToolForge hackathon skeleton

A runnable skeleton that powers ToolForge's engine with **two providers for reliability** —
OpenAI plus GrafiLab (OpenAI-compatible: Gemini/Qwen/GLM) — and ships the result as an
**MCP server / Claude Code plugin**.

- **Engine** = a vision step (reads the screen) + a text step (synthesizes the tool). Each step
  tries a primary provider and **falls back to the other** if it errors or runs out of credit.
- **Default routing (accuracy-first):** vision → OpenAI `gpt-4o` (best GUI control); text →
  GrafiLab `glm-5.2` (cheap). Reconfigurable in `.env` (`VISION_CHAIN` / `TEXT_CHAIN`).
- **Output** = a model-agnostic MCP tool (works in Claude Code, Cursor, anything).

**Pipeline:** `record` (vision) → `synthesize` (text) → `serve` (REST + MCP) → `demo` in Claude Code

```
record.py ──► workflows/create_invoice.json ──► synthesize.py ──► tools/create_invoice.tool.json
                                                                          │
                                                            ┌─────────────┴─────────────┐
                                                         api.py (REST+key)       mcp_server.py (MCP)
                                                                                        │
                                                                          Claude Code plugin (this folder)
```

---

## 0. One-time setup (PowerShell)

```powershell
cd C:\Users\yapho\CodexHackathon\toolforge
python -m venv .venv; .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `.env` with both keys (copy from `.env.example`):

| Var | What |
|---|---|
| `OPENAI_API_KEY` | your key from https://platform.openai.com/api-keys |
| `GRAFILAB_API_KEY` | your GrafiLab key |
| `GRAFILAB_BASE_URL` | GrafiLab's OpenAI-compatible base URL (`https://api.grafilab.ai/v1`) |
| `OPENAI_VISION_MODEL` / `OPENAI_TEXT_MODEL` | OpenAI model ids (default `gpt-4o`; vision must accept images) |
| `GRAFILAB_VISION_MODEL` / `GRAFILAB_TEXT_MODEL` | GrafiLab model ids — **confirm exact ids with `check_models.py`** |
| `VISION_CHAIN` / `TEXT_CHAIN` | provider order per capability (default `openai,grafilab` / `grafilab,openai`) |
| `TOOLFORGE_API_KEY` | any secret string; REST callers send it as `x-api-key` (NOT an LLM key) |

> Confirm what each key can access (especially whether GrafiLab has a **vision** model):
> `python check_models.py` lists model IDs for **both** providers. If GrafiLab has no vision model,
> set `VISION_CHAIN=openai` (vision = OpenAI only).

---

## 1. Record a workflow  *(uses the VISION model)*

Open your target legacy app first. Then:

```powershell
python record.py create_invoice "Create a new invoice for a customer with line items" 40
```

- The vision model sees a screenshot each step and returns one action; pyautogui executes it.
- `40` = hard step cap (**protects your credit**). Slam the mouse into a screen corner to abort.
- Output: `workflows\create_invoice.json`.
- **Pick ONE short, stable workflow (6–10 actions).** Depth over breadth.

## 2. Synthesize a typed tool  *(uses the TEXT model)*

```powershell
python synthesize.py create_invoice
```

- Turns the raw steps into a parameterized tool: name, description, JSON-Schema parameters,
  and `{{placeholders}}` in the type-steps.
- Output: `tools\create_invoice.tool.json` — **open it and sanity-check** the parameters/placeholders.

## 3. Serve it as a REST API (with a key)

```powershell
uvicorn api:app --port 8000
```

Call it (target app must be open/focused):

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:8000/tools/create_invoice `
  -Headers @{ "x-api-key" = "dev-secret-key" } `
  -ContentType "application/json" `
  -Body '{"customer":"Acme Sdn Bhd","items":"10x Widget"}'
```

That's your "callable REST API + key" deliverable.

## 4. Serve it as an MCP server

```powershell
python mcp_server.py
```

## 5. Demo it as a Claude Code plugin  *(the winning moment)*

This folder is already a plugin **and** a marketplace. In Claude Code:

```
/plugin marketplace add C:\Users\yapho\CodexHackathon\toolforge
/plugin install toolforge@toolforge-dev
```

> The plugin runs `python mcp_server.py`. Make sure that `python` has the deps installed
> (`fastmcp`, `pyautogui`). If you used the venv, edit `.mcp.json` → `"command"` to point at
> `.venv\Scripts\python.exe` so Claude Code uses the right interpreter.

Then, with the legacy app open, ask Claude Code:

> "Create an invoice for Acme Sdn Bhd, 10x Widget."

Claude calls the `create_invoice` MCP tool → ToolForge replays the workflow on the live legacy
app → a structured result comes back. **A no-API desktop app, called by an AI agent.**

## 6. The pitch line to land

> "We studied a no-API desktop app **once** and turned it into a stable, named tool any agent can
> call — REST **and** MCP — powered by open models. Re-run it after a UI tweak and it still works:
> a **durable artifact**, not a brittle script."

---

## Which model does what

| Step | Primary | Fallback |
|---|---|---|
| record (see screen, decide clicks) | OpenAI `gpt-4o` (vision) | GrafiLab vision model |
| synthesize (steps → tool) | GrafiLab `glm-5.2` (text) | OpenAI `gpt-4o` |
| serve / demo | none (FastAPI + FastMCP) | — |

## Honest caveats (say these before a judge does)

- Vision models are **flakier at pixel-precise GUI control** than at most tasks — scope to one
  clean workflow, rehearse it, and keep the recorded `workflows/*.json` as a fallback if live
  recording wobbles.
- Replay here is **coordinate-based** (brittle if windows move). The **self-healing** layer
  (re-ground via vision on every run instead of replaying fixed coordinates) is the real product
  wedge — and a great V2 to demo if time allows.
- Everything runs **locally**; the app must be open and focused when a tool is called.
