/**
 * Direct test of Alibaba URL to debug what we're getting back
 */

const axios = require('axios')

async function testDirectAlibaba() {
  console.log('🧪 Testing direct Alibaba access')
  console.log('=' .repeat(50))

  const testUrl = 'https://www.alibaba.com/search/page?spm=a2700.prosearch.the-new-header_fy23_pc_search_bar.searchButton&SearchScene=proSearch&SearchText=bluetooth+speaker&pro=true'
  
  console.log(`🌐 Test URL: ${testUrl}`)

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0'
  }

  try {
    console.log('📤 Making request...')
    const response = await axios.get(testUrl, {
      headers,
      timeout: 30000,
      validateStatus: (status) => status < 500,
      maxRedirects: 5
    })

    console.log(`📡 Status: ${response.status}`)
    console.log(`📊 Content length: ${response.data?.length || 0}`)
    console.log(`📄 Content type: ${response.headers['content-type']}`)
    
    if (response.data) {
      // Check if we got blocked
      const isBlocked = response.data.includes('captcha') || 
                       response.data.includes('blocked') || 
                       response.data.includes('Access Denied') ||
                       response.data.includes('robot') ||
                       response.data.includes('verification')

      console.log(`🤖 Blocked/CAPTCHA detected: ${isBlocked}`)

      // Look for our expected patterns
      const hasGoldSupplier = response.data.includes('gold supplier') || response.data.includes('alt="gold supplier"')
      const hasYearsPattern = /\d+\s*yrs?/i.test(response.data)
      const hasCompanyLinks = response.data.includes('alibaba.com')
      
      console.log(`⭐ Has gold supplier mentions: ${hasGoldSupplier}`)
      console.log(`📅 Has years pattern: ${hasYearsPattern}`)
      console.log(`🏢 Has company links: ${hasCompanyLinks}`)

      // Show a sample of the content
      console.log('\n📋 Content sample (first 1000 chars):')
      console.log(response.data.substring(0, 1000))
      console.log('\n📋 Content sample (searching for product patterns):')
      
      // Look for product/supplier related content
      const productMatches = response.data.match(/product[^>]*>/gi) || []
      const supplierMatches = response.data.match(/supplier[^>]*>/gi) || []
      const offerMatches = response.data.match(/offer[^>]*>/gi) || []
      
      console.log(`🛍️ Product mentions: ${productMatches.length}`)
      console.log(`🏭 Supplier mentions: ${supplierMatches.length}`)
      console.log(`💰 Offer mentions: ${offerMatches.length}`)
      
      if (productMatches.length > 0) {
        console.log(`📦 First product match: ${productMatches[0].substring(0, 200)}`)
      }
    }

    return response.status === 200

  } catch (error) {
    console.error('❌ Request failed:', error.message)
    if (error.response) {
      console.log(`📡 Error status: ${error.response.status}`)
      console.log(`📄 Error data preview:`, error.response.data?.substring(0, 500))
    }
    return false
  }
}

testDirectAlibaba()