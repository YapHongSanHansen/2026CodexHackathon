'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { FolderOpen, ClipboardCheck, PenLine, Package, Home, Check, Image, Video } from 'lucide-react'

const STEPS = [
  { href: '/journey/evidence', icon: FolderOpen, label: 'Evidence' },
  { href: '/journey/photos', icon: Image, label: 'Photos' },
  { href: '/journey/podcast', icon: Video, label: 'Podcast' },
  { href: '/journey/gaps', icon: ClipboardCheck, label: 'Gap Report' },
  { href: '/journey/drafts', icon: PenLine, label: 'Drafts' },
  { href: '/journey/pack', icon: Package, label: 'Audit Pack' },
]

export default function JourneyShell({
  title,
  subtitle,
  actions,
  children,
  stepDone = [],
}: {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  children: React.ReactNode
  /** hrefs of steps to render as completed */
  stepDone?: string[]
}) {
  const pathname = usePathname()
  const activeIdx = STEPS.findIndex(s => pathname?.startsWith(s.href))

  return (
    <div className="relative min-h-screen bg-[#FBFBFA] text-[#173127] flex flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#00000005_1px,transparent_1px),linear-gradient(to_bottom,#00000005_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_top,black_55%,transparent_92%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_50%_0%,rgba(61,235,82,0.14),transparent_66%)]" />
      <div className="pointer-events-none absolute left-[8%] top-28 h-6 w-6 rounded-full bg-[#3DEB52]/80 shadow-[0_14px_40px_rgba(61,235,82,0.22)]" />
      <div className="pointer-events-none absolute right-[12%] top-44 h-4 w-4 rounded-full bg-[#C5E86C]/80 shadow-[0_14px_40px_rgba(197,232,108,0.24)]" />

      <header className="sticky top-0 z-30 border-b border-[#173127]/10 bg-white/80 backdrop-blur-xl">
        <div className="px-4 sm:px-6 py-3 flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-[#173127] hover:opacity-70 transition"
            title="Dashboard"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#173127]/10 bg-[#FBFBFA] shadow-[0_8px_22px_rgba(23,49,39,0.06)]">
              <Home className="w-4 h-4" />
            </span>
            <span className="font-black text-sm tracking-tight hidden sm:inline">
              HalalBoleh<span className="text-[#3DEB52]">.</span>
            </span>
          </Link>

          <nav className="flex-1 flex items-center justify-center">
            <ol className="flex items-center rounded-full border border-[#173127]/10 bg-white/70 px-2 py-1 shadow-[0_12px_34px_rgba(23,49,39,0.06)] backdrop-blur-xl">
              {STEPS.map((s, i) => {
                const active = i === activeIdx
                const done = stepDone.includes(s.href)
                return (
                  <li key={s.href} className="flex items-center">
                    {i > 0 && (
                      <span
                        className={`hidden sm:block w-3 lg:w-6 h-px mx-1 ${i <= activeIdx ? 'bg-[#173127]/35' : 'bg-[#173127]/10'}`}
                      />
                    )}
                    <Link
                      href={s.href}
                      className={`flex items-center gap-1.5 rounded-full px-2 sm:px-3 py-1.5 text-xs font-semibold transition
                        ${
                          active
                            ? 'bg-[#173127] text-white shadow-[0_8px_24px_rgba(23,49,39,0.16)]'
                            : done
                              ? 'bg-[#C5E86C]/60 text-[#173127] hover:bg-[#C5E86C]/80'
                              : 'text-[#173127]/50 hover:text-[#173127] hover:bg-[#ECFFEF]'
                        }`}
                    >
                      {done && !active ? <Check className="w-3.5 h-3.5" /> : <s.icon className="w-3.5 h-3.5" />}
                      <span className="hidden md:inline">{s.label}</span>
                      <span className="md:hidden">{i + 1}</span>
                    </Link>
                  </li>
                )
              })}
            </ol>
          </nav>

          <div className="flex items-center gap-2">{actions}</div>
        </div>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative z-10 flex-1"
      >
        <div className="px-4 sm:px-6 pt-8 pb-4 max-w-6xl mx-auto w-full text-center sm:text-left">
          <p className="mb-2 inline-flex rounded-full border border-[#173127]/10 bg-white/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#173127]/45 backdrop-blur">
            HalalBoleh workspace
          </p>
          <h1 className="v2-title text-3xl sm:text-4xl">{title}</h1>
          {subtitle && <p className="mt-2 max-w-3xl text-sm leading-6 text-[#173127]/62">{subtitle}</p>}
        </div>
        {children}
      </motion.div>
    </div>
  )
}
