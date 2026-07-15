/**
 * Document analysis — extracts structured facts from uploaded evidence.
 * Images → glm-ocr (scanned certs) / qwen3-vl (photos); PDFs → text extraction
 * then LLM; text files → LLM directly.
 */
import fs from 'fs'
import { z } from 'zod'
import { model, ocrModel, visionModel } from './model'
import { generateStructured } from './structured'
import { getDocument, updateDocument, EvidenceDocument } from '../evidence/store'

const factsSchema = z.object({
  docType: z.string().describe('What kind of document this is'),
  summary: z.string().describe('2-3 sentence summary of the document'),
  entities: z.object({
    businessName: z.string().nullable(),
    supplierName: z.string().nullable(),
    certificateNumber: z.string().nullable(),
    issuingBody: z.string().nullable(),
    expiryDate: z.string().nullable().describe('ISO date if present'),
  }),
  keyFacts: z.array(z.string()).describe('Facts relevant to halal certification'),
  issues: z.array(z.string()).describe('Problems: expired, unreadable, missing info, non-halal risks'),
})

export type ExtractedFacts = z.infer<typeof factsSchema>

const PROMPT = `You are analyzing a document uploaded as evidence for a JAKIM halal
certification application in Malaysia. Extract facts faithfully — do NOT invent
certificate numbers, dates, or names that are not visible. If the document is
unreadable or irrelevant to its stated category, say so in issues.`

async function extractPdfText(filePath: string): Promise<string> {
  const { PDFParse } = await import('pdf-parse')
  const parser = new PDFParse({ data: new Uint8Array(fs.readFileSync(filePath)) })
  const result = await parser.getText()
  return result.text.slice(0, 12000)
}

export async function analyzeDocument(id: string): Promise<EvidenceDocument> {
  const doc = getDocument(id)
  if (!doc) throw new Error(`Document ${id} not found`)
  updateDocument(id, { status: 'analyzing' })

  try {
    let facts: ExtractedFacts
    if (doc.mimeType.startsWith('image/')) {
      // Photos of premises → vision model; everything else scanned → OCR model
      const m = doc.category === 'kitchen_photo' ? visionModel : ocrModel
      facts = await generateStructured({
        model: m,
        schema: factsSchema,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `${PROMPT}\n\nStated category: ${doc.category}\nToday's date: ${new Date().toISOString().slice(0, 10)}\n\nSubmit your analysis by calling the "submit" tool.`,
              },
              { type: 'image', image: fs.readFileSync(doc.filePath) },
            ],
          },
        ],
      })
    } else {
      const text = doc.mimeType === 'application/pdf'
        ? await extractPdfText(doc.filePath)
        : fs.readFileSync(doc.filePath, 'utf-8').slice(0, 12000)
      facts = await generateStructured({
        schema: factsSchema,
        prompt: `${PROMPT}\n\nStated category: ${doc.category}\nFile name: ${doc.fileName}\nToday's date: ${new Date().toISOString().slice(0, 10)}\n\nDocument content:\n${text}`,
      })
    }

    return updateDocument(id, {
      status: 'analyzed',
      facts: facts as unknown as Record<string, unknown>,
      issues: facts.issues,
    })!
  } catch (err) {
    updateDocument(id, {
      status: 'error',
      issues: [err instanceof Error ? err.message : 'Analysis failed'],
    })
    throw err
  }
}
