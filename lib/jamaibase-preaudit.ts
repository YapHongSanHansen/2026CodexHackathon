/**
 * JamAI Base Integration for Pre-Audit Digital Auditor
 * Validates document completeness and menu-ingredient consistency
 */

const JAMAI_BASE_URL = process.env.NEXT_PUBLIC_JAMAI_BASE_URL || 'https://api.jamaibase.com'
const JAMAI_PROJECT_ID = process.env.NEXT_PUBLIC_JAMAI_PROJECT_ID
const JAMAI_PAT = process.env.NEXT_PUBLIC_JAMAI_PERSONAL_ACCESS_TOKEN

// ============================================
// INTERFACES
// ============================================

export interface PreAuditRequest {
  uploadedFiles: string[] // Array of filenames
  companyName: string
  businessType: string
  menuItems: string // Comma-separated menu items
  ingredientList: string // Comma-separated ingredients
}

export interface DocumentCheck {
  document: string
  found: boolean
  filename?: string
}

export interface MenuMismatch {
  menuItem: string
  requiredIngredients: string[]
  missingIngredients: string[]
}

export interface PreAuditResponse {
  documentChecklist: DocumentCheck[]
  menuMismatches: MenuMismatch[]
  riskyIngredients: string[]
  auditScore: number
  auditReport: string // Bahasa Malaysia report
  recommendations: string[]
}

// ============================================
// DOCUMENT VALIDATION
// ============================================

const REQUIRED_DOCUMENTS = [
  { key: 'flow_chart', name: 'Carta Alir Proses', keywords: ['carta', 'flow', 'chart', 'proses', 'process'] },
  { key: 'training_cert', name: 'Sijil Latihan Halal', keywords: ['sijil', 'latihan', 'training', 'certificate', 'cert'] },
  { key: 'halal_policy', name: 'Polisi Halal', keywords: ['polisi', 'policy', 'halal'] },
  { key: 'floor_plan', name: 'Pelan Lantai', keywords: ['pelan', 'lantai', 'floor', 'plan'] },
  { key: 'kitchen_photos', name: 'Gambar Dapur/Kilang', keywords: ['gambar', 'photo', 'dapur', 'kitchen', 'kilang', 'factory', 'premis'] },
  { key: 'pest_control', name: 'Kontrak Kawalan Pest', keywords: ['pest', 'kawalan', 'control', 'contract', 'kontrak'] },
  { key: 'menu_list', name: 'Senarai Menu', keywords: ['menu', 'senarai', 'list'] },
  { key: 'ingredient_list', name: 'Senarai Bahan Mentah', keywords: ['ingredient', 'bahan', 'mentah', 'ramuan'] },
  { key: 'supplier_certs', name: 'Sijil Halal Pembekal', keywords: ['supplier', 'pembekal', 'vendor'] },
  { key: 'ihcs_manual', name: 'Manual IHCS', keywords: ['ihcs', 'manual'] },
]

/**
 * Validate documents using JamAI Base Action Table
 */
