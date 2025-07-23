import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Get analysis documents with related data
    const { data: documents, error } = await supabase
      .from('analysis_documents')
      .select(`
        *,
        ai_analysis (
          *,
          products (
            asin,
            title,
            grade,
            price,
            reviews,
            rating
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching analysis documents:', error)
      return NextResponse.json(
        { error: 'Failed to fetch analysis documents' },
        { status: 500 }
      )
    }

    // Transform the data for frontend consumption
    const transformedDocuments = documents?.map(doc => ({
      id: doc.id,
      ai_analysis_id: doc.ai_analysis_id,
      document_title: doc.document_title,
      document_html: doc.document_html,
      document_status: doc.document_status,
      created_at: doc.created_at,
      updated_at: doc.updated_at,
      ai_analysis: {
        risk_classification: doc.ai_analysis?.risk_classification,
        consistency_rating: doc.ai_analysis?.consistency_rating,
        opportunity_score: doc.ai_analysis?.opportunity_score,
        market_insights: doc.ai_analysis?.market_insights,
        risk_factors: doc.ai_analysis?.risk_factors,
        product: doc.ai_analysis?.products ? {
          asin: doc.ai_analysis.products.asin,
          title: doc.ai_analysis.products.title,
          grade: doc.ai_analysis.products.grade,
          price: doc.ai_analysis.products.price,
          reviews: doc.ai_analysis.products.reviews,
          rating: doc.ai_analysis.products.rating
        } : null
      }
    })) || []

    return NextResponse.json({
      success: true,
      documents: transformedDocuments
    })

  } catch (error) {
    console.error('Error in analysis documents API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}