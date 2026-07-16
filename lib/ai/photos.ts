import fs from 'fs'
import { z } from 'zod'
import { generateStructured } from './structured'
import { visionModel } from './model'
import { getDocument, updateDocument, EvidenceDocument } from '../evidence/store'

const schema = z.object({ category: z.enum(['storage_receiving','premises','kitchen_photo']), confidence: z.number().min(0).max(100), reason: z.string(), extractedText: z.array(z.string()), observations: z.array(z.string()), complianceIssues: z.array(z.string()) })
export async function analyzePhoto(id: string, width: number, height: number): Promise<EvidenceDocument> {
  const doc = getDocument(id); if (!doc) throw new Error('Photo not found')
  updateDocument(id, { status: 'analyzing' })
  try {
    const result = await generateStructured({ model: visionModel, schema, messages: [{ role: 'user', content: [
      { type: 'text', text: 'Analyze this E-Halal audit photo using visible-text OCR and scene understanding. Extract every readable sign, label, temperature, or notice. Classify as storage_receiving (receiving/storage/shelves/labels/segregation/off-floor/temperature), premises (entrance/layout/surfaces/drains/lighting/ventilation/waste/pest protection), or kitchen_photo (preparation/cooking/equipment/utensils/work surfaces/handwashing/bins/cleanliness). Give confidence 0-100, reason, factual observations, and potential compliance issues. Never invent unreadable text. Call submit.' },
      { type: 'image', image: fs.readFileSync(doc.filePath) }
    ] }] })
    return updateDocument(id, { category: result.category, status: 'analyzed', facts: { summary: result.reason, extractedText: result.extractedText, observations: result.observations }, issues: result.complianceIssues, photoAnalysis: { ...result, width, height } })!
  } catch (error) { updateDocument(id, { status: 'error', issues: [error instanceof Error ? error.message : 'Photo analysis failed'] }); throw error }
}
