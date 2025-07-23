"use client"

import React, { useState, useEffect } from 'react'
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { 
  IconFileAnalytics, 
  IconDownload, 
  IconEye, 
  IconSearch,
  IconCalendar,
  IconFilter,
  IconLoader2,
  IconExternalLink
} from "@tabler/icons-react"
import { toast } from "sonner"

interface AnalysisDocument {
  id: string
  ai_analysis_id: string
  document_title: string
  document_html: string | null
  document_status: 'generated' | 'downloaded' | 'shared'
  created_at: string
  updated_at: string
  // Joined from ai_analysis table
  ai_analysis?: {
    risk_classification: string
    consistency_rating: string
    opportunity_score: number
    product?: {
      title: string
      asin: string
      grade: string
    }
  }
}

export default function ProductAnalysisPage() {
  const [documents, setDocuments] = useState<AnalysisDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDocument, setSelectedDocument] = useState<AnalysisDocument | null>(null)
  const [viewModalOpen, setViewModalOpen] = useState(false)

  useEffect(() => {
    document.title = "Product Analysis - LaunchFast"
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/analysis-documents')
      const data = await response.json()
      
      if (data.success) {
        setDocuments(data.documents)
      } else {
        console.error('Error fetching documents:', data.error)
        toast.error("Failed to load analysis documents")
      }
    } catch (error) {
      console.error('Error fetching documents:', error)
      toast.error("Failed to load analysis documents")
    } finally {
      setLoading(false)
    }
  }

  const filteredDocuments = documents.filter(doc =>
    doc.document_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (doc.ai_analysis?.product?.asin && doc.ai_analysis.product.asin.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const handleViewDocument = (document: AnalysisDocument) => {
    setSelectedDocument(document)
    setViewModalOpen(true)
  }

  const handleDownloadPDF = async (document: AnalysisDocument) => {
    try {
      toast("Opening printable version...")
      
      // Open the printable version in a new window
      const printUrl = `/api/analysis-documents/${document.id}/pdf`
      window.open(printUrl, '_blank', 'width=1200,height=900')
      
      toast.success("Printable version opened!")
    } catch (error) {
      console.error('Error opening printable version:', error)
      toast.error("Failed to open printable version")
    }
  }

  if (loading) {
    return (
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                <div className="px-4 lg:px-6">
                  <div className="flex items-center justify-center py-16">
                    <div className="text-center">
                      <IconLoader2 className="mx-auto h-12 w-12 text-muted-foreground mb-4 animate-spin" />
                      <p className="text-muted-foreground">Loading analysis documents...</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">Product Analysis</h1>
                    <p className="text-muted-foreground">
                      Professional AI analysis documents for your products
                    </p>
                  </div>
                </div>

                {/* Search and Filters */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-4">
                      <div className="relative flex-1">
                        <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                          placeholder="Search by product title or ASIN..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <Button variant="outline">
                        <IconFilter className="mr-2 h-4 w-4" />
                        Filter
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Documents Grid */}
                {filteredDocuments.length === 0 ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="text-center">
                      <div className="mb-4">
                        <svg
                          className="mx-auto h-12 w-12 text-muted-foreground"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                      <h3 className="empty-state-title">No Analysis Documents</h3>
                      <p className="empty-state-description">
                        Generate your first AI analysis document from the Products page.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredDocuments.map((document) => (
                      <Card key={document.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-base font-semibold line-clamp-2 mb-2">
                                {document.document_title}
                              </CardTitle>
                              <CardDescription className="text-sm">
                                Professional AI Analysis Report
                              </CardDescription>
                            </div>
                            <Badge variant="secondary" className="ml-2">
                              V1.0
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex items-center text-sm text-muted-foreground">
                              <IconCalendar className="mr-1 h-3 w-3" />
                              {new Date(document.created_at).toLocaleDateString()}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex space-x-2 pt-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="flex-1"
                                onClick={() => handleViewDocument(document)}
                              >
                                <IconEye className="mr-1 h-3 w-3" />
                                View
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleDownloadPDF(document)}
                              >
                                <IconDownload className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Document Viewer Modal */}
                <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
                  <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-0">
                    <DialogHeader className="flex-shrink-0 px-6 py-4 border-b">
                      <DialogTitle className="text-lg font-semibold truncate">
                        AI Analysis Report
                      </DialogTitle>
                      <DialogDescription className="text-sm">
                        Generated {selectedDocument && new Date(selectedDocument.created_at).toLocaleDateString()} • Launch Fast V1.0
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="flex-1 overflow-auto p-4">
                      {selectedDocument?.document_html && (
                        <div 
                          dangerouslySetInnerHTML={{ 
                            __html: selectedDocument.document_html 
                          }}
                          className="w-full"
                        />
                      )}
                    </div>
                    
                    <div className="flex-shrink-0 px-6 py-4 border-t bg-muted/30">
                      <div className="flex justify-between items-center">
                        <div className="text-xs text-muted-foreground">
                          💡 Tip: Use browser's print function (Ctrl/Cmd + P) for best PDF quality
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadPDF(selectedDocument!)}
                            disabled={!selectedDocument}
                          >
                            <IconExternalLink className="mr-1 h-3 w-3" />
                            Print View
                          </Button>
                          <Button size="sm" onClick={() => setViewModalOpen(false)}>
                            Close
                          </Button>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}