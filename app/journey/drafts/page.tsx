'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Loader2,
  PenLine,
  Quote,
  RefreshCw,
  AlertCircle,
  ChevronDown,
} from 'lucide-react'
import JourneyShell from '@/components/JourneyShell'

interface ChapterDef {
  number: number
  titleBM: string
  titleEN: string
  mustCover: string[]
}

interface Draft {
  chapterNumber: number
  language: 'bm' | 'en'
  content: string
  citations: { claim: string; source: string }[]
  missingInfo: string[]
  critiqueNotes: string[]
  approved: boolean
  generatedAt: string
}

const DRAFT_STAGES = [
  'Writing from your evidence…',
  'AI reviewer checking citations & register…',
  'Applying reviewer fixes…',
]

export default function DraftsPage() {
  const [chapters, setChapters] = useState<ChapterDef[]>([])
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [language, setLanguage] = useState<'bm' | 'en'>('bm')
  const [busyChapter, setBusyChapter] = useState<number | null>(null)
  const [stage, setStage] = useState(0)
  const [openChapter, setOpenChapter] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const res = await fetch('/api/drafts')
    const data = await res.json()
    setChapters(data.chapters ?? [])
    setDrafts(data.drafts ?? [])
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (busyChapter === null) return
    setStage(0)
    const t = setInterval(() => setStage(s => Math.min(s + 1, DRAFT_STAGES.length - 1)), 45000)
    return () => clearInterval(t)
  }, [busyChapter])

  const generate = useCallback(
    async (chapterNumber: number) => {
      setBusyChapter(chapterNumber)
      setError(null)
      try {
        const res = await fetch('/api/drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chapterNumber, language }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Drafting failed')
        setOpenChapter(chapterNumber)
        await refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed')
      } finally {
        setBusyChapter(null)
      }
    },
    [language, refresh]
  )

  const toggleApprove = useCallback(
    async (chapterNumber: number, approved: boolean) => {
      await fetch('/api/drafts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterNumber, approved }),
      })
      refresh()
    },
    [refresh]
  )

  const approvedCount = drafts.filter(d => d.approved).length

  return (
    <JourneyShell
      title="IHCS Drafts"
      subtitle="AI writes each chapter from your evidence — every claim cited, nothing invented"
      stepDone={[
        '/journey/evidence',
        ...(approvedCount === chapters.length && chapters.length > 0 ? ['/journey/drafts'] : []),
      ]}
      actions={
        <>
          <div className="flex rounded-full bg-[#F5F1E8] p-1 text-xs">
            {(['bm', 'en'] as const).map(l => (
              <button
                key={l}
                onClick={() => setLanguage(l)}
                className={`px-3 py-1 rounded-full font-bold transition ${
                  language === l ? 'bg-[#2D4A3E] text-white' : 'text-[#2D4A3E]/50'
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <span className="v2-chip bg-white border-[#2D4A3E]/10 text-[#2D4A3E]/70">
            {approvedCount}/{chapters.length || 7} approved
          </span>
        </>
      }
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex flex-col gap-3 pb-10">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl p-4">{error}</div>
        )}

        {chapters.map(ch => {
          const draft = drafts.find(d => d.chapterNumber === ch.number)
          const busy = busyChapter === ch.number
          const open = openChapter === ch.number
          return (
            <div key={ch.number} className={`v2-card ${draft?.approved ? 'ring-1 ring-[#C5E86C]' : ''}`}>
              <div className="p-4 flex items-center gap-3 flex-wrap">
                <span
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0
                    ${draft?.approved ? 'bg-[#C5E86C] text-[#2D4A3E]' : draft ? 'bg-[#2D4A3E] text-[#C5E86C]' : 'bg-[#F5F1E8] text-[#2D4A3E]/40'}`}
                >
                  {draft?.approved ? <CheckCircle2 className="w-5 h-5" /> : ch.number}
                </span>
                <button
                  className="flex-1 min-w-[180px] text-left group"
                  onClick={() => setOpenChapter(open ? null : ch.number)}
                >
                  <h3 className="font-semibold text-[#2D4A3E] text-sm flex items-center gap-1.5">
                    BAB {ch.number}: {ch.titleBM}
                    {draft && (
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-[#2D4A3E]/40 transition-transform ${open ? 'rotate-180' : ''}`}
                      />
                    )}
                  </h3>
                  <p className="text-xs text-[#2D4A3E]/50">
                    {ch.titleEN}
                    {draft &&
                      ` · ${draft.citations.length} citations${draft.missingInfo.length ? ` · ${draft.missingInfo.length} info needed` : ''}`}
                  </p>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => generate(ch.number)}
                    disabled={busyChapter !== null}
                    className="v2-btn-primary !px-3 !py-1.5 !text-xs"
                  >
                    {busy ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : draft ? (
                      <RefreshCw className="w-3.5 h-3.5" />
                    ) : (
                      <PenLine className="w-3.5 h-3.5" />
                    )}
                    {busy ? 'Drafting…' : draft ? 'Redraft' : 'Draft'}
                  </button>
                  {draft && (
                    <button
                      onClick={() => toggleApprove(ch.number, !draft.approved)}
                      className={
                        draft.approved ? 'v2-btn-accent !px-3 !py-1.5 !text-xs' : 'v2-btn-ghost !px-3 !py-1.5 !text-xs'
                      }
                    >
                      {draft.approved ? 'Approved ✓' : 'Approve'}
                    </button>
                  )}
                </div>
              </div>

              {busy && (
                <div className="px-4 pb-4">
                  <div className="bg-[#F5F1E8] rounded-xl p-4 flex items-center gap-3">
                    <Loader2 className="w-4 h-4 animate-spin text-[#2D4A3E]" />
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-[#2D4A3E]">{DRAFT_STAGES[stage]}</p>
                      <p className="text-[10px] text-[#2D4A3E]/50">
                        Generator → critic → revision. Takes 2–4 minutes.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <AnimatePresence>
                {open && draft && !busy && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-[#2D4A3E]/10 p-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
                      <div className="lg:col-span-2 prose prose-sm max-w-none text-[#2D4A3E] prose-headings:text-[#2D4A3E] prose-strong:text-[#2D4A3E]">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{draft.content}</ReactMarkdown>
                      </div>
                      <div className="flex flex-col gap-3 text-xs">
                        <div className="bg-[#F5F1E8] rounded-xl p-3">
                          <p className="font-bold text-[#2D4A3E] flex items-center gap-1 mb-2">
                            <Quote className="w-3.5 h-3.5" /> Evidence citations ({draft.citations.length})
                          </p>
                          {draft.citations.length === 0 && (
                            <p className="text-[#2D4A3E]/50">No business-specific claims cited.</p>
                          )}
                          {draft.citations.map((c, i) => (
                            <div key={i} className="mb-2 last:mb-0">
                              <p className="text-[#2D4A3E]/80 leading-snug">“{c.claim}”</p>
                              <p className="text-[#2D4A3E]/50 flex items-center gap-1 mt-0.5">
                                <FileText className="w-3 h-3" /> {c.source}
                              </p>
                            </div>
                          ))}
                        </div>
                        {draft.missingInfo.length > 0 && (
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                            <p className="font-bold text-amber-800 flex items-center gap-1 mb-2">
                              <AlertCircle className="w-3.5 h-3.5" /> Info you must supply
                            </p>
                            <ul className="text-amber-800 flex flex-col gap-1">
                              {draft.missingInfo.map((m, i) => (
                                <li key={i} className="flex gap-1.5">
                                  <span className="shrink-0">•</span> {m}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}

        <div className="flex justify-end mt-2">
          <Link href="/journey/pack" className="v2-btn-primary">
            Compile Audit Pack <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </JourneyShell>
  )
}
