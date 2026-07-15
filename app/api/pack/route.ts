import { NextResponse } from 'next/server'
import { compileAuditPack } from '@/lib/pack/compile'
import { listDocuments, loadDrafts, loadGapReport } from '@/lib/evidence/store'
import { CHAPTERS } from '@/lib/ihcs/chapters'

export const maxDuration = 300

export async function GET() {
  const report = loadGapReport()
  const drafts = loadDrafts()
  return NextResponse.json({
    readiness: {
      evidenceCount: listDocuments().length,
      readinessScore: report?.readinessScore ?? null,
      chaptersDrafted: drafts.length,
      chaptersApproved: drafts.filter(d => d.approved).length,
      chaptersTotal: CHAPTERS.length,
    },
  })
}

export async function POST() {
  try {
    const pack = await compileAuditPack()
    return NextResponse.json({ pack })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Pack compilation failed' },
      { status: 500 }
    )
  }
}
