import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audio = formData.get('audio') as File | null
    if (!audio) return NextResponse.json({ error: 'audio required' }, { status: 400 })

    const upstream = new FormData()
    upstream.append('model_id', 'scribe_v1')
    upstream.append('file', audio, audio.name || 'recording.webm')

    const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY || '' },
      body: upstream,
    })
    if (!res.ok) {
      const detail = await res.text()
      return NextResponse.json({ error: `Transcription failed: ${detail.slice(0, 200)}` }, { status: 502 })
    }
    const data = await res.json()
    return NextResponse.json({ text: data.text ?? '', language: data.language_code })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'STT failed' },
      { status: 500 }
    )
  }
}
