const axios = require('axios');

// Test if the issue is with keyword encoding or length
const testKeyword = "Flagpole Mount For Truck";
const baseURL = "http://localhost:3001";

async function testEncoding() {
  console.log('🔍 ENCODING TEST: Testing keyword encoding and length limits');
  console.log('=' .repeat(60));
  
  // Test different keyword lengths and encodings
  const testCases = [
    { name: "Original", keyword: "Flagpole Mount For Truck" },
    { name: "Lowercase", keyword: "flagpole mount for truck" },
    { name: "No spaces", keyword: "FlagpoleMountForTruck" },
    { name: "Hyphenated", keyword: "flagpole-mount-for-truck" },
    { name: "Single word", keyword: "flagpole" },
    { name: "Two words", keyword: "flagpole mount" },
    { name: "Three words", keyword: "flagpole mount truck" },
    { name: "URL encoded", keyword: encodeURIComponent("Flagpole Mount For Truck") },
    { name: "Short known", keyword: "phone case" },
    { name: "Long known", keyword: "wireless bluetooth earbuds" }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n🔍 Testing: ${testCase.name}`);
    console.log(`   Keyword: "${testCase.keyword}"`);
    console.log(`   Length: ${testCase.keyword.length} characters`);
    console.log(`   Word count: ${testCase.keyword.split(' ').length} words`);
    
    try {
      // Test through our debug endpoint
      const response = await axios.post(`${baseURL}/api/debug/sellersprite`, {
        keyword: testCase.keyword
      });
      
      if (response.data.status === 'OK') {
        const items = response.data.fullResponse.data.items || [];
        console.log(`   ✅ Debug endpoint: ${items.length} items found`);
        
        if (items.length > 0) {
          const firstTitle = items[0].title.toLowerCase();
          const keywordWords = testCase.keyword.toLowerCase().split(/[\s-]+/);
          const relevantWords = keywordWords.filter(word => 
            word.length > 2 && firstTitle.includes(word)
          );
          
          if (relevantWords.length > 0) {
            console.log(`   🎯 RELEVANT! Found words: ${relevantWords.join(', ')}`);
          } else {
            console.log(`   ❌ Irrelevant: ${items[0].title.substring(0, 50)}...`);
          }
        }
      } else {
        console.log(`   ❌ Debug endpoint failed: ${response.data.status}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Debug endpoint error: ${error.message}`);
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Test the actual product research endpoint
  console.log('\n📡 Testing Product Research Endpoint');
  console.log('-'.repeat(50));
  
  const shortKeyword = "flagpole";
  const longKeyword = "Flagpole Mount For Truck";
  
  for (const keyword of [shortKeyword, longKeyword]) {
    console.log(`\n🔍 Testing product research with: "${keyword}"`);
    
    try {
      const response = await axios.post(`${baseURL}/api/products/research`, {
        keyword: keyword,
        limit: 3,
        filters: { maxReviews: 1000 }
      });
      
      if (response.data.success) {
        console.log(`   ✅ Product research: ${response.data.data.length} products found`);
        
        if (response.data.data.length > 0) {
          const firstTitle = response.data.data[0].title.toLowerCase();
          const keywordWords = keyword.toLowerCase().split(/[\s-]+/);
          const relevantWords = keywordWords.filter(word => 
            word.length > 2 && firstTitle.includes(word)
          );
          
          if (relevantWords.length > 0) {
            console.log(`   🎯 RELEVANT! Found words: ${relevantWords.join(', ')}`);
          } else {
            console.log(`   ❌ Irrelevant: ${response.data.data[0].title.substring(0, 50)}...`);
          }
        }
      } else {
        console.log(`   ❌ Product research failed: ${response.data.error || 'Unknown error'}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Product research error: ${error.message}`);
      if (error.response?.status === 500) {
        console.log(`   🔍 Server error - check logs for details`);
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

testEncoding().catch(console.error);