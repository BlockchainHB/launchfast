import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateAnalysisDocument } from '@/lib/document-templates'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { productId } = await request.json()

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      )
    }

    // Get authenticated user
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('DEBUG: Looking for product with ID:', productId, 'for user:', user.id)
    
    // Get product data with AI analysis using admin client to bypass RLS
    const { data: productData, error: productError } = await supabaseAdmin
      .from('products')
      .select(`
        *,
        ai_analysis (*)
      `)
      .eq('id', productId)
      .eq('user_id', user.id)  // Ensure user owns the product
      .single()

    console.log('DEBUG: Product query result:', {
      found: !!productData,
      error: productError?.message,
      hasAiAnalysis: !!productData?.ai_analysis,
      aiAnalysisArray: Array.isArray(productData?.ai_analysis),
      aiAnalysisLength: productData?.ai_analysis?.length
    })

    if (productError || !productData) {
      console.log('DEBUG: Product not found. Error:', productError)
      return NextResponse.json(
        { error: 'Product not found or no AI analysis available' },
        { status: 404 }
      )
    }

    if (!productData.ai_analysis) {
      // Generate AI analysis first if it doesn't exist
      const analysisResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/products/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          productData: {
            id: productData.id,
            asin: productData.asin,
            title: productData.title,
            brand: productData.brand,
            price: productData.price,
            bsr: productData.bsr,
            reviews: productData.reviews,
            rating: productData.rating,
            monthly_revenue: productData.monthly_revenue,
            monthly_profit: productData.monthly_profit,
            grade: productData.grade
          }
        })
      })

      if (!analysisResponse.ok) {
        return NextResponse.json(
          { error: 'Failed to generate AI analysis for this product' },
          { status: 500 }
        )
      }

      // Refetch the product with the new AI analysis
      const { data: updatedProductData, error: refetchError } = await supabase
        .from('products')
        .select(`
          *,
          ai_analysis (*)
        `)
        .eq('id', productId)
        .single()

      if (refetchError || !updatedProductData?.ai_analysis) {
        return NextResponse.json(
          { error: 'Failed to retrieve generated AI analysis' },
          { status: 500 }
        )
      }

      productData = updatedProductData
    }

    // Generate document title
    const documentTitle = `${productData.title.slice(0, 100)}${productData.title.length > 100 ? '...' : ''} - AI Analysis Report`

    // Generate HTML document
    const documentHTML = generateAnalysisDocument(
      {
        asin: productData.asin,
        title: productData.title,
        brand: productData.brand,
        price: productData.price,
        bsr: productData.bsr,
        reviews: productData.reviews,
        rating: productData.rating,
        grade: productData.grade,
        monthly_revenue: productData.monthly_revenue,
        monthly_profit: productData.monthly_profit
      },
      productData.ai_analysis
    )

    // Check if document already exists
    const { data: existingDoc } = await supabaseAdmin
      .from('analysis_documents')
      .select('id')
      .eq('ai_analysis_id', productData.ai_analysis.id)
      .single()

    let documentId: string

    if (existingDoc) {
      // Update existing document
      const { data: updatedDoc, error: updateError } = await supabaseAdmin
        .from('analysis_documents')
        .update({
          document_title: documentTitle,
          document_html: documentHTML,
          document_status: 'generated',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingDoc.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating document:', updateError)
        return NextResponse.json(
          { error: 'Failed to update analysis document' },
          { status: 500 }
        )
      }

      documentId = updatedDoc.id
    } else {
      // Create new document
      const { data: newDoc, error: insertError } = await supabaseAdmin
        .from('analysis_documents')
        .insert({
          ai_analysis_id: productData.ai_analysis.id,
          document_title: documentTitle,
          document_html: documentHTML,
          document_status: 'generated'
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error creating document:', insertError)
        return NextResponse.json(
          { error: 'Failed to create analysis document' },
          { status: 500 }
        )
      }

      documentId = newDoc.id
    }

    return NextResponse.json({
      success: true,
      documentId,
      message: 'AI Analysis document generated successfully'
    })

  } catch (error) {
    console.error('Error generating analysis document:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}