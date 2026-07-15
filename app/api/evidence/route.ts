import { NextRequest, NextResponse } from 'next/server'
import { addDocument, listDocuments, removeDocument } from '@/lib/evidence/store'
import { analyzeDocument } from '@/lib/ai/analyze'

export const maxDuration = 120

export async function GET() {
  return NextResponse.json({ documents: listDocuments() })
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const category = formData.get('category') as string | null
    if (!file || !category) {
      return NextResponse.json({ error: 'file and category are required' }, { status: 400 })
    }

    const doc = await addDocument(category, file)

    // Analyze immediately (proactive agent behavior — facts + issues on upload)
    try {
      const analyzed = await analyzeDocument(doc.id)
      return NextResponse.json({ document: analyzed })
    } catch (err) {
      // Upload succeeded even if analysis failed; client sees status: 'error'
      return NextResponse.json({
        document: { ...doc, status: 'error' },
        analysisError: err instanceof Error ? err.message : 'Analysis failed',
      })
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const ok = removeDocument(id)
  return NextResponse.json({ removed: ok })
}
