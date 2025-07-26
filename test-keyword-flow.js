// Set up TypeScript module loading
const path = require('path')
require('ts-node').register({
  project: path.join(__dirname, 'tsconfig.json'),
  transpileOnly: true
})

const { KeywordResearchService } = require('./lib/keyword-research.ts')

async function testKeywordFlow() {
  console.log('Testing complete keyword research flow...\n')
  
  try {
    const service = new KeywordResearchService()
    
    // Test with a real ASIN
    const asins = ['B0CZC4NSK3']
    
    console.log('Running keyword research for ASIN:', asins[0])
    
    const results = await service.researchKeywords(asins, {
      includeOpportunities: true,
      includeGapAnalysis: false
    })
    
    console.log('\n=== Research Results Summary ===')
    console.log('Total keywords found:', results.overview.totalKeywords)
    console.log('Total ASINs processed:', results.overview.totalAsins)
    
    // Check if we have enhanced data in the keywords
    const firstAsinResult = results.asinResults[0]
    if (firstAsinResult && firstAsinResult.keywords.length > 0) {
      const firstKeyword = firstAsinResult.keywords[0]
      
      console.log('\n=== First Keyword Enhanced Data ===')
      console.log('Keyword:', firstKeyword.keyword)
      console.log('Search Volume:', firstKeyword.searchVolume)
      console.log('Products:', firstKeyword.products)
      console.log('Purchases:', firstKeyword.purchases)
      console.log('Purchase Rate:', firstKeyword.purchaseRate)
      console.log('Bid Min:', firstKeyword.bidMin)
      console.log('Bid Max:', firstKeyword.bidMax)
      console.log('Supply/Demand Ratio:', firstKeyword.supplyDemandRatio)
      console.log('Has enhanced fields?', !!(firstKeyword.products || firstKeyword.purchases || firstKeyword.purchaseRate))
      
      // Check all keywords for enhanced data
      const keywordsWithProducts = firstAsinResult.keywords.filter(kw => kw.products !== undefined && kw.products !== null)
      const keywordsWithPurchases = firstAsinResult.keywords.filter(kw => kw.purchases !== undefined && kw.purchases !== null)
      const keywordsWithPurchaseRate = firstAsinResult.keywords.filter(kw => kw.purchaseRate !== undefined && kw.purchaseRate !== null)
      
      console.log('\n=== Enhanced Data Coverage ===')
      console.log(`Keywords with products field: ${keywordsWithProducts.length}/${firstAsinResult.keywords.length}`)
      console.log(`Keywords with purchases field: ${keywordsWithPurchases.length}/${firstAsinResult.keywords.length}`)
      console.log(`Keywords with purchaseRate field: ${keywordsWithPurchaseRate.length}/${firstAsinResult.keywords.length}`)
    }
    
    // Check allKeywordsWithCompetition
    if (results.allKeywordsWithCompetition && results.allKeywordsWithCompetition.length > 0) {
      console.log('\n=== All Keywords With Competition ===')
      console.log('Total keywords:', results.allKeywordsWithCompetition.length)
      
      const firstCompKeyword = results.allKeywordsWithCompetition[0]
      console.log('\nFirst keyword in allKeywordsWithCompetition:')
      console.log('Keyword:', firstCompKeyword.keyword)
      console.log('Products:', firstCompKeyword.products)
      console.log('Purchase Rate:', firstCompKeyword.purchaseRate)
      console.log('Avg Price:', firstCompKeyword.avgPrice)
      console.log('Ad Products:', firstCompKeyword.adProducts)
    } else {
      console.log('\n⚠️  allKeywordsWithCompetition is not populated!')
    }
    
    console.log('\n✅ Test completed successfully')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error(error.stack)
  }
}

// Run the test
testKeywordFlow() 