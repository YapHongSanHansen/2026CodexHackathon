'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Send, 
  Mic,
  FileText,
  CheckCircle,
  Loader2,
  Download,
  RefreshCw,
  MessageSquare,
  ChevronRight,
  Sparkles,
  Book
} from 'lucide-react'
import LanguageToggle from '@/components/LanguageToggle'
import { Language } from '@/lib/translations'

type Message = {
  role: 'ai' | 'user'
  content: string
  timestamp: Date
}

const CHAPTERS = [
  {
    id: 0,
    titleBm: 'Maklumat Syarikat',
    titleEn: 'Company Information',
    question: 'Boleh beritahu nama syarikat dan jenis perniagaan?',
    questionEn: 'Can you tell me your company name and business type?',
    field: 'company_info',
    icon: '🏢'
  },
  {
    id: 1,
    titleBm: 'Komitmen Halal',
    titleEn: 'Halal Commitment',
    question: 'Apa komitmen syarikat tentang halal?',
    questionEn: 'What is your company\'s commitment to halal?',
    field: 'halal_policy',
    icon: '📜'
  },
  {
    id: 2,
    titleBm: 'Beli Bahan Mentah',
    titleEn: 'Buying Raw Materials',
    question: 'Macam mana cara beli bahan mentah? Siapa yang beli?',
    questionEn: 'How do you buy raw materials? Who buys them?',
    field: 'purchasing_procedure',
    icon: '🛒'
  },
  {
    id: 3,
    titleBm: 'Terima Bahan',
    titleEn: 'Receiving Materials',
    question: 'Bila supplier hantar barang, macam mana check? Rekod ke tak?',
    questionEn: 'When supplier delivers, how do you check? Do you record?',
    field: 'receiving_procedure',
    icon: '📦'
  },
  {
    id: 4,
    titleBm: 'Simpan Bahan',
    titleEn: 'Storing Materials',
    question: 'Macam mana simpan bahan mentah? Letak mana?',
    questionEn: 'How do you store raw materials? Where?',
    field: 'storage_procedure',
    icon: '🏪'
  },
  {
    id: 5,
    titleBm: 'Bahan Mentah Utama',
    titleEn: 'Main Ingredients',
    question: 'Bahan mentah apa yang guna? Beli dari mana?',
    questionEn: 'What ingredients do you use? Buy from where?',
    field: 'raw_material_list',
    icon: '📋'
  },
  {
    id: 6,
    titleBm: 'Kesan Produk',
    titleEn: 'Track Products',
    question: 'Kalau ada masalah, boleh kesan produk ke? Macam mana?',
    questionEn: 'If there\'s a problem, can you track the product? How?',
    field: 'traceability_program',
    icon: '🔍'
  },
  {
    id: 7,
    titleBm: 'Tarik Balik Produk',
    titleEn: 'Product Recall',
    question: 'Kalau produk ada masalah halal, apa buat?',
    questionEn: 'If product has halal issue, what to do?',
    field: 'recall_procedure',
    icon: '⚠️'
  }
]

