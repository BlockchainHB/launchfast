/**
 * Comprehensive test script for Supplier CRM API endpoints
 * Tests all CRUD operations for supplier relationships, samples, evaluations, and templates
 */

const axios = require('axios')

// Test configuration
const TEST_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  testUserId: '29a94bda-39e2-4b57-8cc0-cd289274da5a', // Test user ID
  timeout: 30000 // 30 second timeout
}

console.log('🧪 Starting Supplier CRM API Tests')
console.log('=' .repeat(60))

// Test data storage
let testData = {
  supplierRelationship: null,
  sampleRequest: null,
  sampleEvaluation: null,
  communicationTemplate: null
}

async function testSupplierRelationshipAPIs() {
  console.log('\n📋 Testing Supplier Relationship APIs...')
  
  try {
    // 1. Create supplier relationship
    console.log('  1. Creating supplier relationship...')
    const createResponse = await axios.post(
      `${TEST_CONFIG.baseUrl}/api/supplier-relationships`,
      {
        userId: TEST_CONFIG.testUserId,
        supplierId: 'test_supplier_123',
        supplierName: 'Test Electronics Co., Ltd.',
        alibabaUrl: 'https://test-supplier.alibaba.com',
        pipelineStage: 'prospects',
        contactEmail: 'contact@testelectronics.com',
        contactPhone: '+86 138 0013 8000',
        contactPerson: 'John Zhang',
        locationCountry: 'CN',
        locationCity: 'Shenzhen',
        businessType: 'Manufacturer',
        yearsInBusiness: 8,
        goldSupplier: true,
        tradeAssurance: true,
        qualityScore: 75,
        moq: 100,
        tags: ['electronics', 'bluetooth', 'high-quality'],
        internalNotes: 'Good initial impression, need to verify MOQ'
      },
      { timeout: TEST_CONFIG.timeout }
    )

    if (createResponse.data.success) {
      testData.supplierRelationship = createResponse.data.data.relationship
      console.log('    ✅ Supplier relationship created:', testData.supplierRelationship.id)
    } else {
      throw new Error(createResponse.data.error)
    }

    // 2. Get supplier relationships list
    console.log('  2. Fetching supplier relationships...')
    const listResponse = await axios.get(
      `${TEST_CONFIG.baseUrl}/api/supplier-relationships?userId=${TEST_CONFIG.testUserId}&limit=10`,
      { timeout: TEST_CONFIG.timeout }
    )

    if (listResponse.data.success) {
      console.log(`    ✅ Found ${listResponse.data.data.relationships.length} relationships`)
      console.log(`    📊 Stats:`, listResponse.data.data.stats)
    } else {
      throw new Error(listResponse.data.error)
    }

    // 3. Get specific supplier relationship
    console.log('  3. Fetching specific supplier relationship...')
    const detailResponse = await axios.get(
      `${TEST_CONFIG.baseUrl}/api/supplier-relationships/${testData.supplierRelationship.id}?userId=${TEST_CONFIG.testUserId}`,
      { timeout: TEST_CONFIG.timeout }
    )

    if (detailResponse.data.success) {
      console.log('    ✅ Supplier relationship details retrieved')
      console.log('    📊 Metrics:', detailResponse.data.data.metrics)
    } else {
      throw new Error(detailResponse.data.error)
    }

    // 4. Update supplier relationship
    console.log('  4. Updating supplier relationship...')
    const updateResponse = await axios.patch(
      `${TEST_CONFIG.baseUrl}/api/supplier-relationships`,
      {
        relationshipId: testData.supplierRelationship.id,
        userId: TEST_CONFIG.testUserId,
        pipelineStage: 'contacted',
        relationshipHealthScore: 80,
        priorityLevel: 'high',
        lastContactDate: new Date().toISOString(),
        internalNotes: 'Updated after initial contact - very responsive'
      },
      { timeout: TEST_CONFIG.timeout }
    )

    if (updateResponse.data.success) {
      console.log('    ✅ Supplier relationship updated')
    } else {
      throw new Error(updateResponse.data.error)
    }

    return true

  } catch (error) {
    console.log('    ❌ Supplier relationship API test failed:', error.message)
    return false
  }
}

