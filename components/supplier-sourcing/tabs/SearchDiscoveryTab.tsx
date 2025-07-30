'use client'

import React, { useState } from 'react'
import { Search, Filter, Bookmark, Eye, Star, ChevronDown, ChevronUp, MapPin, Calendar, Award, Shield, X, Plus, Tag, Heart, BookmarkCheck, BarChart3, Package } from 'lucide-react'
import type { SupplierSearchResult } from '@/types/supplier'

interface MarketContext {
  marketId: string
  productName: string
  estimatedProfit: number
  marketGrade: string
  competitionLevel: 'low' | 'medium' | 'high'
  suggestedMOQ: number
}

interface SearchDiscoveryTabProps {
  data: SupplierSearchResult | null
  marketContext?: MarketContext | null
  initialSearchTerm?: string
}

interface SavedSupplier {
  id: string
  supplier: any
  tags: string[]
  notes: string
  category: string
  priority: 'high' | 'medium' | 'low'
  savedAt: string
  isFavorite: boolean
}

interface SaveSupplierModalProps {
  supplier: any
  isOpen: boolean
  onClose: () => void
  onSave: (savedSupplier: SavedSupplier) => void
}


function SaveSupplierModal({ supplier, isOpen, onClose, onSave }: SaveSupplierModalProps) {
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [notes, setNotes] = useState('')
  const [category, setCategory] = useState('prospects')
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium')
  const [isFavorite, setIsFavorite] = useState(false)

  const categories = [
    { id: 'prospects', name: 'Prospects', color: 'bg-blue-100 text-blue-700' },
    { id: 'contacted', name: 'Contacted', color: 'bg-yellow-100 text-yellow-700' },
    { id: 'sampling', name: 'Sampling', color: 'bg-purple-100 text-purple-700' },
    { id: 'negotiating', name: 'Negotiating', color: 'bg-orange-100 text-orange-700' },
    { id: 'partners', name: 'Partners', color: 'bg-green-100 text-green-700' },
    { id: 'watchlist', name: 'Watch List', color: 'bg-gray-100 text-gray-700' }
  ]

  const commonTags = [
    'high-quality', 'competitive-pricing', 'fast-response', 'low-moq',
    'experienced', 'innovative', 'reliable', 'certified', 'premium',
    'bulk-orders', 'custom-products', 'oem-odm'
  ]

  const addTag = (tag: string) => {
    if (tag && !tags.includes(tag)) {
      setTags(prev => [...prev, tag])
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove))
  }

  const handleSave = () => {
    const savedSupplier: SavedSupplier = {
      id: `saved_${supplier.id}_${Date.now()}`,
      supplier,
      tags,
      notes,
      category,
      priority,
      savedAt: new Date().toISOString(),
      isFavorite
    }
    onSave(savedSupplier)
    onClose()
    // Reset form
    setTags([])
    setNotes('')
    setCategory('prospects')
    setPriority('medium')
    setIsFavorite(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-white bg-opacity-30 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Save Supplier</h3>
              <p className="text-sm text-gray-500">{supplier?.companyName}</p>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Category Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Category</label>
              <div className="grid grid-cols-2 gap-2">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`p-3 text-sm font-medium rounded-lg border-2 transition-colors ${
                      category === cat.id 
                        ? `${cat.color} border-current` 
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority & Favorite */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Priority</label>
                <select 
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as 'high' | 'medium' | 'low')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Favorite</label>
                <button
                  type="button"
                  onClick={() => setIsFavorite(!isFavorite)}
                  className={`w-full p-2 rounded-lg border-2 transition-colors ${
                    isFavorite 
                      ? 'bg-red-50 text-red-700 border-red-200' 
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <Heart className={`h-5 w-5 mx-auto ${isFavorite ? 'fill-current' : ''}`} />
                </button>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Tags</label>
              <div className="space-y-3">
                {/* Current Tags */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map(tag => (
                      <span key={tag} className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                        {tag}
                        <button 
                          onClick={() => removeTag(tag)}
                          className="ml-1 text-blue-500 hover:text-blue-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                
                {/* Add New Tag */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add custom tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTag(newTag)}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                  <button 
                    onClick={() => addTag(newTag)}
                    className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Add
                  </button>
                </div>
                
                {/* Common Tags */}
                <div>
                  <p className="text-xs text-gray-500 mb-2">Quick tags:</p>
                  <div className="flex flex-wrap gap-1">
                    {commonTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => addTag(tag)}
                        disabled={tags.includes(tag)}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          tags.includes(tag)
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this supplier, communication history, or important details..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-8">
            <button 
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Save Supplier
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function SearchDiscoveryTab({ data, marketContext, initialSearchTerm }: SearchDiscoveryTabProps) {
  const [savedSuppliers, setSavedSuppliers] = useState<SavedSupplier[]>([])
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [supplierToSave, setSupplierToSave] = useState<any>(null)
  const [selectedSuppliers, setSelectedSuppliers] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<'quality' | 'years' | 'moq' | 'reviews'>('quality')

  // Helper function to clean HTML tags from text
  const cleanText = (text: string) => {
    if (!text) return ''
    return text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim()
  }

  // Frontend sorting - sort the already-returned suppliers for display
  const sortedSuppliers = React.useMemo(() => {
    if (!data?.suppliers) return []
    
    // Sort the suppliers
    return [...data.suppliers].sort((a, b) => {
      switch (sortBy) {
        case 'quality':
          const aQuality = a.qualityScore?.overall || a.qualityScore || 0
          const bQuality = b.qualityScore?.overall || b.qualityScore || 0
          return bQuality - aQuality // Highest first
        case 'years':
          const aYears = a.yearsInBusiness || 0
          const bYears = b.yearsInBusiness || 0
          return bYears - aYears // Most experience first
        case 'moq':
          const aMOQ = a.moq || a.minOrderQuantity || 9999
          const bMOQ = b.moq || b.minOrderQuantity || 9999
          return aMOQ - bMOQ // Lowest MOQ first
        case 'reviews':
          const aReviews = a.reviewCount || 0
          const bReviews = b.reviewCount || 0
          return bReviews - aReviews // Most reviews first
        default:
          return 0
      }
    })
  }, [data?.suppliers, sortBy])

  const handleSaveSupplier = (supplier: any) => {
    setSupplierToSave(supplier)
    setShowSaveModal(true)
  }

  const handleSaveComplete = async (savedSupplier: SavedSupplier) => {
    try {
      // TODO: Get actual user ID from auth
      const userId = '29a94bda-39e2-4b57-8cc0-cd289274da5a'
      
      // Use the same context system for individual saves
      const searchContext = {
        searchQuery: data?.searchQuery || 'Unknown Search',
        searchSource: marketContext ? 'market_research' as const : 'direct_search' as const,
        marketId: marketContext?.marketId,
        keyword: initialSearchTerm,
        marketContext: marketContext ? {
          marketGrade: marketContext.marketGrade,
          estimatedProfit: marketContext.estimatedProfit,
          competitionLevel: marketContext.competitionLevel
        } : undefined
      }

      // Save single supplier using batch API (with 1 supplier)
      const response = await fetch('/api/supplier-relationships/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          suppliers: [savedSupplier.supplier],
          searchContext,
          batchName: `Individual Save - ${savedSupplier.supplier.companyName}`
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save supplier')
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to save supplier')
      }

      console.log('✅ Individual save successful:', result.data)

      // Update local state
      setSavedSuppliers(prev => [...prev, {
        ...savedSupplier,
        batchId: result.data.batchId,
        batchName: result.data.batchName
      }])

      // Show success feedback
      const successMessage = searchContext.searchSource === 'market_research' 
        ? `Saved ${savedSupplier.supplier.companyName} from ${marketContext?.marketGrade} market research!`
        : `Saved ${savedSupplier.supplier.companyName} from your search!`
      
      alert(successMessage)

    } catch (error) {
      console.error('❌ Individual save failed:', error)
      alert(`Failed to save supplier: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const isSupplierSaved = (supplierId: string) => {
    return savedSuppliers.some(saved => saved.supplier.id === supplierId)
  }

  // Selection handling
  const toggleSupplierSelection = (supplierId: string) => {
    setSelectedSuppliers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(supplierId)) {
        newSet.delete(supplierId)
      } else {
        newSet.add(supplierId)
      }
      return newSet
    })
  }

  const selectAllSuppliers = () => {
    setSelectedSuppliers(new Set(sortedSuppliers.map(s => s.id)))
  }

  const clearSelection = () => {
    setSelectedSuppliers(new Set())
  }

  // Context-aware save functionality
  const handleContextAwareSave = () => {
    if (selectedSuppliers.size === 0) {
      // Save all sorted suppliers
      const suppliersToSave = sortedSuppliers
      handleBatchSave(suppliersToSave)
    } else {
      // Save selected suppliers
      const suppliersToSave = sortedSuppliers.filter(s => selectedSuppliers.has(s.id))
      handleBatchSave(suppliersToSave)
    }
  }

  const handleBatchSave = async (suppliers: any[]) => {
    try {
      // TODO: Get actual user ID from auth
      const userId = '29a94bda-39e2-4b57-8cc0-cd289274da5a'
      
      // Determine search context based on how user arrived at this page
      const searchContext = {
        searchQuery: data?.searchQuery || 'Unknown Search',
        searchSource: marketContext ? 'market_research' as const : 'direct_search' as const,
        marketId: marketContext?.marketId,
        keyword: initialSearchTerm,
        marketContext: marketContext ? {
          marketGrade: marketContext.marketGrade,
          estimatedProfit: marketContext.estimatedProfit,
          competitionLevel: marketContext.competitionLevel
        } : undefined
      }

      console.log('🔄 Starting batch save:', {
        supplierCount: suppliers.length,
        searchContext,
        marketContext
      })

      // Call batch save API
      const response = await fetch('/api/supplier-relationships/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          suppliers,
          searchContext
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save suppliers')
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to save suppliers')
      }

      console.log('✅ Batch save successful:', result.data)

      // Update local state for UI feedback
      const newSavedSuppliers = suppliers.map((supplier, index) => ({
        id: `saved_${supplier.id}_${Date.now()}_${index}`,
        supplier,
        tags: [],
        notes: '',
        category: 'prospects',
        priority: 'medium' as const,
        savedAt: new Date().toISOString(),
        isFavorite: false,
        batchId: result.data.batchId,
        batchName: result.data.batchName
      }))
      
      setSavedSuppliers(prev => [...prev, ...newSavedSuppliers])
      clearSelection()
      
      // Show success feedback with context
      const successMessage = searchContext.searchSource === 'market_research' 
        ? `Successfully saved ${result.data.savedCount} suppliers from ${marketContext?.marketGrade} market research!`
        : `Successfully saved ${result.data.savedCount} suppliers from your search!`
      
      if (result.data.skippedCount > 0) {
        alert(`${successMessage}\n\n${result.data.skippedCount} suppliers were skipped (already saved).`)
      } else {
        alert(successMessage)
      }

    } catch (error) {
      console.error('❌ Batch save failed:', error)
      alert(`Failed to save suppliers: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  if (!data || !data.suppliers?.length) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center space-y-4 max-w-sm">
          <div className="flex justify-center">
            <Search className="h-16 w-16 text-gray-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900">No Suppliers Found</h3>
            <p className="text-sm text-gray-500">
              Search for products above to discover suppliers with quality scoring and advanced filtering
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search Results Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-gray-900">
            Found {sortedSuppliers.length} Suppliers
          </h3>
          <p className="text-sm text-gray-500">
            {data.qualityAnalysis?.goldSuppliers || 0} Gold Suppliers • {data.qualityAnalysis?.tradeAssurance || 0} with Trade Assurance
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'quality' | 'years' | 'moq' | 'reviews')}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors"
          >
            <option value="quality">Sort by Quality Score</option>
            <option value="years">Sort by Experience</option>
            <option value="moq">Sort by MOQ (Low to High)</option>
            <option value="reviews">Sort by Reviews</option>
          </select>
          
          <div className="flex items-center gap-2">
            {/* Selection Controls */}
            {selectedSuppliers.size > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <span className="text-sm text-blue-700">{selectedSuppliers.size} selected</span>
                  <button 
                    onClick={clearSelection}
                    className="text-blue-500 hover:text-blue-700 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                {selectedSuppliers.size < sortedSuppliers.length && (
                  <button 
                    onClick={selectAllSuppliers}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Select All
                  </button>
                )}
              </div>
            )}
            
            {/* Saved Suppliers Feedback */}
            {savedSuppliers.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                <BookmarkCheck className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700">{savedSuppliers.length} saved</span>
              </div>
            )}
            
            {/* Context-Aware Save Button */}
            <button 
              onClick={handleContextAwareSave}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Bookmark className="h-4 w-4 mr-2" />
              {selectedSuppliers.size === 0 && `Save All (${sortedSuppliers.length})`}
              {selectedSuppliers.size > 0 && selectedSuppliers.size < sortedSuppliers.length && `Save Selected (${selectedSuppliers.size})`}
              {selectedSuppliers.size === sortedSuppliers.length && selectedSuppliers.size > 0 && `Save All (${selectedSuppliers.size})`}
            </button>
          </div>
        </div>
      </div>

      {/* Market Context Banner */}
      {marketContext && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <h4 className="font-semibold text-gray-900">Market Intelligence Active</h4>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  marketContext.marketGrade.startsWith('A') ? 'bg-green-100 text-green-700' :
                  marketContext.marketGrade.startsWith('B') ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  Grade {marketContext.marketGrade}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">Product</div>
                  <div className="font-semibold text-gray-900">{marketContext.productName}</div>
                </div>
                <div>
                  <div className="text-gray-600">Profit Potential</div>
                  <div className="font-semibold text-green-600">${marketContext.estimatedProfit.toLocaleString()}/mo</div>
                </div>
                <div>
                  <div className="text-gray-600">Competition</div>
                  <div className={`font-semibold ${
                    marketContext.competitionLevel === 'low' ? 'text-green-600' :
                    marketContext.competitionLevel === 'high' ? 'text-red-600' :
                    'text-yellow-600'
                  }`}>
                    {marketContext.competitionLevel.charAt(0).toUpperCase() + marketContext.competitionLevel.slice(1)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Suggested MOQ</div>
                  <div className="font-semibold text-gray-900">{marketContext.suggestedMOQ} units</div>
                </div>
              </div>
              <div className="mt-3 p-3 bg-blue-100 rounded-lg">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">Smart Recommendations:</span> Suppliers are scored with market opportunity analysis. 
                  Look for suppliers with high opportunity scores that match your market grade of {marketContext.marketGrade}.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Supplier Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sortedSuppliers.map((supplier, index) => {
          
          return (
            <div key={supplier.id || index} className={`bg-white border rounded-xl shadow-sm hover:shadow-md transition-all duration-200 group relative ${
              selectedSuppliers.has(supplier.id) 
                ? 'border-blue-300 ring-2 ring-blue-100' 
                : 'border-gray-200'
            }`}>
              {/* Selection Checkbox - top right corner with professional styling */}
              <div className={`absolute top-4 right-4 z-10 transition-all duration-200 ${
                selectedSuppliers.has(supplier.id) 
                  ? 'opacity-100 scale-100' 
                  : 'opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100'
              }`}>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={selectedSuppliers.has(supplier.id)}
                    onChange={() => toggleSupplierSelection(supplier.id)}
                    className="sr-only"
                  />
                  <div 
                    onClick={() => toggleSupplierSelection(supplier.id)}
                    className={`w-6 h-6 rounded-md border-2 cursor-pointer transition-all duration-200 flex items-center justify-center ${
                      selectedSuppliers.has(supplier.id)
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                        : 'bg-white border-gray-300 hover:border-blue-400 hover:bg-blue-50 shadow-sm'
                    }`}
                  >
                    {selectedSuppliers.has(supplier.id) && (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                {/* Product Image & Supplier Header */}
                <div className="flex items-start gap-4 mb-4">
                  {supplier.mainImage && (
                    <div className="flex-shrink-0">
                      <img 
                        src={supplier.mainImage} 
                        alt={cleanText(supplier.title || supplier.companyName)}
                        className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                        onError={(e) => {
                          // Hide image if it fails to load
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-semibold text-gray-900 mb-2 leading-tight">
                      {supplier.companyName}
                    </h4>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                      <MapPin className="h-4 w-4" />
                      <span>
                        {supplier.location?.city && supplier.location?.country 
                          ? `${supplier.location.city}, ${supplier.location.country}`
                          : supplier.location?.country || 'Location not specified'
                        }
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="h-4 w-4" />
                      <span>{supplier.yearsInBusiness || 0} years in business</span>
                    </div>
                  </div>
                </div>

                {/* Key Product Metrics Row */}
                <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-sm font-semibold text-gray-900">{supplier.price || 'Contact'}</div>
                    <div className="text-xs text-gray-500">Price</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-semibold text-gray-900">
                      {supplier.reviewScore ? `${supplier.reviewScore}/5` : 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500">Review Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-semibold text-gray-900">{supplier.reviewCount || 0}</div>
                    <div className="text-xs text-gray-500">Reviews</div>
                  </div>
                </div>

                {/* Trust Badges */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {supplier.trust?.goldSupplier && (
                    <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                      <Award className="h-3 w-3 mr-1" />
                      Gold Supplier
                    </span>
                  )}
                  {supplier.trust?.tradeAssurance && (
                    <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      <Shield className="h-3 w-3 mr-1" />
                      Trade Assurance
                    </span>
                  )}
                  {supplier.trust?.verified && (
                    <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      Verified
                    </span>
                  )}
                </div>

                {/* Product Title */}
                {supplier.title && (
                  <div className="mb-4">
                    <div className="text-xs text-gray-500 mb-1">Product:</div>
                    <div className="text-sm font-semibold text-gray-900 line-clamp-2">{cleanText(supplier.title)}</div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {supplier.productUrl ? (
                    <a 
                      href={supplier.productUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View on Alibaba
                    </a>
                  ) : (
                    <button 
                      disabled
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-400 bg-gray-100 border border-gray-200 rounded-lg cursor-not-allowed"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      No Link Available
                    </button>
                  )}
                  <button 
                    onClick={() => handleSaveSupplier(supplier)}
                    disabled={isSupplierSaved(supplier.id)}
                    className={`flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isSupplierSaved(supplier.id)
                        ? 'text-green-700 bg-green-100 border border-green-200 cursor-not-allowed'
                        : 'text-white bg-gray-900 hover:bg-gray-800'
                    }`}
                  >
                    {isSupplierSaved(supplier.id) ? (
                      <>
                        <BookmarkCheck className="h-4 w-4 mr-2" />
                        Saved
                      </>
                    ) : (
                      <>
                        <Bookmark className="h-4 w-4 mr-2" />
                        Save Supplier
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      
      {/* Save Supplier Modal */}
      <SaveSupplierModal 
        supplier={supplierToSave}
        isOpen={showSaveModal}
        onClose={() => {
          setShowSaveModal(false)
          setSupplierToSave(null)
        }}
        onSave={handleSaveComplete}
      />
    </div>
  )
}