'use client'

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { WelcomeModal } from "@/components/ui/welcome-modal"
import { KeywordResearchResultsTable } from "@/components/keyword-research/KeywordResearchResultsTable"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { useEffect, useState } from "react"
import type { KeywordResearchResult } from "@/lib/keyword-research"
import { 
  Target, 
  Search, 
  BarChart3, 
  Zap, 
  X,
  Package,
  ArrowRight,
  Sparkles
} from "lucide-react"

export default function Page() {
  const [keywordResearchData, setKeywordResearchData] = useState<KeywordResearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)
  const [isResearching, setIsResearching] = useState(false)
  const [progressInfo, setProgressInfo] = useState<{
    phase: string
    message: string
    progress: number
    data?: any
  } | null>(null)
  
  // Research options state
  const [researchOptions, setResearchOptions] = useState({
    includeOpportunities: true,
    includeGapAnalysis: true,
    maxKeywordsPerAsin: 50,
    minSearchVolume: 100,
    opportunityFilters: {
      minSearchVolume: 500,
      maxCompetitorsInTop15: 2,
      maxCompetitorStrength: 5
    },
    gapAnalysisOptions: {
      minGapVolume: 1000,
      focusVolumeThreshold: 5000
    }
  })

  useEffect(() => {
    // Update document title
    document.title = "Keyword Research - LaunchFast"
    
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

  const startKeywordResearch = async (asins: string[]) => {
    if (!asins.length) return

    // TODO: Replace with user ID from auth
    const userId = '29a94bda-39e2-4b57-8cc0-cd289274da5a'
    const sessionName = `Research Session ${new Date().toLocaleDateString()}`

    try {
      setIsResearching(true)
      setError(null)
      setKeywordResearchData(null)
      setProgressInfo(null)

      // Try streaming API first
      await tryStreamingAPI(asins, userId, sessionName)
    } catch (streamError) {
      console.warn('⚠️ Streaming API failed, falling back to regular API:', streamError)
      
      try {
        // Fallback to regular API
        await tryRegularAPI(asins, userId, sessionName)
      } catch (regularError) {
        console.error('❌ Both APIs failed:', regularError)
        setError(regularError instanceof Error ? regularError.message : 'Failed to complete keyword research')
        setIsResearching(false)
        setProgressInfo(null)
      }
    }
  }

  const tryStreamingAPI = async (asins: string[], userId: string, sessionName: string) => {
    // Build query parameters
    const params = new URLSearchParams({
      userId,
      asins: asins.join(','),
      sessionName,
      maxKeywordsPerAsin: researchOptions.maxKeywordsPerAsin.toString(),
      minSearchVolume: researchOptions.minSearchVolume.toString(),
      includeOpportunities: researchOptions.includeOpportunities.toString(),
      includeGapAnalysis: researchOptions.includeGapAnalysis.toString()
    })

    // Start streaming research
    const response = await fetch(`/api/keywords/research/stream?${params}`)
    
    if (!response.ok) {
      throw new Error('Failed to start streaming keyword research')
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
            
            if (eventData.phase === 'complete' && eventData.data?.sessionId) {
              // Research completed successfully - fetch data from database
              await fetchSessionResults(eventData.data.sessionId)
              setIsResearching(false)
              setProgressInfo(null)
              console.log('✅ Streaming keyword research completed, session:', eventData.data.sessionId)
              return
            } else if (eventData.phase === 'error') {
              // Research failed
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

  const fetchSessionResults = async (sessionId: string) => {
    try {
      // TODO: Replace with user ID from auth
      const userId = '29a94bda-39e2-4b57-8cc0-cd289274da5a'
      const response = await fetch(`/api/keywords/sessions/${sessionId}?userId=${userId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch session results')
      }
      
      const sessionData = await response.json()
      
      if (sessionData.success && sessionData.data && sessionData.data.results) {
        setKeywordResearchData(sessionData.data.results)
        console.log('✅ Session data loaded:', sessionData.data.results.overview)
      } else {
        throw new Error(sessionData.error || 'Invalid session data')
      }
    } catch (error) {
      console.error('❌ Failed to fetch session results:', error)
      setError(error instanceof Error ? error.message : 'Failed to load results')
    }
  }

  const tryRegularAPI = async (asins: string[], userId: string, sessionName: string) => {
    setProgressInfo({
      phase: 'fallback',
      message: 'Using regular API as fallback...',
      progress: 10,
      data: null
    })

    const requestBody = {
      userId,
      asins,
      sessionName,
      options: {
        maxKeywordsPerAsin: researchOptions.maxKeywordsPerAsin,
        minSearchVolume: researchOptions.minSearchVolume,
        includeOpportunities: researchOptions.includeOpportunities,
        includeGapAnalysis: researchOptions.includeGapAnalysis,
        opportunityFilters: researchOptions.opportunityFilters,
        gapAnalysisOptions: researchOptions.gapAnalysisOptions
      }
    }

    const response = await fetch('/api/keywords/research', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      throw new Error('Failed to complete keyword research')
    }

    const result = await response.json()

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Invalid response from server')
    }

    setKeywordResearchData(result.data)
    setIsResearching(false)
    setProgressInfo(null)
    console.log('✅ Regular API keyword research completed:', result.data.overview)
  }

  const handleRefresh = () => {
    setKeywordResearchData(null)
    setError(null)
  }

  // Add ASIN input state
  const [asinInput, setAsinInput] = useState('')

  // Parse and validate ASINs from input
  const parseAsins = (input: string): string[] => {
    return input
      .split(',')
      .map(asin => asin.trim().toUpperCase())
      .filter(asin => /^[A-Z0-9]{10}$/.test(asin))
  }

  const handleStartResearch = () => {
    const asins = parseAsins(asinInput)
    if (asins.length === 0) {
      setError('Please enter valid Amazon ASINs (10 characters, alphanumeric)')
      return
    }
    if (asins.length > 10) {
      setError('Maximum 10 ASINs allowed per research session')
      return
    }
    startKeywordResearch(asins)
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
        <div className="flex flex-1 flex-col">
          <div className="flex-1 space-y-4">
            <div className="container max-w-7xl mx-auto px-4 lg:px-6 py-8">
              {/* Header Section */}
              <div className="mb-8">
                <h1 className="text-3xl font-semibold text-gray-900">Keyword Research</h1>
                <p className="text-gray-500 mt-2">Analyze competitor keywords, find opportunities, and discover market gaps</p>
              </div>

              {/* Search Module */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-6">
                <div className="p-6">
                  <div className="space-y-4">
                    {/* Product ASINs Input */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-gray-400" />
                        <label className="text-sm font-medium text-gray-900">Product ASINs</label>
                        <span className="text-xs text-gray-500">(1-10 ASINs)</span>
                      </div>
                      <div className="flex gap-3">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={asinInput}
                            onChange={(e) => setAsinInput(e.target.value)}
                            placeholder="B0XXXXXXXX, B0YYYYYYYY, B0ZZZZZZZZ"
                            className="flex h-11 w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isResearching}
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="flex items-center gap-2">
                              {asinInput && !isResearching && (
                                <button
                                  onClick={() => setAsinInput('')}
                                  className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              )}
                              <Package className="h-4 w-4 text-gray-400" />
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={handleStartResearch}
                          disabled={isResearching || !asinInput.trim()}
                          className="bg-gray-900 text-white hover:bg-gray-800 h-11 px-6 inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                          {isResearching ? (
                            <>
                              <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Researching...
                            </>
                          ) : (
                            <>
                              <Sparkles className="mr-2 h-4 w-4" />
                              Start Research
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500">
                        Enter 1-10 Amazon ASINs separated by commas
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

                    {/* Active Options Display */}
                        {(researchOptions.includeOpportunities || researchOptions.includeGapAnalysis) && (
                      <div className="flex items-center gap-2 text-xs text-gray-500 pt-2 border-t border-gray-100">
                        <span>Active:</span>
                        <div className="flex gap-1">
                            {researchOptions.includeOpportunities && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                              Opportunities
                            </span>
                            )}
                            {researchOptions.includeGapAnalysis && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">
                              Gap Analysis
                            </span>
                          )}
                            </div>
                          </div>
                      )}
                  </div>
                </div>


              </div>

              {/* Keyword Research Results - Now without the Card wrapper */}
                <KeywordResearchResultsTable
                  data={keywordResearchData}
                  loading={isResearching}
                  error={error}
                  onRefresh={handleRefresh}
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