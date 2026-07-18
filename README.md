# HalalBoleh — AI Copilot for JAKIM Halal Certification

> **Empowering Malaysian SMEs with affordable, intelligent halal compliance technology**

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![Vercel AI SDK](https://img.shields.io/badge/Vercel_AI_SDK-v6-000000)](https://sdk.vercel.ai/)
[![Grafilab](https://img.shields.io/badge/Grafilab-LLM%2FOCR%2FVision-4CAF50)](https://grafilab.ai/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## SLIDES LINK
https://www.canva.com/design/DAG5KB75PwE/pYzvfDQ8524BDjRDIAS-8A/edit?utm_content=DAG5KB75PwE&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton

## DEMO VIDEO
https://drive.google.com/drive/folders/1hUwKkKSlQoQfq2QeR_T6VXTn4P4KaC7P?usp=sharing

---

## 🎯 The Challenge

Malaysian SMEs face **three critical barriers** when pursuing JAKIM Halal Certification:

1. **💰 Budget Constraints** — Hiring halal consultants costs **RM5,000–15,000**, beyond reach for small businesses
2. **📄 Complex Documentation** — MPPHM 2020 requires 50+ pages of formal documentation in Bahasa Malaysia
3. **🌐 Language Barriers** — Many business owners prefer **Manglish** (Malaysian English) over formal Bahasa Malaysia

**The Result?**
- 73.5% of JAKIM audit failures are due to **incomplete documentation**
- SMEs wait 6–12 months for certification due to **repeated submissions**
- Malaysian food businesses lose competitive advantages in regional markets

---

## 💡 Our Solution

**HalalBoleh** is an AI copilot that walks an SME through the entire JAKIM certification journey (MPPHM 2020) — from raw documents to a submission-ready audit pack. It is **evidence-based**: every AI claim is tied to a document the business actually uploaded, and unknown facts become honest placeholders rather than invented content.

### 🗂️ 1. Evidence Locker — `/journey/evidence`
Upload business documents (SSM profile, ingredient list, supplier certs, flow chart, training certs, halal policy, pest control contract, kitchen photos). Each upload is **analyzed instantly by AI** — facts extracted (names, cert numbers, expiry dates) and problems flagged (expired certs, unknown-status ingredients).

### 📊 2. Gap Report — `/journey/gaps`
A structured MPPHM 2020 rubric (8 weighted requirements) is checked against the evidence. Each requirement gets `pass / warn / fail / missing` with reasons, fix actions, and cited document ids. The **readiness score is computed in code** from weighted verdicts (not by the LLM), plus an AI "next best action".

### 📚 3. IHCS Drafts — `/journey/drafts`
AI drafts the 7-chapter IHCS manual from an approved HTML template. Every business-specific claim carries a **citation to an evidence file**; unknown facts become `[MAKLUMAT DIPERLUKAN: …]` placeholders — never invented. Uses a **generate → critic → revise** loop. BM and EN supported. User approves chapter by chapter.

### ✅ 4. Audit Pack — `/journey/pack`
One click bundles a zip: IHCS manual **PDF** (Puppeteer template pipeline), `gap-report.md`, `evidence-index.md` (with provenance), and the original uploads — ready for the MYeHALAL process.

### 🤖 5. Copilot Panel — on all journey pages
A tool-using chat agent, trilingual (EN/BM/Manglish), with **voice input** (ElevenLabs Scribe). It can inspect evidence, run gap analysis, search the curated knowledge base, verify supplier certs against public records (Exa), research ingredients, and draft chapters — all with strict citation rules.

### 📈 6. Dashboard — `/`
Readiness score ring, next best action, and live step progress.

---

## 🏗️ Technical Architecture

### Stack & Services

| Concern | Service | Notes |
|---|---|---|
| **LLM / OCR / Vision** | **Grafilab** (OpenAI-compatible) | Copilot agent, gap engine, drafting, document extraction |
| **Web verification + RAG** | **Exa** | Live cert verification + knowledge-base ingestion |
| **Voice (STT)** | **ElevenLabs** | Scribe speech-to-text wired into the copilot |
| **Framework** | Next.js 14 App Router + **Vercel AI SDK v6** | `ai`, `@ai-sdk/react`, `@ai-sdk/openai-compatible` |
| **Retrieval** | MiniSearch (BM25) + LLM query expansion | Grafilab has no embeddings endpoint; keyword retrieval fits the corpus |
| **PDF export** | Puppeteer + jsPDF | Manual & audit-pack generation |
| **Styling** | Tailwind CSS | Organic theme (cream `#F5F1E8`, lime `#C5E86C`, forest `#2D4A3E`) |

### Provider-agnostic AI layer

All models are configured in a single file — [`lib/ai/model.ts`](lib/ai/model.ts). Swapping provider or model is an **env-var change, nothing else**:

- `AI_MODEL` — copilot agent, gap engine, drafting
- `AI_MODEL_FAST` — classification, RAG query expansion
- `AI_MODEL_OCR` — scanned certificates / PDFs
- `AI_MODEL_VISION` — kitchen photos, product labels

> **⚠️ Grafilab quirk:** Grafilab accepts but *ignores* OpenAI's `response_format: json_schema` (returns prose), while its **tool calling follows JSON schemas faithfully**. All structured output therefore goes through [`lib/ai/structured.ts`](lib/ai/structured.ts), which forces a `submit` tool call with a zod schema and validates + retries. **Never use `generateObject` directly against Grafilab** — use `generateStructured()`.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (LTS recommended)
- npm 9+
- API keys for **Grafilab**, **Exa**, and **ElevenLabs**

### Installation

```bash
git clone <your-repo-url>
cd halalboleh
npm install
```

### Environment Configuration

Create a `.env.local` file in the root directory:

```env
# Grafilab (LLM / OCR / vision)
GRAFILAB_API_KEY=sk-grafilab-...
GRAFILAB_BASE_URL=https://console-api.grafilab.ai/api/oai/v1

# Model roles
AI_MODEL=grafilab/glm-5.2             # copilot agent, gap engine, drafting
AI_MODEL_FAST=grafilab/glm-5-turbo    # classification, RAG query expansion
AI_MODEL_OCR=grafilab/glm-ocr         # scanned certificates / PDFs
AI_MODEL_VISION=grafilab/qwen3-vl-plus # kitchen photos, product labels

# Exa (web verification + RAG knowledge ingestion)
EXA_API_KEY=...

# ElevenLabs (voice transcription)
ELEVENLABS_API_KEY=...
```

> `.env.local` is gitignored — never commit real keys.

### Run

```bash
npm run dev                        # http://localhost:3000 (auto-assigned port if busy)
node scripts/ingest-knowledge.mjs  # (re)build the RAG knowledge base — run once, then weekly
npx tsc --noEmit                   # typecheck
```

- App state (uploads, extracted facts, gap reports, drafts, knowledge chunks) lives in `/data` — gitignored JSON files. Delete the folder to reset the demo.
- Generated packs land in `public/generated/pack/`.

---

## 🗂️ Project Structure

```
lib/
  ai/
    model.ts        ← provider layer: the ONLY place models are configured
    structured.ts   ← structured output via forced tool call (Grafilab quirk)
    analyze.ts      ← document → facts extraction (OCR / vision / text paths)
    gaps.ts         ← rubric gap engine; weighted score computed in code
    draft.ts        ← IHCS chapter drafting: generate → critic → revise loop
    copilot.ts      ← the tool-using copilot agent (8 tools)
    exa.ts          ← Exa search helpers (cert records, ingredient sources)
  rag/knowledge.ts  ← BM25 (MiniSearch) retrieval + LLM query expansion
  rubric/mpphm-2020.json ← the 8 MPPHM requirements (edit here to tune audits)
  ihcs/chapters.ts  ← 7 chapter definitions mirroring the HTML template
  evidence/store.ts ← JSON-file persistence: documents, gap reports, drafts
  pack/compile.ts   ← audit pack zip: template → PDF (Puppeteer) + reports + evidence

app/
  page.tsx                        ← dashboard (server component, reads store directly)
  journey/{evidence,gaps,drafts,pack}/page.tsx
  journey/layout.tsx              ← mounts the copilot panel on all journey pages
  api/{evidence,gaps,drafts,pack,copilot,voice/stt}/route.ts

components/
  JourneyShell.tsx  ← shared header + step rail + page transitions
  CopilotPanel.tsx  ← chat UI: streaming, rich tool cards, mic, mobile drawer

scripts/ingest-knowledge.mjs        ← Exa → chunks → data/knowledge.json
templates/ihcs/manual-template.html ← the approved manual template
```

---

## 🔬 How the AI Works

- **Document analysis** — on upload, `analyzeDocument` extracts structured facts and flags problems (e.g. catches an expired supplier cert or an unknown-status ingredient unprompted).
- **Gap engine** — one structured call evaluates all 8 MPPHM requirements against extracted facts; the readiness score is computed **in code** from weighted verdicts.
- **Drafting (generator–critic)** — draft → adversarial critique (coverage, citations, register, invented facts) → one revision. Citations pointing at non-existent files are dropped in code.
- **Copilot** — 8 tools: `listEvidence`, `getGapReport`, `runGapAnalysis`, `searchKnowledge`, `verifyCertificate` (Exa), `checkIngredient` (Exa), `listDrafts`, `draftSection`.
- **RAG** — ~157 chunks from ~25 sources (JAKIM portal, MPPHM materials). BM25 keyword retrieval + query expansion ("got pork anot?" → babi, khinzir, porcine…). Every chunk carries `sourceUrl` + `fetchedAt` for provenance-honest citations.
- **Voice** — mic button → MediaRecorder → `/api/voice/stt` → ElevenLabs Scribe → transcript sent as a chat message.

---

## ⚠️ Known Caveats

1. **Latency** — gap analysis ~1–4 min; a chapter draft ~2–4 min (reasoning model × multiple passes). The UI shows staged progress.
2. **Verification is best-effort** — JAKIM's directory has no public API; Exa searches public records. The copilot is instructed to say "based on public records as of today". Final authority is JAKIM.
3. **Persistence is demo-grade** — JSON files in `/data`, single-tenant, no auth. For multi-user, swap `lib/evidence/store.ts` for a DB.
4. **ElevenLabs key is permission-scoped** — STT/TTS work; account reads don't.
5. **Deployment** — Puppeteer needs `@sparticuz/chromium` or a queue on serverless (e.g. Vercel).

---

## 🌍 Scalability

HalalBoleh's rubric-driven architecture is designed for regional expansion — the MPPHM rubric and knowledge base can be swapped per jurisdiction:

- **Malaysia:** JAKIM (current)
- **Indonesia:** MUI (planned)
- **Singapore:** MUIS (planned)
- **Brunei:** BDMC (planned)

---

## 📄 License

Licensed under the **MIT License** — see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- **Grafilab** — LLM, OCR, and vision infrastructure
- **Exa** — web verification and knowledge ingestion
- **ElevenLabs** — voice transcription
- **JAKIM** — MPPHM 2020 halal certification standards
- **Malaysian SMEs** — for their feedback and support

---

<div align="center">

**Built with ❤️ for Malaysian SMEs**

🌙 **HalalBoleh** — Making halal certification accessible to everyone

</div>
