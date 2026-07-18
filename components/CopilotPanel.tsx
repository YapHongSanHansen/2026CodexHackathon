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
          className="flex items-center gap-1.5 text-[10px] text-[#173127]/60 hover:text-[#173127] bg-white rounded-lg px-2 py-1 border border-[#173127]/10 truncate"
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
          <p className="mt-1 text-[10px] font-bold text-[#173127]">
            Readiness: {score}%
          </p>
        )
      }
    } else if (type === 'tool-draftSection') {
      const o = output as any
      detail = (
        <p className="mt-1 text-[10px] text-[#173127]/60">
          BAB {o?.chapterNumber} saved · {o?.citations?.length ?? 0} citations ·{' '}
          {o?.missingInfo?.length ?? 0} info needed
        </p>
      )
    }
  }

  return (
    <div
      className={`rounded-xl px-3 py-2 border text-xs
        ${done ? 'bg-[#C5E86C]/15 border-[#C5E86C]/50' : 'bg-white border-[#173127]/10'}`}
    >
      <div className="flex items-center gap-2 text-[#173127]/80 font-semibold">
        {done ? <Icon className="w-3.5 h-3.5" /> : <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {meta.label}
        {done && <span className="text-[#173127]/40 ml-auto">✓</span>}
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
            className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-[#173127] px-4 py-3 text-white shadow-[0_18px_45px_rgba(23,49,39,0.22)] transition hover:bg-[#214437]"
          >
            <Bot className="w-5 h-5 text-[#3DEB52]" />
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
            className="fixed inset-0 z-50 flex flex-col bg-white lg:inset-auto lg:sticky lg:top-0 lg:z-20
              lg:h-screen lg:w-96 lg:shrink-0 lg:border-l lg:border-[#173127]/10"
          >
            <header className="flex items-center justify-between border-b border-[#173127]/10 bg-white/85 px-4 py-3 backdrop-blur-xl">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#173127] text-[#3DEB52] shadow-[0_10px_24px_rgba(23,49,39,0.14)]">
                  <Bot className="w-4.5 h-4.5" />
                </span>
                <div>
                  <p className="text-sm font-bold text-[#173127]">HalalBoleh Copilot</p>
                  <p className="text-[10px] text-[#173127]/50">EN / BM / Manglish boleh!</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#173127]/50 transition hover:bg-[#ECFFEF] hover:text-[#173127]"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto bg-[#FBFBFA] bg-[linear-gradient(to_right,#00000005_1px,transparent_1px),linear-gradient(to_bottom,#00000005_1px,transparent_1px)] bg-[size:36px_36px] p-4 flex flex-col gap-3">
              {messages.length === 0 && (
                <div className="text-xs text-[#173127]/60 flex flex-col gap-2 mt-2">
                  <p className="font-bold text-[#173127]">Try asking:</p>
                  {SUGGESTIONS.map(q => (
                    <button
                      key={q}
                      onClick={() => sendMessage({ text: q })}
                      className="text-left bg-white/85 border border-[#173127]/10 hover:border-[#3DEB52] hover:bg-[#ECFFEF] rounded-2xl px-3 py-2.5 text-[#173127] shadow-sm transition"
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
                              ? 'bg-[#173127] text-white rounded-br-md'
                              : 'bg-white/90 border border-[#173127]/10 text-[#173127] rounded-bl-md shadow-[0_10px_30px_rgba(23,49,39,0.05)]'
                          }`}
                        >
                          <div
                            className={`prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-headings:my-1.5 text-inherit ${
                              message.role === 'user'
                                ? 'prose-invert'
                                : 'prose-a:text-[#173127] prose-a:underline prose-headings:text-[#173127] prose-strong:text-[#173127]'
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
                <div className="self-start flex items-center gap-2 text-xs text-[#173127]/50">
                  <Loader2 className="w-4 h-4 animate-spin" /> thinking…
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={submit} className="p-3 border-t border-[#173127]/10 flex gap-2 bg-white/90 backdrop-blur-xl">
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
                  ${recording ? 'bg-red-500 text-white animate-pulse' : 'bg-[#ECFFEF] text-[#173127] hover:bg-[#DFFFDA]'}`}
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
                className="w-9 h-9 rounded-full bg-[#173127] text-white flex items-center justify-center disabled:opacity-40 hover:bg-[#214437] transition shrink-0"
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
