import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// GET - Get specific supplier relationship with full details
export async function GET(request: NextRequest, context: { params: { id: string } }) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {},
          remove() {},
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const relationshipId = context.params.id

    // Get relationship with all related data
    const { data: relationship, error } = await supabase
      .from('supplier_relationships')
      .select(`
        *,
        sample_requests (
          id,
          product_name,
          quantity_requested,
          total_cost,
          request_status,
          expected_delivery_date,
          actual_delivery_date,
          created_at,
          sample_evaluations (
            id,
            overall_rating,
            final_decision,
            evaluated_at
          )
        ),
        supplier_interactions (
          id,
          interaction_type,
          subject,
          content,
          direction,
          response_time_hours,
          created_at
        ),
        supplier_documents (
          id,
          document_type,
          file_name,
          file_size,
          description,
          uploaded_at
        )
      `)
      .eq('id', relationshipId)
      .eq('user_id', user.id)
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

    // Calculate relationship metrics
    const interactions = relationship.supplier_interactions || []
    const samples = relationship.sample_requests || []
    
    const metrics = {
      totalInteractions: interactions.length,
      lastInteractionDate: interactions.length > 0 ? interactions[0].created_at : null,
      averageResponseTime: interactions
        .filter(i => i.response_time_hours)
        .reduce((sum, i) => sum + i.response_time_hours, 0) / 
        interactions.filter(i => i.response_time_hours).length || null,
      totalSamples: samples.length,
      activeSamples: samples.filter(s => ['requested', 'shipped', 'received'].includes(s.request_status)).length,
      evaluatedSamples: samples.filter(s => s.sample_evaluations?.length > 0).length,
      totalSampleCost: samples.reduce((sum, s) => sum + (s.total_cost || 0), 0)
    }

    return NextResponse.json({
      success: true,
      data: {
        relationship,
        metrics
      }
    })

  } catch (error) {
    console.error('❌ Get supplier relationship details error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch supplier relationship details'
    }, { status: 500 })
  }
}

// PATCH - Update supplier relationship
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {},
          remove() {},
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const relationshipId = params.id
    const body = await request.json()
    const {
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

    console.log(`🔄 Updating supplier relationship ${relationshipId}`)

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
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('❌ Database error:', error)
      throw error
    }

    if (!relationship) {
      return NextResponse.json({
        success: false,
        error: 'Supplier relationship not found'
      }, { status: 404 })
    }

    // Log the update interaction
    const interactionContent = []
    if (pipelineStage) interactionContent.push(`Moved to ${pipelineStage} stage`)
    if (tags) interactionContent.push(`Updated tags: ${tags.join(', ')}`)
    if (internalNotes) interactionContent.push('Updated notes')
    if (relationshipHealthScore) interactionContent.push(`Updated relationship health: ${relationshipHealthScore}`)

    if (interactionContent.length > 0) {
      await supabase
        .from('supplier_interactions')
        .insert({
          user_id: user.id,
          supplier_relationship_id: relationshipId,
          interaction_type: pipelineStage ? 'status_change' : 'note',
          subject: pipelineStage ? 'Pipeline Stage Updated' : 'Supplier Updated',
          content: interactionContent.join('; '),
          direction: 'internal'
        })
    }

    console.log(`✅ Updated supplier relationship: ${relationshipId}`)

    return NextResponse.json({
      success: true,
      data: relationship
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
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {},
          remove() {},
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const relationshipId = params.id

    console.log(`🔄 Deleting supplier relationship ${relationshipId}`)

    const { error } = await supabase
      .from('supplier_relationships')
      .delete()
      .eq('id', relationshipId)
      .eq('user_id', user.id)

    if (error) {
      console.error('❌ Database error:', error)
      throw error
    }

    console.log(`✅ Deleted supplier relationship: ${relationshipId}`)

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