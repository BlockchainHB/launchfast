import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Get specific supplier relationship with full details
export async function GET(request: NextRequest, context: { params: { id: string } }) {
  try {
    const relationshipId = context.params.id
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 })
    }

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
      .eq('user_id', userId)
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