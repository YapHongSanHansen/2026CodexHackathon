/**
 * JamAI Base API Integration
 * Handles file uploads and Action Table submissions for Pre-Audit System
 */

import JamAI from 'jamaibase'

const JAMAI_BASE_URL = 'https://api.jamaibase.com/v1'

// Helper function to create JamAI client for Pre-Audit
function getPreAuditClient() {
  return new JamAI({
    token: process.env.PRE_AUDIT_API_KEY || '',
    projectId: process.env.NEXT_PUBLIC_PRE_AUDIT_PROJECT_ID || '',
    baseURL: 'https://api.jamaibase.com',
  })
}

interface FileUploadResponse {
  uri: string
  filename: string
}

interface PreAuditSubmission {
  companyName: string
  businessType: string
  menuFile?: File | null
  ingredientFile?: File | null
  kitchenPhotos?: File[]
  otherFiles?: File[]
}

interface PreAuditResponse {
  rowId: string
  // 6 Output columns from JamAI Base Pre_Audit_System table
  Final_report_card: string
  Visual_Hygiene_Check: any
  Audit_checklist_status: any
  Audit_menu_logic: any
  Certification_Validation: any
  ProcessFlow_Validation: any
  columns?: any
  // Legacy field for backward compatibility
  finalReport?: string
}

/**
 * Step A: Upload a file to JamAI Base storage using SDK
 */
