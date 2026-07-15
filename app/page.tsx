import Link from 'next/link'
import {
  ArrowRight,
  FolderOpen,
  ClipboardCheck,
  PenLine,
  Package,
  Sparkles,
  Bot,
} from 'lucide-react'
import { listDocuments, loadGapReport, loadDrafts } from '@/lib/evidence/store'
import { CHAPTERS } from '@/lib/ihcs/chapters'

export const dynamic = 'force-dynamic'

function ScoreRing({ score }: { score: number | null }) {
  const r = 62
  const c = 2 * Math.PI * r
  const value = score ?? 0
  const color = value >= 85 ? '#16a34a' : value >= 60 ? '#d97706' : value > 0 ? '#dc2626' : '#2D4A3E30'
  return (
    <svg viewBox="0 0 150 150" className="w-40 h-40">
      <circle cx="75" cy="75" r={r} fill="none" stroke="#2D4A3E15" strokeWidth="12" />
      <circle
        cx="75"
        cy="75"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={`${(value / 100) * c} ${c}`}
        transform="rotate(-90 75 75)"
      />
      <text x="75" y="72" textAnchor="middle" fill="#2D4A3E" fontSize="30" fontWeight="bold">
        {score === null ? '—' : `${score}%`}
      </text>
      <text x="75" y="94" textAnchor="middle" fill="#2D4A3E" fontSize="11" opacity="0.6">
        audit readiness
      </text>
    </svg>
  )
}

export default function DashboardPage() {
  const docs = listDocuments()
  const report = loadGapReport()
  const drafts = loadDrafts()
  const approved = drafts.filter(d => d.approved).length

  const steps = [
    {
      href: '/journey/evidence',
      icon: FolderOpen,
      step: '①',
      title: 'Evidence Locker',
      status: `${docs.length} documents uploaded, ${docs.filter(d => d.status === 'analyzed').length} analyzed`,
      done: docs.length > 0,
    },
    {
      href: '/journey/gaps',
      icon: ClipboardCheck,
      step: '②',
      title: 'Gap Report',
      status: report
        ? `Score ${report.readinessScore}% · ${report.results.filter(r => r.verdict === 'pass').length}/${report.results.length} requirements pass`
        : 'Not run yet',
      done: (report?.readinessScore ?? 0) >= 85,
    },
    {
      href: '/journey/drafts',
      icon: PenLine,
      step: '③',
      title: 'IHCS Drafts',
      status: `${drafts.length}/${CHAPTERS.length} chapters drafted · ${approved} approved`,
      done: approved === CHAPTERS.length,
    },
    {
      href: '/journey/pack',
      icon: Package,
      step: '④',
      title: 'Audit Pack',
      status: 'Bundle manual + report + evidence for MYeHALAL',
      done: false,
    },
  ]

  return (
    <main className="min-h-screen bg-[#F5F1E8]">
      <header className="bg-white border-b border-[#2D4A3E]/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl font-black text-[#2D4A3E]">
            HalalBoleh<span className="text-[#C5E86C]">.</span>
          </span>
          <span className="text-xs text-[#2D4A3E]/50 hidden sm:inline">
            AI copilot for JAKIM halal certification
          </span>
        </div>
        <Link
          href="/journey/evidence"
          className="inline-flex items-center gap-2 bg-[#2D4A3E] text-white text-sm px-4 py-2 rounded-full hover:bg-[#2D4A3E]/90"
        >
          <Bot className="w-4 h-4" /> Open workspace
        </Link>
      </header>

      <div className="max-w-5xl mx-auto p-6 flex flex-col gap-6">
        <section className="bg-white rounded-3xl border border-[#2D4A3E]/10 p-6 flex flex-col sm:flex-row items-center gap-6">
          <ScoreRing score={report?.readinessScore ?? null} />
          <div className="flex-1">
            <h1 className="text-xl font-bold text-[#2D4A3E]">
              {report
                ? report.readinessScore >= 85
                  ? 'You are ready to submit to MYeHALAL 🎉'
                  : 'Your certification journey is underway'
                : 'Start your halal certification journey'}
            </h1>
            {report?.nextBestAction ? (
              <p className="mt-2 text-sm bg-[#C5E86C]/25 border border-[#C5E86C] rounded-xl p-3 text-[#2D4A3E]">
                <Sparkles className="w-4 h-4 inline mr-1" />
                <strong>Next best action:</strong> {report.nextBestAction}
              </p>
            ) : (
              <p className="mt-2 text-sm text-[#2D4A3E]/70">
                Upload your business documents and HalalBoleh will analyze them against MPPHM 2020,
                flag what's missing, draft your IHCS manual, and bundle an audit-ready pack.
              </p>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {steps.map(s => (
            <Link
              key={s.href}
              href={s.href}
              className="group bg-white rounded-2xl border border-[#2D4A3E]/10 p-5 hover:border-[#C5E86C] hover:shadow-sm transition"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`w-10 h-10 rounded-xl flex items-center justify-center
                    ${s.done ? 'bg-[#C5E86C] text-[#2D4A3E]' : 'bg-[#F5F1E8] text-[#2D4A3E]'}`}
                >
                  <s.icon className="w-5 h-5" />
                </span>
                <ArrowRight className="w-4 h-4 text-[#2D4A3E]/30 group-hover:text-[#2D4A3E] transition" />
              </div>
              <h2 className="mt-3 font-semibold text-[#2D4A3E]">
                {s.step} {s.title}
              </h2>
              <p className="mt-1 text-xs text-[#2D4A3E]/60">{s.status}</p>
            </Link>
          ))}
        </section>

        <p className="text-center text-xs text-[#2D4A3E]/40">
          HalalBoleh · powered by Grafilab, Exa &amp; ElevenLabs · guidance is best-effort against
          public records — final authority rests with JAKIM
        </p>
      </div>
    </main>
  )
}
