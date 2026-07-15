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
  const [isRecording, setIsRecording] = useState(false)
  const [recordedAudio, setRecordedAudio] = useState<File | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  const t = {
    en: {
      title: 'Ingredient Scanner',
      subtitle: 'Manglish-Powered AI Scanner',
      fileTooLarge: 'File too large! Maximum 5MB.',
    },
    bm: {
      title: 'Pengimbas Ramuan',
      subtitle: 'Pengimbas AI Berkuasa Manglish',
      fileTooLarge: 'Fail terlalu besar! Maksimum 5MB.',
    }
  }

  const text = t[language]

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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

  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setRecordedAudio(file)
      setInput('') // Clear text input when audio is selected
      setAttachmentTray({ ...attachmentTray, isOpen: false })
    }
  }

  const toggleRecording = () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false)
      // Simulate audio recording - in production, implement actual recording
      const dummyAudio = new File([''], 'voice-message.mp3', { type: 'audio/mp3' })
      setRecordedAudio(dummyAudio)
      setInput('') // Clear text input
    } else {
      // Start recording
      setIsRecording(true)
      setInput('') // Clear text input when starting recording
      setAttachmentTray({ ...attachmentTray, isOpen: false })
    }
  }

  const removeAttachment = (type: 'image' | 'audio') => {
    if (type === 'image') {
      setAttachmentTray({
        ...attachmentTray,
        selectedImage: null,
        imagePreview: null
      })
    } else {
      setRecordedAudio(null)
      setIsRecording(false)
    }
  }

  const handleSendMessage = async () => {
    if (!input.trim() && !attachmentTray.selectedImage && !recordedAudio) return

    setLoading(true)

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    }

    if (attachmentTray.selectedImage) {
      userMessage.imageUri = attachmentTray.imagePreview || ''
    }
    if (recordedAudio) {
      userMessage.audioUri = recordedAudio.name
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setRecordedAudio(null)
    setAttachmentTray({ isOpen: false })

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

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8] flex flex-col">
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

      <div className="flex-1 flex flex-col w-full">
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-5xl mx-auto w-full"
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

        <div className="border-t border-gray-200 bg-white px-4 py-4 w-full">
          <div className="max-w-7xl mx-auto w-full">
          {(attachmentTray.imagePreview || recordedAudio) && (
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
              {recordedAudio && (
                <div className="flex items-center gap-2 px-3 py-2 bg-[#C5E86C]/20 border border-[#C5E86C] rounded-xl">
                  <Mic className="w-4 h-4 text-[#2D4A3E]" />
                  <span className="text-sm font-semibold text-[#2D4A3E]">
                    {recordedAudio.name}
                  </span>
                  <button onClick={() => removeAttachment('audio')} className="ml-2">
                    <X className="w-4 h-4 text-[#2D4A3E]" />
                  </button>
                </div>
              )}
            </div>
          )}

          {attachmentTray.isOpen && !recordedAudio && !isRecording && (
            <div className="mb-3 flex gap-3 p-3 bg-[#F5F1E8] rounded-xl">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-[#2D4A3E] text-[#2D4A3E] rounded-xl font-semibold hover:bg-[#C5E86C]/20 transition-all"
              >
                <ImageIcon className="w-5 h-5" />
                <span>{language === 'bm' ? 'Gambar' : 'Image'}</span>
              </button>
            </div>
          )}

          {/* Recording indicator */}
          {isRecording && (
            <div className="mb-3 flex items-center gap-3 p-4 bg-red-50 border border-red-300 rounded-xl">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold text-red-700">
                {language === 'bm' ? 'Merakam...' : 'Recording...'}
              </span>
              <button
                onClick={() => removeAttachment('audio')}
                className="ml-auto text-red-600 hover:text-red-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            {!recordedAudio && !isRecording && (
              <button
                onClick={() => setAttachmentTray({ ...attachmentTray, isOpen: !attachmentTray.isOpen })}
                className="p-3 hover:bg-[#C5E86C]/20 rounded-xl transition-colors flex-shrink-0"
              >
                <Paperclip className={`w-5 h-5 ${attachmentTray.isOpen ? 'text-[#2D4A3E]' : 'text-gray-500'}`} />
              </button>
            )}
            
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={language === 'bm' ? 'Tanya tentang produk halal...' : 'Ask about halal products...'}
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C5E86C] focus:border-[#C5E86C] text-[#2D4A3E] placeholder-gray-400"
              disabled={loading || recordedAudio !== null || isRecording}
            />
            
            {/* Show Send button when there's text or attachments, Mic button when empty */}
            {input.trim() || attachmentTray.selectedImage || recordedAudio ? (
              <button
                onClick={handleSendMessage}
                disabled={loading}
                className="p-3 bg-gradient-to-r from-[#2D4A3E] to-[#3D5A4E] text-white rounded-xl hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 flex-shrink-0"
              >
                <Send className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={toggleRecording}
                className={`p-3 rounded-xl transition-all flex-shrink-0 ${
                  isRecording
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-gradient-to-r from-[#2D4A3E] to-[#3D5A4E] text-white hover:scale-105'
                }`}
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
          </div>

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
    </div>
  )
}

function ChatMessage({ message, language }: { message: Message; language: Language }) {
  const isUser = message.role === 'user'
  
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start`}>
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

      <div className={`flex flex-col gap-2 max-w-[70%] ${isUser ? 'items-end' : 'items-start'}`}>
        {message.imageUri && (
          <div className="rounded-xl overflow-hidden border-2 border-gray-200 shadow-sm">
            <img 
              src={message.imageUri} 
              alt="Attached" 
              className="max-w-full h-auto max-h-64 object-cover"
            />
          </div>
        )}

        {message.audioUri && (
          <div className="flex items-center gap-2 px-3 py-2 bg-[#C5E86C]/20 border border-[#C5E86C] rounded-xl">
            <Mic className="w-4 h-4 text-[#2D4A3E]" />
            <span className="text-sm font-semibold text-[#2D4A3E]">{message.audioUri}</span>
          </div>
        )}

        {message.content && (
          <div className={`px-4 py-3 rounded-2xl shadow-sm ${
            isUser 
              ? 'bg-[#C5E86C] text-[#2D4A3E] rounded-tr-none' 
              : 'bg-white border border-gray-200 text-[#2D4A3E] rounded-tl-none'
          }`}>
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        )}

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
