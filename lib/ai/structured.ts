/**
 * Structured output helper for Grafilab.
 * Grafilab's OpenAI-compatible endpoint ignores `response_format: json_schema`,
 * but its tool calling follows JSON schemas faithfully — so we force a single
 * `submit` tool call and return its validated arguments.
 */
import { generateText, tool, ModelMessage } from 'ai'
import { z } from 'zod'
import { model as defaultModel } from './model'

export async function generateStructured<SCHEMA extends z.ZodTypeAny>(opts: {
  schema: SCHEMA
  prompt?: string
  messages?: ModelMessage[]
  model?: Parameters<typeof generateText>[0]['model']
  maxRetries?: number
}): Promise<z.infer<SCHEMA>> {
  const { schema, prompt, messages } = opts
  const m = opts.model ?? defaultModel

  let lastError = ''
  const attempts = (opts.maxRetries ?? 1) + 1
  for (let attempt = 0; attempt < attempts; attempt++) {
    const retryNote = lastError
      ? `\n\nYour previous submission was invalid: ${lastError}\nCall the submit tool again with corrected arguments.`
      : ''
    const result = await generateText({
      model: m,
      ...(messages
        ? { messages }
        : { prompt: `${prompt}${retryNote}\n\nSubmit your answer by calling the "submit" tool. Do not answer in plain text.` }),
      tools: {
        submit: tool({
          description: 'Submit the structured result',
          inputSchema: schema,
        }),
      },
      toolChoice: 'required',
    })

    const call = result.toolCalls.find(c => c.toolName === 'submit')
    if (call) {
      const parsed = schema.safeParse(call.input)
      if (parsed.success) return parsed.data
      lastError = parsed.error.message.slice(0, 500)
    } else {
      lastError = 'No submit tool call was made.'
    }
  }
  throw new Error(`Structured generation failed after ${attempts} attempts: ${lastError}`)
}
