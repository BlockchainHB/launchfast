/**
 * Test script for Streaming Alibaba Supplier Search functionality
 * Tests the new streaming endpoint for real-time progress updates
 */

const axios = require('axios')

// Test configuration
const TEST_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  testUserId: '29a94bda-39e2-4b57-8cc0-cd289274da5a', // Test user ID
  testQuery: 'bluetooth speaker'
}

console.log('🌊 Starting Streaming Alibaba Supplier Search Test')
console.log('=' .repeat(60))

async function testStreamingSupplierSearch() {
  try {
    console.log(`\n📋 Testing streaming supplier search for: "${TEST_CONFIG.testQuery}"`)
    
    const requestBody = {
      userId: TEST_CONFIG.testUserId,
      searchQuery: TEST_CONFIG.testQuery,
      options: {
        maxResults: 15,
        goldSupplierOnly: false,
        tradeAssuranceOnly: false,
        minYearsInBusiness: 2
      }
    }

    console.log('📤 Sending streaming request...')
    console.log('Request body:', JSON.stringify(requestBody, null, 2))

    const startTime = Date.now()
    let sessionId = null
    let finalData = null
    let eventCount = 0
    
    // Make streaming request
    const response = await axios.post(
      `${TEST_CONFIG.baseUrl}/api/suppliers/search/stream`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        responseType: 'stream',
        timeout: 120000 // 2 minute timeout for full process
      }
    )

    console.log(`📡 Stream response status: ${response.status}`)
    console.log('🌊 Listening to streaming events...\n')

    // Process streaming events
    return new Promise((resolve, reject) => {
      let buffer = ''
      
      response.data.on('data', (chunk) => {
        buffer += chunk.toString()
        
        // Process complete events (ending with \n\n)
        const events = buffer.split('\n\n')
        buffer = events.pop() // Keep incomplete event in buffer
        
        events.forEach(eventStr => {
          if (eventStr.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(eventStr.substring(6))
              eventCount++
              
              const timestamp = new Date(eventData.timestamp).toLocaleTimeString()
              console.log(`[${timestamp}] ${eventData.phase.toUpperCase()}: ${eventData.message} (${eventData.progress}%)`)
              
              // Track session ID
              if (eventData.data?.sessionId) {
                sessionId = eventData.data.sessionId
              }
              
              // Show additional data for key phases
              if (eventData.data?.suppliersFound) {
                console.log(`   └─ Suppliers found: ${eventData.data.suppliersFound}`)
              }
              if (eventData.data?.currentSupplier) {
                console.log(`   └─ Processing: ${eventData.data.currentSupplier}`)
              }
              if (eventData.data?.totalProcessed) {
                console.log(`   └─ Total processed: ${eventData.data.totalProcessed}`)
              }
              
              // Capture final data
              if (eventData.phase === 'complete') {
                finalData = eventData.data
                const duration = Date.now() - startTime
                console.log(`\n✅ Stream completed in ${duration}ms`)
                console.log(`📊 Final Results:`)
                console.log(`  - Session ID: ${finalData.sessionId}`)
                console.log(`  - Suppliers found: ${finalData.suppliers?.length || 0}`)
                console.log(`  - Total processed: ${finalData.totalFound}`)
                console.log(`  - Search duration: ${finalData.searchDurationMs}ms`)
                console.log(`  - Average quality score: ${finalData.qualityAnalysis?.averageScore || 'N/A'}`)
                
                if (finalData.suppliers?.length > 0) {
                  console.log(`\n🏢 Sample supplier:`)
                  const sample = finalData.suppliers[0]
                  console.log(`  - Company: ${sample.companyName}`)
                  console.log(`  - Location: ${sample.location.city || 'N/A'} ${sample.location.country}`)
                  console.log(`  - Gold Supplier: ${sample.trust.goldSupplier}`)
                  console.log(`  - Trade Assurance: ${sample.metrics.tradeAssurance}`)
                  console.log(`  - Quality Score: ${sample.qualityScore?.overall || 'N/A'}`)
                }
                
                resolve({ success: true, sessionId, finalData, eventCount })
              } else if (eventData.phase === 'error') {
                console.log(`\n❌ Stream error: ${eventData.message}`)
                reject(new Error(eventData.message))
              }
              
            } catch (parseError) {
              console.log('⚠️  Failed to parse event:', eventStr.substring(0, 100))
            }
          }
        })
      })
      
      response.data.on('end', () => {
        if (!finalData) {
          reject(new Error('Stream ended without completion event'))
        }
      })
      
      response.data.on('error', (error) => {
        console.log('❌ Stream error:', error.message)
        reject(error)
      })
      
      // Timeout fallback
      setTimeout(() => {
        reject(new Error('Stream timeout - no completion after 2 minutes'))
      }, 120000)
    })

  } catch (error) {
    console.log('❌ Streaming test failed with error:')
    if (error.response) {
      console.log(`HTTP ${error.response.status}: ${error.response.statusText}`)
      if (error.response.data) {
        console.log('Response data:', error.response.data.toString())
      }
    } else if (error.request) {
      console.log('No response received:', error.message)
    } else {
      console.log('Request error:', error.message)
    }
    return { success: false, error: error.message }
  }
}

