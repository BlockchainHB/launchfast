"use client"

import { useState, useRef, useEffect } from "react"
import { ProgressDisplayController } from "@/lib/progress-display-controller"
import { IconSearch, IconBarcode, IconCheck, IconX, IconLoader2, IconChevronDown, IconChevronRight } from "@tabler/icons-react"
import { getStatusIcon, getResearchPhaseIcon } from "@/lib/icons"
import { IbmWatsonDiscovery, BusinessMetrics, IbmDataProductExchange, IbmWatsonxCodeAssistantForZValidationAssistant, RecordingFilledAlt, ChartRelationship, DoubleAxisChartColumn } from "@carbon/icons-react"

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

interface ResearchModalProps {
  isOpen: boolean
  onClose: () => void
  onSaveSuccess?: () => void
}

export function ResearchModal({ isOpen, onClose, onSaveSuccess }: ResearchModalProps) {
  const [keyword, setKeyword] = useState("")
  const [asin, setAsin] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<Record<string, unknown>[]>([])
  const [marketAnalysis, setMarketAnalysis] = useState<Record<string, unknown> | null>(null)
  const [showProducts, setShowProducts] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  
  // Display Controller
  const displayControllerRef = useRef<ProgressDisplayController | null>(null)
  const [displayState, setDisplayState] = useState({
    currentPhase: '',
    phaseMessage: '',
    phaseData: null as Record<string, unknown> | null,
    progress: 0,
    canAdvance: false,
    stepType: 'indeterminate' as 'indeterminate' | 'determinate' | 'final',
    showProgress: false
  })

  // Initialize display controller
  useEffect(() => {
    displayControllerRef.current = new ProgressDisplayController((newState) => {
      setDisplayState(newState)
    })

    return () => {
      displayControllerRef.current?.destroy()
    }
  }, [])

  // Helper function to get grade color and status
  const getGradeInfo = (grade: string) => {
    const gradeUpper = grade?.toUpperCase() || 'F1'
    
    if (gradeUpper.startsWith('A')) {
      return {
        color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        status: 'Excellent',
        icon: getStatusIcon('excellent', 16)
      }
    } else if (gradeUpper.startsWith('B')) {
      return {
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        status: 'Good',
        icon: getStatusIcon('good', 16)
      }
    } else if (gradeUpper.startsWith('C')) {
      return {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        status: 'Average',
        icon: getStatusIcon('average', 16)
      }
    } else if (gradeUpper.startsWith('D')) {
      return {
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        status: 'Poor',
        icon: getStatusIcon('poor', 16)
      }
    } else {
      return {
        color: 'bg-red-100 text-red-800 border-red-200',
        status: 'Failed',
        icon: getStatusIcon('failed', 16)
      }
    }
  }

  const handleKeywordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!keyword.trim()) return

    setIsLoading(true)
    setError(null)
    setResults([])
    setMarketAnalysis(null)
    setDisplayState({
      currentPhase: '',
      phaseMessage: '',
      phaseData: null,
      progress: 0,
      canAdvance: false,
      stepType: 'indeterminate',
      showProgress: false
    })
    
    try {
      console.log("Starting SSE research for keyword:", keyword)
      
      // Create EventSource with URL parameters
      const params = new URLSearchParams({
        keyword: keyword.trim(),
        limit: '5',
        maxReviews: '1000'
      })
      
      const eventSource = new EventSource(`/api/products/research/stream?${params}`)

      eventSource.onmessage = (event) => {
        try {
          const progressEvent = JSON.parse(event.data)
          console.log("Progress event:", progressEvent)
          
          // Send event to display controller
          displayControllerRef.current?.handleBackendEvent(progressEvent)
          
          if (progressEvent.phase === 'complete') {
            if (progressEvent.data.products && progressEvent.data.products.length > 0) {
              setResults(progressEvent.data.products)
              if (progressEvent.data.marketAnalysis) {
                setMarketAnalysis(progressEvent.data.marketAnalysis)
              }
            } else {
              setError(progressEvent.data.message || "No products found for this keyword")
            }
            setIsLoading(false)
            eventSource.close()
          } else if (progressEvent.phase === 'error') {
            setError(progressEvent.message)
            setIsLoading(false)
            eventSource.close()
          }
        } catch (parseError) {
          console.error("Failed to parse progress event:", parseError)
        }
      }

      eventSource.onerror = (error) => {
        console.error("SSE error:", error)
        setError("Connection error during research")
        setIsLoading(false)
        eventSource.close()
      }
      
    } catch (error) {
      console.error("Research failed:", error)
      setError(error instanceof Error ? error.message : "Failed to research products")
      setIsLoading(false)
    }
  }

  const handleSaveResults = async () => {
    if (!results || results.length === 0) return
    
    setIsSaving(true)
    setError(null)
    
    try {
      console.log("Saving results to database:", { products: results, marketAnalysis })
      
      const response = await fetch('/api/products/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          products: results,
          marketAnalysis: marketAnalysis
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save products to database')
      }

      const data = await response.json()
      console.log("Save successful:", data)
      
      setSaveSuccess(true)
      
      if (onSaveSuccess) {
        onSaveSuccess()
      }
      
      setTimeout(() => {
        onClose()
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
    setResults([])
    setMarketAnalysis(null)
    setError(null)
    setKeyword("")
    setAsin("")
    setShowProducts(false)
    setSaveSuccess(false)
    setDisplayState({
      currentPhase: '',
      phaseMessage: '',
      phaseData: null,
      progress: 0,
      canAdvance: false,
      stepType: 'indeterminate',
      showProgress: false
    })
  }

  // Render engaging progress UI for each phase
  const renderProgressPhase = () => {
    const { currentPhase, phaseMessage, phaseData, progress, stepType, showProgress } = displayState
    
    const getPhaseIcon = () => {
      return getResearchPhaseIcon(currentPhase, 24)
    }

    const renderPhaseDetails = () => {
      switch (currentPhase) {
        case 'marketplace_analysis':
          return (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="animate-pulse"><IbmWatsonDiscovery size={24} className="text-black" /></div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{phaseMessage}</div>
                  {phaseData && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Step {phaseData.currentStep} of {phaseData.totalSteps}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Step Progress Indicator */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Analysis Progress</span>
                  <span>{phaseData?.currentStep || 0} of {phaseData?.totalSteps || 8}</span>
                </div>
                <div className="flex space-x-1">
                  {[...Array(phaseData?.totalSteps || 8)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-2 flex-1 rounded ${
                        i < (phaseData?.currentStep || 0)
                          ? 'bg-blue-500'
                          : i === (phaseData?.currentStep || 0) - 1
                          ? 'bg-blue-400 animate-pulse'
                          : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Visual Analysis Steps */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { icon: <IbmWatsonDiscovery size={16} className="text-black" />, label: 'Scan' },
                  { icon: <BusinessMetrics size={16} className="text-black" />, label: 'Pricing' },
                  { icon: <IbmDataProductExchange size={16} className="text-black" />, label: 'Products' },
                  { icon: <BusinessMetrics size={16} className="text-black" />, label: 'Sales' },
                  { icon: <RecordingFilledAlt size={16} className="text-black" />, label: 'Saturation' },
                  { icon: <DoubleAxisChartColumn size={16} className="text-black" />, label: 'Opportunity' },
                  { icon: <IbmWatsonxCodeAssistantForZValidationAssistant size={16} className="text-black" />, label: 'Reviews' },
                  { icon: <ChartRelationship size={16} className="text-black" />, label: 'Selection' }
                ].map((item, i) => (
                  <div
                    key={i}
                    className={`p-2 rounded text-center text-xs relative ${
                      i < (phaseData?.currentStep || 0)
                        ? 'bg-blue-100 text-black'
                        : i === (phaseData?.currentStep || 0) - 1
                        ? 'bg-blue-50 text-black animate-pulse'
                        : 'bg-gray-50 text-black'
                    }`}
                  >
                    <div className="flex justify-center">{item.icon}</div>
                    <div className="text-black">{item.label}</div>
                  </div>
                ))}
              </div>
              
              {/* Extra activity indicator for final step */}
              {phaseData?.currentStep === 8 && (
                <div className="flex items-center justify-center space-x-2 p-2 bg-blue-100 rounded">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-xs text-blue-700 font-medium">
                    Scanning Amazon catalog in progress...
                  </span>
                </div>
              )}
            </div>
          )

        case 'validating_market':
          return (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="animate-pulse">{getResearchPhaseIcon('validating_market', 24)}</div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{phaseMessage}</div>
                  {phaseData && phaseData.currentItem > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Verifying {phaseData.currentItem} of {phaseData.totalItems} products
                    </div>
                  )}
                </div>
              </div>
              
              {/* Show all products in compact grid with status indicators */}
              {phaseData && phaseData.allProducts && (
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground font-medium">Products being verified:</div>
                  <div className="grid grid-cols-1 gap-2">
                    {phaseData.allProducts.map((product: any, index: number) => {
                      // All products should be spinning simultaneously during validation
                      const isVerifying = product.status === 'verifying'
                      
                      return (
                        <div
                          key={product.asin}
                          className={`flex items-center space-x-3 p-2 rounded border transition-all duration-300 ${
                            isVerifying 
                              ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200' 
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          {/* Product image */}
                          {product.image ? (
                            <img 
                              src={product.image} 
                              alt="Product" 
                              className="w-8 h-8 object-cover rounded border bg-white flex-shrink-0"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gray-200 rounded border flex-shrink-0"></div>
                          )}
                          
                          {/* Product info */}
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate">{product.title}</div>
                            <div className="text-xs text-muted-foreground">{product.asin}</div>
                          </div>
                          
                          {/* Status indicator - all spinning during verification */}
                          <div className="flex-shrink-0">
                            {isVerifying && (
                              <div className="flex items-center space-x-1">
                                <div className="animate-spin rounded-full h-3 w-3 border border-blue-600 border-t-transparent"></div>
                                <span className="text-xs text-blue-600 font-medium">Verifying</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  
                  {/* Show validation progress message */}
                  <div className="flex items-center justify-center space-x-2 p-2 bg-blue-100 rounded">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-xs text-blue-700 font-medium">
                      Validating all products with advanced analytics...
                    </span>
                  </div>
                </div>
              )}
            </div>
          )

        case 'applying_grading':
          return (
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="animate-pulse">{getResearchPhaseIcon('applying_grading', 24)}</div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{phaseMessage}</div>
                  {phaseData && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Calculating grades for {phaseData.productsToGrade} products
                    </div>
                  )}
                </div>
              </div>
              
              {/* Final completion animation - no fake progress */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-3 rounded border">
                <div className="flex items-center space-x-2">
                  <div className="text-xs font-medium text-purple-600">A10-F1 Algorithm Processing</div>
                  <div className="flex space-x-1">
                    {['A', '10', '→', 'F', '1'].map((char, i) => (
                      <div
                        key={i}
                        className="text-xs font-mono animate-pulse"
                        style={{ animationDelay: `${i * 0.2}s` }}
                      >
                        {char}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Show completion indicator for final phase */}
              {stepType === 'final' && (
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                </div>
              )}
            </div>
          )

        default:
          // Fallback for initial state - should immediately be replaced by first SSE event
          return (
            <div className="flex items-center space-x-3">
              <div className="text-2xl animate-pulse">🔍</div>
              <span className="text-sm">Connecting to research engine...</span>
            </div>
          )
      }
    }

    return (
      <div className="space-y-6 py-4">

        {/* Phase-Specific UI */}
        <div className={`border rounded-lg p-4 ${
          currentPhase === 'validating_market' 
            ? 'bg-gradient-to-r from-emerald-50 to-green-50' 
            : currentPhase === 'applying_grading'
            ? 'bg-gradient-to-r from-purple-50 to-blue-50'
            : 'bg-gradient-to-r from-blue-50 to-indigo-50'
        }`}>
          {renderPhaseDetails()}
        </div>

        {/* Current Analysis Context */}
        {phaseData && currentPhase === 'marketplace_analysis' && (
          <div className="text-center p-3 bg-blue-50 rounded">
            <div className="text-xs text-muted-foreground">Analyzing</div>
            <div className="text-sm font-medium">"{phaseData.keyword}" marketplace</div>
          </div>
        )}
      </div>
    )
  }

  // Simple 3-state rendering: Loading, Results, Input
  const renderContent = () => {
    if (isLoading) {
      return renderProgressPhase()
    }

    if (error) {
      return (
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
      )
    }

    if (results.length > 0) {
      return (
        <div className="space-y-6">
          {/* Market Summary */}
          {marketAnalysis && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Market Analysis: "{keyword}"</h3>
                <Badge variant="outline">{results.length} Products Analyzed</Badge>
              </div>
              
              <Card className="w-full bg-primary/5 border-primary/20">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-base font-semibold">
                        Market Grade: {marketAnalysis.market_grade}
                      </CardTitle>
                      <CardDescription className="text-sm mt-1">
                        Averaged from {marketAnalysis.products_verified} verified products
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <Badge className={`${getGradeInfo(marketAnalysis.market_grade).color} border text-sm`}>
                        {getGradeInfo(marketAnalysis.market_grade).icon} {marketAnalysis.market_grade}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {marketAnalysis.market_consistency_rating} Consistency
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <Label className="text-xs text-muted-foreground">Avg Monthly Revenue</Label>
                      <div className="font-medium">${marketAnalysis.avg_monthly_revenue?.toLocaleString() || '0'}</div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Avg Profit Margin</Label>
                      <div className="font-medium">{((marketAnalysis.avg_profit_margin || 0) * 100).toFixed(1)}%</div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Opportunity Score</Label>
                      <div className="font-medium">{marketAnalysis.opportunity_score}/100</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Expandable Product List */}
          <div className="border rounded-lg">
            <Button
              variant="ghost"
              className="w-full p-4 justify-between"
              onClick={() => setShowProducts(!showProducts)}
            >
              <span className="text-sm font-medium">Individual Products Analyzed ({results.length})</span>
              {showProducts ? <IconChevronDown className="h-4 w-4" /> : <IconChevronRight className="h-4 w-4" />}
            </Button>
            
            {showProducts && (
              <div className="border-t p-4 space-y-3">
                {results.map((product, index) => {
                  const gradeInfo = getGradeInfo(product.grade || 'F1')
                  
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
                              {product.asin}
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
                            <Label className="text-xs text-muted-foreground">Monthly Revenue</Label>
                            <div className="font-medium">
                              ${product.salesData?.monthlyRevenue?.toLocaleString() || 'N/A'}
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Monthly Sales</Label>
                            <div className="font-medium">
                              {product.salesData?.monthlySales?.toLocaleString() || 'N/A'} units
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Price</Label>
                            <div className="font-medium">${product.price || 'N/A'}</div>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Reviews</Label>
                            <div className="font-medium">{product.reviews?.toLocaleString() || '0'}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
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
      )
    }

    // Default: Show input form
    return (
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
              disabled={isLoading || !asin.trim()}
            >
              {isLoading ? "Analyzing..." : "Start Research"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-full mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {results.length > 0 ? "Research Results" : "Start New Research"}
          </DialogTitle>
          <DialogDescription>
            {results.length > 0
              ? "Review your research results and save to your database"
              : "Enter a keyword or ASIN to analyze Amazon products and get A10-F1 scoring."
            }
          </DialogDescription>
        </DialogHeader>
        
        {renderContent()}
      </DialogContent>
    </Dialog>
  )
}