export async function validatePreAudit(request: PreAuditRequest): Promise<PreAuditResponse> {
  try {
    console.log('📋 [Pre-Audit] Starting validation...')
    console.log('📋 [Pre-Audit] Files uploaded:', request.uploadedFiles.length)
    console.log('📋 [Pre-Audit] Company:', request.companyName)
    
    // STEP 1: Call JamAI Base Action Table
    const response = await fetch(`${JAMAI_BASE_URL}/api/v1/gen_tables/action/rows/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${JAMAI_PAT}`,
        'X-Project-Id': JAMAI_PROJECT_ID || '',
      },
      body: JSON.stringify({
        table_id: 'pre_audit_validator',
        data: [{
          uploaded_files: request.uploadedFiles.join(', '),
          company_name: request.companyName,
          business_type: request.businessType,
          menu_items: request.menuItems,
          ingredient_list: request.ingredientList
        }],
        stream: false
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ [Pre-Audit API] Error ${response.status}:`, errorText)
      console.warn('⚠️ [Fallback] Using local validation logic')
      return fallbackValidation(request)
    }

    const result = await response.json()
    console.log('✅ [Pre-Audit API] Success! Response received')
    
    // Extract JamAI responses
    const row = result.rows?.[0]
    const cols = row?.columns || {}
    
    const checklistText = cols.document_checklist?.choices?.[0]?.message?.content || '{}'
    const validationText = cols.menu_ingredient_validation?.choices?.[0]?.message?.content || '{}'
    const reportText = cols.audit_report?.choices?.[0]?.message?.content || 'Laporan tidak tersedia'
    
    // Parse JSON responses
    let checklistData: any = {}
    let validationData: any = {}
    
    try {
      checklistData = JSON.parse(checklistText)
    } catch (e) {
      console.warn('⚠️ Failed to parse document_checklist, using fallback')
    }
    
    try {
      validationData = JSON.parse(validationText)
    } catch (e) {
      console.warn('⚠️ Failed to parse menu_ingredient_validation, using fallback')
    }
    
    // Build document checklist
    const documentChecklist: DocumentCheck[] = REQUIRED_DOCUMENTS.map(doc => {
      const foundFiles = checklistData.found || []
      const found = foundFiles.some((f: string) => f.toLowerCase().includes(doc.key))
      return {
        document: doc.name,
        found,
        filename: found ? foundFiles.find((f: string) => f.toLowerCase().includes(doc.key)) : undefined
      }
    })
    
    // Extract menu mismatches and risky ingredients
    const menuMismatches: MenuMismatch[] = validationData.mismatches || []
    const riskyIngredients: string[] = validationData.risky_ingredients || []
    
    // Calculate audit score
    const foundDocs = documentChecklist.filter(d => d.found).length
    const totalDocs = REQUIRED_DOCUMENTS.length
    const docScore = (foundDocs / totalDocs) * 80
    const menuScore = menuMismatches.length === 0 ? 20 : Math.max(0, 20 - (menuMismatches.length * 5))
    const auditScore = Math.round(docScore + menuScore)
    
    // Extract recommendations from report
    const recommendations = extractRecommendations(reportText)
    
    console.log(`✨ [Pre-Audit Result] Score: ${auditScore}%`)
    console.log(`✨ [Pre-Audit Result] Found Docs: ${foundDocs}/${totalDocs}`)
    console.log(`✨ [Pre-Audit Result] Menu Issues: ${menuMismatches.length}`)
    
    return {
      documentChecklist,
      menuMismatches,
      riskyIngredients,
      auditScore,
      auditReport: reportText,
      recommendations
    }
    
  } catch (error) {
    console.error('❌ [Pre-Audit Error]:', error)
    console.warn('⚠️ [Fallback] Using local validation logic')
    return fallbackValidation(request)
  }
}

// ============================================
// FALLBACK VALIDATION (when JamAI unavailable)
// ============================================

function fallbackValidation(request: PreAuditRequest): PreAuditResponse {
  console.log('🔄 [Fallback] Performing local document validation')
  
  const documentChecklist: DocumentCheck[] = REQUIRED_DOCUMENTS.map(doc => {
    const found = request.uploadedFiles.some(filename => {
      const lowerFilename = filename.toLowerCase()
      return doc.keywords.some(keyword => lowerFilename.includes(keyword))
    })
    
    const matchedFile = request.uploadedFiles.find(filename => {
      const lowerFilename = filename.toLowerCase()
      return doc.keywords.some(keyword => lowerFilename.includes(keyword))
    })
    
    return {
      document: doc.name,
      found,
      filename: matchedFile
    }
  })
  
  // Simple menu-ingredient validation
  const menuMismatches: MenuMismatch[] = []
  const menuItems = request.menuItems.split(',').map(m => m.trim()).filter(Boolean)
  const ingredients = request.ingredientList.split(',').map(i => i.trim().toLowerCase()).filter(Boolean)
  
  // Basic validation rules
  const rules: Record<string, string[]> = {
    'chicken': ['chicken', 'ayam'],
    'beef': ['beef', 'daging', 'lembu'],
    'nasi lemak': ['rice', 'nasi', 'coconut', 'santan'],
    'rendang': ['beef', 'daging', 'coconut', 'santan'],
  }
  
  menuItems.forEach(item => {
    const itemLower = item.toLowerCase()
    for (const [key, requiredIngredients] of Object.entries(rules)) {
      if (itemLower.includes(key)) {
        const missing = requiredIngredients.filter(req => 
          !ingredients.some(ing => ing.includes(req))
        )
        if (missing.length > 0) {
          menuMismatches.push({
            menuItem: item,
            requiredIngredients,
            missingIngredients: missing
          })
        }
      }
    }
  })
  
  // Calculate score
  const foundDocs = documentChecklist.filter(d => d.found).length
  const totalDocs = REQUIRED_DOCUMENTS.length
  const docScore = (foundDocs / totalDocs) * 80
  const menuScore = menuMismatches.length === 0 ? 20 : Math.max(0, 20 - (menuMismatches.length * 5))
  const auditScore = Math.round(docScore + menuScore)
  
  // Generate report
  const auditReport = `
Skor Audit Pra-Penghantaran: ${auditScore}/100

Dokumen Ditemui: ${foundDocs}/${totalDocs}
${foundDocs < totalDocs ? `\nDokumen Belum Lengkap:\n${documentChecklist.filter(d => !d.found).map(d => `- ${d.document}`).join('\n')}` : ''}

${menuMismatches.length > 0 ? `\nKetidakselarasan Menu-Bahan:\n${menuMismatches.map(m => `- ${m.menuItem}: Kekurangan ${m.missingIngredients.join(', ')}`).join('\n')}` : 'Menu dan bahan mentah adalah konsisten.'}

${auditScore >= 85 ? 'STATUS: ✅ BERSEDIA UNTUK DIHANTAR' : 'STATUS: ⚠️ PERLU PENAMBAHBAIKAN'}
  `.trim()
  
  const recommendations: string[] = []
  if (foundDocs < totalDocs) {
    recommendations.push('Muat naik semua dokumen wajib untuk meningkatkan skor anda')
  }
  if (menuMismatches.length > 0) {
    recommendations.push('Pastikan senarai bahan mentah sepadan dengan menu yang ditawarkan')
  }
  if (!documentChecklist.find(d => d.document === 'Manual IHCS')?.found) {
    recommendations.push('Gunakan "IHCS Auto-Architect" untuk menjana Manual IHCS secara automatik')
  }
  
  return {
    documentChecklist,
    menuMismatches,
    riskyIngredients: [],
    auditScore,
    auditReport,
    recommendations
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function extractRecommendations(report: string): string[] {
  const recommendations: string[] = []
  
  // Extract bullet points or numbered lists
  const lines = report.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.match(/^[\d\-\*•]\.?\s+/)) {
      const clean = trimmed.replace(/^[\d\-\*•]\.?\s+/, '').trim()
      if (clean.length > 10) {
        recommendations.push(clean)
      }
    }
  }
  
  // If no recommendations found, extract sentences with action words
  if (recommendations.length === 0) {
    const actionWords = ['muat naik', 'pastikan', 'sila', 'tambah', 'upload', 'ensure', 'add']
    for (const line of lines) {
      const hasAction = actionWords.some(word => line.toLowerCase().includes(word))
      if (hasAction && line.length > 20) {
        recommendations.push(line.trim())
      }
    }
  }
  
  return recommendations.slice(0, 5) // Max 5 recommendations
}
