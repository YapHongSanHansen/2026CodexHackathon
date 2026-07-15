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
  finalReport: string
  [key: string]: any
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

    console.log('📤 Submitting to Action Table Pre_Audit_System:', payload)

    const result = await jamai.table.addRow({
      table_type: 'action',
      table_id: 'Pre_Audit_System',
      data: [payload],
      reindex: false,
    })

    console.log('✅ Action Table response:', result)

    // Extract the generated columns from the response
    if (!result.rows || result.rows.length === 0) {
      throw new Error('No response rows returned from JamAI')
    }

    const columns = result.rows[0].columns
    
    // Helper function to extract text from chat completion
    const extractText = (column: any): string => {
      if (!column || !column.choices || column.choices.length === 0) {
        return ''
      }
      const content = column.choices[0].message?.content
      return typeof content === 'string' ? content : ''
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
    
    // Return all 6 output columns
    return {
      rowId: data.id,
      Final_report_card: extractText(columns.Final_report_card),
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
    // Step A: Upload files if present
    let menuFileUri = ''
    let ingredientFileUri = ''
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
      // Upload first photo or combine multiple photos
      const photoUris = await Promise.all(
        submission.kitchenPhotos.map(photo => 
          uploadFileToJamAI(photo, projectId, apiKey)
        )
      )
      kitchenPhotoUri = photoUris.join(', ')
    }

    // Collect filenames of other supporting documents
    const otherFilenames = submission.otherFiles?.map(f => f.name).join(', ') || ''

    // Step B: Submit to Action Table
    onProgress?.('analyzing', 'Analyzing documents...')

    const rowId = `${submission.companyName} - ${submission.businessType}`
    
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

    return result

  } catch (error) {
    console.error('❌ Pre-Audit submission error:', error)
    throw error
  }
}
