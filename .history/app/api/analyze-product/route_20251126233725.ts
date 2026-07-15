import { NextRequest, NextResponse } from 'next/server'
import JamAI from 'jamaibase'

// Initialize JamAI client on server-side
const jamai = new JamAI({
  token: process.env.JAMAI_API_KEY || '',
  projectId: 'proj_045275d84595590cb2eeb709',
  baseURL: 'https://api.jamaibase.com',
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    const text = formData.get('text') as string | null
    const imageFile = formData.get('image') as File | null
    const audioFile = formData.get('audio') as File | null

    const tableId = 'Chatgpt_interface'
    
    // Upload files to JamAI if they exist
    let imageUri: string | undefined
    let audioUri: string | undefined

    if (imageFile) {
      try {
        const imageUploadResponse = await jamai.file.uploadFile({
          file: imageFile,
        })
        imageUri = imageUploadResponse.uri
      } catch (error) {
        console.error('Image upload failed:', error)
        return NextResponse.json(
          { error: `Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}` },
          { status: 500 }
        )
      }
    }

    if (audioFile) {
      try {
        const audioUploadResponse = await jamai.file.uploadFile({
          file: audioFile,
        })
        audioUri = audioUploadResponse.uri
      } catch (error) {
        console.error('Audio upload failed:', error)
        return NextResponse.json(
          { error: `Failed to upload audio: ${error instanceof Error ? error.message : 'Unknown error'}` },
          { status: 500 }
        )
      }
    }

    // Prepare row data for the Action Table
    const rowData: Record<string, any> = {
      Input_text: text || '',
    }

    if (imageUri) {
      rowData.Input_Image = imageUri
    }

    if (audioUri) {
      rowData.Input_Audio = audioUri
    }

    // Add row to Action Table (non-streaming)
    const response = await jamai.table.addRow({
      table_type: 'action',
      table_id: tableId,
      data: [rowData],
      reindex: false,
    })

    // Extract response columns from the completion chunks
    if (!response.rows || response.rows.length === 0) {
      return NextResponse.json(
        { error: 'No response rows returned from JamAI' },
        { status: 500 }
      )
    }

    const columns = response.rows[0].columns
    
    // Helper function to extract text from chat completion
    const extractText = (column: any): string => {
      if (!column || !column.choices || column.choices.length === 0) {
        return ''
      }
      const content = column.choices[0].message?.content
      return typeof content === 'string' ? content : ''
    }
    
    return NextResponse.json({
      Final_reply: extractText(columns.Final_reply),
      Vision_Analysis: extractText(columns.Vision_Analysis),
      Knowledge_Check_Cert: extractText(columns.Knowledge_Check_Cert),
      Knowledge_Check_Ingredients: extractText(columns.Knowledge_Check_Ingredients),
    })
  } catch (error) {
    console.error('Product analysis failed:', error)
    return NextResponse.json(
      { error: `Failed to analyze product: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}
