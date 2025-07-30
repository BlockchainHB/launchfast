import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - List interactions for a supplier relationship
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const supplierRelationshipId = searchParams.get('supplierRelationshipId')
    const interactionType = searchParams.get('interactionType')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 })
    }

    let query = supabase
      .from('supplier_interactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (supplierRelationshipId) {
      query = query.eq('supplier_relationship_id', supplierRelationshipId)
    }

    if (interactionType && interactionType !== 'all') {
      query = query.eq('interaction_type', interactionType)
    }

    const { data: interactions, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      data: {
        interactions: interactions || [],
        pagination: {
          limit,
          offset,
          total: interactions?.length || 0
        }
      }
    })

  } catch (error) {
    console.error('❌ Get supplier interactions error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch supplier interactions'
    }, { status: 500 })
  }
}

// POST - Create new supplier interaction
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userId,
      supplierRelationshipId,
      interactionType,
      subject,
      content,
      direction = 'outbound',
      responseTimeHours
    } = body

    // Validate required fields
    if (!userId || !supplierRelationshipId || !interactionType) {
      return NextResponse.json({
        success: false,
        error: 'User ID, supplier relationship ID, and interaction type are required'
      }, { status: 400 })
    }

    // Verify the supplier relationship belongs to the user
    const { data: relationship, error: relationshipError } = await supabase
      .from('supplier_relationships')
      .select('id')
      .eq('id', supplierRelationshipId)
      .eq('user_id', userId)
      .single()

    if (relationshipError || !relationship) {
      return NextResponse.json({
        success: false,
        error: 'Supplier relationship not found or access denied'
      }, { status: 404 })
    }

    // Create new interaction
    const { data: interaction, error } = await supabase
      .from('supplier_interactions')
      .insert({
        user_id: userId,
        supplier_relationship_id: supplierRelationshipId,
        interaction_type: interactionType,
        subject: subject,
        content: content,
        direction: direction,
        response_time_hours: responseTimeHours
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    // Update last contact date on supplier relationship
    await supabase
      .from('supplier_relationships')
      .update({
        last_contact_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', supplierRelationshipId)

    return NextResponse.json({
      success: true,
      data: {
        interaction
      }
    })

  } catch (error) {
    console.error('❌ Create supplier interaction error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create supplier interaction'
    }, { status: 500 })
  }
}

// PATCH - Update supplier interaction
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      interactionId,
      userId,
      subject,
      content,
      responseTimeHours
    } = body

    if (!interactionId || !userId) {
      return NextResponse.json({
        success: false,
        error: 'Interaction ID and User ID are required'
      }, { status: 400 })
    }

    // Build update object
    const updateData: any = {}
    if (subject !== undefined) updateData.subject = subject
    if (content !== undefined) updateData.content = content
    if (responseTimeHours !== undefined) updateData.response_time_hours = responseTimeHours

    const { data: interaction, error } = await supabase
      .from('supplier_interactions')
      .update(updateData)
      .eq('id', interactionId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      throw error
    }

    if (!interaction) {
      return NextResponse.json({
        success: false,
        error: 'Supplier interaction not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        interaction
      }
    })

  } catch (error) {
    console.error('❌ Update supplier interaction error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update supplier interaction'
    }, { status: 500 })
  }
}

// DELETE - Remove supplier interaction
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const interactionId = searchParams.get('interactionId')
    const userId = searchParams.get('userId')

    if (!interactionId || !userId) {
      return NextResponse.json({
        success: false,
        error: 'Interaction ID and User ID are required'
      }, { status: 400 })
    }

    const { error } = await supabase
      .from('supplier_interactions')
      .delete()
      .eq('id', interactionId)
      .eq('user_id', userId)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Supplier interaction deleted successfully'
    })

  } catch (error) {
    console.error('❌ Delete supplier interaction error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete supplier interaction'
    }, { status: 500 })
  }
}