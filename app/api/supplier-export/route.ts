import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST - Export supplier data to CSV
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userId,
      exportType = 'relationships', // 'relationships', 'samples', 'evaluations'
      filters = {},
      includeInteractions = false
    } = body

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 })
    }

    let csvData = ''
    let filename = ''

    switch (exportType) {
      case 'relationships':
        const relationshipsResult = await exportSupplierRelationships(userId, filters, includeInteractions)
        csvData = relationshipsResult.csv
        filename = `supplier-relationships-${new Date().toISOString().split('T')[0]}.csv`
        break

      case 'samples':
        const samplesResult = await exportSampleRequests(userId, filters)
        csvData = samplesResult.csv
        filename = `sample-requests-${new Date().toISOString().split('T')[0]}.csv`
        break

      case 'evaluations':
        const evaluationsResult = await exportSampleEvaluations(userId, filters)
        csvData = evaluationsResult.csv
        filename = `sample-evaluations-${new Date().toISOString().split('T')[0]}.csv`
        break

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid export type'
        }, { status: 400 })
    }

    return new NextResponse(csvData, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': csvData.length.toString()
      }
    })

  } catch (error) {
    console.error('❌ Export supplier data error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to export supplier data'
    }, { status: 500 })
  }
}

async function exportSupplierRelationships(userId: string, filters: any, includeInteractions: boolean) {
  let query = supabase
    .from('supplier_relationships')
    .select(`
      *,
      sample_requests (
        id,
        product_name,
        request_status,
        total_cost
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  // Apply filters
  if (filters.pipelineStage && filters.pipelineStage !== 'all') {
    query = query.eq('pipeline_stage', filters.pipelineStage)
  }
  if (filters.goldSupplierOnly) {
    query = query.eq('gold_supplier', true)
  }
  if (filters.tradeAssuranceOnly) {
    query = query.eq('trade_assurance', true)
  }

  const { data: relationships, error } = await query

  if (error) {
    throw error
  }

  // CSV Headers
  const headers = [
    'Supplier Name',
    'Pipeline Stage',
    'Quality Score',
    'Location Country',
    'Location City',
    'Business Type',
    'Years in Business',
    'Gold Supplier',
    'Trade Assurance',
    'MOQ',
    'Contact Email',
    'Contact Phone',
    'Contact Person',
    'Priority Level',
    'Relationship Health Score',
    'Total Sample Requests',
    'Total Sample Cost',
    'Last Contact Date',
    'Next Followup Date',
    'Tags',
    'Internal Notes',
    'Created At',
    'Updated At'
  ]

  // CSV Rows
  const rows = relationships.map((rel: any) => {
    const sampleRequests = rel.sample_requests || []
    const totalSampleCost = sampleRequests.reduce((sum: number, req: any) => sum + (req.total_cost || 0), 0)

    return [
      escapeCSV(rel.supplier_name),
      escapeCSV(rel.pipeline_stage),
      rel.quality_score || '',
      escapeCSV(rel.location_country),
      escapeCSV(rel.location_city),
      escapeCSV(rel.business_type),
      rel.years_in_business || '',
      rel.gold_supplier ? 'Yes' : 'No',
      rel.trade_assurance ? 'Yes' : 'No',
      rel.moq || '',
      escapeCSV(rel.contact_email),
      escapeCSV(rel.contact_phone),
      escapeCSV(rel.contact_person),
      escapeCSV(rel.priority_level),
      rel.relationship_health_score || '',
      sampleRequests.length,
      totalSampleCost.toFixed(2),
      rel.last_contact_date || '',
      rel.next_followup_date || '',
      escapeCSV((rel.tags || []).join('; ')),
      escapeCSV(rel.internal_notes),
      rel.created_at,
      rel.updated_at
    ]
  })

  const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
  return { csv }
}

async function exportSampleRequests(userId: string, filters: any) {
  let query = supabase
    .from('sample_requests')
    .select(`
      *,
      supplier_relationships (
        supplier_name,
        pipeline_stage
      ),
      sample_evaluations (
        overall_rating,
        final_decision
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  // Apply filters
  if (filters.requestStatus && filters.requestStatus !== 'all') {
    query = query.eq('request_status', filters.requestStatus)
  }
  if (filters.supplierRelationshipId) {
    query = query.eq('supplier_relationship_id', filters.supplierRelationshipId)
  }

  const { data: samples, error } = await query

  if (error) {
    throw error
  }

  // CSV Headers
  const headers = [
    'Supplier Name',
    'Product Name',
    'Product Specifications',
    'Quantity Requested',
    'Sample Cost',
    'Shipping Cost',
    'Total Cost',
    'Request Status',
    'Tracking Number',
    'Expected Delivery Date',
    'Actual Delivery Date',
    'Request Date',
    'Shipping Date',
    'Received Date',
    'Overall Rating',
    'Final Decision',
    'Evaluation Notes',
    'Created At'
  ]

  // CSV Rows
  const rows = samples.map((sample: any) => {
    const evaluation = sample.sample_evaluations?.[0]
    const supplier = sample.supplier_relationships

    return [
      escapeCSV(supplier?.supplier_name),
      escapeCSV(sample.product_name),
      escapeCSV(sample.product_specifications),
      sample.quantity_requested,
      sample.sample_cost || '',
      sample.shipping_cost || '',
      sample.total_cost || '',
      escapeCSV(sample.request_status),
      escapeCSV(sample.tracking_number),
      sample.expected_delivery_date || '',
      sample.actual_delivery_date || '',
      sample.request_date || '',
      sample.shipping_date || '',
      sample.received_date || '',
      evaluation?.overall_rating || '',
      escapeCSV(evaluation?.final_decision),
      escapeCSV(sample.evaluation_notes),
      sample.created_at
    ]
  })

  const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
  return { csv }
}

async function exportSampleEvaluations(userId: string, filters: any) {
  let query = supabase
    .from('sample_evaluations')
    .select(`
      *,
      sample_requests (
        product_name,
        total_cost,
        supplier_relationships (
          supplier_name
        )
      )
    `)
    .eq('user_id', userId)
    .order('evaluated_at', { ascending: false })

  // Apply filters
  if (filters.finalDecision && filters.finalDecision !== 'all') {
    query = query.eq('final_decision', filters.finalDecision)
  }

  const { data: evaluations, error } = await query

  if (error) {
    throw error
  }

  // CSV Headers
  const headers = [
    'Supplier Name',
    'Product Name',
    'Sample Cost',
    'Overall Rating',
    'Quality Rating',
    'Design Rating',
    'Materials Rating',
    'Packaging Rating',
    'Functionality Rating',
    'Final Decision',
    'Decision Reason',
    'Would Order Again',
    'Pros',
    'Cons',
    'Evaluation Notes',
    'Recommended Improvements',
    'Evaluated At'
  ]

  // CSV Rows
  const rows = evaluations.map((evaluation: any) => {
    const sampleRequest = evaluation.sample_requests
    const supplier = sampleRequest?.supplier_relationships

    return [
      escapeCSV(supplier?.supplier_name),
      escapeCSV(sampleRequest?.product_name),
      sampleRequest?.total_cost || '',
      evaluation.overall_rating,
      evaluation.quality_rating || '',
      evaluation.design_rating || '',
      evaluation.materials_rating || '',
      evaluation.packaging_rating || '',
      evaluation.functionality_rating || '',
      escapeCSV(evaluation.final_decision),
      escapeCSV(evaluation.decision_reason),
      evaluation.would_order_again ? 'Yes' : 'No',
      escapeCSV((evaluation.pros || []).join('; ')),
      escapeCSV((evaluation.cons || []).join('; ')),
      escapeCSV(evaluation.evaluation_notes),
      escapeCSV(evaluation.recommended_improvements),
      evaluation.evaluated_at
    ]
  })

  const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
  return { csv }
}

/**
 * Escape CSV field values
 */
function escapeCSV(value: any): string {
  if (value === null || value === undefined) {
    return ''
  }
  
  const stringValue = String(value)
  
  // If the value contains comma, quotes, or newlines, wrap in quotes and escape internal quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  
  return stringValue
}