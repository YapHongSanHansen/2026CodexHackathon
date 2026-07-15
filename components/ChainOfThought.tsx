'use client'

import { Sparkles } from 'lucide-react'

interface ChainOfThoughtProps {
  thoughts: string[]
  language: 'en' | 'bm'
}

export default function ChainOfThought({ thoughts, language }: ChainOfThoughtProps) {
  return (
    <div className="bg-gradient-to-br from-[#2D4A3E] to-[#3D5A4E] rounded-2xl p-6 shadow-lg">
      <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-[#C5E86C]" />
        {language === 'bm' ? 'Penaakulan AI' : 'AI Reasoning'}
      </h3>
      <div className="space-y-3">
        {thoughts.map((thought, index) => (
          <div
            key={index}
            className="text-sm text-white/90 bg-white/10 rounded-xl p-4 border border-white/10"
          >
            <span className="font-semibold text-[#C5E86C]">
              {language === 'bm' ? 'Langkah' : 'Step'} {index + 1}:
            </span>{' '}
            {thought}
          </div>
        ))}
      </div>
      <p className="text-xs text-white/60 mt-4">
        {language === 'bm'
          ? '💡 Teknologi JamAI Base menunjukkan proses penaakulan AI untuk ketelusan penuh.'
          : '💡 JamAI Base technology shows AI reasoning process for full transparency.'}
      </p>
    </div>
  )
}