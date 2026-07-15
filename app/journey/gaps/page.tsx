'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Loader2,
  Sparkles,
  ClipboardCheck,
} from 'lucide-react'
import JourneyShell from '@/components/JourneyShell'

interface GapResult {
  requirementId: string
  section: string
  title: string
  verdict: 'pass' | 'warn' | 'fail' | 'missing'
  reasons: string[]
  actions: string[]
  citedDocumentIds: string[]
}

interface Report {
  generatedAt: string
  readinessScore: number
  results: GapResult[]
  nextBestAction?: string
}

const VERDICT_STYLE = {
  pass: {
    icon: CheckCircle2,
    chip: 'text-green-700 bg-green-50 border-green-200',
    bar: 'bg-green-500',
    label: 'PASS',
  },
  warn: {
    icon: AlertTriangle,
    chip: 'text-amber-700 bg-amber-50 border-amber-200',
    bar: 'bg-amber-400',
    label: 'WARN',
  },
  fail: {
    icon: XCircle,
    chip: 'text-red-700 bg-red-50 border-red-200',
    bar: 'bg-red-500',
    label: 'FAIL',
  },
  missing: {
    icon: HelpCircle,
    chip: 'text-gray-600 bg-gray-50 border-gray-200',
    bar: 'bg-gray-300',
    label: 'MISSING',
  },
} as const

function ScoreRing({ score }: { score: number }) {
  const r = 52
  const c = 2 * Math.PI * r
  const color = score >= 85 ? '#16a34a' : score >= 60 ? '#d97706' : '#dc2626'
  return (
    <svg viewBox="0 0 120 120" className="w-36 h-36">
      <circle cx="60" cy="60" r={r} fill="none" stroke="#2D4A3E12" strokeWidth="11" />
      <motion.circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="11"
        strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c - (score / 100) * c }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
        transform="rotate(-90 60 60)"
      />
      <text x="60" y="58" textAnchor="middle" fill="#2D4A3E" fontSize="26" fontWeight="bold">
        {score}%
      </text>
      <text x="60" y="76" textAnchor="middle" fill="#2D4A3E" fontSize="10" opacity="0.55">
        readiness
      </text>
    </svg>
  )
}

const RUNNING_STAGES = [
  'Reading your evidence facts…',
  'Checking each MPPHM 2020 requirement…',
  'Scoring and building your action plan…',
]

export default function GapReportPage() {
  const [report, setReport] = useState<Report | null>(null)
  const [running, setRunning] = useState(false)
  const [stage, setStage] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/gaps')
      .then(r => r.json())
      .then(d => setReport(d.report))
  }, [])

  useEffect(() => {
    if (!running) return
    setStage(0)
    const t = setInterval(() => setStage(s => Math.min(s + 1, RUNNING_STAGES.length - 1)), 18000)
    return () => clearInterval(t)
  }, [running])

  const run = useCallback(async () => {
    setRunning(true)
    setError(null)
    try {
      const res = await fetch('/api/gaps', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gap analysis failed')
      setReport(data.report)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setRunning(false)
    }
  }, [])

  return (
    <JourneyShell
      title="Gap Report"
      subtitle="Every MPPHM 2020 requirement, checked against your actual evidence"
      stepDone={['/journey/evidence', ...(report && report.readinessScore >= 85 ? ['/journey/gaps'] : [])]}
      actions={
        <button onClick={run} disabled={running} className="v2-btn-primary">
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {running ? 'Auditing…' : report ? 'Re-run' : 'Run analysis'}
        </button>
      }
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex flex-col gap-5 pb-10">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl p-4">{error}</div>
        )}

        {running && (
          <div className="v2-card p-6 flex flex-col items-center gap-3 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#2D4A3E]" />
            <p className="text-sm font-semibold text-[#2D4A3E]">{RUNNING_STAGES[stage]}</p>
            <p className="text-xs text-[#2D4A3E]/50">
              The AI auditor reviews all 8 requirements — takes about a minute
            </p>
            <div className="w-full max-w-sm flex flex-col gap-2 mt-2">
              {[0, 1, 2].map(i => (
                <div key={i} className="h-3 rounded-full v2-skeleton" style={{ width: `${100 - i * 18}%` }} />
              ))}
            </div>
          </div>
        )}

        {!report && !running && !error && (
          <div className="v2-card p-10 flex flex-col items-center gap-3 text-center">
            <span className="w-14 h-14 rounded-2xl bg-[#F5F1E8] flex items-center justify-center">
              <ClipboardCheck className="w-7 h-7 text-[#2D4A3E]/50" />
            </span>
            <h2 className="font-semibold text-[#2D4A3E]">No report yet</h2>
            <p className="text-sm text-[#2D4A3E]/60 max-w-sm">
              Upload your documents in the Evidence Locker, then run the analysis to see exactly
              where you stand against MPPHM 2020.
            </p>
            <button onClick={run} className="v2-btn-accent mt-1">
              <Sparkles className="w-4 h-4" /> Run gap analysis
            </button>
          </div>
        )}

        {report && !running && (
          <>
            <div className="v2-card p-6 flex flex-col sm:flex-row items-center gap-6">
              <ScoreRing score={report.readinessScore} />
              <div className="flex-1">
                <h2 className="v2-title text-lg">
                  {report.readinessScore >= 85
                    ? 'Ready to submit to MYeHALAL 🎉'
                    : 'Not ready yet — here is your action plan'}
                </h2>
                {report.nextBestAction && (
                  <p className="mt-2 text-sm bg-[#C5E86C]/25 border border-[#C5E86C] rounded-xl p-3 text-[#2D4A3E] leading-relaxed">
                    <Sparkles className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                    <strong>Next best action:</strong> {report.nextBestAction}
                  </p>
                )}
                <p className="mt-2 text-xs text-[#2D4A3E]/45">
                  Generated {new Date(report.generatedAt).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {report.results.map((r, i) => {
                const style = VERDICT_STYLE[r.verdict]
                const Icon = style.icon
                return (
                  <motion.div
                    key={r.requirementId}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="v2-card overflow-hidden flex"
                  >
                    <span className={`w-1.5 shrink-0 ${style.bar}`} />
                    <div className="p-4 flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`v2-chip ${style.chip}`}>
                          <Icon className="w-3.5 h-3.5" /> {style.label}
                        </span>
                        <div>
                          <h3 className="font-semibold text-[#2D4A3E] text-sm">{r.title}</h3>
                          <p className="text-xs text-[#2D4A3E]/50">{r.section}</p>
                        </div>
                      </div>
                      {r.reasons.length > 0 && (
                        <ul className="mt-3 text-xs text-[#2D4A3E]/70 flex flex-col gap-1">
                          {r.reasons.map((reason, j) => (
                            <li key={j} className="flex gap-1.5">
                              <span className="text-[#2D4A3E]/30 shrink-0">•</span> {reason}
                            </li>
                          ))}
                        </ul>
                      )}
                      {r.actions.length > 0 && (
                        <div className="mt-3 bg-[#F5F1E8] rounded-xl p-3">
                          <p className="text-xs font-bold text-[#2D4A3E] mb-1">To fix</p>
                          <ul className="text-xs text-[#2D4A3E]/75 flex flex-col gap-1">
                            {r.actions.map((action, j) => (
                              <li key={j} className="flex gap-1.5">
                                <span className="shrink-0">→</span> {action}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>

            <div className="flex justify-end">
              <Link href="/journey/drafts" className="v2-btn-primary">
                Draft IHCS chapters <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </>
        )}
      </div>
    </JourneyShell>
  )
}
