#!/usr/bin/env node

/**
 * Test Suite for Amazon Referral Fee Calculations
 * 
 * This script validates that our new profit margin calculations
 * are working correctly with real-world scenarios.
 */

const { calculateReferralFeeFromApify, calculateAmazonReferralFee, mapApifyToAmazonCategory } = require('./lib/amazon-fees.ts');

console.log('🧪 Testing Amazon Referral Fee Calculations\n');

// Test cases with known expected results
const testCases = [
  {
    name: 'Home & Kitchen Rice Cooker ($89.99)',
    breadcrumbs: 'Home & Kitchen > Kitchen & Dining > Small Appliances > Rice Cookers',
    price: 89.99,
    expectedCategory: 'Home and Kitchen',
    expectedRate: '15%',
    expectedFeeRange: [13.50, 13.80] // 15% + $0.30
  },
  {
    name: 'Electronics Low Price ($45.00)',
    breadcrumbs: 'Electronics > Cell Phones & Accessories > Chargers',
    price: 45.00,
    expectedCategory: 'Consumer Electronics',
    expectedRate: '8%',
    expectedFeeRange: [3.90, 4.20] // 8% + $0.30
  },
  {
    name: 'Baby Products Low Price ($8.99)',
    breadcrumbs: 'Baby & Toddler > Feeding > Baby Food',
    price: 8.99,
    expectedCategory: 'Baby Products',
    expectedRate: 'Tiered',
    expectedFeeRange: [1.02, 1.12] // 8% + $0.30 for ≤$10
  },
  {
    name: 'Baby Products High Price ($25.99)',
    breadcrumbs: 'Baby > Strollers > Jogging Strollers',
    price: 25.99,
    expectedCategory: 'Baby Products',
    expectedRate: 'Tiered',
    expectedFeeRange: [4.20, 4.50] // 15% + $0.30 for >$10
  },
  {
    name: 'Clothing Expensive ($45.00)',
    breadcrumbs: 'Clothing, Shoes & Jewelry > Men > Shirts',
    price: 45.00,
    expectedCategory: 'Clothing and Accessories',
    expectedRate: 'Tiered',
    expectedFeeRange: [7.95, 8.25] // 17% + $0.30 for >$20
  },
  {
    name: 'Fine Art Expensive ($2,500.00)',
    breadcrumbs: 'Collectibles & Fine Art > Paintings',
    price: 2500.00,
    expectedCategory: 'Fine Art',
    expectedRate: 'Tiered',
    expectedFeeRange: [285, 300] // Complex tiered structure
  },
  {
    name: 'Amazon Device Accessories ($15.99)',
    breadcrumbs: 'Amazon Device Accessories > Echo & Alexa',
    price: 15.99,
    expectedCategory: 'Amazon Device Accessories',
    expectedRate: '45%',
    expectedFeeRange: [7.50, 7.80] // 45% + $0.30
  }
];

let passedTests = 0;
let failedTests = 0;

console.log('Testing Category Mapping:\n');

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.name}`);
  
  try {
    // Test the calculation
    const result = calculateReferralFeeFromApify(testCase.breadcrumbs, testCase.price);
    
    console.log(`  📝 Input: ${testCase.breadcrumbs} | $${testCase.price}`);
    console.log(`  🎯 Expected Category: ${testCase.expectedCategory}`);
    console.log(`  ✅ Actual Category: ${result.category}`);
    console.log(`  💰 Calculated Fee: $${result.fee} (${result.rate})`);
    
    // Validate category mapping
    const categoryMatch = result.category === testCase.expectedCategory;
    
    // Validate fee range
    const feeInRange = result.fee >= testCase.expectedFeeRange[0] && 
                       result.fee <= testCase.expectedFeeRange[1];
    
    if (categoryMatch && feeInRange) {
      console.log(`  ✅ PASS - Fee $${result.fee} is within expected range [$${testCase.expectedFeeRange[0]} - $${testCase.expectedFeeRange[1]}]\n`);
      passedTests++;
    } else {
      console.log(`  ❌ FAIL - Expected fee range: [$${testCase.expectedFeeRange[0]} - $${testCase.expectedFeeRange[1]}], got $${result.fee}`);
      console.log(`  ❌ FAIL - Expected category: ${testCase.expectedCategory}, got ${result.category}\n`);
      failedTests++;
    }
  } catch (error) {
    console.log(`  ❌ ERROR: ${error.message}\n`);
    failedTests++;
  }
});

console.log('🔍 Testing Edge Cases:\n');

// Edge case tests
const edgeCases = [
  {
    name: 'Empty breadcrumbs',
    breadcrumbs: '',
    price: 50.00,
    expectedCategory: 'Everything Else'
  },
  {
    name: 'Unknown category',
    breadcrumbs: 'Unknown Category > Subcategory',
    price: 100.00,
    expectedCategory: 'Everything Else'
  },
  {
    name: 'Very low price',
    breadcrumbs: 'Home & Kitchen > Utensils',
    price: 0.01,
    expectedCategory: 'Home and Kitchen'
  },
  {
    name: 'Very high price',
    breadcrumbs: 'Fine Art > Sculptures',
    price: 10000.00,
    expectedCategory: 'Fine Art'
  }
];

edgeCases.forEach((testCase, index) => {
  console.log(`Edge Case ${index + 1}: ${testCase.name}`);
  
  try {
    const result = calculateReferralFeeFromApify(testCase.breadcrumbs, testCase.price);
    console.log(`  📝 Input: "${testCase.breadcrumbs}" | $${testCase.price}`);
    console.log(`  ✅ Category: ${result.category}`);
    console.log(`  💰 Fee: $${result.fee} (${result.rate})`);
    
    if (result.category === testCase.expectedCategory) {
      console.log(`  ✅ PASS - Category mapping correct\n`);
      passedTests++;
    } else {
      console.log(`  ❌ FAIL - Expected ${testCase.expectedCategory}, got ${result.category}\n`);
      failedTests++;
    }
  } catch (error) {
    console.log(`  ❌ ERROR: ${error.message}\n`);
    failedTests++;
  }
});

console.log('📊 Test Summary:');
console.log(`✅ Passed: ${passedTests}`);
console.log(`❌ Failed: ${failedTests}`);
console.log(`📈 Success Rate: ${Math.round((passedTests / (passedTests + failedTests)) * 100)}%\n`);

if (failedTests === 0) {
  console.log('🎉 All tests passed! Amazon referral fee calculations are working correctly.');
  process.exit(0);
} else {
  console.log('⚠️  Some tests failed. Please review the implementation.');
  process.exit(1);
}