/**
 * JAM AI Base Client Utilities
 * Handles all interactions with JAM AI Base API for multimodal features
 */

import JamAI from 'jamaibase'

// Initialize JamAI client - PAT should be set in environment or configured
const jamai = new JamAI({
  apiKey: process.env.JAMAI_API_KEY || '', // Fill in your PAT here or use environment variable
  baseURL: 'https://api.jamaibase.com/api/v1',
})

export interface IngredientScanRequest {
  image?: File | string // Image file or base64
  audio?: File | Blob // Audio recording
  text?: string // Manual text input
  language?: 'en' | 'bm' | 'manglish'
}

export interface IngredientScanResponse {
  riskLevel: 'High' | 'Medium' | 'Low'
  flaggedIngredients: string[]
  certBodyName?: string
  userAdviceBM: string
  userAdviceEN: string
  reasoning: string
  detectedIngredients: string[]
  halalStatus: 'Halal' | 'Haram' | 'Mushbooh' | 'Unknown'
}

export interface TranscribeRequest {
  audio: File | Blob
  language?: string
}

export interface TranscribeResponse {
  text: string
  language: string
  confidence: number
}

export interface IHCSGenerationRequest {
  companyName: string
  businessType: string
  responses: Record<string, string> // Q&A pairs from conversation
}

export interface IHCSGenerationResponse {
  pdfUrl: string
  chapters: {
    title: string
    content: string
    status: 'complete' | 'incomplete'
  }[]
  completionPercentage: number
}

export interface PreAuditRequest {
  documents: File[]
  businessType: string
}

export interface PreAuditResponse {
  score: number
  totalChecks: number
  passedChecks: number
  missingDocuments: string[]
  warnings: string[]
  recommendations: string[]
}

export interface AnalyzeProductRequest {
  text?: string
  imageFile?: File
  audioFile?: File
}

export interface AnalyzeProductResponse {
  Final_reply: string
  Vision_Analysis?: string
  Knowledge_Check_Cert?: string
  Knowledge_Check_Ingredients?: string
}

/**
 * Scans ingredients using multimodal inputs (vision + audio + text)
 * Maps to JAM AI Base Action Table with Vision + Whisper + RAG
 */
export async function scanIngredient(
  request: IngredientScanRequest
): Promise<IngredientScanResponse> {
  const formData = new FormData()
  
  if (request.image) {
    if (typeof request.image === 'string') {
      formData.append('imageBase64', request.image)
    } else {
      formData.append('image', request.image)
    }
  }
  
  if (request.audio) {
    formData.append('audio', request.audio)
  }
  
  if (request.text) {
    formData.append('text', request.text)
  }
  
  formData.append('language', request.language || 'bm')

  const response = await fetch('/api/scan-ingredient', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`Scan failed: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Transcribes audio to text using Whisper API
 * Supports Manglish and dialect recognition
 */
export async function transcribeAudio(
  request: TranscribeRequest
): Promise<TranscribeResponse> {
  const formData = new FormData()
  formData.append('audio', request.audio)
  if (request.language) {
    formData.append('language', request.language)
  }

  const response = await fetch('/api/transcribe', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`Transcription failed: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Generates IHCS (Internal Halal Control System) document
 * Uses conversational AI to build MPPHM 2020 compliant manual
 */
export async function generateIHCS(
  request: IHCSGenerationRequest
): Promise<IHCSGenerationResponse> {
  const response = await fetch('/api/generate-ihcs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    throw new Error(`IHCS generation failed: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Validates audit readiness and scores compliance
 * Performs pre-audit checklist validation
 */
export async function validatePreAudit(
  request: PreAuditRequest
): Promise<PreAuditResponse> {
  const formData = new FormData()
  
  request.documents.forEach((doc, index) => {
    formData.append(`document_${index}`, doc)
  })
  
  formData.append('businessType', request.businessType)

  const response = await fetch('/api/pre-audit', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`Pre-audit validation failed: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Utility: Convert File to base64
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = error => reject(error)
  })
}

/**
 * Utility: Record audio from microphone
 */
export async function recordAudio(durationMs?: number): Promise<Blob> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const mediaRecorder = new MediaRecorder(stream)
  const chunks: Blob[] = []

  return new Promise((resolve, reject) => {
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data)
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' })
      stream.getTracks().forEach(track => track.stop())
      resolve(blob)
    }
    mediaRecorder.onerror = reject

    mediaRecorder.start()

    if (durationMs) {
      setTimeout(() => mediaRecorder.stop(), durationMs)
    }
  })
}
