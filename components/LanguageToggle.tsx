'use client'

import { Language } from '@/lib/translations'

interface LanguageToggleProps {
  language: Language
  onLanguageChange: (lang: Language) => void
}

export default function LanguageToggle({ language, onLanguageChange }: LanguageToggleProps) {
  return (
    <div className="inline-flex items-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-full p-1">
      <button
        onClick={() => onLanguageChange('bm')}
        className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
          language === 'bm'
            ? 'bg-gradient-to-r from-amber-400 to-emerald-400 text-white shadow-lg'
            : 'text-gray-300 hover:text-white'
        }`}
      >
        BM
      </button>
      <button
        onClick={() => onLanguageChange('en')}
        className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
          language === 'en'
            ? 'bg-gradient-to-r from-amber-400 to-emerald-400 text-white shadow-lg'
            : 'text-gray-300 hover:text-white'
        }`}
      >
        EN
      </button>
    </div>
  )
}
