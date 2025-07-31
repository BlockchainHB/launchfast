import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Fetch user's supplier relationships with comprehensive data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const pipelineStage = searchParams.get('pipelineStage')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const searchQuery = searchParams.get('search')
    const batchId = searchParams.get('batchId')
    const marketId = searchParams.get('marketId')
    const groupBy = searchParams.get('groupBy')

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 })
    }

    console.log(`🔄 Fetching supplier relationships for user ${userId}`)
    console.log(`📊 Filters - Stage: ${pipelineStage}, Search: ${searchQuery}, Batch: ${batchId}, Market: ${marketId}, GroupBy: ${groupBy}`)

    // Handle groupBy requests for project management
    if (groupBy === 'market' || groupBy === 'batch') {
      return handleGroupByRequest(supabase, userId, groupBy)
    }

    // Build query with proper joins and filtering
    let query = supabase
      .from('supplier_relationships')
      .select(`
        *,
        supplier_save_batches (
          id,
          batch_name,
          search_source,
          search_query,
          keyword,
          market_context,
          total_suppliers_saved,
          created_at
        ),
        markets (
          id,
          keyword,
          market_grade,
          avg_profit_per_unit,
          market_risk_classification,
          avg_monthly_revenue,
          opportunity_score
        ),
        sample_requests (
          id,
          product_name,
          request_status,
          total_cost,
          created_at
        ),
        supplier_interactions (
          id,
          interaction_type,
          subject,
          created_at
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    // Apply filters
    if (pipelineStage && pipelineStage !== 'all') {
      query = query.eq('pipeline_stage', pipelineStage)
    }

    if (batchId) {
      query = query.eq('save_batch_id', batchId)
    }

    if (marketId) {
      query = query.eq('market_id', marketId)  
    }

    if (searchQuery) {
      query = query.or(`supplier_name.ilike.%${searchQuery}%,tags.cs.["${searchQuery}"]`)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: relationships, error } = await query

    if (error) {
      console.error('❌ Database error:', error)
      throw error
    }

    // Calculate pipeline statistics from the filtered relationships (not all user suppliers)
    const stats = {
      prospects: relationships?.filter(s => s.pipeline_stage === 'prospects').length || 0,
      contacted: relationships?.filter(s => s.pipeline_stage === 'contacted').length || 0,
      negotiating: relationships?.filter(s => s.pipeline_stage === 'negotiating').length || 0,
      sampling: relationships?.filter(s => s.pipeline_stage === 'sampling').length || 0,
      partners: relationships?.filter(s => s.pipeline_stage === 'partners').length || 0,
      total: relationships?.length || 0
    }

    

    // Fetch recent activities for the current project context
    let recentActivities = []
    try {
      // First get supplier relationship IDs for the current project
      const supplierIds = relationships?.map(rel => rel.id) || []
      
      if (supplierIds.length > 0) {
        const { data: activities } = await supabase
          .from('supplier_interactions')
          .select(`
            id,
            interaction_type,
            subject,
            content,
            created_at,
            supplier_relationship_id,
            supplier_relationships!inner (
              id,
              supplier_name
            )
          `)
          .in('supplier_relationship_id', supplierIds)
          .order('created_at', { ascending: false })
          .limit(5)

        recentActivities = activities?.map(activity => ({
          id: activity.id,
          interactionType: activity.interaction_type,
          subject: activity.subject,
          content: activity.content,
          supplierName: activity.supplier_relationships?.supplier_name || 'Unknown Supplier',
          timestamp: activity.created_at,
          relativeTime: getRelativeTime(activity.created_at)
        }) || []

      }

    } catch (activityError) {
      console.warn('❌ Failed to fetch recent activities:', activityError)
      // Continue without activities rather than failing the whole request
    }

    // Transform data for component compatibility
    const supplierCards = relationships?.map(rel => ({
      id: rel.id,
      supplierId: rel.supplier_id,
      companyName: rel.supplier_name,
      location: {
        city: rel.location_city || 'Unknown',
        country: rel.location_country || 'Unknown'
      },
      // Real pricing and rating data from database
      pricing: rel.unit_price || rel.price_min || rel.price_max ? {
        unitPrice: rel.unit_price,
        currency: rel.price_currency || 'USD',
        priceRange: (rel.price_min && rel.price_max) ? {
          min: rel.price_min,
          max: rel.price_max
        } : undefined
      } : undefined,
      alibabaRating: rel.alibaba_rating || rel.review_count || rel.response_rate || rel.on_time_delivery ? {
        score: rel.alibaba_rating,
        reviewCount: rel.review_count || 0,
        responseRate: rel.response_rate,
        onTimeDelivery: rel.on_time_delivery
      } : undefined,
      yearsInBusiness: rel.years_in_business || 0,
      trust: {
        goldSupplier: rel.gold_supplier || false,
        tradeAssurance: rel.trade_assurance || false
      },
      stage: rel.pipeline_stage || 'prospects',
      lastContact: rel.last_contact_date || rel.created_at,
      nextAction: getNextActionText(rel.pipeline_stage, rel.next_followup_date),
      tags: rel.tags || [],
      notes: rel.internal_notes || '',
      relationshipHealth: getRelationshipHealth(rel.relationship_health_score),
      
      // Enhanced context data
      batch: rel.supplier_save_batches ? {
        id: rel.supplier_save_batches.id,
        name: rel.supplier_save_batches.batch_name,
        searchSource: rel.supplier_save_batches.search_source,
        searchQuery: rel.supplier_save_batches.search_query,
        keyword: rel.supplier_save_batches.keyword,
        marketContext: rel.supplier_save_batches.market_context,
        totalSuppliers: rel.supplier_save_batches.total_suppliers_saved,
        createdAt: rel.supplier_save_batches.created_at
      } : null,
      
      market: rel.markets ? {
        id: rel.markets.id,
        keyword: rel.markets.keyword,
        marketGrade: rel.markets.market_grade,
        avgProfitPerUnit: rel.markets.avg_profit_per_unit,
        riskClassification: rel.markets.market_risk_classification,
        avgMonthlyRevenue: rel.markets.avg_monthly_revenue,
        opportunityScore: rel.markets.opportunity_score
      } : null,
      
      profitProjection: rel.profit_projection,
      marketGrade: rel.market_grade,
      
      // Interaction summary
      sampleRequests: rel.sample_requests?.length || 0,
      recentInteractions: rel.supplier_interactions?.slice(0, 3) || [],
      
      // Contact information
      contact: {
        email: rel.contact_email,
        phone: rel.contact_phone,
        person: rel.contact_person
      },
      
      alibabaUrl: rel.alibaba_url,
      moq: rel.moq,
      businessType: rel.business_type,
      opportunityScore: rel.opportunity_score,
      priorityLevel: rel.priority_level,
      
      // Timestamps
      createdAt: rel.created_at,
      updatedAt: rel.updated_at
    })) || []

    console.log(`✅ Retrieved ${supplierCards.length} supplier relationships`)

    return NextResponse.json({
      success: true,
      data: {
        suppliers: supplierCards,
        stats: stats,
        recentActivities: recentActivities,
        pagination: {
          limit,
          offset,
          total: supplierCards.length
        }
      }
    })

  } catch (error) {
    console.error('❌ Get supplier relationships error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch supplier relationships'
    }, { status: 500 })
  }
}

// POST - Create new supplier relationship
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userId,
      supplierId,
      supplierName,
      alibabaUrl,
      pipelineStage = 'prospects',
      contactEmail,
      contactPhone,
      contactPerson,
      locationCountry,
      locationCity,
      businessType,
      yearsInBusiness,
      goldSupplier = false,
      tradeAssurance = false,
      qualityScore,
      moq,
      tags = [],
      internalNotes,
      marketId,
      profitProjection,
      marketGrade,
      saveBatchId,
      // New rich supplier data fields
      unitPrice,
      priceCurrency,
      priceMin,
      priceMax,
      paymentTerms,
      alibabaRating,
      reviewCount,
      responseRate,
      onTimeDelivery,
      supplierAssessment,
      transactionLevel,
      tradeAssuranceAmount,
      mainProducts,
      totalProducts,
      certifications,
      establishedYear,
      employeesRange,
      annualRevenueRange,
      exportPercentage,
      whatsapp,
      tradeManager,
      websiteUrl,
      companyProfile,
      averageLeadTime
    } = body

    // Validate required fields
    if (!userId || !supplierId || !supplierName) {
      return NextResponse.json({
        success: false,
        error: 'User ID, supplier ID, and supplier name are required'
      }, { status: 400 })
    }

    console.log(`🔄 Creating supplier relationship: ${supplierName} for user ${userId}`)

    // Check if relationship already exists
    const { data: existing } = await supabase
      .from('supplier_relationships')
      .select('id')
      .eq('user_id', userId)
      .eq('supplier_id', supplierId)
      .single()

    if (existing) {
      return NextResponse.json({
        success: false,
        error: 'Supplier relationship already exists'
      }, { status: 409 })
    }

    // Create new relationship
    const { data: relationship, error } = await supabase
      .from('supplier_relationships')
      .insert({
        user_id: userId,
        supplier_id: supplierId,
        supplier_name: supplierName,
        alibaba_url: alibabaUrl,
        pipeline_stage: pipelineStage,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        contact_person: contactPerson,
        location_country: locationCountry,
        location_city: locationCity,
        business_type: businessType,
        years_in_business: yearsInBusiness,
        gold_supplier: goldSupplier,
        trade_assurance: tradeAssurance,
        quality_score: qualityScore,
        moq: moq,
        tags: tags,
        internal_notes: internalNotes,
        market_id: marketId,
        profit_projection: profitProjection,
        market_grade: marketGrade,
        save_batch_id: saveBatchId,
        // Rich supplier data
        unit_price: unitPrice,
        price_currency: priceCurrency,
        price_min: priceMin,
        price_max: priceMax,
        payment_terms: paymentTerms,
        alibaba_rating: alibabaRating,
        review_count: reviewCount,
        response_rate: responseRate,
        on_time_delivery: onTimeDelivery,
        supplier_assessment: supplierAssessment,
        transaction_level: transactionLevel,
        trade_assurance_amount: tradeAssuranceAmount,
        main_products: mainProducts,
        total_products: totalProducts,
        certifications: certifications,
        established_year: establishedYear,
        employees_range: employeesRange,
        annual_revenue_range: annualRevenueRange,
        export_percentage: exportPercentage,
        whatsapp: whatsapp,
        trade_manager: tradeManager,
        website_url: websiteUrl,
        company_profile: companyProfile,
        average_lead_time: averageLeadTime
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Failed to create supplier relationship:', error)
      throw error
    }

    // Log initial interaction
    await supabase
      .from('supplier_interactions')
      .insert({
        user_id: userId,
        supplier_relationship_id: relationship.id,
        interaction_type: 'note',
        subject: 'Supplier Added to Pipeline',
        content: `Added ${supplierName} to ${pipelineStage} stage`,
        direction: 'internal'
      })

    console.log(`✅ Created supplier relationship: ${relationship.id}`)

    return NextResponse.json({
      success: true,
      data: relationship
    })

  } catch (error) {
    console.error('❌ Create supplier relationship error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create supplier relationship'
    }, { status: 500 })
  }
}

// PATCH - Update supplier relationship
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      relationshipId,
      userId,
      pipelineStage,
      relationshipHealthScore,
      priorityLevel,
      contactEmail,
      contactPhone,
      contactPerson,
      lastContactDate,
      nextFollowupDate,
      internalNotes,
      tags
    } = body

    if (!relationshipId || !userId) {
      return NextResponse.json({
        success: false,
        error: 'Relationship ID and User ID are required'
      }, { status: 400 })
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (pipelineStage !== undefined) updateData.pipeline_stage = pipelineStage
    if (relationshipHealthScore !== undefined) updateData.relationship_health_score = relationshipHealthScore
    if (priorityLevel !== undefined) updateData.priority_level = priorityLevel
    if (contactEmail !== undefined) updateData.contact_email = contactEmail
    if (contactPhone !== undefined) updateData.contact_phone = contactPhone
    if (contactPerson !== undefined) updateData.contact_person = contactPerson
    if (lastContactDate !== undefined) updateData.last_contact_date = lastContactDate
    if (nextFollowupDate !== undefined) updateData.next_followup_date = nextFollowupDate
    if (internalNotes !== undefined) updateData.internal_notes = internalNotes
    if (tags !== undefined) updateData.tags = tags

    const { data: relationship, error } = await supabase
      .from('supplier_relationships')
      .update(updateData)
      .eq('id', relationshipId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      throw error
    }

    if (!relationship) {
      return NextResponse.json({
        success: false,
        error: 'Supplier relationship not found'
      }, { status: 404 })
    }

    // Log the update interaction if pipeline stage changed
    if (pipelineStage) {
      await supabase
        .from('supplier_interactions')
        .insert({
          user_id: userId,
          supplier_relationship_id: relationshipId,
          interaction_type: 'status_change',
          subject: 'Pipeline Stage Updated',
          content: `Moved to ${pipelineStage} stage`,
          direction: 'internal'
        })
    }

    return NextResponse.json({
      success: true,
      data: {
        relationship
      }
    })

  } catch (error) {
    console.error('❌ Update supplier relationship error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update supplier relationship'
    }, { status: 500 })
  }
}

// DELETE - Remove supplier relationship
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const relationshipId = searchParams.get('relationshipId')
    const userId = searchParams.get('userId')

    if (!relationshipId || !userId) {
      return NextResponse.json({
        success: false,
        error: 'Relationship ID and User ID are required'
      }, { status: 400 })
    }

    const { error } = await supabase
      .from('supplier_relationships')
      .delete()
      .eq('id', relationshipId)
      .eq('user_id', userId)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Supplier relationship deleted successfully'
    })

  } catch (error) {
    console.error('❌ Delete supplier relationship error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete supplier relationship'
    }, { status: 500 })
  }
}

// Helper functions
function getNextActionText(stage: string, nextFollowupDate: string | null): string {
  if (nextFollowupDate) {
    const followupDate = new Date(nextFollowupDate)
    const now = new Date()
    if (followupDate > now) {
      return `Follow up on ${followupDate.toLocaleDateString()}`
    }
  }

  switch (stage) {
    case 'prospects':
      return 'Send initial inquiry'
    case 'contacted':
      return 'Follow up on response'
    case 'sampling':
      return 'Evaluate samples'
    case 'negotiating':
      return 'Finalize terms'
    case 'partners':
      return 'Schedule regular review'
    default:
      return 'No action required'
  }
}

function getRelationshipHealth(score: number | null): 'excellent' | 'good' | 'fair' | 'poor' {
  if (!score) return 'fair'
  if (score >= 80) return 'excellent'
  if (score >= 60) return 'good'  
  if (score >= 40) return 'fair'
  return 'poor'
}

function getRelativeTime(timestamp: string): string {
  const now = new Date()
  const past = new Date(timestamp)
  const diffInMinutes = Math.floor((now.getTime() - past.getTime()) / (1000 * 60))
  
  if (diffInMinutes < 1) return 'Just now'
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`
  
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`
  
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`
  
  const diffInWeeks = Math.floor(diffInDays / 7)
  if (diffInWeeks < 4) return `${diffInWeeks} week${diffInWeeks === 1 ? '' : 's'} ago`
  
  return past.toLocaleDateString()
}

