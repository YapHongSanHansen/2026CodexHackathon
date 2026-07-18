"use client";

import Link from 'next/link';
import {
  ClipboardCheck,
  FolderOpen,
  Image as ImageIcon,
  Package,
  PenLine,
} from 'lucide-react';
import { ScrollExpansionHero } from '@/components/ui/scroll-expansion-hero';
import { CHAPTERS } from '@/lib/ihcs/chapters';

const steps = [
  {
    href: '/journey/evidence',
    icon: FolderOpen,
    label: 'Evidence Locker',
    description:
      'Collect your business documents in one place and start the halal review.',
  },
  {
    href: '/journey/photos',
    icon: ImageIcon,
    label: 'Upload Photos',
    description:
      'Add kitchen and premises photos so the system can spot visual gaps early.',
  },
  {
    href: '/journey/gaps',
    icon: ClipboardCheck,
    label: 'Gap Report',
    description:
      'See what passes, what needs work, and what still blocks submission.',
  },
  {
    href: '/journey/drafts',
    icon: PenLine,
    label: 'IHCS Drafts',
    description:
      'Generate chapter drafts for your IHCS manual with the missing pieces filled in.',
  },
  {
    href: '/journey/pack',
    icon: Package,
    label: 'Audit Pack',
    description:
      'Bundle the final evidence, report, and draft manual into an audit-ready pack.',
  },
];

export default function HomePage() {
  return (
    <ScrollExpansionHero
      backgroundSrc="/home-hero.jpg"
      brand="HalalBoleh"
      tagline="AI copilot for JAKIM halal certification"
      title="Get your HALAL certification"
      subtitle="Upload your business documents, HalalBoleh will analyze them against MPPHM 2020, flag what's missing, draft your IHCS manual, and bundle an audit-ready pack."
      actionHref="/journey/evidence"
      actionLabel="Open workspace"
      steps={steps}
    >
      <div className="mx-auto rounded-[32px] border border-[#2D4A3E]/10 bg-white p-8 text-center shadow-[0_20px_60px_rgba(45,74,62,0.06)]">
        <div className="flex flex-col items-center gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2D4A3E]/45">
              Workflow
            </p>
            <h3 className="mt-1 text-2xl font-semibold text-[#173127]">
              {CHAPTERS.length} IHCS chapters are ready to be drafted
            </h3>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[#173127]/65">
              Review the generated IHCS chapters and approve the draft manual for your audit pack.
            </p>
          </div>
          <Link
            href="/journey/drafts"
            className="inline-flex items-center justify-center rounded-full border border-[#2D4A3E]/15 bg-[#2D4A3E] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1f352c]"
          >
            Review drafts
          </Link>
        </div>
      </div>
    </ScrollExpansionHero>
  );
}
