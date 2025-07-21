import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Reuse the same data fetching logic from dashboard API
import { supabaseAdmin } from '@/lib/supabase'
import { mergeProductsWithOverrides, mergeMarketsWithOverrides, type ProductOverride, type MarketOverride } from '@/lib/product-overrides'

interface ExportParams {
  type: 'products' | 'markets' | 'combined'
  format?: 'csv'
  includeOverrides?: boolean
}

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
        },
      }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - please login' },
        { status: 401 }
      )
    }

    const userId = user.id
    const { searchParams } = new URL(request.url)
    const exportType = searchParams.get('type') || 'products'
    const includeOverrides = searchParams.get('includeOverrides') !== 'false'

    console.log(`📊 Starting CSV export for user ${userId}, type: ${exportType}`)

    // Fetch the same data as dashboard (with overrides already applied)
    const [marketsWithProducts, legacyProducts, productOverrides, marketOverrides] = await Promise.all([
      fetchMarketsWithProducts(userId),
      fetchLegacyProducts(userId),
      fetchUserProductOverrides(userId),
      fetchUserMarketOverrides(userId)
    ])

    // Apply overrides (same logic as dashboard)
    const marketsWithOverriddenProducts = marketsWithProducts.map(market => ({
      ...market,
      products: mergeProductsWithOverrides(market.products, productOverrides)
    }))

    const legacyProductsWithOverrides = mergeProductsWithOverrides(legacyProducts, productOverrides)
    const marketsWithAllOverrides = mergeMarketsWithOverrides(marketsWithOverriddenProducts, marketOverrides)

    let csvContent = ''
    let filename = ''

    switch (exportType) {
      case 'products':
        const allProducts = [
          ...marketsWithAllOverrides.flatMap(market => 
            market.products.map(product => ({ ...product, marketKeyword: market.keyword, marketId: market.id, marketGrade: market.market_grade }))
          ),
          ...legacyProductsWithOverrides.map(product => ({ ...product, marketKeyword: '', marketId: '', marketGrade: '' }))
        ]
        csvContent = generateProductsCSV(allProducts, includeOverrides)
        filename = `launchfast-products-${new Date().toISOString().split('T')[0]}.csv`
        break

      case 'markets':
        csvContent = generateMarketsCSV(marketsWithAllOverrides, includeOverrides)
        filename = `launchfast-markets-${new Date().toISOString().split('T')[0]}.csv`
        break

      case 'combined':
        csvContent = generateCombinedCSV(marketsWithAllOverrides, legacyProductsWithOverrides, includeOverrides)
        filename = `launchfast-complete-${new Date().toISOString().split('T')[0]}.csv`
        break

      default:
        return NextResponse.json({ error: 'Invalid export type' }, { status: 400 })
    }

    // Return CSV file
    const headers = new Headers({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    })

    return new NextResponse(csvContent, { headers })

  } catch (error) {
    console.error('❌ CSV Export error:', error)
    return NextResponse.json(
      { error: 'Failed to export CSV', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * Generate Products CSV - All products with market context
 */
function generateProductsCSV(products: any[], includeOverrides: boolean): string {
  const headers = [
    '🆔 Product ID',
    '🏷️ ASIN',
    '📦 Product Title',
    '🏢 Brand',
    '💰 Price ($)',
    '📊 BSR Rank',
    '⭐ Review Count',
    '🌟 Rating (5★)',
    '🎯 Grade',
    '📈 Monthly Sales',
    '💵 Monthly Revenue ($)',
    '💸 Monthly Profit ($)',
    '📊 Profit Margin (%)',
    '📅 Daily Revenue ($)',
    '🚀 Launch Budget ($)',
    '💰 Profit/Unit After Launch ($)',
    '⚠️ Risk Level',
    '📊 Consistency',
    '🎯 Opportunity Score',
    '🔑 Market Keyword',
    '🏆 Market Grade',
    '💳 Avg CPC ($)',
    '⚖️ Weight (lbs)',
    '📏 Dimensions (LxWxH)',
    '🔄 Variations',
    '📦 FBA Fees ($)',
    '🏭 COGS ($)',
    '🔍 Competitive Intel',
    '🔤 Keywords',
    '🤖 Apify Source',
    '✅ SellerSprite Verified',
    '📅 Created Date',
    '🔄 Last Updated'
  ]

  if (includeOverrides) {
    headers.push('Has Overrides', 'Override Reason')
  }

  const rows = products.map(product => {
    const keywordsText = product.keywords ? 
      product.keywords.map((kw: any) => `${kw.keyword} (${kw.cpc || 0} CPC)`).join('; ') : ''

    const dimensions = product.dimensions ? 
      `${product.dimensions.length || 0}x${product.dimensions.width || 0}x${product.dimensions.height || 0} ${product.dimensions.unit || ''}` : ''

    // Format currency values
    const formatCurrency = (val: number) => val ? `$${val.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '$0.00'
    const formatPercent = (val: number) => val ? `${(val * 100).toFixed(1)}%` : '0.0%'
    const formatNumber = (val: number) => val ? val.toLocaleString('en-US') : '0'
    
    // Add visual indicators for grades and risk
    const gradeWithIndicator = product.grade ? 
      (product.grade.startsWith('A') ? `🟢 ${product.grade}` : 
       product.grade.startsWith('B') ? `🟡 ${product.grade}` :
       product.grade.startsWith('C') ? `🟠 ${product.grade}` : `🔴 ${product.grade}`) : ''
    
    const riskWithIndicator = product.aiAnalysis?.riskClassification ? 
      (product.aiAnalysis.riskClassification === 'Low Risk' ? `🟢 ${product.aiAnalysis.riskClassification}` :
       product.aiAnalysis.riskClassification === 'Medium Risk' ? `🟡 ${product.aiAnalysis.riskClassification}` : 
       `🔴 ${product.aiAnalysis.riskClassification}`) : ''

    const row = [
      product.id || '',
      product.asin || '',
      `"${(product.title || '').replace(/"/g, '""')}"`, // Escape quotes in CSV
      product.brand || 'Unknown',
      formatCurrency(product.price || 0),
      formatNumber(product.bsr || 0),
      formatNumber(product.reviews || 0),
      product.rating ? `${product.rating.toFixed(1)} ⭐` : '0.0 ⭐',
      gradeWithIndicator,
      formatNumber(product.salesData?.monthlySales || product.monthly_sales || 0),
      formatCurrency(product.salesData?.monthlyRevenue || product.monthly_revenue || 0),
      formatCurrency(product.salesData?.monthlyProfit || product.profit_estimate || 0),
      formatPercent(product.salesData?.margin || 0),
      formatCurrency(product.calculatedMetrics?.dailyRevenue || 0),
      formatCurrency(product.calculatedMetrics?.launchBudget || 0),
      formatCurrency(product.calculatedMetrics?.profitPerUnitAfterLaunch || 0),
      riskWithIndicator,
      product.aiAnalysis?.consistencyRating || 'Unknown',
      product.aiAnalysis?.opportunityScore || 0,
      product.marketKeyword || 'Standalone Product',
      product.marketGrade || '',
      product.keywords?.length > 0 ? 
        formatCurrency((product.keywords.reduce((sum: number, kw: any) => sum + (kw.cpc || 0), 0) / product.keywords.length)) : '$0.00',
      product.calculatedMetrics?.weight || product.dimensions?.weight || 0,
      dimensions || 'Not Available',
      formatNumber(product.calculatedMetrics?.variations || 0),
      formatCurrency(product.calculatedMetrics?.fulfillmentFees || 0),
      formatCurrency(product.salesData?.cogs || 0),
      `"${(product.competitiveIntelligence || 'No intelligence available').replace(/"/g, '""')}"`,
      `"${keywordsText.replace(/"/g, '""') || 'No keywords available'}"`,
      product.apifySource ? '✅ Yes' : '❌ No',
      product.sellerSpriteVerified ? '✅ Yes' : '❌ No',
      product.createdAt ? new Date(product.createdAt).toLocaleDateString('en-US') : '',
      product.updatedAt ? new Date(product.updatedAt).toLocaleDateString('en-US') : ''
    ]

    if (includeOverrides) {
      row.push(
        product.hasOverrides ? 'Yes' : 'No',
        `"${(product.overrideInfo?.override_reason || '').replace(/"/g, '""')}"`
      )
    }

    return row.join(',')
  })

  // Add professional header with export info
  const exportInfo = [
    `# LaunchFast Amazon Product Analysis Export`,
    `# Generated: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} EST`,
    `# Products: ${products.length} total`,
    `# Override Data: ${includeOverrides ? 'Included' : 'Not included'}`,
    `# 🟢 = A/B Grade (Good) | 🟡 = B Grade (Fair) | 🟠 = C Grade (Caution) | 🔴 = D/F Grade (Avoid)`,
    `#`,
    ``
  ].join('\n')
  
  return [exportInfo, headers.join(','), ...rows].join('\n')
}

