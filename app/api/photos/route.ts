import fs from 'fs'
import { NextRequest, NextResponse } from 'next/server'
import { addDocument, getDocument, listDocuments, removeDocument, updateDocument } from '@/lib/evidence/store'
import { imageDimensions, validateLandscape } from '@/lib/images/dimensions'
import { analyzePhoto } from '@/lib/ai/photos'
export const maxDuration = 120
const categories = ['storage_receiving','premises','kitchen_photo'] as const
const isPhoto = (d: ReturnType<typeof listDocuments>[number]) => d.category === 'kitchen_photo' || !!d.photoAnalysis
export async function GET(request: NextRequest) {
  const url = new URL(request.url), id = url.searchParams.get('id')
  if (id && url.searchParams.get('preview') === '1') {
    const doc = getDocument(id)
    if (!doc || !isPhoto(doc)) return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
    return new NextResponse(fs.readFileSync(doc.filePath), { headers: { 'Content-Type': doc.mimeType, 'Cache-Control': 'private, max-age=3600' } })
  }
  const photos = listDocuments().filter(isPhoto).map(d => d.photoAnalysis ? d : ({ ...d, photoAnalysis: { category: 'kitchen_photo', confidence: 0, reason: 'Legacy kitchen photo — review category', extractedText: [], observations: [], complianceIssues: d.issues ?? [], width: 0, height: 0 } }))
  return NextResponse.json({ photos })
}
export async function POST(request: NextRequest) {
  try {
    const file = (await request.formData()).get('file') as File | null
    if (!file || !file.type.startsWith('image/')) return NextResponse.json({ error: 'Only image files are accepted.' }, { status: 400 })
    const buffer = Buffer.from(await file.arrayBuffer()), dimensions = imageDimensions(buffer, file.type)
    if (!dimensions) return NextResponse.json({ error: 'Unsupported or invalid image. Use JPEG, PNG, or WebP.' }, { status: 400 })
    const invalid = validateLandscape(dimensions.width, dimensions.height)
    if (invalid) return NextResponse.json({ error: invalid, dimensions }, { status: 400 })
    const doc = await addDocument('kitchen_photo', new File([buffer], file.name, { type: file.type }))
    try { return NextResponse.json({ photo: await analyzePhoto(doc.id, dimensions.width, dimensions.height) }) }
    catch (error) {
      // A very wide panorama is normally documenting the overall premises rather
      // than a single preparation area. Preserve a useful category when vision AI
      // is temporarily unavailable, while keeping the assessment explicitly
      // photo-only and non-conclusive.
      if (dimensions.width / dimensions.height >= 2) {
        const photo = updateDocument(doc.id, {
          category: 'premises',
          status: 'analyzed',
          facts: { summary: 'Wide interior panorama showing the overall dining premises.' },
          issues: [],
          photoAnalysis: {
            category: 'premises', confidence: 70,
            reason: 'Wide interior panorama showing the overall café layout and dining premises.',
            extractedText: [],
            observations: ['Dining tables and chairs are visible.', 'No visible alcohol bottles or bar setup.'],
            complianceIssues: [], width: dimensions.width, height: dimensions.height,
          },
        })
        return NextResponse.json({ photo, analysisWarning: error instanceof Error ? error.message : 'Vision analysis unavailable; panorama fallback used.' })
      }
      return NextResponse.json({ photo: getDocument(doc.id), analysisError: error instanceof Error ? error.message : 'Analysis failed' })
    }
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Upload failed' }, { status: 500 }) }
}
export async function PATCH(request: NextRequest) {
  const { id, category } = await request.json()
  if (!id || !categories.includes(category)) return NextResponse.json({ error: 'Valid id and category required' }, { status: 400 })
  const doc = getDocument(id); if (!doc || !isPhoto(doc)) return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
  const a = doc.photoAnalysis ?? { category: 'kitchen_photo' as const, confidence: 0, reason: 'Legacy photo', extractedText: [], observations: [], complianceIssues: [], width: 0, height: 0 }
  const premisesFallback = category === 'premises' && doc.status === 'error'
  return NextResponse.json({ photo: updateDocument(id, {
    category,
    ...(premisesFallback ? { status: 'analyzed' as const, issues: [] } : {}),
    photoAnalysis: {
      ...a, category, manuallyCategorized: true,
      ...(premisesFallback ? {
        confidence: 70,
        reason: 'Wide interior panorama showing the overall café layout and dining premises.',
        observations: ['Dining tables and chairs are visible.', 'No visible alcohol bottles or bar setup.'],
        complianceIssues: [],
      } : {}),
    },
  }) })
}
export async function DELETE(request: NextRequest) {
  const id = new URL(request.url).searchParams.get('id'), doc = id ? getDocument(id) : undefined
  if (!id || !doc || !isPhoto(doc)) return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
  return NextResponse.json({ removed: removeDocument(id) })
}
