// Test script to verify opportunities data structure
const { createServerClient } = require('@supabase/ssr')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

async function testOpportunitiesDisplay() {
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get() { return '' },
        set() {},
        remove() {}
      }
    }
  )
  
  // Test session ID from the logs
  const sessionId = 'a7a5c53c-decc-48ec-b8d1-97a30a0f17f0'
  
  try {
    // Fetch opportunities data
    const { data: opportunities, error: oppError } = await supabase
      .from('keyword_opportunities')
      .select('*')
      .eq('session_id', sessionId)
      .order('search_volume', { ascending: false })
      .limit(10)
    
    if (oppError) {
      console.error('Error fetching opportunities:', oppError)
      return
    }
    
    console.log('\n=== OPPORTUNITIES DATA TEST ===')
    console.log('Total opportunities fetched:', opportunities.length)
    console.log('\nSample opportunity structure:')
    if (opportunities.length > 0) {
      console.log(JSON.stringify(opportunities[0], null, 2))
    }
    
    // Check for required fields
    console.log('\n=== FIELD VALIDATION ===')
    const requiredFields = [
      'keyword',
      'search_volume',
      'competition_score',
      'avg_cpc',
      'opportunity_type'
    ]
    
    const firstOpp = opportunities[0]
    if (firstOpp) {
      requiredFields.forEach(field => {
        console.log(`${field}: ${firstOpp[field] !== undefined && firstOpp[field] !== null ? '✓' : '✗'} (${firstOpp[field]})`)
      })
    }
    
    // Check opportunity types distribution
    console.log('\n=== OPPORTUNITY TYPES ===')
    const typeDistribution = opportunities.reduce((acc, opp) => {
      const type = opp.opportunity_type || 'unknown'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {})
    console.log(typeDistribution)
    
    // Fetch ASIN keywords to test matching
    const { data: keywords, error: kwError } = await supabase
      .from('asin_keywords')
      .select('keyword, asin')
      .eq('session_id', sessionId)
      .limit(20)
    
    if (!kwError && keywords) {
      console.log('\n=== KEYWORD MATCHING TEST ===')
      const opportunityKeywords = opportunities.map(o => o.keyword.toLowerCase())
      const asinKeywords = keywords.map(k => k.keyword.toLowerCase())
      
      const matchingKeywords = asinKeywords.filter(k => opportunityKeywords.includes(k))
      console.log('Total ASIN keywords:', asinKeywords.length)
      console.log('Matching with opportunities:', matchingKeywords.length)
      console.log('Sample matches:', matchingKeywords.slice(0, 5))
    }
    
  } catch (error) {
    console.error('Test error:', error)
  }
}

testOpportunitiesDisplay() 