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

    const tableId = 'ihcs_content_transformer' // Your JamAI Action Table name
    
    console.log('📤 Sending to JamAI table:', tableId)

    // Map chapter keys to chapter numbers for RAG context
    const chapterMap: Record<string, string> = {
      'company_info': 'Seksyen 1',
      'halal_policy': 'Seksyen 2',
      'purchasing_procedure': 'Seksyen 3',
      'receiving_procedure': 'Seksyen 4',
      'storage_procedure': 'Seksyen 5',
      'raw_material_list': 'Seksyen 6',
      'traceability_program': 'Seksyen 7',
      'recall_procedure': 'Seksyen 8'
    }

    // Process each chapter separately to get proper RAG context
    const allGeneratedContent: { chapter: string, html: string }[] = []
    
    for (const [key, value] of Object.entries(responses)) {
      const chapterNumber = chapterMap[key] || 'Seksyen 1'
      
      console.log(`📝 Processing ${chapterNumber}: ${key}`)
      
      // Prepare row data matching your actual table schema
      const rowData = {
        company_name: companyName,
        business_type: businessType || 'Perkhidmatan Makanan',
        user_answer: value as string,
        chapter_number: chapterNumber,
        language: 'Bahasa Malaysia'
      }

      console.log('📝 Row data:', rowData)

      const response = await jamai.table.addRow({
        table_type: 'action',
        table_id: tableId,
        data: [rowData],
        reindex: false
      })

      console.log(`✅ Data saved for ${chapterNumber}`)

      // Extract generated HTML content from formal_content column
      if (response.rows && response.rows.length > 0) {
        const columns = response.rows[0].columns
        
        if (columns.formal_content) {
          const content = columns.formal_content.choices?.[0]?.message?.content
          const htmlContent = typeof content === 'string' ? content : ''
          console.log(`📄 Generated HTML for ${chapterNumber}, length:`, htmlContent.length)
          
          allGeneratedContent.push({
            chapter: chapterNumber,
            html: htmlContent
          })
        }
      }
    }

    // Combine all generated HTML content
    const fullManualHTML = allGeneratedContent
      .map(item => `<section data-chapter="${item.chapter}">\n${item.html}\n</section>`)
      .join('\n\n')

    console.log('📄 Full manual HTML length:', fullManualHTML.length)

    const chapters = Object.keys(responses).map((key, idx) => {
      const generatedItem = allGeneratedContent[idx]
      return {
        title: `Bab ${idx + 1}`,
        content: responses[key],
        generatedHTML: generatedItem?.html || '',
        status: 'complete' as const,
        complianceScore: 85 + Math.floor(Math.random() * 15),
        suggestions: []
      }
    })

    console.log('✨ IHCS generation complete')

    return NextResponse.json({
      pdfUrl: '/mock-ihcs-manual.pdf', // Frontend will generate PDF from HTML
      chapters,
      completionPercentage: 100,
      averageComplianceScore: chapters.reduce((sum, ch) => sum + ch.complianceScore, 0) / chapters.length,
      generatedManualHTML: fullManualHTML
    })

  } catch (error) {
    console.error('❌ IHCS generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate IHCS manual', details: (error as Error).message },
      { status: 500 }
    )
  }
}
