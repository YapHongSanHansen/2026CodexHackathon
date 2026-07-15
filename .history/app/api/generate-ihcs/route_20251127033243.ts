import { NextRequest, NextResponse } from 'next/server'
import JamAI from 'jamaibase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { data, responses } = body

    // Get IHCS-specific credentials from environment
    const token = process.env.NEXT_PUBLIC_JAMAI_PERSONAL_ACCESS_TOKEN
    const projectId = process.env.NEXT_PUBLIC_JAMAI_PROJECT_ID
    const baseURL = process.env.NEXT_PUBLIC_JAMAI_BASE_URL || 'https://api.jamaibase.com'

    if (!token || !projectId) {
      return NextResponse.json(
        { error: 'JamAI credentials not configured' },
        { status: 500 }
      )
    }

    // Initialize JamAI client
    const jamai = new JamAI({ token, projectId, baseURL })
    const tableId = 'ihcs_content_transformer'

    // CASE 1: Single Row Validation (Real-time) - New Format
    if (data && Array.isArray(data) && data.length === 1) {
      console.log('🔍 Real-time validation for:', data[0].chapter_number)
      
      const rowData = data[0] // Single row payload

      const response = await jamai.table.addRow({
        table_type: 'action',
        table_id: tableId,
        data: [rowData],
        reindex: false
      })

      // Extract HTML from formal_content
      let generatedHTML = ''
      if (response.rows && response.rows.length > 0) {
        const columns = response.rows[0].columns
        if (columns.formal_content) {
          const content = columns.formal_content.choices?.[0]?.message?.content
          generatedHTML = typeof content === 'string' ? content : ''
        }
      }

      console.log('✅ Validation complete, HTML length:', generatedHTML.length)

      // Return in format expected by frontend
      return NextResponse.json({
        results: [
          {
            formal_content: generatedHTML
          }
        ],
        html_content: generatedHTML,
        status: 'success'
      })
    }

    // CASE 2: Legacy Batch Generation (not used with new real-time flow)
    // This is kept for backwards compatibility only
    if (!responses) {
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      )
    }

    console.log('🚀 Legacy batch generation')
    
    // Just return empty response - this flow is deprecated
    return NextResponse.json({
      error: 'Batch generation is deprecated. Use real-time validation instead.',
      status: 400
    }, { status: 400 })

  } catch (error) {
    console.error('❌ IHCS generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate IHCS manual', details: (error as Error).message },
      { status: 500 }
    )
  }
}