// Handle groupBy requests for project management
async function handleGroupByRequest(supabase: any, userId: string, groupBy: string) {
  try {
    if (groupBy === 'market') {
      // Group by market_id with market info
      const { data: marketGroups, error } = await supabase
        .from('supplier_relationships')
        .select(`
          market_id,
          markets (keyword, market_grade),
          created_at
        `)
        .eq('user_id', userId)
        .not('market_id', 'is', null)

      if (error) throw error

      // Aggregate by market
      const groups = marketGroups?.reduce((acc: any, rel: any) => {
        const marketId = rel.market_id
        if (!acc[marketId]) {
          acc[marketId] = {
            market_id: marketId,
            keyword: rel.markets?.keyword || 'Unknown Market',
            market_grade: rel.markets?.market_grade,
            supplier_count: 0,
            last_activity: rel.created_at
          }
        }
        acc[marketId].supplier_count += 1
        if (rel.created_at > acc[marketId].last_activity) {
          acc[marketId].last_activity = rel.created_at
        }
        return acc
      }, {})

      return NextResponse.json({
        success: true,
        data: { groups: Object.values(groups || {}) }
      })

    } else if (groupBy === 'batch') {
      // Group by save_batch_id with batch info
      const { data: batchGroups, error } = await supabase
        .from('supplier_relationships')
        .select(`
          save_batch_id,
          supplier_save_batches (batch_name, search_source, created_at),
          created_at
        `)
        .eq('user_id', userId)
        .not('save_batch_id', 'is', null)

      if (error) throw error

      // Aggregate by batch
      const groups = batchGroups?.reduce((acc: any, rel: any) => {
        const batchId = rel.save_batch_id
        if (!acc[batchId]) {
          acc[batchId] = {
            batch_id: batchId,
            batch_name: rel.supplier_save_batches?.batch_name || 'Unknown Batch',
            supplier_count: 0,
            last_activity: rel.supplier_save_batches?.created_at || rel.created_at
          }
        }
        acc[batchId].supplier_count += 1
        if (rel.created_at > acc[batchId].last_activity) {
          acc[batchId].last_activity = rel.created_at
        }
        return acc
      }, {})

      return NextResponse.json({
        success: true,
        data: { groups: Object.values(groups || {}) }
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid groupBy parameter'
    }, { status: 400 })

  } catch (error) {
    console.error('❌ Group by request error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to group supplier relationships'
    }, { status: 500 })
  }
}