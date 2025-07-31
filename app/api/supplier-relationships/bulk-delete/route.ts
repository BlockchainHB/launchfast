import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const marketId = searchParams.get('marketId')
    const batchId = searchParams.get('batchId')

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 })
    }

    if (userId !== user.id) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized - User ID mismatch'
      }, { status: 403 })
    }

    if (!marketId && !batchId) {
      return NextResponse.json({
        success: false,
        error: 'Either marketId or batchId is required'
      }, { status: 400 })
    }

    console.log(`🔄 Bulk deleting suppliers for user ${userId}`)
    console.log(`📊 Criteria - Market: ${marketId}, Batch: ${batchId}`)

    // Build delete query based on criteria
    let deleteQuery = supabase
      .from('supplier_relationships')
      .delete()
      .eq('user_id', userId)

    if (marketId) {
      deleteQuery = deleteQuery.eq('market_id', marketId)
    }

    if (batchId) {
      deleteQuery = deleteQuery.eq('save_batch_id', batchId)
    }

    // Get count before deletion for response
    let countQuery = supabase
      .from('supplier_relationships')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)

    if (marketId) {
      countQuery = countQuery.eq('market_id', marketId)
    }

    if (batchId) {
      countQuery = countQuery.eq('save_batch_id', batchId)
    }

    const { count } = await countQuery

    // Execute the deletion
    const { error: deleteError } = await deleteQuery

    if (deleteError) {
      console.error('❌ Database deletion error:', deleteError)
      throw deleteError
    }

    // If deleting by batch, also delete the batch record
    if (batchId) {
      await supabase
        .from('supplier_save_batches')
        .delete()
        .eq('id', batchId)
        .eq('user_id', userId)
    }

    console.log(`✅ Bulk deleted ${count || 0} supplier relationships`)

    return NextResponse.json({
      success: true,
      data: {
        deletedCount: count || 0,
        criteria: { marketId, batchId }
      }
    })

  } catch (error) {
    console.error('❌ Bulk delete supplier relationships error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to bulk delete supplier relationships'
    }, { status: 500 })
  }
}