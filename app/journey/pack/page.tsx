'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Package,
  Loader2,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileText,
  FolderArchive,
} from 'lucide-react'
import JourneyShell from '@/components/JourneyShell'

interface Readiness {
  evidenceCount: number
  readinessScore: number | null
  chaptersDrafted: number
  chaptersApproved: number
  chaptersTotal: number
}

interface Pack {
  url: string
  fileName: string
  generatedAt: string
  contents: string[]
}

export default function PackPage() {
  const [readiness, setReadiness] = useState<Readiness | null>(null)
  const [pack, setPack] = useState<Pack | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/pack')
      .then(r => r.json())
      .then(d => setReadiness(d.readiness))
  }, [])

  const compile = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/pack', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Compilation failed')
      setPack(data.pack)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }, [])

  const checks = readiness
    ? [
        {
          ok: readiness.evidenceCount > 0,
          label: `${readiness.evidenceCount} evidence documents uploaded`,
        },
        {
          ok: (readiness.readinessScore ?? 0) >= 85,
          label:
            readiness.readinessScore === null
              ? 'Gap analysis not run yet'
              : `Readiness score ${readiness.readinessScore}% ${(readiness.readinessScore ?? 0) >= 85 ? '(≥85% — ready)' : '(target ≥85%)'}`,
        },
        {
          ok: readiness.chaptersApproved === readiness.chaptersTotal,
          label: `${readiness.chaptersApproved}/${readiness.chaptersTotal} IHCS chapters approved (${readiness.chaptersDrafted} drafted)`,
        },
      ]
    : []

  return (
    <JourneyShell
      title="Audit-Ready Pack"
      subtitle="Everything bundled for your MYeHALAL submission and the JAKIM audit"
      stepDone={['/journey/evidence']}
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex flex-col gap-5 pb-10">
        <div className="v2-card p-5">
          <h2 className="font-bold text-[#2D4A3E] text-sm mb-3">Pre-flight checklist</h2>
          <ul className="flex flex-col gap-2.5 text-sm">
            {checks.map((c, i) => (
              <li key={i} className="flex items-center gap-2.5">
                {c.ok ? (
                  <CheckCircle2 className="w-4.5 h-4.5 text-green-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4.5 h-4.5 text-amber-500 shrink-0" />
                )}
                <span className="text-[#2D4A3E]/80">{c.label}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-[#2D4A3E]/45">
            You can compile anytime — warnings just mean the pack will contain placeholders or a
            low score.
          </p>
        </div>

        <div className="v2-card p-8 flex flex-col items-center gap-4 text-center">
          <span className="w-16 h-16 rounded-2xl bg-[#F5F1E8] flex items-center justify-center">
            <FolderArchive className="w-8 h-8 text-[#2D4A3E]" />
          </span>
          <div>
            <h2 className="v2-title text-lg">One zip, audit-ready</h2>
            <p className="text-xs text-[#2D4A3E]/55 mt-1 max-w-sm">
              IHCS manual PDF (from your approved template) + gap report with action items +
              evidence index with provenance + your original documents.
            </p>
          </div>
          <button onClick={compile} disabled={busy} className="v2-btn-primary !px-6 !py-3">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
            {busy ? 'Compiling pack…' : 'Compile audit pack'}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}

          {pack && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full bg-[#C5E86C]/20 border border-[#C5E86C] rounded-2xl p-4 text-left"
            >
              <a
                href={pack.url}
                download
                className="inline-flex items-center gap-2 font-bold text-[#2D4A3E] hover:underline"
              >
                <Download className="w-4 h-4" /> {pack.fileName}
              </a>
              <ul className="mt-2 text-xs text-[#2D4A3E]/70 grid grid-cols-1 sm:grid-cols-2 gap-1">
                {pack.contents.map(c => (
                  <li key={c} className="flex items-center gap-1.5">
                    <FileText className="w-3 h-3 shrink-0" /> {c}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </div>
      </div>
    </JourneyShell>
  )
}
