import { NextRequest, NextResponse } from 'next/server'
import JamAI from 'jamaibase'

/**
 * GET /api/pre-audit/requirements
 * 
 * Fetches document requirements from JamAI Base Knowledge Table
 * This allows requirements to be managed dynamically instead of hardcoding
 * 
 * Optional Feature: Uncomment and configure if you want requirements from JamAI Base
 * 
 * Requirements:
 * 1. Create a Knowledge Table named "Pre_Audit_Requirements" with columns:
 *    - document_type (Text): menu_list, ingredient_list, etc.
 *    - label_en (Text): English label
 *    - label_bm (Text): Malay label
 *    - is_special (Boolean): Whether it's a special document type
 *    - display_order (Number): Order to display
 *    - is_active (Boolean): Whether requirement is currently active
 */
export async function GET(request: NextRequest) {
  try {
    const jamai = new JamAI({
      token: process.env.PRE_AUDIT_API_KEY || '',
      projectId: process.env.NEXT_PUBLIC_PRE_AUDIT_PROJECT_ID || '',
      baseURL: 'https://api.jamaibase.com',
    })

    // Fetch rows from Knowledge Table
    const response = await jamai.table.listRows({
      table_type: 'knowledge',
      table_id: 'Pre_Audit_Requirements',
    })

    if (!response.rows || response.rows.length === 0) {
      return NextResponse.json(
        { error: 'No requirements found' },
        { status: 404 }
      )
    }

    // Transform rows into frontend format
    const requirements = response.rows
      .filter((row: any) => row.is_active !== false)
      .map((row: any) => ({
        type: row.document_type,
        label_en: row.label_en,
        label_bm: row.label_bm,
        isSpecial: row.is_special === true,
        displayOrder: row.display_order || 0
      }))
      .sort((a: any, b: any) => a.displayOrder - b.displayOrder)

    return NextResponse.json({
      success: true,
      requirements
    })

  } catch (error) {
    console.error('❌ [Pre-Audit Requirements API] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch requirements',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