/**
 * Generate Markets CSV - Market summaries with aggregated data
 */
function generateMarketsCSV(markets: any[], includeOverrides: boolean): string {
  const headers = [
    '🆔 Market ID',
    '🔑 Market Keyword',
    '🏆 Market Grade',
    '🎯 Opportunity Score',
    '📅 Research Date',
    '📦 Products Analyzed',
    '✅ Products Verified',
    '📊 Market Consistency',
    '⚠️ Market Risk Level',
    '💰 Avg Price ($)',
    '📈 Avg Monthly Sales',
    '💵 Avg Monthly Revenue ($)',
    '📊 Avg Profit Margin (%)',
    '⭐ Avg Reviews',
    '🌟 Avg Rating (5★)',
    '📊 Avg BSR',
    '💳 Avg CPC ($)',
    '📅 Avg Daily Revenue ($)',
    '🚀 Avg Launch Budget ($)',
    '💰 Avg Profit/Unit ($)',
    '🔍 Market Intelligence',
    '📅 Created Date'
  ]

  if (includeOverrides) {
    headers.push('Has Overrides')
  }

  const rows = markets.map(market => {
    // Reuse formatting functions
    const formatCurrency = (val: number) => val ? `$${val.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '$0.00'
    const formatPercent = (val: number) => val ? `${(val * 100).toFixed(1)}%` : '0.0%'
    const formatNumber = (val: number) => val ? val.toLocaleString('en-US') : '0'
    
    // Add visual indicators for market grades and risk
    const marketGradeWithIndicator = market.market_grade ? 
      (market.market_grade.startsWith('A') ? `🟢 ${market.market_grade}` : 
       market.market_grade.startsWith('B') ? `🟡 ${market.market_grade}` :
       market.market_grade.startsWith('C') ? `🟠 ${market.market_grade}` : `🔴 ${market.market_grade}`) : ''
    
    const marketRiskWithIndicator = market.market_risk_classification ? 
      (market.market_risk_classification === 'Low Risk' ? `🟢 ${market.market_risk_classification}` :
       market.market_risk_classification === 'Medium Risk' ? `🟡 ${market.market_risk_classification}` : 
       `🔴 ${market.market_risk_classification}`) : ''

    const row = [
      market.id || '',
      `"${market.keyword || ''}"`,
      marketGradeWithIndicator,
      market.opportunity_score || 0,
      market.research_date ? new Date(market.research_date).toLocaleDateString('en-US') : '',
      formatNumber(market.total_products_analyzed || 0),
      formatNumber(market.products_verified || 0),
      market.market_consistency_rating || 'Unknown',
      marketRiskWithIndicator,
      formatCurrency(market.avg_price || 0),
      formatNumber(market.avg_monthly_sales || 0),
      formatCurrency(market.avg_monthly_revenue || 0),
      formatPercent(market.avg_profit_margin || 0),
      formatNumber(market.avg_reviews || 0),
      market.avg_rating ? `${market.avg_rating.toFixed(1)} ⭐` : '0.0 ⭐',
      formatNumber(market.avg_bsr || 0),
      formatCurrency(market.avg_cpc || 0),
      formatCurrency(market.avg_daily_revenue || 0),
      formatCurrency(market.avg_launch_budget || 0),
      formatCurrency(market.avg_profit_per_unit || 0),
      `"${(market.market_competitive_intelligence || 'No market intelligence available').replace(/"/g, '""')}"`,
      market.research_date ? new Date(market.research_date).toLocaleDateString('en-US') : ''
    ]

    if (includeOverrides) {
      row.push(market.hasOverrides ? 'Yes' : 'No')
    }

    return row.join(',')
  })

  // Add professional header with export info
  const exportInfo = [
    `# LaunchFast Amazon Market Analysis Export`,
    `# Generated: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} EST`,
    `# Markets: ${markets.length} total`,
    `# Override Data: ${includeOverrides ? 'Included' : 'Not included'}`,
    `# 🟢 = A/B Grade (Excellent) | 🟡 = B Grade (Good) | 🟠 = C Grade (Fair) | 🔴 = D/F Grade (Poor)`,
    `#`,
    ``
  ].join('\n')
  
  return [exportInfo, headers.join(','), ...rows].join('\n')
}

