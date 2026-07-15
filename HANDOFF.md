# HalalBoleh — Team Handoff

> **Status: v2 complete and working end-to-end.** This repo started as AMANA (JamAI Base
> hackathon build) and has been fully migrated to a new stack, rebuilt around an
> evidence-based certification journey, given an AI copilot agent, restyled, and rebranded
> to **HalalBoleh**. This document is the single source of truth for what exists, how it
> works, how to run it, and what's left.

---

## 1. What HalalBoleh does

An AI copilot that walks a Malaysian SME through JAKIM halal certification (MPPHM 2020):

1. **Evidence Locker** (`/journey/evidence`) — upload business documents (SSM profile,
   ingredient list, supplier certs, flow chart, training certs, halal policy, pest control
   contract, kitchen photos). Each upload is **analyzed instantly by AI**: facts extracted
   (names, cert numbers, expiry dates), problems flagged (expired certs, unknown-status
   ingredients).
2. **Gap Report** (`/journey/gaps`) — a structured MPPHM 2020 rubric (8 weighted
   requirements in [lib/rubric/mpphm-2020.json](lib/rubric/mpphm-2020.json)) is checked
   against the evidence. Each requirement gets `pass / warn / fail / missing` with reasons,
   fix actions, and cited document ids. The **readiness score is computed in code** from
   weighted verdicts (not by the LLM), plus an AI "next best action".
3. **IHCS Drafts** (`/journey/drafts`) — AI drafts the 7-chapter IHCS manual from the
   approved HTML template. Every business-specific claim carries a **citation to an
   evidence file**; unknown facts become `[MAKLUMAT DIPERLUKAN: …]` placeholders — never
   invented. BM and EN supported. User approves chapter by chapter.
4. **Audit Pack** (`/journey/pack`) — one click bundles a zip: IHCS manual **PDF** (via the
   original Puppeteer template pipeline), `gap-report.md`, `evidence-index.md` (with
   provenance), and the original uploads. Ready for the MYeHALAL process.
5. **Copilot panel** (on all journey pages) — a `ToolLoopAgent` chat assistant, trilingual
   (EN/BM/Manglish), with **voice input** (ElevenLabs Scribe). It can inspect evidence,
   read/run gap analysis, search the curated knowledge base, verify supplier certs against
   public records (Exa), research ingredients, and draft chapters — all with strict
   citation rules.
6. **Dashboard** (`/`) — readiness score ring, next best action, live step progress.

---

## 2. Stack & keys

| Concern | Service | Notes |
|---|---|---|
| LLM / OCR / vision | **Grafilab** (OpenAI-compatible) | Base URL `https://console-api.grafilab.ai/api/oai/v1` (extracted from their console app — not in their public docs) |
| Web verification + RAG feeder | **Exa** | Live cert verification + knowledge ingestion |
| Voice (STT, TTS-capable) | **ElevenLabs** | Scribe STT wired in; TTS verified working but not wired |
| Framework | Next.js 14 App Router + **Vercel AI SDK v6** (`ai`, `@ai-sdk/react`, `@ai-sdk/openai-compatible`) | |

All keys live in `.env.local` (gitignored — **get values from Eriol**, never commit):

```env
GRAFILAB_API_KEY=…
GRAFILAB_BASE_URL=https://console-api.grafilab.ai/api/oai/v1
AI_MODEL=grafilab/glm-5.2            # copilot agent, gap engine, drafting
AI_MODEL_FAST=grafilab/glm-5-turbo   # classification, RAG query expansion
AI_MODEL_OCR=grafilab/glm-ocr        # scanned certificates / PDFs
AI_MODEL_VISION=grafilab/qwen3-vl-plus # kitchen photos, labels
EXA_API_KEY=…
ELEVENLABS_API_KEY=…                 # scoped key: STT/TTS work, account reads don't
```

Every model role is an env-var swap. Catalog highlights if you want to experiment:
`ilmu/ilmu-v3.1` + `ilmu-vision-v1.3` (Malaysian LLM — strong BM/Manglish), DeepSeek v4,
Gemini 3.x. List models: `GET {base}/models` with the bearer key.

### ⚠ Grafilab quirk you MUST know

Grafilab **accepts but ignores** OpenAI's `response_format: json_schema` (returns prose),
but its **tool calling follows JSON schemas faithfully**. So all structured output goes
through [lib/ai/structured.ts](lib/ai/structured.ts) — it forces a `submit` tool call with
the zod schema and validates + retries once. **Never use `generateObject`/`Output.object`
directly against Grafilab** — use `generateStructured()`.

---

## 3. How to run

```bash
npm install
# get .env.local from Eriol (see §2)
npm run dev                        # http://localhost:3000 (or auto-assigned port)
node scripts/ingest-knowledge.mjs  # (re)build the RAG knowledge base — run once, then weekly
npx tsc --noEmit                   # typecheck
```

- App state (uploads, extracted facts, gap reports, drafts, knowledge chunks) lives in
  `/data` — gitignored JSON files. Delete the folder to reset the demo.
- Generated packs land in `public/generated/pack/`.

---

## 4. Code map

