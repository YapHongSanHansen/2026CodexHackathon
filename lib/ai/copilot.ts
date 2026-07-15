/**
 * The HalalBoleh copilot — a single ToolLoopAgent that assists the business
 * throughout the certification journey (HANDOFF.md §4).
 * Grounding rule: no compliance claim without a citation to an uploaded
 * document id or a source URL returned by a tool.
 */
import { ToolLoopAgent, tool, stepCountIs, InferAgentUIMessage } from 'ai'
import { z } from 'zod'
import { model } from './model'
import { listDocuments, loadGapReport, loadDrafts } from '../evidence/store'
import { runGapAnalysis } from './gaps'
import { draftChapter } from './draft'
import { searchCertificateRecords, searchIngredientSources } from './exa'
import { searchKnowledge } from '../rag/knowledge'
import { CHAPTERS } from '../ihcs/chapters'

export const copilot = new ToolLoopAgent({
  model,
  instructions: `You are HalalBoleh, a halal-certification copilot for Malaysian SMEs pursuing
JAKIM certification under MPPHM 2020.

Language: you speak English, Bahasa Malaysia, and Manglish. Mirror the user's language
and register — if they write Manglish, reply warmly in Manglish; keep formal documents formal.

Grounding rules (strict):
- NEVER state a compliance claim without evidence: cite either an uploaded document
  (by file name) or a source URL returned by your tools.
- If evidence is missing or a tool returns nothing conclusive, say so honestly and
  suggest the concrete next step instead of guessing.
- Web verification is best-effort against public records — say "based on public records
  as of today" when relying on it.

Behavior:
- Use listEvidence/getGapReport to check current state before answering questions about
  the user's application; use runGapAnalysis only when evidence changed or the user asks.
- Be concise and actionable. Reference MPPHM 2020 sections when relevant.
- You are not a mufti: for contested fiqh questions, present the positions with sources
  and recommend consulting JAKIM or a qualified authority.`,
  tools: {
    listEvidence: tool({
      description:
        "List the business's uploaded documents with their categories, analysis status, extracted facts, and issues",
      inputSchema: z.object({}),
      execute: async () =>
        listDocuments().map(d => ({
          id: d.id,
          fileName: d.fileName,
          category: d.category,
          status: d.status,
          facts: d.facts,
          issues: d.issues,
        })),
    }),
    getGapReport: tool({
      description:
        'Get the most recent MPPHM 2020 gap report (readiness score, per-requirement verdicts, action plan). Cheap — prefer this over runGapAnalysis.',
      inputSchema: z.object({}),
      execute: async () => loadGapReport() ?? { note: 'No gap report yet — run runGapAnalysis.' },
    }),
    runGapAnalysis: tool({
      description:
        'Re-run the full MPPHM 2020 rubric against current evidence. Slow (~1 min). Use only when evidence changed or the user explicitly asks for a fresh audit.',
      inputSchema: z.object({}),
      execute: async () => runGapAnalysis(),
    }),
    searchKnowledge: tool({
      description:
        'Search the curated MPPHM 2020 / JAKIM knowledge base (fast, offline). Use FIRST for questions about certification requirements, procedures, sertu/samak, or ingredient rulings. Each hit carries a sourceUrl and fetchedAt to cite.',
      inputSchema: z.object({ query: z.string() }),
      execute: async ({ query }) => searchKnowledge(query),
    }),
    verifyCertificate: tool({
      description:
        'Search public records (JAKIM directory, supplier sites) for evidence that a supplier holds a valid halal certificate. Returns web sources to cite.',
      inputSchema: z.object({
        supplierName: z.string(),
        certNumber: z.string().optional(),
      }),
      execute: async ({ supplierName, certNumber }) =>
        searchCertificateRecords(supplierName, certNumber),
    }),
    checkIngredient: tool({
      description:
        'Find rulings and sources on whether an ingredient is halal, haram, or mushbooh. Returns web sources to cite.',
      inputSchema: z.object({ ingredient: z.string() }),
      execute: async ({ ingredient }) => searchIngredientSources(ingredient),
    }),
    listDrafts: tool({
      description:
        'List the IHCS manual chapters and the state of their drafts (approved, missing info). Cheap.',
      inputSchema: z.object({}),
      execute: async () => ({
        chapters: CHAPTERS.map(c => ({ number: c.number, titleBM: c.titleBM, titleEN: c.titleEN })),
        drafts: loadDrafts().map(d => ({
          chapterNumber: d.chapterNumber,
          approved: d.approved,
          missingInfo: d.missingInfo,
          citations: d.citations.length,
        })),
      }),
    }),
    draftSection: tool({
      description:
        'Draft (or redraft) one IHCS manual chapter from the approved template using only available evidence. Slow (~1-2 min). The user reviews it on the Drafts page.',
      inputSchema: z.object({
        chapterNumber: z.number().min(1).max(7),
        language: z.enum(['bm', 'en']).default('bm'),
      }),
      execute: async ({ chapterNumber, language }) => {
        const d = await draftChapter(chapterNumber, language)
        return {
          chapterNumber: d.chapterNumber,
          citations: d.citations,
          missingInfo: d.missingInfo,
          preview: d.content.slice(0, 400),
          note: 'Full draft saved — review it at /journey/drafts',
        }
      },
    }),
  },
  stopWhen: stepCountIs(8),
})

export type CopilotUIMessage = InferAgentUIMessage<typeof copilot>
