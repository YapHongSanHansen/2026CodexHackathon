/**
 * Provider-agnostic LLM layer (see HANDOFF.md §2).
 * All AI calls in the app import models from this file only —
 * swapping provider or model is an env var change, nothing else.
 */
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'

const grafilab = createOpenAICompatible({
  name: 'grafilab',
  baseURL: process.env.GRAFILAB_BASE_URL || 'https://console-api.grafilab.ai/api/oai/v1',
  apiKey: process.env.GRAFILAB_API_KEY || '',
})

/** Copilot agent, drafting, gap analysis (tool calling verified) */
export const model = grafilab(process.env.AI_MODEL || 'grafilab/glm-5.2')

/** Cheap/fast steps: classification, query expansion */
export const fastModel = grafilab(process.env.AI_MODEL_FAST || 'grafilab/glm-5-turbo')

/** Certificate / scanned-document text extraction */
export const ocrModel = grafilab(process.env.AI_MODEL_OCR || 'grafilab/glm-ocr')

/** Kitchen photos, product labels */
export const visionModel = grafilab(process.env.AI_MODEL_VISION || 'grafilab/qwen3-vl-plus')