async function testSessionRetrieval(sessionId) {
  try {
    console.log(`\n📥 Testing session retrieval for streaming session: ${sessionId}`)
    
    const response = await axios.get(
      `${TEST_CONFIG.baseUrl}/api/suppliers/search?userId=${TEST_CONFIG.testUserId}&sessionId=${sessionId}`,
      { timeout: 10000 }
    )

    if (response.data.success) {
      console.log('✅ Session retrieval successful!')
      console.log(`  - Status: ${response.data.data.status}`)
      console.log(`  - Suppliers: ${response.data.data.suppliers?.length || 0}`)
      console.log(`  - Search query: "${response.data.data.searchQuery}"`)
      console.log(`  - Quality analysis insights: ${response.data.data.qualityAnalysis?.keyInsights?.length || 0}`)
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

async function runStreamingTest() {
  console.log(`🎯 Testing against: ${TEST_CONFIG.baseUrl}`)
  console.log(`👤 Test user ID: ${TEST_CONFIG.testUserId}`)
  console.log(`🔍 Test query: "${TEST_CONFIG.testQuery}"`)
  
  try {
    // Test streaming search
    console.log(`\n${'='.repeat(30)} STREAMING SEARCH ${'='.repeat(30)}`)
    const streamResult = await testStreamingSupplierSearch()
    
    if (streamResult.success) {
      console.log(`\n✅ STREAMING SEARCH PASSED`)
      console.log(`   - Events received: ${streamResult.eventCount}`)
      console.log(`   - Final suppliers: ${streamResult.finalData?.suppliers?.length || 0}`)
      
      // Test session retrieval if we have a session ID
      if (streamResult.sessionId) {
        console.log(`\n${'='.repeat(30)} SESSION RETRIEVAL ${'='.repeat(30)}`)
        const retrievalResult = await testSessionRetrieval(streamResult.sessionId)
        
        if (retrievalResult) {
          console.log(`\n✅ SESSION RETRIEVAL PASSED`)
        } else {
          console.log(`\n❌ SESSION RETRIEVAL FAILED`)
        }
      }
      
    } else {
      console.log(`\n❌ STREAMING SEARCH FAILED`)
    }
    
  } catch (error) {
    console.log(`\n💥 Test runner failed:`, error.message)
  }
  
  console.log(`\n${'='.repeat(80)}`)
  console.log('🏁 Streaming supplier search test completed!')
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n⏹️  Test interrupted by user')
  process.exit(0)
})

process.on('uncaughtException', (error) => {
  console.log('\n❌ Uncaught exception:', error.message)
  process.exit(1)
})

// Run the streaming test
runStreamingTest().catch(error => {
  console.error('\n💥 Test runner failed:', error.message)
  process.exit(1)
})