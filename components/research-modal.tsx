"use client"

import { useState, useRef, useEffect } from "react"
import { ProgressDisplayController } from "@/lib/progress-display-controller"
import { 
  Search, 
  Package, 
  Check, 
  X, 
  Loader2, 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  Database,
  Activity,
  BarChart3,
  TrendingUp,
  Target,
  Users,
  DollarSign,
  Trophy,
  Sparkles,
  Zap,
  Crown,
  AlertCircle,
  CheckCircle,
  Lightbulb,
  Shield
} from "lucide-react"
import { getStatusIcon, getResearchPhaseIcon } from "@/lib/icons"

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
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

interface ResearchModalProps {
  isOpen: boolean
  onClose: () => void
  onSaveSuccess?: () => void
}

export function ResearchModal({ isOpen, onClose, onSaveSuccess }: ResearchModalProps) {
  const [keyword, setKeyword] = useState("")
  const [asin, setAsin] = useState("")
  const [asinInput, setAsinInput] = useState("")
  const [asinTags, setAsinTags] = useState<string[]>([])
  const [selectedMarket, setSelectedMarket] = useState<string | null>(null)
  const [availableMarkets, setAvailableMarkets] = useState<any[]>([])
  const [loadingMarkets, setLoadingMarkets] = useState(false)
  const [researchMode, setResearchMode] = useState<'new' | 'add-to-market'>('new')
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<Record<string, unknown>[]>([])
  const [marketAnalysis, setMarketAnalysis] = useState<Record<string, unknown> | null>(null)
  const [showProducts, setShowProducts] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  
  // Market refresh state
  const [existingMarket, setExistingMarket] = useState<any>(null)
  const [showMarketChoice, setShowMarketChoice] = useState(false)
  const [refreshMode, setRefreshMode] = useState<'new' | 'refresh'>('new')
  
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

  // Fetch available markets when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchMarkets()
    }
  }, [isOpen])

  const fetchMarkets = async () => {
    setLoadingMarkets(true)
    try {
      const response = await fetch('/api/markets')
      if (response.ok) {
        const data = await response.json()
        setAvailableMarkets(data.markets || [])
      }
    } catch (error) {
      console.error('Failed to fetch markets:', error)
    } finally {
      setLoadingMarkets(false)
    }
  }

  // Parse and validate ASINs from input
  const parseAsins = (input: string): string[] => {
    return input
      .split(/[,\n\s]+/)
      .map(asin => asin.trim().toUpperCase())
      .filter(asin => /^[A-Z0-9]{10}$/.test(asin))
  }

  // Get invalid ASINs for validation feedback
  const getInvalidAsins = (input: string): string[] => {
    return input
      .split(/[,\n\s]+/)
      .map(asin => asin.trim().toUpperCase())
      .filter(asin => asin.length > 0 && !/^[A-Z0-9]{10}$/.test(asin))
  }

  // Handle ASIN input changes and auto-convert to tags
  const handleAsinInputChange = (value: string) => {
    setAsinInput(value)
    
    // Check for separators (comma, space, enter) to convert to tags
    if (value.includes(',') || value.includes('\n') || value.includes(' ')) {
      const newAsins = parseAsins(value)
      const validNewAsins = newAsins.filter(asin => !asinTags.includes(asin))
      
      if (validNewAsins.length > 0) {
        const combinedAsins = [...asinTags, ...validNewAsins]
        if (combinedAsins.length <= 10) {
          setAsinTags(combinedAsins)
          setAsinInput('') // Clear input after converting to tags
        }
      }
    }
  }

  // Remove ASIN tag
  const removeAsinTag = (asinToRemove: string) => {
    setAsinTags(prev => prev.filter(asin => asin !== asinToRemove))
  }

  // Add ASIN from input on Enter or comma
  const handleAsinKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const trimmedInput = asinInput.trim().toUpperCase()
      if (trimmedInput && /^[A-Z0-9]{10}$/.test(trimmedInput) && !asinTags.includes(trimmedInput)) {
        if (asinTags.length < 10) {
          setAsinTags(prev => [...prev, trimmedInput])
          setAsinInput('')
        }
      }
    }
  }

  // Get total valid ASINs (tags + current input)
  const getTotalValidAsins = () => {
    const inputAsins = parseAsins(asinInput)
    return [...asinTags, ...inputAsins.filter(asin => !asinTags.includes(asin))]
  }

  // Helper function to get grade color and status
  const getGradeInfo = (grade: string) => {
    const gradeUpper = grade?.toUpperCase() || 'F1'
    
    if (gradeUpper === 'AVOID') {
      return {
        color: 'bg-red-100 text-red-800 border-red-200',
        status: 'Avoid',
        icon: getStatusIcon('failed', 16)
      }
    } else if (gradeUpper.startsWith('A')) {
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

    // Check if we're adding to an existing market
    if (researchMode === 'add-to-market' && !selectedMarket) {
      setError("Please select a market to add keywords to")
      return
    }
    
    // Start research with the selected mode
    startKeywordResearch()
  }

  const startKeywordResearch = async () => {
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
      console.log(`Starting keyword research: ${keyword} (mode: ${researchMode})`)
      
      // Create EventSource with URL parameters
      const params = new URLSearchParams({
        keyword: keyword.trim(),
        limit: '5',
        maxReviews: '1000'
      })
      
      // Add market information if adding to existing market
      if (researchMode === 'add-to-market' && selectedMarket) {
        params.set('marketId', selectedMarket)
        params.set('mode', 'add-to-market')
      }
      
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
        setError("Connection error during market analysis")
        setIsLoading(false)
        eventSource.close()
      }
      
    } catch (error) {
      console.error("Market research failed:", error)
      setError(error instanceof Error ? error.message : "Failed to analyze market")
      setIsLoading(false)
    }
  }

  const startResearch = async (mode: 'new' | 'refresh') => {
    setRefreshMode(mode)
    setShowMarketChoice(false)
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
      console.log(`Starting SSE research for keyword: ${keyword} (mode: ${mode})`)
      
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

  const handleAsinSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    
    // Get all ASINs (from tags + current input)
    const allAsins = getTotalValidAsins()
    const invalidAsins = getInvalidAsins(asinInput)
    
    // Validate ASINs
    if (invalidAsins.length > 0) {
      setError(`Invalid ASIN format: ${invalidAsins.join(', ')}. ASINs must be 10 alphanumeric characters.`)
      return
    }
    
    if (allAsins.length === 0) {
      setError("Please enter at least one valid ASIN")
      return
    }
    
    if (allAsins.length > 10) {
      setError("Maximum 10 ASINs allowed per research session")
      return
    }

    // Check if we're adding to an existing market
    if (researchMode === 'add-to-market' && !selectedMarket) {
      setError("Please select a market to add ASINs to")
      return
    }

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
      const endpoint = allAsins.length === 1 
        ? '/api/products/research/asin/stream' 
        : '/api/products/research/multi-asin/stream'
      
      const params = new URLSearchParams()
      
      if (allAsins.length === 1) {
        params.set('asin', allAsins[0])
      } else {
        params.set('asins', allAsins.join(','))
      }
      
      // Add market information if adding to existing market
      if (researchMode === 'add-to-market' && selectedMarket) {
        params.set('marketId', selectedMarket)
        params.set('mode', 'add-to-market')
      }
      
      console.log(`Starting SSE research for ${allAsins.length} ASIN(s):`, allAsins)
      
      const eventSource = new EventSource(`${endpoint}?${params}`)

      eventSource.onmessage = (event) => {
        try {
          const progressEvent = JSON.parse(event.data)
          console.log("ASIN Progress event:", progressEvent)
          
          // Send event to display controller
          displayControllerRef.current?.handleBackendEvent(progressEvent)
          
          if (progressEvent.phase === 'complete') {
            if (progressEvent.data.products && progressEvent.data.products.length > 0) {
              setResults(progressEvent.data.products)
              // ASIN research doesn't produce market analysis
              setMarketAnalysis(null)
            } else {
              setError(progressEvent.data.message || "ASIN not found or invalid")
            }
            setIsLoading(false)
            eventSource.close()
          } else if (progressEvent.phase === 'error') {
            setError(progressEvent.message)
            setIsLoading(false)
            eventSource.close()
          }
        } catch (parseError) {
          console.error("Failed to parse ASIN progress event:", parseError)
        }
      }

      eventSource.onerror = (error) => {
        console.error("ASIN SSE error:", error)
        setError("Connection error during ASIN research")
        setIsLoading(false)
        eventSource.close()
      }
      
    } catch (error) {
      console.error("ASIN Research failed:", error)
      setError(error instanceof Error ? error.message : "Failed to analyze ASIN")
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
          marketAnalysis: marketAnalysis,
          refreshMode: refreshMode,
          existingMarketId: refreshMode === 'refresh' ? existingMarket?.id : selectedMarket,
          researchMode: researchMode,
          targetMarketId: researchMode === 'add-to-market' ? selectedMarket : null
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.details || `HTTP ${response.status}: Failed to save products`
        throw new Error(errorMessage)
      }

      const data = await response.json()
      console.log("Save successful:", data)
      
      if (!data.success) {
        throw new Error(data.error || 'Save operation was not successful')
      }
      
      // Show success toast with duplicate information
      if (data.count === 0 && data.duplicatesSkipped > 0) {
        toast.info("No new products to save", {
          description: `All ${data.duplicatesSkipped} products were already in your database`,
          duration: 4000,
        })
      } else if (data.duplicatesSkipped > 0) {
        toast.success("Products saved successfully!", {
          description: `${data.count} new products added, ${data.duplicatesSkipped} duplicates skipped`,
          duration: 4000,
        })
      } else {
        toast.success("Products saved successfully!", {
          description: `${data.count} products saved to your database`,
          duration: 3000,
        })
      }
      
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
      const errorMessage = error instanceof Error ? error.message : "Failed to save products"
      setError(errorMessage)
      
      // Show error toast
      toast.error("Failed to save products", {
        description: errorMessage,
        duration: 5000,
      })
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
    setAsinInput("")
    setAsinTags([])
    setSelectedMarket(null)
    setResearchMode('new')
    setShowProducts(false)
    setSaveSuccess(false)
    setExistingMarket(null)
    setShowMarketChoice(false)
    setRefreshMode('new')
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

  // Render industry-grade progress UI with phase-specific cards
  const renderProgressPhase = () => {
    const { currentPhase, phaseMessage, phaseData, progress, stepType, showProgress } = displayState

    const renderPhaseDetails = () => {      
      switch (currentPhase) {
        case 'marketplace_analysis':
          return (
            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg font-semibold text-gray-900">
                  <div className="p-2 bg-blue-100 rounded-lg mr-3">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                  </div>
                  Amazon Market Analysis
                </CardTitle>
                <CardDescription className="text-sm text-gray-600">
                  Scanning Amazon catalog and analyzing competitive landscape
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Current Status */}
                <div className="flex items-center justify-between p-3 bg-white/70 rounded-lg border border-blue-100">
                  <div className="flex items-center gap-3">
                    <div className="animate-pulse">
                      <Activity className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-900">{phaseMessage}</span>
                  </div>
                  {phaseData && (
                    <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">
                      Step {phaseData.currentStep} of {phaseData.totalSteps}
                    </Badge>
                  )}
                </div>

                {/* Enhanced Progress Visualization */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium text-gray-700">
                    <span>Analysis Progress</span>
                    <span>{phaseData?.currentStep || 0} / {phaseData?.totalSteps || 8} Complete</span>
                  </div>
                  <Progress 
                    value={((phaseData?.currentStep || 0) / (phaseData?.totalSteps || 8)) * 100} 
                    className="h-2"
                  />
                </div>

                {/* Professional Analysis Steps Grid - Compact */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { icon: Search, label: 'Catalog', color: 'blue' },
                    { icon: DollarSign, label: 'Pricing', color: 'green' },
                    { icon: Package, label: 'Products', color: 'purple' },
                    { icon: TrendingUp, label: 'Sales', color: 'orange' },
                    { icon: Users, label: 'Market', color: 'red' },
                    { icon: Target, label: 'Opportunities', color: 'yellow' },
                    { icon: Trophy, label: 'Reviews', color: 'pink' },
                    { icon: Zap, label: 'Final', color: 'indigo' }
                  ].map((item, i) => {
                    const Icon = item.icon
                    const isActive = i < (phaseData?.currentStep || 0)
                    const isCurrent = i === (phaseData?.currentStep || 0) - 1
                    
                    return (
                      <div
                        key={i}
                        title={item.label}
                        className={`p-2 rounded-lg text-center transition-all duration-300 ${
                          isActive 
                            ? item.color === 'pink' 
                              ? 'bg-pink-100 border border-pink-200'
                              : item.color === 'yellow'
                              ? 'bg-yellow-100 border border-yellow-200'
                              : item.color === 'indigo'
                              ? 'bg-indigo-100 border border-indigo-200'
                              : `bg-${item.color}-100 border border-${item.color}-200`
                            : isCurrent
                            ? item.color === 'pink'
                              ? 'bg-pink-50 border border-pink-200 animate-pulse'
                              : item.color === 'yellow'
                              ? 'bg-yellow-50 border border-yellow-200 animate-pulse'
                              : item.color === 'indigo'
                              ? 'bg-indigo-50 border border-indigo-200 animate-pulse'
                              : `bg-${item.color}-50 border border-${item.color}-200 animate-pulse`
                            : 'bg-gray-50 border border-gray-200'
                        }`}
                      >
                        <Icon className={`h-4 w-4 mx-auto mb-1 ${
                          isActive || isCurrent 
                            ? item.color === 'pink'
                              ? 'text-pink-600'
                              : item.color === 'yellow'
                              ? 'text-yellow-600'
                              : item.color === 'indigo'
                              ? 'text-indigo-600'
                              : `text-${item.color}-600`
                            : 'text-gray-400'
                        }`} />
                        <div className={`text-[10px] font-medium leading-tight truncate ${
                          isActive || isCurrent ? 'text-gray-900' : 'text-gray-500'
                        }`}>
                          {item.label}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Current Analysis Context - Compact */}
                {phaseData?.keyword && (
                  <div className="text-center p-3 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg border border-blue-200">
                    <div className="text-xs text-blue-600 font-medium">Currently Analyzing</div>
                    <div className="text-sm font-semibold text-blue-900 mt-1 truncate">"{phaseData.keyword}" Market</div>
                  </div>
                )}
              </CardContent>
            </Card>
          )

        case 'validating_market':
          return (
            <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-green-50">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg font-semibold text-gray-900">
                  <div className="p-2 bg-emerald-100 rounded-lg mr-3">
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                  </div>
                  Product Validation
                </CardTitle>
                <CardDescription className="text-sm text-gray-600">
                  Verifying product data with advanced market intelligence
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Current Status */}
                <div className="flex items-center justify-between p-3 bg-white/70 rounded-lg border border-emerald-100">
                  <div className="flex items-center gap-3">
                    <div className="animate-pulse">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-900">{phaseMessage}</span>
                  </div>
                  {phaseData && phaseData.totalItems && (
                    <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200">
                      {phaseData.currentItem || 0} / {phaseData.totalItems} Products
                    </Badge>
                  )}
                </div>

                {/* Products Grid - Compact */}
                {phaseData && phaseData.allProducts && (
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-gray-900">Products Under Analysis:</div>
                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                      {phaseData.allProducts.map((product: any, index: number) => {
                        const isVerifying = product.status === 'verifying'
                        
                        return (
                          <div
                            key={product.asin}
                            className={`flex items-center gap-3 p-2 rounded-lg border transition-all duration-300 ${
                              isVerifying 
                                ? 'bg-white border-emerald-200 shadow-sm' 
                                : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            {/* Product Image */}
                            <div className="flex-shrink-0">
                              {product.image ? (
                                <img 
                                  src={product.image} 
                                  alt="Product" 
                                  className="w-8 h-8 object-cover rounded-lg border bg-white"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                  }}
                                />
                              ) : (
                                <div className="w-8 h-8 bg-gray-200 rounded-lg border flex items-center justify-center">
                                  <Package className="w-4 h-4 text-gray-400" />
                                </div>
                              )}
                            </div>
                            
                            {/* Product Info */}
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-gray-900 line-clamp-1">{product.title}</div>
                              <div className="text-[10px] text-gray-500">ASIN: {product.asin}</div>
                            </div>
                            
                            {/* Status Indicator */}
                            <div className="flex-shrink-0">
                              {isVerifying && (
                                <div className="flex items-center gap-2">
                                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-emerald-600 border-t-transparent"></div>
                                  <span className="text-xs font-medium text-emerald-600">Analyzing</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    
                    {/* Analysis Progress - Compact */}
                    <div className="text-center p-3 bg-gradient-to-r from-emerald-100 to-green-100 rounded-lg border border-emerald-200">
                      <div className="flex items-center justify-center gap-3">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-600 border-t-transparent"></div>
                        <span className="text-sm font-medium text-emerald-700">
                          Advanced analytics in progress...
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )

        case 'applying_grading':
          return (
            <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-violet-50">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg font-semibold text-gray-900">
                  <div className="p-2 bg-purple-100 rounded-lg mr-3">
                    <Crown className="h-5 w-5 text-purple-600" />
                  </div>
                  A10 Grading Algorithm
                </CardTitle>
                <CardDescription className="text-sm text-gray-600">
                  Applying proprietary scoring algorithm for market opportunity assessment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Current Status */}
                <div className="flex items-center justify-between p-3 bg-white/70 rounded-lg border border-purple-100">
                  <div className="flex items-center gap-3">
                    <div className="animate-pulse">
                      <Crown className="h-4 w-4 text-purple-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-900">{phaseMessage}</span>
                  </div>
                  {phaseData && (
                    <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-200">
                      {phaseData.productsToGrade} Products
                    </Badge>
                  )}
                </div>

                {/* Algorithm Visualization - Compact */}
                <div className="bg-gradient-to-r from-purple-100 to-violet-100 p-3 rounded-lg border border-purple-200">
                  <div className="text-center space-y-2">
                    <div className="text-sm font-medium text-purple-700">A10 Algorithm Processing</div>
                    <div className="flex items-center justify-center gap-2">
                      {['A', '1', '0', '→', 'F', '1'].map((char, i) => (
                        <div
                          key={i}
                          className={`text-lg font-bold text-purple-600 animate-pulse ${
                            char === '→' ? 'text-purple-400' : ''
                          }`}
                          style={{ animationDelay: `${i * 0.3}s` }}
                        >
                          {char}
                        </div>
                      ))}
                    </div>
                    <div className="text-xs text-purple-600">
                      Comprehensive market opportunity scoring in progress
                    </div>
                  </div>
                </div>

                {/* Grading Metrics - Compact */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { icon: DollarSign, label: 'Revenue', color: 'green' },
                    { icon: TrendingUp, label: 'Trends', color: 'blue' },
                    { icon: Users, label: 'Competition', color: 'orange' },
                    { icon: Target, label: 'Opportunity', color: 'purple' }
                  ].map((metric, i) => {
                    const Icon = metric.icon
                    return (
                      <div
                        key={i}
                        className="p-2 bg-white/60 rounded-lg border border-purple-100 text-center"
                      >
                        <Icon className={`h-4 w-4 mx-auto mb-1 text-${metric.color}-600 animate-pulse`} />
                        <div className="text-[10px] font-medium text-gray-700 leading-tight truncate">{metric.label}</div>
                      </div>
                    )
                  })}
                </div>

                {/* Final Processing - Compact */}
                <div className="text-center p-3 bg-gradient-to-r from-purple-100 to-violet-100 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-center gap-3">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-600 border-t-transparent"></div>
                    <span className="text-sm font-medium text-purple-700">
                      Finalizing market intelligence report...
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )

        case 'product_analysis':
        case 'multi_asin_analysis':
        case 'batch_processing':
          return (
            <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-amber-50">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg font-semibold text-gray-900">
                  <div className="p-2 bg-orange-100 rounded-lg mr-3">
                    <Package className="h-5 w-5 text-orange-600" />
                  </div>
                  Product Intelligence Analysis
                </CardTitle>
                <CardDescription className="text-sm text-gray-600">
                  Deep-diving into product data and competitive intelligence
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Current Status */}
                <div className="flex items-center justify-between p-3 bg-white/70 rounded-lg border border-orange-100">
                  <div className="flex items-center gap-3">
                    <div className="animate-pulse">
                      <Package className="h-4 w-4 text-orange-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-900">{phaseMessage}</span>
                  </div>
                  {phaseData?.asin && (
                    <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200 font-mono text-xs">
                      {phaseData.asin}
                    </Badge>
                  )}
                </div>

                {/* Analysis Components - Compact */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: Package, label: 'Product', color: 'orange' },
                    { icon: Search, label: 'Intelligence', color: 'blue' },
                    { icon: TrendingUp, label: 'Analytics', color: 'green' }
                  ].map((component, i) => {
                    const Icon = component.icon
                    return (
                      <div
                        key={i}
                        className="p-3 bg-white/60 rounded-lg border border-orange-100 text-center"
                      >
                        <Icon className={`h-5 w-5 mx-auto mb-1 text-${component.color}-600 animate-pulse`} />
                        <div className="text-xs font-medium text-gray-700 truncate">{component.label}</div>
                      </div>
                    )
                  })}
                </div>

                {/* Processing Status - Compact */}
                <div className="text-center p-3 bg-gradient-to-r from-orange-100 to-amber-100 rounded-lg border border-orange-200">
                  <div className="flex items-center justify-center gap-3">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-orange-600 border-t-transparent"></div>
                    <span className="text-sm font-medium text-orange-700">
                      Processing product intelligence data...
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )

        case 'market_integration':
          return (
            <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-50 to-blue-50">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg font-semibold text-gray-900">
                  <div className="p-2 bg-indigo-100 rounded-lg mr-3">
                    <Database className="h-5 w-5 text-indigo-600" />
                  </div>
                  Market Integration
                </CardTitle>
                <CardDescription className="text-sm text-gray-600">
                  Integrating analysis results into your market database
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-white/70 rounded-lg border border-indigo-100">
                  <div className="flex items-center gap-3">
                    <div className="animate-pulse">
                      <Database className="h-4 w-4 text-indigo-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-900">{phaseMessage}</span>
                  </div>
                </div>

                <div className="text-center p-3 bg-gradient-to-r from-indigo-100 to-blue-100 rounded-lg border border-indigo-200">
                  <div className="flex items-center justify-center gap-3">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent"></div>
                    <span className="text-sm font-medium text-indigo-700">
                      Updating market intelligence database...
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )

        default:
          return (
            <Card className="border-0 shadow-lg bg-gradient-to-br from-gray-50 to-slate-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-center gap-3">
                  <div className="animate-pulse">
                    <Activity className="h-6 w-6 text-gray-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    Initializing market intelligence engine...
                  </span>
                </div>
              </CardContent>
            </Card>
          )
      }
    }

    return (
      <div className="space-y-6">
        {/* Professional Phase-Specific Card */}
        {renderPhaseDetails()}
      </div>
    )
  }

  // Market choice UI
  const renderMarketChoice = () => {
    if (!showMarketChoice || !existingMarket) return null

    return (
      <div className="space-y-6">
        {/* Simplified, elegant info banner */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200/60 dark:border-amber-800/30 rounded-lg p-4 fade-in-subtle">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                <span className="font-semibold">"{existingMarket.keyword}"</span> previously researched
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                {existingMarket.productCount} products • Updated {new Date(existingMarket.updatedAt).toLocaleDateString()}
              </p>
            </div>
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
          </div>
        </div>

        <div className="space-y-3 scale-in-gentle">
          {/* Primary Action: Add to Market - Using plus icon instead of search */}
          <Button 
            onClick={() => startResearch('refresh')}
            className="group w-full h-auto p-5 flex items-center justify-between bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.01] hover:-translate-y-0.5 border-0"
          >
            <div className="flex items-center space-x-4">
              <div className="p-2.5 bg-primary-foreground/20 rounded-lg group-hover:bg-primary-foreground/30 transition-all duration-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div className="text-left">
                <div className="font-semibold text-base mb-0.5">Add to Market</div>
                <div className="text-sm text-primary-foreground/80">
                  Expand with fresh products
                </div>
              </div>
            </div>
            <div className="p-1.5 bg-primary-foreground/10 rounded-full group-hover:translate-x-1 transition-transform duration-300">
              <IconChevronRight className="w-4 h-4" />
            </div>
          </Button>
          
          {/* Secondary Action: Create New Market - Using refresh icon */}
          <Button 
            variant="outline"
            onClick={() => startResearch('new')}
            className="group w-full h-auto p-5 flex items-center justify-between border-2 border-border hover:border-primary/30 bg-card hover:bg-muted/50 transition-all duration-300 hover:scale-[1.01] hover:shadow-md"
          >
            <div className="flex items-center space-x-4">
              <div className="p-2.5 bg-muted rounded-lg group-hover:bg-primary/10 transition-all duration-300">
                <svg className="w-5 h-5 text-muted-foreground group-hover:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div className="text-left">
                <div className="font-semibold text-base text-foreground mb-0.5">Create New Market</div>
                <div className="text-sm text-muted-foreground">
                  Fresh analysis for "{keyword}"
                </div>
              </div>
            </div>
            <div className="p-1.5 bg-muted/50 rounded-full group-hover:bg-primary/10 group-hover:translate-x-1 transition-all duration-300">
              <IconChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
            </div>
          </Button>
        </div>
      </div>
    )
  }

  // Enhanced 4-state rendering: Loading, Market Choice, Results, Input
  const renderContent = () => {
    if (isLoading) {
      return renderProgressPhase()
    }

    if (showMarketChoice) {
      return renderMarketChoice()
    }

    if (error) {
      return (
        <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-rose-50">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-lg font-semibold text-gray-900">
              <div className="p-2 bg-red-100 rounded-lg mr-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              Analysis Error
            </CardTitle>
            <CardDescription className="text-sm text-gray-600">
              We encountered an issue during the market intelligence analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Error Details */}
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-red-800 mb-1">Error Details</div>
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              </div>
            </div>

            {/* Suggested Actions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-sm font-medium text-blue-800 mb-2">Suggested Actions:</div>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Verify your input parameters are correct</li>
                <li>• Check your internet connection</li>
                <li>• Try again with different search terms</li>
                <li>• Contact support if the issue persists</li>
              </ul>
            </div>

            {/* Action Button */}
            <div className="flex justify-center">
              <Button 
                onClick={handleStartOver}
                className="px-8 bg-blue-600 hover:bg-blue-700"
              >
                <Search className="w-4 h-4 mr-2" />
                Start New Analysis
              </Button>
            </div>
          </CardContent>
        </Card>
      )
    }

    if (results.length > 0) {
      return (
        <div className="space-y-4">
          {/* Compact Executive Summary */}
          {marketAnalysis && (
            <div className="space-y-3">
              {/* Header with Badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Market Analysis</h3>
                  <span className="text-sm text-gray-500">• "{keyword}"</span>
                </div>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {results.length} Products
                </Badge>
              </div>

              {/* Compact Metrics Row */}
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <div className="grid grid-cols-4 gap-3">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Crown className="h-3 w-3 text-emerald-600" />
                      <span className="text-xs font-medium text-gray-700">Grade</span>
                    </div>
                    <div className="text-lg font-bold text-gray-900">{marketAnalysis.market_grade}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">Good</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <DollarSign className="h-3 w-3 text-blue-600" />
                      <span className="text-xs font-medium text-gray-700">Revenue</span>
                    </div>
                    <div className="text-lg font-bold text-gray-900">
                      ${(marketAnalysis.avg_monthly_revenue || 0) >= 1000 
                        ? `${Math.round((marketAnalysis.avg_monthly_revenue || 0) / 1000)}K`
                        : (marketAnalysis.avg_monthly_revenue || 0).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">Monthly</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <TrendingUp className="h-3 w-3 text-purple-600" />
                      <span className="text-xs font-medium text-gray-700">Profit</span>
                    </div>
                    <div className="text-lg font-bold text-gray-900">
                      {((marketAnalysis.avg_profit_margin || 0) * 100).toFixed(1)}%
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">Average</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Target className="h-3 w-3 text-orange-600" />
                      <span className="text-xs font-medium text-gray-700">Score</span>
                    </div>
                    <div className="text-lg font-bold text-gray-900">{marketAnalysis.opportunity_score}/100</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      {marketAnalysis.opportunity_score >= 80 ? 'Excellent' : 
                       marketAnalysis.opportunity_score >= 60 ? 'Good' : 
                       marketAnalysis.opportunity_score >= 40 ? 'Fair' : 'Poor'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Compact Intelligence Summary */}
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <div className="flex items-center gap-1 mb-2">
                  <BarChart3 className="h-3 w-3 text-gray-600" />
                  <h3 className="text-xs font-medium text-gray-900">Market Intelligence Summary</h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Shield className="h-3 w-3 text-blue-600" />
                      <span className="text-xs font-medium text-gray-700">Consistency</span>
                    </div>
                    <div className="text-sm font-semibold text-gray-900">{marketAnalysis.market_consistency_rating}</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span className="text-xs font-medium text-gray-700">Verified</span>
                    </div>
                    <div className="text-sm font-semibold text-gray-900">{marketAnalysis.products_verified}</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <AlertCircle className="h-3 w-3 text-amber-600" />
                      <span className="text-xs font-medium text-gray-700">Risk</span>
                    </div>
                    <div className="text-sm font-semibold text-gray-900">{marketAnalysis.market_risk_classification || 'Safe'}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Compact Product Analysis Section */}
          <div className="bg-gray-50 rounded-lg border">
            <div className="flex items-center justify-between p-3">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-semibold text-gray-900">Product Analysis Results</span>
                <Badge variant="outline" className="bg-white text-gray-700 border-gray-200 text-xs">
                  {results.length} Products
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowProducts(!showProducts)}
                className="h-7 px-2 text-xs"
              >
                {showProducts ? (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Hide
                  </>
                ) : (
                  <>
                    <ChevronRight className="h-3 w-3 mr-1" />
                    View
                  </>
                )}
              </Button>
            </div>
            
            {showProducts && (
              <CardContent className="pt-0">
                <div className="space-y-4">
                  {results.map((product, index) => {
                    const gradeInfo = getGradeInfo(product.grade || 'F1')
                    
                    return (
                      <Card key={product.id || product.asin || index} className="border border-gray-200 hover:shadow-sm transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex gap-4">
                            {/* Product Image */}
                            <div className="flex-shrink-0">
                              {product.images && product.images[0] ? (
                                <img 
                                  src={product.images[0]} 
                                  alt="Product" 
                                  className="w-16 h-16 object-cover rounded-lg border bg-white"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                  }}
                                />
                              ) : (
                                <div className="w-16 h-16 bg-gray-100 rounded-lg border flex items-center justify-center">
                                  <Package className="w-8 h-8 text-gray-400" />
                                </div>
                              )}
                            </div>
                            
                            {/* Product Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex-1 min-w-0 pr-4">
                                  <h4 className="text-sm font-medium text-gray-900 line-clamp-2">
                                    {product.title || `ASIN: ${product.asin}`}
                                  </h4>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {product.brand && `${product.brand} • `}
                                    ASIN: {product.asin}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  <Badge className={`${gradeInfo.color} border-0 text-xs font-medium`}>
                                    {gradeInfo.icon} {product.grade || 'F1'}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700 border-gray-200">
                                    {gradeInfo.status}
                                  </Badge>
                                </div>
                              </div>
                              
                              {/* Product Metrics */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                                <div>
                                  <div className="text-xs text-gray-500 mb-1">Monthly Revenue</div>
                                  <div className="text-sm font-semibold text-gray-900">
                                    ${product.salesData?.monthlyRevenue?.toLocaleString() || 'N/A'}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-500 mb-1">Monthly Sales</div>
                                  <div className="text-sm font-semibold text-gray-900">
                                    {product.salesData?.monthlySales?.toLocaleString() || 'N/A'} units
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-500 mb-1">Price</div>
                                  <div className="text-sm font-semibold text-gray-900">${product.price || 'N/A'}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-500 mb-1">Reviews</div>
                                  <div className="text-sm font-semibold text-gray-900">{product.reviews?.toLocaleString() || '0'}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </CardContent>
            )}
          </div>
          
          {/* Professional Action Buttons - Matching Keyword Research Design */}
          <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-gray-50 rounded">
                <Database className="h-3.5 w-3.5 text-gray-600" />
              </div>
              <span className="text-sm font-medium text-gray-900">Ready to Save Analysis</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleStartOver}
                disabled={isSaving}
                className="h-9"
              >
                <Search className="mr-2 h-3.5 w-3.5" />
                New Analysis
              </Button>
              <Button 
                onClick={handleSaveResults} 
                size="sm"
                className={`h-9 ${
                  saveSuccess 
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                    : "bg-gray-900 hover:bg-gray-800 text-white"
                }`}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Saving Results
                  </>
                ) : saveSuccess ? (
                  <>
                    <CheckCircle className="mr-2 h-3.5 w-3.5" />
                    Successfully Saved!
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-3.5 w-3.5" />
                    Save Results
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )
    }

    // Default: Show professional input form
    return (
      <div className="space-y-6">
        {/* Enhanced Tab Navigation */}
        <Tabs defaultValue="keyword" className="w-full" onValueChange={() => setError(null)}>
          <TabsList className="bg-gray-100 p-1 inline-flex h-auto rounded-xl border border-gray-200 shadow-sm w-full sm:w-auto">
            <TabsTrigger 
              value="keyword" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-3 sm:px-6 py-2 sm:py-3 rounded-lg transition-all font-medium flex-1 sm:flex-none"
            >
              <Search className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="text-xs sm:text-sm">Market Analysis</span>
            </TabsTrigger>
            <TabsTrigger 
              value="asin" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-3 sm:px-6 py-2 sm:py-3 rounded-lg transition-all font-medium flex-1 sm:flex-none"
            >
              <Package className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="text-xs sm:text-sm">ASIN Analysis</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="keyword" className="mt-6">
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-base font-semibold">
                  <Search className="h-4 w-4 mr-2 text-blue-600" />
                  Market Analysis
                </CardTitle>
                <CardDescription className="text-sm text-gray-600">
                  Enter a product keyword to analyze market opportunities and competitive landscape
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleKeywordSubmit} className="space-y-6">
                  {/* Analysis Mode Selection - Matching ASIN Flow */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-900">
                      Analysis Mode
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setResearchMode('new')}
                        className={`p-3 rounded-lg border-2 transition-all text-left ${
                          researchMode === 'new'
                            ? 'border-blue-500 bg-blue-50 text-blue-900'
                            : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Plus className="w-4 h-4" />
                          <span className="font-medium text-sm">New Analysis</span>
                          {researchMode === 'new' && <Check className="w-4 h-4 ml-auto" />}
                        </div>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => availableMarkets.length > 0 && setResearchMode('add-to-market')}
                        disabled={availableMarkets.length === 0}
                        className={`p-3 rounded-lg border-2 transition-all text-left ${
                          researchMode === 'add-to-market'
                            ? 'border-purple-500 bg-purple-50 text-purple-900'
                            : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                        } ${availableMarkets.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4" />
                          <span className="font-medium text-sm">Add to Market</span>
                          {researchMode === 'add-to-market' && <Check className="w-4 h-4 ml-auto" />}
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Market Selection Dropdown - Custom Beautiful Dropdown */}
                  {researchMode === 'add-to-market' && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-gray-900">
                        Target Market
                      </Label>
                      {loadingMarkets ? (
                        <div className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg bg-gray-50">
                          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                          <span className="text-sm text-gray-600">Loading markets...</span>
                        </div>
                      ) : availableMarkets.length === 0 ? (
                        <div className="p-4 border border-dashed border-gray-300 rounded-lg bg-gray-50/50 text-center">
                          <Database className="w-5 h-5 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600 font-medium">No saved markets found</p>
                          <p className="text-xs text-gray-500 mt-1">Create your first market analysis to expand existing research</p>
                        </div>
                      ) : (
                        <Select
                          value={selectedMarket || ''}
                          onValueChange={(value) => setSelectedMarket(value || null)}
                          disabled={isLoading}
                        >
                          <SelectTrigger className="!h-12 !px-3 !py-3 w-full rounded-lg border-2 border-gray-200 bg-white text-left focus:border-purple-300 focus:ring-2 focus:ring-purple-300 focus:ring-offset-2 hover:border-gray-300 hover:bg-gray-50/50 transition-all">
                            <SelectValue placeholder={
                              <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-gray-100 rounded-lg">
                                  <Database className="w-4 h-4 text-gray-500" />
                                </div>
                                <div className="text-left">
                                  <div className="font-medium text-gray-600">
                                    Choose a market to expand...
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Select from your saved market analyses
                                  </div>
                                </div>
                              </div>
                            }>
                              {selectedMarket && (
                                <div className="flex items-center gap-3">
                                  <div className="p-1.5 bg-purple-100 rounded-lg">
                                    <Target className="w-4 h-4 text-purple-600" />
                                  </div>
                                  <div className="text-left">
                                    <div className="font-medium text-gray-900">
                                      {availableMarkets.find(m => m.id === selectedMarket)?.keyword}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {availableMarkets.find(m => m.id === selectedMarket)?.total_products_analyzed || 0} products analyzed
                                    </div>
                                  </div>
                                </div>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent 
                            className="max-h-[300px] w-[var(--radix-select-trigger-width)]"
                            position="popper"
                            sideOffset={4}
                          >
                            {availableMarkets.map((market) => (
                              <SelectItem 
                                key={market.id} 
                                value={market.id}
                                className="p-4 focus:bg-purple-50 cursor-pointer"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="p-1.5 bg-gray-100 rounded-lg group-data-[state=checked]:bg-purple-100 group-focus:bg-purple-100">
                                    <Target className="w-4 h-4 text-gray-600 group-data-[state=checked]:text-purple-600 group-focus:text-purple-600" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-sm text-gray-900">
                                        {market.keyword}
                                      </span>
                                      <Badge 
                                        variant="secondary" 
                                        className="text-xs bg-gray-100 text-gray-600 border-0"
                                      >
                                        {market.total_products_analyzed || 0} products
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                      Market analysis ready for expansion
                                    </p>
                                  </div>
                                  {selectedMarket === market.id && (
                                    <Check className="w-4 h-4 text-purple-600" />
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  )}

                  <div className="space-y-3">
                    <Label htmlFor="keyword" className="text-sm font-medium text-gray-900">
                      Product Keyword
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="keyword"
                        placeholder="e.g., wireless charger, bluetooth speaker, yoga mat"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        className="pl-10 h-11 border-gray-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-300 focus:ring-offset-2"
                        disabled={isLoading}
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      We'll analyze top products, competition, and market opportunities
                    </p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-100">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onClose}
                      disabled={isLoading}
                      className="w-full sm:w-auto px-6"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isLoading || !keyword.trim() || (researchMode === 'add-to-market' && !selectedMarket)}
                      className="w-full sm:w-auto px-6 bg-blue-600 hover:bg-blue-700"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Analyzing Market...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Start Analysis
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        
          <TabsContent value="asin" className="mt-6">
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-base font-semibold">
                  <Package className="h-4 w-4 mr-2 text-purple-600" />
                  Product Analysis
                </CardTitle>
                <CardDescription className="text-sm text-gray-600">
                  Analyze specific products by ASIN and discover market opportunities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAsinSubmit} className="space-y-6">
                  {/* Compact Research Mode Selection */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-900">Analysis Mode</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setResearchMode('new')}
                        className={`p-3 rounded-lg border-2 transition-all text-left ${
                          researchMode === 'new'
                            ? 'border-blue-500 bg-blue-50 text-blue-900'
                            : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Plus className="w-4 h-4" />
                          <span className="font-medium text-sm">New Analysis</span>
                          {researchMode === 'new' && <Check className="w-4 h-4 ml-auto" />}
                        </div>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => availableMarkets.length > 0 && setResearchMode('add-to-market')}
                        disabled={availableMarkets.length === 0}
                        className={`p-3 rounded-lg border-2 transition-all text-left ${
                          researchMode === 'add-to-market'
                            ? 'border-purple-500 bg-purple-50 text-purple-900'
                            : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                        } ${availableMarkets.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4" />
                          <span className="font-medium text-sm">Add to Market</span>
                          {researchMode === 'add-to-market' && <Check className="w-4 h-4 ml-auto" />}
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Enhanced Market Selection */}
                  {researchMode === 'add-to-market' && (
                    <div className="space-y-3">
                      <Label htmlFor="market-select" className="text-sm font-medium text-gray-900">
                        Target Market
                      </Label>
                      {loadingMarkets ? (
                        <div className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg bg-gray-50">
                          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                          <span className="text-sm text-gray-600">Loading markets...</span>
                        </div>
                      ) : availableMarkets.length === 0 ? (
                        <div className="p-4 border border-dashed border-gray-300 rounded-lg bg-gray-50/50 text-center">
                          <Database className="w-5 h-5 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600 font-medium">No saved markets found</p>
                          <p className="text-xs text-gray-500 mt-1">Create your first market analysis to expand existing research</p>
                        </div>
                      ) : (
                        <Select
                          value={selectedMarket || ''}
                          onValueChange={(value) => setSelectedMarket(value || null)}
                          disabled={isLoading}
                        >
                          <SelectTrigger className="!h-12 !px-3 !py-3 w-full rounded-lg border-2 border-gray-200 bg-white text-left focus:border-purple-300 focus:ring-2 focus:ring-purple-300 focus:ring-offset-2 hover:border-gray-300 hover:bg-gray-50/50 transition-all">
                            <SelectValue placeholder={
                              <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-gray-100 rounded-lg">
                                  <Database className="w-4 h-4 text-gray-500" />
                                </div>
                                <div className="text-left">
                                  <div className="font-medium text-gray-600">
                                    Choose a market to expand...
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Select from your saved market analyses
                                  </div>
                                </div>
                              </div>
                            }>
                              {selectedMarket && (
                                <div className="flex items-center gap-3">
                                  <div className="p-1.5 bg-purple-100 rounded-lg">
                                    <Target className="w-4 h-4 text-purple-600" />
                                  </div>
                                  <div className="text-left">
                                    <div className="font-medium text-gray-900">
                                      {availableMarkets.find(m => m.id === selectedMarket)?.keyword}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {availableMarkets.find(m => m.id === selectedMarket)?.total_products_analyzed || 0} products analyzed
                                    </div>
                                  </div>
                                </div>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent 
                            className="max-h-[300px] w-[var(--radix-select-trigger-width)]"
                            position="popper"
                            sideOffset={4}
                          >
                            {availableMarkets.map((market) => (
                              <SelectItem 
                                key={market.id} 
                                value={market.id}
                                className="p-4 focus:bg-purple-50 cursor-pointer"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="p-1.5 bg-gray-100 rounded-lg group-data-[state=checked]:bg-purple-100 group-focus:bg-purple-100">
                                    <Target className="w-4 h-4 text-gray-600 group-data-[state=checked]:text-purple-600 group-focus:text-purple-600" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-sm text-gray-900">
                                        {market.keyword}
                                      </span>
                                      <Badge 
                                        variant="secondary" 
                                        className="text-xs bg-gray-100 text-gray-600 border-0"
                                      >
                                        {market.total_products_analyzed || 0} products
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                      Market analysis ready for expansion
                                    </p>
                                  </div>
                                  {selectedMarket === market.id && (
                                    <Check className="w-4 h-4 text-purple-600" />
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  )}

                  {/* ASIN Input with Bubble Tags */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="asin-input" className="text-sm font-medium text-gray-900">
                        Product ASINs
                      </Label>
                      <Badge 
                        variant="outline" 
                        className={`text-xs font-medium ${
                          getTotalValidAsins().length > 10 
                            ? 'bg-red-100 text-red-700 border-red-200' 
                            : getTotalValidAsins().length > 0
                            ? 'bg-green-100 text-green-700 border-green-200'
                            : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}
                      >
                        {getTotalValidAsins().length}/10
                      </Badge>
                    </div>
                    
                    {/* ASIN Tags Display */}
                    {asinTags.length > 0 && (
                      <div className="flex flex-wrap gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        {asinTags.map((asin) => (
                          <div
                            key={asin}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full border border-blue-200"
                          >
                            <Package className="w-3 h-3" />
                            {asin}
                            <button
                              onClick={() => removeAsinTag(asin)}
                              className="ml-1 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                              type="button"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="relative">
                      <Package className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <textarea
                        id="asin-input"
                        placeholder={asinTags.length > 0 
                          ? "Add more ASINs..." 
                          : "B0XXXXXXXXX, B0YYYYYYYYY, B0ZZZZZZZZZ\nEnter ASINs separated by commas, spaces, or line breaks"
                        }
                        value={asinInput}
                        onChange={(e) => handleAsinInputChange(e.target.value)}
                        onKeyDown={handleAsinKeyDown}
                        className="min-h-[80px] w-full rounded-lg border border-gray-200 bg-white px-3 py-3 pl-10 text-sm placeholder:text-gray-400 focus:border-purple-300 focus:ring-2 focus:ring-purple-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={isLoading}
                        rows={3}
                      />
                    </div>
                    
                    {/* Compact Validation Feedback */}
                    {(asinInput.trim() || getTotalValidAsins().length > 10) && (
                      <div className="space-y-2">
                        {getInvalidAsins(asinInput).length > 0 && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertCircle className="w-4 h-4 text-red-600" />
                              <span className="text-sm font-medium text-red-700">Invalid ASINs detected</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {getInvalidAsins(asinInput).map((invalidAsin, index) => (
                                <Badge key={index} variant="outline" className="bg-red-100 text-red-700 border-red-300 text-xs">
                                  {invalidAsin}
                                </Badge>
                              ))}
                            </div>
                            <p className="text-xs text-red-600 mt-2">
                              ASINs must be exactly 10 alphanumeric characters
                            </p>
                          </div>
                        )}
                        
                        {getTotalValidAsins().length > 10 && (
                          <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                            <AlertCircle className="w-4 h-4 text-red-600" />
                            <span className="text-sm font-medium text-red-700">
                              Too many ASINs - maximum 10 allowed per analysis
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <p className="text-xs text-gray-500">
                      Enter up to 10 Amazon product ASINs for comprehensive analysis and competitive intelligence
                    </p>
                  </div>
                  
                  {/* Simple Action Buttons */}
                  <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-100">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onClose}
                      disabled={isLoading}
                      className="w-full sm:w-auto px-6"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isLoading || getTotalValidAsins().length === 0 || getTotalValidAsins().length > 10}
                      className="w-full sm:w-auto px-6 bg-purple-600 hover:bg-purple-700"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Analyzing Products...
                        </>
                      ) : (
                        <>
                          <Target className="w-4 h-4 mr-2" />
                          Analyze {getTotalValidAsins().length || 0} Product{getTotalValidAsins().length === 1 ? '' : 's'}
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full mx-auto max-h-[85vh] overflow-y-auto bg-white border-0 shadow-2xl">
        <DialogHeader className="pb-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
              <Activity className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg font-semibold text-gray-900 truncate">
                {results.length > 0 ? "Research Results" : "Market Intelligence Research"}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 line-clamp-1">
                {results.length > 0
                  ? "Review your analysis results and save to your database"
                  : "Advanced Amazon market analysis with A10 grading algorithm"
                }
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="pt-4 px-1">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  )
}