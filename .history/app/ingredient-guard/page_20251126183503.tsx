'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Paperclip,
  Send,
  Image as ImageIcon,
  Mic,
  Sparkles,
  Eye,
  X,
  Loader2,
  User,
  Bot
} from 'lucide-react'
import LanguageToggle from '@/components/LanguageToggle'
import { Language } from '@/lib/translations'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  imageUri?: string
  audioUri?: string
  timestamp: Date
}

interface AttachmentTrayState {
  isOpen: boolean
  selectedImage?: File | null
  selectedAudio?: File | null
  imagePreview?: string | null
}

export default function IngredientGuard() {
  const router = useRouter()
  const [language, setLanguage] = useState<Language>('en')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [attachmentTray, setAttachmentTray] = useState<AttachmentTrayState>({ isOpen: false })
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  const t = {
    en: {
      title: 'Ingredient Scanner',
      subtitle: 'Manglish-Powered AI Scanner',
      upload: 'Upload',
      camera: 'Camera',
      voice: 'Voice',
      uploadTitle: 'Click to upload product label',
      uploadSubtitle: 'PNG, JPG up to 5MB',
      removeImage: 'Remove image',
      recording: 'Recording...',
      tapToRecord: 'Tap to record your question',
      askIn: 'Ask in Manglish, BM, or English',
      transcribed: 'Transcribed:',
      optional: 'Optional: Ask in Manglish/BM/EN',
      placeholder: 'Example: Is this sauce halal? Is the logo valid?',
      analyzing: 'Scanning label...',
      checkingIngredients: 'Checking ingredients and halal logo',
      analyzeBtn: 'Analyze Product',
      flaggedIngredients: 'Flagged Ingredients',
      halalLogoCheck: 'Halal Logo Check',
      jakimRecognized: 'JAKIM Recognized',
      notRecognized: 'Not Recognized by JAKIM',
      aiRecommendation: 'AI Recommendation',
      scanAnother: 'Scan Another',
      saveHistory: 'Save to History',
      highRisk: 'High Risk',
      mediumRisk: 'Medium Risk',
      lowRisk: 'Low Risk',
      notRecommended: 'Not Recommended',
      verifySource: 'Verify Source',
      safeToUse: 'Safe to Use',
      fileTooLarge: 'File too large! Maximum 5MB.',
      cameraDenied: 'Camera access denied',
      comingSoon: 'Coming soon!',
    },
    bm: {
      title: 'Pengimbas Ramuan',
      subtitle: 'Pengimbas AI Berkuasa Manglish',
      upload: 'Muat Naik',
      camera: 'Kamera',
      voice: 'Suara',
      uploadTitle: 'Klik untuk muat naik label produk',
      uploadSubtitle: 'PNG, JPG sehingga 5MB',
      removeImage: 'Buang gambar',
      recording: 'Merakam...',
      tapToRecord: 'Ketik untuk rakam soalan anda',
      askIn: 'Tanya dalam Manglish, BM, atau Inggeris',
      transcribed: 'Transkripsi:',
      optional: 'Pilihan: Tanya dalam Manglish/BM/EN',
      placeholder: 'Contoh: Sos ni halal tak? Logo dia betul ke?',
      analyzing: 'Mengimbas label...',
      checkingIngredients: 'Menyemak ramuan dan logo halal',
      analyzeBtn: 'Analisis Produk',
      flaggedIngredients: 'Ramuan Bermasalah',
      halalLogoCheck: 'Semakan Logo Halal',
      jakimRecognized: 'Diiktiraf JAKIM',
      notRecognized: 'Tidak Diiktiraf JAKIM',
      aiRecommendation: 'Cadangan AI',
      scanAnother: 'Imbas Lain',
      saveHistory: 'Simpan ke Sejarah',
      highRisk: 'Risiko Tinggi',
      mediumRisk: 'Risiko Sederhana',
      lowRisk: 'Risiko Rendah',
      notRecommended: 'Tidak Disyorkan',
      verifySource: 'Sahkan Sumber',
      safeToUse: 'Selamat Digunakan',
      fileTooLarge: 'Fail terlalu besar! Maksimum 5MB.',
      cameraDenied: 'Akses kamera ditolak',
      comingSoon: 'Akan datang!',
    }
  }

  const text = t[language]

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle image upload
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.size <= 5 * 1024 * 1024) {
      const reader = new FileReader()
      reader.onload = () => {
        setAttachmentTray({
          ...attachmentTray,
          selectedImage: file,
          imagePreview: reader.result as string
        })
      }
      reader.readAsDataURL(file)
    } else {
      alert(text.fileTooLarge)
    }
  }

  // Handle audio upload
  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAttachmentTray({
        ...attachmentTray,
        selectedAudio: file
      })
    }
  }

  // Remove attachment
  const removeAttachment = (type: 'image' | 'audio') => {
    if (type === 'image') {
      setAttachmentTray({
        ...attachmentTray,
        selectedImage: null,
        imagePreview: null
      })
    } else {
      setAttachmentTray({
        ...attachmentTray,
        selectedAudio: null
      })
    }
  }

  // Send message
  const handleSendMessage = async () => {
    if (!input.trim() && !attachmentTray.selectedImage && !attachmentTray.selectedAudio) return

    setLoading(true)

    // Create user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    }

    // Add image/audio URIs if available (in production, upload first)
    if (attachmentTray.selectedImage) {
      userMessage.imageUri = attachmentTray.imagePreview || ''
    }
    if (attachmentTray.selectedAudio) {
      userMessage.audioUri = attachmentTray.selectedAudio.name
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setAttachmentTray({ isOpen: false })

    // Simulate API call (replace with actual Vercel AI SDK useChat later)
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: language === 'bm' 
          ? 'Saya sedang menganalisis produk anda. Ini adalah contoh respons dari AI Assistant. Dalam production, ini akan menggunakan Vercel AI SDK dan JamAI Base untuk memberikan jawapan sebenar tentang status halal produk.'
          : 'I am analyzing your product. This is a sample response from the AI Assistant. In production, this will use Vercel AI SDK and JamAI Base to provide real answers about the halal status of the product.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMessage])
      setLoading(false)
    }, 1500)
  }

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8] flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
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
                  <Eye className="w-5 h-5 text-[#C5E86C]" />
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

      {/* Chat Container */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        {/* Chat Messages Area */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#2D4A3E] to-[#3D5A4E] flex items-center justify-center mb-6">
                <Sparkles className="w-10 h-10 text-[#C5E86C]" />
              </div>
              <h3 className="text-2xl font-bold text-[#2D4A3E] mb-2">
                {language === 'bm' ? 'Tanya Tentang Halal' : 'Ask About Halal'}
              </h3>
              <p className="text-gray-600 max-w-md">
                {language === 'bm' 
                  ? 'Muat naik gambar label produk atau tanya soalan dalam Manglish/BM/EN'
                  : 'Upload product label images or ask questions in Manglish/BM/EN'}
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <ChatMessage key={message.id} message={message} language={language} />
            ))
          )}
          
          {loading && (
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2D4A3E] to-[#3D5A4E] flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-[#C5E86C]" />
              </div>
              <div className="bg-white rounded-2xl rounded-tl-none px-4 py-3 shadow-sm border border-gray-200">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#2D4A3E]" />
                  <span className="text-sm text-gray-500">
                    {language === 'bm' ? 'Berfikir...' : 'Thinking...'}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Fixed Input Bar at Bottom */}
        <div className="border-t border-gray-200 bg-white px-4 py-4">
          {/* Attachment Preview */}
          {(attachmentTray.imagePreview || attachmentTray.selectedAudio) && (
            <div className="mb-3 flex gap-2 flex-wrap">
              {attachmentTray.imagePreview && (
                <div className="relative inline-block">
                  <img 
                    src={attachmentTray.imagePreview} 
                    alt="Preview" 
                    className="w-20 h-20 rounded-xl object-cover border-2 border-[#C5E86C]"
                  />
                  <button
                    onClick={() => removeAttachment('image')}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              )}
              {attachmentTray.selectedAudio && (
                <div className="flex items-center gap-2 px-3 py-2 bg-[#C5E86C]/20 border border-[#C5E86C] rounded-xl">
                  <Mic className="w-4 h-4 text-[#2D4A3E]" />
                  <span className="text-sm font-semibold text-[#2D4A3E]">
                    {attachmentTray.selectedAudio.name}
                  </span>
                  <button
                    onClick={() => removeAttachment('audio')}
                    className="ml-2"
                  >
                    <X className="w-4 h-4 text-[#2D4A3E]" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Attachment Tray */}
          {attachmentTray.isOpen && (
            <div className="mb-3 flex gap-3 p-3 bg-[#F5F1E8] rounded-xl">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-[#2D4A3E] text-[#2D4A3E] rounded-xl font-semibold hover:bg-[#C5E86C]/20 transition-all"
              >
                <ImageIcon className="w-5 h-5" />
                <span>{language === 'bm' ? 'Gambar' : 'Image'}</span>
              </button>
              <button
                onClick={() => audioInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-[#2D4A3E] text-[#2D4A3E] rounded-xl font-semibold hover:bg-[#C5E86C]/20 transition-all"
              >
                <Mic className="w-5 h-5" />
                <span>{language === 'bm' ? 'Audio' : 'Audio'}</span>
              </button>
            </div>
          )}

          {/* Input Row */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAttachmentTray({ ...attachmentTray, isOpen: !attachmentTray.isOpen })}
              className="p-3 hover:bg-[#C5E86C]/20 rounded-xl transition-colors flex-shrink-0"
            >
              <Paperclip className={`w-5 h-5 ${attachmentTray.isOpen ? 'text-[#2D4A3E]' : 'text-gray-500'}`} />
            </button>
            
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={language === 'bm' ? 'Tanya tentang produk halal...' : 'Ask about halal products...'}
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C5E86C] focus:border-[#C5E86C] text-[#2D4A3E] placeholder-gray-400"
              disabled={loading}
            />
            
            <button
              onClick={handleSendMessage}
              disabled={loading || (!input.trim() && !attachmentTray.selectedImage && !attachmentTray.selectedAudio)}
              className="p-3 bg-gradient-to-r from-[#2D4A3E] to-[#3D5A4E] text-white rounded-xl hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 flex-shrink-0"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>

          {/* Hidden File Inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleImageSelect}
            className="hidden"
          />
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*"
            onChange={handleAudioSelect}
            className="hidden"
          />
        </div>
      </div>
    </div>
  )
}

// Chat Message Component
function ChatMessage({ message, language }: { message: Message; language: Language }) {
  const isUser = message.role === 'user'
  
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser 
          ? 'bg-[#C5E86C]' 
          : 'bg-gradient-to-br from-[#2D4A3E] to-[#3D5A4E]'
      }`}>
        {isUser ? (
          <User className="w-5 h-5 text-[#2D4A3E]" />
        ) : (
          <Bot className="w-5 h-5 text-[#C5E86C]" />
        )}
      </div>

      {/* Message Content */}
      <div className={`flex flex-col gap-2 max-w-[70%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Image Attachment */}
        {message.imageUri && (
          <div className="rounded-xl overflow-hidden border-2 border-gray-200 shadow-sm">
            <img 
              src={message.imageUri} 
              alt="Attached" 
              className="max-w-full h-auto max-h-64 object-cover"
            />
          </div>
        )}

        {/* Audio Attachment */}
        {message.audioUri && (
          <div className="flex items-center gap-2 px-3 py-2 bg-[#C5E86C]/20 border border-[#C5E86C] rounded-xl">
            <Mic className="w-4 h-4 text-[#2D4A3E]" />
            <span className="text-sm font-semibold text-[#2D4A3E]">{message.audioUri}</span>
          </div>
        )}

        {/* Text Message */}
        {message.content && (
          <div className={`px-4 py-3 rounded-2xl shadow-sm ${
            isUser 
              ? 'bg-[#C5E86C] text-[#2D4A3E] rounded-tr-none' 
              : 'bg-white border border-gray-200 text-[#2D4A3E] rounded-tl-none'
          }`}>
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        )}

        {/* Timestamp */}
        <span className="text-xs text-gray-500 px-1">
          {message.timestamp.toLocaleTimeString(language === 'bm' ? 'ms-MY' : 'en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </span>
      </div>
    </div>
  )
}
              <label className="block cursor-pointer">
                <div className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center hover:border-[#C5E86C] hover:bg-[#C5E86C]/10 transition-all">
                  <div className="w-16 h-16 rounded-2xl bg-[#F5F1E8] flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-8 h-8 text-[#2D4A3E]" />
                  </div>
                  <p className="text-[#2D4A3E] font-semibold mb-2">{text.uploadTitle}</p>
                  <p className="text-sm text-gray-500">{text.uploadSubtitle}</p>
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="space-y-4">
                <div className="relative group">
                  <img src={image} alt="Product label" className="w-full rounded-2xl shadow-md" />
                  <button className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    <ZoomIn className="w-5 h-5 text-[#2D4A3E]" />
                  </button>
                </div>
                <button
                  onClick={() => {
                    setImage(null)
                    setResult(null)
                  }}
                  className="text-sm text-red-500 hover:text-red-600 font-medium flex items-center gap-1"
                >
                  <XCircle className="w-4 h-4" />
                  {text.removeImage}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Voice Section */}
        {activeTab === 'voice' && (
          <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm mb-6">
            <div className="text-center">
              <button
                onClick={toggleRecording}
                className={`w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center transition-all ${
                  isRecording 
                    ? 'bg-red-500 animate-pulse shadow-lg shadow-red-300' 
                    : 'bg-gradient-to-br from-[#2D4A3E] to-[#3D5A4E] hover:scale-105 shadow-lg'
                }`}
              >
                <Mic className={`w-10 h-10 ${isRecording ? 'text-white' : 'text-[#C5E86C]'}`} />
              </button>
              <p className="text-[#2D4A3E] font-semibold mb-2">
                {isRecording ? text.recording : text.tapToRecord}
              </p>
              <p className="text-sm text-gray-500">{text.askIn}</p>
              
              {transcription && (
                <div className="mt-6 p-4 bg-[#C5E86C]/20 border border-[#C5E86C] rounded-xl">
                  <p className="text-xs text-[#2D4A3E] font-semibold mb-1">{text.transcribed}</p>
                  <p className="text-[#2D4A3E]">{transcription}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Question Input */}
        {image && (
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm mb-6">
            <label className="block text-sm font-semibold text-[#2D4A3E] mb-2">
              {text.optional}
            </label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={text.placeholder}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C5E86C] focus:border-[#C5E86C] text-[#2D4A3E] placeholder-gray-400"
            />
          </div>
        )}

        {/* Analyze Button */}
        {image && !result && (
          <button
            onClick={analyzeProduct}
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-[#2D4A3E] to-[#3D5A4E] text-white rounded-2xl font-bold text-lg hover:scale-[1.02] hover:shadow-xl transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-lg"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{text.analyzing}</span>
                <span className="text-sm font-normal opacity-80">{text.checkingIngredients}</span>
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5 text-[#C5E86C]" />
                {text.analyzeBtn}
              </span>
            )}
          </button>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Risk Level */}
            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-center">
                <RiskBadge level={result.risk_level} language={language} text={text} />
              </div>
            </div>

            {/* Flagged Ingredients */}
            {result.flagged_ingredients.length > 0 && (
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <h3 className="text-lg font-bold text-[#2D4A3E] mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  {text.flaggedIngredients}
                </h3>
                <div className="space-y-3">
                  {result.flagged_ingredients.map((ing: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 p-4 bg-red-50 rounded-xl border border-red-200">
                      <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-red-900">{ing.code} - {ing.name}</div>
                        <div className="text-sm text-red-700 mt-1">{ing.reason}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Halal Logo Check */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <h3 className="text-lg font-bold text-[#2D4A3E] mb-4">{text.halalLogoCheck}</h3>
              <div className={`flex items-start gap-3 p-4 rounded-xl border ${
                result.cert_body.recognized 
                  ? 'bg-[#C5E86C]/20 border-[#C5E86C]' 
                  : 'bg-red-50 border-red-200'
              }`}>
                {result.cert_body.recognized ? (
                  <CheckCircle className="w-6 h-6 text-[#2D4A3E] flex-shrink-0" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                )}
                <div>
                  <div className="font-bold text-[#2D4A3E]">{result.cert_body.name}</div>
                  <div className="text-sm text-[#2D4A3E]/80 mt-1">
                    {result.cert_body.recognized 
                      ? `✓ ${text.jakimRecognized}` 
                      : `✗ ${text.notRecognized}`
                    }
                  </div>
                </div>
              </div>
            </div>

            {/* AI Advice */}
            <div className="bg-gradient-to-br from-[#2D4A3E] to-[#3D5A4E] rounded-2xl p-6 shadow-lg">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#C5E86C]" />
                {text.aiRecommendation}
              </h3>
              <p className="text-white/90 leading-relaxed">{result.advice}</p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setImage(null)
                  setResult(null)
                  setQuestion('')
                  setTranscription('')
                }}
                className="flex-1 py-4 bg-white border-2 border-[#2D4A3E] text-[#2D4A3E] rounded-2xl font-semibold hover:bg-[#C5E86C]/20 transition-all"
              >
                {text.scanAnother}
              </button>
              <button
                onClick={() => alert(text.comingSoon)}
                className="flex-1 py-4 bg-[#C5E86C] text-[#2D4A3E] rounded-2xl font-bold hover:bg-[#B5D85C] hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
              >
                <History className="w-5 h-5" />
                {text.saveHistory}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all ${
        active
          ? 'bg-[#C5E86C] text-[#2D4A3E] shadow-lg'
          : 'bg-white text-[#2D4A3E] border-2 border-gray-200 hover:border-[#C5E86C] hover:bg-[#C5E86C]/10'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

function RiskBadge({ level, language, text }: { level: string; language: string; text: any }) {
  const config = {
    High: { 
      bgColor: 'bg-red-50', 
      borderColor: 'border-red-300',
      textColor: 'text-red-900',
      iconColor: 'text-red-500',
      icon: XCircle, 
      label: text.highRisk,
      desc: text.notRecommended
    },
    Medium: { 
      bgColor: 'bg-amber-50', 
      borderColor: 'border-amber-300',
      textColor: 'text-amber-900',
      iconColor: 'text-amber-500',
      icon: AlertTriangle, 
      label: text.mediumRisk,
      desc: text.verifySource
    },
    Low: { 
      bgColor: 'bg-[#C5E86C]/30', 
      borderColor: 'border-[#C5E86C]',
      textColor: 'text-[#2D4A3E]',
      iconColor: 'text-[#2D4A3E]',
      icon: CheckCircle, 
      label: text.lowRisk,
      desc: text.safeToUse
    }
  }
  
  const { bgColor, borderColor, textColor, iconColor, icon: Icon, label, desc } = config[level as keyof typeof config]
  
  return (
    <div className={`inline-flex items-center gap-4 px-8 py-5 rounded-2xl ${bgColor} border-2 ${borderColor}`}>
      <Icon className={`w-10 h-10 ${iconColor}`} />
      <div>
        <div className={`text-2xl font-bold ${textColor}`}>{label}</div>
        <div className={`text-sm ${textColor} opacity-80`}>{desc}</div>
      </div>
    </div>
  )
}