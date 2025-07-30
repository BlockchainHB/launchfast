import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - List communication templates for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const category = searchParams.get('category')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 })
    }

    let query = supabase
      .from('communication_templates')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('usage_count', { ascending: false })
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    const { data: templates, error } = await query

    if (error) {
      throw error
    }

    // Get category statistics
    const { data: categoryStats, error: statsError } = await supabase
      .from('communication_templates')
      .select('category, usage_count')
      .eq('user_id', userId)

    if (statsError) {
      throw statsError
    }

    const categoryBreakdown = categoryStats.reduce((acc: any, template: any) => {
      if (!acc[template.category]) {
        acc[template.category] = { count: 0, totalUsage: 0 }
      }
      acc[template.category].count += 1
      acc[template.category].totalUsage += template.usage_count || 0
      return acc
    }, {})

    return NextResponse.json({
      success: true,
      data: {
        templates: templates || [],
        pagination: {
          limit,
          offset,
          total: templates?.length || 0
        },
        stats: {
          total: categoryStats.length,
          byCategory: categoryBreakdown
        }
      }
    })

  } catch (error) {
    console.error('❌ Get communication templates error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch communication templates'
    }, { status: 500 })
  }
}

// POST - Create new communication template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userId,
      templateName,
      category,
      subjectTemplate,
      bodyTemplate,
      mergeFields = [],
      isDefault = false
    } = body

    // Validate required fields
    if (!userId || !templateName || !category || !subjectTemplate || !bodyTemplate) {
      return NextResponse.json({
        success: false,
        error: 'User ID, template name, category, subject template, and body template are required'
      }, { status: 400 })
    }

    // Check if template name already exists for this user
    const { data: existingTemplate } = await supabase
      .from('communication_templates')
      .select('id')
      .eq('user_id', userId)
      .eq('template_name', templateName)
      .single()

    if (existingTemplate) {
      return NextResponse.json({
        success: false,
        error: 'Template with this name already exists'
      }, { status: 409 })
    }

    // If setting as default, unset other defaults in the same category
    if (isDefault) {
      await supabase
        .from('communication_templates')
        .update({ is_default: false })
        .eq('user_id', userId)
        .eq('category', category)
    }

    // Create new template
    const { data: template, error } = await supabase
      .from('communication_templates')
      .insert({
        user_id: userId,
        template_name: templateName,
        category: category,
        subject_template: subjectTemplate,
        body_template: bodyTemplate,
        merge_fields: mergeFields,
        is_default: isDefault
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      data: {
        template
      }
    })

  } catch (error) {
    console.error('❌ Create communication template error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create communication template'
    }, { status: 500 })
  }
}

// PATCH - Update communication template
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      templateId,
      userId,
      templateName,
      subjectTemplate,
      bodyTemplate,
      mergeFields,
      isDefault
    } = body

    if (!templateId || !userId) {
      return NextResponse.json({
        success: false,
        error: 'Template ID and User ID are required'
      }, { status: 400 })
    }

    // Get current template to check category
    const { data: currentTemplate, error: getCurrentError } = await supabase
      .from('communication_templates')
      .select('category')
      .eq('id', templateId)
      .eq('user_id', userId)
      .single()

    if (getCurrentError || !currentTemplate) {
      return NextResponse.json({
        success: false,
        error: 'Template not found'
      }, { status: 404 })
    }

    // If setting as default, unset other defaults in the same category
    if (isDefault) {
      await supabase
        .from('communication_templates')
        .update({ is_default: false })
        .eq('user_id', userId)
        .eq('category', currentTemplate.category)
    }

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (templateName !== undefined) updateData.template_name = templateName
    if (subjectTemplate !== undefined) updateData.subject_template = subjectTemplate
    if (bodyTemplate !== undefined) updateData.body_template = bodyTemplate
    if (mergeFields !== undefined) updateData.merge_fields = mergeFields
    if (isDefault !== undefined) updateData.is_default = isDefault

    const { data: template, error } = await supabase
      .from('communication_templates')
      .update(updateData)
      .eq('id', templateId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      data: {
        template
      }
    })

  } catch (error) {
    console.error('❌ Update communication template error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update communication template'
    }, { status: 500 })
  }
}

// DELETE - Remove communication template
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get('templateId')
    const userId = searchParams.get('userId')

    if (!templateId || !userId) {
      return NextResponse.json({
        success: false,
        error: 'Template ID and User ID are required'
      }, { status: 400 })
    }

    const { error } = await supabase
      .from('communication_templates')
      .delete()
      .eq('id', templateId)
      .eq('user_id', userId)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Communication template deleted successfully'
    })

  } catch (error) {
    console.error('❌ Delete communication template error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete communication template'
    }, { status: 500 })
  }
}