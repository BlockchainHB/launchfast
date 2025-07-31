import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface BatchSaveRequest {
  userId: string
  suppliers: any[]
  searchContext: {
    searchQuery: string
    searchSource: 'market_research' | 'direct_search'
    marketId?: string
    keyword?: string
    marketContext?: {
      marketGrade: string
      estimatedProfit: number
      competitionLevel: string
    }
  }
  batchName?: string
  existingBatchId?: string // Optional: add to existing batch
}

// POST - Batch save supplier relationships with context
export async function POST(request: NextRequest) {
  try {
    const body: BatchSaveRequest = await request.json()
    const { userId, suppliers, searchContext, batchName, existingBatchId } = body

    // Validate required fields
    if (!userId || !suppliers?.length || !searchContext?.searchQuery) {
      return NextResponse.json({
        success: false,
        error: 'User ID, suppliers array, and search context are required'
      }, { status: 400 })
    }

    console.log(`🔄 Starting batch save: ${suppliers.length} suppliers for user ${userId}`)
    console.log(`📊 Search context:`, searchContext)
    console.log(`📦 Existing batch ID:`, existingBatchId)

    let batchId: string
    let finalBatchName: string
    let saveBatch: any

    if (existingBatchId) {
      // Use existing batch
      const { data: existingBatch, error: fetchError } = await supabase
        .from('supplier_save_batches')
        .select('*')
        .eq('id', existingBatchId)
        .eq('user_id', userId)
        .single()

      if (fetchError || !existingBatch) {
        console.warn(`❌ Existing batch ${existingBatchId} not found, creating new batch`)
        // Fall back to creating new batch
        batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        finalBatchName = batchName || generateBatchName(searchContext)
      } else {
        batchId = existingBatchId
        finalBatchName = existingBatch.batch_name
        saveBatch = existingBatch
        console.log(`✅ Using existing batch: ${batchId} - "${finalBatchName}"`)
      }
    } else {
      // Create new batch
      batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      finalBatchName = batchName || generateBatchName(searchContext)
    }

    // Create new batch if needed
    if (!saveBatch) {
      const { data: newBatch, error: batchError } = await supabase
        .from('supplier_save_batches')
        .insert({
          id: batchId,
          user_id: userId,
          market_id: searchContext.marketId || null,
          keyword: searchContext.keyword || null,
          search_query: searchContext.searchQuery,
          search_source: searchContext.searchSource,
          batch_name: finalBatchName,
          total_suppliers_saved: suppliers.length,
          market_context: searchContext.marketContext || null
        })
        .select()
        .single()

      if (batchError) {
        console.error('❌ Failed to create save batch:', batchError)
        throw batchError
      }

      saveBatch = newBatch
      console.log(`✅ Created save batch: ${batchId} - "${finalBatchName}"`)
    }

    // Prepare supplier relationships data
    const relationships = []
    const skippedSuppliers = []

    for (const supplier of suppliers) {
      // Check if relationship already exists
      const { data: existing } = await supabase
        .from('supplier_relationships')
        .select('id, supplier_name')
        .eq('user_id', userId)
        .eq('supplier_id', supplier.id)
        .single()

      if (existing) {
        skippedSuppliers.push({
          supplierId: supplier.id,
          supplierName: supplier.companyName,
          reason: 'Already exists'
        })
        continue
      }

      // Prepare relationship data with full supplier intelligence
      const relationshipData = {
        user_id: userId,
        supplier_id: supplier.id,
        supplier_name: supplier.companyName || supplier.title,
        save_batch_id: batchId,
        alibaba_url: supplier.productUrl,
        pipeline_stage: 'prospects',
        location_country: supplier.location?.country,
        location_city: supplier.location?.city,
        business_type: supplier.businessType,
        years_in_business: supplier.yearsInBusiness,
        gold_supplier: supplier.trust?.goldSupplier || false,
        trade_assurance: supplier.trust?.tradeAssurance || supplier.metrics?.tradeAssurance || false,
        quality_score: supplier.qualityScore?.overall || supplier.qualityScore,
        moq: supplier.moq || supplier.minOrderQuantity || supplier.metrics?.minOrderQuantity,
        tags: [],
        internal_notes: `Saved from ${searchContext.searchSource === 'market_research' ? 'market research' : 'direct search'}: "${searchContext.searchQuery}"`,
        
        // Pricing data
        unit_price: supplier.pricing?.unitPrice || supplier.pricing?.priceRange?.min,
        price_currency: supplier.pricing?.currency || 'USD',
        price_min: supplier.pricing?.priceRange?.min,
        price_max: supplier.pricing?.priceRange?.max,
        payment_terms: supplier.pricing?.paymentTerms || [],
        
        // Alibaba ratings and performance
        alibaba_rating: supplier.trust?.rating,
        review_count: supplier.trust?.customerReviews,
        response_rate: supplier.metrics?.responseRate,
        on_time_delivery: supplier.metrics?.onTimeDelivery,
        
        // Additional supplier metrics
        supplier_assessment: supplier.quality?.supplierAssessment,
        transaction_level: supplier.metrics?.transactionLevel,
        trade_assurance_amount: supplier.trust?.tradeAssuranceAmount,
        main_products: supplier.products?.mainProducts || [],
        total_products: supplier.products?.totalProducts,
        certifications: supplier.quality?.certifications || [],
        established_year: supplier.establishedYear,
        employees_range: supplier.employees,
        annual_revenue_range: supplier.annualRevenue,
        export_percentage: supplier.exportPercentage,
        
        // Enhanced contact and business info
        contact_email: supplier.contact?.email,
        contact_phone: supplier.contact?.phone,
        whatsapp: supplier.contact?.whatsapp,
        trade_manager: supplier.contact?.tradeManager,
        website_url: supplier.contact?.website,
        company_profile: supplier.companyProfile,
        average_lead_time: supplier.metrics?.averageLeadTime,
        
        // Market context fields
        market_id: searchContext.marketId || null,
        profit_projection: searchContext.marketContext?.estimatedProfit || null,
        market_grade: searchContext.marketContext?.marketGrade || null
      }

      relationships.push(relationshipData)
    }

    // Batch insert supplier relationships
    let savedRelationships = []
    if (relationships.length > 0) {
      const { data: insertedRelationships, error: relationshipsError } = await supabase
        .from('supplier_relationships')
        .insert(relationships)
        .select()

      if (relationshipsError) {
        console.error('❌ Failed to save supplier relationships:', relationshipsError)
        throw relationshipsError
      }

      savedRelationships = insertedRelationships || []
      console.log(`✅ Saved ${savedRelationships.length} supplier relationships`)

      // Create a single batch interaction log instead of individual logs
      if (savedRelationships.length > 0) {
        await supabase
          .from('supplier_interactions')
          .insert({
            user_id: userId,
            supplier_relationship_id: savedRelationships[0].id, // Use first supplier as reference
            interaction_type: 'note',
            subject: 'Batch Save Completed',
            content: `Saved ${savedRelationships.length} suppliers from ${searchContext.searchSource === 'market_research' ? 'market research' : 'direct search'} to batch: "${finalBatchName}"`,
            direction: 'internal'
          })
      }
    }

    // Update batch with final count (increment if existing batch)
    if (existingBatchId && saveBatch) {
      // Increment existing count
      await supabase
        .from('supplier_save_batches')
        .update({
          total_suppliers_saved: (saveBatch.total_suppliers_saved || 0) + savedRelationships.length,
          suppliers_skipped: (saveBatch.suppliers_skipped || 0) + skippedSuppliers.length,
          updated_at: new Date().toISOString()
        })
        .eq('id', batchId)
    } else {
      // Set initial count for new batch
      await supabase
        .from('supplier_save_batches')
        .update({
          total_suppliers_saved: savedRelationships.length,
          suppliers_skipped: skippedSuppliers.length
        })
        .eq('id', batchId)
    }

    return NextResponse.json({
      success: true,
      data: {
        batchId,
        batchName: finalBatchName,
        savedCount: savedRelationships.length,
        skippedCount: skippedSuppliers.length,
        skippedSuppliers,
        searchContext: searchContext
      }
    })

  } catch (error) {
    console.error('❌ Batch save supplier relationships error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to batch save supplier relationships'
    }, { status: 500 })
  }
}

// Helper function to generate batch names
function generateBatchName(searchContext: BatchSaveRequest['searchContext']): string {
  const date = new Date().toLocaleDateString('en-US', { 
    month: 'short', 
    year: 'numeric' 
  })
  
  if (searchContext.searchSource === 'market_research' && searchContext.keyword) {
    // Market-driven: "Bluetooth Speaker Market - Jan 2024"
    return `${searchContext.keyword} Market - ${date}`
  } else {
    // Direct search: "Bluetooth Speaker Search - Jan 2024"
    return `${searchContext.searchQuery} Search - ${date}`
  }
}

// GET - List save batches for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 })
    }

    const { data: batches, error } = await supabase
      .from('supplier_save_batches')
      .select(`
        *,
        supplier_relationships (
          id,
          supplier_name,
          pipeline_stage,
          created_at
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      data: {
        batches: batches || [],
        pagination: {
          limit,
          offset,
          total: batches?.length || 0
        }
      }
    })

  } catch (error) {
    console.error('❌ Get save batches error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch save batches'
    }, { status: 500 })
  }
}