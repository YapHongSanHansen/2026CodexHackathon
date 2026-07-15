/**
 * IHCS chapter drafting — generator-critic loop (HANDOFF.md §4, goal 3+4).
 * The template stays authoritative; the AI only writes chapter content.
 * Grounding: business-specific claims must cite an uploaded document; anything
 * unknown becomes a [MAKLUMAT DIPERLUKAN: …] placeholder, never an invented fact.
 */
import { z } from 'zod'
import { generateStructured } from './structured'
import { CHAPTERS } from '../ihcs/chapters'
import { listDocuments, saveDraft, ChapterDraft } from '../evidence/store'

const draftSchema = z.object({
  content: z
    .string()
    .describe(
      'The chapter body in Markdown. Formal register. Business-specific facts must come from the evidence; unknown details appear as [MAKLUMAT DIPERLUKAN: what is needed].'
    ),
  citations: z.array(
    z.object({
      claim: z.string().describe('The business-specific claim made in the content'),
      source: z.string().describe('The exact fileName of the evidence document supporting it'),
    })
  ),
  missingInfo: z.array(z.string()).describe('Information the business must supply to complete this chapter'),
})

const critiqueSchema = z.object({
  ok: z.boolean().describe('true if the draft passes all checks'),
  problems: z.array(z.string()).describe('Specific problems found, empty if ok'),
})

export async function draftChapter(
  chapterNumber: number,
  language: 'bm' | 'en' = 'bm'
): Promise<ChapterDraft> {
  const chapter = CHAPTERS.find(c => c.number === chapterNumber)
  if (!chapter) throw new Error(`Unknown chapter ${chapterNumber}`)

  const docs = listDocuments().filter(d => d.status === 'analyzed')
  const relevant = docs.filter(d => chapter.evidenceCategories.includes(d.category))
  const evidence = relevant.map(d => ({ fileName: d.fileName, category: d.category, facts: d.facts }))
  const validSources = new Set(relevant.map(d => d.fileName))

  const langLabel = language === 'bm' ? 'Bahasa Malaysia (formal, MPPHM register)' : 'formal English'

  const basePrompt = `You are drafting Chapter ${chapter.number} ("${chapter.titleBM}" / ${chapter.titleEN})
of an IHCS (Internal Halal Control System) manual for a JAKIM halal certification
application under MPPHM 2020. Write in ${langLabel}.

The chapter MUST cover:
${chapter.mustCover.map(c => `- ${c}`).join('\n')}

STRICT GROUNDING RULES:
- Business-specific facts (names, suppliers, cert numbers, dates, staff) may ONLY come
  from the evidence below, and each such claim needs a citation with the exact fileName.
- Generic procedural language (standard MPPHM practice) is allowed without citation.
- NEVER invent business specifics. Where required information is not in the evidence,
  write the placeholder [MAKLUMAT DIPERLUKAN: <what is needed>] in the text and list it
  in missingInfo.
- 300-500 words. Use short paragraphs and numbered procedures where natural.

AVAILABLE EVIDENCE (extracted facts, JSON):
${JSON.stringify(evidence, null, 2)}`

  // Generator pass
  let draft = await generateStructured({ schema: draftSchema, prompt: basePrompt })

  // Code-level citation check: drop citations pointing at non-existent files
  let invalidCitations = draft.citations.filter(c => !validSources.has(c.source))

  // Critic pass — checks coverage and grounding, then one revision if needed
  const critique = await generateStructured({
    schema: critiqueSchema,
    prompt: `Review this IHCS chapter draft as a strict JAKIM pre-audit reviewer.

CHECKS:
1. Does it cover all required topics? ${chapter.mustCover.join('; ')}
2. Does every business-specific claim have a citation to an evidence file?
3. Are there any invented specifics not present in the evidence?
4. Is the register formal and appropriate for an official manual in ${langLabel}?
${invalidCitations.length ? `5. These citations reference files that do NOT exist: ${invalidCitations.map(c => c.source).join(', ')}` : ''}

EVIDENCE FILE NAMES that exist: ${[...validSources].join(', ') || '(none)'}

DRAFT:
${draft.content}

CITATIONS CLAIMED:
${JSON.stringify(draft.citations)}`,
  })

  let critiqueNotes = critique.problems
  if (!critique.ok && critique.problems.length > 0) {
    // One revision with the critic's feedback
    draft = await generateStructured({
      schema: draftSchema,
      prompt: `${basePrompt}

A reviewer found these problems in your previous draft — fix ALL of them:
${critique.problems.map(p => `- ${p}`).join('\n')}

PREVIOUS DRAFT:
${draft.content}`,
    })
    invalidCitations = draft.citations.filter(c => !validSources.has(c.source))
  }

  const result: ChapterDraft = {
    chapterNumber,
    language,
    content: draft.content,
    citations: draft.citations.filter(c => validSources.has(c.source)),
    missingInfo: draft.missingInfo,
    critiqueNotes,
    approved: false,
    generatedAt: new Date().toISOString(),
  }
  saveDraft(result)
  return result
}
