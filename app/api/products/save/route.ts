import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { extractMarketKeywords } from '@/lib/market-calculations'
import { Logger } from '@/lib/logger'
import { createServerClient } from '@supabase/ssr'
// Cache removed for data accuracy
import { MarketRecalculator } from '@/lib/market-recalculator'

export async function POST(request: NextRequest) {
  try {
    const { 
      products, 
      marketAnalysis, 
      refreshMode, 
      existingMarketId, 
      researchMode, 
      targetMarketId 
    } = await request.json()

    if (!products || !Array.isArray(products)) {
      return NextResponse.json(
        { error: 'Products array is required' },
        { status: 400 }
      )
    }

    // Get authenticated user from session
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

    // Check if supabaseAdmin is configured
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database connection not configured' },
        { status: 500 }
      )
    }

    const savedProducts = []
    let savedMarket = null
    let recalculationTriggered = false
    let newProductIds = []
    let duplicateCount = 0
    
    Logger.save.start(products.length, !!marketAnalysis)
    
    // Handle adding ASINs to existing market (new ASIN research mode)
    if (researchMode === 'add-to-market' && targetMarketId) {
      console.log(`📦 Add-to-market mode: Adding ${products.length} ASIN products to existing market ${targetMarketId}`)
      
      // Validate market ownership
      const { data: targetMarket, error: marketError } = await supabaseAdmin
        .from('markets')
        .select('id, keyword, user_id')
        .eq('id', targetMarketId)
        .eq('user_id', userId)
        .single()

      if (marketError || !targetMarket) {
        return NextResponse.json(
          { error: 'Target market not found or access denied' },
          { status: 403 }
        )
      }

      // 1. Check for existing ASINs to avoid duplicates
      const asinsToCheck = products.map(p => p.asin)
      const { data: existingProducts } = await supabaseAdmin
        .from('products')
        .select('asin')
        .eq('user_id', userId)
        .in('asin', asinsToCheck)

      const existingAsins = new Set(existingProducts?.map(p => p.asin) || [])
      const newProducts = products.filter(p => !existingAsins.has(p.asin))
      duplicateCount = products.length - newProducts.length

      console.log(`📊 ASIN analysis: ${newProducts.length} new, ${duplicateCount} duplicates for market "${targetMarket.keyword}"`)

      // 2. Insert only new products linked to target market
      let insertedProducts: any[] = []
      if (newProducts.length > 0) {
        const newProductInserts = newProducts.map((product, index) => ({
          user_id: userId,
          market_id: targetMarketId,
          asin: product.asin,
          title: product.title,
          brand: product.brand || 'Unknown',
          price: product.price,
          bsr: product.bsr || null,
          reviews: product.reviews || 0,
          rating: product.rating || null,
          monthly_sales: product.salesData?.monthlySales || null,
          monthly_revenue: product.salesData?.monthlyRevenue || null,
          profit_estimate: product.salesData?.monthlyProfit || null,
          grade: product.grade ? (product.grade.toUpperCase() === 'AVOID' ? 'F1' : product.grade.substring(0, 2)) : null,
          images: product.images || [],
          dimensions: product.dimensions || {},
          reviews_data: product.reviewsData || {},
          sales_data: product.salesData || {},
          competitive_intelligence: product.competitiveIntelligence || '',
          apify_source: product.apifySource || false,
          seller_sprite_verified: product.sellerSpriteVerified || false,
          calculated_metrics: product.calculatedMetrics || {},
          is_market_representative: false,
          analysis_rank: index + 1,
          created_at: new Date().toISOString()
        }))

        const { data: insertResult, error: productError } = await supabaseAdmin
          .from('products')
          .insert(newProductInserts)
          .select()

        if (productError) {
          Logger.error('ASIN product insertion failed', productError)
          console.error('ASIN product insertion error details:', productError)
          throw new Error(`Failed to insert ASIN products: ${productError.message}`)
        }

        insertedProducts = insertResult || []
      }

      savedProducts.push(...insertedProducts)
      newProductIds = insertedProducts.map(p => p.id)

      // 3. Update market metadata with new products count
      const { data: currentMarket } = await supabaseAdmin
        .from('markets')
        .select('total_products_analyzed, products_verified')
        .eq('id', targetMarketId)
        .single()

      if (currentMarket && insertedProducts.length > 0) {
        await supabaseAdmin
          .from('markets')
          .update({
            total_products_analyzed: (currentMarket.total_products_analyzed || 0) + insertedProducts.length,
            products_verified: (currentMarket.products_verified || 0) + insertedProducts.length,
            updated_at: new Date().toISOString()
          })
          .eq('id', targetMarketId)
      }

      // 4. Trigger market recalculation with new ASIN products
      console.log(`🔄 Starting market recalculation for market ${targetMarketId} with ${insertedProducts.length} new ASINs`)
      const marketRecalculator = new MarketRecalculator()
      const recalculationResult = await marketRecalculator.recalculateMarket(
        targetMarketId,
        userId,
        `Added ${insertedProducts.length} new ASIN products`
      )

      recalculationTriggered = !!recalculationResult
      console.log(`📊 Market recalculation ${recalculationTriggered ? 'successful' : 'failed'}`)

      // 5. Get updated market for response
      const { data: updatedMarket } = await supabaseAdmin
        .from('markets')
        .select('*')
        .eq('id', targetMarketId)
        .single()

      savedMarket = updatedMarket

      // Skip normal market creation and go to response
    }
    // Handle market refresh mode - add products to existing market
    else if (refreshMode === 'refresh' && existingMarketId) {
      console.log(`🔄 Refresh mode: Adding ${products.length} products to existing market ${existingMarketId}`)
      
      // 1. Check for existing ASINs to avoid duplicates
      const asinsToCheck = products.map(p => p.asin)
      const { data: existingProducts } = await supabaseAdmin
        .from('products')
        .select('asin')
        .eq('user_id', userId)
        .in('asin', asinsToCheck)

      const existingAsins = new Set(existingProducts?.map(p => p.asin) || [])
      const newProducts = products.filter(p => !existingAsins.has(p.asin))
      duplicateCount = products.length - newProducts.length

      console.log(`📊 Product analysis: ${newProducts.length} new, ${duplicateCount} duplicates`)

      // 2. Insert only new products linked to existing market
      let insertedProducts: any[] = []
      if (newProducts.length > 0) {
        const newProductInserts = newProducts.map((product, index) => ({
          user_id: userId,
          market_id: existingMarketId,
          asin: product.asin,
          title: product.title,
          brand: product.brand || 'Unknown',
          price: product.price,
          bsr: product.bsr || null,
          reviews: product.reviews || 0,
          rating: product.rating || null,
          monthly_sales: product.salesData?.monthlySales || null,
          monthly_revenue: product.salesData?.monthlyRevenue || null,
          profit_estimate: product.salesData?.monthlyProfit || null,
          grade: product.grade ? (product.grade.toUpperCase() === 'AVOID' ? 'F1' : product.grade.substring(0, 2)) : null,
          images: product.images || [],
          dimensions: product.dimensions || {},
          reviews_data: product.reviewsData || {},
          sales_data: product.salesData || {},
          competitive_intelligence: product.competitiveIntelligence || '',
          apify_source: product.apifySource || false,
          seller_sprite_verified: product.sellerSpriteVerified || false,
          calculated_metrics: product.calculatedMetrics || {},
          is_market_representative: false, // New products don't represent the market
          analysis_rank: index + 1, // Will be recalculated
          created_at: new Date().toISOString()
        }))

        const { data: insertResult, error: productError } = await supabaseAdmin
          .from('products')
          .insert(newProductInserts)
          .select()

        if (productError) {
          Logger.error('New product insertion failed', productError)
          console.error('Product insertion error details:', productError)
          throw new Error(`Failed to insert new products: ${productError.message}`)
        }

        insertedProducts = insertResult || []
      }

      savedProducts.push(...insertedProducts)
      newProductIds = insertedProducts.map(p => p.id)

      // 3. Update market metadata with only new products count
      const { data: currentMarket } = await supabaseAdmin
        .from('markets')
        .select('total_products_analyzed, products_verified')
        .eq('id', existingMarketId)
        .single()

      if (currentMarket && insertedProducts.length > 0) {
        await supabaseAdmin
          .from('markets')
          .update({
            total_products_analyzed: (currentMarket.total_products_analyzed || 0) + insertedProducts.length,
            products_verified: (currentMarket.products_verified || 0) + insertedProducts.length,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingMarketId)
      }

      // 3. Trigger market recalculation with new products
      console.log(`🔄 Starting market recalculation for market ${existingMarketId}`)
      const marketRecalculator = new MarketRecalculator()
      const recalculationResult = await marketRecalculator.recalculateMarket(
        existingMarketId,
        userId,
        `Added ${products.length} new products via market refresh`
      )

      recalculationTriggered = !!recalculationResult
      console.log(`📊 Market recalculation ${recalculationTriggered ? 'successful' : 'failed'}`)
      
      if (recalculationResult) {
        console.log(`✅ Recalculation result:`, {
          marketId: recalculationResult.marketId,
          keyword: recalculationResult.keyword,
          overriddenProducts: recalculationResult.overriddenProductCount,
          newGrade: recalculationResult.recalculatedData.market_grade
        })
      }

      // 4. Get updated market for response
      const { data: updatedMarket } = await supabaseAdmin
        .from('markets')
        .select('*')
        .eq('id', existingMarketId)
        .single()

      savedMarket = updatedMarket

      // Skip normal market creation and go to product relationships
    } 
    // Normal market creation mode
    else if (marketAnalysis) {
      Logger.save.marketAnalysisStart(marketAnalysis.keyword)
      
      const marketPayload = {
        user_id: userId,
        keyword: marketAnalysis.keyword,
        search_filters: marketAnalysis.search_filters || {},
        
        // Market Statistics (Averaged) - Ensure proper types
        avg_price: Math.round(marketAnalysis.avg_price || 0),
        avg_monthly_sales: Math.round(marketAnalysis.avg_monthly_sales || 0),
        avg_monthly_revenue: Math.round(marketAnalysis.avg_monthly_revenue || 0),
        avg_reviews: Math.round(marketAnalysis.avg_reviews || 0),
        avg_rating: parseFloat((marketAnalysis.avg_rating || 0).toFixed(2)),
        avg_bsr: Math.round(marketAnalysis.avg_bsr || 0),
        avg_profit_margin: parseFloat((marketAnalysis.avg_profit_margin || 0).toFixed(4)),
        avg_cpc: parseFloat((marketAnalysis.avg_cpc || 0).toFixed(2)),
        avg_daily_revenue: Math.round(marketAnalysis.avg_daily_revenue || 0),
        avg_launch_budget: Math.round(marketAnalysis.avg_launch_budget || 0),
        avg_profit_per_unit: parseFloat((marketAnalysis.avg_profit_per_unit || 0).toFixed(2)),
        
        // Market-Level Analysis
        market_grade: marketAnalysis.market_grade,
        market_consistency_rating: marketAnalysis.market_consistency_rating,
        market_risk_classification: marketAnalysis.market_risk_classification,
        total_products_analyzed: marketAnalysis.total_products_analyzed,
        products_verified: marketAnalysis.products_verified,
        
        // Market Intelligence
        market_competitive_intelligence: marketAnalysis.market_competitive_intelligence,
        market_trends: marketAnalysis.market_trends || {},
        opportunity_score: marketAnalysis.opportunity_score,
        
        research_date: new Date().toISOString()
      }

      const { data: marketData, error: marketError } = await supabaseAdmin
        .from('markets')
        .insert(marketPayload)
        .select()
        .single()

      if (marketError) {
        Logger.error('Market save failed', marketError)
        throw new Error('Failed to save market analysis')
      }

      savedMarket = marketData
      Logger.save.marketSaved(marketData.id)
    }
    
    // BATCH OPTIMIZATION: Replace 66 individual calls with 4 batch operations
    Logger.dev.trace(`Starting batch save for ${products.length} products`)
    
    try {
      // 1. Batch insert products (1 call instead of N calls)
      const productPayloads = products.map((product, index) => ({
        user_id: userId,
        asin: product.asin,
        title: product.title,
        brand: product.brand || 'Unknown',
        price: product.price,
        bsr: product.bsr || null,
        reviews: product.reviews || 0,
        rating: product.rating || null,
        monthly_sales: product.salesData?.monthlySales || null,
        monthly_revenue: product.salesData?.monthlyRevenue || null,
        profit_estimate: product.salesData?.monthlyProfit || null,
        grade: product.grade ? (product.grade.toUpperCase() === 'AVOID' ? 'F1' : product.grade.substring(0, 2)) : null,
        images: product.images || [],
        dimensions: product.dimensions || {},
        reviews_data: product.reviewsData || {},
        sales_data: product.salesData || {},
        competitive_intelligence: product.competitiveIntelligence || '',
        apify_source: product.apifySource || false,
        seller_sprite_verified: product.sellerSpriteVerified || false,
        calculated_metrics: product.calculatedMetrics || {},
        market_id: savedMarket?.id || null,
        is_market_representative: index === 0,
        analysis_rank: index + 1
      }))

      const { data: batchSavedProducts, error: batchProductError } = await supabaseAdmin
        .from('products')
        .upsert(productPayloads, { onConflict: 'user_id,asin' })
        .select()

      if (batchProductError) {
        Logger.error('Batch product save failed', batchProductError)
        throw new Error('Failed to save products in batch')
      }

      savedProducts.push(...batchSavedProducts)
      Logger.save.productsBatchSaved(batchSavedProducts.length)

      // 2. Batch insert AI analyses (1 call instead of N calls)
      console.log('DEBUG: First product aiAnalysis structure:', JSON.stringify(products[0]?.aiAnalysis, null, 2))
      console.log('DEBUG: First product keys:', Object.keys(products[0] || {}))
      
      const aiAnalysesPayloads = batchSavedProducts
        .map((savedProduct, index) => {
          const product = products[index]
          console.log(`DEBUG: Product ${index} aiAnalysis exists:`, !!product.aiAnalysis)
          return product.aiAnalysis ? {
            user_id: userId,
            product_id: savedProduct.id,
            risk_classification: product.aiAnalysis.riskClassification,
            consistency_rating: product.aiAnalysis.consistencyRating,
            estimated_dimensions: product.aiAnalysis.estimatedDimensions,
            estimated_weight: product.aiAnalysis.estimatedWeight,
            opportunity_score: product.aiAnalysis.opportunityScore,
            market_insights: product.aiAnalysis.marketInsights,
            risk_factors: product.aiAnalysis.riskFactors
          } : null
        })
        .filter(Boolean)

      if (aiAnalysesPayloads.length > 0) {
        const { error: aiError } = await supabaseAdmin
          .from('ai_analysis')
          .upsert(aiAnalysesPayloads, { onConflict: 'product_id' })

        if (aiError) {
          Logger.warn('Batch AI analysis save failed')
        } else {
          Logger.save.aiAnalysesBatchSaved(aiAnalysesPayloads.length)
        }
      }

      // 3. Batch insert unique keywords (1 call instead of N×M calls)
      const allKeywords = []
      const productKeywordMappings = []

      batchSavedProducts.forEach((savedProduct, productIndex) => {
        const product = products[productIndex]
        if (product.keywords && product.keywords.length > 0) {
          product.keywords.slice(0, 10).forEach(keyword => {
            // Collect unique keywords
            if (!allKeywords.some(k => k.keyword === keyword.keyword)) {
              allKeywords.push({
                user_id: userId,
                keyword: keyword.keyword,
                search_volume: keyword.searchVolume,
                competition_score: keyword.competitionScore,
                avg_cpc: keyword.cpc
              })
            }
            
            // Map product-keyword relationships (we'll resolve IDs after keyword insert)
            productKeywordMappings.push({
              product_id: savedProduct.id,
              keyword: keyword.keyword,
              ranking_position: keyword.rankingPosition,
              traffic_percentage: keyword.trafficPercentage
            })
          })
        }
      })

      let keywordIdMap = {}
      if (allKeywords.length > 0) {
        const { data: batchSavedKeywords, error: keywordError } = await supabaseAdmin
          .from('keywords')
          .upsert(allKeywords, { onConflict: 'keyword' })
          .select('id, keyword')

        if (keywordError) {
          Logger.warn('Batch keyword save failed')
        } else {
          // Create keyword mapping for relationships
          keywordIdMap = batchSavedKeywords.reduce((acc, kw) => {
            acc[kw.keyword] = kw.id
            return acc
          }, {})
          Logger.save.keywordsBatchSaved(batchSavedKeywords.length)
        }
      }

      // 4. Batch insert product-keyword relationships (1 call instead of N×M calls)
      if (productKeywordMappings.length > 0 && Object.keys(keywordIdMap).length > 0) {
        const productKeywordRelations = productKeywordMappings
          .map(mapping => ({
            product_id: mapping.product_id,
            keyword_id: keywordIdMap[mapping.keyword],
            ranking_position: mapping.ranking_position,
            traffic_percentage: mapping.traffic_percentage
          }))
          .filter(relation => relation.keyword_id) // Only include valid keyword IDs

        if (productKeywordRelations.length > 0) {
          const { error: relationError } = await supabaseAdmin
            .from('product_keywords')
            .upsert(productKeywordRelations, { onConflict: 'product_id,keyword_id' })

          if (relationError) {
            Logger.warn('Batch product-keyword relation save failed')
          } else {
            Logger.save.productKeywordRelationsBatchSaved(productKeywordRelations.length)
          }
        }
      }

      Logger.save.batchSaveCompleted(products.length, allKeywords.length, productKeywordMappings.length)

    } catch (error) {
      Logger.error('Batch save operation failed', error)
      // Fallback to individual saves if batch fails
      Logger.warn('Falling back to individual saves')
      
      for (const product of products) {
        try {
          // Original individual save logic as fallback...
          Logger.dev.trace(`Fallback: Processing product: ${product.asin}`)
          const productPayload = {
            user_id: userId,
            asin: product.asin,
            title: product.title,
            brand: product.brand || 'Unknown',
            price: product.price,
            bsr: product.bsr || null,
            reviews: product.reviews || 0,
            rating: product.rating || null,
            monthly_sales: product.salesData?.monthlySales || null,
            monthly_revenue: product.salesData?.monthlyRevenue || null,
            profit_estimate: product.salesData?.monthlyProfit || null,
            grade: product.grade ? (product.grade.toUpperCase() === 'AVOID' ? 'F1' : product.grade.substring(0, 2)) : null,
            images: product.images || [],
            dimensions: product.dimensions || {},
            reviews_data: product.reviewsData || {},
            sales_data: product.salesData || {},
            competitive_intelligence: product.competitiveIntelligence || '',
            apify_source: product.apifySource || false,
            seller_sprite_verified: product.sellerSpriteVerified || false,
            calculated_metrics: product.calculatedMetrics || {},
            market_id: savedMarket?.id || null,
            is_market_representative: products.indexOf(product) === 0,
            analysis_rank: products.indexOf(product) + 1
          }

          const { data: productData, error: productError } = await supabaseAdmin
            .from('products')
            .upsert(productPayload)
            .select()
            .single()

          if (productError) {
            Logger.error('Fallback product save failed', productError)
            continue
          }

          savedProducts.push(productData)
          Logger.save.productSaved(product.asin)

        } catch (fallbackError) {
          Logger.error('Fallback save failed', fallbackError)
          continue
        }
      }
    }

    // If market was saved, extract and save market keywords
    if (savedMarket && marketAnalysis) {
      try {
        const marketKeywords = extractMarketKeywords(products, savedMarket.id, marketAnalysis.keyword)
        if (marketKeywords.length > 0) {
          await supabaseAdmin
            .from('market_keywords')
            .insert(marketKeywords)
          Logger.save.marketKeywordsSaved(marketKeywords.length)
        }
      } catch (error) {
        Logger.warn('Market keywords save failed')
        // Continue without failing the entire operation
      }
    }

    // No cache invalidation needed - dashboard shows real-time data

    const response: any = {
      success: true,
      message: refreshMode === 'refresh' 
        ? `Successfully added ${savedProducts.length} new products to existing market${duplicateCount > 0 ? ` (${duplicateCount} duplicates skipped)` : ''}`
        : savedMarket 
          ? `Successfully saved market analysis and ${savedProducts.length} products`
          : `Successfully saved ${savedProducts.length} products`,
      count: savedProducts.length,
      products: savedProducts,
      // Refresh mode specific data
      mode: refreshMode || 'new',
      newProductsAdded: refreshMode === 'refresh' ? savedProducts.length : 0,
      duplicatesSkipped: duplicateCount,
      totalProductsAttempted: products.length,
      totalProducts: refreshMode === 'refresh' && savedMarket ? savedMarket.total_products_analyzed : savedProducts.length,
      recalculationTriggered,
      marketGrade: savedMarket?.market_grade,
      // Override-aware data
      hasOverrides: recalculationTriggered,
      overrideReason: recalculationTriggered ? `Added ${savedProducts.length} new products via market refresh` : null
    }

    if (savedMarket) {
      response.market = savedMarket
    }

    return NextResponse.json(response)

  } catch (error) {
    Logger.error('Save products API', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to save products',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET method to fetch user's saved products
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user from session
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

    // Fetch user's products with keywords and AI analysis joined
    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select(`
        *,
        product_keywords(
          ranking_position,
          traffic_percentage,
          keywords(
            keyword,
            search_volume,
            competition_score,
            avg_cpc
          )
        ),
        ai_analysis(
          risk_classification,
          consistency_rating,
          estimated_dimensions,
          estimated_weight,
          opportunity_score,
          market_insights,
          risk_factors
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (productsError) {
      throw productsError
    }

    // Transform products to match DataTable expected format
    const transformedProducts = products?.map(product => ({
      id: product.id,
      asin: product.asin,
      title: product.title,
      brand: product.brand,
      price: product.price,
      bsr: product.bsr,
      reviews: product.reviews,
      rating: product.rating,
      grade: product.grade,
      images: product.images || [],
      dimensions: product.dimensions || {},
      reviewsData: product.reviews_data || {},
      // Map database fields to expected salesData structure
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
      // Create aiAnalysis from actual database data
      aiAnalysis: product.ai_analysis ? {
        riskClassification: product.ai_analysis.risk_classification,
        consistencyRating: product.ai_analysis.consistency_rating,
        estimatedDimensions: product.ai_analysis.estimated_dimensions,
        estimatedWeight: product.ai_analysis.estimated_weight,
        opportunityScore: product.ai_analysis.opportunity_score,
        marketInsights: product.ai_analysis.market_insights || [],
        riskFactors: product.ai_analysis.risk_factors || []
      } : null,
      keywords: product.product_keywords?.map(pk => ({
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
    })) || []

    return NextResponse.json({
      success: true,
      data: transformedProducts,
      count: transformedProducts.length
    })

  } catch (error) {
    Logger.error('Get products API', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch products',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}