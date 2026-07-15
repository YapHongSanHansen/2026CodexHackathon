'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Bot,
  ChevronRight,
  Loader2,
  Search,
  FileCheck,
  ClipboardList,
  FlaskConical,
  Send,
  Sparkles,
  Mic,
  Square,
  ExternalLink,
  BookOpenText,
  PenLine,
} from 'lucide-react'
import type { CopilotUIMessage } from '@/lib/ai/copilot'

const TOOL_LABEL: Record<string, { icon: typeof Search; label: string }> = {
  'tool-listEvidence': { icon: ClipboardList, label: 'Checking your evidence locker' },
  'tool-getGapReport': { icon: FileCheck, label: 'Reading your gap report' },
  'tool-runGapAnalysis': { icon: Sparkles, label: 'Running full gap analysis' },
  'tool-verifyCertificate': { icon: Search, label: 'Verifying certificate in public records' },
  'tool-checkIngredient': { icon: FlaskConical, label: 'Researching ingredient status' },
  'tool-searchKnowledge': { icon: BookOpenText, label: 'Searching MPPHM knowledge base' },
  'tool-listDrafts': { icon: ClipboardList, label: 'Checking draft status' },
  'tool-draftSection': { icon: PenLine, label: 'Drafting IHCS chapter' },
}

