/**
 * Test Pre-Audit JamAI Base Connection
 * Run with: node scripts/test-pre-audit-connection.js
 */

require('dotenv').config({ path: '.env.local' })

const JAMAI_BASE_URL = 'https://api.jamaibase.com/v1'

async function testConnection() {
  console.log('🔍 Testing Pre-Audit JamAI Base Connection...\n')

  const projectId = process.env.NEXT_PUBLIC_PRE_AUDIT_PROJECT_ID
  const apiKey = process.env.PRE_AUDIT_API_KEY

  // Check environment variables
  console.log('📋 Environment Variables:')
  console.log(`   NEXT_PUBLIC_PRE_AUDIT_PROJECT_ID: ${projectId ? '✅ Set' : '❌ Missing'}`)
  console.log(`   PRE_AUDIT_API_KEY: ${apiKey ? '✅ Set (${apiKey.substring(0, 15)}...)' : '❌ Missing'}\n`)

  if (!projectId || !apiKey) {
    console.error('❌ Missing credentials! Please check your .env.local file.\n')
    process.exit(1)
  }

  // Test 1: Check if Action Table exists
  console.log('📊 Test 1: Checking if Pre_Audit_System Action Table exists...')
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
      console.log('✅ Action Table found!')
      console.log(`   Table ID: ${data.id || 'Pre_Audit_System'}`)
      console.log(`   Columns: ${data.cols ? data.cols.map(c => c.id).join(', ') : 'N/A'}\n`)
    } else {
      const error = await response.text()
      console.error('❌ Action Table not found or inaccessible!')
      console.error(`   Status: ${response.status}`)
      console.error(`   Error: ${error}\n`)
      console.log('💡 Please create the Action Table "Pre_Audit_System" in your JamAI Base project.\n')
      return false
    }
  } catch (error) {
    console.error('❌ Connection failed:', error.message, '\n')
    return false
  }

  // Test 2: Test file upload endpoint
  console.log('📤 Test 2: Testing file upload endpoint accessibility...')
  try {
    // We won't actually upload a file, just check if the endpoint is accessible
    const response = await fetch(
      `${JAMAI_BASE_URL}/projects/${projectId}/files/upload`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: new FormData(), // Empty form
      }
    )

    // Even with empty form, if we get 400 (bad request) instead of 401/403, auth is working
    if (response.status === 400 || response.status === 200) {
      console.log('✅ File upload endpoint accessible (auth working)\n')
    } else if (response.status === 401 || response.status === 403) {
      console.error('❌ Authentication failed! Check your PRE_AUDIT_API_KEY.\n')
      return false
    } else {
      console.log(`⚠️ Unexpected response: ${response.status}\n`)
    }
  } catch (error) {
    console.error('❌ File upload test failed:', error.message, '\n')
    return false
  }

  console.log('✅ All connection tests passed!')
  console.log('🎉 Pre-Audit is ready to use!\n')
  return true
}

testConnection()
  .then(success => {
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error('❌ Test failed:', error)
    process.exit(1)
  })
