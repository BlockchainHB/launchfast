import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - List sample requests for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const supplierRelationshipId = searchParams.get('supplierRelationshipId')
    const requestStatus = searchParams.get('requestStatus')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 })
    }

    let query = supabase
      .from('sample_requests')
      .select(`
        *,
        supplier_relationships (
          id,
          supplier_name,
          pipeline_stage
        ),
        sample_evaluations (
          id,
          overall_rating,
          final_decision,
          evaluated_at
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Filter by supplier relationship if provided
    if (supplierRelationshipId) {
      query = query.eq('supplier_relationship_id', supplierRelationshipId)
    }

    // Filter by request status if provided
    if (requestStatus && requestStatus !== 'all') {
      query = query.eq('request_status', requestStatus)
    }

    const { data: sampleRequests, error } = await query

    if (error) {
      throw error
    }

    // Calculate summary statistics
    const { data: stats, error: statsError } = await supabase
      .from('sample_requests')
      .select('request_status, total_cost')
      .eq('user_id', userId)

    if (statsError) {
      throw statsError
    }

    const statusStats = stats.reduce((acc: any, req: any) => {
      acc[req.request_status] = (acc[req.request_status] || 0) + 1
      return acc
    }, {})

    const totalInvestment = stats.reduce((sum: number, req: any) => 
      sum + (req.total_cost || 0), 0
    )

    return NextResponse.json({
      success: true,
      data: {
        sampleRequests: sampleRequests || [],
        pagination: {
          limit,
          offset,
          total: sampleRequests?.length || 0
        },
        stats: {
          total: stats.length,
          byStatus: statusStats,
          totalInvestment
        }
      }
    })

  } catch (error) {
    console.error('❌ Get sample requests error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch sample requests'
    }, { status: 500 })
  }
}

// POST - Create new sample request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userId,
      supplierRelationshipId,
      productName,
      productSpecifications,
      quantityRequested = 1,
      sampleCost,
      shippingCost,
      expectedDeliveryDate,
      requestStatus = 'planning'
    } = body

    // Validate required fields
    if (!userId || !supplierRelationshipId || !productName) {
      return NextResponse.json({
        success: false,
        error: 'User ID, supplier relationship ID, and product name are required'
      }, { status: 400 })
    }

    // Verify the supplier relationship belongs to the user
    const { data: relationship, error: relationshipError } = await supabase
      .from('supplier_relationships')
      .select('id, supplier_name')
      .eq('id', supplierRelationshipId)
      .eq('user_id', userId)
      .single()

    if (relationshipError || !relationship) {
      return NextResponse.json({
        success: false,
        error: 'Supplier relationship not found or access denied'
      }, { status: 404 })
    }

    // Calculate total cost
    const totalCost = (sampleCost || 0) + (shippingCost || 0)

    // Create new sample request
    const { data: sampleRequest, error } = await supabase
      .from('sample_requests')
      .insert({
        user_id: userId,
        supplier_relationship_id: supplierRelationshipId,
        product_name: productName,
        product_specifications: productSpecifications,
        quantity_requested: quantityRequested,
        sample_cost: sampleCost,
        shipping_cost: shippingCost,
        total_cost: totalCost,
        request_status: requestStatus,
        expected_delivery_date: expectedDeliveryDate,
        request_date: requestStatus === 'requested' ? new Date().toISOString() : null
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    // Log the sample request interaction
    await supabase
      .from('supplier_interactions')
      .insert({
        user_id: userId,
        supplier_relationship_id: supplierRelationshipId,
        interaction_type: 'sample_request',
        subject: `Sample Request: ${productName}`,
        content: `Sample request created for ${productName} (Qty: ${quantityRequested})`,
        direction: 'outbound'
      })

    return NextResponse.json({
      success: true,
      data: {
        sampleRequest
      }
    })

  } catch (error) {
    console.error('❌ Create sample request error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create sample request'
    }, { status: 500 })
  }
}

// PATCH - Update sample request
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      sampleRequestId,
      userId,
      requestStatus,
      trackingNumber,
      expectedDeliveryDate,
      actualDeliveryDate,
      sampleCost,
      shippingCost,
      evaluationNotes
    } = body

    if (!sampleRequestId || !userId) {
      return NextResponse.json({
        success: false,
        error: 'Sample request ID and User ID are required'
      }, { status: 400 })
    }

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (requestStatus !== undefined) {
      updateData.request_status = requestStatus
      
      // Auto-set dates based on status changes
      if (requestStatus === 'requested' && !updateData.request_date) {
        updateData.request_date = new Date().toISOString()
      } else if (requestStatus === 'shipped' && !updateData.shipping_date) {
        updateData.shipping_date = new Date().toISOString()
      } else if (requestStatus === 'received' && !updateData.received_date) {
        updateData.received_date = new Date().toISOString()
      }
    }

    if (trackingNumber !== undefined) updateData.tracking_number = trackingNumber
    if (expectedDeliveryDate !== undefined) updateData.expected_delivery_date = expectedDeliveryDate
    if (actualDeliveryDate !== undefined) updateData.actual_delivery_date = actualDeliveryDate
    if (evaluationNotes !== undefined) updateData.evaluation_notes = evaluationNotes

    // Recalculate total cost if costs changed
    if (sampleCost !== undefined || shippingCost !== undefined) {
      const { data: currentRequest } = await supabase
        .from('sample_requests')
        .select('sample_cost, shipping_cost')
        .eq('id', sampleRequestId)
        .single()

      const newSampleCost = sampleCost !== undefined ? sampleCost : (currentRequest?.sample_cost || 0)
      const newShippingCost = shippingCost !== undefined ? shippingCost : (currentRequest?.shipping_cost || 0)
      
      updateData.sample_cost = newSampleCost
      updateData.shipping_cost = newShippingCost
      updateData.total_cost = newSampleCost + newShippingCost
    }

    const { data: sampleRequest, error } = await supabase
      .from('sample_requests')
      .update(updateData)
      .eq('id', sampleRequestId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      throw error
    }

    if (!sampleRequest) {
      return NextResponse.json({
        success: false,
        error: 'Sample request not found'
      }, { status: 404 })
    }

    // Log status change interaction
    if (requestStatus) {
      await supabase
        .from('supplier_interactions')
        .insert({
          user_id: userId,
          supplier_relationship_id: sampleRequest.supplier_relationship_id,
          interaction_type: 'note',
          subject: 'Sample Status Update',
          content: `Sample request status changed to: ${requestStatus}`,
          direction: 'internal'
        })
    }

    return NextResponse.json({
      success: true,
      data: {
        sampleRequest
      }
    })

  } catch (error) {
    console.error('❌ Update sample request error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update sample request'
    }, { status: 500 })
  }
}

// DELETE - Remove sample request
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sampleRequestId = searchParams.get('sampleRequestId')
    const userId = searchParams.get('userId')

    if (!sampleRequestId || !userId) {
      return NextResponse.json({
        success: false,
        error: 'Sample request ID and User ID are required'
      }, { status: 400 })
    }

    const { error } = await supabase
      .from('sample_requests')
      .delete()
      .eq('id', sampleRequestId)
      .eq('user_id', userId)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Sample request deleted successfully'
    })

  } catch (error) {
    console.error('❌ Delete sample request error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete sample request'
    }, { status: 500 })
  }
}