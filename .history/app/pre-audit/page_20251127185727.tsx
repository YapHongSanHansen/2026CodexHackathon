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
import { useDropzone } from 'react-dropzone'
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

// Dropzone Wrapper Component for individual drag-and-drop
interface DropzoneWrapperProps {
  doc: {
    type: DocumentType
    label: string
    icon: any
    isSpecial: boolean
  }
  hasFile: boolean
  file: UploadedFile | UploadedFile[] | null
  language: Language
  onDrop: (files: File[]) => void
  onFileSelect: (file: UploadedFile) => void
  onRemove: () => void
}

function DropzoneWrapper({ doc, hasFile, file, language, onDrop, onFileSelect, onRemove }: DropzoneWrapperProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: doc.type === 'photos' 
      ? { 'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'] }
      : { 
          'application/pdf': ['.pdf'],
          'image/*': ['.jpg', '.jpeg', '.png'],
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
        },
    multiple: doc.type === 'photos',
    onDrop,
    noClick: false,
    noKeyboard: false
  })

  const handleClick = (e: React.MouseEvent) => {
    if (hasFile && !(e.target as HTMLElement).closest('button')) {
      e.preventDefault()
      // Set as selected file for preview
      if (doc.type === 'photos' && (file as UploadedFile[]).length > 0) {
        onFileSelect((file as UploadedFile[])[0])
      } else if (file && !Array.isArray(file)) {
        onFileSelect(file as UploadedFile)
      }
    }
  }

  return (
    <div {...getRootProps()} onClick={handleClick}>
      <input {...getInputProps()} />
      <div 
        className={`flex items-center gap-3 p-2.5 rounded-lg border-2 transition-all cursor-pointer group ${
          isDragActive
            ? 'bg-[#F9FBE7] border-[#2D4A3E] border-dashed shadow-md'
            : hasFile 
            ? 'bg-[#C5E86C]/20 border-[#C5E86C]' 
            : 'bg-gray-50 border-gray-200 hover:border-[#C5E86C] hover:bg-gray-100'
        }`}
      >
        <div className="flex-shrink-0">
          {hasFile ? (
            <CheckCircle className="w-4 h-4 text-[#2D4A3E]" />
          ) : (
            <Upload className={`w-4 h-4 transition-colors ${
              isDragActive ? 'text-[#2D4A3E] animate-bounce' : 'text-gray-400 group-hover:text-[#556B56]'
            }`} />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-semibold ${hasFile ? 'text-[#2D4A3E]' : 'text-gray-700'}`}>
            {doc.label}
          </div>
          {isDragActive ? (
            <div className="text-xs text-[#2D4A3E] font-medium animate-pulse">
              {language === 'bm' ? 'Lepaskan untuk muat naik' : 'Drop to upload'}
            </div>
          ) : hasFile ? (
            <div className="text-xs text-gray-600 truncate">
              {doc.type === 'photos' 
                ? `${(file as UploadedFile[]).length} ${language === 'bm' ? 'gambar' : 'photos'}`
                : (file as UploadedFile).name
              }
            </div>
          ) : (
            <div className="text-xs text-gray-500">
              {language === 'bm' ? 'Klik atau seret fail ke sini' : 'Click or drag file here'}
            </div>
          )}
        </div>

        {hasFile && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onRemove()
            }}
            className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
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
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null)
  
  // Dynamic document requirements from JamAI Base
  const [requiredDocs, setRequiredDocs] = useState<Array<{
    type: DocumentType
    label: string
    icon: any
    isSpecial: boolean
  }>>([])
  const [isLoadingRequirements, setIsLoadingRequirements] = useState(true)

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

  // Fetch document requirements from JamAI Base on mount
  React.useEffect(() => {
    fetchDocumentRequirements()
  }, [])

  /**
   * Fetch document requirements from JamAI Base Knowledge Table
   * This allows requirements to be managed dynamically in JamAI Base
   */
  const fetchDocumentRequirements = async () => {
    setIsLoadingRequirements(true)
    
    try {
      // Default fallback requirements (used if API fails)
      const defaultRequirements = [
        { type: 'menu_list' as DocumentType, label: text.menuList, icon: FileText, isSpecial: true },
        { type: 'ingredient_list' as DocumentType, label: text.ingredientList, icon: FileText, isSpecial: true },
        { type: 'flow_chart' as DocumentType, label: text.flowChart, icon: TrendingUp, isSpecial: false },
        { type: 'training_cert' as DocumentType, label: text.trainingCert, icon: FileText, isSpecial: false },
        { type: 'halal_policy' as DocumentType, label: text.halalPolicy, icon: FileText, isSpecial: false },
        { type: 'pest_control' as DocumentType, label: text.pestControl, icon: FileText, isSpecial: false },
        { type: 'photos' as DocumentType, label: text.photos, icon: ImageIcon, isSpecial: true }
      ]

      // Attempt to fetch from JamAI Base (optional enhancement)
      // If you have a Knowledge Table with document requirements, uncomment:
      /*
      const response = await fetch('/api/pre-audit/requirements', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.requirements && Array.isArray(data.requirements)) {
          setRequiredDocs(data.requirements)
          setIsLoadingRequirements(false)
          return
        }
      }
      */

      // Use default requirements
      setRequiredDocs(defaultRequirements)
      
    } catch (error) {
      console.error('Failed to fetch document requirements:', error)
      // Fallback to default
      setRequiredDocs([
        { type: 'menu_list' as DocumentType, label: text.menuList, icon: FileText, isSpecial: true },
        { type: 'ingredient_list' as DocumentType, label: text.ingredientList, icon: FileText, isSpecial: true },
        { type: 'flow_chart' as DocumentType, label: text.flowChart, icon: TrendingUp, isSpecial: false },
        { type: 'training_cert' as DocumentType, label: text.trainingCert, icon: FileText, isSpecial: false },
        { type: 'halal_policy' as DocumentType, label: text.halalPolicy, icon: FileText, isSpecial: false },
        { type: 'pest_control' as DocumentType, label: text.pestControl, icon: FileText, isSpecial: false },
        { type: 'photos' as DocumentType, label: text.photos, icon: ImageIcon, isSpecial: true }
      ])
    } finally {
      setIsLoadingRequirements(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    files.forEach(file => handleFileUpload(file))
  }

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

  const removeSpecificFile = (type: DocumentType) => {
    if (type === 'menu_list') {
      setMenuFile(null)
    } else if (type === 'ingredient_list') {
      setIngredientFile(null)
    } else if (type === 'photos') {
      setKitchenPhotos([])
    } else {
      setUploadedFiles(prev => prev.filter(f => f.type !== type))
    }
  }

  const getUploadedDocTypes = () => {
    return new Set(uploadedFiles.map(f => f.type))
  }

  const getFileForType = (type: DocumentType): UploadedFile | UploadedFile[] | null => {
    if (type === 'menu_list') return menuFile
    if (type === 'ingredient_list') return ingredientFile
    if (type === 'photos') return kitchenPhotos
    const file = uploadedFiles.find(f => f.type === type)
    return file || null
  }

  const getTotalUploaded = () => {
    let count = 0
    if (menuFile) count++
    if (ingredientFile) count++
    if (kitchenPhotos.length > 0) count++
    count += getUploadedDocTypes().size
    return count
  }

  const startAudit = async () => {
    setIsAuditing(true)
    
    try {
      // Prepare FormData for file upload + metadata
      const formData = new FormData()
      
      // Add metadata
      formData.append('companyName', companyName || 'Company')
      formData.append('businessType', businessType || 'Restaurant')
      
      // Add file objects (not just names)
      if (menuFile?.file) {
        formData.append('menuFile', menuFile.file)
        console.log('📋 [Frontend] Adding Menu File:', menuFile.name)
      }
      
      if (ingredientFile?.file) {
        formData.append('ingredientFile', ingredientFile.file)
        console.log('📋 [Frontend] Adding Ingredient File:', ingredientFile.name)
      }
      
      // Add kitchen photos
      if (kitchenPhotos.length > 0) {
        kitchenPhotos.forEach(photo => {
          if (photo.file) {
            formData.append('kitchenPhotos', photo.file)
            console.log('📋 [Frontend] Adding Kitchen Photo:', photo.name)
          }
        })
      }
      
      // Add other filenames (not uploaded as files, just tracked)
      const otherFilenames = uploadedFiles.map(f => f.name).join(', ')
      formData.append('otherFilenames', otherFilenames)
      
      console.log('📋 [Frontend] Submitting Pre-Audit to API...')
      
      const response = await fetch('/api/pre-audit', {
        method: 'POST',
        body: formData, // Send FormData (no Content-Type header needed)
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
    setMenuFile(null)
    setIngredientFile(null)
    setKitchenPhotos([])
    setAuditResult(null)
    setShowReportModal(false)
    setFullReport('')
  }

  const downloadPDF = async () => {
    const reportElement = document.getElementById('markdown-report')
    if (!reportElement) return

    try {
      const canvas = await html2canvas(reportElement, {
        scale: 2,
        backgroundColor: '#ffffff'
      })
      
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`Pre-Audit-Report-${companyName || 'Company'}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate PDF')
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
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left Column (50%) - Smart Upload List */}
          <div className="lg:col-span-6">
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <h2 className="text-lg font-bold text-[#2D4A3E] mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#C5E86C]" />
                {text.requiredDocs} ({getTotalUploaded()}/{REQUIRED_DOCS.length})
              </h2>

              {/* Company Info */}
              <div className="space-y-2 mb-4">
                <input
                  type="text"
                  placeholder={language === 'bm' ? 'Nama Syarikat' : 'Company Name'}
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-[#C5E86C] focus:outline-none text-[#2D4A3E] text-sm"
                />
                <input
                  type="text"
                  placeholder={language === 'bm' ? 'Jenis Perniagaan' : 'Business Type'}
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-[#C5E86C] focus:outline-none text-[#2D4A3E] text-sm"
                />
              </div>

              {/* Smart Upload List */}
              <div className="space-y-2">
                {isLoadingRequirements ? (
                  <div className="text-center py-8 text-gray-500">
                    <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
                    {language === 'bm' ? 'Memuatkan keperluan...' : 'Loading requirements...'}
                  </div>
                ) : (
                  requiredDocs.map((doc) => {
                  const file = getFileForType(doc.type)
                  const hasFile = doc.type === 'photos' 
                    ? (file as UploadedFile[])?.length > 0 
                    : file !== null
                  const Icon = doc.icon

                  return (
                    <DropzoneWrapper
                      key={doc.type}
                      doc={doc}
                      hasFile={hasFile}
                      file={file}
                      language={language}
                      onDrop={(files: File[]) => {
                        files.forEach(file => {
                          if (doc.type === 'menu_list') {
                            handleMenuFileUpload(file)
                          } else if (doc.type === 'ingredient_list') {
                            handleIngredientFileUpload(file)
                          } else if (doc.type === 'photos') {
                            handleKitchenPhotoUpload(file)
                          } else {
                            handleFileUpload(file, doc.type)
                          }
                        })
                        // Set first file as selected for preview
                        if (files.length > 0) {
                          const reader = new FileReader()
                          reader.onload = () => {
                            setSelectedFile({
                              id: Date.now().toString(),
                              name: files[0].name,
                              type: doc.type,
                              url: reader.result as string,
                              size: files[0].size,
                              file: files[0]
                            })
                          }
                          reader.readAsDataURL(files[0])
                        }
                      }}
                      onFileSelect={(file) => setSelectedFile(file)}
                      onRemove={() => removeSpecificFile(doc.type)}
                    />
                  )
                  })
                )}
              </div>

            </div>
          </div>

          {/* Right Column (50%) - Results Area with Sticky Position */}
          <div className="lg:col-span-6">
            <div className="sticky top-8">
              {!auditResult ? (
                /* Initial State - Ready to Inspect or File Preview */
                <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm min-h-[600px] flex flex-col">
                  {isAuditing ? (
                    /* Loading State */
                    <div className="flex-1 flex flex-col items-center justify-center">
                      <div className="relative w-32 h-32 mx-auto mb-6">
                        <RefreshCw className="w-32 h-32 text-[#C5E86C] animate-spin" />
                      </div>
                      <h3 className="text-2xl font-bold text-[#2D4A3E] mb-2">
                        {text.analyzing}
                      </h3>
                      <p className="text-gray-600">
                        {language === 'bm' 
                          ? 'Menganalisis dokumen anda...' 
                          : 'Analyzing your documents...'}
                      </p>
                    </div>
                  ) : getTotalUploaded() > 0 && selectedFile ? (
                    /* File Preview State */
                    <div className="flex-1 flex flex-col">
                      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                        <h3 className="text-lg font-bold text-[#2D4A3E]">
                          {language === 'bm' ? 'Pratonton Fail' : 'File Preview'}
                        </h3>
                        <button
                          onClick={() => setSelectedFile(null)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="flex-1 flex flex-col items-center justify-center">
                        {selectedFile.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                          /* Image Preview */
                          <div className="w-full max-w-md">
                            <img 
                              src={selectedFile.url} 
                              alt={selectedFile.name} 
                              className="w-full h-auto rounded-xl shadow-lg border-2 border-gray-200"
                            />
                          </div>
                        ) : (
                          /* Document Icon */
                          <div className="text-center">
                            <div className="w-32 h-32 mx-auto mb-6 rounded-2xl bg-[#2D4A3E] flex items-center justify-center">
                              <FileText className="w-16 h-16 text-[#C5E86C]" />
                            </div>
                            <div className="text-xl font-bold text-[#2D4A3E] mb-2 px-4 break-words">
                              {selectedFile.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {(selectedFile.size / 1024).toFixed(1)} KB
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <button
                          onClick={startAudit}
                          disabled={getTotalUploaded() < 3}
                          className="w-full py-4 bg-gradient-to-r from-[#2D4A3E] to-[#3D5A4E] text-white rounded-xl font-bold text-lg hover:scale-[1.02] hover:shadow-xl transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-lg flex items-center justify-center gap-3"
                        >
                          <Sparkles className="w-6 h-6 text-[#C5E86C]" />
                          {text.startAudit}
                        </button>
                        
                        {getTotalUploaded() < 3 && (
                          <p className="text-sm text-gray-500 mt-3 text-center">
                            {language === 'bm' 
                              ? `Muat naik sekurang-kurangnya 3 dokumen`
                              : 'Upload at least 3 documents'}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Empty State - Progress Ring */
                    <div className="flex-1 flex flex-col items-center justify-center">
                      <div className="relative w-48 h-48 mx-auto mb-8">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle
                            cx="96"
                            cy="96"
                            r="80"
                            stroke="#E5E7EB"
                            strokeWidth="16"
                            fill="none"
                          />
                          <circle
                            cx="96"
                            cy="96"
                            r="80"
                            stroke="#C5E86C"
                            strokeWidth="16"
                            fill="none"
                            strokeDasharray={2 * Math.PI * 80}
                            strokeDashoffset={2 * Math.PI * 80 * (1 - getTotalUploaded() / REQUIRED_DOCS.length)}
                            strokeLinecap="round"
                            className="transition-all duration-500"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <div className="text-5xl font-bold text-[#2D4A3E]">
                            {getTotalUploaded()}
                          </div>
                          <div className="text-xl text-gray-500 font-semibold">
                            / {REQUIRED_DOCS.length}
                          </div>
                        </div>
                      </div>

                      <h3 className="text-2xl font-bold text-[#2D4A3E] mb-3">
                        {language === 'bm' ? 'Sedia untuk Diperiksa' : 'Ready to Inspect'}
                      </h3>
                      <p className="text-gray-600 mb-8 text-center max-w-sm">
                        {language === 'bm' 
                          ? 'Muat naik dokumen di sebelah kiri dan klik butang di bawah untuk memulakan pemeriksaan.'
                          : 'Upload documents on the left and click the button below to start inspection.'}
                      </p>

                      <button
                        onClick={startAudit}
                        disabled={getTotalUploaded() < 3}
                        className="px-10 py-4 bg-gradient-to-r from-[#2D4A3E] to-[#3D5A4E] text-white rounded-2xl font-bold text-lg hover:scale-105 hover:shadow-xl transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-lg flex items-center gap-3"
                      >
                        <Sparkles className="w-6 h-6 text-[#C5E86C]" />
                        {text.startAudit}
                      </button>
                      
                      {getTotalUploaded() < 3 && (
                        <p className="text-sm text-gray-500 mt-4">
                          {language === 'bm' 
                            ? `Muat naik sekurang-kurangnya 3 dokumen`
                            : 'Upload at least 3 documents'}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* Result State - Audit Results */
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
              {fullReport && (
                <button
                  onClick={() => setShowReportModal(true)}
                  className="flex-1 py-4 bg-[#556B56] text-white rounded-2xl font-semibold hover:bg-[#2D4A3E] transition-all flex items-center justify-center gap-2"
                >
                  <FileText className="w-5 h-5" />
                  {language === 'bm' ? 'Lihat Laporan Penuh' : 'View Full Report'}
                </button>
              )}
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
        </div>

        {/* Results Modal */}
        {showReportModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-[#2D4A3E] to-[#3D5A4E] px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <FileText className="w-6 h-6 text-[#C5E86C]" />
                  {language === 'bm' ? 'Laporan Audit Lengkap' : 'Complete Audit Report'}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={downloadPDF}
                    className="px-4 py-2 bg-[#C5E86C] text-[#2D4A3E] rounded-lg font-semibold hover:bg-[#B5D85C] transition-all flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    {language === 'bm' ? 'Muat Turun PDF' : 'Download PDF'}
                  </button>
                  <button
                    onClick={() => setShowReportModal(false)}
                    className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-8 overflow-y-auto max-h-[calc(90vh-80px)] bg-[#F9F7F2]">
                <div id="markdown-report" className="prose prose-sm max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      // Style PASS/FAIL keywords
                      p: ({ children }) => {
                        const text = String(children)
                        if (text.includes('PASS') || text.includes('LULUS')) {
                          return <p className="text-[#4A7A57] font-bold">{children}</p>
                        }
                        if (text.includes('FAIL') || text.includes('GAGAL') || text.includes('CRITICAL') || text.includes('KRITIKAL')) {
                          return <p className="text-[#D32F2F] font-bold">{children}</p>
                        }
                        return <p className="text-[#2D4A3E]">{children}</p>
                      },
                      h1: ({ children }) => (
                        <h1 className="text-3xl font-bold text-[#2D4A3E] mb-4">{children}</h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-2xl font-bold text-[#2D4A3E] mt-6 mb-3">{children}</h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-xl font-semibold text-[#556B56] mt-4 mb-2">{children}</h3>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc list-inside text-[#2D4A3E] space-y-2 my-4">{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal list-inside text-[#2D4A3E] space-y-2 my-4">{children}</ol>
                      ),
                      strong: ({ children }) => {
                        const text = String(children)
                        if (text.includes('PASS') || text.includes('LULUS')) {
                          return <strong className="text-[#4A7A57]">{children}</strong>
                        }
                        if (text.includes('FAIL') || text.includes('GAGAL') || text.includes('CRITICAL') || text.includes('KRITIKAL')) {
                          return <strong className="text-[#D32F2F]">{children}</strong>
                        }
                        return <strong className="text-[#2D4A3E]">{children}</strong>
                      },
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-4">
                          <table className="min-w-full border-collapse border border-gray-300">{children}</table>
                        </div>
                      ),
                      th: ({ children }) => (
                        <th className="border border-gray-300 bg-[#2D4A3E] text-white px-4 py-2 text-left">{children}</th>
                      ),
                      td: ({ children }) => (
                        <td className="border border-gray-300 px-4 py-2 text-[#2D4A3E]">{children}</td>
                      ),
                    }}
                  >
                    {fullReport}
                  </ReactMarkdown>
                </div>
              </div>
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