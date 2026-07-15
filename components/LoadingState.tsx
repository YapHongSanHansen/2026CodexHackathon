'use client'

import { Loader2 } from 'lucide-react'

interface LoadingStateProps {
  message: string
  submessage?: string
}

export default function LoadingState({ message, submessage }: LoadingStateProps) {
  return (
    <div className="min-h-screen bg-[#F5F1E8] flex flex-col items-center justify-center p-4">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2D4A3E] to-[#3D5A4E] flex items-center justify-center mb-6">
        <Loader2 className="w-8 h-8 text-[#C5E86C] animate-spin" />
      </div>
      <p className="text-[#2D4A3E] font-semibold text-center text-lg">{message}</p>
      {submessage && (
        <p className="text-sm text-gray-500 mt-2 text-center">{submessage}</p>
      )}
    </div>
  )
}