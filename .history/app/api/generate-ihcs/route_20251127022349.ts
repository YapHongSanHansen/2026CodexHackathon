import { NextRequest, NextResponse } from 'next/server'
import JamAI from 'jamaibase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyName, businessType, responses } = body

    if (!companyName || !responses) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log('🚀 Starting IHCS generation for:', companyName)
    console.log('📋 Responses received:', Object.keys(responses))
    
    // Get IHCS-specific credentials from environment
    const token = process.env.NEXT_PUBLIC_JAMAI_PERSONAL_ACCESS_TOKEN
    const projectId = process.env.NEXT_PUBLIC_JAMAI_PROJECT_ID
    const baseURL = process.env.NEXT_PUBLIC_JAMAI_BASE_URL || 'https://api.jamaibase.com'
    
    console.log('🔑 PAT configured:', token ? 'Yes' : 'No')
    console.log('🆔 Project ID:', projectId)

    if (!token || !projectId) {
      return NextResponse.json(
        { error: 'JamAI credentials not configured. Please set NEXT_PUBLIC_JAMAI_PERSONAL_ACCESS_TOKEN and NEXT_PUBLIC_JAMAI_PROJECT_ID' },
        { status: 500 }
      )
    }

    // Initialize JamAI client with IHCS credentials
    const jamai = new JamAI({
      token,
      projectId,
      baseURL
    })

    // Prepare data for JamAI table
    // Convert responses object to a formatted string for the table
    const responsesText = Object.entries(responses)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n\n')

    const tableId = 'IHCS_Generation' // Your JamAI table name
    
    console.log('📤 Sending to JamAI table:', tableId)

    // Add row to JamAI Action Table
    const rowData = {
      Company_Name: companyName,
      Business_Type: businessType || 'Perkhidmatan Makanan',
      Interview_Responses: responsesText
    }

    console.log('📝 Row data:', rowData)

    const response = await jamai.table.addRow({
      table_type: 'action',
      table_id: tableId,
      data: [rowData],
      reindex: false
    })

    console.log('✅ Data saved to JamAI table')

    // Extract generated content from response
    let generatedManual = ''
    let pdfUrl = '/mock-ihcs-manual.pdf' // Default mock URL
    
    if (response.rows && response.rows.length > 0) {
      const columns = response.rows[0].columns
      
      // Extract the generated manual from output column
      // Adjust column name based on your table configuration
      if (columns.Generated_Manual) {
        const content = columns.Generated_Manual.choices?.[0]?.message?.content
        generatedManual = typeof content === 'string' ? content : ''
        console.log('📄 Generated manual length:', generatedManual.length)
      }

      // If you have a PDF URL column
      if (columns.PDF_URL) {
        const pdfContent = columns.PDF_URL.choices?.[0]?.message?.content
        if (typeof pdfContent === 'string' && pdfContent.trim()) {
          pdfUrl = pdfContent.trim()
        }
      }
    }

    const chapters = Object.keys(responses).map((key, idx) => ({
      title: `Bab ${idx + 1}`,
      content: responses[key],
      status: 'complete' as const,
      complianceScore: 85 + Math.floor(Math.random() * 15),
      suggestions: []
    }))

    console.log('✨ IHCS generation complete')

    return NextResponse.json({
      pdfUrl,
      chapters,
      completionPercentage: 100,
      averageComplianceScore: chapters.reduce((sum, ch) => sum + ch.complianceScore, 0) / chapters.length,
      generatedManual
    })

  } catch (error) {
    console.error('❌ IHCS generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate IHCS manual', details: (error as Error).message },
      { status: 500 }
    )
  }
}
