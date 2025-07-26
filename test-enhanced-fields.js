const axios = require('axios')

class SellerSpriteClientTest {
  constructor(apiKey) {
    this.apiKey = apiKey
    this.baseURL = 'https://api.sellersprite.com'
  }

  async reverseASIN(asin, page = 1, size = 200) {
    try {
      const response = await axios.post(`${this.baseURL}/v1/traffic/keyword`, {
        asin,
        marketplace: 'US',
        page,
        size
      }, {
        timeout: 45000,
        headers: {
          'secret-key': this.apiKey,
          'Content-Type': 'application/json;charset=utf-8',
          'User-Agent': 'SellerSprite-Dashboard/1.0'
        }
      })

      const items = response.data.data.items || []
      const keywords = items.map((item) => ({
        keyword: item.keyword,
        searchVolume: item.searches,
        cpc: item.bid,
        products: item.products,
        purchases: item.purchases,
        purchaseRate: item.purchaseRate,
        bidMax: item.bidMax,
        bidMin: item.bidMin,
        monopolyClickRate: item.monopolyClickRate,
        supplyDemandRatio: item.supplyDemandRatio,
        titleDensity: item.titleDensity,
        spr: item.spr,
        adProducts: item.latest30daysAds
      }))

      return keywords
    } catch (error) {
      console.error('SellerSprite API error:', error)
      throw error
    }
  }
}

async function testEnhancedFields() {
  console.log('Testing enhanced fields from SellerSprite API...\n')
  
  const client = new SellerSpriteClientTest('f922e1475a574ae99bfb0190ec924abf')
  
  try {
    // Test reverseASIN with the ASIN you mentioned
    const asin = 'B0CZC4NSK3'
    console.log(`Fetching keywords for ASIN: ${asin}`)
    
    const keywords = await client.reverseASIN(asin, 1, 10) // Get just 10 for testing
    
    if (keywords.length > 0) {
      console.log(`\nReceived ${keywords.length} keywords`)
      console.log('\n=== First Keyword Enhanced Fields ===')
      const firstKeyword = keywords[0]
      
      console.log('Basic Fields:')
      console.log(`  keyword: ${firstKeyword.keyword}`)
      console.log(`  searchVolume: ${firstKeyword.searchVolume}`)
      console.log(`  cpc: ${firstKeyword.cpc}`)
      
      console.log('\nEnhanced Fields:')
      console.log(`  products: ${firstKeyword.products}`)
      console.log(`  purchases: ${firstKeyword.purchases}`)
      console.log(`  purchaseRate: ${firstKeyword.purchaseRate}`)
      console.log(`  bidMax: ${firstKeyword.bidMax}`)
      console.log(`  bidMin: ${firstKeyword.bidMin}`)
      console.log(`  monopolyClickRate: ${firstKeyword.monopolyClickRate}`)
      console.log(`  supplyDemandRatio: ${firstKeyword.supplyDemandRatio}`)
      console.log(`  titleDensity: ${firstKeyword.titleDensity}`)
      console.log(`  spr: ${firstKeyword.spr}`)
      console.log(`  adProducts: ${firstKeyword.adProducts}`)
      
      // Check how many keywords have enhanced fields
      const withProducts = keywords.filter(k => k.products !== undefined).length
      const withPurchases = keywords.filter(k => k.purchases !== undefined).length
      const withPurchaseRate = keywords.filter(k => k.purchaseRate !== undefined).length
      
      console.log('\n=== Enhanced Fields Coverage ===')
      console.log(`Keywords with products field: ${withProducts}/${keywords.length}`)
      console.log(`Keywords with purchases field: ${withPurchases}/${keywords.length}`)
      console.log(`Keywords with purchaseRate field: ${withPurchaseRate}/${keywords.length}`)
      
      // Show all keywords with key fields
      console.log('\n=== All Keywords Summary ===')
      keywords.forEach((kw, idx) => {
        console.log(`\nKeyword ${idx + 1}: "${kw.keyword}"`)
        console.log(`  searchVolume: ${kw.searchVolume}`)
        console.log(`  products: ${kw.products}`)
        console.log(`  purchases: ${kw.purchases}`)
        console.log(`  purchaseRate: ${kw.purchaseRate}`)
      })
      
    } else {
      console.log('No keywords returned from API')
    }
    
  } catch (error) {
    console.error('Test failed:', error.message)
    console.error(error.stack)
  }
}

// Run the test
testEnhancedFields() 