/**
 * Test HTML parsing with actual Alibaba structure
 */

const fs = require('fs')
const path = require('path')

// Import our scraper class (we'll need to adapt this for CommonJS)
// For now, let's test the patterns directly

function testHTMLParsing() {
  console.log('🧪 Testing HTML parsing with actual Alibaba structure')
  console.log('=' .repeat(60))

  try {
    // Read the landing page HTML
    const landingPagePath = path.join(__dirname, 'AliBaba Structure', 'landing-page.html')
    const landingPageHTML = fs.readFileSync(landingPagePath, 'utf8')
    
    console.log(`📄 Loaded landing page HTML: ${landingPageHTML.length} characters`)

    // Test our extraction patterns
    console.log('\n🔍 Testing supplier card extraction patterns...')

    // Pattern 1: Product cards with supplier info
    const cardPattern1 = /<div[^>]*style="[^"]*display:flex[^"]*"[^>]*>[\s\S]*?alt="gold supplier"[\s\S]*?<\/div>/gi
    const matches1 = landingPageHTML.match(cardPattern1) || []
    console.log(`📦 Pattern 1 (gold supplier cards): ${matches1.length} matches`)

    // Pattern 2: Company/supplier specific sections  
    const cardPattern2 = /<div[^>]*data-company-id="[^"]*"[^>]*>[\s\S]*?<\/div>/gi
    const matches2 = landingPageHTML.match(cardPattern2) || []
    console.log(`🏢 Pattern 2 (company data): ${matches2.length} matches`)

    // Pattern 3: Product offer items with supplier data
    const cardPattern3 = /<a[^>]*href="[^"]*product-detail[^"]*"[^>]*>[\s\S]*?yrs[\s\S]*?CN[\s\S]*?<\/a>/gi
    const matches3 = landingPageHTML.match(cardPattern3) || []
    console.log(`🔗 Pattern 3 (product links with supplier info): ${matches3.length} matches`)

    const allMatches = [...matches1, ...matches2, ...matches3]
    console.log(`📊 Total supplier cards found: ${allMatches.length}`)

    if (allMatches.length > 0) {
      console.log('\n🔍 Testing data extraction from first match...')
      const firstMatch = allMatches[0]
      
      // Test company name extraction
      const companyPatterns = [
        /href="[^"]*\.m\.en\.alibaba\.com[^"]*"[^>]*>([^<]+)</i,
        /<a[^>]*target="_blank"[^>]*rel="noreferrer"[^>]*>([^<]+)<\/a>/i,
        /([A-Za-z0-9\s&.,Ltd]+(?:Co\.|Ltd\.|Inc\.|Corp\.|Company)[^<]*)/i
      ]
      
      let companyName = 'Unknown Company'
      for (const pattern of companyPatterns) {
        const match = firstMatch.match(pattern)
        if (match && match[1]) {
          const name = match[1].replace(/<[^>]*>/g, '').trim()
          if (name.length > 5 && !name.toLowerCase().includes('view more')) {
            companyName = name
            break
          }
        }
      }
      console.log(`🏢 Company name: "${companyName}"`)

      // Test years in business extraction
      const yearPatterns = [/(\d+)\s*yrs?/i, /(\d+)\s*years?/i]
      let yearsInBusiness = 0
      for (const pattern of yearPatterns) {
        const match = firstMatch.match(pattern)
        if (match && match[1]) {
          yearsInBusiness = parseInt(match[1])
          break
        }
      }
      console.log(`📅 Years in business: ${yearsInBusiness}`)

      // Test gold supplier detection
      const isGoldSupplier = firstMatch.includes('alt="gold supplier"') || firstMatch.toLowerCase().includes('gold supplier')
      console.log(`⭐ Gold supplier: ${isGoldSupplier}`)

      // Test country extraction
      const countryMatch = firstMatch.match(/CN|US|UK|DE|FR|IT|ES|IN|JP|KR|TH|VN|MY|SG/i)
      const country = countryMatch ? countryMatch[0] : 'Unknown'
      console.log(`🌍 Country: ${country}`)

      console.log('\n📋 Sample HTML snippet:')
      console.log(firstMatch.substring(0, 300) + '...')
    }

    // Test with item details page too
    console.log('\n' + '='.repeat(60))
    console.log('📄 Testing item details page...')
    
    const itemDetailsPath = path.join(__dirname, 'AliBaba Structure', 'item-details-page.html')
    const itemDetailsHTML = fs.readFileSync(itemDetailsPath, 'utf8')
    console.log(`📄 Loaded item details HTML: ${itemDetailsHTML.length} characters`)

    // Look for company name in item details
    const companyLinkPattern = /href="[^"]*\.m\.en\.alibaba\.com[^"]*"[^>]*>([^<]+)<\/a>/gi
    const companyMatches = itemDetailsHTML.match(companyLinkPattern) || []
    console.log(`🏢 Company links found: ${companyMatches.length}`)
    
    if (companyMatches.length > 0) {
      const companyMatch = companyMatches[0].match(/>([^<]+)<\/a>/)
      if (companyMatch) {
        console.log(`🏢 Company from item details: "${companyMatch[1]}"`)
      }
    }

    // Check for trade assurance
    const tradeAssuranceMatches = itemDetailsHTML.match(/trade.assurance/gi) || []
    console.log(`🛡️ Trade Assurance mentions: ${tradeAssuranceMatches.length}`)

    console.log('\n✅ HTML parsing test completed successfully!')
    return true

  } catch (error) {
    console.error('❌ HTML parsing test failed:', error.message)
    return false
  }
}

// Run the test
testHTMLParsing()