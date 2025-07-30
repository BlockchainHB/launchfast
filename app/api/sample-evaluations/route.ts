import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - List sample evaluations for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const sampleRequestId = searchParams.get('sampleRequestId')
    const finalDecision = searchParams.get('finalDecision')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 })
    }

    let query = supabase
      .from('sample_evaluations')
      .select(`
        *,
        sample_requests (
          id,
          product_name,
          supplier_relationship_id,
          supplier_relationships (
            id,
            supplier_name
          )
        )
      `)
      .eq('user_id', userId)
      .order('evaluated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (sampleRequestId) {
      query = query.eq('sample_request_id', sampleRequestId)
    }

    if (finalDecision && finalDecision !== 'all') {
      query = query.eq('final_decision', finalDecision)
    }

    const { data: evaluations, error } = await query

    if (error) {
      throw error
    }

    // Calculate summary statistics
    const { data: stats, error: statsError } = await supabase
      .from('sample_evaluations')
      .select('final_decision, overall_rating')
      .eq('user_id', userId)

    if (statsError) {
      throw statsError
    }

    const decisionStats = stats.reduce((acc: any, evaluation: any) => {
      acc[evaluation.final_decision] = (acc[evaluation.final_decision] || 0) + 1
      return acc
    }, {})

    const averageRating = stats.length > 0 ? 
      stats.reduce((sum: number, evaluation: any) => sum + (evaluation.overall_rating || 0), 0) / stats.length : 0

    return NextResponse.json({
      success: true,
      data: {
        evaluations: evaluations || [],
        pagination: {
          limit,
          offset,
          total: evaluations?.length || 0
        },
        stats: {
          total: stats.length,
          byDecision: decisionStats,
          averageRating: Math.round(averageRating * 100) / 100
        }
      }
    })

  } catch (error) {
    console.error('❌ Get sample evaluations error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch sample evaluations'
    }, { status: 500 })
  }
}

// POST - Create new sample evaluation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userId,
      sampleRequestId,
      overallRating,
      qualityRating,
      designRating,
      materialsRating,
      packagingRating,
      functionalityRating,
      evaluationNotes,
      pros = [],
      cons = [],
      finalDecision,
      decisionReason,
      wouldOrderAgain,
      recommendedImprovements
    } = body

    // Validate required fields
    if (!userId || !sampleRequestId || !overallRating || !finalDecision) {
      return NextResponse.json({
        success: false,
        error: 'User ID, sample request ID, overall rating, and final decision are required'
      }, { status: 400 })
    }

    // Verify the sample request belongs to the user
    const { data: sampleRequest, error: sampleError } = await supabase
      .from('sample_requests')
      .select('id, supplier_relationship_id, product_name')
      .eq('id', sampleRequestId)
      .eq('user_id', userId)
      .single()

    if (sampleError || !sampleRequest) {
      return NextResponse.json({
        success: false,
        error: 'Sample request not found or access denied'
      }, { status: 404 })
    }

    // Check if evaluation already exists
    const { data: existingEvaluation } = await supabase
      .from('sample_evaluations')
      .select('id')
      .eq('sample_request_id', sampleRequestId)
      .eq('user_id', userId)
      .single()

    if (existingEvaluation) {
      return NextResponse.json({
        success: false,
        error: 'Sample evaluation already exists for this request'
      }, { status: 409 })
    }

    // Create new sample evaluation
    const { data: evaluation, error } = await supabase
      .from('sample_evaluations')
      .insert({
        user_id: userId,
        sample_request_id: sampleRequestId,
        overall_rating: overallRating,
        quality_rating: qualityRating,
        design_rating: designRating,
        materials_rating: materialsRating,
        packaging_rating: packagingRating,
        functionality_rating: functionalityRating,
        evaluation_notes: evaluationNotes,
        pros: pros,
        cons: cons,
        final_decision: finalDecision,
        decision_reason: decisionReason,
        would_order_again: wouldOrderAgain,
        recommended_improvements: recommendedImprovements
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    // Update sample request status to evaluated
    await supabase
      .from('sample_requests')
      .update({
        request_status: 'evaluated',
        updated_at: new Date().toISOString()
      })
      .eq('id', sampleRequestId)

    // Log the evaluation interaction
    await supabase
      .from('supplier_interactions')
      .insert({
        user_id: userId,
        supplier_relationship_id: sampleRequest.supplier_relationship_id,
        interaction_type: 'note',
        subject: `Sample Evaluated: ${sampleRequest.product_name}`,
        content: `Sample evaluation completed - Decision: ${finalDecision} (${overallRating}/5 stars)`,
        direction: 'internal'
      })

    return NextResponse.json({
      success: true,
      data: {
        evaluation
      }
    })

  } catch (error) {
    console.error('❌ Create sample evaluation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create sample evaluation'
    }, { status: 500 })
  }
}

