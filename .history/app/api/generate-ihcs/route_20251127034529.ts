import { NextRequest, NextResponse } from 'next/server'
import JamAI from 'jamaibase'

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    console.log('📥 Request body received:', JSON.stringify(body, null, 2))
    
    const { data, responses } = body

    // Get IHCS-specific credentials from environment
    const token = process.env.NEXT_PUBLIC_JAMAI_PERSONAL_ACCESS_TOKEN
    const projectId = process.env.NEXT_PUBLIC_JAMAI_PROJECT_ID
    const baseURL = process.env.NEXT_PUBLIC_JAMAI_BASE_URL || 'https://api.jamaibase.com'

    console.log('🔑 Credentials check - Token:', token ? '✓ Configured' : '✗ Missing')
    console.log('🆔 Credentials check - Project ID:', projectId ? '✓ Configured' : '✗ Missing')

    if (!token || !projectId) {
      console.error('❌ JamAI credentials not configured')
      return NextResponse.json(
        { 
          error: 'JamAI credentials not configured',
          details: 'Please set NEXT_PUBLIC_JAMAI_PERSONAL_ACCESS_TOKEN and NEXT_PUBLIC_JAMAI_PROJECT_ID in .env.local'
        },
        { status: 500 }
      )
    }

    // Initialize JamAI client
    console.log('🔌 Initializing JamAI client...')
    const jamai = new JamAI({ token, projectId, baseURL })
    const tableId = 'ihcs_content_transformer'

    // CASE 1: Single Row Validation (Real-time) - New Format
    if (data && Array.isArray(data) && data.length === 1) {
      console.log('🔍 Real-time validation mode activated')
      console.log('📋 Chapter:', data[0].chapter_number)
      console.log('🏢 Company:', data[0].company_name)
      
      const rowData = data[0] // Single row payload

      try {
        console.log('📤 Sending to JamAI table:', tableId)
        console.log('📝 Row data:', JSON.stringify(rowData, null, 2))

        const response = await jamai.table.addRow({
          table_type: 'action',
          table_id: tableId,
          data: [rowData],
          reindex: false
        })

        console.log('📨 JamAI response received')
        console.log('Response structure:', JSON.stringify(response, null, 2))

        // Extract HTML from formal_content with detailed logging
        let generatedHTML = ''
        
        if (!response.rows || response.rows.length === 0) {
          console.error('❌ No rows in response')
          throw new Error('No rows returned from JamAI')
        }

        const columns = response.rows[0].columns
        console.log('📊 Columns available:', Object.keys(columns || {}))

        if (columns.formal_content) {
          console.log('✓ formal_content column found')
          const content = columns.formal_content.choices?.[0]?.message?.content
          generatedHTML = typeof content === 'string' ? content : ''
          console.log('📄 Generated HTML length:', generatedHTML.length)
        } else {
          console.error('❌ formal_content column not found in response')
          console.error('Available columns:', Object.keys(columns))
          throw new Error('formal_content column not found in table response')
        }

        if (!generatedHTML) {
          console.warn('⚠️ Generated HTML is empty')
        }

        console.log('✅ Validation complete successfully')

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

      } catch (jamaiError) {
        console.error('❌ JamAI API Error:', jamaiError)
        console.error('Error details:', {
          message: (jamaiError as Error).message,
          stack: (jamaiError as Error).stack
        })
        
        return NextResponse.json(
          { 
            error: 'JamAI API call failed',
            details: (jamaiError as Error).message,
            suggestion: 'Check if table "ihcs_content_transformer" exists and has correct columns'
          },
          { status: 500 }
        )
      }
    }

    // CASE 2: Invalid request format
    console.warn('⚠️ Invalid request format')
    console.log('Data:', data)
    console.log('Responses:', responses)
    
    return NextResponse.json(
      { 
        error: 'Invalid request format',
        details: 'Expected { data: [{ company_name, business_type, user_answer, chapter_number, language }] }',
        received: { hasData: !!data, hasResponses: !!responses }
      },
      { status: 400 }
    )

  } catch (error) {
    console.error('❌❌❌ CRITICAL SERVER ERROR ❌❌❌')
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error)
    console.error('Error message:', (error as Error).message)
    console.error('Error stack:', (error as Error).stack)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: (error as Error).message,
        type: error instanceof Error ? error.constructor.name : 'Unknown',
        stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
      },
      { status: 500 }
    )
  }
}
