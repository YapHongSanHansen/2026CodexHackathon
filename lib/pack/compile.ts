/**
 * Audit-ready pack compiler (HANDOFF.md goal 5).
 * Bundles: IHCS manual PDF (approved template + drafted chapters),
 * the gap report, an evidence index with provenance, and the original uploads.
 */
import fs from 'fs/promises'
import path from 'path'
import puppeteer from 'puppeteer'
import { marked } from 'marked'
import JSZip from 'jszip'
import { listDocuments, loadDrafts, loadGapReport } from '../evidence/store'
import { CHAPTERS } from '../ihcs/chapters'

function guessCompanyName(): string {
  for (const doc of listDocuments()) {
    const name = (doc.facts as any)?.entities?.businessName
    if (name) return name
  }
  return '[MAKLUMAT DIPERLUKAN: nama syarikat]'
}

async function buildManualPdf(): Promise<Buffer> {
  const templatePath = path.join(process.cwd(), 'templates', 'ihcs', 'manual-template.html')
  let html = await fs.readFile(templatePath, 'utf-8')

  const drafts = loadDrafts()
  html = html
    .replace(/{{COMPANY_NAME}}/g, guessCompanyName())
    .replace(/{{BUSINESS_TYPE}}/g, 'Premis Makanan')
    .replace(/{{GENERATION_DATE}}/g, new Date().toLocaleDateString('ms-MY'))

  for (const ch of CHAPTERS) {
    const draft = drafts.find(d => d.chapterNumber === ch.number)
    const content = draft
      ? (marked.parse(draft.content) as string)
      : '<p><em>[MAKLUMAT DIPERLUKAN: bab ini belum digubal]</em></p>'
    html = html.replace(new RegExp(`{{CHAPTER_${ch.number}_CONTENT}}`, 'g'), content)
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '25mm', right: '20mm', bottom: '25mm', left: '20mm' },
    })
    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}

function gapReportMarkdown(): string {
  const report = loadGapReport()
  if (!report) return '# Gap Report\n\n_Not generated yet._'
  const lines = [
    `# Pre-Audit Gap Report (MPPHM 2020)`,
    ``,
    `**Readiness score:** ${report.readinessScore}/100`,
    `**Generated:** ${report.generatedAt}`,
    ``,
    report.nextBestAction ? `**Next best action:** ${report.nextBestAction}\n` : '',
  ]
  for (const r of report.results) {
    lines.push(`## ${r.verdict.toUpperCase()} — ${r.section}: ${r.title}`)
    r.reasons.forEach(x => lines.push(`- ${x}`))
    if (r.actions.length) {
      lines.push(`\n**To fix:**`)
      r.actions.forEach(x => lines.push(`- [ ] ${x}`))
    }
    lines.push('')
  }
  return lines.join('\n')
}

function evidenceIndexMarkdown(): string {
  const docs = listDocuments()
  const lines = [`# Evidence Index`, ``, `Compiled ${new Date().toISOString()}`, ``]
  for (const d of docs) {
    lines.push(`## ${d.fileName}`)
    lines.push(`- Category: ${d.category}`)
    lines.push(`- Uploaded: ${d.uploadedAt}`)
    lines.push(`- Analysis status: ${d.status}`)
    const facts = d.facts as any
    if (facts?.summary) lines.push(`- Summary: ${facts.summary}`)
    if (facts?.entities?.certificateNumber) lines.push(`- Certificate no: ${facts.entities.certificateNumber}`)
    if (facts?.entities?.expiryDate) lines.push(`- Expiry: ${facts.entities.expiryDate}`)
    if (d.issues?.length) {
      lines.push(`- Issues:`)
      d.issues.forEach(i => lines.push(`  - ⚠ ${i}`))
    }
    lines.push('')
  }
  return lines.join('\n')
}

export interface PackResult {
  url: string
  fileName: string
  generatedAt: string
  contents: string[]
}

export async function compileAuditPack(): Promise<PackResult> {
  const zip = new JSZip()
  const contents: string[] = []

  const manualPdf = await buildManualPdf()
  zip.file('ihcs-manual.pdf', manualPdf)
  contents.push('ihcs-manual.pdf')

  zip.file('gap-report.md', gapReportMarkdown())
  contents.push('gap-report.md')

  zip.file('evidence-index.md', evidenceIndexMarkdown())
  contents.push('evidence-index.md')

  const uploads = zip.folder('evidence')!
  for (const d of listDocuments()) {
    try {
      const buf = await fs.readFile(d.filePath)
      uploads.file(d.fileName, buf)
      contents.push(`evidence/${d.fileName}`)
    } catch {}
  }

  const buffer = await zip.generateAsync({ type: 'nodebuffer' })
  const fileName = `halalboleh-audit-pack-${Date.now()}.zip`
  const outDir = path.join(process.cwd(), 'public', 'generated', 'pack')
  await fs.mkdir(outDir, { recursive: true })
  await fs.writeFile(path.join(outDir, fileName), buffer)

  return {
    url: `/generated/pack/${fileName}`,
    fileName,
    generatedAt: new Date().toISOString(),
    contents,
  }
}
