/**
 * Comprehensive Pre-Audit Configuration Verification
 * Checks all three features use their correct credentials
 */

require('dotenv').config({ path: '.env.local' })

console.log('🔍 Verifying All Feature Configurations...\n')

// Check all environment variables
console.log('📋 Environment Variables Status:\n')

console.log('1️⃣  Ingredient Guard:')
console.log(`   JAMAI_API_KEY: ${process.env.JAMAI_API_KEY ? '✅ Set' : '❌ Missing'}`)
console.log(`   Project: Ingredient scanning\n`)

console.log('2️⃣  IHCS Auto-Architect:')
console.log(`   NEXT_PUBLIC_JAMAI_PERSONAL_ACCESS_TOKEN: ${process.env.NEXT_PUBLIC_JAMAI_PERSONAL_ACCESS_TOKEN ? '✅ Set' : '❌ Missing'}`)
console.log(`   NEXT_PUBLIC_JAMAI_PROJECT_ID: ${process.env.NEXT_PUBLIC_JAMAI_PROJECT_ID || '❌ Missing'}`)
console.log(`   Project ID: ${process.env.NEXT_PUBLIC_JAMAI_PROJECT_ID}\n`)

console.log('3️⃣  Pre-Audit Readiness:')
console.log(`   NEXT_PUBLIC_PRE_AUDIT_PROJECT_ID: ${process.env.NEXT_PUBLIC_PRE_AUDIT_PROJECT_ID || '❌ Missing'}`)
console.log(`   PRE_AUDIT_API_KEY: ${process.env.PRE_AUDIT_API_KEY ? '✅ Set' : '❌ Missing'}`)
console.log(`   Project ID: ${process.env.NEXT_PUBLIC_PRE_AUDIT_PROJECT_ID}\n`)

// Verify they're all different
const projects = {
  'IHCS Auto-Architect': process.env.NEXT_PUBLIC_JAMAI_PROJECT_ID,
  'Pre-Audit': process.env.NEXT_PUBLIC_PRE_AUDIT_PROJECT_ID
}

console.log('🔐 Project Separation Check:')
if (projects['IHCS Auto-Architect'] === projects['Pre-Audit']) {
  console.log('   ⚠️  WARNING: IHCS and Pre-Audit using SAME project ID!')
  console.log('   This may cause conflicts if they have different table structures.\n')
} else {
  console.log('   ✅ IHCS and Pre-Audit use DIFFERENT project IDs (correct!)\n')
}

// Test Pre-Audit connection
async function testPreAuditConnection() {
  const projectId = process.env.NEXT_PUBLIC_PRE_AUDIT_PROJECT_ID
  const apiKey = process.env.PRE_AUDIT_API_KEY

  if (!projectId || !apiKey) {
    console.log('❌ Pre-Audit credentials missing!\n')
    return false
  }

  console.log('🧪 Testing Pre-Audit Connection...')
  
  try {
    const response = await fetch(
      `https://api.jamaibase.com/v1/gen_tables/action/Pre_Audit_System`,
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
      console.log('✅ Pre-Audit Action Table found!')
      console.log(`   Table: Pre_Audit_System`)
      console.log(`   Project: ${projectId}`)
      
      if (data.cols) {
        console.log(`   Columns: ${data.cols.map(c => c.id).join(', ')}`)
      }
      console.log('\n🎉 Pre-Audit is correctly configured and ready to use!\n')
      return true
    } else {
      console.log('❌ Pre-Audit Action Table not found or not accessible')
      console.log(`   Status: ${response.status}`)
      const error = await response.text()
      console.log(`   Error: ${error}\n`)
      return false
    }
  } catch (error) {
    console.log('❌ Connection test failed:', error.message, '\n')
    return false
  }
}

testPreAuditConnection()