/** Sources returned by web/RAG tools — rendered as link chips */
function SourceList({ sources }: { sources: { title?: string; url?: string; sourceUrl?: string }[] }) {
  const items = sources
    .map(s => ({ title: s.title ?? s.url ?? s.sourceUrl ?? '', url: s.url ?? s.sourceUrl ?? '' }))
    .filter(s => s.url)
    .slice(0, 4)
  if (!items.length) return null
  return (
    <div className="mt-1.5 flex flex-col gap-1">
      {items.map((s, i) => (
        <a
          key={i}
          href={s.url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-[10px] text-[#2D4A3E]/60 hover:text-[#2D4A3E] bg-white rounded-lg px-2 py-1 border border-[#2D4A3E]/10 truncate"
        >
          <ExternalLink className="w-3 h-3 shrink-0" />
          <span className="truncate">{s.title || s.url}</span>
        </a>
      ))}
    </div>
  )
}

function ToolCard({ type, state, output }: { type: string; state: string; output: unknown }) {
  const meta = TOOL_LABEL[type] ?? { icon: Search, label: type.replace('tool-', '') }
  const Icon = meta.icon
  const done = state === 'output-available'

  let detail: React.ReactNode = null
  if (done && output) {
    if (Array.isArray(output) && output.length && typeof output[0] === 'object' && ('url' in output[0] || 'sourceUrl' in output[0])) {
      detail = <SourceList sources={output as any} />
    } else if (type === 'tool-runGapAnalysis' || type === 'tool-getGapReport') {
      const score = (output as any)?.readinessScore
      if (typeof score === 'number') {
        detail = (
          <p className="mt-1 text-[10px] font-bold text-[#2D4A3E]">
            Readiness: {score}%
          </p>
        )
      }
    } else if (type === 'tool-draftSection') {
      const o = output as any
      detail = (
        <p className="mt-1 text-[10px] text-[#2D4A3E]/60">
          BAB {o?.chapterNumber} saved · {o?.citations?.length ?? 0} citations ·{' '}
          {o?.missingInfo?.length ?? 0} info needed
        </p>
      )
    }
  }

  return (
    <div
      className={`rounded-xl px-3 py-2 border text-xs
        ${done ? 'bg-[#C5E86C]/15 border-[#C5E86C]/50' : 'bg-white border-[#2D4A3E]/10'}`}
    >
      <div className="flex items-center gap-2 text-[#2D4A3E]/80 font-semibold">
        {done ? <Icon className="w-3.5 h-3.5" /> : <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {meta.label}
        {done && <span className="text-[#2D4A3E]/40 ml-auto">✓</span>}
      </div>
      {detail}
    </div>
  )
}

const SUGGESTIONS = [
  'How ready am I for the audit?',
  'Apa itu sertu dan bila perlu buat?',
  'Gelatin bovine halal ke tak?',
  'Draft bab 1 untuk saya',
]

export default function CopilotPanel() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const { messages, sendMessage, status } = useChat<CopilotUIMessage>({
    transport: new DefaultChatTransport({ api: '/api/copilot' }),
  })
  const bottomRef = useRef<HTMLDivElement>(null)

  // Open by default on large screens only
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) setOpen(true)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const busy = status === 'submitted' || status === 'streaming'

  const submit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault()
      const text = input.trim()
      if (!text || busy) return
      sendMessage({ text })
      setInput('')
    },
    [input, busy, sendMessage]
  )

  const toggleRecording = useCallback(async () => {
    if (recording) {
      recorderRef.current?.stop()
      setRecording(false)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks: Blob[] = []
      recorder.ondataavailable = e => chunks.push(e.data)
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        setTranscribing(true)
        try {
          const fd = new FormData()
          fd.append('audio', new Blob(chunks, { type: 'audio/webm' }), 'recording.webm')
          const res = await fetch('/api/voice/stt', { method: 'POST', body: fd })
          const data = await res.json()
          if (data.text) sendMessage({ text: data.text })
        } finally {
          setTranscribing(false)
        }
      }
      recorderRef.current = recorder
      recorder.start()
      setRecording(true)
    } catch {
      // mic permission denied — ignore
    }
  }, [recording, sendMessage])

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 bg-[#2D4A3E] text-white px-4 py-3 rounded-full shadow-xl hover:bg-[#3a5d4f] transition"
          >
            <Bot className="w-5 h-5 text-[#C5E86C]" />
            <span className="text-sm font-semibold">Ask HalalBoleh</span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 z-50 lg:z-20 lg:inset-auto lg:sticky lg:top-0 bg-white flex flex-col
              lg:w-96 lg:shrink-0 lg:border-l lg:border-[#2D4A3E]/10 lg:h-screen"
          >
            <header className="px-4 py-3 border-b border-[#2D4A3E]/10 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-[#2D4A3E] text-[#C5E86C] flex items-center justify-center">
                  <Bot className="w-4.5 h-4.5" />
                </span>
                <div>
                  <p className="text-sm font-bold text-[#2D4A3E]">HalalBoleh Copilot</p>
                  <p className="text-[10px] text-[#2D4A3E]/50">EN / BM / Manglish boleh!</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-[#F5F1E8] flex items-center justify-center text-[#2D4A3E]/50 hover:text-[#2D4A3E] transition"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-gradient-to-b from-white to-[#F5F1E8]/40">
              {messages.length === 0 && (
                <div className="text-xs text-[#2D4A3E]/60 flex flex-col gap-2 mt-2">
                  <p className="font-bold text-[#2D4A3E]">Try asking:</p>
                  {SUGGESTIONS.map(q => (
                    <button
                      key={q}
                      onClick={() => sendMessage({ text: q })}
                      className="text-left bg-white border border-[#2D4A3E]/10 hover:border-[#C5E86C] hover:bg-[#C5E86C]/10 rounded-xl px-3 py-2.5 text-[#2D4A3E] transition"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {messages.map(message => (
                <div
                  key={message.id}
                  className={message.role === 'user' ? 'self-end max-w-[85%]' : 'self-start w-full'}
                >
                  {message.parts.map((part, i) => {
                    if (part.type === 'text') {
                      return (
                        <div
                          key={i}
                          className={`rounded-2xl px-3.5 py-2.5 text-sm mb-1.5 ${
                            message.role === 'user'
                              ? 'bg-[#2D4A3E] text-white rounded-br-md'
                              : 'bg-white border border-[#2D4A3E]/10 text-[#2D4A3E] rounded-bl-md shadow-[0_1px_2px_rgba(45,74,62,0.05)]'
                          }`}
                        >
                          <div
                            className={`prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-headings:my-1.5 text-inherit ${
                              message.role === 'user'
                                ? 'prose-invert'
                                : 'prose-a:text-[#2D4A3E] prose-a:underline prose-headings:text-[#2D4A3E] prose-strong:text-[#2D4A3E]'
                            }`}
                          >
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{part.text}</ReactMarkdown>
                          </div>
                        </div>
                      )
                    }
                    if (part.type.startsWith('tool-')) {
                      const state = 'state' in part ? (part.state as string) : ''
                      const output = 'output' in part ? part.output : undefined
                      return (
                        <div key={i} className="mb-1.5">
                          <ToolCard type={part.type} state={state} output={output} />
                        </div>
                      )
                    }
                    return null
                  })}
                </div>
              ))}
              {busy && messages[messages.length - 1]?.role === 'user' && (
                <div className="self-start flex items-center gap-2 text-xs text-[#2D4A3E]/50">
                  <Loader2 className="w-4 h-4 animate-spin" /> thinking…
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={submit} className="p-3 border-t border-[#2D4A3E]/10 flex gap-2 bg-white">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={recording ? 'Listening…' : 'Ask about your certification…'}
                className="v2-input flex-1"
              />
              <button
                type="button"
                onClick={toggleRecording}
                disabled={busy || transcribing}
                title="Speak in Manglish / BM / English"
                className={`w-9 h-9 rounded-full flex items-center justify-center transition disabled:opacity-40 shrink-0
                  ${recording ? 'bg-red-500 text-white animate-pulse' : 'bg-[#F5F1E8] text-[#2D4A3E] hover:bg-[#C5E86C]/40'}`}
              >
                {transcribing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : recording ? (
                  <Square className="w-3.5 h-3.5" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="w-9 h-9 rounded-full bg-[#2D4A3E] text-white flex items-center justify-center disabled:opacity-40 hover:bg-[#3a5d4f] transition shrink-0"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  )
}
