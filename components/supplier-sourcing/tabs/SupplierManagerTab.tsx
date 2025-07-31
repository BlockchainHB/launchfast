'use client'

import React, { useState, useEffect } from 'react'
import { Users, Plus, Search, Filter, MoreHorizontal, GripVertical, Tag, Clock, MessageCircle, Star, Award, Shield, Calendar, ChevronRight, X, Edit3, Eye, FolderOpen, ChevronDown, Trash2, ExternalLink, ArrowRight, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import type { SupplierSearchResult } from '@/types/supplier'

interface SupplierManagerTabProps {
  data: SupplierSearchResult | null
}

interface SupplierCard {
  id: string
  supplierId: string
  companyName: string
  location: { city: string; country: string }
  yearsInBusiness: number
  trust: { goldSupplier: boolean; tradeAssurance: boolean }
  stage: string
  lastContact: string
  nextAction: string
  tags: string[]
  notes: string
  relationshipHealth: 'excellent' | 'good' | 'fair' | 'poor'
  
  // Actual supplier data (replacing arbitrary scores)
  pricing?: {
    unitPrice?: number
    currency?: string
    priceRange?: { min: number; max: number }
  }
  alibabaRating?: {
    score: number // Out of 5
    reviewCount: number
    responseRate?: number // Percentage
    onTimeDelivery?: number // Percentage
  }
  
  // Enhanced context data
  batch?: {
    id: string
    name: string
    searchSource: 'market_research' | 'direct_search'
    searchQuery: string
    keyword?: string
    marketContext?: any
    totalSuppliers: number
    createdAt: string
  } | null
  
  market?: {
    id: string
    keyword: string
    marketGrade: string
    avgProfitPerUnit: number
    riskClassification: string
    avgMonthlyRevenue: number
    opportunityScore: number
  } | null
  
  profitProjection?: number
  marketGrade?: string
  sampleRequests?: number
  recentInteractions?: any[]
  contact?: {
    email?: string
    phone?: string
    person?: string
  }
  alibabaUrl?: string
  moq?: number
  businessType?: string
  opportunityScore?: number
  priorityLevel?: string
  createdAt: string
  updatedAt: string
}

// Helper function to get user ID from Supabase auth
const getUserId = async () => {
  try {
    const response = await fetch('/api/auth/user')
    if (!response.ok) throw new Error('Failed to get user')
    const { user } = await response.json()
    return user?.id
  } catch (error) {
    console.error('❌ Failed to get user ID:', error)
    return null
  }
}

export function SupplierManagerTab({ data }: SupplierManagerTabProps) {
  const [suppliers, setSuppliers] = useState<SupplierCard[]>([])
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierCard | null>(null)
  const [draggedSupplier, setDraggedSupplier] = useState<SupplierCard | null>(null)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [bulkSelected, setBulkSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    prospects: 0,
    contacted: 0,
    sampling: 0,
    negotiating: 0,
    partners: 0,
    total: 0
  })
  const [recentActivities, setRecentActivities] = useState<any[]>([])

  // Project Management State
  const [projects, setProjects] = useState<Array<{
    id: string
    name: string
    type: 'market' | 'batch'
    keyword?: string
    marketGrade?: string
    supplierCount: number
    lastActivity: string
  }>>([])
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [showProjectSelector, setShowProjectSelector] = useState(false)

  // Fetch suppliers on component mount and project change
  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      loadSuppliers()
    }
  }, [selectedProject])

  // Close project selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showProjectSelector) {
        const target = event.target as HTMLElement
        if (!target.closest('.project-selector')) {
          setShowProjectSelector(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showProjectSelector])

  // Add projects loading state
  const [projectsLoading, setProjectsLoading] = useState(true)

  // Load available projects (markets and batches)
  const loadProjects = async () => {
    try {
      setProjectsLoading(true)
      const userId = await getUserId()
      if (!userId) return

      // Fetch both markets and batches that have suppliers
      const [marketsResponse, batchesResponse] = await Promise.all([
        fetch(`/api/supplier-relationships?userId=${userId}&groupBy=market`),
        fetch(`/api/supplier-relationships?userId=${userId}&groupBy=batch`)
      ])

      const marketGroups = marketsResponse.ok ? await marketsResponse.json() : { data: { groups: [] } }
      const batchGroups = batchesResponse.ok ? await batchesResponse.json() : { data: { groups: [] } }

      const allProjects = [
        ...(marketGroups.data?.groups || []).map((group: any) => ({
          id: group.market_id,
          name: `${group.keyword} Market`,
          type: 'market' as const,
          keyword: group.keyword,
          marketGrade: group.market_grade,
          supplierCount: group.supplier_count,
          lastActivity: group.last_activity
        })),
        ...(batchGroups.data?.groups || []).map((group: any) => ({
          id: group.batch_id,
          name: group.batch_name,
          type: 'batch' as const,
          supplierCount: group.supplier_count,
          lastActivity: group.last_activity
        }))
      ]

      // Sort projects by most recent activity first
      const sortedProjects = allProjects.sort((a, b) => 
        new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
      )

      setProjects(sortedProjects)
      
      // Auto-select first project if none selected
      if (!selectedProject && sortedProjects.length > 0) {
        setSelectedProject(sortedProjects[0].id)
      }
    } catch (error) {
      console.error('❌ Error loading projects:', error)
      toast.error('Failed to load projects')
    } finally {
      setProjectsLoading(false)
    }
  }

  // Load suppliers from API filtered by selected project
  const loadSuppliers = async () => {
    try {
      setLoading(true)
      const userId = await getUserId()
      if (!userId || !selectedProject) {
        toast.error('Please log in and select a project')
        return
      }

      const selectedProjectData = projects.find(p => p.id === selectedProject)
      if (!selectedProjectData) return

      // Build query parameters based on project type
      const queryParams = new URLSearchParams({ userId })
      
      if (selectedProjectData.type === 'market') {
        queryParams.append('marketId', selectedProject)
      } else {
        queryParams.append('batchId', selectedProject)
      }

      const response = await fetch(`/api/supplier-relationships?${queryParams}`)
      if (!response.ok) throw new Error('Failed to fetch suppliers')

      const result = await response.json()
      if (result.success) {
        const projectSuppliers = result.data.suppliers || []
        setSuppliers(projectSuppliers)
        
        // Use stats, conversion metrics, and activities from API response
        setStats(result.data.stats || {
          prospects: 0,
          contacted: 0,
          sampling: 0,
          negotiating: 0,
          partners: 0,
          total: 0
        })
        setRecentActivities(result.data.recentActivities || [])
        
        console.log(`✅ Loaded ${projectSuppliers.length} suppliers for project: ${selectedProjectData.name}`)
      } else {
        throw new Error(result.error || 'Failed to load suppliers')
      }
    } catch (error) {
      console.error('❌ Error loading suppliers:', error)
      toast.error('Failed to load supplier relationships')
    } finally {
      setLoading(false)
    }
  }
  
  // Calculate pipeline stages with actual counts
  const pipelineStages = [
    { id: 'prospects', name: 'Prospects', color: 'bg-blue-100 text-blue-700', icon: Users },
    { id: 'contacted', name: 'Contacted', color: 'bg-yellow-100 text-yellow-700', icon: MessageCircle },
    { id: 'negotiating', name: 'Negotiating', color: 'bg-orange-100 text-orange-700', icon: Edit3 },
    { id: 'sampling', name: 'Sampling', color: 'bg-purple-100 text-purple-700', icon: Star },
    { id: 'partners', name: 'Partners', color: 'bg-green-100 text-green-700', icon: Award }
  ].map(stage => ({
    ...stage,
    count: stats[stage.id as keyof typeof stats] || 0
  }))
  
  // Drag and drop handlers
  const handleDragStart = (supplier: SupplierCard) => {
    setDraggedSupplier(supplier)
  }
  
  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault()
    setDragOverStage(stageId)
  }
  
  const handleDragLeave = () => {
    setDragOverStage(null)
  }
  
  const handleDrop = async (e: React.DragEvent, newStage: string) => {
    e.preventDefault()
    if (draggedSupplier && draggedSupplier.stage !== newStage) {
      try {
        const userId = await getUserId()
        if (!userId) return

        // Optimistically update UI
        setSuppliers(prev => prev.map(s => 
          s.id === draggedSupplier.id 
            ? { ...s, stage: newStage, lastContact: new Date().toISOString().split('T')[0] }
            : s
        ))

        // Update stats for project-specific counts
        setStats(prev => ({
          ...prev,
          [draggedSupplier.stage]: Math.max(0, prev[draggedSupplier.stage as keyof typeof prev] - 1),
          [newStage]: prev[newStage as keyof typeof prev] + 1
        }))

        // Update backend
        const response = await fetch(`/api/supplier-relationships/${draggedSupplier.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pipelineStage: newStage,
            lastContactDate: new Date().toISOString()
          })
        })

        if (!response.ok) {
          throw new Error('Failed to update supplier stage')
        }

        const result = await response.json()
        if (!result.success) {
          throw new Error(result.error || 'Failed to update supplier')
        }

        toast.success(`Moved ${draggedSupplier.companyName} to ${newStage}`)
      } catch (error) {
        console.error('❌ Error updating supplier stage:', error)
        toast.error('Failed to update supplier stage')
        // Revert optimistic update
        loadSuppliers()
      }
    }
    setDraggedSupplier(null)
    setDragOverStage(null)
  }

  // Delete supplier function
  const handleDeleteSupplier = async (supplier: SupplierCard) => {
    if (!confirm(`Are you sure you want to remove ${supplier.companyName} from your pipeline? This action cannot be undone.`)) {
      return
    }

    try {
      const userId = await getUserId()
      if (!userId) return

      // Optimistically remove from UI
      setSuppliers(prev => prev.filter(s => s.id !== supplier.id))
      
      // Update stats
      setStats(prev => ({
        ...prev,
        [supplier.stage]: Math.max(0, prev[supplier.stage as keyof typeof prev] - 1),
        total: Math.max(0, prev.total - 1)
      }))

      // Delete from backend
      const response = await fetch(`/api/supplier-relationships/${supplier.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete supplier')
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete supplier')
      }

      toast.success(`Removed ${supplier.companyName} from pipeline`)
    } catch (error) {
      console.error('❌ Error deleting supplier:', error)
      toast.error('Failed to remove supplier')
      // Revert optimistic update
      loadSuppliers()
    }
  }

  // Bulk delete selected suppliers
  const handleBulkDelete = async () => {
    if (bulkSelected.length === 0) return
    
    if (!confirm(`Are you sure you want to remove ${bulkSelected.length} suppliers from your pipeline? This action cannot be undone.`)) {
      return
    }

    try {
      const userId = await getUserId()
      if (!userId) return

      // Get supplier names for toast message
      const selectedSuppliers = suppliers.filter(s => bulkSelected.includes(s.id))
      
      // Optimistically remove from UI
      setSuppliers(prev => prev.filter(s => !bulkSelected.includes(s.id)))
      setBulkSelected([])
      
      // Update stats
      const stageCounts = selectedSuppliers.reduce((acc, supplier) => {
        acc[supplier.stage] = (acc[supplier.stage] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      setStats(prev => ({
        prospects: Math.max(0, prev.prospects - (stageCounts.prospects || 0)),
        contacted: Math.max(0, prev.contacted - (stageCounts.contacted || 0)),
        sampling: Math.max(0, prev.sampling - (stageCounts.sampling || 0)),
        negotiating: Math.max(0, prev.negotiating - (stageCounts.negotiating || 0)),
        partners: Math.max(0, prev.partners - (stageCounts.partners || 0)),
        total: Math.max(0, prev.total - selectedSuppliers.length)
      }))

      // Delete from backend
      const deletePromises = bulkSelected.map(id => 
        fetch(`/api/supplier-relationships/${id}`, { method: 'DELETE' })
      )

      const responses = await Promise.all(deletePromises)
      const failed = responses.filter(r => !r.ok)

      if (failed.length > 0) {
        throw new Error(`Failed to delete ${failed.length} suppliers`)
      }

      toast.success(`Removed ${selectedSuppliers.length} suppliers from pipeline`)
    } catch (error) {
      console.error('❌ Error bulk deleting suppliers:', error)
      toast.error('Failed to remove some suppliers')
      // Revert optimistic update
      loadSuppliers()
      setBulkSelected([])
    }
  }

  // Delete entire project (market or batch)
  const handleDeleteProject = async (project: typeof projects[0]) => {
    if (!confirm(`Are you sure you want to delete the entire "${project.name}" project? This will remove all ${project.supplierCount} suppliers and cannot be undone.`)) {
      return
    }

    try {
      const userId = await getUserId()
      if (!userId) return

      let endpoint = ''
      if (project.type === 'market') {
        endpoint = `/api/supplier-relationships/bulk-delete?userId=${userId}&marketId=${project.id}`
      } else {
        endpoint = `/api/supplier-relationships/bulk-delete?userId=${userId}&batchId=${project.id}`
      }

      const response = await fetch(endpoint, { method: 'DELETE' })
      
      if (!response.ok) {
        throw new Error('Failed to delete project')
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete project')
      }

      toast.success(`Deleted project "${project.name}" and removed ${project.supplierCount} suppliers`)
      
      // Refresh projects and clear selection
      setSelectedProject(null)
      loadProjects()
    } catch (error) {
      console.error('❌ Error deleting project:', error)
      toast.error('Failed to delete project')
    }
  }
  
  const getRelationshipHealthColor = (health: string) => {
    switch (health) {
      case 'excellent': return 'bg-green-100 text-green-700'
      case 'good': return 'bg-blue-100 text-blue-700'
      case 'fair': return 'bg-yellow-100 text-yellow-700'
      case 'poor': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }
  
  const filteredSuppliers = suppliers.filter(supplier => 
    supplier.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supplier.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const selectedProjectData = projects.find(p => p.id === selectedProject)

  return (
    <div className="space-y-6">
      {/* Project Selector & Header */}
      <div className="space-y-4">
        {/* Project Selection */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative project-selector">
              {projectsLoading ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg">
                  <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                  <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ) : (
                <button
                  onClick={() => setShowProjectSelector(!showProjectSelector)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FolderOpen className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-900">
                    {selectedProjectData ? selectedProjectData.name : 'Select Project'}
                  </span>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </button>
              )}
              
              {showProjectSelector && (
                <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="p-3 border-b border-gray-200">
                    <h4 className="text-sm font-medium text-gray-900">Active Projects</h4>
                    <p className="text-xs text-gray-500">Choose a market or batch to manage</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {projects.length === 0 ? (
                      <div className="p-4 text-center text-sm text-gray-500">
                        No projects with suppliers found
                      </div>
                    ) : (
                      projects.map((project) => (
                        <div
                          key={project.id}
                          className={`border-b border-gray-100 last:border-b-0 ${
                            selectedProject === project.id ? 'bg-blue-50 border-blue-200' : ''
                          }`}
                        >
                          <div className="flex items-center">
                            <button
                              onClick={() => {
                                setSelectedProject(project.id)
                                setShowProjectSelector(false)
                              }}
                              className="flex-1 text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                      project.type === 'market' 
                                        ? 'bg-green-100 text-green-700' 
                                        : 'bg-blue-100 text-blue-700'
                                    }`}>
                                      {project.type === 'market' ? '🎯 Market' : '📦 Batch'}
                                    </span>
                                    {project.marketGrade && (
                                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                                        {project.marketGrade}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-sm font-medium text-gray-900 truncate">
                                    {project.name}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {project.supplierCount} suppliers • {new Date(project.lastActivity).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteProject(project)
                              }}
                              className="px-3 py-3 text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                              title="Delete entire project"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {projectsLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-6 bg-gray-200 rounded-full w-24 animate-pulse"></div>
                <div className="h-6 bg-gray-200 rounded-full w-16 animate-pulse"></div>
              </div>
            ) : selectedProjectData && (
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  selectedProjectData.type === 'market' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {selectedProjectData.supplierCount} suppliers
                </span>
                {selectedProjectData.marketGrade && (
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                    Grade {selectedProjectData.marketGrade}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-gray-900">
              {selectedProjectData ? `${selectedProjectData.name} Pipeline` : 'Supplier Pipeline'}
            </h3>
          </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search suppliers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent w-64"
            />
          </div>
          {bulkSelected.length > 0 && (
            <button
              onClick={() => handleBulkDelete()}
              className="px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 border border-red-200 hover:border-red-300"
            >
              <Trash2 className="h-4 w-4" />
              Delete ({bulkSelected.length})
            </button>
          )}
        </div>
      </div>
      </div>

      {/* Pipeline Stats */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-center">
                <div className="w-10 h-10 bg-gray-200 rounded-full mx-auto mb-2 animate-pulse"></div>
                <div className="h-6 bg-gray-200 rounded mb-1 animate-pulse"></div>
                <div className="h-3 bg-gray-200 rounded w-16 mx-auto animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {pipelineStages.map((stage) => {
            const Icon = stage.icon
            return (
              <div key={stage.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="text-center">
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full ${stage.color} mb-2`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{stage.count}</div>
                  <div className="text-xs text-gray-500 mt-1">{stage.name}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Interactive Kanban Board */}
      {projectsLoading ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {/* Loading Skeleton for Kanban Columns */}
              {[1, 2, 3, 4, 5].map((col) => (
                <div key={col} className="flex-shrink-0 w-full lg:w-auto flex flex-col min-h-[600px] p-4 rounded-lg bg-gray-50">
                  {/* Column Header Skeleton */}
                  <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-200 mb-3">
                    <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                  </div>
                  
                  {/* Supplier Cards Skeleton */}
                  <div className="space-y-3 flex-1">
                    {[1, 2, 3].map((card) => (
                      <div key={card} className="bg-white border border-gray-200 rounded-lg p-3">
                        {/* Card Header */}
                        <div className="flex items-start gap-2 mb-3">
                          <div className="w-4 h-4 bg-gray-200 rounded animate-pulse mt-0.5 flex-shrink-0"></div>
                          <div className="flex-1 min-w-0">
                            <div className="h-4 bg-gray-200 rounded mb-2 animate-pulse"></div>
                            <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <div className="w-3 h-3 bg-gray-200 rounded animate-pulse"></div>
                            <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                          </div>
                        </div>
                        
                        {/* Metrics Skeleton */}
                        <div className="space-y-1.5 mb-2">
                          <div className="flex items-center justify-between">
                            <div className="h-3 bg-gray-200 rounded w-8 animate-pulse"></div>
                            <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="h-3 bg-gray-200 rounded w-12 animate-pulse"></div>
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <div key={star} className="w-2.5 h-2.5 bg-gray-200 rounded animate-pulse"></div>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
                            <div className="h-3 bg-gray-200 rounded w-12 animate-pulse"></div>
                          </div>
                        </div>
                        
                        {/* Tags Skeleton */}
                        <div className="flex gap-1 mb-3">
                          <div className="h-5 bg-gray-200 rounded w-12 animate-pulse"></div>
                          <div className="h-5 bg-gray-200 rounded w-8 animate-pulse"></div>
                        </div>
                        
                        {/* Footer Skeleton */}
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
                          </div>
                          <div className="h-3 bg-gray-200 rounded w-8 animate-pulse"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : !selectedProject ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Project</h3>
            <p className="text-sm text-gray-500 text-center max-w-md">
              Choose a market or batch from the dropdown above to view and manage your supplier relationships for that specific project.
            </p>
            <button
              onClick={() => setShowProjectSelector(true)}
              className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Choose Project
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 overflow-x-auto">
              {pipelineStages.map((stage) => {
                const stageSuppliers = filteredSuppliers.filter(s => s.stage === stage.id)
                const Icon = stage.icon
                
                return (
                  <div 
                    key={stage.id} 
                    className={`flex-shrink-0 w-full lg:w-auto flex flex-col min-h-[600px] max-h-[calc(100vh-300px)] p-4 rounded-lg transition-colors ${dragOverStage === stage.id ? 'bg-blue-50 border-2 border-blue-300 border-dashed' : 'bg-gray-50'}`}
                    onDragOver={(e) => handleDragOver(e, stage.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, stage.id)}
                  >
                  <div className="flex items-center gap-2 sticky top-0 bg-white p-2 rounded-lg border border-gray-200 mb-3">
                    <Icon className={`h-4 w-4 ${stage.color.replace('bg-', 'text-').replace('-100', '-600')}`} />
                    <h4 className="font-medium text-gray-900">{stage.name}</h4>
                  </div>
                  
                  {/* Supplier Cards */}
                  <div className="space-y-3 overflow-y-auto flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {stageSuppliers.map((supplier) => (
                      <div 
                        key={supplier.id}
                        draggable
                        onDragStart={() => handleDragStart(supplier)}
                        className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md hover:border-gray-300 transition-all cursor-move group"
                      >
                        <div className="flex items-start gap-2 mb-3">
                          <GripVertical className="h-4 w-4 text-gray-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <h5 
                              className="text-sm font-bold text-gray-900 leading-tight line-clamp-2 cursor-help"
                              title={supplier.companyName}
                              onMouseEnter={(e) => {
                                e.currentTarget.setAttribute('title', supplier.companyName)
                              }}
                            >
                              {supplier.companyName}
                            </h5>
                            {supplier.location.city !== 'Unknown' && (
                              <p className="text-xs text-gray-500 mt-1 truncate">
                                {supplier.location.city}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {supplier.alibabaUrl && (
                              <a
                                href={supplier.alibabaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-gray-400 hover:text-orange-500 transition-colors p-1"
                                title="View on Alibaba"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                            <input
                              type="checkbox"
                              checked={bulkSelected.includes(supplier.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setBulkSelected(prev => [...prev, supplier.id])
                                } else {
                                  setBulkSelected(prev => prev.filter(id => id !== supplier.id))
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                        
                        {/* Supplier Metrics */}
                        <div className="space-y-1.5 mb-2">
                          {/* Pricing Information */}
                          {supplier.pricing && (
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-600">Price</span>
                              <span className="text-xs font-medium text-gray-900">
                                {supplier.pricing.priceRange ? 
                                  `$${supplier.pricing.priceRange.min}-${supplier.pricing.priceRange.max}` :
                                  supplier.pricing.unitPrice ? 
                                    `$${supplier.pricing.unitPrice}${supplier.pricing.currency ? ' ' + supplier.pricing.currency : ''}` :
                                    'Contact for quote'
                                }
                              </span>
                            </div>
                          )}
                          
                          
                          {/* Alibaba Rating */}
                          {supplier.alibabaRating && (
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-600">Rating</span>
                              <div className="flex items-center gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} className={`h-2.5 w-2.5 ${
                                    i < Math.floor(supplier.alibabaRating!.score) 
                                      ? 'text-yellow-400 fill-current' 
                                      : 'text-gray-300'
                                  }`} />
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-600">Experience</span>
                            <span className="text-xs font-medium text-gray-900">
                              {supplier.yearsInBusiness}+ years
                            </span>
                          </div>
                        </div>
                        
                        
                        {/* Tags */}
                        {supplier.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {supplier.tags.slice(0, 2).map((tag, index) => (
                              <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                {tag}
                              </span>
                            ))}
                            {supplier.tags.length > 2 && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                +{supplier.tags.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                        
                        {/* Last Contact */}
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{new Date(supplier.lastContact).toLocaleDateString()}</span>
                          </div>
                          <span>{supplier.yearsInBusiness}y exp</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity Feed */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <div>
            <h4 className="text-lg font-semibold text-gray-900">Recent Activity</h4>
            <p className="text-sm text-gray-500 mt-1">Latest 5 interactions and changes in your supplier pipeline</p>
          </div>
        </div>
        
        <div className="p-6">
          {loading ? (
            <div className="flow-root">
              <ul className="-mb-8">
                {[1, 2, 3, 4, 5].map((i) => (
                  <li key={i}>
                    <div className="relative pb-8">
                      {i !== 5 && (
                        <span className="absolute left-5 top-5 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                      )}
                      <div className="relative flex items-start space-x-3">
                        <div className="relative px-1 bg-gray-200 rounded-full flex items-center justify-center h-10 w-10 animate-pulse">
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                            <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
                          </div>
                          <div className="h-4 bg-gray-200 rounded w-24 mt-1 animate-pulse"></div>
                          <div className="h-3 bg-gray-200 rounded w-40 mt-1 animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : recentActivities.length > 0 ? (
            <div className="flow-root">
              <ul className="-mb-8">
                {recentActivities.slice(0, 5).map((activity, index) => {
                  // Parse activity to extract stage information for color coding
                  const getActivityDisplay = (activity: any) => {
                    const content = activity.content?.toLowerCase() || ''
                    const subject = activity.subject || ''
                    
                    if (activity.interactionType === 'status_change') {
                      if (content.includes('prospects')) return { 
                        action: 'Moved to Prospects', 
                        color: 'bg-blue-600', 
                        iconBg: 'bg-blue-100',
                        iconColor: 'text-blue-600',
                        icon: Users 
                      }
                      if (content.includes('contacted')) return { 
                        action: 'Moved to Contacted', 
                        color: 'bg-yellow-600', 
                        iconBg: 'bg-yellow-100',
                        iconColor: 'text-yellow-600',
                        icon: MessageCircle 
                      }
                      if (content.includes('negotiating')) return { 
                        action: 'Moved to Negotiating', 
                        color: 'bg-orange-600', 
                        iconBg: 'bg-orange-100',
                        iconColor: 'text-orange-600',
                        icon: Edit3 
                      }
                      if (content.includes('sampling')) return { 
                        action: 'Moved to Sampling', 
                        color: 'bg-purple-600', 
                        iconBg: 'bg-purple-100',
                        iconColor: 'text-purple-600',
                        icon: Star 
                      }
                      if (content.includes('partners')) return { 
                        action: 'Moved to Partners', 
                        color: 'bg-green-600', 
                        iconBg: 'bg-green-100',
                        iconColor: 'text-green-600',
                        icon: Award 
                      }
                      return { 
                        action: 'Pipeline Updated', 
                        color: 'bg-blue-600', 
                        iconBg: 'bg-blue-100',
                        iconColor: 'text-blue-600',
                        icon: ArrowRight 
                      }
                    }
                    
                    if (activity.interactionType === 'note') {
                      // Handle batch save activities specially
                      if (subject.includes('Batch Save') || content.includes('batch')) {
                        return { 
                          action: 'Suppliers Saved For Market', 
                          color: 'bg-blue-600', 
                          iconBg: 'bg-blue-100',
                          iconColor: 'text-blue-600',
                          icon: Plus 
                        }
                      }
                      return { 
                        action: 'Added Note', 
                        color: 'bg-green-600', 
                        iconBg: 'bg-green-100',
                        iconColor: 'text-green-600',
                        icon: MessageSquare 
                      }
                    }
                    if (subject.includes('Added')) return { 
                      action: 'Suppliers Saved For Market', 
                      color: 'bg-blue-600', 
                      iconBg: 'bg-blue-100',
                      iconColor: 'text-blue-600',
                      icon: Plus 
                    }
                    if (subject.includes('Delete') || subject.includes('Removed')) return { 
                      action: 'Supplier Removed', 
                      color: 'bg-red-600', 
                      iconBg: 'bg-red-100',
                      iconColor: 'text-red-600',
                      icon: Trash2 
                    }
                    
                    return { 
                      action: subject || 'Activity', 
                      color: 'bg-gray-600', 
                      iconBg: 'bg-gray-100',
                      iconColor: 'text-gray-600',
                      icon: Clock 
                    }
                  }
                  
                  const { action, iconBg, iconColor, icon: ActivityIcon } = getActivityDisplay(activity)
                  const isLast = index === recentActivities.slice(0, 5).length - 1
                  
                  return (
                    <li key={activity.id || index}>
                      <div className="relative pb-8">
                        {!isLast && (
                          <span className="absolute left-5 top-5 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                        )}
                        <div className="relative flex items-start space-x-3">
                          <div className={`relative px-1 ${iconBg} rounded-full flex items-center justify-center h-10 w-10`}>
                            <ActivityIcon className={`h-5 w-5 ${iconColor}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-gray-900">{action}</p>
                              <div className="flex items-center space-x-2">
                                <time className="text-xs text-gray-500">{activity.relativeTime}</time>
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 mt-0.5">{activity.supplierName}</p>
                            {activity.content && activity.interactionType !== 'status_change' && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-1">{activity.content}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">No recent activity</h3>
              <p className="text-sm text-gray-500 max-w-sm mx-auto">
                Start interacting with suppliers by moving them through the pipeline, adding notes, or making changes. 
                All activity will be tracked here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}