async function testSupplierInteractionAPIs() {
  console.log('\n💬 Testing Supplier Interaction APIs...')
  
  try {
    // 1. Create supplier interaction
    console.log('  1. Creating supplier interaction...')
    const createResponse = await axios.post(
      `${TEST_CONFIG.baseUrl}/api/supplier-interactions`,
      {
        userId: TEST_CONFIG.testUserId,
        supplierRelationshipId: testData.supplierRelationship.id,
        interactionType: 'email_sent',
        subject: 'Initial Inquiry - Bluetooth Speakers',
        content: 'Hello, we are interested in your bluetooth speaker products. Could you please send us your catalog and pricing?',
        direction: 'outbound'
      },
      { timeout: TEST_CONFIG.timeout }
    )

    if (createResponse.data.success) {
      console.log('    ✅ Supplier interaction created')
    } else {
      throw new Error(createResponse.data.error)
    }

    // 2. Get supplier interactions
    console.log('  2. Fetching supplier interactions...')
    const listResponse = await axios.get(
      `${TEST_CONFIG.baseUrl}/api/supplier-interactions?userId=${TEST_CONFIG.testUserId}&supplierRelationshipId=${testData.supplierRelationship.id}`,
      { timeout: TEST_CONFIG.timeout }
    )

    if (listResponse.data.success) {
      console.log(`    ✅ Found ${listResponse.data.data.interactions.length} interactions`)
    } else {
      throw new Error(listResponse.data.error)
    }

    return true

  } catch (error) {
    console.log('    ❌ Supplier interaction API test failed:', error.message)
    return false
  }
}

async function testSampleRequestAPIs() {
  console.log('\n📦 Testing Sample Request APIs...')
  
  try {
    // 1. Create sample request
    console.log('  1. Creating sample request...')
    const createResponse = await axios.post(
      `${TEST_CONFIG.baseUrl}/api/sample-requests`,
      {
        userId: TEST_CONFIG.testUserId,
        supplierRelationshipId: testData.supplierRelationship.id,
        productName: 'Bluetooth Speaker BT-200',
        productSpecifications: 'Wireless Bluetooth 5.0, 20W output, waterproof IPX7',
        quantityRequested: 2,
        sampleCost: 25.00,
        shippingCost: 15.00,
        expectedDeliveryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 days from now
        requestStatus: 'planning'
      },
      { timeout: TEST_CONFIG.timeout }
    )

    if (createResponse.data.success) {
      testData.sampleRequest = createResponse.data.data.sampleRequest
      console.log('    ✅ Sample request created:', testData.sampleRequest.id)
      console.log('    💰 Total cost:', testData.sampleRequest.total_cost)
    } else {
      throw new Error(createResponse.data.error)
    }

    // 2. Get sample requests list
    console.log('  2. Fetching sample requests...')
    const listResponse = await axios.get(
      `${TEST_CONFIG.baseUrl}/api/sample-requests?userId=${TEST_CONFIG.testUserId}&limit=10`,
      { timeout: TEST_CONFIG.timeout }
    )

    if (listResponse.data.success) {
      console.log(`    ✅ Found ${listResponse.data.data.sampleRequests.length} sample requests`)
      console.log(`    📊 Stats:`, listResponse.data.data.stats)
    } else {
      throw new Error(listResponse.data.error)
    }

    // 3. Update sample request status
    console.log('  3. Updating sample request status...')
    const updateResponse = await axios.patch(
      `${TEST_CONFIG.baseUrl}/api/sample-requests`,
      {
        sampleRequestId: testData.sampleRequest.id,
        userId: TEST_CONFIG.testUserId,
        requestStatus: 'requested',
        trackingNumber: 'SF1234567890'
      },
      { timeout: TEST_CONFIG.timeout }
    )

    if (updateResponse.data.success) {
      console.log('    ✅ Sample request updated to requested status')
    } else {
      throw new Error(updateResponse.data.error)
    }

    // 4. Update to received status
    console.log('  4. Updating to received status...')
    const receiveResponse = await axios.patch(
      `${TEST_CONFIG.baseUrl}/api/sample-requests`,
      {
        sampleRequestId: testData.sampleRequest.id,
        userId: TEST_CONFIG.testUserId,
        requestStatus: 'received',
        actualDeliveryDate: new Date().toISOString().split('T')[0]
      },
      { timeout: TEST_CONFIG.timeout }
    )

    if (receiveResponse.data.success) {
      console.log('    ✅ Sample request updated to received status')
    } else {
      throw new Error(receiveResponse.data.error)
    }

    return true

  } catch (error) {
    console.log('    ❌ Sample request API test failed:', error.message)
    return false
  }
}

