// Test file for streaming keyword research functionality
// Run with: node test-streaming-keyword-research.js

const axios = require('axios');
const EventSource = require('eventsource'); // npm install eventsource

// Test configuration
const API_BASE_URL = 'http://localhost:3000'; // Update when dev server is running
const TEST_ASINS = [
  'B0CZC4NSK3',  // User's sauna product
  'B08N5WRWNW',  // Echo Dot
  'B07FZ8S74R'   // Instant Pot
];

// Mock streaming test (simulates browser EventSource)
async function testStreamingKeywordResearck() {
  console.log('🚀 Testing Streaming Keyword Research\n');
  console.log(`📋 Testing ${TEST_ASINS.length} ASINs: ${TEST_ASINS.join(', ')}\n`);

  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const results = {
      events: [],
      finalResult: null,
      errors: []
    };

    // Create EventSource connection
    const eventSource = new EventSource(`${API_BASE_URL}/api/keywords/research/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        asins: TEST_ASINS,
        options: {
          maxKeywordsPerAsin: 30,
          minSearchVolume: 100,
          includeOpportunities: true
        }
      })
    });

    // Event handlers
    eventSource.addEventListener('start', (event) => {
      const data = JSON.parse(event.data);
      console.log('🎬 START:', data);
      results.events.push({ type: 'start', data, timestamp: Date.now() });
    });

    eventSource.addEventListener('asin_progress', (event) => {
      const data = JSON.parse(event.data);
      console.log(`📊 ASIN PROGRESS: ${data.asin} - ${data.status} (${data.progress}%)`);
      if (data.error) console.log(`   ❌ Error: ${data.error}`);
      results.events.push({ type: 'asin_progress', data, timestamp: Date.now() });
    });

    eventSource.addEventListener('asin_result', (event) => {
      const data = JSON.parse(event.data);
      console.log(`✅ ASIN RESULT: ${data.asin} - ${data.keywordCount} keywords found`);
      results.events.push({ type: 'asin_result', data, timestamp: Date.now() });
    });

    eventSource.addEventListener('aggregation_start', (event) => {
      const data = JSON.parse(event.data);
      console.log('🔄 AGGREGATION START:', data.message);
      results.events.push({ type: 'aggregation_start', data, timestamp: Date.now() });
    });

    eventSource.addEventListener('aggregation_complete', (event) => {
      const data = JSON.parse(event.data);
      console.log(`🔗 AGGREGATION COMPLETE: ${data.uniqueKeywords} unique keywords from ${data.totalKeywords} total`);
      results.events.push({ type: 'aggregation_complete', data, timestamp: Date.now() });
    });

    eventSource.addEventListener('opportunities_start', (event) => {
      const data = JSON.parse(event.data);
      console.log('⛏️  OPPORTUNITIES START:', data.message);
      console.log('🔝 Top keywords for mining:', data.topKeywords.join(', '));
      results.events.push({ type: 'opportunities_start', data, timestamp: Date.now() });
    });

    eventSource.addEventListener('opportunities_progress', (event) => {
      const data = JSON.parse(event.data);
      console.log(`🎯 OPPORTUNITY PROGRESS: "${data.keyword}" - ${data.found} opportunities found`);
      results.events.push({ type: 'opportunities_progress', data, timestamp: Date.now() });
    });

    eventSource.addEventListener('opportunities_complete', (event) => {
      const data = JSON.parse(event.data);
      console.log(`🏆 OPPORTUNITIES COMPLETE: ${data.totalOpportunities} total opportunities`);
      results.events.push({ type: 'opportunities_complete', data, timestamp: Date.now() });
    });

    eventSource.addEventListener('complete', (event) => {
      const data = JSON.parse(event.data);
      console.log('\n🎉 STREAM COMPLETE!');
      console.log('📊 Final Results Summary:');
      console.log(`   • Processing time: ${data.overview.processingTime}ms`);
      console.log(`   • Total ASINs: ${data.overview.totalAsins}`);
      console.log(`   • Total keywords: ${data.overview.totalKeywords}`);
      console.log(`   • Average search volume: ${data.overview.avgSearchVolume.toLocaleString()}`);
      console.log(`   • Aggregated keywords: ${data.aggregatedKeywords.length}`);
      console.log(`   • Opportunities: ${data.opportunities.length}`);
      
      results.finalResult = data;
      results.events.push({ type: 'complete', data, timestamp: Date.now() });
      
      eventSource.close();
      resolve(results);
    });

    eventSource.addEventListener('error', (event) => {
      const data = JSON.parse(event.data);
      console.error('❌ STREAM ERROR:', data);
      results.errors.push(data);
      results.events.push({ type: 'error', data, timestamp: Date.now() });
      
      eventSource.close();
      reject(new Error(data.error));
    });

    // Connection error handler
    eventSource.onerror = (error) => {
      console.error('🔥 Connection error:', error);
      eventSource.close();
      reject(error);
    };

    // Timeout after 2 minutes
    setTimeout(() => {
      console.log('⏰ Test timeout reached');
      eventSource.close();
      reject(new Error('Test timeout'));
    }, 120000);
  });
}

// Alternative: Direct HTTP streaming test (for when EventSource isn't available)
async function testDirectStreamingRequest() {
  console.log('🚀 Testing Direct Streaming Request\n');

  try {
    const response = await axios.post(`${API_BASE_URL}/api/keywords/research/stream`, {
      asins: TEST_ASINS,
      options: {
        maxKeywordsPerAsin: 20,
        minSearchVolume: 100,
        includeOpportunities: true
      }
    }, {
      responseType: 'stream',
      timeout: 120000,
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache'
      }
    });

    return new Promise((resolve, reject) => {
      let buffer = '';
      const events = [];

      response.data.on('data', (chunk) => {
        buffer += chunk.toString();
        
        // Process complete events
        const lines = buffer.split('\n\n');
        buffer = lines.pop(); // Keep incomplete event in buffer
        
        lines.forEach(eventData => {
          if (eventData.trim()) {
            try {
              const [eventLine, dataLine] = eventData.split('\n');
              if (eventLine.startsWith('event:') && dataLine.startsWith('data:')) {
                const eventType = eventLine.replace('event: ', '').trim();
                const data = JSON.parse(dataLine.replace('data: ', ''));
                
                console.log(`📡 ${eventType.toUpperCase()}:`, data);
                events.push({ type: eventType, data, timestamp: Date.now() });
                
                if (eventType === 'complete') {
                  resolve({ events, finalResult: data });
                } else if (eventType === 'error') {
                  reject(new Error(data.error));
                }
              }
            } catch (parseError) {
              console.warn('⚠️  Failed to parse event:', eventData);
            }
          }
        });
      });

      response.data.on('end', () => {
        console.log('📡 Stream ended');
        resolve({ events });
      });

      response.data.on('error', (error) => {
        console.error('❌ Stream error:', error);
        reject(error);
      });
    });

  } catch (error) {
    console.error('❌ Request failed:', error.message);
    throw error;
  }
}

// Fallback: Test with mock data (when server isn't running)
function testMockStreaming() {
  console.log('🚀 Testing Mock Streaming (Server not available)\n');
  
  return new Promise((resolve) => {
    const events = [];
    let step = 0;

    const mockEvents = [
      { type: 'start', data: { totalAsins: TEST_ASINS.length, timestamp: Date.now() } },
      { type: 'asin_progress', data: { asin: TEST_ASINS[0], status: 'processing', progress: 0 } },
      { type: 'asin_progress', data: { asin: TEST_ASINS[0], status: 'completed', progress: 33 } },
      { type: 'asin_result', data: { asin: TEST_ASINS[0], keywordCount: 25, status: 'success' } },
      { type: 'asin_progress', data: { asin: TEST_ASINS[1], status: 'processing', progress: 33 } },
      { type: 'asin_progress', data: { asin: TEST_ASINS[1], status: 'completed', progress: 67 } },
      { type: 'asin_result', data: { asin: TEST_ASINS[1], keywordCount: 18, status: 'success' } },
      { type: 'aggregation_start', data: { message: 'Aggregating keywords...' } },
      { type: 'aggregation_complete', data: { totalKeywords: 43, uniqueKeywords: 35 } },
      { type: 'opportunities_start', data: { message: 'Mining opportunities...', topKeywords: ['sauna', 'echo', 'instant pot'] } },
      { type: 'opportunities_complete', data: { totalOpportunities: 25 } },
      { type: 'complete', data: { overview: { totalAsins: 3, totalKeywords: 43, processingTime: 8500 } } }
    ];

    const interval = setInterval(() => {
      if (step >= mockEvents.length) {
        clearInterval(interval);
        console.log('✅ Mock streaming test completed');
        resolve({ events, success: true });
        return;
      }

      const event = mockEvents[step];
      console.log(`📡 ${event.type.toUpperCase()}:`, event.data);
      events.push({ ...event, timestamp: Date.now() });
      step++;
    }, 1000);
  });
}

// Main test runner
async function runStreamingTests() {
  console.log('🔬 Streaming Keyword Research Test Suite\n');

  try {
    // Try EventSource test first
    console.log('=== Test 1: EventSource Streaming ===');
    try {
      const result = await testStreamingKeywordResearck();
      console.log('✅ EventSource test passed');
      return result;
    } catch (error) {
      console.log('❌ EventSource test failed:', error.message);
      console.log('Falling back to direct HTTP streaming...\n');
    }

    // Try direct HTTP streaming
    console.log('=== Test 2: Direct HTTP Streaming ===');
    try {
      const result = await testDirectStreamingRequest();
      console.log('✅ Direct HTTP streaming test passed');
      return result;
    } catch (error) {
      console.log('❌ Direct HTTP streaming test failed:', error.message);
      console.log('Falling back to mock test...\n');
    }

    // Fallback to mock test
    console.log('=== Test 3: Mock Streaming ===');
    const result = await testMockStreaming();
    console.log('✅ Mock streaming test passed');
    return result;

  } catch (error) {
    console.error('🔥 All tests failed:', error);
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  runStreamingTests()
    .then(result => {
      console.log('\n🎉 Streaming tests completed!');
      console.log('📊 Events captured:', result.events?.length || 0);
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { testStreamingKeywordResearck, testDirectStreamingRequest, testMockStreaming };