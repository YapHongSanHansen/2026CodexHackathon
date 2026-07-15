import React from 'react'
import { Twitter, Facebook, Github, Mail } from 'lucide-react'

export default function WebFooter() {
  return (
    <footer className="bg-[#F5F1E8] text-gray-800 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <div className="text-2xl font-bold bg-gradient-to-r from-[#2D4A3E] to-[#C5E86C] bg-clip-text text-transparent">
            HalalBoleh
          </div>
          <p className="mt-3 text-sm text-gray-600">
            AI-assisted halal certification tools — built for Malaysian SMEs and auditors.
          </p>
        </div>

        <div className="flex flex-col">
          <h4 className="font-semibold text-[#2D4A3E] mb-3">Product</h4>
          <a href="/ingredient-guard" className="text-sm text-gray-600 hover:text-[#2D4A3E] mb-2">Ingredient Scanner</a>
          <a href="/ihcs-architect" className="text-sm text-gray-600 hover:text-[#2D4A3E] mb-2">IHCS Auto-Architect</a>
          <a href="/pre-audit" className="text-sm text-gray-600 hover:text-[#2D4A3E]">Pre-Audit Readiness</a>
        </div>

        <div className="flex flex-col">
          <h4 className="font-semibold text-[#2D4A3E] mb-3">Company</h4>
          <a href="/pricing" className="text-sm text-gray-600 hover:text-[#2D4A3E] mb-2">Pricing</a>
          <a href="/contact" className="text-sm text-gray-600 hover:text-[#2D4A3E] mb-2">Contact</a>
          <a href="/terms" className="text-sm text-gray-600 hover:text-[#2D4A3E]">Terms</a>
        </div>
      </div>

      <div className="border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between text-sm text-gray-600 gap-4">
          <div>© {new Date().getFullYear()} HalalBoleh — Built for EmbeddedLLM CodeFest</div>
          <div className="flex items-center gap-4 mt-2">
            <a href="mailto:hello@amana.my" className="hover:text-[#2D4A3E]"><Mail className="w-4 h-4" /></a>
            <a href="#" className="hover:text-[#2D4A3E]"><Twitter className="w-4 h-4" /></a>
            <a href="#" className="hover:text-[#2D4A3E]"><Facebook className="w-4 h-4" /></a>
            <a href="#" className="hover:text-[#2D4A3E]"><Github className="w-4 h-4" /></a>
          </div>
        </div>
      </div>
    </footer>
  )
}