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
    // Parse multipart form data - extract all 7 input files
    const formData = await request.formData()
    
    const companyName = formData.get('companyName') as string || ''
    const businessType = formData.get('businessType') as string || ''
    
    // Extract all 7 input files matching JamAI Base column names
    const menuFile = formData.get('Menu_File') as File | null
    const ingredientFile = formData.get('Ingredient_File') as File | null
    const chartFlow = formData.get('ChartFlow') as File | null
    const trainingCert = formData.get('Training_cert') as File | null
    const halalPolicy = formData.get('Halal_policy_poster') as File | null
    const pestControl = formData.get('Pest_Control_Contract') as File | null
    const kitchenPhotos = formData.getAll('Kitchen_Photo') as File[]

    console.log('📋 [Pre-Audit API] Processing request...')
    console.log('📋 [Pre-Audit API] Company:', companyName)
    console.log('📋 [Pre-Audit API] Business Type:', businessType)
    console.log('📋 [Pre-Audit API] Menu_File:', menuFile?.name)
    console.log('📋 [Pre-Audit API] Ingredient_File:', ingredientFile?.name)
    console.log('📋 [Pre-Audit API] ChartFlow:', chartFlow?.name)
    console.log('📋 [Pre-Audit API] Training_cert:', trainingCert?.name)
    console.log('📋 [Pre-Audit API] Halal_policy_poster:', halalPolicy?.name)
    console.log('📋 [Pre-Audit API] Pest_Control_Contract:', pestControl?.name)
    console.log('📋 [Pre-Audit API] Kitchen_Photo:', kitchenPhotos.map(f => f.name).join(', '))

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

    // Step A: Upload all 7 files to JamAI Base storage
    let menuFileUri = ''
    let ingredientFileUri = ''
    let chartFlowUri = ''
    let trainingCertUri = ''
    let halalPolicyUri = ''
    let pestControlUri = ''
    let kitchenPhotoUri = ''

    console.log('📤 [Pre-Audit API] Uploading files...')

    if (menuFile && menuFile.size > 0) {
      console.log('📤 Uploading Menu_File...')
      menuFileUri = await uploadFileToJamAI(menuFile, projectId, apiKey)
    }

    if (ingredientFile && ingredientFile.size > 0) {
      console.log('📤 Uploading Ingredient_File...')
      ingredientFileUri = await uploadFileToJamAI(ingredientFile, projectId, apiKey)
    }

    if (chartFlow && chartFlow.size > 0) {
      console.log('📤 Uploading ChartFlow...')
      chartFlowUri = await uploadFileToJamAI(chartFlow, projectId, apiKey)
    }

    if (trainingCert && trainingCert.size > 0) {
      console.log('📤 Uploading Training_cert...')
      trainingCertUri = await uploadFileToJamAI(trainingCert, projectId, apiKey)
    }

    if (halalPolicy && halalPolicy.size > 0) {
      console.log('📤 Uploading Halal_policy_poster...')
      halalPolicyUri = await uploadFileToJamAI(halalPolicy, projectId, apiKey)
    }

    if (pestControl && pestControl.size > 0) {
      console.log('📤 Uploading Pest_Control_Contract...')
      pestControlUri = await uploadFileToJamAI(pestControl, projectId, apiKey)
    }

    if (kitchenPhotos.length > 0) {
      console.log('📤 Uploading Kitchen_Photo...')
      const photoUris = await Promise.all(
        kitchenPhotos.map(photo => uploadFileToJamAI(photo, projectId, apiKey))
      )
      kitchenPhotoUri = photoUris.join(', ')
    }

    // Step B: Submit row to Action Table Pre_Audit_System
    console.log('📊 [Pre-Audit API] Submitting to Action Table...')
    
    const rowId = `${companyName} - ${businessType} - ${Date.now()}`
    
    const result = await submitPreAuditRow(
      {
        id: rowId,
        menuFileUri,
        ingredientFileUri,
        chartFlowUri,
        trainingCertUri,
        halalPolicyUri,
        pestControlUri,
        kitchenPhotoUri,
      },
      apiKey
    )

    console.log('✅ [Pre-Audit API] Success:', result)

    // Return all 6 output columns from JamAI Base
    return NextResponse.json({
      success: true,
      rowId: result.rowId,
      
      // 6 Output columns from Pre_Audit_System table
      Final_report_card: result.Final_report_card || '',
      Visual_Hygiene_Check: result.Visual_Hygiene_Check || null,
      Audit_checklist_status: result.Audit_checklist_status || null,
      Audit_menu_logic: result.Audit_menu_logic || null,
      Certification_Validation: result.Certification_Validation || null,
      ProcessFlow_Validation: result.ProcessFlow_Validation || null,
      
      // Legacy fields for backward compatibility
      auditReport: result.Final_report_card || '',
      score: 85,
      checks: [],
      recommendations: [],
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
