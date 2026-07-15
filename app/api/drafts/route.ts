import { NextRequest, NextResponse } from 'next/server'
import { draftChapter } from '@/lib/ai/draft'
import { loadDrafts, setDraftApproval } from '@/lib/evidence/store'
import { CHAPTERS } from '@/lib/ihcs/chapters'

export const maxDuration = 300

export async function GET() {
  return NextResponse.json({ chapters: CHAPTERS, drafts: loadDrafts() })
}

export async function POST(request: NextRequest) {
  try {
    const { chapterNumber, language } = await request.json()
    if (!chapterNumber) {
      return NextResponse.json({ error: 'chapterNumber required' }, { status: 400 })
    }
    const draft = await draftChapter(Number(chapterNumber), language === 'en' ? 'en' : 'bm')
    return NextResponse.json({ draft })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Drafting failed' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  const { chapterNumber, approved } = await request.json()
  const draft = setDraftApproval(Number(chapterNumber), Boolean(approved))
  if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
  return NextResponse.json({ draft })
}
