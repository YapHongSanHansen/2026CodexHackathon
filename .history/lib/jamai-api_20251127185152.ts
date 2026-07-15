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
 */
export async function submitPreAuditRow(
  data: {
    id: string
    menuFileUri: string
    ingredientFileUri: string
    kitchenPhotoUri: string
    uploadedFilenames: string
  },
  apiKey: string
): Promise<PreAuditResponse> {
  try {
    const jamai = getPreAuditClient()
    
    const payload = {
      ID: data.id,
      Menu_File: data.menuFileUri,
      Ingredient_File: data.ingredientFileUri,
      Kitchen_Photo: data.kitchenPhotoUri,
      Uploaded_Filenames: data.uploadedFilenames,
    }

    console.log('📤 Submitting to Action Table Pre_Audit_System:', payload)

    const result = await jamai.table.addTableRows({
      table_type: 'action',
      table_id: 'Pre_Audit_System',
      data: [payload],
      stream: false,
    })

    console.log('✅ Action Table response:', result)

    // Extract the generated columns from the response
    const row = result.rows?.[0] || result
    
    return {
      rowId: row.ID || data.id,
      finalReport: row.Final_report_card || row.final_report_card || row.columns?.Final_report_card?.value || '',
      ...row
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
