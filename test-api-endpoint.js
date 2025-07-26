// Quick test to check API response format
const testAPIEndpoint = async () => {
  try {
    console.log('🧪 Testing Keyword Research API Endpoint...\n');
    
    // Test ASINs
    const testAsins = ['B0CZC4NSK3']; // The sauna ASIN that works
    const userId = '29a94bda-39e2-4b57-8cc0-cd289274da5a';
    const sessionName = 'Test Session';
    
    // Test streaming endpoint
    console.log('1️⃣ Testing Streaming Endpoint...');
    const params = new URLSearchParams({
      userId,
      asins: testAsins.join(','),
      sessionName,
      maxKeywordsPerAsin: '50',
      minSearchVolume: '100',
      includeOpportunities: 'true',
      includeGapAnalysis: 'false'
    });
    
    const streamResponse = await fetch(`http://localhost:3000/api/keywords/research/stream?${params}`);
    
    if (!streamResponse.ok) {
      console.error('❌ Streaming endpoint failed:', streamResponse.status, streamResponse.statusText);
    } else {
      console.log('✅ Streaming endpoint responded');
      
      // Read a bit of the stream
      const reader = streamResponse.body.getReader();
      const decoder = new TextDecoder();
      let sessionId = null;
      
      for (let i = 0; i < 10; i++) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));
              console.log(`   📨 Event: ${event.phase} - ${event.message}`);
              
              if (event.data?.sessionId) {
                sessionId = event.data.sessionId;
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
      
      reader.cancel();
    }
    
    // Test regular endpoint
    console.log('\n2️⃣ Testing Regular Endpoint...');
    const regularResponse = await fetch('http://localhost:3000/api/keywords/research', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        asins: testAsins,
        sessionName: 'Test Regular',
        options: {
          maxKeywordsPerAsin: 50,
          minSearchVolume: 100,
          includeOpportunities: true,
          includeGapAnalysis: false
        }
      })
    });
    
    if (!regularResponse.ok) {
      console.error('❌ Regular endpoint failed:', regularResponse.status, regularResponse.statusText);
    } else {
      const data = await regularResponse.json();
      console.log('✅ Regular endpoint responded');
      console.log('   📊 Response structure:', Object.keys(data));
      
      if (data.success && data.data) {
        console.log('   📈 Data structure:', Object.keys(data.data));
        console.log('   🔢 Overview:', data.data.overview);
      }
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
};

// Make sure server is running
console.log('⚠️  Make sure your Next.js dev server is running on port 3000!\n');

testAPIEndpoint(); 