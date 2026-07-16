/**
 * Exa search helpers — live verification against public records.
 * Used by the copilot's verifyCertificate and checkIngredient tools.
 * Every result carries its source URL so the agent can cite it.
 */
import Exa from 'exa-js'

const exa = new Exa(process.env.EXA_API_KEY || '')

export const REEL_PLATFORMS = ['Instagram', 'TikTok', 'YouTube Shorts', 'Facebook', 'LinkedIn', 'X', 'Threads'] as const
export type ReelPlatform = typeof REEL_PLATFORMS[number]
export interface ReelHook {
  platform: ReelPlatform
  title: string
  hook: string
  sourceUrl: string
  publishedDate?: string
  suggestedHostBrief: string
}

const platformHosts: Record<ReelPlatform, string[]> = {
  Instagram: ['instagram.com'], TikTok: ['tiktok.com'], 'YouTube Shorts': ['youtube.com', 'youtu.be'],
  Facebook: ['facebook.com'], LinkedIn: ['linkedin.com'], X: ['x.com', 'twitter.com'], Threads: ['threads.net'],
}
function validPlatformUrl(platform: ReelPlatform, value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && platformHosts[platform].some(host => url.hostname === host || url.hostname.endsWith(`.${host}`))
      && !/(login|checkpoint|challenge|security|shop|storefront)/i.test(url.pathname)
  } catch { return false }
}
const compactHook = (title: string, snippet: string) => {
  const candidate = (title || snippet).replace(/\s+/g, ' ').replace(/[|#].*$/, '').trim()
  return candidate.slice(0, 120) || 'Look closer at what this restaurant photo actually tells us.'
}

/** Recent social hook inspiration for a restaurant reel. Never used as halal evidence. */
export async function searchRestaurantReelHooks(context: string): Promise<ReelHook[]> {
  if (!process.env.EXA_API_KEY) throw new Error('EXA_API_KEY is not configured on the server.')
  const startPublishedDate = new Date(Date.now() - 7 * 86400000).toISOString()
  const groups = await Promise.allSettled(REEL_PLATFORMS.map(async platform => {
    const domains = platformHosts[platform]
    const result = await exa.searchAndContents(`restaurant review reel hook ${context} site:${domains[0]}`, {
      numResults: 6, startPublishedDate, includeDomains: domains, text: { maxCharacters: 500 },
    })
    return result.results.filter(r => validPlatformUrl(platform, r.url)).slice(0, 3).map(r => ({
      platform, title: r.title ?? platform, hook: compactHook(r.title ?? '', r.text ?? ''), sourceUrl: r.url,
      publishedDate: r.publishedDate ?? undefined,
      suggestedHostBrief: `Open with “${compactHook(r.title ?? '', r.text ?? '')}”, then explain only the visible restaurant details and finish with a certification-check reminder.`,
    }))
  }))
  const seen = new Set<string>()
  return groups.flatMap(group => group.status === 'fulfilled' ? group.value : []).filter(item => { const key = item.sourceUrl.replace(/[?#].*$/, '').toLowerCase(); if (seen.has(key)) return false; seen.add(key); return true })
}

export interface WebSource {
  title: string
  url: string
  publishedDate?: string
  snippet: string
}

async function search(query: string, numResults = 5): Promise<WebSource[]> {
  const res = await exa.searchAndContents(query, {
    numResults,
    text: { maxCharacters: 1200 },
  })
  return res.results.map(r => ({
    title: r.title ?? r.url,
    url: r.url,
    publishedDate: r.publishedDate ?? undefined,
    snippet: (r.text ?? '').slice(0, 1200),
  }))
}

/** Look for public evidence that a supplier holds a valid halal certificate. */
export async function searchCertificateRecords(
  supplierName: string,
  certNumber?: string
): Promise<WebSource[]> {
  const queries = [
    `"${supplierName}" halal certificate JAKIM Malaysia`,
    certNumber ? `"${certNumber}" halal certificate` : null,
  ].filter(Boolean) as string[]

  const results = await Promise.all(queries.map(q => search(q, 4)))
  const seen = new Set<string>()
  return results.flat().filter(r => {
    if (seen.has(r.url)) return false
    seen.add(r.url)
    return true
  })
}

/** Find rulings/sources on an ingredient's halal status. */
export async function searchIngredientSources(ingredient: string): Promise<WebSource[]> {
  return search(`${ingredient} halal or haram status JAKIM fatwa Malaysia`, 5)
}
