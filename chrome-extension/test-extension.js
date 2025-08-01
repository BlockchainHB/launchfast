/**
 * Test script for Chrome Extension functionality
 * Run in browser console on Amazon pages to test components
 */

// Test 1: Check if extension scripts loaded
function testScriptsLoaded() {
  console.log('=== Testing Script Loading ===');
  console.log('AmazonProductExtractor:', typeof window.AmazonProductExtractor);
  console.log('LaunchFastBadgeCreator:', typeof window.LaunchFastBadgeCreator);
  console.log('AmazonInjector:', typeof window.AmazonInjector);
}

// Test 2: Test ASIN extraction
function testASINExtraction() {
  console.log('=== Testing ASIN Extraction ===');
  if (window.AmazonProductExtractor) {
    const products = window.AmazonProductExtractor.extractAllProducts();
    console.log(`Found ${products.length} products:`, products);
    return products;
  } else {
    console.error('AmazonProductExtractor not loaded');
    return [];
  }
}

// Test 3: Test badge injection
function testBadgeInjection(asin = 'B07GBZ4Q68') {
  console.log('=== Testing Badge Injection ===');
  if (window.LaunchFastBadgeCreator) {
    const mockData = {
      asin: asin,
      grade: 'A8',
      calculatedMetrics: {
        monthlyProfit: 2500,
        margin: 0.35,
        monthlyRevenue: 7500
      },
      reviews: 1234,
      isSponsored: false,
      aiAnalysis: {
        riskClassification: 'Low Risk'
      }
    };
    
    const badge = window.LaunchFastBadgeCreator.createAnalysisBadge(mockData);
    console.log('Created badge:', badge);
    
    // Try to inject into first product container
    const containers = document.querySelectorAll('.s-result-item');
    if (containers.length > 0) {
      window.LaunchFastBadgeCreator.injectBadge(containers[0], badge);
      console.log('Badge injected successfully');
    }
  }
}

// Test 4: Test API authentication
async function testAuthentication() {
  console.log('=== Testing Authentication ===');
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'CHECK_AUTH'
    });
    console.log('Auth status:', response);
    return response;
  } catch (error) {
    console.error('Auth test failed:', error);
    return null;
  }
}

// Test 5: Test product analysis
async function testProductAnalysis(asin = 'B07GBZ4Q68') {
  console.log('=== Testing Product Analysis ===');
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'ANALYZE_PRODUCTS',
      data: [{ asin }]
    });
    console.log('Analysis result:', response);
    return response;
  } catch (error) {
    console.error('Analysis test failed:', error);
    return null;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting LaunchFast Extension Tests');
  
  testScriptsLoaded();
  
  const products = testASINExtraction();
  
  if (products.length > 0) {
    testBadgeInjection(products[0].asin);
  } else {
    testBadgeInjection(); // Use default ASIN
  }
  
  await testAuthentication();
  
  if (products.length > 0) {
    await testProductAnalysis(products[0].asin);
  }
  
  console.log('✅ All tests completed');
}

// Export functions for manual testing
window.LaunchFastTests = {
  testScriptsLoaded,
  testASINExtraction,
  testBadgeInjection,
  testAuthentication,
  testProductAnalysis,
  runAllTests
};

console.log('LaunchFast test functions loaded. Run: LaunchFastTests.runAllTests()');