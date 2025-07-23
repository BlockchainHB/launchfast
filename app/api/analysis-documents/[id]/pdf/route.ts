import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id

    // Get the document HTML
    const { data: document, error } = await supabase
      .from('analysis_documents')
      .select('document_html, document_title')
      .eq('id', documentId)
      .single()

    if (error || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    if (!document.document_html) {
      return NextResponse.json(
        { error: 'Document HTML not available' },
        { status: 400 }
      )
    }

    // Update document status
    await supabase
      .from('analysis_documents')
      .update({ 
        document_status: 'downloaded',
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)

    // For now, return the HTML with print-friendly styling
    // In production, you'd want to use a proper PDF generation service
    const printableHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${document.document_title}</title>
        <style>
          @media print {
            body { margin: 0; }
            .no-print { display: none !important; }
          }
          @page {
            size: A4;
            margin: 1in;
          }
        </style>
      </head>
      <body>
        ${document.document_html}
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `

    return new NextResponse(printableHTML, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="${document.document_title.replace(/[^a-zA-Z0-9]/g, '_')}.html"`
      }
    })

  } catch (error) {
    console.error('Error generating printable document:', error)
    return NextResponse.json(
      { error: 'Failed to generate printable document' },
      { status: 500 }
    )
  }
}