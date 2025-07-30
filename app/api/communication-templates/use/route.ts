import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST - Use/render a communication template with merge fields
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userId,
      templateId,
      mergeData = {}
    } = body

    // Validate required fields
    if (!userId || !templateId) {
      return NextResponse.json({
        success: false,
        error: 'User ID and template ID are required'
      }, { status: 400 })
    }

    // Get the template
    const { data: template, error: templateError } = await supabase
      .from('communication_templates')
      .select('*')
      .eq('id', templateId)
      .eq('user_id', userId)
      .single()

    if (templateError || !template) {
      return NextResponse.json({
        success: false,
        error: 'Template not found or access denied'
      }, { status: 404 })
    }

    // Process merge fields in both subject and body
    const renderedSubject = processMergeFields(template.subject_template, mergeData)
    const renderedBody = processMergeFields(template.body_template, mergeData)

    // Update usage statistics
    await supabase
      .from('communication_templates')
      .update({
        usage_count: (template.usage_count || 0) + 1,
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId)

    return NextResponse.json({
      success: true,
      data: {
        templateId,
        templateName: template.template_name,
        category: template.category,
        renderedSubject,
        renderedBody,
        originalSubject: template.subject_template,
        originalBody: template.body_template,
        mergeFields: template.merge_fields,
        mergeData
      }
    })

  } catch (error) {
    console.error('❌ Use communication template error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to process communication template'
    }, { status: 500 })
  }
}

/**
 * Process merge fields in template text
 * Replaces {field_name} with values from mergeData
 */
function processMergeFields(templateText: string, mergeData: Record<string, any>): string {
  let processedText = templateText

  // Replace merge fields with actual values
  Object.entries(mergeData).forEach(([key, value]) => {
    const fieldPattern = new RegExp(`\\{${key}\\}`, 'g')
    processedText = processedText.replace(fieldPattern, String(value || ''))
  })

  // Clean up any remaining unreplaced merge fields
  processedText = processedText.replace(/\{[^}]+\}/g, '[FIELD_NOT_PROVIDED]')

  return processedText
}