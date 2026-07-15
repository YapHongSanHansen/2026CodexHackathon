/**
 * Quick Action Table verification
 * This will check if the Pre_Audit_System table exists and show its structure
 */

const JAMAI_BASE_URL = 'https://api.jamaibase.com/v1'

// Read from .env.local
const projectId = 'proj_79d48d191ec444bee0aaba0f'
const apiKey = 'jamai_pat_292cff181381e106f6490cb0f1e6d826efd144f7dbcf57f0'

async function verifyTable() {
  console.log('🔍 Verifying Pre_Audit_System Action Table...\n')

  try {
    const response = await fetch(
      `${JAMAI_BASE_URL}/gen_tables/action/Pre_Audit_System`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (response.ok) {
      const data = await response.json()
      console.log('✅ SUCCESS! Action Table found and accessible!\n')
      console.log('📊 Table Details:')
      console.log(`   Table ID: ${data.id || 'Pre_Audit_System'}`)
      
      if (data.cols) {
        console.log('\n   Columns:')
        data.cols.forEach(col => {
          console.log(`      - ${col.id} (${col.dtype || col.type || 'unknown type'})`)
        })
      }
      
      console.log('\n🎉 Pre-Audit integration is ready to use!')
      console.log('   You can now test uploading documents at: http://localhost:3001/pre-audit\n')
      return true
    } else {
      const error = await response.text()
      console.error('❌ Table not found!')
      console.error(`   Status: ${response.status}`)
      console.error(`   Error: ${error}\n`)
      return false
    }
  } catch (error) {
    console.error('❌ Connection failed:', error.message)
    return false
  }
}

verifyTable()
