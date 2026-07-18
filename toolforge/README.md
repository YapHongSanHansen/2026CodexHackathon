# ToolForge — Conversion Studio (Working Prototype)

> Turn legacy software with **no API, no docs, no source access** into a callable **REST API + MCP server**, via an autonomous **4-group AI-agent pipeline** with a human-in-the-loop validation gate.

This repo is a runnable MVP of the ToolForge concept. It demonstrates the full flow on a fictional
legacy app — **Sage UBS Accounting v9** (a keyboard-driven 1990s Windows accounting program with no
programmatic interface) — and produces a live REST API + an MCP server other AI agents can call.

## What it shows

```
 screenshots + recordings ─► (A) Vision/OCR  ─► mock-spec.md      ┐
 live app (sandbox VM)    ─► (B) Interaction ─► behavior-spec.md  ├─► (D) Synthesis ─► REST API + key
 network + UI states      ─► (C) Observation ─► internal-spec.md  ┘        + human gate    + MCP server
```

- **Conversion Studio** dashboard with live pipeline progress, artifact viewer, human-review gate,
  and a test playground.
- A real **pipeline orchestrator** (Groups A/B/C/D) that streams progress over SSE and writes the
  `.md` artifacts.
- **Group D** generates an OpenAPI 3.0 spec, a working REST API (API-key auth), an MCP manifest,
  and auto-docs.
- A standalone **MCP server** that exposes the generated tools so Claude / any MCP client can call
  the once-stranded legacy app.

## Run it

```bash
# from the repo root
npm install
npm run dev
```

- Dashboard: http://localhost:5173
- API/control plane: http://localhost:8787

Click **Run pipeline**, watch A→B→C→D complete, **Approve** the endpoints, then try a call in the
**Test Playground**.

### Connect the generated MCP server

After a project is deployed, the dashboard shows the exact command, e.g.:

```bash
npm run mcp -- --project <projectId> --server http://localhost:8787 --key <apiKey>
```

This launches an stdio MCP server you can register in Claude Desktop / Claude Code.

### Optional: live mode (real OpenAI calls)

The pipeline runs in **demo mode** out of the box (no API key needed). To let the agent groups call
OpenAI for real:

1. Put your key in `.env` at the repo root (copy `.env.example` → `.env`):

   ```
   OPENAI_API_KEY=sk-proj-...
   OPENAI_MODEL=gpt-4o   # optional; defaults to gpt-4o
   ```

2. Install deps (pulls in the `openai` SDK) and run:

   ```bash
   npm install
   npm run dev
   ```

Then create a project with `mode: "live"`. `openai` is a declared dependency; if it is missing
for any reason the pipeline safely falls back to demo mode. The same root `.env` is shared with the
Python engine.

## Architecture

| Path | Owner | What |
|------|-------|------|
| `shared/` | contract | Shared TS types + the sample legacy-app fixtures |
| `server/src/store.ts` | runtime | In-memory project registry |
| `server/src/pipeline/` | Group A/B/C/D | Orchestrator + agent groups + LLM adapter |
| `server/src/generators/` | Group D | OpenAPI / MCP / docs builders, endpoint synthesis |
| `server/src/legacy/` | sim | In-memory store standing in for the live legacy app |
| `server/src/generated-api/` | output | The generated REST API (api-key auth) |
| `server/src/index.ts` | integration | Express wiring + SSE + control routes |
| `server/mcp-server/` | output | Standalone MCP server (stdio) |
| `client/` | UI | Conversion Studio dashboard (React + Vite + Tailwind) |

## Note on scope

This is a prototype: the "legacy app" is simulated by an in-memory data store so the demo runs
self-contained. The pipeline, artifact generation, REST API, MCP manifest, and MCP server are all
real and runnable. Group C uses **observational** methods only (no binary decompilation), matching
the spec's compliance-first design.
