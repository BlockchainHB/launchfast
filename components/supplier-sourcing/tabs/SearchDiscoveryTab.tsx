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

interface FilterState {
  goldSupplier: boolean
  tradeAssurance: boolean
  moqRange: [number, number]
  yearsRange: [number, number]
  locations: string[]
  minQualityScore: number
  certifications: string[]
}

const defaultFilters: FilterState = {
  goldSupplier: false, // Don't filter by default - let users see all suppliers
  tradeAssurance: false, // Don't filter by default - let users see all suppliers
  moqRange: [1, 500],
  yearsRange: [0, 20],
  locations: [],
  minQualityScore: 0, // Don't filter by quality by default
  certifications: []
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
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<FilterState>(defaultFilters)
  const [appliedFiltersCount, setAppliedFiltersCount] = useState(0)
  const [savedSuppliers, setSavedSuppliers] = useState<SavedSupplier[]>([])
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [supplierToSave, setSupplierToSave] = useState<any>(null)

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

  // Calculate applied filters count
  React.useEffect(() => {
    let count = 0
    if (!filters.goldSupplier) count++
    if (!filters.tradeAssurance) count++
    if (filters.moqRange[0] !== 1 || filters.moqRange[1] !== 500) count++
    if (filters.yearsRange[0] !== 0 || filters.yearsRange[1] !== 20) count++
    if (filters.locations.length > 0) count++
    if (filters.minQualityScore !== 70) count++
    if (filters.certifications.length > 0) count++
    setAppliedFiltersCount(count)
  }, [filters])

  // No frontend filtering - API already filtered and scored the suppliers
  const filteredSuppliers = React.useMemo(() => {
    if (!data?.suppliers) return []
    
    // Debug: Log first supplier structure
    if (data.suppliers.length > 0) {
      console.log('🔍 Displaying API-filtered suppliers:', data.suppliers.length)
      console.log('🔍 First supplier structure:', {
        trust: data.suppliers[0].trust,
        goldSupplier: data.suppliers[0].trust?.goldSupplier,
        tradeAssurance: data.suppliers[0].trust?.tradeAssurance || data.suppliers[0].metrics?.tradeAssurance
      })
    }
    
    // Return all suppliers - they're already filtered and scored by the API
    return data.suppliers
  }, [data?.suppliers])

  const clearAllFilters = () => {
    setFilters(defaultFilters)
  }

  const handleSaveSupplier = (supplier: any) => {
    setSupplierToSave(supplier)
    setShowSaveModal(true)
  }

  const handleSaveComplete = (savedSupplier: SavedSupplier) => {
    setSavedSuppliers(prev => [...prev, savedSupplier])
    // Here you would typically save to backend
    console.log('Saved supplier:', savedSupplier)
  }

  const isSupplierSaved = (supplierId: string) => {
    return savedSuppliers.some(saved => saved.supplier.id === supplierId)
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
            Found {filteredSuppliers.length} Suppliers
            {filteredSuppliers.length !== data.suppliers.length && (
              <span className="text-sm text-gray-500 font-normal ml-2">
                (filtered from {data.suppliers.length})
              </span>
            )}
          </h3>
          <p className="text-sm text-gray-500">
            {data.qualityAnalysis?.goldSuppliers || 0} Gold Suppliers • {data.qualityAnalysis?.tradeAssurance || 0} with Trade Assurance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Filter className="h-4 w-4 mr-2" />
            Advanced Filters
            {appliedFiltersCount > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                {appliedFiltersCount}
              </span>
            )}
            {showFilters ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
          </button>
          <div className="flex items-center gap-2">
            {savedSuppliers.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                <BookmarkCheck className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700">{savedSuppliers.length} saved</span>
              </div>
            )}
            <button className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors">
              <Bookmark className="h-4 w-4 mr-2" />
              Save All ({filteredSuppliers.length})
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

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900">Filter Suppliers</h4>
              <div className="flex items-center gap-2">
                {appliedFiltersCount > 0 && (
                  <button 
                    onClick={clearAllFilters}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Clear all
                  </button>
                )}
                <button 
                  onClick={() => setShowFilters(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Trust & Credentials */}
              <div className="space-y-4">
                <h5 className="text-sm font-medium text-gray-900">Trust & Credentials</h5>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input 
                      type="checkbox" 
                      checked={filters.goldSupplier}
                      onChange={(e) => setFilters(prev => ({ ...prev, goldSupplier: e.target.checked }))}
                      className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500" 
                    />
                    <span className="ml-2 text-sm text-gray-700">Gold Suppliers Only</span>
                  </label>
                  <label className="flex items-center">
                    <input 
                      type="checkbox" 
                      checked={filters.tradeAssurance}
                      onChange={(e) => setFilters(prev => ({ ...prev, tradeAssurance: e.target.checked }))}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500" 
                    />
                    <span className="ml-2 text-sm text-gray-700">Trade Assurance</span>
                  </label>
                </div>
              </div>

              {/* MOQ Range */}
              <div className="space-y-4">
                <h5 className="text-sm font-medium text-gray-900">MOQ Range</h5>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{filters.moqRange[0]} units</span>
                    <span>{filters.moqRange[1]} units</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="500" 
                    value={filters.moqRange[1]}
                    onChange={(e) => setFilters(prev => ({ ...prev, moqRange: [prev.moqRange[0], parseInt(e.target.value)] }))}
                    className="w-full" 
                  />
                </div>
              </div>

              {/* Years in Business */}
              <div className="space-y-4">
                <h5 className="text-sm font-medium text-gray-900">Experience</h5>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{filters.yearsRange[0]}+ years</span>
                    <span>{filters.yearsRange[1]}+ years</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="20" 
                    value={filters.yearsRange[0]}
                    onChange={(e) => setFilters(prev => ({ ...prev, yearsRange: [parseInt(e.target.value), prev.yearsRange[1]] }))}
                    className="w-full" 
                  />
                </div>
              </div>

              {/* Quality Score */}
              <div className="space-y-4">
                <h5 className="text-sm font-medium text-gray-900">Quality Score</h5>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{filters.minQualityScore}+</span>
                    <span>100</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={filters.minQualityScore}
                    onChange={(e) => setFilters(prev => ({ ...prev, minQualityScore: parseInt(e.target.value) }))}
                    className="w-full" 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredSuppliers.map((supplier, index) => {
          
          return (
            <div key={supplier.id || index} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
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

                {/* Key Metrics Row */}
                <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-sm font-semibold text-gray-900">{supplier.price || 'Contact'}</div>
                    <div className="text-xs text-gray-500">Price</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-semibold text-gray-900">{supplier.reviewScore || 'N/A'}</div>
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