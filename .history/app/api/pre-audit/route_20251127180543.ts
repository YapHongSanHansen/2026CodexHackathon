import { NextRequest, NextResponse } from 'next/server'
import { submitPreAuditRow, uploadFileToJamAI } from '@/lib/jamai-api'

/**
 * POST /api/pre-audit
 * 
 * Pre-Audit Digital Auditor
 * Validates document completeness and scores audit readiness
 * 
 * JamAI Base Integration:
 * - Action Table: Pre_Audit_System
 * - Two-step process: Upload files → Submit row to Action Table
 * - Returns Final_report_card column with markdown report
 */
export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data (files + JSON fields)
    const formData = await request.formData()
    
    const companyName = formData.get('companyName') as string || ''
    const businessType = formData.get('businessType') as string || ''
    const menuFile = formData.get('menuFile') as File | null
    const ingredientFile = formData.get('ingredientFile') as File | null
    const kitchenPhotos = formData.getAll('kitchenPhotos') as File[]
    const otherFilenames = formData.get('otherFilenames') as string || ''

    console.log('📋 [Pre-Audit API] Processing request...')
    console.log('📋 [Pre-Audit API] Company:', companyName)
    console.log('📋 [Pre-Audit API] Business Type:', businessType)
    console.log('📋 [Pre-Audit API] Menu File:', menuFile?.name)
    console.log('📋 [Pre-Audit API] Ingredient File:', ingredientFile?.name)
    console.log('📋 [Pre-Audit API] Kitchen Photos:', kitchenPhotos.map(f => f.name).join(', '))
    console.log('📋 [Pre-Audit API] Other Files:', otherFilenames)

    // Compile all uploaded files for validation
    const allFiles = [menuFile, ingredientFile, kitchenPhoto, uploadedFilenames]
      .filter(Boolean)
      .join(', ')
      .split(', ')
      .filter(Boolean)

    // Call JamAI Base validation
    const result = await validatePreAudit({
      uploadedFiles: allFiles,
      companyName,
      businessType,
      menuItems,
      ingredientList
    })

    // Format response for frontend
    const checks = result.documentChecklist.map(doc => ({
      doc_type: doc.document,
      status: doc.found ? 'found' : 'missing',
      message: doc.found 
        ? `✓ Ditemui: ${doc.document}${doc.filename ? ` (${doc.filename})` : ''}`
        : `✗ Belum Ditemui: ${doc.document}`
    }))

    // Add menu-ingredient validation warnings
    if (result.menuMismatches.length > 0) {
      result.menuMismatches.forEach(mismatch => {
        checks.push({
          doc_type: 'Menu-Ingredient Consistency',
          status: 'warning',
          message: `⚠ "${mismatch.menuItem}" tidak sepadan dengan senarai bahan mentah. Kekurangan: ${mismatch.missingIngredients.join(', ')}`
        })
      })
    }

    // Add risky ingredient warnings
    if (result.riskyIngredients.length > 0) {
      checks.push({
        doc_type: 'Risky Ingredients Detected',
        status: 'warning',
        message: `⚠ Bahan berisiko ditemui: ${result.riskyIngredients.join(', ')}. Sila pastikan sijil halal tersedia.`
      })
    }

    const recommendations = result.recommendations.map(rec => ({
      issue: rec.includes('dokumen') || rec.includes('document') 
        ? 'Dokumen Tidak Lengkap' 
        : 'Penambahbaikan Diperlukan',
      action: rec
    }))

    return NextResponse.json({
      score: result.auditScore,
      totalChecks: result.documentChecklist.length,
      passedChecks: result.documentChecklist.filter(d => d.found).length,
      checks,
      recommendations,
      auditReport: result.auditReport
    })

  } catch (error) {
    console.error('❌ [Pre-Audit API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to validate pre-audit' },
      { status: 500 }
    )
  }
}
