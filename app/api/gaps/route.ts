import { NextResponse } from 'next/server'
import { runGapAnalysis } from '@/lib/ai/gaps'
import { loadGapReport } from '@/lib/evidence/store'

export const maxDuration = 180

export async function GET() {
  return NextResponse.json({ report: loadGapReport() })
}

export async function POST() {
  try {
    const report = await runGapAnalysis()
    return NextResponse.json({ report })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Gap analysis failed' },
      { status: 500 }
    )
  }
}