async function testSampleEvaluationAPIs() {
  console.log('\n⭐ Testing Sample Evaluation APIs...')
  
  try {
    // 1. Create sample evaluation
    console.log('  1. Creating sample evaluation...')
    const createResponse = await axios.post(
      `${TEST_CONFIG.baseUrl}/api/sample-evaluations`,
      {
        userId: TEST_CONFIG.testUserId,
        sampleRequestId: testData.sampleRequest.id,
        overallRating: 4,
        qualityRating: 4,
        designRating: 5,
        materialsRating: 3,
        packagingRating: 4,
        functionalityRating: 4,
        evaluationNotes: 'Good overall quality. Sound is clear and bass is adequate. Design is appealing but materials feel slightly cheap.',
        pros: ['Great sound quality', 'Nice design', 'Good battery life', 'Easy to pair'],
        cons: ['Materials feel cheap', 'No carrying case included'],
        finalDecision: 'approved',
        decisionReason: 'Good value for money, meets our quality standards',
        wouldOrderAgain: true,
        recommendedImprovements: 'Improve material quality, include carrying case'
      },
      { timeout: TEST_CONFIG.timeout }
    )

    if (createResponse.data.success) {
      testData.sampleEvaluation = createResponse.data.data.evaluation
      console.log('    ✅ Sample evaluation created:', testData.sampleEvaluation.id)
      console.log('    ⭐ Overall rating:', testData.sampleEvaluation.overall_rating, '/5')
    } else {
      throw new Error(createResponse.data.error)
    }

    // 2. Get sample evaluations list
    console.log('  2. Fetching sample evaluations...')
    const listResponse = await axios.get(
      `${TEST_CONFIG.baseUrl}/api/sample-evaluations?userId=${TEST_CONFIG.testUserId}&limit=10`,
      { timeout: TEST_CONFIG.timeout }
    )

    if (listResponse.data.success) {
      console.log(`    ✅ Found ${listResponse.data.data.evaluations.length} sample evaluations`)
      console.log(`    📊 Stats:`, listResponse.data.data.stats)
    } else {
      throw new Error(listResponse.data.error)
    }

    return true

  } catch (error) {
    console.log('    ❌ Sample evaluation API test failed:', error.message)
    return false
  }
}

async function testCommunicationTemplateAPIs() {
  console.log('\n📝 Testing Communication Template APIs...')
  
  try {
    // 1. Create communication template
    console.log('  1. Creating communication template...')
    const createResponse = await axios.post(
      `${TEST_CONFIG.baseUrl}/api/communication-templates`,
      {
        userId: TEST_CONFIG.testUserId,
        templateName: 'Initial Inquiry Template',
        category: 'introduction',
        subjectTemplate: 'Inquiry about {product_name} - {company_name}',
        bodyTemplate: `Dear {supplier_name},

I hope this email finds you well. My name is {buyer_name} from {company_name}.

We are currently sourcing {product_name} and came across your company through Alibaba. We are impressed with your product range and would like to explore a potential business relationship.

Could you please provide us with:
1. Product catalog for {product_name}
2. Pricing information (including MOQ)
3. Lead time and shipping options
4. Available certifications

We are looking to place an initial order of approximately {quantity} units if the terms are suitable.

Looking forward to your response.

Best regards,
{buyer_name}
{company_name}
{contact_email}`,
        mergeFields: ['product_name', 'supplier_name', 'company_name', 'buyer_name', 'quantity', 'contact_email'],
        isDefault: true
      },
      { timeout: TEST_CONFIG.timeout }
    )

    if (createResponse.data.success) {
      testData.communicationTemplate = createResponse.data.data.template
      console.log('    ✅ Communication template created:', testData.communicationTemplate.id)
    } else {
      throw new Error(createResponse.data.error)
    }

    // 2. Get communication templates list
    console.log('  2. Fetching communication templates...')
    const listResponse = await axios.get(
      `${TEST_CONFIG.baseUrl}/api/communication-templates?userId=${TEST_CONFIG.testUserId}&category=introduction`,
      { timeout: TEST_CONFIG.timeout }
    )

    if (listResponse.data.success) {
      console.log(`    ✅ Found ${listResponse.data.data.templates.length} templates`)
      console.log(`    📊 Stats:`, listResponse.data.data.stats)
    } else {
      throw new Error(listResponse.data.error)
    }

    // 3. Use/render template with merge data
    console.log('  3. Rendering template with merge data...')
    const useResponse = await axios.post(
      `${TEST_CONFIG.baseUrl}/api/communication-templates/use`,
      {
        userId: TEST_CONFIG.testUserId,
        templateId: testData.communicationTemplate.id,
        mergeData: {
          product_name: 'Bluetooth Speakers',
          supplier_name: 'Test Electronics Co., Ltd.',
          company_name: 'LaunchFast Trading',
          buyer_name: 'John Smith',
          quantity: '500',
          contact_email: 'john@launchfast.com'
        }
      },
      { timeout: TEST_CONFIG.timeout }
    )

    if (useResponse.data.success) {
      console.log('    ✅ Template rendered successfully')
      console.log('    📧 Subject:', useResponse.data.data.renderedSubject)
      console.log('    📝 Body preview:', useResponse.data.data.renderedBody.substring(0, 100) + '...')
    } else {
      throw new Error(useResponse.data.error)
    }

    return true

  } catch (error) {
    console.log('    ❌ Communication template API test failed:', error.message)
    return false
  }
}

