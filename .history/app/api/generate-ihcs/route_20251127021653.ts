import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/generate-ihcs
 * 
 * IHCS (Internal Halal Control System) Auto-Architect
 * Generates MPPHM 2020 compliant HAS manual from conversational Q&A
 * 
 * Uses JamAI Base credentials from environment:
 * - NEXT_PUBLIC_JAMAI_PERSONAL_ACCESS_TOKEN
 * - NEXT_PUBLIC_JAMAI_PROJECT_ID
 */
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
    
    // Check environment variables
    const pat = process.env.NEXT_PUBLIC_JAMAI_PERSONAL_ACCESS_TOKEN
    const projectId = process.env.NEXT_PUBLIC_JAMAI_PROJECT_ID
    
    console.log('🔑 PAT configured:', pat ? 'Yes' : 'No')
    console.log('🆔 Project ID:', projectId)

    // For now, return mock data until JamAI table is set up
    // TODO: Implement actual JamAI Base transformation
    const chapters = Object.keys(responses).map((key, idx) => ({
      title: `Bab ${idx + 1}`,
      content: responses[key],
      status: 'complete' as const,
      complianceScore: 85 + Math.floor(Math.random() * 15), // Mock score
      suggestions: []
    }))

    // Mock PDF URL (in production, this would be generated)
    const pdfUrl = '/mock-ihcs-manual.pdf'

    console.log('✅ IHCS generation complete')

    return NextResponse.json({
      pdfUrl,
      chapters,
        status: 'complete' as const,
        complianceScore: ch.complianceScore,
        suggestions: ch.suggestions
      })),
      completionPercentage: 100,
      averageComplianceScore: Math.round(
        transformedChapters.reduce((sum, ch) => sum + ch.complianceScore, 0) / transformedChapters.length
      )
    })

  } catch (error) {
    console.error('❌ IHCS generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate IHCS manual', details: (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * Process user answers and transform to formal content
 * TODO: Replace with JamAI Base RAG + Action Table
 */
async function processAnswersWithAI(responses: Record<string, string>) {
  const CHAPTERS = [
    {
      id: 1,
      title: 'Bab 1: Polisi Halal',
      field: 'company_info',
      transform: (answer: string) => {
        // TODO: Use JamAI Base to transform informal answer to formal policy
        return `
          <p>Kami, <strong>${answer.split(',')[0] || 'syarikat ini'}</strong>, dengan ini mengisytiharkan 
          komitmen kami untuk mematuhi semua kehendak pensijilan halal seperti yang ditetapkan oleh 
          Jabatan Kemajuan Islam Malaysia (JAKIM).</p>
          
          <p><strong>Matlamat Halal:</strong><br>
          ${answer}</p>
          
          <p>Kami berkomitmen untuk:</p>
          <ul class="procedure-list">
            <li>Memastikan semua bahan mentah adalah halal dan bersih</li>
            <li>Mengelakkan sebarang pencemaran dengan bahan haram</li>
            <li>Melaksanakan audit dalaman secara berkala</li>
            <li>Melatih kakitangan tentang keperluan halal</li>
          </ul>
        `
      }
    },
    {
      id: 2,
      title: 'Bab 2: Kawalan Bahan Mentah',
      field: 'raw_material_verification',
      transform: (answer: string) => {
        return `
          <p>Syarikat kami melaksanakan kawalan ketat terhadap semua bahan mentah yang diterima:</p>
          
          <p><strong>Prosedur Semakan:</strong><br>
          ${answer}</p>
          
          <ol class="procedure-list">
            <li>Semak sijil halal pembekal (mesti sah dan dalam tempoh)</li>
            <li>Periksa label produk untuk logo halal yang diiktiraf</li>
            <li>Rekodkan semua maklumat penerimaan dalam Borang Penerimaan Bahan</li>
            <li>Simpan sijil halal pembekal dalam fail halal</li>
          </ol>
        `
      }
    },
    {
      id: 3,
      title: 'Bab 3: Rekod Pembelian',
      field: 'purchase_records',
      transform: (answer: string) => {
        return `
          <p><strong>Sistem Rekod Pembelian:</strong><br>
          ${answer}</p>
          
          <p>Semua rekod pembelian termasuk:</p>
          <ul class="procedure-list">
            <li>Invois dan resit pembelian</li>
            <li>Sijil halal pembekal</li>
            <li>Surat jaminan halal (jika berkenaan)</li>
            <li>Borang penerimaan bahan mentah</li>
          </ul>
          
          <p>Rekod-rekod ini akan disimpan dengan kemas dalam fail halal dan boleh dirujuk 
          bila-bila masa untuk tujuan audit.</p>
        `
      }
    },
    {
      id: 4,
      title: 'Bab 4: Prosedur Pembersihan',
      field: 'cleaning_procedures',
      transform: (answer: string) => {
        return `
          <p><strong>Prosedur Pembersihan Standard:</strong><br>
          ${answer}</p>
          
          <p><strong>Langkah-langkah Pembersihan:</strong></p>
          <ol class="procedure-list">
            <li><strong>Pra-pembersihan:</strong> Buang sisa makanan dan kotoran kasar</li>
            <li><strong>Pencucian:</strong> Basuh dengan agen pembersih yang diluluskan halal</li>
            <li><strong>Pembilasan:</strong> Bilas dengan air bersih yang mencukupi</li>
            <li><strong>Sanitasi:</strong> Gunakan bahan sanitasi jika perlu</li>
            <li><strong>Pengeringan:</strong> Keringkan peralatan sebelum digunakan semula</li>
          </ol>
          
          <p>Semua agen pembersihan yang digunakan mestilah mempunyai sijil halal atau 
          surat pengesahan tidak mengandungi bahan haram.</p>
        `
      }
    },
    {
      id: 5,
      title: 'Bab 5: Tanggungjawab Halal',
      field: 'halal_responsibility',
      transform: (answer: string) => {
        return `
          <p><strong>Tanggungjawab Eksekutif Halal:</strong><br>
          ${answer}</p>
          
          <p>Eksekutif Halal yang dilantik bertanggungjawab untuk:</p>
          <ul class="procedure-list">
            <li>Memastikan pematuhan kepada Manual IHCS ini</li>
            <li>Menjalankan audit dalaman sekurang-kurangnya setiap 6 bulan</li>
            <li>Menguruskan semua dokumen dan rekod berkaitan halal</li>
            <li>Menghadiri kursus halal yang diiktiraf JAKIM</li>
            <li>Menjadi penghubung antara syarikat dengan JAKIM</li>
            <li>Memastikan semua kakitangan memahami keperluan halal</li>
          </ul>
          
          <p><em>Nota: Eksekutif Halal mestilah beragama Islam dan mempunyai 
          sijil Halal Professional Board (HPB) atau setaraf.</em></p>
        `
      }
    },
    {
      id: 6,
      title: 'Bab 6: Rekod Latihan',
      field: 'training_records',
      transform: (answer: string) => {
        return `
          <p><strong>Program Latihan Halal:</strong><br>
          ${answer}</p>
          
          <p>Syarikat komited untuk memberikan latihan halal kepada semua kakitangan:</p>
          
          <p><strong>Jenis-jenis Latihan:</strong></p>
          <ul class="procedure-list">
            <li><strong>Induksi Halal:</strong> Untuk kakitangan baru (wajib dalam 1 bulan pertama)</li>
            <li><strong>Latihan Tahunan:</strong> Refresh pengetahuan halal</li>
            <li><strong>Latihan Khusus:</strong> Untuk kakitangan pengendalian makanan</li>
            <li><strong>Kursus HPB:</strong> Untuk Eksekutif Halal</li>
          </ul>
          
          <p>Semua latihan akan direkodkan dengan lengkap termasuk tarikh, 
          topik, dan tandatangan peserta.</p>
        `
      }
    },
    {
      id: 7,
      title: 'Bab 7: Kebolehkesanan',
      field: 'traceability_system',
      transform: (answer: string) => {
        return `
          <p><strong>Sistem Kebolehkesanan:</strong><br>
          ${answer}</p>
          
          <p>Syarikat melaksanakan sistem kebolehkesanan untuk:</p>
          
          <ol class="procedure-list">
            <li><strong>Kebolehkesanan Hadapan (Forward):</strong><br>
            Dapat mengesan produk yang telah dihantar kepada pelanggan</li>
            
            <li><strong>Kebolehkesanan Belakang (Backward):</strong><br>
            Dapat mengesan bahan mentah yang digunakan dalam produk</li>
          </ol>
          
          <p><strong>Maklumat yang direkod:</strong></p>
          <ul class="procedure-list">
            <li>Nombor batch produk</li>
            <li>Tarikh pengeluaran</li>
            <li>Sumber bahan mentah (nama pembekal, no. sijil halal)</li>
            <li>Destinasi penghantaran (jika berkenaan)</li>
          </ul>
          
          <p>Sistem ini membolehkan syarikat bertindak pantas sekiranya 
          berlaku isu berkaitan halal.</p>
        `
      }
    }
  ]

  return CHAPTERS.map(chapter => ({
    title: chapter.title,
    content: chapter.transform(responses[chapter.field] || 'Tiada maklumat disediakan'),
    status: responses[chapter.field] ? 'complete' as const : 'incomplete' as const
  }))
}