export async function uploadFileToJamAI(
  file: File,
  projectId: string,
  apiKey: string
): Promise<string> {
  try {
    const jamai = getPreAuditClient()
    
    console.log(`📤 Uploading file: ${file.name} (${file.size} bytes)`)
    
    const uploadResponse = await jamai.file.uploadFile({
      file: file,
    })
    
    console.log('✅ File uploaded successfully:', uploadResponse.uri)
    return uploadResponse.uri
    
  } catch (error) {
    console.error('❌ File upload failed:', error)
    throw new Error(`File upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Step B: Submit a row to the Pre_Audit_System Action Table using SDK
 * Sends all 7 input files and receives 6 output columns
 */
export async function submitPreAuditRow(
  data: {
    id: string
    menuFileUri: string
    ingredientFileUri: string
    chartFlowUri: string
    trainingCertUri: string
    halalPolicyUri: string
    pestControlUri: string
    kitchenPhotoUri: string
  },
  apiKey: string
): Promise<PreAuditResponse> {
  try {
    const jamai = getPreAuditClient()
    
    // Payload with all 7 input columns matching JamAI Base table
    const payload = {
      ID: data.id,
      Menu_File: data.menuFileUri,
      Ingredient_File: data.ingredientFileUri,
      ChartFlow: data.chartFlowUri,
      Training_cert: data.trainingCertUri,
      Halal_policy_poster: data.halalPolicyUri,
      Pest_Control_Contract: data.pestControlUri,
      Kitchen_Photo: data.kitchenPhotoUri,
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔍 [DEBUG] JamAI Base API Call:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Table: Pre_Audit_System (action)')
    console.log('Payload:', JSON.stringify(payload, null, 2))
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    const addResult = await jamai.table.addRow({
      table_type: 'action',
      table_id: 'Pre_Audit_System',
      data: [payload],
      reindex: false,
    })

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ Row Added to JamAI Base')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    if (!addResult.rows || addResult.rows.length === 0) {
      throw new Error('No response rows returned from JamAI')
    }

    const rowId = addResult.rows[0].row_id
    console.log('Row ID:', rowId)
    console.log('⏳ Waiting for LLM outputs to be generated...')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    // Poll for outputs to be generated (LLMs take time to process)
    let result: any = null
    let attempts = 0
    const maxAttempts = 30 // 30 attempts = ~60 seconds max wait
    
    while (attempts < maxAttempts) {
      attempts++
      console.log(`🔄 Polling attempt ${attempts}/${maxAttempts}...`)
      
      // Fetch the row to check if outputs are ready
      const getResult = await jamai.table.getRow({
        table_type: 'action',
        table_id: 'Pre_Audit_System',
        row_id: rowId
      })
      
      if (getResult && getResult.columns) {
        // Check if Final_report_card has content (main output indicator)
        const finalReportColumn = getResult.columns.Final_report_card
        
        if (finalReportColumn && finalReportColumn.choices && finalReportColumn.choices.length > 0) {
          const content = finalReportColumn.choices[0].message?.content
          if (content && content.length > 10) {
            console.log('✅ Outputs are ready!')
            result = getResult
            break
          }
        }
      }
      
      // Wait 2 seconds before next poll
      if (attempts < maxAttempts) {
        console.log('⏳ Outputs not ready yet, waiting 2 seconds...')
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
    
    if (!result) {
      console.warn('⚠️ Timeout waiting for outputs, returning partial results')
      result = addResult.rows[0]
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📊 Final Result with Outputs:')
    console.log(JSON.stringify(result, null, 2))
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    const columns = result.columns
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔍 [DEBUG] Available Column Names:')
    console.log(Object.keys(columns))
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    // Helper function to extract text from chat completion
    const extractText = (column: any): string => {
      if (!column) {
        console.log('⚠️ Column is null/undefined')
        return ''
      }
      if (!column.choices) {
        console.log('⚠️ Column has no choices property')
        return ''
      }
      if (column.choices.length === 0) {
        console.log('⚠️ Column choices array is empty')
        return ''
      }
      const content = column.choices[0].message?.content
      const result = typeof content === 'string' ? content : ''
      console.log(`📝 Extracted text length: ${result.length} characters`)
      return result
    }
    
    // Helper function to parse JSON output columns
    const parseJSON = (column: any): any => {
      const text = extractText(column)
      if (!text) return null
      try {
        return JSON.parse(text)
      } catch {
        return text // Return raw text if not valid JSON
      }
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔍 [DEBUG] Extracting Final_report_card:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    const finalReportCard = extractText(columns.Final_report_card)
    console.log('Final_report_card length:', finalReportCard.length)
    console.log('Final_report_card preview:', finalReportCard.substring(0, 200))
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    // Return all 6 output columns
    return {
      rowId: data.id,
      Final_report_card: finalReportCard,
      Visual_Hygiene_Check: parseJSON(columns.Visual_Hygiene_Check),
      Audit_checklist_status: parseJSON(columns.Audit_checklist_status),
      Audit_menu_logic: parseJSON(columns.Audit_menu_logic),
      Certification_Validation: parseJSON(columns.Certification_Validation),
      ProcessFlow_Validation: parseJSON(columns.ProcessFlow_Validation),
      columns
    }
    
  } catch (error) {
    console.error('❌ Action Table submission failed:', error)
    throw new Error(`Action Table submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Main integration function: Upload files and submit audit
 */
export async function submitPreAudit(
  submission: PreAuditSubmission,
  onProgress?: (stage: 'uploading' | 'analyzing', message: string) => void
): Promise<PreAuditResponse> {
  const projectId = process.env.NEXT_PUBLIC_PRE_AUDIT_PROJECT_ID
  const apiKey = process.env.PRE_AUDIT_API_KEY

  if (!projectId || !apiKey) {
    throw new Error('Missing Pre-Audit JamAI credentials. Please check NEXT_PUBLIC_PRE_AUDIT_PROJECT_ID and PRE_AUDIT_API_KEY.')
  }

  try {
    // Step A: Upload all 7 files if present
    let menuFileUri = ''
    let ingredientFileUri = ''
    let chartFlowUri = ''
    let trainingCertUri = ''
    let halalPolicyUri = ''
    let pestControlUri = ''
    let kitchenPhotoUri = ''

    onProgress?.('uploading', 'Uploading files...')

    if (submission.menuFile) {
      console.log('📤 Uploading Menu File...')
      menuFileUri = await uploadFileToJamAI(submission.menuFile, projectId, apiKey)
    }

    if (submission.ingredientFile) {
      console.log('📤 Uploading Ingredient File...')
      ingredientFileUri = await uploadFileToJamAI(submission.ingredientFile, projectId, apiKey)
    }

    if (submission.kitchenPhotos && submission.kitchenPhotos.length > 0) {
      console.log('📤 Uploading Kitchen Photos...')
      const photoUris = await Promise.all(
        submission.kitchenPhotos.map(photo => 
          uploadFileToJamAI(photo, projectId, apiKey)
        )
      )
      kitchenPhotoUri = photoUris.join(', ')
    }

    // Step B: Submit to Action Table with all 7 file URIs
    onProgress?.('analyzing', 'Analyzing documents...')

    const rowId = `${submission.companyName} - ${submission.businessType} - ${Date.now()}`
    
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

    return result

  } catch (error) {
    console.error('❌ Pre-Audit submission error:', error)
    throw error
  }
}
