import { createAgentUIStreamResponse } from 'ai'
import { copilot } from '@/lib/ai/copilot'

export const maxDuration = 300

export async function POST(request: Request) {
  const { messages } = await request.json()
  return createAgentUIStreamResponse({
    agent: copilot,
    uiMessages: messages,
  })
}