```
lib/
  ai/
    model.ts        ← provider layer: THE only place models are configured
    structured.ts   ← structured output via forced tool call (see §2 quirk)
    analyze.ts      ← document → facts extraction (OCR/vision/text paths)
    gaps.ts         ← rubric gap engine; weighted score computed in code
    draft.ts        ← IHCS chapter drafting: generate → critic → revise loop
    copilot.ts      ← the ToolLoopAgent (8 tools) + CopilotUIMessage type
    exa.ts          ← Exa search helpers (cert records, ingredient sources)
  rag/knowledge.ts  ← BM25 (MiniSearch) retrieval + LLM query expansion
  rubric/mpphm-2020.json ← the 8 MPPHM requirements (edit here to tune audits)
  ihcs/chapters.ts  ← 7 chapter definitions mirroring the HTML template
  evidence/store.ts ← JSON-file persistence: documents, gap reports, drafts
  pack/compile.ts   ← audit pack zip: template→PDF (Puppeteer) + reports + evidence

app/
  page.tsx                    ← dashboard (server component, reads store directly)
  journey/{evidence,gaps,drafts,pack}/page.tsx
  journey/layout.tsx          ← mounts CopilotPanel on all journey pages
  api/evidence|gaps|drafts|pack|copilot|voice/stt/route.ts

components/
  JourneyShell.tsx  ← shared header + step rail + page transitions
  CopilotPanel.tsx  ← chat UI: streaming, rich tool cards, mic, mobile drawer

scripts/ingest-knowledge.mjs  ← Exa → chunks → data/knowledge.json
templates/ihcs/manual-template.html ← the APPROVED manual template (do not restructure)
```

Design system: `v2-*` utility classes in [app/globals.css](app/globals.css)
(`v2-card`, `v2-btn-primary`, `v2-chip`, …). Brand: cream `#F5F1E8`, lime `#C5E86C`,
forest `#2D4A3E`; Playfair Display for titles, Inter for body.

---

## 5. How the AI pieces work (verified behaviors)

**Document analysis** — on upload, `analyzeDocument` extracts structured facts. Verified:
caught a deliberately expired supplier cert ("expired 4 months ago — CRITICAL") and an
ingredient with unknown halal status, unprompted.

**Gap engine** — one structured call evaluates all 8 requirements against extracted facts.
Verified: expired cert → FAIL on Seksyen 4.3, incomplete ingredient list → WARN on 4.2,
six absent doc types → MISSING; score 9%; sensible next-best-action.

**Drafting (generator–critic)** — draft → adversarial critique (coverage, citations,
register, invented facts) → one revision. Verified: the critic caught a claim contradicting
evidence, missing inline citations, and an inappropriate word ("didakwa") — all fixed in
revision. Chapter output had 11 valid citations and 5 honest missing-info placeholders.
Citations pointing at non-existent files are dropped in code.

**Copilot** — 8 tools: `listEvidence`, `getGapReport` (cheap), `runGapAnalysis` (slow),
`searchKnowledge` (RAG-first for procedure questions), `verifyCertificate` (Exa),
`checkIngredient` (Exa), `listDrafts`, `draftSection`. Verified: for a fictional supplier
it honestly reported "no direct JAKIM listing found" and explained that a website's
self-claim ≠ a verified certificate. Asked "Apa itu sertu?" in BM, it searched the
knowledge base and cited JAKIM's actual Garis Panduan Sertu PDF.

**RAG** — 157 chunks from 25 sources (JAKIM portal, MPPHM materials). BM25 was chosen
deliberately: Grafilab has **no embeddings endpoint**, and at this corpus size keyword
retrieval + query expansion ("got pork anot?" → babi, khinzir, porcine…) performs fine.
Every chunk carries `sourceUrl` + `fetchedAt` so citations are provenance-honest.

**Voice** — mic button → MediaRecorder → `/api/voice/stt` → ElevenLabs Scribe →
transcript sent as a chat message. Verified with real audio.

---

## 6. Known caveats & gotchas

1. **Latency**: gap analysis ~1–4 min; a chapter draft 2–4 min (GLM-5.2 is a reasoning
   model × 3 passes). UI shows staged progress. Quick win: move the critic pass to
   `AI_MODEL_FAST`.
2. **Port 3000**: `.claude/launch.json` has `autoPort: true` — dev server may land on a
   random port if 3000 is busy.
3. **Verification is best-effort**: JAKIM's directory has no public API; Exa searches
   public records. The agent is instructed to say "based on public records as of today".
   Final authority is JAKIM — the footer says so.
4. **Persistence is demo-grade**: JSON files in `/data`, single-tenant, no auth. For
   multi-user: swap `lib/evidence/store.ts` for a DB (interfaces are contained).
5. **ElevenLabs key is permission-scoped**: STT/TTS work; `user_read`/`voices_read` don't.
6. **pdf-parse v2 API**: use `new PDFParse({data}).getText()`, not the old default export.
7. **Old JamAI code is deleted** (pages, routes, libs, `jamaibase` pkg). The README at repo
   root is **stale** — it still documents the JamAI architecture. Rewrite pending.

---

## 7. Suggested next steps

- [ ] Rewrite `README.md` for the new stack + rebrand (screenshots, setup, architecture)
- [ ] Git commit the v2 work in logical chunks (everything is currently uncommitted)
- [ ] TTS replies in the copilot (ElevenLabs verified working — just wire it)
- [ ] Weekly knowledge refresh: Vercel Cron route calling the ingest logic
- [ ] Speed: critic pass on `glm-5-turbo`; consider `ilmu` models for BM voice/tone
- [ ] Real DB + auth for multi-tenant (Phase 2 roadmap from the original README)
- [ ] Deploy to Vercel (note: Puppeteer needs `@sparticuz/chromium` or a queue on serverless)

---

*This doc replaced the original `MIGRATION_PLAN.md` once every phase in it shipped.
Built July 14–15, 2026.*
