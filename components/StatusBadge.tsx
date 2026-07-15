'use client'

interface StatusBadgeProps {
  severity: 'high' | 'medium' | 'low'
  language: 'en' | 'bm'
}

export function StatusBadge({ severity, language }: StatusBadgeProps) {
  const labels = {
    high: language === 'bm' ? 'RISIKO TINGGI' : 'HIGH RISK',
    medium: language === 'bm' ? 'RISIKO SEDERHANA' : 'MEDIUM RISK',
    low: language === 'bm' ? 'RISIKO RENDAH' : 'LOW RISK',
  }

  const colors = {
    high: 'bg-red-100 text-red-700 border-red-300',
    medium: 'bg-amber-100 text-amber-700 border-amber-300',
    low: 'bg-[#C5E86C]/30 text-[#2D4A3E] border-[#C5E86C]',
  }

  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${colors[severity]}`}>
      {labels[severity]}
    </span>
  )
}

interface NCRIssue {
  category: 'hygiene' | 'staff' | 'transport' | 'halal_executive'
  severity: 'high' | 'medium' | 'low'
  description: string
  howToFix: string
  estimatedCost: string
}

interface IssueCardProps {
  issue: NCRIssue
  language: 'en' | 'bm'
}

export function IssueCard({ issue, language }: IssueCardProps) {
  const categoryLabels = {
    hygiene: language === 'bm' ? 'Kebersihan' : 'Hygiene',
    staff: language === 'bm' ? 'Kakitangan' : 'Staff',
    transport: language === 'bm' ? 'Pengangkutan' : 'Transport',
    halal_executive: language === 'bm' ? 'Halal Executive' : 'Halal Executive',
  }

  const categoryIcons = {
    hygiene: '🧼',
    staff: '👥',
    transport: '🚚',
    halal_executive: '👔',
  }

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F5F1E8] flex items-center justify-center">
            <span className="text-xl">{categoryIcons[issue.category]}</span>
          </div>
          <h4 className="font-semibold text-[#2D4A3E]">{categoryLabels[issue.category]}</h4>
        </div>
        <StatusBadge severity={issue.severity} language={language} />
      </div>

      <p className="text-sm text-gray-700 mb-4">{issue.description}</p>

      <div className="bg-[#C5E86C]/20 rounded-xl p-4 mb-3">
        <p className="text-xs font-semibold text-[#2D4A3E] mb-1">
          {language === 'bm' ? 'Cara Betulkan:' : 'How to Fix:'}
        </p>
        <p className="text-sm text-[#2D4A3E]">{issue.howToFix}</p>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {language === 'bm' ? 'Anggaran Kos' : 'Estimated Cost'}
        </span>
        <span className="font-bold text-[#2D4A3E]">{issue.estimatedCost}</span>
      </div>
    </div>
  )
}