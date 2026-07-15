/**
 * Evidence Locker store — JSON-file persistence for uploaded documents
 * and their extracted facts. Server-side only (uses fs).
 * Demo-scale by design; swap for a DB later without changing callers.
 */
import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads')
const DB_FILE = path.join(DATA_DIR, 'evidence.json')

export interface EvidenceDocument {
  id: string
  category: string // one of rubric evidenceCategories ids
  fileName: string
  filePath: string
  mimeType: string
  uploadedAt: string
  status: 'uploaded' | 'analyzing' | 'analyzed' | 'error'
  /** Structured facts extracted by AI (shape varies by category) */
  facts?: Record<string, unknown>
  issues?: string[]
}

function ensureDirs() {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true })
}

function readDb(): EvidenceDocument[] {
  ensureDirs()
  if (!fs.existsSync(DB_FILE)) return []
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'))
}

function writeDb(docs: EvidenceDocument[]) {
  ensureDirs()
  fs.writeFileSync(DB_FILE, JSON.stringify(docs, null, 2))
}

export function listDocuments(): EvidenceDocument[] {
  return readDb()
}

export function getDocument(id: string): EvidenceDocument | undefined {
  return readDb().find(d => d.id === id)
}

export async function addDocument(
  category: string,
  file: File
): Promise<EvidenceDocument> {
  ensureDirs()
  const id = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const filePath = path.join(UPLOADS_DIR, `${id}_${safeName}`)
  const buffer = Buffer.from(await file.arrayBuffer())
  fs.writeFileSync(filePath, buffer)

  const doc: EvidenceDocument = {
    id,
    category,
    fileName: file.name,
    filePath,
    mimeType: file.type || 'application/octet-stream',
    uploadedAt: new Date().toISOString(),
    status: 'uploaded',
  }
  const docs = readDb()
  docs.push(doc)
  writeDb(docs)
  return doc
}

export function updateDocument(
  id: string,
  patch: Partial<EvidenceDocument>
): EvidenceDocument | undefined {
  const docs = readDb()
  const idx = docs.findIndex(d => d.id === id)
  if (idx === -1) return undefined
  docs[idx] = { ...docs[idx], ...patch }
  writeDb(docs)
  return docs[idx]
}

export function removeDocument(id: string): boolean {
  const docs = readDb()
  const doc = docs.find(d => d.id === id)
  if (!doc) return false
  try {
    fs.unlinkSync(doc.filePath)
  } catch {}
  writeDb(docs.filter(d => d.id !== id))
  return true
}

/** Gap report persistence */
const REPORT_FILE = path.join(DATA_DIR, 'gap-report.json')

export interface GapReport {
  generatedAt: string
  readinessScore: number
  results: {
    requirementId: string
    section: string
    title: string
    verdict: 'pass' | 'warn' | 'fail' | 'missing'
    reasons: string[]
    actions: string[]
    citedDocumentIds: string[]
  }[]
  nextBestAction?: string
}

export function saveGapReport(report: GapReport) {
  ensureDirs()
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2))
}

export function loadGapReport(): GapReport | null {
  if (!fs.existsSync(REPORT_FILE)) return null
  return JSON.parse(fs.readFileSync(REPORT_FILE, 'utf-8'))
}

/** IHCS chapter draft persistence */
const DRAFTS_FILE = path.join(DATA_DIR, 'drafts.json')

export interface ChapterDraft {
  chapterNumber: number
  language: 'bm' | 'en'
  /** Markdown content for the template's chapter slot */
  content: string
  citations: { claim: string; source: string }[]
  /** Information the business must supply — rendered as [MAKLUMAT DIPERLUKAN] placeholders */
  missingInfo: string[]
  critiqueNotes: string[]
  approved: boolean
  generatedAt: string
}

export function loadDrafts(): ChapterDraft[] {
  if (!fs.existsSync(DRAFTS_FILE)) return []
  return JSON.parse(fs.readFileSync(DRAFTS_FILE, 'utf-8'))
}

export function saveDraft(draft: ChapterDraft) {
  ensureDirs()
  const drafts = loadDrafts().filter(d => d.chapterNumber !== draft.chapterNumber)
  drafts.push(draft)
  drafts.sort((a, b) => a.chapterNumber - b.chapterNumber)
  fs.writeFileSync(DRAFTS_FILE, JSON.stringify(drafts, null, 2))
}

export function setDraftApproval(chapterNumber: number, approved: boolean): ChapterDraft | undefined {
  const drafts = loadDrafts()
  const draft = drafts.find(d => d.chapterNumber === chapterNumber)
  if (!draft) return undefined
  draft.approved = approved
  fs.writeFileSync(DRAFTS_FILE, JSON.stringify(drafts, null, 2))
  return draft
}
