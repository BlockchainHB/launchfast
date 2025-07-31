import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// GET /api/templates/[id] - Fetch specific template
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    
    // Initialize Supabase client with SSR
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {}, // Empty for API routes
          remove() {}, // Empty for API routes
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = user.id // This is the authenticated user's UUID
    
    const { data: template, error } = await supabase
      .from('communication_templates')
      .select('*')
      .eq('id', id)
      .or(`user_id.eq.${userId},is_default.eq.true`)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          success: false,
          error: 'Template not found'
        }, { status: 404 })
      }
      
      console.error('Error fetching template:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch template'
      }, { status: 500 })
    }

    // Map database schema to frontend expectations
    const mappedTemplate = {
      id: template.id,
      user_id: template.user_id,
      category: template.category,
      title: template.template_name,
      content: template.body_template,
      created_at: template.created_at,
      updated_at: template.updated_at
    }

    return NextResponse.json({
      success: true,
      data: mappedTemplate
    })

  } catch (error) {
    console.error('Error in GET /api/templates/[id]:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// PATCH /api/templates/[id] - Update template
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { category, title, content } = body

    // Validation
    if (!category || !title || !content) {
      return NextResponse.json({
        success: false,
        error: 'Category, title, and content are required'
      }, { status: 400 })
    }

    // Initialize Supabase client with SSR
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {}, // Empty for API routes
          remove() {}, // Empty for API routes
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = user.id // This is the authenticated user's UUID

    const { data: template, error } = await supabase
      .from('communication_templates')
      .update({
        template_name: title.trim(),
        category: category.trim(),
        subject_template: `Re: ${title.trim()}`,
        body_template: content.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          success: false,
          error: 'Template not found'
        }, { status: 404 })
      }
      
      console.error('Error updating template:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to update template'
      }, { status: 500 })
    }

    // Map database schema to frontend expectations
    const mappedTemplate = {
      id: template.id,
      user_id: template.user_id,
      category: template.category,
      title: template.template_name,
      content: template.body_template,
      created_at: template.created_at,
      updated_at: template.updated_at
    }

    return NextResponse.json({
      success: true,
      data: mappedTemplate
    })

  } catch (error) {
    console.error('Error in PATCH /api/templates/[id]:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// DELETE /api/templates/[id] - Delete template
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    
    // Initialize Supabase client with SSR
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {}, // Empty for API routes
          remove() {}, // Empty for API routes
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = user.id // This is the authenticated user's UUID
    
    const { error } = await supabase
      .from('communication_templates')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting template:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to delete template'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully'
    })

  } catch (error) {
    console.error('Error in DELETE /api/templates/[id]:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}