/**
 * Own-RAG knowledge base (HANDOFF.md §6).
 * Chunks live in data/knowledge.json; retrieval is BM25 (MiniSearch) with
 * LLM query expansion to bridge Manglish/EN queries → BM document text.
 * Grafilab has no embeddings endpoint — BM25 is deliberate, not a stopgap.
 */
import fs from 'fs'
import path from 'path'
import MiniSearch from 'minisearch'
import { z } from 'zod'
import { generateStructured } from '../ai/structured'
import { fastModel } from '../ai/model'

export interface KnowledgeChunk {
  id: string
  text: string
  title: string
  sourceUrl: string
  section?: string
  fetchedAt: string
}

const KNOWLEDGE_FILE = path.join(process.cwd(), 'data', 'knowledge.json')

let cache: { chunks: KnowledgeChunk[]; index: MiniSearch<KnowledgeChunk>; mtime: number } | null = null

export function loadKnowledge(): { chunks: KnowledgeChunk[]; index: MiniSearch<KnowledgeChunk> } {
  const mtime = fs.existsSync(KNOWLEDGE_FILE) ? fs.statSync(KNOWLEDGE_FILE).mtimeMs : 0
  if (cache && cache.mtime === mtime) return cache

  const chunks: KnowledgeChunk[] = fs.existsSync(KNOWLEDGE_FILE)
    ? JSON.parse(fs.readFileSync(KNOWLEDGE_FILE, 'utf-8'))
    : []
  const index = new MiniSearch<KnowledgeChunk>({
    fields: ['text', 'title', 'section'],
    storeFields: ['text', 'title', 'sourceUrl', 'section', 'fetchedAt'],
  })
  index.addAll(chunks)
  cache = { chunks, index, mtime }
  return cache
}

export function saveKnowledge(chunks: KnowledgeChunk[]) {
  fs.mkdirSync(path.dirname(KNOWLEDGE_FILE), { recursive: true })
  fs.writeFileSync(KNOWLEDGE_FILE, JSON.stringify(chunks, null, 2))
  cache = null
}

/** Expand a possibly-Manglish/EN query into BM+EN keyword variants for BM25. */
async function expandQuery(query: string): Promise<string[]> {
  try {
    const result = await generateStructured({
      model: fastModel,
      schema: z.object({
        terms: z
          .array(z.string())
          .describe('6-10 search keywords in BOTH Bahasa Malaysia and English, including synonyms and technical/religious terms'),
      }),
      prompt: `Generate search keywords for this halal-certification query. Include Bahasa Malaysia AND English variants (e.g. "pork" → babi, khinzir, porcine, haram).\n\nQuery: ${query}`,
      maxRetries: 0,
    })
    return [query, ...result.terms]
  } catch {
    return [query] // expansion is best-effort
  }
}

export interface KnowledgeHit {
  text: string
  title: string
  sourceUrl: string
  section?: string
  fetchedAt: string
  score: number
}

export async function searchKnowledge(query: string, topK = 5): Promise<KnowledgeHit[]> {
  const { index, chunks } = loadKnowledge()
  if (chunks.length === 0) return []

  const terms = await expandQuery(query)
  const results = index.search(terms.join(' '), { fuzzy: 0.2, prefix: true })
  return results.slice(0, topK).map(r => ({
    text: r.text,
    title: r.title,
    sourceUrl: r.sourceUrl,
    section: r.section,
    fetchedAt: r.fetchedAt,
    score: Math.round(r.score * 100) / 100,
  }))
}
