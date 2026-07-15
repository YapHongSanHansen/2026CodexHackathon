/**
 * Exa search helpers — live verification against public records.
 * Used by the copilot's verifyCertificate and checkIngredient tools.
 * Every result carries its source URL so the agent can cite it.
 */
import Exa from 'exa-js'

const exa = new Exa(process.env.EXA_API_KEY || '')

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
