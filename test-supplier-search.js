/**
 * Test script for Alibaba Supplier Search functionality
 * Tests both the scraper service and API endpoint
 */

const axios = require('axios')

// Test configuration
const TEST_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  testUserId: '29a94bda-39e2-4b57-8cc0-cd289274da5a', // Test user ID
  testQueries: [
    'bluetooth speaker',
    'phone case',
    'water bottle'
  ]
}

console.log('🧪 Starting Alibaba Supplier Search Tests')
console.log('=' .repeat(50))

async function testSupplierSearch() {
  try {
    const testQuery = TEST_CONFIG.testQueries[0]
    console.log(`\n📋 Testing supplier search for: "${testQuery}"`)
    
    const requestBody = {
      userId: TEST_CONFIG.testUserId,
      searchQuery: testQuery,
      options: {
        maxResults: 20,
        goldSupplierOnly: false,
        tradeAssuranceOnly: false,
        minYearsInBusiness: 2
      }
    }

    console.log('📤 Sending request to API...')
    console.log('Request body:', JSON.stringify(requestBody, null, 2))

    const startTime = Date.now()
    
    const response = await axios.post(
      `${TEST_CONFIG.baseUrl}/api/suppliers/search`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 60000 // 1 minute timeout
      }
    )

    const duration = Date.now() - startTime
    console.log(`⏱️  Request completed in ${duration}ms`)

    if (response.data.success) {
      console.log('✅ API request successful!')
      console.log(`📊 Results:`)
      console.log(`  - Suppliers found: ${response.data.data.suppliers?.length || 0}`)
      console.log(`  - Total found: ${response.data.data.totalFound || 0}`)
      console.log(`  - Session ID: ${response.data.data.sessionId}`)
      console.log(`  - Search duration: ${response.data.data.searchDurationMs}ms`)
      
      if (response.data.data.suppliers?.length > 0) {
        console.log('\n🏢 Sample supplier data:')
        const sampleSupplier = response.data.data.suppliers[0]
        console.log(`  - Company: ${sampleSupplier.companyName}`)
        console.log(`  - Location: ${sampleSupplier.location.city} ${sampleSupplier.location.country}`)
        console.log(`  - Years in business: ${sampleSupplier.yearsInBusiness}`)
        console.log(`  - Business type: ${sampleSupplier.businessType}`)
        console.log(`  - Gold supplier: ${sampleSupplier.trust.goldSupplier}`)
        console.log(`  - Trade assurance: ${sampleSupplier.metrics.tradeAssurance}`)
        console.log(`  - Quality score: ${sampleSupplier.qualityScore?.overall || 'N/A'}`)
      }

      if (response.data.data.qualityAnalysis) {
        console.log('\n🤖 AI Quality Analysis:')
        console.log(`  - Average score: ${response.data.data.qualityAnalysis.averageScore}`)
        console.log(`  - Key insights: ${response.data.data.qualityAnalysis.keyInsights?.length || 0}`)
        response.data.data.qualityAnalysis.keyInsights?.slice(0, 3).forEach((insight, i) => {
          console.log(`    ${i + 1}. ${insight}`)
        })
      }

      // Test session retrieval
      if (response.data.data.sessionId) {
        await testSessionRetrieval(response.data.data.sessionId)
      }

      return true
    } else {
      console.log('❌ API request failed:')
      console.log('Error:', response.data.error)
      return false
    }

  } catch (error) {
    console.log('❌ Test failed with error:')
    if (error.response) {
      console.log(`HTTP ${error.response.status}: ${error.response.statusText}`)
      console.log('Response data:', error.response.data)
    } else if (error.request) {
      console.log('No response received:', error.message)
    } else {
      console.log('Request error:', error.message)
    }
    return false
  }
}

