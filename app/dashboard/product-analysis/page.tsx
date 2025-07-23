"use client"

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { 
  IconFileAnalytics, 
  IconDownload, 
  IconEye, 
  IconSearch,
  IconCalendar,
  IconFilter,
  IconPlus,
  IconLoader2
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

interface AvailableAnalysis {
  id: string
  product_id: string
  risk_classification: string
  consistency_rating: string
  opportunity_score: number
  created_at: string
  product: {
    id: string
    title: string
    asin: string
    grade: string
    price: number
  }
}

export default function ProductAnalysisPage() {
  const [documents, setDocuments] = useState<AnalysisDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDocument, setSelectedDocument] = useState<AnalysisDocument | null>(null)
  const [viewModalOpen, setViewModalOpen] = useState(false)

  useEffect(() => {
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
        toast("Failed to load analysis documents")
      }
    } catch (error) {
      console.error('Error fetching documents:', error)
      toast("Failed to load analysis documents")
    } finally {
      setLoading(false)
    }
  }

  const filteredDocuments = documents.filter(doc =>
    doc.document_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.ai_analysis?.product?.asin.toLowerCase().includes(searchTerm.toLowerCase())
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
      window.open(printUrl, '_blank', 'width=1000,height=800')
      
      toast.success("Printable version opened!")
    } catch (error) {
      console.error('Error opening printable version:', error)
      toast("Failed to open printable version")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <IconFileAnalytics className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500">Loading analysis documents...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Product Analysis</h1>
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
              <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
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
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <IconFileAnalytics className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Analysis Documents</h3>
              <p className="text-muted-foreground mb-4">
                Generate your first AI analysis document from the Products page
              </p>
              <p className="text-sm text-muted-foreground">
                Select a product and click "Generate AI Analysis" to create professional reports
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredDocuments.map((document) => (
            <Card key={document.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2">
                      {document.document_title}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      ASIN: {document.ai_analysis?.product?.asin}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="ml-2">
                    {document.ai_analysis?.product?.grade}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Risk:</span>
                      <Badge 
                        variant="outline" 
                        className="ml-1 text-xs"
                      >
                        {document.ai_analysis?.risk_classification}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Consistency:</span>
                      <Badge 
                        variant="outline" 
                        className="ml-1 text-xs"
                      >
                        {document.ai_analysis?.consistency_rating}
                      </Badge>
                    </div>
                  </div>

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
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{selectedDocument?.document_title}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {selectedDocument?.document_html && (
              <div 
                dangerouslySetInnerHTML={{ 
                  __html: selectedDocument.document_html 
                }}
                className="w-full"
              />
            )}
          </div>
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => handleDownloadPDF(selectedDocument!)}
              disabled={!selectedDocument}
            >
              <IconDownload className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
            <Button onClick={() => setViewModalOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}