import { NextRequest, NextResponse } from 'next/server'
import { getDocument } from '@/lib/evidence/store'
import { searchRestaurantReelHooks } from '@/lib/ai/exa'
export const dynamic = 'force-dynamic'
export const maxDuration = 60
const clean = (v: unknown, max = 500) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json(), photoId = clean(body.photoId, 120), brief = clean(body.brief)
    const doc = getDocument(photoId)
    if (!doc?.photoAnalysis || doc.status !== 'analyzed') return NextResponse.json({ error: 'Upload and analyze a restaurant photo before asking Copilot for reel ideas.' }, { status: 400 })
    const observations = doc.photoAnalysis.observations.slice(0, 5)
    const hooks = await searchRestaurantReelHooks([brief, doc.photoAnalysis.reason, ...observations].join(' '))
    const fallback = body.language === 'bm' ? 'Nampak menarik, tapi apa yang gambar restoran ini betul-betul boleh buktikan?' : 'This restaurant looks inviting—but what can the photo actually tell us?'
    const hook = hooks[0]?.hook || fallback
    const script = `${hook}\n\nVisible details: ${observations.join(' ')}\n\nHalal note: A photo cannot verify halal certification or every ingredient and preparation step.\n\nNext step: Check the restaurant’s official JAKIM listing or ask the operator about ingredients and preparation.`
    return NextResponse.json({ hooks, recommendation: hooks.length ? `I found ${hooks.length} recent, source-linked hook examples. Pick one and edit the draft before generating.` : 'No validated recent platform results were found, so I prepared a cautious original hook.', script })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not search for reel hooks.'
    const status = /rate|429/i.test(message) ? 429 : /key|401|credential/i.test(message) ? 401 : 502
    return NextResponse.json({ error: message }, { status })
  }
}