async function testSessionRetrieval(sessionId) {
  try {
    console.log(`\n📥 Testing session retrieval for: ${sessionId}`)
    
    const response = await axios.get(
      `${TEST_CONFIG.baseUrl}/api/suppliers/search?userId=${TEST_CONFIG.testUserId}&sessionId=${sessionId}`,
      { timeout: 10000 }
    )

    if (response.data.success) {
      console.log('✅ Session retrieval successful!')
      console.log(`  - Status: ${response.data.data.status}`)
      console.log(`  - Suppliers: ${response.data.data.suppliers?.length || 0}`)
      console.log(`  - Search query: "${response.data.data.searchQuery}"`)
      return true
    } else {
      console.log('❌ Session retrieval failed:', response.data.error)
      return false
    }

  } catch (error) {
    console.log('❌ Session retrieval error:', error.message)
    return false
  }
}

async function testUserSessions() {
  try {
    console.log(`\n📋 Testing user sessions list`)
    
    const response = await axios.get(
      `${TEST_CONFIG.baseUrl}/api/suppliers/search?userId=${TEST_CONFIG.testUserId}`,
      { timeout: 10000 }
    )

    if (response.data.success) {
      console.log('✅ User sessions retrieval successful!')
      console.log(`  - Sessions found: ${response.data.data.sessions?.length || 0}`)
      
      if (response.data.data.sessions?.length > 0) {
        console.log('📋 Recent sessions:')
        response.data.data.sessions.slice(0, 3).forEach((session, i) => {
          console.log(`  ${i + 1}. "${session.search_query}" - ${session.status} (${new Date(session.created_at).toLocaleDateString()})`)
        })
      }
      return true
    } else {
      console.log('❌ User sessions retrieval failed:', response.data.error)
      return false
    }

  } catch (error) {
    console.log('❌ User sessions error:', error.message)
    return false
  }
}

async function testErrorHandling() {
  try {
    console.log(`\n🚫 Testing error handling`)
    
    // Test with invalid user ID
    const response = await axios.post(
      `${TEST_CONFIG.baseUrl}/api/suppliers/search`,
      {
        userId: '', // Invalid
        searchQuery: 'test product'
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
        validateStatus: () => true // Don't throw on 4xx/5xx
      }
    )

    if (response.status === 400 && !response.data.success) {
      console.log('✅ Error handling working correctly')
      console.log(`  - Status: ${response.status}`)
      console.log(`  - Error: ${response.data.error}`)
      return true
    } else {
      console.log('❌ Expected error handling failed')
      console.log(`  - Status: ${response.status}`)
      console.log(`  - Response: ${JSON.stringify(response.data)}`)
      return false
    }

  } catch (error) {
    console.log('❌ Error handling test failed:', error.message)
    return false
  }
}

async function runAllTests() {
  console.log(`🎯 Testing against: ${TEST_CONFIG.baseUrl}`)
  console.log(`👤 Test user ID: ${TEST_CONFIG.testUserId}`)
  
  const tests = [
    { name: 'Supplier Search', fn: testSupplierSearch },
    { name: 'User Sessions', fn: testUserSessions },
    { name: 'Error Handling', fn: testErrorHandling }
  ]

  let passed = 0
  let failed = 0

  for (const test of tests) {
    console.log(`\n${'='.repeat(20)} ${test.name} ${'='.repeat(20)}`)
    try {
      const result = await test.fn()
      if (result) {
        passed++
        console.log(`✅ ${test.name} PASSED`)
      } else {
        failed++
        console.log(`❌ ${test.name} FAILED`)
      }
    } catch (error) {
      failed++
      console.log(`❌ ${test.name} FAILED with exception:`, error.message)
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log('📊 TEST RESULTS')
  console.log('='.repeat(50))
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`📈 Success rate: ${Math.round((passed / (passed + failed)) * 100)}%`)

  if (failed === 0) {
    console.log('\n🎉 All tests passed! Supplier search functionality is working correctly.')
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.')
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n⏹️  Tests interrupted by user')
  process.exit(0)
})

process.on('uncaughtException', (error) => {
  console.log('\n❌ Uncaught exception:', error.message)
  process.exit(1)
})

// Run tests
runAllTests().catch(error => {
  console.error('\n💥 Test runner failed:', error.message)
  process.exit(1)
})