const axios = require('axios');

// Test all SellerSprite endpoints with the problematic keyword
const testKeyword = "Flagpole Mount For Truck";
const baseURL = "http://localhost:3001";

async function testAllEndpoints() {
  console.log('🧪 Testing all SellerSprite endpoints with keyword:', testKeyword);
  console.log('=' .repeat(60));

  // Test 1: Raw SellerSprite Debug Endpoint
  console.log('\n1. Testing Raw SellerSprite Debug Endpoint');
  console.log('-'.repeat(40));
  try {
    const response = await axios.post(`${baseURL}/api/debug/sellersprite`, {
      keyword: testKeyword,
      limit: 3
    });
    console.log('✅ Debug endpoint status:', response.status);
    console.log('✅ Raw response structure:', Object.keys(response.data));
    if (response.data.data && response.data.data.items) {
      console.log('📊 Total items found:', response.data.data.items.length);
      console.log('🎯 First item title:', response.data.data.items[0]?.title);
    }
  } catch (error) {
    console.log('❌ Debug endpoint error:', error.message);
  }

  // Test 2: Product Research API
  console.log('\n2. Testing Product Research API');
  console.log('-'.repeat(40));
  try {
    const response = await axios.post(`${baseURL}/api/products/research`, {
      keyword: testKeyword,
      limit: 3,
      filters: { maxReviews: 1000 }
    });
    console.log('✅ Product research status:', response.status);
    console.log('📊 Products found:', response.data.data?.length || 0);
    if (response.data.data?.length > 0) {
      console.log('🎯 First product title:', response.data.data[0].title);
      console.log('🎯 First product ASIN:', response.data.data[0].asin);
    }
  } catch (error) {
    console.log('❌ Product research error:', error.message);
  }

  // Test 3: Sales Prediction API
  console.log('\n3. Testing Sales Prediction API');
  console.log('-'.repeat(40));
  try {
    const response = await axios.get(`${baseURL}/api/test/sellersprite`);
    console.log('✅ Sales prediction status:', response.status);
    console.log('📊 Sales data for B0CZC4NSK3:', response.data.data);
  } catch (error) {
    console.log('❌ Sales prediction error:', error.message);
  }

  // Test 4: Keyword Mining API
  console.log('\n4. Testing Keyword Mining API');
  console.log('-'.repeat(40));
  try {
    const response = await axios.post(`${baseURL}/api/test/sellersprite`, {
      test: "keyword-mining",
      keyword: testKeyword
    });
    console.log('✅ Keyword mining status:', response.status);
    console.log('📊 Keywords found:', response.data.resultsCount);
    if (response.data.data?.length > 0) {
      console.log('🎯 First keyword:', response.data.data[0].keyword);
      console.log('🎯 Search volume:', response.data.data[0].searchVolume);
    }
  } catch (error) {
    console.log('❌ Keyword mining error:', error.message);
  }

  // Test 5: Reverse ASIN API
  console.log('\n5. Testing Reverse ASIN API');
  console.log('-'.repeat(40));
  try {
    const response = await axios.post(`${baseURL}/api/test/reverse-asin`, {
      asin: "B0CZC4NSK3",
      size: 5
    });
    console.log('✅ Reverse ASIN status:', response.status);
    console.log('📊 Keywords found:', response.data.resultsCount);
    if (response.data.data?.length > 0) {
      console.log('🎯 First keyword:', response.data.data[0].keyword);
      console.log('🎯 Search volume:', response.data.data[0].searchVolume);
    }
  } catch (error) {
    console.log('❌ Reverse ASIN error:', error.message);
  }

  // Test 6: Try different variations of the keyword
  console.log('\n6. Testing Keyword Variations');
  console.log('-'.repeat(40));
  
  const variations = [
    "flagpole mount truck",
    "truck flagpole mount",
    "vehicle flag mount",
    "flag holder truck",
    "flagpole"
  ];

  for (const variation of variations) {
    try {
      console.log(`\n🔍 Testing variation: "${variation}"`);
      const response = await axios.post(`${baseURL}/api/products/research`, {
        keyword: variation,
        limit: 1,
        filters: { maxReviews: 1000 }
      });
      
      if (response.data.data?.length > 0) {
        console.log('✅ Found results for:', variation);
        console.log('🎯 Product title:', response.data.data[0].title);
        
        // Check if title contains any flag-related keywords
        const title = response.data.data[0].title.toLowerCase();
        const flagKeywords = ['flag', 'pole', 'mount', 'truck', 'vehicle'];
        const relevantKeywords = flagKeywords.filter(keyword => title.includes(keyword));
        
        if (relevantKeywords.length > 0) {
          console.log('🎯 Relevant keywords found:', relevantKeywords);
        } else {
          console.log('⚠️  No relevant keywords in title');
        }
      } else {
        console.log('❌ No results for:', variation);
      }
    } catch (error) {
      console.log('❌ Error testing variation:', variation, error.message);
    }
  }
}

testAllEndpoints().catch(console.error);