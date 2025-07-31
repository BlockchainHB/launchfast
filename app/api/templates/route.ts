import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// GET /api/templates - Fetch all templates for the user
export async function GET(request: NextRequest) {
  try {
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
    
    const { data: templates, error } = await supabase
      .from('communication_templates')
      .select('*')
      .or(`user_id.eq.${userId},is_default.eq.true`)
      .order('category', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching templates:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch templates'
      }, { status: 500 })
    }

    // Map database schema to frontend expectations
    const mappedTemplates = (templates || []).map(template => ({
      id: template.id,
      user_id: template.user_id,
      category: template.category,
      title: template.template_name,
      content: template.body_template,
      created_at: template.created_at,
      updated_at: template.updated_at
    }))

    return NextResponse.json({
      success: true,
      data: mappedTemplates
    })

  } catch (error) {
    console.error('Error in GET /api/templates:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// POST /api/templates - Create new template
export async function POST(request: NextRequest) {
  try {
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
      .insert([{
        user_id: userId,
        template_name: title.trim(),
        category: category.trim(),
        subject_template: `Re: ${title.trim()}`,
        body_template: content.trim(),
        is_default: false
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating template:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to create template'
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
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/templates:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}