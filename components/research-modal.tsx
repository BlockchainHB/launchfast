"use client"

import { useState } from "react"
import { IconSearch, IconBarcode, IconCheck, IconX, IconLoader2 } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

interface ResearchModalProps {
  isOpen: boolean
  onClose: () => void
  onSaveSuccess?: () => void
}

export function ResearchModal({ isOpen, onClose, onSaveSuccess }: ResearchModalProps) {
  const [keyword, setKeyword] = useState("")
  const [asin, setAsin] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Helper function to get grade color and status
  const getGradeInfo = (grade: string) => {
    const gradeUpper = grade?.toUpperCase() || 'F1'
    
    if (gradeUpper.startsWith('A')) {
      return {
        color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        status: 'Excellent',
        icon: '🏆'
      }
    } else if (gradeUpper.startsWith('B')) {
      return {
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        status: 'Good',
        icon: '📈'
      }
    } else if (gradeUpper.startsWith('C')) {
      return {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        status: 'Average',
        icon: '📊'
      }
    } else if (gradeUpper.startsWith('D')) {
      return {
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        status: 'Poor',
        icon: '📉'
      }
    } else {
      return {
        color: 'bg-red-100 text-red-800 border-red-200',
        status: 'Failed',
        icon: '❌'
      }
    }
  }

  // Helper function to get profit level indicator
  const getProfitInfo = (profit: number) => {
    if (profit >= 50000) return { color: 'text-emerald-600', level: 'High' }
    if (profit >= 20000) return { color: 'text-blue-600', level: 'Medium' }
    if (profit >= 5000) return { color: 'text-yellow-600', level: 'Low' }
    return { color: 'text-red-600', level: 'Very Low' }
  }

  // Helper function to get risk classification color
  const getRiskInfo = (risk: string) => {
    switch(risk) {
      case 'No Risk': return { color: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-800' }
      case 'Electric': return { color: 'text-yellow-600', badge: 'bg-yellow-100 text-yellow-800' }
      case 'Breakable': return { color: 'text-orange-600', badge: 'bg-orange-100 text-orange-800' }
      case 'Banned': return { color: 'text-red-600', badge: 'bg-red-100 text-red-800' }
      default: return { color: 'text-gray-600', badge: 'bg-gray-100 text-gray-800' }
    }
  }

  const handleKeywordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!keyword.trim()) return

    setIsLoading(true)
    try {
      console.log("Researching keyword:", keyword)
      
      const response = await fetch('/api/products/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword: keyword.trim(),
          limit: 3, // Limit to 3 products for modal display
          filters: {
            maxReviews: 1000 // Only products with 1000 reviews or less
          }
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to research products')
      }

      const data = await response.json()
      console.log("Research results:", data)
      
      if (data.success && data.data && data.data.length > 0) {
        setResults(data.data)
        setError(null)
      } else {
        setError("No products found for this keyword")
      }
      
    } catch (error) {
      console.error("Research failed:", error)
      setError(error instanceof Error ? error.message : "Failed to research products")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAsinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!asin.trim()) return

    setIsLoading(true)
    try {
      console.log("Researching ASIN:", asin)
      
      // For ASIN research, we'll use the sales prediction and reverse ASIN endpoints
      const [salesResponse, keywordsResponse] = await Promise.all([
        fetch('/api/test/sellersprite', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }),
        fetch('/api/test/reverse-asin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            asin: asin.trim(),
            size: 10
          }),
        })
      ])

      if (!salesResponse.ok || !keywordsResponse.ok) {
        throw new Error('Failed to research ASIN')
      }

      const salesData = await salesResponse.json()
      const keywordsData = await keywordsResponse.json()
      
      console.log("ASIN research results:", { salesData, keywordsData })
      
      // Combine ASIN research results
      const combinedResults = {
        asin: asin.trim(),
        salesData: salesData.data,
        keywordsData: keywordsData.data
      }
      
      setResults([combinedResults]) // Wrap in array for consistency
      setError(null)
      
    } catch (error) {
      console.error("ASIN research failed:", error)
      setError(error instanceof Error ? error.message : "Failed to research ASIN")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveResults = async () => {
    if (!results) return
    
    setIsSaving(true)
    setError(null)
    
    try {
      console.log("Saving results to database:", results)
      
      const response = await fetch('/api/products/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          products: results
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save products to database')
      }

      const data = await response.json()
      console.log("Save successful:", data)
      
      // Show success feedback
      setSaveSuccess(true)
      
      // Trigger dashboard refresh if callback provided
      if (onSaveSuccess) {
        onSaveSuccess()
      }
      
      // Close modal after brief success display
      setTimeout(() => {
        onClose()
        // Reset states for next use
        handleStartOver()
        setSaveSuccess(false)
      }, 1500)
      
    } catch (error) {
      console.error("Failed to save results:", error)
      setError(error instanceof Error ? error.message : "Failed to save products")
    } finally {
      setIsSaving(false)
    }
  }

  const handleStartOver = () => {
    setResults(null)
    setError(null)
    setKeyword("")
    setAsin("")
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-full mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {results ? "Research Results" : "Start New Research"}
          </DialogTitle>
          <DialogDescription>
            {results 
              ? "Review your research results and save to your database"
              : "Enter a keyword or ASIN to analyze Amazon products and get A10-F1 scoring."
            }
          </DialogDescription>
        </DialogHeader>
        
        {/* Results Display */}
        {results && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Research Summary</h3>
              <Badge variant="outline">{results.length} Product{results.length > 1 ? 's' : ''} Found</Badge>
            </div>
            
            {results.slice(0, 3).map((product: any, index: number) => {
              const gradeInfo = getGradeInfo(product.grade || 'F1')
              const profitInfo = getProfitInfo(product.salesData?.monthlyProfit || 0)
              const riskInfo = getRiskInfo(product.aiAnalysis?.riskClassification || 'Unknown')
              
              return (
                <Card key={product.id || product.asin || index} className="w-full">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-sm font-medium line-clamp-2">
                          {product.title || `ASIN: ${product.asin}`}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {product.brand && `${product.brand} • `}
                          {product.asin || product.id}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <Badge className={`${gradeInfo.color} border text-xs`}>
                          {gradeInfo.icon} {product.grade || 'F1'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {gradeInfo.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-xs text-muted-foreground">Monthly Profit</Label>
                      <div className={`font-medium ${profitInfo.color}`}>
                        ${product.salesData?.monthlyProfit?.toLocaleString() || 'N/A'}
                      </div>
                      <Badge variant="outline" className="text-xs mt-1">
                        {profitInfo.level}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Monthly Sales</Label>
                      <div className="font-medium">
                        {product.salesData?.monthlySales?.toLocaleString() || 'N/A'} units
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Margin</Label>
                      <div className="font-medium">
                        {product.salesData?.margin ? `${(product.salesData.margin * 100).toFixed(1)}%` : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Risk Level</Label>
                      <div className="font-medium">
                        <Badge className={`${riskInfo.badge} text-xs`}>
                          {product.aiAnalysis?.riskClassification || 'Unknown'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {product.price && (
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-sm">Price: ${product.price}</span>
                      <span className="text-sm">Reviews: {product.reviews || 0}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
              )
            })}
            
            {results.length > 3 && (
              <div className="text-center text-sm text-muted-foreground">
                ...and {results.length - 3} more products
              </div>
            )}
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                variant="outline" 
                onClick={handleStartOver}
                disabled={isSaving}
              >
                Start Over
              </Button>
              <Button 
                onClick={handleSaveResults} 
                className={saveSuccess ? "bg-emerald-600" : "bg-primary"}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <IconLoader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : saveSuccess ? (
                  <>
                    <IconCheck className="w-4 h-4 mr-2" />
                    Saved!
                  </>
                ) : (
                  <>
                    <IconCheck className="w-4 h-4 mr-2" />
                    Save to Database
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
        
        {/* Error Display */}
        {error && (
          <div className="space-y-4">
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2 text-destructive">
                  <IconX className="w-4 h-4" />
                  <span className="text-sm">{error}</span>
                </div>
              </CardContent>
            </Card>
            <div className="flex justify-end">
              <Button variant="outline" onClick={handleStartOver}>
                Try Again
              </Button>
            </div>
          </div>
        )}
        
        {/* Input Form - Only show if no results */}
        {!results && !error && (
          <Tabs defaultValue="keyword" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="keyword">Keyword</TabsTrigger>
            <TabsTrigger value="asin">ASIN</TabsTrigger>
          </TabsList>
          
          <TabsContent value="keyword" className="space-y-4">
            <form onSubmit={handleKeywordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="keyword">Keyword</Label>
                <div className="relative">
                  <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="keyword"
                    placeholder="e.g., wireless charger"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || !keyword.trim()}
                >
                  {isLoading ? "Analyzing..." : "Start Research"}
                </Button>
              </div>
            </form>
          </TabsContent>
          
          <TabsContent value="asin" className="space-y-4">
            <form onSubmit={handleAsinSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="asin">ASIN</Label>
                <div className="relative">
                  <IconBarcode className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="asin"
                    placeholder="e.g., B0XXXXXXXXX"
                    value={asin}
                    onChange={(e) => setAsin(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || !asin.trim()}
                >
                  {isLoading ? "Analyzing..." : "Start Research"}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}