// PATCH - Update sample evaluation
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      evaluationId,
      userId,
      overallRating,
      qualityRating,
      designRating,
      materialsRating,
      packagingRating,
      functionalityRating,
      evaluationNotes,
      pros,
      cons,
      finalDecision,
      decisionReason,
      wouldOrderAgain,
      recommendedImprovements
    } = body

    if (!evaluationId || !userId) {
      return NextResponse.json({
        success: false,
        error: 'Evaluation ID and User ID are required'
      }, { status: 400 })
    }

    // Build update object
    const updateData: any = {}
    if (overallRating !== undefined) updateData.overall_rating = overallRating
    if (qualityRating !== undefined) updateData.quality_rating = qualityRating
    if (designRating !== undefined) updateData.design_rating = designRating
    if (materialsRating !== undefined) updateData.materials_rating = materialsRating
    if (packagingRating !== undefined) updateData.packaging_rating = packagingRating
    if (functionalityRating !== undefined) updateData.functionality_rating = functionalityRating
    if (evaluationNotes !== undefined) updateData.evaluation_notes = evaluationNotes
    if (pros !== undefined) updateData.pros = pros
    if (cons !== undefined) updateData.cons = cons
    if (finalDecision !== undefined) updateData.final_decision = finalDecision
    if (decisionReason !== undefined) updateData.decision_reason = decisionReason
    if (wouldOrderAgain !== undefined) updateData.would_order_again = wouldOrderAgain
    if (recommendedImprovements !== undefined) updateData.recommended_improvements = recommendedImprovements

    const { data: evaluation, error } = await supabase
      .from('sample_evaluations')
      .update(updateData)
      .eq('id', evaluationId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      throw error
    }

    if (!evaluation) {
      return NextResponse.json({
        success: false,
        error: 'Sample evaluation not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        evaluation
      }
    })

  } catch (error) {
    console.error('❌ Update sample evaluation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update sample evaluation'
    }, { status: 500 })
  }
}

// DELETE - Remove sample evaluation
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const evaluationId = searchParams.get('evaluationId')
    const userId = searchParams.get('userId')

    if (!evaluationId || !userId) {
      return NextResponse.json({
        success: false,
        error: 'Evaluation ID and User ID are required'
      }, { status: 400 })
    }

    // Get the sample request ID to update its status
    const { data: evaluation } = await supabase
      .from('sample_evaluations')
      .select('sample_request_id')
      .eq('id', evaluationId)
      .eq('user_id', userId)
      .single()

    const { error } = await supabase
      .from('sample_evaluations')
      .delete()
      .eq('id', evaluationId)
      .eq('user_id', userId)

    if (error) {
      throw error
    }

    // Update sample request status back to received
    if (evaluation) {
      await supabase
        .from('sample_requests')
        .update({
          request_status: 'received',
          updated_at: new Date().toISOString()
        })
        .eq('id', evaluation.sample_request_id)
    }

    return NextResponse.json({
      success: true,
      message: 'Sample evaluation deleted successfully'
    })

  } catch (error) {
    console.error('❌ Delete sample evaluation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete sample evaluation'
    }, { status: 500 })
  }
}