async function testExportAPIs() {
  console.log('\n📊 Testing Export APIs...')
  
  try {
    // 1. Export supplier relationships
    console.log('  1. Exporting supplier relationships...')
    const relationshipsResponse = await axios.post(
      `${TEST_CONFIG.baseUrl}/api/supplier-export`,
      {
        userId: TEST_CONFIG.testUserId,
        exportType: 'relationships',
        filters: {},
        includeInteractions: true
      },
      { 
        timeout: TEST_CONFIG.timeout,
        responseType: 'text'
      }
    )

    if (relationshipsResponse.data && relationshipsResponse.data.includes('Supplier Name')) {
      console.log('    ✅ Supplier relationships exported successfully')
      console.log(`    📄 CSV size: ${relationshipsResponse.data.length} characters`)
    } else {
      throw new Error('Invalid CSV export response')
    }

    // 2. Export sample requests
    console.log('  2. Exporting sample requests...')
    const samplesResponse = await axios.post(
      `${TEST_CONFIG.baseUrl}/api/supplier-export`,
      {
        userId: TEST_CONFIG.testUserId,
        exportType: 'samples',
        filters: {}
      },
      { 
        timeout: TEST_CONFIG.timeout,
        responseType: 'text'
      }
    )

    if (samplesResponse.data && samplesResponse.data.includes('Product Name')) {
      console.log('    ✅ Sample requests exported successfully')
      console.log(`    📄 CSV size: ${samplesResponse.data.length} characters`)
    } else {
      throw new Error('Invalid CSV export response')
    }

    return true

  } catch (error) {
    console.log('    ❌ Export API test failed:', error.message)
    return false
  }
}

async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test data...')
  
  try {
    // Delete sample evaluation
    if (testData.sampleEvaluation) {
      await axios.delete(
        `${TEST_CONFIG.baseUrl}/api/sample-evaluations?evaluationId=${testData.sampleEvaluation.id}&userId=${TEST_CONFIG.testUserId}`,
        { timeout: TEST_CONFIG.timeout }
      )
      console.log('  ✅ Sample evaluation deleted')
    }

    // Delete sample request
    if (testData.sampleRequest) {
      await axios.delete(
        `${TEST_CONFIG.baseUrl}/api/sample-requests?sampleRequestId=${testData.sampleRequest.id}&userId=${TEST_CONFIG.testUserId}`,
        { timeout: TEST_CONFIG.timeout }
      )
      console.log('  ✅ Sample request deleted')
    }

    // Delete communication template
    if (testData.communicationTemplate) {
      await axios.delete(
        `${TEST_CONFIG.baseUrl}/api/communication-templates?templateId=${testData.communicationTemplate.id}&userId=${TEST_CONFIG.testUserId}`,
        { timeout: TEST_CONFIG.timeout }
      )
      console.log('  ✅ Communication template deleted')
    }

    // Delete supplier relationship (this will cascade delete interactions)
    if (testData.supplierRelationship) {
      await axios.delete(
        `${TEST_CONFIG.baseUrl}/api/supplier-relationships?relationshipId=${testData.supplierRelationship.id}&userId=${TEST_CONFIG.testUserId}`,
        { timeout: TEST_CONFIG.timeout }
      )
      console.log('  ✅ Supplier relationship deleted')
    }

  } catch (error) {
    console.log('  ⚠️ Cleanup warning:', error.message)
  }
}

async function runAllTests() {
  console.log(`🎯 Testing against: ${TEST_CONFIG.baseUrl}`)
  console.log(`👤 Test user ID: ${TEST_CONFIG.testUserId}`)
  
  const tests = [
    { name: 'Supplier Relationships', fn: testSupplierRelationshipAPIs },
    { name: 'Supplier Interactions', fn: testSupplierInteractionAPIs },
    { name: 'Sample Requests', fn: testSampleRequestAPIs },
    { name: 'Sample Evaluations', fn: testSampleEvaluationAPIs },
    { name: 'Communication Templates', fn: testCommunicationTemplateAPIs },
    { name: 'Export APIs', fn: testExportAPIs }
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

  // Cleanup
  await cleanupTestData()

  console.log('\n' + '='.repeat(60))
  console.log('📊 FINAL TEST RESULTS')
  console.log('='.repeat(60))
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`📈 Success rate: ${Math.round((passed / (passed + failed)) * 100)}%`)

  if (failed === 0) {
    console.log('\n🎉 All Supplier CRM API tests passed! System is ready for UI development.')
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.')
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n⏹️  Tests interrupted by user')
  cleanupTestData().finally(() => process.exit(0))
})

process.on('uncaughtException', (error) => {
  console.log('\n❌ Uncaught exception:', error.message)
  cleanupTestData().finally(() => process.exit(1))
})

// Run all tests
runAllTests().catch(error => {
  console.error('\n💥 Test runner failed:', error.message)
  cleanupTestData().finally(() => process.exit(1))
})