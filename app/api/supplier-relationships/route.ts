import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - List supplier relationships for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const pipelineStage = searchParams.get('pipelineStage')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 })
    }

    let query = supabase
      .from('supplier_relationships')
      .select(`
        *,
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
          created_at
        )
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Filter by pipeline stage if provided
    if (pipelineStage && pipelineStage !== 'all') {
      query = query.eq('pipeline_stage', pipelineStage)
    }

    const { data: relationships, error } = await query

    if (error) {
      throw error
    }

    // Calculate summary statistics
    const { data: stats, error: statsError } = await supabase
      .from('supplier_relationships')
      .select('pipeline_stage')
      .eq('user_id', userId)

    if (statsError) {
      throw statsError
    }

    const pipelineStats = stats.reduce((acc: any, rel: any) => {
      acc[rel.pipeline_stage] = (acc[rel.pipeline_stage] || 0) + 1
      return acc
    }, {})

    return NextResponse.json({
      success: true,
      data: {
        relationships: relationships || [],
        pagination: {
          limit,
          offset,
          total: relationships?.length || 0
        },
        stats: {
          total: stats.length,
          byStage: pipelineStats
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
      internalNotes
    } = body

    // Validate required fields
    if (!userId || !supplierId || !supplierName) {
      return NextResponse.json({
        success: false,
        error: 'User ID, supplier ID, and supplier name are required'
      }, { status: 400 })
    }

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
        internal_notes: internalNotes
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    // Log the creation interaction
    await supabase
      .from('supplier_interactions')
      .insert({
        user_id: userId,
        supplier_relationship_id: relationship.id,
        interaction_type: 'note',
        subject: 'Supplier Added',
        content: `Supplier "${supplierName}" added to ${pipelineStage} stage`,
        direction: 'internal'
      })

    return NextResponse.json({
      success: true,
      data: {
        relationship
      }
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