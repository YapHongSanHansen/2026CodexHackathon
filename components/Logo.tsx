import React from 'react'

interface LogoProps {
  size?: number
  showText?: boolean
  variant?: 'full' | 'icon' | 'text'
  theme?: 'dark' | 'light'
  className?: string
}

export default function Logo({ 
  size = 40, 
  showText = true, 
  variant = 'full',
  theme = 'light',
  className = '' 
}: LogoProps) {
  const textSize = size * 0.6

  const IconSVG = () => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="amanaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2D4A3E" />
          <stop offset="100%" stopColor="#C5E86C" />
        </linearGradient>
      </defs>

      {/* Background circle */}
      <circle cx="24" cy="24" r="22" fill="#2D4A3E" />
      
      {/* Checkmark */}
      <path
        d="M14 24 L20 30 L34 16"
        stroke="#C5E86C"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )

  const TextContent = () => (
    <span
      className={`font-bold ${
        theme === 'dark' 
          ? 'bg-gradient-to-r from-amber-300 via-yellow-400 to-emerald-300 bg-clip-text text-transparent' 
          : 'bg-gradient-to-r from-[#2D4A3E] to-[#C5E86C] bg-clip-text text-transparent'
      }`}
      style={{ fontSize: `${textSize}px`, lineHeight: 1.2 }}
    >
      HalalBoleh
    </span>
  )

  if (variant === 'icon') {
    return (
      <div className={className}>
        <IconSVG />
      </div>
    )
  }

  if (variant === 'text') {
    return (
      <div className={className}>
        <TextContent />
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <IconSVG />
      {showText && <TextContent />}
    </div>
  )
}