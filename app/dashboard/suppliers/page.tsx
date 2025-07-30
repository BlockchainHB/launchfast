'use client'

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { WelcomeModal } from "@/components/ui/welcome-modal"
import { TrialBanner } from "@/components/trial-banner"
import { SupplierSourcingResultsTable } from "@/components/supplier-sourcing/SupplierSourcingResultsTable"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import type { SupplierSearchResult } from "@/types/supplier"
import { useTrialNotifications } from "@/hooks/use-trial-notifications"

import { 
  Factory, 
  Search, 
  BarChart3, 
  Zap, 
  X,
  Package,
  ArrowRight,
  Sparkles
} from "lucide-react"

interface MarketContext {
  marketId: string
  productName: string
  estimatedProfit: number
  marketGrade: string
  competitionLevel: 'low' | 'medium' | 'high'
  suggestedMOQ: number
}

export default function Page() {
  const searchParams = useSearchParams()
  const [supplierSearchData, setSupplierSearchData] = useState<SupplierSearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [marketContext, setMarketContext] = useState<MarketContext | null>(null)
  const [initialSearchTerm, setInitialSearchTerm] = useState<string>('')
  const [shouldAutoSearch, setShouldAutoSearch] = useState(false)
  
  // Trial notifications hook
  const { trialInfo, handleSubscribe } = useTrialNotifications()
  const [progressInfo, setProgressInfo] = useState<{
    phase: string
    message: string
    progress: number
    data?: any
  } | null>(null)
  
  // Search options state
  const [searchOptions, setSearchOptions] = useState({
    goldSupplierOnly: true,
    tradeAssuranceOnly: true,
    maxResults: 10,
    minYearsInBusiness: 2,
    maxMoq: 500,
    regions: [] as string[],
    certifications: [] as string[]
  })

  useEffect(() => {
    // Update document title
    document.title = "Supplier Sourcing - LaunchFast"
    
    // Check if this is the user's first time visiting the dashboard
    const hasBeenWelcomed = localStorage.getItem('launchfast_welcomed')
    if (!hasBeenWelcomed) {
      // Mark user as welcomed immediately to prevent showing again
      localStorage.setItem('launchfast_welcomed', 'true')
      
      // Small delay to let the dashboard load first
      setTimeout(() => {
        setShowWelcomeModal(true)
      }, 1000)
    }
  }, [])

  // Handle URL parameters for market data integration
  useEffect(() => {
    const search = searchParams.get('search')
    const marketId = searchParams.get('market_id')
    const autoSearch = searchParams.get('auto_search')
    const marketGrade = searchParams.get('market_grade')
    const marketProfit = searchParams.get('market_profit')

    if (search) {
      setInitialSearchTerm(search)
    }

    if (marketId && search) {
      // Create market context from URL parameters
      const context: MarketContext = {
        marketId,
        productName: search,
        estimatedProfit: parseFloat(marketProfit || '0'),
        marketGrade: marketGrade || 'N/A',
        competitionLevel: 'medium', // Default, could be enhanced later
        suggestedMOQ: 100 // Default, could be calculated from market data
      }
      setMarketContext(context)
      
      // Update search options based on market context
      if (context.estimatedProfit > 5000) {
        // High profit market - be more selective
        setSearchOptions(prev => ({
          ...prev,
          goldSupplierOnly: true,
          tradeAssuranceOnly: true,
          minYearsInBusiness: 3,
          maxMoq: context.suggestedMOQ
        }))
      }
    }

    if (autoSearch === 'true' && search) {
      // Auto-trigger search after component mounts
      setShouldAutoSearch(true)
    }
  }, [searchParams])

  // Auto-search effect
  useEffect(() => {
    if (shouldAutoSearch && initialSearchTerm && !isSearching) {
      startSupplierSearch(initialSearchTerm)
      setShouldAutoSearch(false)
    }
  }, [shouldAutoSearch, initialSearchTerm, isSearching])

  const startSupplierSearch = async (query: string) => {
    if (!query.trim()) return

    // TODO: Replace with user ID from auth
    const userId = '29a94bda-39e2-4b57-8cc0-cd289274da5a'

    try {
      setIsSearching(true)
      setError(null)
      setSupplierSearchData(null)
      setProgressInfo(null)

      // Use regular API (streaming is future enhancement)
      await tryRegularSupplierAPI(query, userId)
    } catch (error) {
      console.error('❌ Supplier search failed:', error)
      setError(error instanceof Error ? error.message : 'Failed to complete supplier search')
      setIsSearching(false)
      setProgressInfo(null)
    }
  }

  const tryStreamingSupplierAPI = async (query: string, userId: string) => {
    // Build query parameters
    const params = new URLSearchParams({
      userId,
      query,
      maxResults: searchOptions.maxResults.toString(),
      goldSupplierOnly: searchOptions.goldSupplierOnly.toString(),
      tradeAssuranceOnly: searchOptions.tradeAssuranceOnly.toString(),
      minYearsInBusiness: searchOptions.minYearsInBusiness.toString(),
      maxMoq: searchOptions.maxMoq.toString()
    })

    // Start streaming search
    const response = await fetch(`/api/suppliers/search/stream?${params}`)
    
    if (!response.ok) {
      throw new Error('Failed to start streaming supplier search')
    }

    if (!response.body) {
      throw new Error('No response body received')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const eventData = JSON.parse(line.slice(6))
            
            if (eventData.phase === 'complete' && eventData.data?.suppliers) {
              // Search completed successfully
              setSupplierSearchData({
                suppliers: eventData.data.suppliers,
                qualityAnalysis: eventData.data.qualityAnalysis,
                searchQuery: query,
                timestamp: new Date().toISOString()
              })
              setIsSearching(false)
              setProgressInfo(null)
              console.log('✅ Streaming supplier search completed, found:', eventData.data.suppliers?.length)
              return
            } else if (eventData.phase === 'error') {
              // Search failed
              throw new Error(eventData.message)
            } else {
              // Progress update
              setProgressInfo({
                phase: eventData.phase || 'processing',
                message: eventData.message || 'Processing...',
                progress: eventData.progress || 0,
                data: eventData.data
              })
            }
          } catch (parseError) {
            console.warn('Failed to parse SSE event:', line)
          }
        }
      }
    }
  }

  const tryRegularSupplierAPI = async (query: string, userId: string) => {
    setProgressInfo({
      phase: 'fallback',
      message: 'Using regular API as fallback...',
      progress: 10,
      data: null
    })

    const requestBody = {
      userId,
      searchQuery: query,
      options: searchOptions
    }

    const response = await fetch('/api/suppliers/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      throw new Error('Failed to complete supplier search')
    }

    const result = await response.json()

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Invalid response from server')
    }

    console.log('✅ Regular API supplier search completed:', result.data)
    console.log('📊 Suppliers received:', result.data.suppliers?.length || 0)
    console.log('🔍 Search query:', result.data.searchQuery)
    
    setSupplierSearchData(result.data)
    setIsSearching(false)
    setProgressInfo(null)
  }


  const handleRefresh = () => {
    setSupplierSearchData(null)
    setError(null)
  }

  // Add search input state
  const [searchInput, setSearchInput] = useState('')

  const handleStartSearch = () => {
    const query = searchInput.trim()
    if (!query) {
      setError('Please enter a product name or keyword to search for suppliers')
      return
    }
    if (query.length < 2) {
      setError('Search query must be at least 2 characters long')
      return
    }
    startSupplierSearch(query)
  }

  return (
    <SidebarProvider 
      defaultOpen={true} 
      className="bg-gray-50"
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
        {/* Trial Banner */}
        {trialInfo && trialInfo.isActive && (
          <TrialBanner 
            trialInfo={trialInfo} 
            onUpgradeClick={handleSubscribe}
          />
        )}
        <div className="flex flex-1 flex-col">
          <div className="flex-1 space-y-4">
            <div className="container max-w-7xl mx-auto px-4 lg:px-6 py-8">
              {/* Header Section */}
              <div className="mb-8">
                <h1 className="text-3xl font-semibold text-gray-900">Supplier Sourcing</h1>
                <p className="text-gray-500 mt-2">Find, manage, and track relationships with high-quality suppliers</p>
              </div>

              {/* Search Module */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-6">
                <div className="p-6">
                  <div className="space-y-4">
                    {/* Product Search Input */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Factory className="h-4 w-4 text-gray-400" />
                        <label className="text-sm font-medium text-gray-900">Product or Keyword</label>
                        <span className="text-xs text-gray-500">(e.g., "bluetooth speaker", "kitchen gadgets")</span>
                      </div>
                      <div className="flex gap-3">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="bluetooth speaker, kitchen gadgets, phone case..."
                            className="flex h-11 w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isSearching}
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="flex items-center gap-2">
                              {searchInput && !isSearching && (
                                <button
                                  onClick={() => setSearchInput('')}
                                  className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              )}
                              <Search className="h-4 w-4 text-gray-400" />
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={handleStartSearch}
                          disabled={isSearching || !searchInput.trim()}
                          className="bg-gray-900 text-white hover:bg-gray-800 h-11 px-6 inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                          {isSearching ? (
                            <>
                              <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Searching...
                            </>
                          ) : (
                            <>
                              <Sparkles className="mr-2 h-4 w-4" />
                              Find Suppliers
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500">
                        Search for suppliers by product name or category
                      </p>
                      {error && (
                        <p className="text-xs text-red-600 mt-1">
                          {error}
                        </p>
                      )}
                    </div>

                    {/* Progress Display */}
                    {progressInfo && (
                      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/50 rounded-lg">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                              <span className="text-sm font-medium text-gray-900">
                                {progressInfo.phase.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </span>
                            </div>
                            <span className="text-sm font-semibold text-gray-700">
                              {progressInfo.progress}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${progressInfo.progress}%` }}
                            ></div>
                          </div>
                          <p className="text-sm text-gray-600">
                            {progressInfo.message}
                          </p>
                          {progressInfo.data && progressInfo.data.currentAsin && (
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <ArrowRight className="h-3 w-3" />
                              Processing ASIN {progressInfo.data.currentAsin} of {progressInfo.data.totalAsins}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Active Filters Display */}
                    {(searchOptions.goldSupplierOnly || searchOptions.tradeAssuranceOnly) && (
                      <div className="flex items-center gap-2 text-xs text-gray-500 pt-2 border-t border-gray-100">
                        <span>Active filters:</span>
                        <div className="flex gap-1">
                          {searchOptions.goldSupplierOnly && (
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full font-medium">
                              Gold Suppliers
                            </span>
                          )}
                          {searchOptions.tradeAssuranceOnly && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                              Trade Assurance
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>


              </div>

              {/* Supplier Sourcing Results - Multi-tab interface */}
                <SupplierSourcingResultsTable
                  data={supplierSearchData}
                  loading={isSearching}
                  error={error}
                  onRefresh={handleRefresh}
                  marketContext={marketContext}
                  initialSearchTerm={initialSearchTerm}
                />
            </div>
          </div>
        </div>
      </SidebarInset>
      <WelcomeModal
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
      />
    </SidebarProvider>
  )
}