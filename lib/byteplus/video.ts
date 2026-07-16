const DEFAULT_BASE_URL = 'https://ark.ap-southeast.bytepluses.com/api/v3'

export type BytePlusVideoTask = { id: string; status: string; content?: { video_url?: string }; error?: { code?: string; message?: string } }

function config() {
  const apiKey = process.env.BYTEPLUS_ARK_API_KEY
  if (!apiKey) throw new Error('BYTEPLUS_ARK_API_KEY is not configured on the server.')
  return { apiKey, baseUrl: (process.env.BYTEPLUS_ARK_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, ''), model: process.env.BYTEPLUS_VIDEO_MODEL || 'dreamina-seedance-2-0-260128' }
}

async function request(path: string, init?: RequestInit) {
  const { apiKey, baseUrl } = config()
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`, ...init?.headers }, cache: 'no-store' })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body?.error?.message || body?.message || `BytePlus request failed (${response.status})`)
  return body
}

export async function createPodcastVideo(input: { imageDataUrl: string; prompt: string; duration: 5 | 10 | 15 }) {
  const { model } = config()
  return request('/contents/generations/tasks', { method: 'POST', body: JSON.stringify({ model, content: [{ type: 'text', text: input.prompt }, { type: 'image_url', image_url: { url: input.imageDataUrl }, role: 'reference_image' }], generate_audio: true, ratio: '16:9', resolution: '720p', duration: input.duration, camera_fixed: true }) }) as Promise<BytePlusVideoTask>
}

export async function getPodcastVideo(taskId: string) {
  return request(`/contents/generations/tasks/${encodeURIComponent(taskId)}`) as Promise<BytePlusVideoTask>
}