/**
 * Generate Combined CSV - Markets with their products as sub-rows
 */
function generateCombinedCSV(markets: any[], legacyProducts: any[], includeOverrides: boolean): string {
  const headers = [
    '📋 Entry Type',
    '🔑 Market Keyword',
    '🏆 Market Grade',
    '💵 Market Revenue ($)',
    '🏷️ Product ASIN',
    '📦 Product Title',
    '🎯 Product Grade',
    '💰 Product Price ($)',
    '💵 Product Revenue ($)',
    '💸 Product Profit ($)',
    '⚠️ Risk Level',
    '📅 Date Added'
  ]

  const rows: string[] = []

  // Add market rows with their products
  markets.forEach(market => {
    // Market header row
    rows.push([
      'Market',
      market.keyword || '',
      market.market_grade || '',
      market.avg_monthly_revenue || 0,
      '',
      '',
      '',
      '',
      '',
      '',
      market.market_risk_classification || '',
      market.research_date || ''
    ].join(','))

    // Product rows for this market
    market.products.forEach((product: any) => {
      rows.push([
        'Product',
        market.keyword || '',
        market.market_grade || '',
        market.avg_monthly_revenue || 0,
        product.asin || '',
        `"${(product.title || '').replace(/"/g, '""')}"`,
        product.grade || '',
        product.price || 0,
        product.salesData?.monthlyRevenue || product.monthly_revenue || 0,
        product.salesData?.monthlyProfit || product.profit_estimate || 0,
        product.aiAnalysis?.riskClassification || '',
        product.createdAt || ''
      ].join(','))
    })
  })

  // Add standalone products
  legacyProducts.forEach(product => {
    rows.push([
      'Standalone Product',
      '',
      '',
      '',
      product.asin || '',
      `"${(product.title || '').replace(/"/g, '""')}"`,
      product.grade || '',
      product.price || 0,
      product.salesData?.monthlyRevenue || product.monthly_revenue || 0,
      product.salesData?.monthlyProfit || product.profit_estimate || 0,
      product.aiAnalysis?.riskClassification || '',
      product.createdAt || ''
    ].join(','))
  })

  // Add professional header with export info
  const exportInfo = [
    `# LaunchFast Combined Amazon Analysis Export`,
    `# Generated: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} EST`,
    `# Markets: ${markets.length} | Standalone Products: ${legacyProducts.length}`,
    `# This report shows markets with their products + standalone products`,
    `# 🟢 = A/B Grade (Excellent) | 🟡 = B Grade (Good) | 🟠 = C Grade (Fair) | 🔴 = D/F Grade (Poor)`,
    `#`,
    ``
  ].join('\n')

  return [exportInfo, headers.join(','), ...rows].join('\n')
}

