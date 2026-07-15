'use client'

import { useCallback, useEffect, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileText,
  Trash2,
  UploadCloud,
  Building2,
  UtensilsCrossed,
  ListChecks,
  BadgeCheck,
  GitBranch,
  GraduationCap,
  ScrollText,
  Bug,
  Camera,
} from 'lucide-react'
import JourneyShell from '@/components/JourneyShell'

const CATEGORIES = [
  { id: 'business_profile', label: 'Business Profile / SSM', icon: Building2 },
  { id: 'menu_list', label: 'Menu List', icon: UtensilsCrossed },
  { id: 'ingredient_list', label: 'Ingredient List', icon: ListChecks },
  { id: 'supplier_certificate', label: 'Supplier Halal Certs', icon: BadgeCheck },
  { id: 'flow_chart', label: 'Flow Chart (Carta Alir)', icon: GitBranch },
  { id: 'training_certificate', label: 'Training Certificates', icon: GraduationCap },
  { id: 'halal_policy', label: 'Halal Policy', icon: ScrollText },
  { id: 'pest_control', label: 'Pest Control Contract', icon: Bug },
  { id: 'kitchen_photo', label: 'Kitchen Photos', icon: Camera },
]

interface Doc {
  id: string
  category: string
  fileName: string
  status: string
  issues?: string[]
  facts?: { summary?: string }
}

function DocRow({ doc, onDelete }: { doc: Doc; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const issueCount = doc.issues?.length ?? 0
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#F5F1E8] rounded-xl p-2.5 text-xs"
    >
      <div className="flex items-start gap-2">
        {doc.status === 'analyzed' && issueCount === 0 && (
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
        )}
        {doc.status === 'analyzed' && issueCount > 0 && (
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        )}
        {doc.status === 'error' && <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />}
        {(doc.status === 'uploaded' || doc.status === 'analyzing') && (
          <Loader2 className="w-4 h-4 animate-spin text-[#2D4A3E]/50 shrink-0 mt-0.5" />
        )}
        <button className="flex-1 min-w-0 text-left" onClick={() => setExpanded(!expanded)}>
          <p className="font-semibold text-[#2D4A3E] truncate flex items-center gap-1">
            <FileText className="w-3 h-3 shrink-0" /> {doc.fileName}
          </p>
          {issueCount > 0 && !expanded && (
            <p className="text-amber-700 mt-0.5">
              {issueCount} issue{issueCount > 1 ? 's' : ''} found — tap to view
            </p>
          )}
        </button>
        <button
          onClick={() => onDelete(doc.id)}
          className="text-[#2D4A3E]/30 hover:text-red-500 transition"
          title="Remove"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {doc.facts?.summary && <p className="text-[#2D4A3E]/70 mt-2">{doc.facts.summary}</p>}
            {issueCount > 0 && (
              <ul className="mt-1.5 text-amber-700 flex flex-col gap-1">
                {doc.issues!.map((issue, i) => (
                  <li key={i} className="flex gap-1.5">
                    <span className="shrink-0">⚠</span> {issue}
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function CategoryZone({
  category,
  label,
  icon: Icon,
  docs,
  onUpload,
  onDelete,
  uploading,
}: {
  category: string
  label: string
  icon: typeof Building2
  docs: Doc[]
  onUpload: (category: string, files: File[]) => void
  onDelete: (id: string) => void
  uploading: boolean
}) {
  const onDrop = useCallback((accepted: File[]) => onUpload(category, accepted), [category, onUpload])
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop })
  const hasIssues = docs.some(d => (d.issues?.length ?? 0) > 0)

  return (
    <div className="v2-card p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <span
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0
            ${docs.length > 0 ? (hasIssues ? 'bg-amber-100 text-amber-600' : 'bg-[#C5E86C]/50 text-[#2D4A3E]') : 'bg-[#F5F1E8] text-[#2D4A3E]/50'}`}
        >
          <Icon className="w-4.5 h-4.5" />
        </span>
        <h3 className="font-semibold text-[#2D4A3E] text-sm flex-1">{label}</h3>
        {docs.length > 0 && (
          <span className="v2-chip bg-[#C5E86C]/30 border-[#C5E86C]/60 text-[#2D4A3E]">{docs.length}</span>
        )}
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl px-4 py-5 text-center text-xs cursor-pointer transition-all
          ${isDragActive ? 'border-[#C5E86C] bg-[#C5E86C]/15 scale-[1.01]' : 'border-[#2D4A3E]/15 hover:border-[#C5E86C] hover:bg-[#C5E86C]/5'}`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <span className="inline-flex items-center gap-2 text-[#2D4A3E]/70 font-medium">
            <Loader2 className="w-4 h-4 animate-spin" /> Analyzing with AI…
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 text-[#2D4A3E]/50">
            <UploadCloud className="w-4 h-4" /> Drop file or click
          </span>
        )}
      </div>

      {docs.map(doc => (
        <DocRow key={doc.id} doc={doc} onDelete={onDelete} />
      ))}
    </div>
  )
}

export default function EvidenceLockerPage() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const res = await fetch('/api/evidence')
    const data = await res.json()
    setDocs(data.documents ?? [])
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const onUpload = useCallback(
    async (category: string, files: File[]) => {
      setUploadingCategory(category)
      try {
        for (const file of files) {
          const fd = new FormData()
          fd.append('file', file)
          fd.append('category', category)
          await fetch('/api/evidence', { method: 'POST', body: fd })
        }
      } finally {
        setUploadingCategory(null)
        refresh()
      }
    },
    [refresh]
  )

  const onDelete = useCallback(
    async (id: string) => {
      await fetch(`/api/evidence?id=${id}`, { method: 'DELETE' })
      refresh()
    },
    [refresh]
  )

  const analyzedCount = docs.filter(d => d.status === 'analyzed').length
  const coveredCategories = new Set(docs.map(d => d.category)).size

  return (
    <JourneyShell
      title="Evidence Locker"
      subtitle="Upload your documents — HalalBoleh reads each one and flags problems instantly"
      stepDone={docs.length > 0 ? ['/journey/evidence'] : []}
      actions={
        <Link href="/journey/gaps" className="v2-btn-primary">
          Gap Report <ArrowRight className="w-4 h-4" />
        </Link>
      }
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center gap-4 mb-4 text-xs text-[#2D4A3E]/60">
          <span className="v2-chip bg-white border-[#2D4A3E]/10 text-[#2D4A3E]/70">
            {analyzedCount}/{docs.length} analyzed
          </span>
          <span className="v2-chip bg-white border-[#2D4A3E]/10 text-[#2D4A3E]/70">
            {coveredCategories}/{CATEGORIES.length} categories covered
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-8">
          {CATEGORIES.map(cat => (
            <CategoryZone
              key={cat.id}
              category={cat.id}
              label={cat.label}
              icon={cat.icon}
              docs={docs.filter(d => d.category === cat.id)}
              onUpload={onUpload}
              onDelete={onDelete}
              uploading={uploadingCategory === cat.id}
            />
          ))}
        </div>
      </div>
    </JourneyShell>
  )
}
