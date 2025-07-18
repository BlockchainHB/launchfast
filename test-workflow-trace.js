const axios = require('axios');

// Test the exact workflow step by step to find where the keyword gets lost
const testKeyword = "Flagpole Mount For Truck";
const baseURL = "http://localhost:3001";

async function traceWorkflow() {
  console.log('🔍 WORKFLOW TRACE: Testing step-by-step processing');
  console.log('=' .repeat(60));
  console.log('Input keyword:', testKeyword);
  
  // Step 1: Test direct SellerSprite product research call
  console.log('\n📡 Step 1: Direct SellerSprite Product Research');
  console.log('-'.repeat(50));
  
  try {
    const response = await axios.post(`${baseURL}/api/debug/sellersprite`, {
      keyword: testKeyword
    });
    
    console.log('✅ SellerSprite API Response:');
    console.log('   - Status:', response.data.status);
    console.log('   - Keyword sent:', response.data.keyword);
    console.log('   - Total items:', response.data.fullResponse.data.total);
    console.log('   - Items returned:', response.data.fullResponse.data.items.length);
    
    if (response.data.fullResponse.data.items.length > 0) {
      const firstItem = response.data.fullResponse.data.items[0];
      console.log('   - First item title:', firstItem.title);
      console.log('   - First item category:', firstItem.nodeLabelPath);
      
      // Check if any returned items are relevant
      const titles = response.data.fullResponse.data.items.map(item => item.title.toLowerCase());
      const flagKeywords = ['flag', 'pole', 'mount', 'truck', 'vehicle', 'automotive'];
      
      let foundRelevant = false;
      titles.forEach((title, index) => {
        const relevantWords = flagKeywords.filter(keyword => title.includes(keyword));
        if (relevantWords.length > 0) {
          console.log(`   - ✅ Item ${index + 1} relevant:`, relevantWords);
          foundRelevant = true;
        }
      });
      
      if (!foundRelevant) {
        console.log('   - ❌ NO RELEVANT ITEMS FOUND in SellerSprite response');
        console.log('   - 🔍 This is where the keyword search fails!');
      }
    }
    
  } catch (error) {
    console.log('❌ SellerSprite API Error:', error.message);
  }
  
  // Step 2: Test the specific parameters being sent
  console.log('\n📡 Step 2: Parameter Analysis');
  console.log('-'.repeat(50));
  
  // Test different parameter combinations
  const testParams = [
    { keyword: testKeyword, size: 5 },
    { keyword: testKeyword.toLowerCase(), size: 5 },
    { keyword: testKeyword.replace(/\s+/g, ' '), size: 5 },
    { keyword: 'flagpole', size: 5 },
    { keyword: 'truck mount', size: 5 }
  ];
  
  for (const params of testParams) {
    try {
      console.log(`\n🔍 Testing parameters:`, params);
      
      // Make direct API call like the debug endpoint does
      const response = await axios.post('https://api.sellersprite.com/v1/product/research', {
        ...params,
        marketplace: 'US',
        page: 1
      }, {
        timeout: 30000,
        headers: {
          'secret-key': process.env.SELLERSPRITE_API_KEY,
          'Content-Type': 'application/json;charset=utf-8',
          'User-Agent': 'SellerSprite-Dashboard/1.0'
        }
      });
      
      console.log('   - Response code:', response.data.code);
      console.log('   - Items found:', response.data.data.items.length);
      
      if (response.data.data.items.length > 0) {
        const firstTitle = response.data.data.items[0].title.toLowerCase();
        const flagKeywords = ['flag', 'pole', 'mount', 'truck', 'vehicle'];
        const relevantWords = flagKeywords.filter(keyword => firstTitle.includes(keyword));
        
        if (relevantWords.length > 0) {
          console.log('   - ✅ FOUND RELEVANT RESULT!');
          console.log('   - Title:', response.data.data.items[0].title);
          console.log('   - Relevant words:', relevantWords);
          break;
        } else {
          console.log('   - ❌ Still irrelevant:', response.data.data.items[0].title.substring(0, 50) + '...');
        }
      }
      
    } catch (error) {
      console.log('   - ❌ API Error:', error.message);
    }
  }
  
  // Step 3: Test if it's an API key or rate limiting issue
  console.log('\n📡 Step 3: API Key and Rate Limiting Check');
  console.log('-'.repeat(50));
  
  try {
    // Test with a known working keyword first
    const workingKeyword = "wireless charger";
    console.log(`🔍 Testing with known working keyword: "${workingKeyword}"`);
    
    const response = await axios.post(`${baseURL}/api/debug/sellersprite`, {
      keyword: workingKeyword
    });
    
    console.log('   - Working keyword status:', response.data.status);
    console.log('   - Working keyword items:', response.data.fullResponse.data.items.length);
    
    if (response.data.fullResponse.data.items.length > 0) {
      const firstTitle = response.data.fullResponse.data.items[0].title;
      console.log('   - First result:', firstTitle);
      
      // Check if it's actually related to wireless charging
      if (firstTitle.toLowerCase().includes('wireless') || firstTitle.toLowerCase().includes('charger')) {
        console.log('   - ✅ Working keyword returns relevant results');
      } else {
        console.log('   - ❌ Even working keyword returns irrelevant results');
      }
    }
    
  } catch (error) {
    console.log('   - ❌ Working keyword test failed:', error.message);
  }
}

traceWorkflow().catch(console.error);