// Reuse data fetching functions from dashboard API
async function fetchMarketsWithProducts(userId: string) {
  const { data: markets, error } = await supabaseAdmin
    .from('markets')
    .select(`
      *,
      products(
        *,
        ai_analysis(*),
        product_keywords(
          ranking_position,
          traffic_percentage,
          keywords(*)
        )
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Markets fetch error:', error)
    return []
  }

  return (markets || []).map(market => ({
    ...market,
    products: (market.products || []).map(transformProduct)
  }))
}

async function fetchLegacyProducts(userId: string) {
  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select(`
      *,
      ai_analysis(*),
      product_keywords(
        ranking_position,
        traffic_percentage,
        keywords(*)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Products fetch error:', error)
    return []
  }

  return (products || []).map(transformProduct)
}

function transformProduct(product: any) {
  return {
    id: product.id,
    asin: product.asin,
    title: product.title,
    brand: product.brand || 'Unknown',
    price: product.price,
    bsr: product.bsr,
    reviews: product.reviews,
    rating: product.rating,
    grade: product.grade,
    images: product.images || [],
    dimensions: product.dimensions || {},
    reviewsData: product.reviews_data || {},
    
    salesData: {
      monthlyRevenue: product.monthly_revenue,
      monthlySales: product.monthly_sales,
      monthlyProfit: product.profit_estimate,
      margin: product.sales_data?.margin || 0,
      ppu: product.sales_data?.ppu || 0,
      fbaCost: product.sales_data?.fbaCost || 0,
      cogs: product.sales_data?.cogs || 0,
      ...(product.sales_data || {})
    },
    
    aiAnalysis: product.ai_analysis ? {
      riskClassification: product.ai_analysis.risk_classification,
      consistencyRating: product.ai_analysis.consistency_rating,
      estimatedDimensions: product.ai_analysis.estimated_dimensions,
      estimatedWeight: product.ai_analysis.estimated_weight,
      opportunityScore: product.ai_analysis.opportunity_score,
      marketInsights: product.ai_analysis.market_insights || [],
      riskFactors: product.ai_analysis.risk_factors || []
    } : null,
    
    keywords: product.product_keywords?.map((pk: any) => ({
      keyword: pk.keywords?.keyword || '',
      searchVolume: pk.keywords?.search_volume || 0,
      rankingPosition: pk.ranking_position || 0,
      trafficPercentage: pk.traffic_percentage || 0,
      cpc: pk.keywords?.avg_cpc || 0,
      competitionScore: pk.keywords?.competition_score || 0
    })) || [],
    
    calculatedMetrics: product.calculated_metrics || {},
    competitiveIntelligence: product.competitive_intelligence || '',
    apifySource: product.apify_source || false,
    sellerSpriteVerified: product.seller_sprite_verified || false,
    createdAt: product.created_at,
    updatedAt: product.updated_at
  }
}

async function fetchUserProductOverrides(userId: string): Promise<ProductOverride[]> {
  const { data: overrides, error } = await supabaseAdmin
    .from('product_overrides')
    .select('*')
    .eq('user_id', userId)

  return overrides || []
}

async function fetchUserMarketOverrides(userId: string): Promise<MarketOverride[]> {
  const { data: overrides, error } = await supabaseAdmin
    .from('market_overrides')
    .select('*')
    .eq('user_id', userId)

  return overrides || []
}