'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Upload, 
  Camera,
  FileText,
  Image as ImageIcon,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Trash2,
  RefreshCw,
  ExternalLink,
  TrendingUp,
  ClipboardCheck,
  Sparkles,
  Download,
  X
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import LanguageToggle from '@/components/LanguageToggle'
import { Language } from '@/lib/translations'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

type DocumentType = 
  | 'flow_chart'
  | 'training_cert'
  | 'menu_list'
  | 'ingredient_list'
  | 'halal_policy'
  | 'pest_control'
  | 'photos'
  | 'other'

type UploadedFile = {
  id: string
  name: string
  type: DocumentType
  url: string
  size: number
  file?: File
}

type CheckStatus = 'found' | 'missing' | 'warning'

type AuditResult = {
  overall_score: number
  checks: Array<{
    doc_type: string
    status: CheckStatus
    message: string
  }>
  recommendations: Array<{
    issue: string
    action: string
  }>
}

export default function PreAudit() {
  const router = useRouter()
  const [language, setLanguage] = useState<Language>('en')
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [menuFile, setMenuFile] = useState<UploadedFile | null>(null)
  const [ingredientFile, setIngredientFile] = useState<UploadedFile | null>(null)
  const [kitchenPhotos, setKitchenPhotos] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isAuditing, setIsAuditing] = useState(false)
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [fullReport, setFullReport] = useState<string>('')
  const [companyName, setCompanyName] = useState('')
  const [businessType, setBusinessType] = useState('')

  const t = {
    en: {
      title: 'Pre-Audit Readiness',
      subtitle: 'Score Your Documents Before Submission',
      requiredDocs: 'Required Documents',
      flowChart: 'Carta Alir Proses (Flow Chart)',
      trainingCert: 'Sijil Latihan Halal (Training Certificate)',
      menuList: 'Menu List',
      ingredientList: 'Ingredient List',
      halalPolicy: 'Halal Policy Poster',
      pestControl: 'Pest Control Contract',
      photos: 'Kitchen/Factory Photos',
      dragDrop: 'Drag & Drop Files or Click to Upload',
      supports: 'Supports: PDF, JPG, PNG, DOCX (Max 10MB per file)',
      chooseFiles: 'Choose Files',
      uploadedFiles: 'Uploaded Files',
      kitchenPhotos: 'Kitchen/Factory Photos',
      photosDesc: 'Upload at least 3-5 photos showing your premises, equipment, and storage areas',
      takePhoto: 'Take Photo or Upload',
      analyzing: 'Analyzing Documents...',
      startAudit: 'Start Pre-Audit Check',
      uploadMin: 'Upload at least 4 documents',
      readySubmit: 'Ready to Submit!',
      improvementsNeeded: 'Improvements Needed',
      readyDesc: 'Your documentation meets JAKIM requirements. You can proceed with confidence!',
      improveDesc: 'Upload missing documents to improve your readiness score before submission.',
      docChecklist: 'Document Checklist',
      actionItems: 'Action Items',
      recheck: 'Re-check Documents',
      goPortal: 'Go to MYeHALAL Portal',
      found: 'Found',
      missing: 'Missing',
      warning: 'Warning',
      crossCheck: 'Cross-Reference Check',
      crossCheckMsg: 'Please verify menu items match ingredient list',
      fileTooLarge: 'File too large! Maximum 10MB per file.',
      scoreBelow: 'Score below passing threshold',
      uploadMore: 'Upload at least 6 out of 7 required documents to be ready for JAKIM submission',
    },
    bm: {
      title: 'Kesediaan Pra-Audit',
      subtitle: 'Skor Dokumen Anda Sebelum Penghantaran',
      requiredDocs: 'Dokumen Diperlukan',
      flowChart: 'Carta Alir Proses',
      trainingCert: 'Sijil Latihan Halal',
      menuList: 'Senarai Menu',
      ingredientList: 'Senarai Ramuan',
      halalPolicy: 'Poster Dasar Halal',
      pestControl: 'Kontrak Kawalan Perosak',
      photos: 'Gambar Dapur/Kilang',
      dragDrop: 'Seret & Lepas Fail atau Klik untuk Muat Naik',
      supports: 'Menyokong: PDF, JPG, PNG, DOCX (Maks 10MB setiap fail)',
      chooseFiles: 'Pilih Fail',
      uploadedFiles: 'Fail Dimuat Naik',
      kitchenPhotos: 'Gambar Dapur/Kilang',
      photosDesc: 'Muat naik sekurang-kurangnya 3-5 gambar menunjukkan premis, peralatan, dan kawasan penyimpanan',
      takePhoto: 'Ambil Gambar atau Muat Naik',
      analyzing: 'Menganalisis Dokumen...',
      startAudit: 'Mulakan Semakan Pra-Audit',
      uploadMin: 'Muat naik sekurang-kurangnya 4 dokumen',
      readySubmit: 'Sedia untuk Hantar!',
      improvementsNeeded: 'Penambahbaikan Diperlukan',
      readyDesc: 'Dokumentasi anda memenuhi keperluan JAKIM. Anda boleh teruskan dengan yakin!',
      improveDesc: 'Muat naik dokumen yang hilang untuk meningkatkan skor kesediaan sebelum penghantaran.',
      docChecklist: 'Senarai Semak Dokumen',
      actionItems: 'Tindakan Diperlukan',
      recheck: 'Semak Semula Dokumen',
      goPortal: 'Pergi ke Portal MYeHALAL',
      found: 'Dijumpai',
      missing: 'Hilang',
      warning: 'Amaran',
      crossCheck: 'Semakan Silang',
      crossCheckMsg: 'Sila sahkan item menu sepadan dengan senarai ramuan',
      fileTooLarge: 'Fail terlalu besar! Maksimum 10MB setiap fail.',
      scoreBelow: 'Skor di bawah ambang lulus',
      uploadMore: 'Muat naik sekurang-kurangnya 6 daripada 7 dokumen yang diperlukan untuk bersedia bagi penghantaran JAKIM',
    }
  }

  const text = t[language]

  const REQUIRED_DOCS = [
    { type: 'flow_chart' as DocumentType, label: text.flowChart, icon: TrendingUp },
    { type: 'training_cert' as DocumentType, label: text.trainingCert, icon: FileText },
    { type: 'menu_list' as DocumentType, label: text.menuList, icon: FileText },
    { type: 'ingredient_list' as DocumentType, label: text.ingredientList, icon: FileText },
    { type: 'halal_policy' as DocumentType, label: text.halalPolicy, icon: FileText },
    { type: 'pest_control' as DocumentType, label: text.pestControl, icon: FileText },
    { type: 'photos' as DocumentType, label: text.photos, icon: ImageIcon }
  ]

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    files.forEach(file => handleFileUpload(file))
  }, [])

  const handleFileUpload = (file: File, specificType?: DocumentType) => {
    if (file.size > 10 * 1024 * 1024) {
      alert(text.fileTooLarge)
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const newFile: UploadedFile = {
        id: Date.now().toString() + Math.random(),
        name: file.name,
        type: specificType || guessDocumentType(file.name),
        url: reader.result as string,
        size: file.size,
        file: file
      }
      
      // Handle specific file types
      if (specificType === 'menu_list') {
        setMenuFile(newFile)
      } else if (specificType === 'ingredient_list') {
        setIngredientFile(newFile)
      } else if (specificType === 'photos') {
        setKitchenPhotos(prev => [...prev, newFile])
      } else {
        setUploadedFiles(prev => [...prev, newFile])
      }
    }
    reader.readAsDataURL(file)
  }

  // Specific handlers for menu and ingredient files
  const handleMenuFileUpload = (file: File) => {
    handleFileUpload(file, 'menu_list')
  }

  const handleIngredientFileUpload = (file: File) => {
    handleFileUpload(file, 'ingredient_list')
  }

  const handleKitchenPhotoUpload = (file: File) => {
    handleFileUpload(file, 'photos')
  }

  const guessDocumentType = (filename: string): DocumentType => {
    const lower = filename.toLowerCase()
    if (lower.includes('flow') || lower.includes('carta')) return 'flow_chart'
    if (lower.includes('training') || lower.includes('latihan')) return 'training_cert'
    if (lower.includes('menu')) return 'menu_list'
    if (lower.includes('ingredient') || lower.includes('ramuan')) return 'ingredient_list'
    if (lower.includes('policy') || lower.includes('dasar')) return 'halal_policy'
    if (lower.includes('pest')) return 'pest_control'
    if (lower.match(/\.(jpg|jpeg|png)$/)) return 'photos'
    return 'menu_list'
  }

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id))
  }

  const getUploadedDocTypes = () => {
    return new Set(uploadedFiles.map(f => f.type))
  }

  const startAudit = async () => {
    setIsAuditing(true)
    
    try {
      // Prepare data for JamAI Action Table
      // Column mappings:
      // - Menu_File: menuFile name
      // - Ingredient_File: ingredientFile name  
      // - Kitchen_Photo: kitchenPhotos names (comma-separated)
      // - Uploaded_Filenames: other files (comma-separated)
      
      const otherFilenames = uploadedFiles.map(f => f.name).join(', ')
      const kitchenPhotoNames = kitchenPhotos.map(p => p.name).join(', ')
      
      console.log('📋 [Frontend] Calling Pre-Audit API...')
      console.log('📋 [Frontend] Menu File:', menuFile?.name)
      console.log('📋 [Frontend] Ingredient File:', ingredientFile?.name)
      console.log('📋 [Frontend] Kitchen Photos:', kitchenPhotoNames)
      console.log('📋 [Frontend] Other Files:', otherFilenames)
      
      const response = await fetch('/api/pre-audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: companyName || 'Company',
          businessType: businessType || 'Restaurant',
          menuFile: menuFile?.name || '',
          ingredientFile: ingredientFile?.name || '',
          kitchenPhoto: kitchenPhotoNames,
          uploadedFilenames: otherFilenames,
          menuItems: '',
          ingredientList: ''
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ [Frontend] API Error:', errorData)
        throw new Error(errorData.error || 'Pre-audit validation failed')
      }

      const data = await response.json()
      console.log('✅ [Frontend] Audit result:', data)
      
      // Store the full markdown report
      if (data.auditReport) {
        setFullReport(data.auditReport)
      }
      
      // Transform API response to match frontend format
      const auditResult: AuditResult = {
        overall_score: data.score,
        checks: data.checks || [],
        recommendations: data.recommendations || []
      }
      
      setAuditResult(auditResult)
      
      // Show the modal if report is available
      if (data.auditReport) {
        setShowReportModal(true)
      }
      
    } catch (error) {
      console.error('❌ [Frontend] Audit error:', error)
      
      // Fallback to local validation if API fails
      const uploaded = getUploadedDocTypes()
      const checks: Array<{
        doc_type: string
        status: CheckStatus
        message: string
      }> = REQUIRED_DOCS.map(doc => {
        if (uploaded.has(doc.type)) {
          return {
            doc_type: doc.label,
            status: 'found' as const,
            message: `✓ ${text.found}: ${doc.label}`
          }
        } else {
          return {
            doc_type: doc.label,
            status: 'missing' as const,
            message: `✗ ${text.missing}: ${doc.label}`
          }
        }
      })

      const foundCount = checks.filter(c => c.status === 'found').length
      const totalCount = REQUIRED_DOCS.length
      const score = Math.round((foundCount / totalCount) * 100)

      const recommendations = checks
        .filter(c => c.status === 'missing')
        .map(c => ({
          issue: `${text.missing}: ${c.doc_type}`,
          action: language === 'bm' 
            ? `Muat naik ${c.doc_type} untuk meningkatkan skor anda`
            : `Upload ${c.doc_type} to improve your score`
        }))

      if (score < 85) {
        recommendations.push({
          issue: text.scoreBelow,
          action: text.uploadMore
        })
      }

      setAuditResult({
        overall_score: score,
        checks,
        recommendations
      })
    } finally {
      setIsAuditing(false)
    }
  }

  const resetAudit = () => {
    setUploadedFiles([])
    setAuditResult(null)
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
                  <ClipboardCheck className="w-5 h-5 text-[#C5E86C]" />
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

      <div className="max-w-7xl mx-auto px-4 py-8">
        {!auditResult ? (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Required Documents Checklist */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm sticky top-24">
                <h2 className="text-lg font-bold text-[#2D4A3E] mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#C5E86C]" />
                  {text.requiredDocs}
                </h2>
                {/* Company Info */}
                <div className="space-y-3 mb-6">
                  <input
                    type="text"
                    placeholder={language === 'bm' ? 'Nama Syarikat' : 'Company Name'}
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#C5E86C] focus:outline-none text-[#2D4A3E]"
                  />
                  <input
                    type="text"
                    placeholder={language === 'bm' ? 'Jenis Perniagaan' : 'Business Type'}
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#C5E86C] focus:outline-none text-[#2D4A3E]"
                  />
                </div>

                <div className="space-y-2">
                  {/* Menu File - Clickable Upload */}
                  <label className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                    menuFile 
                      ? 'bg-[#C5E86C]/20 border-[#C5E86C]' 
                      : 'bg-gray-50 border-gray-200 hover:border-[#C5E86C]'
                  }`}>
                    {menuFile ? (
                      <CheckCircle className="w-5 h-5 text-[#2D4A3E] flex-shrink-0" />
                    ) : (
                      <Upload className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    )}
                    <span className={`text-sm font-medium flex-1 ${menuFile ? 'text-[#2D4A3E]' : 'text-gray-600'}`}>
                      {text.menuList} {menuFile && `✓ ${menuFile.name}`}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleMenuFileUpload(file)
                        e.target.value = ''
                      }}
                      className="hidden"
                    />
                  </label>

                  {/* Ingredient File - Clickable Upload */}
                  <label className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                    ingredientFile 
                      ? 'bg-[#C5E86C]/20 border-[#C5E86C]' 
                      : 'bg-gray-50 border-gray-200 hover:border-[#C5E86C]'
                  }`}>
                    {ingredientFile ? (
                      <CheckCircle className="w-5 h-5 text-[#2D4A3E] flex-shrink-0" />
                    ) : (
                      <Upload className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    )}
                    <span className={`text-sm font-medium flex-1 ${ingredientFile ? 'text-[#2D4A3E]' : 'text-gray-600'}`}>
                      {text.ingredientList} {ingredientFile && `✓ ${ingredientFile.name}`}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleIngredientFileUpload(file)
                        e.target.value = ''
                      }}
                      className="hidden"
                    />
                  </label>

                  {/* Other Required Documents */}
                  {REQUIRED_DOCS.filter(doc => doc.type !== 'menu_list' && doc.type !== 'ingredient_list' && doc.type !== 'photos').map((doc) => {
                    const uploaded = getUploadedDocTypes().has(doc.type)
                    return (
                      <div 
                        key={doc.type}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                          uploaded 
                            ? 'bg-[#C5E86C]/20 border-[#C5E86C]' 
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        {uploaded ? (
                          <CheckCircle className="w-5 h-5 text-[#2D4A3E] flex-shrink-0" />
                        ) : (
                          <div className="w-5 h-5 rounded border-2 border-gray-300 flex-shrink-0" />
                        )}
                        <span className={`text-sm font-medium ${uploaded ? 'text-[#2D4A3E]' : 'text-gray-600'}`}>
                          {doc.label}
                        </span>
                      </div>
                    )
                  })}

                  {/* Kitchen Photos Status */}
                  <div className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                    kitchenPhotos.length > 0 
                      ? 'bg-[#C5E86C]/20 border-[#C5E86C]' 
                      : 'bg-gray-50 border-gray-200'
                  }`}>
                    {kitchenPhotos.length > 0 ? (
                      <CheckCircle className="w-5 h-5 text-[#2D4A3E] flex-shrink-0" />
                    ) : (
                      <div className="w-5 h-5 rounded border-2 border-gray-300 flex-shrink-0" />
                    )}
                    <span className={`text-sm font-medium ${kitchenPhotos.length > 0 ? 'text-[#2D4A3E]' : 'text-gray-600'}`}>
                      {text.photos} {kitchenPhotos.length > 0 && `(${kitchenPhotos.length})`}
                    </span>
                  </div>
                </div>

                {/* Progress */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-[#2D4A3E]">Progress</span>
                    <span className="text-sm font-bold text-[#2D4A3E]">
                      {(() => {
                        const total = REQUIRED_DOCS.length
                        const uploaded = getUploadedDocTypes().size + 
                          (menuFile ? 1 : 0) + 
                          (ingredientFile ? 1 : 0) + 
                          (kitchenPhotos.length > 0 ? 1 : 0)
                        return `${uploaded}/${total}`
                      })()}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#2D4A3E] to-[#C5E86C] transition-all duration-500"
                      style={{ width: `${(() => {
                        const total = REQUIRED_DOCS.length
                        const uploaded = getUploadedDocTypes().size + 
                          (menuFile ? 1 : 0) + 
                          (ingredientFile ? 1 : 0) + 
                          (kitchenPhotos.length > 0 ? 1 : 0)
                        return (uploaded / total) * 100
                      })()}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Upload Area */}
            <div className="lg:col-span-2 space-y-6">
              {/* Upload Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`bg-white rounded-2xl p-12 border-2 border-dashed transition-all ${
                  isDragging 
                    ? 'border-[#C5E86C] bg-[#C5E86C]/10' 
                    : 'border-gray-300 hover:border-[#C5E86C] hover:bg-[#C5E86C]/5'
                }`}
              >
                <label className="block cursor-pointer text-center">
                  <div className="w-20 h-20 rounded-2xl bg-[#F5F1E8] flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-10 h-10 text-[#2D4A3E]" />
                  </div>
                  <p className="text-lg font-semibold text-[#2D4A3E] mb-2">
                    {text.dragDrop}
                  </p>
                  <p className="text-sm text-gray-500 mb-6">
                    {text.supports}
                  </p>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.docx"
                    onChange={(e) => {
                      Array.from(e.target.files || []).forEach(file => handleFileUpload(file))
                      e.target.value = ''
                    }}
                    className="hidden"
                  />
                  <button className="px-8 py-3 bg-[#C5E86C] text-[#2D4A3E] rounded-xl font-bold hover:bg-[#B5D85C] hover:scale-105 transition-all">
                    {text.chooseFiles}
                  </button>
                </label>
              </div>

              {/* Uploaded Files */}
              {uploadedFiles.length > 0 && (
                <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                  <h3 className="text-lg font-bold text-[#2D4A3E] mb-4">
                    {text.uploadedFiles} ({uploadedFiles.length})
                  </h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    {uploadedFiles.map((file) => (
                      <div 
                        key={file.id}
                        className="flex items-center gap-3 p-3 bg-[#F5F1E8] rounded-xl border border-gray-200"
                      >
                        {file.name.match(/\.(jpg|jpeg|png)$/) ? (
                          <img src={file.url} alt={file.name} className="w-12 h-12 object-cover rounded-lg" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-[#2D4A3E] flex items-center justify-center">
                            <FileText className="w-6 h-6 text-[#C5E86C]" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-[#2D4A3E] truncate">{file.name}</div>
                          <div className="text-xs text-gray-500">
                            {(file.size / 1024).toFixed(1)} KB
                          </div>
                        </div>
                        <button
                          onClick={() => removeFile(file.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Camera Upload for Photos */}
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <h3 className="text-lg font-bold text-[#2D4A3E] mb-3 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-[#C5E86C]" />
                  {text.kitchenPhotos}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {text.photosDesc}
                </p>
                <label className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#2D4A3E] to-[#3D5A4E] text-white rounded-xl font-semibold hover:scale-105 transition-all cursor-pointer">
                  <Camera className="w-4 h-4 text-[#C5E86C]" />
                  {text.takePhoto}
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => {
                      Array.from(e.target.files || []).forEach(file => handleKitchenPhotoUpload(file))
                      e.target.value = ''
                    }}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Start Audit Button */}
              <button
                onClick={startAudit}
                disabled={uploadedFiles.length < 4 || isAuditing}
                className="w-full py-5 bg-gradient-to-r from-[#2D4A3E] to-[#3D5A4E] text-white rounded-2xl font-bold text-xl hover:scale-[1.02] hover:shadow-xl transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-lg"
              >
                {isAuditing ? (
                  <span className="flex items-center justify-center gap-3">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                    {text.analyzing}
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-3">
                    <Sparkles className="w-6 h-6 text-[#C5E86C]" />
                    {text.startAudit}
                    {uploadedFiles.length < 4 && (
                      <span className="text-sm font-normal opacity-80">
                        ({text.uploadMin})
                      </span>
                    )}
                  </span>
                )}
              </button>
            </div>
          </div>
        ) : (
          // Audit Results
          <div className="space-y-6">
            {/* Score Circle */}
            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
              <div className="flex flex-col items-center">
                <ScoreCircle score={auditResult.overall_score} />
                <h2 className="text-2xl font-bold text-[#2D4A3E] mt-6 mb-2">
                  {auditResult.overall_score >= 85 ? text.readySubmit : text.improvementsNeeded}
                </h2>
                <p className="text-gray-600 text-center max-w-md">
                  {auditResult.overall_score >= 85 ? text.readyDesc : text.improveDesc}
                </p>
              </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <h3 className="text-lg font-bold text-[#2D4A3E] mb-4 flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-[#C5E86C]" />
                {text.docChecklist}
              </h3>
              <div className="space-y-3">
                {auditResult.checks.map((check, idx) => (
                  <div 
                    key={idx}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 ${
                      check.status === 'found' 
                        ? 'bg-[#C5E86C]/20 border-[#C5E86C]' 
                        : check.status === 'warning'
                        ? 'bg-amber-50 border-amber-300'
                        : 'bg-red-50 border-red-300'
                    }`}
                  >
                    {check.status === 'found' && <CheckCircle className="w-5 h-5 text-[#2D4A3E] flex-shrink-0 mt-0.5" />}
                    {check.status === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />}
                    {check.status === 'missing' && <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />}
                    <div className="flex-1">
                      <div className={`font-semibold ${
                        check.status === 'found' ? 'text-[#2D4A3E]' :
                        check.status === 'warning' ? 'text-amber-900' :
                        'text-red-900'
                      }`}>
                        {check.doc_type}
                      </div>
                      <div className={`text-sm mt-1 ${
                        check.status === 'found' ? 'text-[#2D4A3E]/80' :
                        check.status === 'warning' ? 'text-amber-700' :
                        'text-red-700'
                      }`}>
                        {check.message}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            {auditResult.recommendations.length > 0 && (
              <div className="bg-gradient-to-br from-[#8B7355]/10 to-[#A89078]/10 rounded-2xl p-6 border-2 border-[#8B7355]/30 shadow-sm">
                <h3 className="text-lg font-bold text-[#2D4A3E] mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-[#8B7355]" />
                  {text.actionItems}
                </h3>
                <div className="space-y-3">
                  {auditResult.recommendations.map((rec, idx) => (
                    <div key={idx} className="bg-white rounded-xl p-4 border border-[#8B7355]/30">
                      <div className="font-semibold text-[#2D4A3E] mb-1">{rec.issue}</div>
                      <div className="text-sm text-gray-600">{rec.action}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={resetAudit}
                className="flex-1 py-4 bg-white border-2 border-[#2D4A3E] text-[#2D4A3E] rounded-2xl font-semibold hover:bg-[#C5E86C]/20 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                {text.recheck}
              </button>
              {auditResult.overall_score >= 85 && (
                <button
                  onClick={() => window.open('https://www.halal.gov.my/v4/', '_blank')}
                  className="flex-1 py-4 bg-[#C5E86C] text-[#2D4A3E] rounded-2xl font-bold hover:bg-[#B5D85C] hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-5 h-5" />
                  {text.goPortal}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ScoreCircle({ score }: { score: number }) {
  const isPass = score >= 85
  const strokeColor = isPass ? '#C5E86C' : score >= 60 ? '#F59E0B' : '#EF4444'
  const bgColor = isPass ? '#2D4A3E' : score >= 60 ? '#92400E' : '#991B1B'
  
  const circumference = 2 * Math.PI * 60
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="relative w-44 h-44">
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="88"
          cy="88"
          r="60"
          stroke="#E5E7EB"
          strokeWidth="12"
          fill="none"
        />
        <circle
          cx="88"
          cy="88"
          r="60"
          stroke={strokeColor}
          strokeWidth="12"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-5xl font-bold" style={{ color: bgColor }}>{score}</div>
        <div className="text-sm text-gray-500 font-semibold">/100</div>
      </div>
    </div>
  )
}