export default function IHCSArchitect() {
  const router = useRouter()
  const [language, setLanguage] = useState<Language>('en')
  const [currentChapter, setCurrentChapter] = useState(0)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [isTyping, setIsTyping] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [pdfReady, setPdfReady] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const t = {
    en: {
      title: 'IHCS Auto-Architect',
      subtitle: 'AI-Powered Manual Generator',
      chapter: 'Chapter',
      complete: 'Complete',
      typeAnswer: 'Type your answer... (Manglish/BM/EN)',
      send: 'Send',
      generating: 'Generating Manual...',
      generateBtn: 'Generate IHCS Manual',
      downloadBtn: 'Download PDF',
      pages: '50 pages',
      reset: 'Reset',
      preview: 'PDF Preview',
      manual: 'IHCS Manual',
      generatedFrom: 'Generated from your answers',
      voiceSoon: 'Voice input - coming soon!',
      resetConfirm: 'Reset interview? All answers will be deleted.',
    },
    bm: {
      title: 'Auto-Arkitek IHCS',
      subtitle: 'Penjana Manual Berkuasa AI',
      chapter: 'Bab',
      complete: 'Selesai',
      typeAnswer: 'Taip jawapan anda... (Manglish/BM/EN)',
      send: 'Hantar',
      generating: 'Menjana Manual...',
      generateBtn: 'Jana Manual IHCS',
      downloadBtn: 'Muat Turun PDF',
      pages: '50 muka surat',
      reset: 'Set Semula',
      preview: 'Pratonton PDF',
      manual: 'Manual IHCS',
      generatedFrom: 'Dijana daripada jawapan anda',
      voiceSoon: 'Input suara - akan datang!',
      resetConfirm: 'Set semula temubual? Semua jawapan akan dipadam.',
    }
  }

  const text = t[language]

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load saved answers from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ihcs-answers')
    if (saved) {
      setAnswers(JSON.parse(saved))
    }
  }, [])

  // Save answers to localStorage
  useEffect(() => {
    if (Object.keys(answers).length > 0) {
      localStorage.setItem('ihcs-answers', JSON.stringify(answers))
    }
  }, [answers])

  // Start interview
  useEffect(() => {
    if (messages.length === 0) {
      setTimeout(() => {
        addAIMessage(language === 'bm' 
          ? 'Assalamualaikum! Saya akan bantu Puan/Encik buat Manual IHCS. Kita akan bincang 7 topik penting. Ready? Mari kita mulakan!'
          : 'Assalamualaikum! I will help you create your IHCS Manual. We will discuss 7 important topics. Ready? Let\'s begin!'
        )
        setTimeout(() => {
          addAIMessage(language === 'bm' ? CHAPTERS[0].question : CHAPTERS[0].questionEn)
        }, 1000)
      }, 500)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addAIMessage = (content: string) => {
    setMessages(prev => [...prev, { role: 'ai', content, timestamp: new Date() }])
  }

  const addUserMessage = (content: string) => {
    setMessages(prev => [...prev, { role: 'user', content, timestamp: new Date() }])
  }

  const handleSend = () => {
    if (!input.trim()) return

    const userInput = input.trim()
    addUserMessage(userInput)
    setInput('')

    // Save answer
    const chapter = CHAPTERS[currentChapter]
    setAnswers(prev => ({ ...prev, [chapter.field]: userInput }))

    // AI acknowledges and moves to next chapter
    setIsTyping(true)
    setTimeout(() => {
      setIsTyping(false)
      addAIMessage(language === 'bm' 
        ? 'Terima kasih! Saya dah catat jawapan Puan/Encik. ✓'
        : 'Thank you! I have recorded your answer. ✓'
      )
      
      setTimeout(() => {
        if (currentChapter < CHAPTERS.length - 1) {
          const nextChapter = currentChapter + 1
          setCurrentChapter(nextChapter)
          addAIMessage(language === 'bm' ? CHAPTERS[nextChapter].question : CHAPTERS[nextChapter].questionEn)
        } else {
          addAIMessage(language === 'bm'
            ? 'Tahniah! Kita dah selesai semua soalan. Sekarang saya akan generate Manual IHCS untuk syarikat Puan/Encik. Klik butang "Jana Manual IHCS" untuk mula!'
            : 'Congratulations! We have completed all questions. Now I will generate the IHCS Manual for your company. Click "Generate IHCS Manual" to start!'
          )
        }
      }, 1500)
    }, 1000)
  }

  // Helper function to check if a chapter failed validation
  const isChapterNonCompliant = (htmlContent: string): boolean => {
    // Check for the specific error keywords from JamAI prompt
    return (
      htmlContent.includes("PROSEDUR DITOLAK") ||
      htmlContent.includes("NON-COMPLIANT") ||
      htmlContent.includes("alert-danger") ||
      htmlContent.includes("RALAT")
    )
  }

  const generatePDF = async () => {
    setIsGenerating(true)
    
    try {
      // Extract company name from first answer (company_info)
      const companyInfo = answers.company_info || ''
      // Split by comma or "jenis" keyword to get just the company name
      const companyName = companyInfo.split(/,|jenis/i)[0]?.trim() || 'Syarikat'
      
      // Call API route to get generated HTML from JamAI
      const response = await fetch('/api/generate-ihcs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          businessType: 'Perkhidmatan Makanan',
          responses: answers
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate IHCS')
      }
      
      const result = await response.json()
      
      // VALIDATION CHECK: Scan for non-compliant chapters
      const failedChapters: string[] = []
      
      if (result.chapters && Array.isArray(result.chapters)) {
        result.chapters.forEach((chapter: any, index: number) => {
          const htmlContent = chapter.generatedHTML || ''
          if (isChapterNonCompliant(htmlContent)) {
            failedChapters.push(`${language === 'bm' ? 'Bab' : 'Chapter'} ${index + 1}: ${chapter.title}`)
          }
        })
      }
      
      // If any chapters failed validation, STOP and show error
      if (failedChapters.length > 0) {
        setIsGenerating(false)
        
        const errorMessage = language === 'bm'
          ? `⚠️ AMARAN: Manual tidak boleh dijana.\n\n` +
            `Beberapa jawapan anda melanggar piawaian MPPHM 2020 (Risiko Non-Halal dikesan).\n\n` +
            `Bab yang gagal:\n${failedChapters.join('\n')}\n\n` +
            `Sila semak semula jawapan anda dan cuba lagi.`
          : `⚠️ WARNING: Manual cannot be generated.\n\n` +
            `Some of your answers violate MPPHM 2020 standards (Non-Halal risks detected).\n\n` +
            `Failed chapters:\n${failedChapters.join('\n')}\n\n` +
            `Please review your answers and try again.`
        
        // Show error in chat with red styling
        addAIMessage(`❌ ${errorMessage}`)
        
        // Also show browser alert
        alert(errorMessage)
        
        return // STOP! Do not generate PDF
      }
      
      // ALL CHAPTERS PASSED - Proceed with PDF generation
      // Store the generated HTML for PDF conversion
      localStorage.setItem('ihcs-manual-html', result.generatedManualHTML || '')
      localStorage.setItem('ihcs-company-name', companyName)
      localStorage.setItem('ihcs-chapters', JSON.stringify(result.chapters))
      
      // Success!
      setIsGenerating(false)
      setPdfReady(true)
      setPdfUrl('/generate-pdf') // Placeholder, actual PDF generated on download
      
      addAIMessage(language === 'bm'
        ? '✅ Tahniah! Manual anda memenuhi piawaian MPPHM 2020. Anda boleh preview dan download sekarang. 📄'
        : '✅ Congratulations! Your manual meets MPPHM 2020 standards. You can preview and download now. 📄'
      )
    } catch (error) {
      setIsGenerating(false)
      addAIMessage(language === 'bm'
        ? `Maaf, berlaku masalah: ${(error as Error).message} ❌`
        : `Sorry, there was an error: ${(error as Error).message} ❌`
      )
      console.error('Generation error:', error)
    }
  }

  const downloadPDF = async () => {
    try {
      const html = localStorage.getItem('ihcs-manual-html')
      const companyName = localStorage.getItem('ihcs-company-name') || 'Company'
      
      if (!html) {
        alert('Please generate the manual first.')
        return
      }

      // Dynamically import jspdf and html2canvas
      const jsPDF = (await import('jspdf')).default
      const html2canvas = (await import('html2canvas')).default

      // Create a temporary container for the HTML content
      const container = document.createElement('div')
      container.style.position = 'absolute'
      container.style.left = '-9999px'
      container.style.width = '210mm' // A4 width
      container.style.padding = '20mm'
      container.style.backgroundColor = 'white'
      container.style.fontFamily = 'Arial, sans-serif'
      container.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2D4A3E; font-size: 28px; margin-bottom: 10px;">MANUAL SISTEM KAWALAN HALAL DALAMAN (IHCS)</h1>
          <h2 style="color: #666; font-size: 18px; margin-bottom: 5px;">${companyName}</h2>
          <p style="color: #999; font-size: 14px;">Generated by AMANA IHCS Auto-Architect</p>
          <hr style="border: none; border-top: 3px solid #C5E86C; margin: 20px 0;">
        </div>
        ${html}
      `
      document.body.appendChild(container)

      // Convert HTML to canvas
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      })

      // Remove temporary container
      document.body.removeChild(container)

      // Create PDF
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = pdfWidth
      const imgHeight = (canvas.height * pdfWidth) / canvas.width
      
      let heightLeft = imgHeight
      let position = 0

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pdfHeight

      // Add more pages if content exceeds one page
      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pdfHeight
      }

      // Download the PDF
      const fileName = `IHCS_Manual_${companyName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
      pdf.save(fileName)

      addAIMessage(language === 'bm'
        ? `✅ PDF berjaya dimuat turun: ${fileName}`
        : `✅ PDF successfully downloaded: ${fileName}`
      )
    } catch (error) {
      console.error('PDF generation error:', error)
      alert(`Failed to generate PDF: ${(error as Error).message}`)
    }
  }

  const resetInterview = () => {
    if (confirm(text.resetConfirm)) {
      setMessages([])
      setAnswers({})
      setCurrentChapter(0)
      setPdfReady(false)
      setPdfUrl('')
      localStorage.removeItem('ihcs-answers')
      localStorage.removeItem('ihcs-pdf-url')
      window.location.reload()
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => router.push('/')} 
                className="p-2 hover:bg-[#C5E86C]/20 rounded-xl transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-[#2D4A3E]" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2D4A3E] to-[#3D5A4E] flex items-center justify-center">
                  <Book className="w-5 h-5 text-[#C5E86C]" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-[#2D4A3E]">{text.title}</h1>
                  <p className="text-xs text-gray-500">{text.subtitle}</p>
                </div>
              </div>
            </div>
            <LanguageToggle language={language} onLanguageChange={setLanguage} />
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Sidebar - Chapter Progress */}
        <div className="hidden lg:block w-72 bg-white border-r border-gray-200 p-6 overflow-y-auto">
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Progress
            </h3>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#2D4A3E] to-[#C5E86C] transition-all duration-500"
                  style={{ width: `${((currentChapter + 1) / CHAPTERS.length) * 100}%` }}
                />
              </div>
              <span className="text-sm font-bold text-[#2D4A3E]">
                {Math.round(((currentChapter + 1) / CHAPTERS.length) * 100)}%
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {CHAPTERS.map((ch, idx) => (
              <div 
                key={ch.id}
                className={`p-3 rounded-xl transition-all ${
                  idx === currentChapter
                    ? 'bg-[#C5E86C]/30 border-2 border-[#C5E86C]'
                    : idx < currentChapter
                    ? 'bg-[#2D4A3E]/10'
                    : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                    idx < currentChapter
                      ? 'bg-[#2D4A3E] text-white'
                      : idx === currentChapter
                      ? 'bg-[#C5E86C] text-[#2D4A3E]'
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {idx < currentChapter ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      ch.id
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${
                      idx <= currentChapter ? 'text-[#2D4A3E]' : 'text-gray-400'
                    }`}>
                      {language === 'bm' ? ch.titleBm : ch.titleEn}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Mobile Progress Bar */}
          <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-[#2D4A3E]">
                {text.chapter} {currentChapter + 1}/{CHAPTERS.length}
              </span>
              <span className="text-sm text-gray-500">
                {Math.round(((currentChapter + 1) / CHAPTERS.length) * 100)}% {text.complete}
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#2D4A3E] to-[#C5E86C] transition-all duration-500"
                style={{ width: `${((currentChapter + 1) / CHAPTERS.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="max-w-3xl mx-auto">
              {messages.map((msg, idx) => (
                <MessageBubble key={idx} message={msg} />
              ))}
              
              {isTyping && (
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2D4A3E] to-[#3D5A4E] flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-[#C5E86C]" />
                  </div>
                  <div className="bg-white rounded-2xl rounded-tl-none px-5 py-4 shadow-sm border border-gray-200">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-[#2D4A3E] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-[#2D4A3E] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-[#2D4A3E] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Generate Button */}
          {currentChapter >= CHAPTERS.length - 1 && Object.keys(answers).length >= CHAPTERS.length && !pdfReady && (
            <div className="p-4 bg-white border-t border-gray-200">
              <div className="max-w-3xl mx-auto">
                <button
                  onClick={generatePDF}
                  disabled={isGenerating}
                  className="w-full py-4 bg-gradient-to-r from-[#2D4A3E] to-[#3D5A4E] text-white rounded-2xl font-bold text-lg hover:scale-[1.02] hover:shadow-xl transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-lg flex items-center justify-center gap-3"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {text.generating}
                    </>
                  ) : (
                    <>
                      <FileText className="w-5 h-5" />
                      {text.generateBtn}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* PDF Ready Actions */}
          {pdfReady && (
            <div className="p-4 bg-white border-t border-gray-200">
              <div className="max-w-3xl mx-auto flex gap-3">
                <button
                  onClick={downloadPDF}
                  className="flex-1 py-4 bg-gradient-to-r from-[#2D4A3E] to-[#3D5A4E] text-white rounded-2xl font-bold text-lg hover:scale-[1.02] hover:shadow-xl transition-all shadow-lg flex items-center justify-center gap-3"
                >
                  <Download className="w-5 h-5" />
                  {text.downloadBtn} ({text.pages})
                </button>
                <button
                  onClick={resetInterview}
                  className="px-6 py-4 bg-white border-2 border-[#2D4A3E] text-[#2D4A3E] rounded-2xl font-semibold hover:bg-[#C5E86C]/20 transition-all flex items-center gap-2"
                >
                  <RefreshCw className="w-5 h-5" />
                  {text.reset}
                </button>
              </div>
            </div>
          )}

          {/* Input Box */}
          {!pdfReady && (
            <div className="p-4 bg-white border-t border-gray-200">
              <div className="max-w-3xl mx-auto flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={text.typeAnswer}
                  className="flex-1 px-5 py-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#C5E86C] focus:border-[#C5E86C] text-[#2D4A3E] placeholder-gray-400"
                />
                <button
                  onClick={() => alert(text.voiceSoon)}
                  className="p-4 bg-[#F5F1E8] text-[#2D4A3E] rounded-2xl hover:bg-[#C5E86C]/30 transition-colors"
                >
                  <Mic className="w-5 h-5" />
                </button>
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="px-6 py-4 bg-[#C5E86C] text-[#2D4A3E] rounded-2xl font-bold hover:bg-[#B5D85C] hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {text.send}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - PDF Preview */}
        {pdfReady && (
          <div className="hidden lg:block w-80 border-l border-gray-200 bg-white p-6 overflow-y-auto">
            <div className="sticky top-0 bg-white pb-4 border-b border-gray-200 mb-6">
              <h3 className="font-bold text-[#2D4A3E] flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#C5E86C]" />
                {text.preview}
              </h3>
            </div>
            
            {/* PDF Preview Card */}
            <div className="bg-[#F5F1E8] rounded-2xl p-4">
              <div className="bg-white shadow-lg rounded-xl p-6 mb-4">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2D4A3E] to-[#3D5A4E] flex items-center justify-center">
                    <Book className="w-8 h-8 text-[#C5E86C]" />
                  </div>
                </div>
                <h2 className="text-xl font-bold text-[#2D4A3E] text-center mb-1">{text.manual}</h2>
                <p className="text-gray-600 text-center text-sm mb-6">{answers.company_info || 'Your Company'}</p>
                
                <div className="space-y-3">
                  {CHAPTERS.map((ch) => (
                    <div key={ch.id} className="flex items-start gap-3 p-2 rounded-lg bg-[#F5F1E8]">
                      <div className="w-6 h-6 rounded-md bg-[#C5E86C] flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-[#2D4A3E]">{ch.id}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-[#2D4A3E] text-xs">
                          {language === 'bm' ? ch.titleBm : ch.titleEn}
                        </div>
                        <div className="text-gray-500 text-xs truncate">
                          {answers[ch.field]?.substring(0, 30) || 'No answer'}...
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-500 text-center">{text.generatedFrom}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: Message }) {
  if (message.role === 'ai') {
    return (
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2D4A3E] to-[#3D5A4E] flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-[#C5E86C]" />
        </div>
        <div className="bg-white rounded-2xl rounded-tl-none px-5 py-4 shadow-sm border border-gray-200 max-w-xl">
          <p className="text-[#2D4A3E] leading-relaxed">{message.content}</p>
          <span className="text-xs text-gray-400 mt-2 block">
            {message.timestamp.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 justify-end mb-4">
      <div className="bg-gradient-to-r from-[#C5E86C] to-[#A8D946] text-[#2D4A3E] rounded-2xl rounded-tr-none px-5 py-4 shadow-sm max-w-xl">
        <p className="leading-relaxed font-medium">{message.content}</p>
        <span className="text-xs text-[#2D4A3E]/60 mt-2 block">
          {message.timestamp.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <div className="w-10 h-10 rounded-xl bg-[#2D4A3E] flex items-center justify-center flex-shrink-0">
        <span className="text-[#C5E86C] font-bold text-sm">U</span>
      </div>
    </div>
  )
}