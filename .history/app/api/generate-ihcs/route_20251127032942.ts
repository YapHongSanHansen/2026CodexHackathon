import { NextRequest, NextResponse } from 'next/server'
import JamAI from 'jamaibase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyName, businessType, responses, singleAnswer } = body

    // Check if this is a single answer validation or full generation
    const isSingleValidation = !!singleAnswer

    if (!companyName) {
      return NextResponse.json(
        { error: 'Missing company name' },
        { status: 400 }
      )
    }

    if (!isSingleValidation && !responses) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

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

    // CASE 1: Single Answer Validation (Real-time)
    if (isSingleValidation) {
      console.log('🔍 Real-time validation for:', singleAnswer.field)
      
      const rowData = {
        company_name: companyName,
        business_type: businessType || 'Perkhidmatan Makanan',
        user_answer: singleAnswer.value,
        chapter_number: singleAnswer.chapterNumber,
        language: 'Bahasa Malaysia'
      }

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

      return NextResponse.json({
        success: true,
        generatedHTML,
        field: singleAnswer.field
      })
    }

    // CASE 2: Full Batch Generation (Legacy support, not used with new flow)
    console.log('🚀 Batch generation for:', companyName)
    
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

    const allGeneratedContent: { chapter: string, html: string }[] = []
    
    for (const [key, value] of Object.entries(responses)) {
      const chapterNumber = chapterMap[key] || 'Seksyen 1'
      
      const rowData = {
        company_name: companyName,
        business_type: businessType || 'Perkhidmatan Makanan',
        user_answer: value as string,
        chapter_number: chapterNumber,
        language: 'Bahasa Malaysia'
      }

      const response = await jamai.table.addRow({
        table_type: 'action',
        table_id: tableId,
        data: [rowData],
        reindex: false
      })

      if (response.rows && response.rows.length > 0) {
        const columns = response.rows[0].columns
        if (columns.formal_content) {
          const content = columns.formal_content.choices?.[0]?.message?.content
          const htmlContent = typeof content === 'string' ? content : ''
          allGeneratedContent.push({ chapter: chapterNumber, html: htmlContent })
        }
      }
    }

    const fullManualHTML = allGeneratedContent
      .map(item => `<section data-chapter="${item.chapter}">\n${item.html}\n</section>`)
      .join('\n\n')

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
