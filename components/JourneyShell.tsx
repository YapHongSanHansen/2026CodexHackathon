'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { FolderOpen, ClipboardCheck, PenLine, Package, Home, Check } from 'lucide-react'

const STEPS = [
  { href: '/journey/evidence', icon: FolderOpen, label: 'Evidence' },
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
    <div className="min-h-screen bg-[#F5F1E8] flex flex-col">
      <header className="bg-white/90 backdrop-blur border-b border-[#2D4A3E]/10 sticky top-0 z-30">
        <div className="px-4 sm:px-6 py-3 flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-[#2D4A3E] hover:opacity-70 transition"
            title="Dashboard"
          >
            <Home className="w-4 h-4" />
            <span className="font-black text-sm tracking-tight hidden sm:inline">
              HalalBoleh<span className="text-[#C5E86C]">.</span>
            </span>
          </Link>

          <nav className="flex-1 flex items-center justify-center">
            <ol className="flex items-center">
              {STEPS.map((s, i) => {
                const active = i === activeIdx
                const done = stepDone.includes(s.href)
                return (
                  <li key={s.href} className="flex items-center">
                    {i > 0 && (
                      <span
                        className={`w-4 sm:w-8 h-px mx-1 ${i <= activeIdx ? 'bg-[#2D4A3E]/40' : 'bg-[#2D4A3E]/15'}`}
                      />
                    )}
                    <Link
                      href={s.href}
                      className={`flex items-center gap-1.5 rounded-full px-2 sm:px-3 py-1.5 text-xs font-semibold transition
                        ${
                          active
                            ? 'bg-[#2D4A3E] text-white shadow-sm'
                            : done
                              ? 'bg-[#C5E86C]/50 text-[#2D4A3E] hover:bg-[#C5E86C]/70'
                              : 'text-[#2D4A3E]/50 hover:text-[#2D4A3E] hover:bg-[#F5F1E8]'
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
        className="flex-1"
      >
        <div className="px-4 sm:px-6 pt-6 pb-2 max-w-6xl mx-auto w-full">
          <h1 className="v2-title text-2xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-[#2D4A3E]/60">{subtitle}</p>}
        </div>
        {children}
      </motion.div>
    </div>
  )
}
