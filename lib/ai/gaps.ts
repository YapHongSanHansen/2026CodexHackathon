/**
 * Gap engine — runs the MPPHM 2020 rubric against the evidence locker.
 * Produces per-requirement verdicts with citations to document ids,
 * a weighted readiness score, and the next best action.
 */
import { z } from 'zod'
import { generateStructured } from './structured'
import rubric from '../rubric/mpphm-2020.json'
import { listDocuments, saveGapReport, GapReport } from '../evidence/store'

const verdictSchema = z.object({
  results: z.array(
    z.object({
      requirementId: z.string(),
      verdict: z.enum(['pass', 'warn', 'fail', 'missing']),
      reasons: z.array(z.string()).describe('Grounded in the evidence facts; cite section numbers'),
      actions: z.array(z.string()).describe('Concrete steps the business should take, empty if pass'),
      citedDocumentIds: z.array(z.string()).describe('Ids of documents this verdict is based on'),
    })
  ),
  nextBestAction: z
    .string()
    .describe('The single most valuable next step to raise the readiness score'),
})

export async function runGapAnalysis(): Promise<GapReport> {
  const docs = listDocuments().filter(d => d.status === 'analyzed')

  const evidenceSummary = docs.map(d => ({
    id: d.id,
    category: d.category,
    fileName: d.fileName,
    facts: d.facts,
  }))

  const object = await generateStructured({
    schema: verdictSchema,
    prompt: `You are a pre-audit gap auditor for JAKIM halal certification (MPPHM 2020).
Today's date: ${new Date().toISOString().slice(0, 10)}

Evaluate EVERY requirement below against the available evidence. Rules:
- "missing": no document of the required evidenceTypes exists
- "fail": evidence exists but clearly does not satisfy the checks
- "warn": evidence partially satisfies the checks or has issues (e.g. expiring soon)
- "pass": all checks satisfied by the evidence
- NEVER cite a document id that is not in the evidence list.
- Base reasons only on the extracted facts given — do not assume unstated content.

REQUIREMENTS (JSON):
${JSON.stringify(rubric.requirements, null, 2)}

AVAILABLE EVIDENCE (extracted facts, JSON):
${JSON.stringify(evidenceSummary, null, 2)}`,
  })

  // Weighted readiness score computed in code, not by the LLM
  const weightById = new Map(rubric.requirements.map(r => [r.id, r.weight]))
  const credit = { pass: 1, warn: 0.5, fail: 0, missing: 0 } as const
  let earned = 0
  let total = 0
  for (const r of object.results) {
    const w = weightById.get(r.requirementId) ?? 1
    total += w
    earned += w * credit[r.verdict]
  }
  const readinessScore = total > 0 ? Math.round((earned / total) * 100) : 0

  const titleById = new Map(rubric.requirements.map(r => [r.id, r]))
  const report: GapReport = {
    generatedAt: new Date().toISOString(),
    readinessScore,
    results: object.results.map(r => ({
      ...r,
      section: titleById.get(r.requirementId)?.section ?? '',
      title: titleById.get(r.requirementId)?.title ?? r.requirementId,
    })),
    nextBestAction: object.nextBestAction,
  }
  saveGapReport(report)
  return report
}
