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
  Sliders, 
  ChevronDown 
} from "lucide-react"

export default function Page() {
  const [keywordResearchData, setKeywordResearchData] = useState<KeywordResearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
  const [isResearching, setIsResearching] = useState(false)
  
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

    try {
      setIsResearching(true)
      setError(null)
      setKeywordResearchData(null)

      // TODO: Replace with user ID from auth
      const userId = '29a94bda-39e2-4b57-8cc0-cd289274da5a'
      
      // Build query parameters
      const params = new URLSearchParams({
        asins: asins.join(','),
        userId,
        maxKeywordsPerAsin: researchOptions.maxKeywordsPerAsin.toString(),
        minSearchVolume: researchOptions.minSearchVolume.toString(),
        includeOpportunities: researchOptions.includeOpportunities.toString(),
        includeGapAnalysis: researchOptions.includeGapAnalysis.toString()
      })

      // Start streaming research
      const response = await fetch(`/api/keywords/research/stream?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to start keyword research')
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
              
              if (eventData.phase === 'complete' && eventData.data) {
                // Research completed successfully
                setKeywordResearchData(eventData.data)
                setIsResearching(false)
                console.log('✅ Keyword research completed:', eventData.data.overview)
              } else if (eventData.phase === 'error') {
                // Research failed
                setError(eventData.message)
                setIsResearching(false)
              }
              // TODO: Add progress tracking UI for other phases
            } catch (parseError) {
              console.warn('Failed to parse SSE event:', line)
            }
          }
        }
      }
    } catch (err) {
      console.error('❌ Keyword research error:', err)
      setError(err instanceof Error ? err.message : 'Failed to complete keyword research')
      setIsResearching(false)
    }
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
              {/* Page Header */}
              <div className="px-4 lg:px-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">Keyword Research</h1>
                    <p className="text-muted-foreground">
                      Analyze competitor keywords, find opportunities, and discover market gaps
                    </p>
                  </div>
                </div>
              </div>

              {/* Research Input */}
              <div className="px-4 lg:px-6">
                <div className="bg-card text-card-foreground border rounded-lg p-4">
                  <div className="space-y-4">
                    {/* Input with Button */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Product ASINs</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={asinInput}
                            onChange={(e) => setAsinInput(e.target.value)}
                            placeholder="B0XXXXXXXX, B0YYYYYYYY, B0ZZZZZZZZ"
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            disabled={isResearching}
                          />
                          <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                          </div>
                        </div>
                        <button 
                          onClick={handleStartResearch}
                          disabled={isResearching || !asinInput.trim()}
                          className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
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
                              <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                              Start Research
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Enter 1-10 Amazon ASINs separated by commas
                      </p>
                      {error && (
                        <p className="text-xs text-destructive">
                          {error}
                        </p>
                      )}
                    </div>

                    {/* Research Options Toggle */}
                    <div className="relative">
                      <button 
                        onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center space-x-2 group"
                      >
                        <Sliders className="h-4 w-4" />
                        <span>Research Options</span>
                        <ChevronDown 
                          className={`h-3 w-3 transition-transform duration-200 ${showAdvancedOptions ? 'rotate-180' : ''}`} 
                        />
                        {(researchOptions.includeOpportunities || researchOptions.includeGapAnalysis) && (
                          <div className="flex space-x-1">
                            {researchOptions.includeOpportunities && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                            {researchOptions.includeGapAnalysis && (
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            )}
                          </div>
                        )}
                      </button>

                      {/* Floating Options Panel */}
                      {showAdvancedOptions && (
                        <>
                          {/* Backdrop */}
                          <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setShowAdvancedOptions(false)}
                          />
                          
                          {/* Options Panel */}
                          <div className="absolute top-full left-0 mt-2 w-[420px] bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-6">
                            <div className="grid grid-cols-2 gap-8">
                              {/* Left Column */}
                              <div className="space-y-3">
                                {/* Analysis Types */}
                                <div className="space-y-3">
                                  <div className="flex items-center space-x-2 text-sm font-semibold text-gray-900">
                                    <Target className="h-4 w-4 text-blue-600" />
                                    <span>Analysis Types</span>
                                  </div>
                                  <div className="space-y-3">
                                    <label className="flex items-center space-x-3 cursor-pointer group">
                                      <input 
                                        type="checkbox" 
                                        checked={researchOptions.includeOpportunities}
                                        onChange={(e) => setResearchOptions(prev => ({
                                          ...prev, 
                                          includeOpportunities: e.target.checked
                                        }))}
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                                      />
                                      <div className="flex flex-col">
                                        <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600">Opportunity Mining</span>
                                        <span className="text-xs text-gray-500">Low-competition keywords</span>
                                      </div>
                                    </label>
                                    <label className="flex items-center space-x-3 cursor-pointer group">
                                      <input 
                                        type="checkbox" 
                                        checked={researchOptions.includeGapAnalysis}
                                        onChange={(e) => setResearchOptions(prev => ({
                                          ...prev, 
                                          includeGapAnalysis: e.target.checked
                                        }))}
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                                      />
                                      <div className="flex flex-col">
                                        <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600">Gap Analysis</span>
                                        <span className="text-xs text-gray-500">Competitor blind spots</span>
                                      </div>
                                    </label>
                                  </div>
                                </div>
                              </div>

                              {/* Right Column */}
                              <div className="space-y-3">
                                {/* Data Settings */}
                                <div className="space-y-3">
                                  <div className="flex items-center space-x-2 text-sm font-semibold text-gray-900">
                                    <Zap className="h-4 w-4 text-orange-500" />
                                    <span>Data Settings</span>
                                  </div>
                                  <div className="space-y-3">
                                    <div className="space-y-1">
                                      <label className="text-xs font-medium text-gray-700">Keywords per product</label>
                                      <input
                                        type="number"
                                        min="10"
                                        max="100"
                                        value={researchOptions.maxKeywordsPerAsin}
                                        onChange={(e) => setResearchOptions(prev => ({
                                          ...prev,
                                          maxKeywordsPerAsin: parseInt(e.target.value) || 50
                                        }))}
                                        className="w-full h-9 px-3 text-sm rounded-lg border border-gray-300 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        placeholder="50"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-xs font-medium text-gray-700">Minimum search volume</label>
                                      <input
                                        type="number"
                                        value={researchOptions.minSearchVolume}
                                        onChange={(e) => setResearchOptions(prev => ({
                                          ...prev,
                                          minSearchVolume: parseInt(e.target.value) || 0
                                        }))}
                                        className="w-full h-9 px-3 text-sm rounded-lg border border-gray-300 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        placeholder="100"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Keyword Research Results */}
              <div className="px-4 lg:px-6">
                <KeywordResearchResultsTable
                  data={keywordResearchData}
                  loading={isResearching}
                  error={error}
                  onRefresh={handleRefresh}
                />
              </div>
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