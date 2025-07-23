"use client"

import React, { useState, useEffect } from 'react'
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SectionCards } from "@/components/section-cards"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
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
  const [stats, setStats] = useState({
    totalProducts: 0,
    highGradeProducts: 0,
    avgMonthlyRevenue: 0,
    totalProfitPotential: 0,
    highGradePercentage: 0,
    recentActivity: 0
  })

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
        
        // Calculate stats from documents
        const totalDocs = data.documents.length
        const highGrade = data.documents.filter(doc => 
          doc.ai_analysis?.product?.grade && ['A+', 'A', 'B+', 'B'].includes(doc.ai_analysis.product.grade)
        ).length
        
        setStats({
          totalProducts: totalDocs,
          highGradeProducts: highGrade,
          avgMonthlyRevenue: 0,
          totalProfitPotential: 0,
          highGradePercentage: totalDocs > 0 ? Math.round((highGrade / totalDocs) * 100) : 0,
          recentActivity: 0
        })
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
                <SectionCards loading={true} mode="product" />
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
              <SectionCards stats={stats} loading={false} mode="product" />
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
                              <div className="space-y-1">
                                <CardDescription className="text-sm">
                                  <span className="font-medium">ASIN:</span> {document.ai_analysis?.product?.asin || 'N/A'}
                                </CardDescription>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">Risk:</span>
                                  <Badge 
                                    variant={document.ai_analysis?.risk_classification === 'Safe' ? 'default' : 'destructive'}
                                    className="text-xs"
                                  >
                                    {document.ai_analysis?.risk_classification || 'N/A'}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">Consistency:</span>
                                  <Badge 
                                    variant={document.ai_analysis?.consistency_rating === 'High' ? 'default' : 'secondary'}
                                    className="text-xs"
                                  >
                                    {document.ai_analysis?.consistency_rating || 'N/A'}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <Badge variant="outline" className="ml-2">
                              {document.ai_analysis?.product?.grade || 'N/A'}
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
                  <DialogContent className="max-w-7xl max-h-[95vh] flex flex-col">
                    <DialogHeader className="flex-shrink-0">
                      <DialogTitle className="text-xl font-semibold">
                        {selectedDocument?.document_title}
                      </DialogTitle>
                      <DialogDescription>
                        Professional AI Analysis Report • Generated {selectedDocument && new Date(selectedDocument.created_at).toLocaleDateString()}
                      </DialogDescription>
                    </DialogHeader>
                    
                    <ScrollArea className="flex-1 mt-4">
                      {selectedDocument?.document_html && (
                        <div 
                          dangerouslySetInnerHTML={{ 
                            __html: selectedDocument.document_html 
                          }}
                          className="w-full [&>div]:!max-w-none [&>div]:!margin-0 [&>div]:!padding-0"
                          style={{
                            '--content-max-width': 'none'
                          } as React.CSSProperties}
                        />
                      )}
                    </ScrollArea>
                    
                    <div className="flex justify-between items-center pt-4 border-t mt-4 flex-shrink-0">
                      <div className="text-sm text-muted-foreground">
                        Use print function (Ctrl/Cmd + P) for best PDF quality
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => handleDownloadPDF(selectedDocument!)}
                          disabled={!selectedDocument}
                        >
                          <IconExternalLink className="mr-2 h-4 w-4" />
                          Print Version
                        </Button>
                        <Button onClick={() => setViewModalOpen(false)}>
                          Close
                        </Button>
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