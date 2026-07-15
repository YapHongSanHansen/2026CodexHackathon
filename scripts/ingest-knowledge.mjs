/**
 * Knowledge ingestion — Exa as feeder for the own-RAG store (HANDOFF.md §6).
 * Fetches halal-certification sources via Exa, chunks them with provenance,
 * and writes data/knowledge.json. Re-run to refresh (weekly recommended).
 *
 *   node scripts/ingest-knowledge.mjs
 */
import Exa from 'exa-js'
import fs from 'fs'
import path from 'path'
import { config } from 'dotenv'

config({ path: '.env.local' })

const exa = new Exa(process.env.EXA_API_KEY)

const TOPICS = [
  'MPPHM 2020 Manual Prosedur Pensijilan Halal Malaysia requirements',
  'JAKIM halal certification application requirements documents SME',
  'JAKIM halal certified ingredients list gelatin emulsifier alcohol status',
  'sertu samak cleaning procedure halal kitchen Malaysia',
  'internal halal control system IHCS jawatankuasa halal Malaysia',
  'halal critical control point pemprosesan makanan JAKIM',
]

function chunkText(text, size = 1400, overlap = 200) {
  const chunks = []
  let start = 0
  while (start < text.length) {
    const end = Math.min(start + size, text.length)
    chunks.push(text.slice(start, end))
    if (end === text.length) break
    start = end - overlap
  }
  return chunks
}

const all = []
const seenUrls = new Set()

for (const topic of TOPICS) {
  process.stdout.write(`Searching: ${topic.slice(0, 60)}… `)
  try {
    const res = await exa.searchAndContents(topic, {
      numResults: 5,
      text: { maxCharacters: 8000 },
    })
    let added = 0
    for (const r of res.results) {
      if (seenUrls.has(r.url) || !r.text || r.text.length < 300) continue
      seenUrls.add(r.url)
      const pieces = chunkText(r.text)
      pieces.forEach((text, i) => {
        all.push({
          id: `${r.url}#${i}`,
          text,
          title: r.title ?? r.url,
          sourceUrl: r.url,
          section: pieces.length > 1 ? `part ${i + 1}/${pieces.length}` : undefined,
          fetchedAt: new Date().toISOString(),
        })
      })
      added++
    }
    console.log(`${added} pages`)
  } catch (e) {
    console.log(`failed: ${e.message}`)
  }
}

const out = path.join(process.cwd(), 'data', 'knowledge.json')
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, JSON.stringify(all, null, 2))
console.log(`\nWrote ${all.length} chunks from ${seenUrls.size} sources to ${out}`)
