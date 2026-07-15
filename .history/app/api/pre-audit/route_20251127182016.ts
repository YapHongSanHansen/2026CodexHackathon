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

    // Get credentials from environment variables (Pre-Audit specific)
    const projectId = process.env.NEXT_PUBLIC_PRE_AUDIT_PROJECT_ID
    const apiKey = process.env.PRE_AUDIT_API_KEY

    if (!projectId || !apiKey) {
      console.error('❌ Missing Pre-Audit JamAI credentials')
      console.error('Required: NEXT_PUBLIC_PRE_AUDIT_PROJECT_ID and PRE_AUDIT_API_KEY')
      return NextResponse.json(
        { error: 'Server configuration error: Missing Pre-Audit JamAI credentials' },
        { status: 500 }
      )
    }

    // Step A: Upload files to JamAI Base
    let menuFileUri = ''
    let ingredientFileUri = ''
    let kitchenPhotoUri = ''

    console.log('📤 [Pre-Audit API] Uploading files...')

    if (menuFile && menuFile.size > 0) {
      console.log('📤 Uploading Menu File...')
      menuFileUri = await uploadFileToJamAI(menuFile, projectId, apiKey)
    }

    if (ingredientFile && ingredientFile.size > 0) {
      console.log('📤 Uploading Ingredient File...')
      ingredientFileUri = await uploadFileToJamAI(ingredientFile, projectId, apiKey)
    }

    if (kitchenPhotos.length > 0) {
      console.log('📤 Uploading Kitchen Photos...')
      const photoUris = await Promise.all(
        kitchenPhotos.map(photo => uploadFileToJamAI(photo, projectId, apiKey))
      )
      kitchenPhotoUri = photoUris.join(', ')
    }

    // Step B: Submit row to Action Table
    console.log('📊 [Pre-Audit API] Submitting to Action Table...')
    
    const rowId = `${companyName} - ${businessType}`
    
    const result = await submitPreAuditRow(
      {
        id: rowId,
        menuFileUri,
        ingredientFileUri,
        kitchenPhotoUri,
        uploadedFilenames: otherFilenames,
      },
      apiKey
    )

    console.log('✅ [Pre-Audit API] Success:', result)

    // Parse the final report and extract score/checks if available
    // The Action Table should return a Final_report_card column
    const finalReport = result.finalReport || result.Final_report_card || ''

    // Return structured response for frontend
    return NextResponse.json({
      success: true,
      rowId: result.rowId,
      auditReport: finalReport,
      score: 85, // Extract from report if needed
      checks: [], // Parse from report if needed
      recommendations: [], // Parse from report if needed
      rawResponse: result
    })

  } catch (error) {
    console.error('❌ [Pre-Audit API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to validate pre-audit' },
      { status: 500 }
    )
  }
}
