const axios = require('axios');

async function testKeywordAPI() {
  const testKeyword = "Flagpole Mount For Truck";
  
  console.log('🧪 Testing keyword API with:', testKeyword);
  
  try {
    const response = await axios.post('http://localhost:3001/api/products/research', {
      keyword: testKeyword,
      limit: 3,
      filters: {
        maxReviews: 1000
      }
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ API Response Status:', response.status);
    console.log('✅ API Response Data:', JSON.stringify(response.data, null, 2));
    
    if (response.data.data && response.data.data.length > 0) {
      const firstProduct = response.data.data[0];
      console.log('🎯 First product title:', firstProduct.title);
      console.log('🎯 First product ASIN:', firstProduct.asin);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('❌ Response data:', error.response.data);
    }
  }
}

testKeywordAPI();