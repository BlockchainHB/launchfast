'use client'

import React, { useState, useEffect } from 'react'
import { Package, Plus, Clock, CheckCircle, Truck, Star, DollarSign, Calendar, CalendarDays, ChevronLeft, ChevronRight, ArrowLeft, ArrowRight, MapPin, Upload, Edit3, Camera, FileText, TrendingUp, AlertCircle, Target, X, ChevronDown, Database, Users, Search, FolderOpen, Trash2 } from 'lucide-react'
import type { SupplierSearchResult } from '@/types/supplier'

interface SampleTrackerTabProps {
  data: SupplierSearchResult | null
}

interface Sample {
  id: string
  productName: string
  supplier: {
    name: string
    location: string
  }
  status: 'shipped' | 'received' | 'evaluated' | 'failed' | 'passed'
  requestDate: string
  expectedDelivery?: string
  actualDelivery?: string
  cost: {
    sampleCost: number
    shippingCost: number
    totalCost: number
  }
  trackingNumber?: string
  evaluation?: {
    quality: number
    design: number
    materials: number
    overall: number
    passed: boolean
    notes: string
    photos: string[]
  }
  tags: string[]
  potentialOrderValue?: number
}

interface ProjectGroup {
  market_id?: string
  batch_id?: string
  keyword?: string
  batch_name?: string
  market_grade?: string
  supplier_count: number
  last_activity: string
}

interface SampleStats {
  total: number
  planning: number
  requested: number
  shipped: number
  received: number
  evaluated: number
  totalCost: number
  totalPotentialValue: number
  approvalRate: number
  avgQualityScore: number
  pendingEvaluations: number
}

// Mock data removed - now using real API integration

export function SampleTrackerTab({ data }: SampleTrackerTabProps) {
  const [samples, setSamples] = useState<Sample[]>([])
  const [showEvaluationModal, setShowEvaluationModal] = useState(false)
  const [bulkSelected, setBulkSelected] = useState<string[]>([])
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddSampleModal, setShowAddSampleModal] = useState(false)
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false)
  const [selectedSampleForEvaluation, setSelectedSampleForEvaluation] = useState<Sample | null>(null)
  
  // Evaluation form state
  const [evaluation, setEvaluation] = useState({
    buildQuality: 0,
    packagingQuality: 0,
    designQuality: 0,
    supplierCommunication: 0,
    itemDimensions: { width: '', height: '', depth: '', weight: '' },
    packageDimensions: { width: '', height: '', depth: '', weight: '' },
    notes: ''
  })
  
  // Project management state
  const [projects, setProjects] = useState<ProjectGroup[]>([])
  const [selectedProject, setSelectedProject] = useState<ProjectGroup | null>(null)
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const [projectsLoading, setProjectsLoading] = useState(false)
  
  // Available suppliers for current project
  const [availableSuppliers, setAvailableSuppliers] = useState<Array<{id: string, name: string, location: string}>>([])
  const [suppliersLoading, setSuppliersLoading] = useState(false)
  
  // Custom dropdown state
  const [selectedSupplier, setSelectedSupplier] = useState<{id: string, name: string, location: string} | null>(null)
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false)
  
  // Form state for sample creation
  const [isCreatingSample, setIsCreatingSample] = useState(false)
  const [selectedShippedDate, setSelectedShippedDate] = useState<string>('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  
  // Calculate sample statistics
  const sampleStats: SampleStats = {
    total: samples.length,
    planning: 0, // No longer used
    requested: 0, // No longer used  
    shipped: samples.filter(s => s.status === 'shipped').length,
    received: samples.filter(s => s.status === 'received').length,
    evaluated: samples.filter(s => s.status === 'evaluated').length,
    totalCost: samples.reduce((sum, s) => sum + s.cost.totalCost, 0),
    totalPotentialValue: 0, // Removed ROI calculations
    approvalRate: samples.filter(s => s.evaluation?.passed).length / Math.max(samples.filter(s => s.status === 'evaluated').length, 1) * 100,
    avgQualityScore: samples.filter(s => s.evaluation?.overall).reduce((sum, s) => sum + (s.evaluation?.overall || 0), 0) / Math.max(samples.filter(s => s.evaluation?.overall).length, 1),
    pendingEvaluations: samples.filter(s => s.status === 'received').length
  }

  // Load projects on component mount
  useEffect(() => {
    loadProjects()
  }, [])

  // Load samples when project changes
  useEffect(() => {
    if (selectedProject) {
      loadSamples()
      loadSuppliers()
    } else {
      setSamples([])
      setAvailableSuppliers([])
      setLoading(false)
    }
  }, [selectedProject])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showSupplierDropdown) {
        setShowSupplierDropdown(false)
      }
      if (showDatePicker) {
        setShowDatePicker(false)
      }
    }

    if (showSupplierDropdown || showDatePicker) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showSupplierDropdown, showDatePicker])

  const loadProjects = async () => {
    setProjectsLoading(true)
    try {
      const userId = '29a94bda-39e2-4b57-8cc0-cd289274da5a' // TODO: Get from auth
      
      // Load market groups
      const marketResponse = await fetch(`/api/supplier-relationships?userId=${userId}&groupBy=market`)
      const marketData = await marketResponse.json()
      
      // Load batch groups
      const batchResponse = await fetch(`/api/supplier-relationships?userId=${userId}&groupBy=batch`)
      const batchData = await batchResponse.json()
      
      const allProjects: ProjectGroup[] = []
      
      // Add market groups
      if (marketData.success && marketData.data.groups) {
        marketData.data.groups.forEach((group: any) => {
          allProjects.push({
            market_id: group.market_id,
            keyword: group.keyword,
            market_grade: group.market_grade,
            supplier_count: group.supplier_count,
            last_activity: group.last_activity
          })
        })
      }
      
      // Add batch groups
      if (batchData.success && batchData.data.groups) {
        batchData.data.groups.forEach((group: any) => {
          allProjects.push({
            batch_id: group.batch_id,
            batch_name: group.batch_name,
            supplier_count: group.supplier_count,
            last_activity: group.last_activity
          })
        })
      }
      
      // Sort by most recent activity
      allProjects.sort((a, b) => new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime())
      
      setProjects(allProjects)
      
      // Auto-select most recent project if none selected
      if (!selectedProject && allProjects.length > 0) {
        setSelectedProject(allProjects[0])
      }
      
    } catch (error) {
      console.error('Failed to load projects:', error)
      setError('Failed to load projects')
    } finally {
      setProjectsLoading(false)
    }
  }

  const loadSuppliers = async () => {
    if (!selectedProject) return
    
    setSuppliersLoading(true)
    
    try {
      const userId = '29a94bda-39e2-4b57-8cc0-cd289274da5a' // TODO: Get from auth
      
      // Build params for current project
      const params = new URLSearchParams({
        userId,
        limit: '100'
      })
      
      if (selectedProject.market_id) {
        params.append('marketId', selectedProject.market_id)
      }
      if (selectedProject.batch_id) {
        params.append('batchId', selectedProject.batch_id)
      }
      
      const response = await fetch(`/api/supplier-relationships?${params}`)
      const data = await response.json()
      
      if (!data.success) {
        throw new Error('Failed to load suppliers')
      }
      
      // Transform supplier data for dropdown
      const suppliers = data.data.suppliers.map((supplier: any) => ({
        id: supplier.id,
        name: supplier.companyName,
        location: `${supplier.location.city}, ${supplier.location.country}`
      }))
      
      setAvailableSuppliers(suppliers)
      
    } catch (error) {
      console.error('Failed to load suppliers:', error)
      setError('Failed to load suppliers for this project')
    } finally {
      setSuppliersLoading(false)
    }
  }

  const createSampleRequest = async (formData: FormData) => {
    setIsCreatingSample(true)
    
    try {
      const userId = '29a94bda-39e2-4b57-8cc0-cd289274da5a' // TODO: Get from auth
      
      const sampleCost = parseFloat(formData.get('sampleCost') as string) || 0
      const dateShipped = selectedShippedDate || null
      
      const sampleData = {
        userId,
        supplierRelationshipId: selectedSupplier?.id,
        productName: formData.get('productName') as string,
        sampleCost: sampleCost,
        shippingCost: 0, // No longer needed
        totalCost: sampleCost, // Total cost is just the sample cost
        trackingNumber: formData.get('trackingNumber') as string || null,
        requestStatus: 'shipped',
        // Set shipping_date since the sample is being created as "shipped"
        shippingDate: dateShipped || new Date().toISOString()
      }

      console.log('Creating sample request with data:', sampleData)

      const response = await fetch('/api/sample-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sampleData)
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to create sample request')
      }

      console.log('✅ Sample request created successfully:', result.data)
      
      // Refresh the samples data
      await loadSamples()
      
      // Close modal and reset form
      setShowAddSampleModal(false)
      setSelectedSupplier(null)
      setShowSupplierDropdown(false)
      
    } catch (error) {
      console.error('❌ Failed to create sample request:', error)
      setError(`Failed to create sample request: ${error}`)
    } finally {
      setIsCreatingSample(false)
    }
  }

  const loadSamples = async () => {
    if (!selectedProject) return
    
    setLoading(true)
    setError(null)
    
    try {
      const userId = '29a94bda-39e2-4b57-8cc0-cd289274da5a' // TODO: Get from auth
      
      // First get supplier relationships for this project
      const params = new URLSearchParams({
        userId,
        limit: '100'
      })
      
      if (selectedProject.market_id) {
        params.append('marketId', selectedProject.market_id)
      }
      if (selectedProject.batch_id) {
        params.append('batchId', selectedProject.batch_id)
      }
      
      const suppliersResponse = await fetch(`/api/supplier-relationships?${params}`)
      const suppliersData = await suppliersResponse.json()
      
      if (!suppliersData.success) {
        throw new Error('Failed to load suppliers')
      }
      
      // Get supplier relationship IDs
      const supplierIds = suppliersData.data.suppliers.map((s: any) => s.id)
      
      if (supplierIds.length === 0) {
        setSamples([])
        setLoading(false)
        return
      }
      
      // Load sample requests for these suppliers
      const samplesResponse = await fetch(`/api/sample-requests?userId=${userId}&limit=100`)
      const samplesData = await samplesResponse.json()
      
      if (samplesData.success && samplesData.data.sampleRequests) {
        // Filter samples for current project's suppliers
        const projectSamples = samplesData.data.sampleRequests
          .filter((sample: any) => supplierIds.includes(sample.supplier_relationship_id))
          .map((sample: any) => ({
            id: sample.id,
            productName: sample.product_name,
            supplier: {
              name: sample.supplier_relationships?.supplier_name || 'Unknown Supplier',
              location: 'Unknown Location' // TODO: Get from supplier relationship
            },
            status: sample.request_status,
            requestDate: sample.created_at,
            expectedDelivery: sample.expected_delivery_date,
            actualDelivery: sample.actual_delivery_date,
            cost: {
              sampleCost: sample.sample_cost || 0,
              shippingCost: sample.shipping_cost || 0,
              totalCost: sample.total_cost || 0
            },
            trackingNumber: sample.tracking_number,
            evaluation: sample.sample_evaluations?.[0] ? {
              quality: sample.sample_evaluations[0].quality_rating || 0,
              design: sample.sample_evaluations[0].design_rating || 0,
              materials: sample.sample_evaluations[0].materials_rating || 0,
              overall: sample.sample_evaluations[0].overall_rating || 0,
              passed: sample.sample_evaluations[0].final_decision === 'approved',
              notes: sample.sample_evaluations[0].evaluation_notes || '',
              photos: sample.sample_evaluations[0].evaluation_photos || []
            } : undefined,
            tags: [] // TODO: Add tags system
          }))
        
        setSamples(projectSamples)
      } else {
        setSamples([])
      }
      
    } catch (error) {
      console.error('Failed to load samples:', error)
      setError('Failed to load samples')
      setSamples([])
    } finally {
      setLoading(false)
    }
  }

  const getProjectDisplayName = (project: ProjectGroup) => {
    if (project.market_id) {
      return `${project.keyword} Market${project.market_grade ? ` (${project.market_grade})` : ''}`
    } else {
      return project.batch_name || 'Unnamed Batch'
    }
  }

  const getProjectIcon = (project: ProjectGroup) => {
    return project.market_id ? Database : Package
  }

  // Date helper functions
  const formatDateForDisplay = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatDateForInput = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toISOString().split('T')[0]
  }

  // Calendar helper functions
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    
    return days
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isSameDay = (date1: Date, date2: Date) => {
    return date1.toDateString() === date2.toDateString()
  }

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const moveSampleToStage = async (sampleId: string, newStatus: string) => {
    try {
      const userId = '29a94bda-39e2-4b57-8cc0-cd289274da5a' // TODO: Get from auth
      
      const response = await fetch('/api/sample-requests', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sampleRequestId: sampleId,
          userId,
          requestStatus: newStatus
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to update sample status')
      }

      // Update local state
      setSamples(prev => prev.map(sample => 
        sample.id === sampleId 
          ? { ...sample, status: newStatus as Sample['status'] }
          : sample
      ))

      console.log('✅ Sample status updated:', result.data)
      
    } catch (error) {
      console.error('❌ Failed to update sample status:', error)
      setError(`Failed to update sample status: ${error}`)
    }
  }

  const getNextStage = (currentStatus: string): string | null => {
    // For evaluated samples, they can only go to failed or passed, not automatically to the next
    // This should be handled by the evaluation modal
    const stages = ['shipped', 'received', 'evaluated']
    const currentIndex = stages.indexOf(currentStatus)
    return currentIndex < stages.length - 1 ? stages[currentIndex + 1] : null
  }

  const getPreviousStage = (currentStatus: string): string | null => {
    const stages = ['shipped', 'received']
    const currentIndex = stages.indexOf(currentStatus)
    
    // Special handling for failed/passed - they can go back to received
    if (currentStatus === 'failed' || currentStatus === 'passed') {
      return 'received'
    }
    
    return currentIndex > 0 ? stages[currentIndex - 1] : null
  }

  const getProgressStage = (status: string): number => {
    // Progress stages: 1=shipped, 2=received, 3=failed/passed
    switch (status) {
      case 'shipped': return 1
      case 'received': return 2
      case 'failed':
      case 'passed': return 3
      default: return 1
    }
  }

  const samplePipeline = [
    { id: 'shipped', name: 'Shipped', icon: Truck, color: 'bg-blue-100 text-blue-700' },
    { id: 'received', name: 'Received', icon: CheckCircle, color: 'bg-yellow-100 text-yellow-700' },
    { id: 'failed', name: 'Failed', icon: X, color: 'bg-red-100 text-red-700' },
    { id: 'passed', name: 'Passed', icon: Target, color: 'bg-green-100 text-green-700' }
  ].map(stage => ({
    ...stage,
    count: samples.filter(s => s.status === stage.id).length
  }))
  
  // Sample sorting logic: Pending → Passed → Failed (within each group by date)
  const sortSamplesByStatus = (samples: Sample[]) => {
    const statusOrder = {
      'shipped': 1,
      'received': 2,
      'passed': 3,
      'failed': 4
    }
    
    return [...samples].sort((a, b) => {
      // First sort by status priority
      const statusDiff = statusOrder[a.status as keyof typeof statusOrder] - statusOrder[b.status as keyof typeof statusOrder]
      if (statusDiff !== 0) return statusDiff
      
      // Within same status, sort by date (newest first)
      return new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime()
    })
  }
  
  const filteredSamples = filterStatus === 'all' 
    ? sortSamplesByStatus(samples)
    : sortSamplesByStatus(samples.filter(s => s.status === filterStatus))
    
  const getStatusColor = (status: string) => {
    const stage = samplePipeline.find(s => s.id === status)
    return stage?.color || 'bg-gray-100 text-gray-700'
  }
  
  const getStatusIcon = (status: string) => {
    const stage = samplePipeline.find(s => s.id === status)
    return stage?.icon || Clock
  }
  
  const updateSampleStatus = (sampleId: string, newStatus: Sample['status']) => {
    setSamples(prev => prev.map(s => 
      s.id === sampleId 
        ? { ...s, status: newStatus }
        : s
    ))
  }

  const handleDeleteSamples = () => {
    if (bulkSelected.length === 0) return
    setShowDeleteConfirmModal(true)
  }

  // Star Rating Component
  const StarRating = ({ rating, onRatingChange, label }: { 
    rating: number, 
    onRatingChange: (rating: number) => void,
    label: string 
  }) => {
    const [hoverRating, setHoverRating] = useState(0)

    return (
      <div className="flex items-center justify-between py-3">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onRatingChange(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-1 rounded"
            >
              <Star
                className={`h-5 w-5 transition-colors ${
                  star <= (hoverRating || rating)
                    ? 'text-yellow-400 fill-current'
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    )
  }

  const handleEvaluationSubmit = async (decision: 'passed' | 'failed') => {
    if (!selectedSampleForEvaluation) return

    try {
      const userId = '29a94bda-39e2-4b57-8cc0-cd289274da5a' // TODO: Get from auth
      
      // Calculate overall score from star ratings
      const totalRating = evaluation.buildQuality + evaluation.packagingQuality + evaluation.designQuality + evaluation.supplierCommunication
      const overallScore = totalRating > 0 ? totalRating / 4 : 0

      // Prepare evaluation data
      const evaluationData = {
        sampleId: selectedSampleForEvaluation.id,
        userId,
        buildQuality: evaluation.buildQuality,
        packagingQuality: evaluation.packagingQuality,
        designQuality: evaluation.designQuality,
        supplierCommunication: evaluation.supplierCommunication,
        itemDimensions: evaluation.itemDimensions.width ? {
          width: parseFloat(evaluation.itemDimensions.width) || null,
          height: parseFloat(evaluation.itemDimensions.height) || null,
          depth: parseFloat(evaluation.itemDimensions.depth) || null,
          weight: parseFloat(evaluation.itemDimensions.weight) || null
        } : null,
        packageDimensions: evaluation.packageDimensions.width ? {
          width: parseFloat(evaluation.packageDimensions.width) || null,
          height: parseFloat(evaluation.packageDimensions.height) || null,
          depth: parseFloat(evaluation.packageDimensions.depth) || null,
          weight: parseFloat(evaluation.packageDimensions.weight) || null
        } : null,
        notes: evaluation.notes || null,
        finalDecision: decision,
        overallScore
      }

      // Update sample status first
      const statusResponse = await fetch('/api/sample-requests', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sampleRequestId: selectedSampleForEvaluation.id,
          userId,
          requestStatus: decision
        })
      })

      if (!statusResponse.ok) {
        throw new Error('Failed to update sample status')
      }

      // TODO: Save evaluation data to sample_evaluations table
      console.log('Evaluation data:', evaluationData)

      // Optimistically update the UI
      setSamples(prev => prev.map(sample => 
        sample.id === selectedSampleForEvaluation.id 
          ? { 
              ...sample, 
              status: decision as Sample['status'],
              evaluation: {
                quality: evaluation.buildQuality,
                design: evaluation.designQuality,
                materials: evaluation.packagingQuality,
                overall: overallScore,
                passed: decision === 'passed',
                notes: evaluation.notes,
                photos: []
              }
            }
          : sample
      ))

      // Close modal
      setSelectedSampleForEvaluation(null)
      
      console.log(`✅ Sample ${decision}: ${selectedSampleForEvaluation.productName}`)

    } catch (error) {
      console.error('❌ Failed to submit evaluation:', error)
      setError(`Failed to submit evaluation: ${error}`)
    }
  }

  const confirmDeleteSamples = async () => {
    try {
      const userId = '29a94bda-39e2-4b57-8cc0-cd289274da5a' // TODO: Get from auth
      
      // Close modal first
      setShowDeleteConfirmModal(false)
      
      // Optimistically remove from UI
      setSamples(prev => prev.filter(s => !bulkSelected.includes(s.id)))
      const deletedCount = bulkSelected.length
      setBulkSelected([])
      
      // Delete from backend
      const deletePromises = bulkSelected.map(sampleId => 
        fetch(`/api/sample-requests?sampleRequestId=${sampleId}&userId=${userId}`, { 
          method: 'DELETE' 
        })
      )
      
      const responses = await Promise.all(deletePromises)
      const failed = responses.filter(r => !r.ok)
      
      if (failed.length > 0) {
        throw new Error(`Failed to delete ${failed.length} samples`)
      }
      
      console.log(`✅ Successfully deleted ${deletedCount} samples`)
      
    } catch (error) {
      console.error('❌ Error deleting samples:', error)
      setError(`Failed to delete samples: ${error}`)
      // Revert optimistic update
      await loadSamples()
      setBulkSelected([])
    }
  }


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
                  onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FolderOpen className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-900">
                    {selectedProject ? getProjectDisplayName(selectedProject) : 'Select Project'}
                  </span>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </button>
              )}
              
              {showProjectDropdown && (
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
                          key={project.market_id || project.batch_id}
                          className={`border-b border-gray-100 last:border-b-0 ${
                            selectedProject === project ? 'bg-blue-50 border-blue-200' : ''
                          }`}
                        >
                          <div className="flex items-center">
                            <button
                              onClick={() => {
                                setSelectedProject(project)
                                setShowProjectDropdown(false)
                              }}
                              className="flex-1 text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                      project.market_id 
                                        ? 'bg-green-100 text-green-700' 
                                        : 'bg-blue-100 text-blue-700'
                                    }`}>
                                      {project.market_id ? '🎯 Market' : '📦 Batch'}
                                    </span>
                                    {project.market_grade && (
                                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                                        {project.market_grade}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-sm font-medium text-gray-900 truncate">
                                    {getProjectDisplayName(project)}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {project.supplier_count} suppliers • {new Date(project.last_activity).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
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
            ) : selectedProject && (
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  selectedProject.market_id
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {selectedProject.supplier_count} suppliers
                </span>
                {selectedProject.market_grade && (
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                    Grade {selectedProject.market_grade}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Sample Tracker</h3>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* No Project Selected State */}
      {!selectedProject && !projectsLoading && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-12">
          <div className="text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Project</h3>
            <p className="text-gray-500 mb-4 max-w-md mx-auto">
              Choose a market or batch from the dropdown above to view and manage sample requests for that project.
            </p>
            <button 
              onClick={() => setShowProjectDropdown(true)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Search className="h-4 w-4 mr-2" />
              Choose Project
            </button>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {selectedProject && loading && (
        <>
          {/* Sample Pipeline Stats Skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto mb-3 animate-pulse"></div>
                  <div className="h-8 bg-gray-200 rounded mb-1 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-16 mx-auto animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Analytics Dashboard Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded mb-2 animate-pulse"></div>
                    <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                    <div className="h-6 bg-gray-200 rounded w-16 animate-pulse"></div>
                  </div>
                  <div className="pt-2 border-t border-gray-100">
                    <div className="h-3 bg-gray-200 rounded w-20 mb-1 animate-pulse"></div>
                    <div className="h-5 bg-gray-200 rounded w-12 animate-pulse"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Sample Pipeline Board Skeleton */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="h-5 bg-gray-200 rounded w-32 animate-pulse"></div>
                <div className="h-8 bg-gray-200 rounded w-20 animate-pulse"></div>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                          <div className="h-5 bg-gray-200 rounded w-48 animate-pulse"></div>
                          <div className="h-6 bg-gray-200 rounded-full w-16 animate-pulse"></div>
                        </div>
                        <div className="flex items-center gap-4 text-sm mb-2">
                          <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                          <div className="h-4 bg-gray-200 rounded w-40 animate-pulse"></div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                          <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                        <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
                        <div className="h-3 bg-gray-200 rounded w-8 animate-pulse"></div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Main Content - Only show when project selected and not loading */}
      {selectedProject && !loading && (
        <>
          {/* Sample Pipeline Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {samplePipeline.map((stage) => {
              const Icon = stage.icon
              return (
                <div 
                  key={stage.id} 
                  className={`bg-white border border-gray-200 rounded-xl shadow-sm p-6 cursor-pointer transition-all hover:shadow-md hover:border-gray-300 ${
                    filterStatus === stage.id ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50' : ''
                  }`}
                  onClick={() => setFilterStatus(filterStatus === stage.id ? 'all' : stage.id)}
                >
                  <div className="text-center">
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${stage.color} mb-3`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-1">{stage.count}</div>
                    <div className="text-sm font-medium text-gray-600">{stage.name}</div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Analytics Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sample Costs */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Sample Costs</h4>
                  <p className="text-xs text-gray-500">Investment tracking</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-600">Total Investment</span>
                    <span className="text-xl font-bold text-gray-900">${sampleStats.totalCost.toFixed(2)}</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-gray-100">
                  <div>
                    <span className="text-xs text-gray-500 block mb-1">Avg per Sample</span>
                    <span className="text-lg font-semibold text-gray-700">
                      ${sampleStats.total > 0 ? (sampleStats.totalCost / sampleStats.total).toFixed(2) : '0.00'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Sample Quality */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Star className="h-4 w-4 text-yellow-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Sample Quality</h4>
                  <p className="text-xs text-gray-500">Evaluation metrics</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-600">Avg Quality Score</span>
                    <span className="text-xl font-bold text-yellow-600">
                      {sampleStats.evaluated > 0 && !isNaN(sampleStats.avgQualityScore) 
                        ? `${sampleStats.avgQualityScore.toFixed(1)}/5`
                        : '--'
                      }
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-gray-100">
                  <div>
                    <span className="text-xs text-gray-500 block mb-1">Pending</span>
                    <span className="text-lg font-semibold text-blue-600">{samples.filter(s => !['failed', 'passed'].includes(s.status)).length}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block mb-1">Failed</span>
                    <span className="text-lg font-semibold text-red-600">{samples.filter(s => s.status === 'failed').length}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block mb-1">Passed</span>
                    <span className="text-lg font-semibold text-green-600">{samples.filter(s => s.status === 'passed').length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sample Pipeline Board */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h4 className="font-medium text-gray-900">Sample Pipeline</h4>
                <div className="flex items-center gap-2">
                  {bulkSelected.length > 0 && (
                    <button 
                      onClick={handleDeleteSamples}
                      className="px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 border border-red-200 hover:border-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete ({bulkSelected.length})
                    </button>
                  )}
                  <button 
                    disabled={!selectedProject}
                    onClick={() => {
                      setSelectedSupplier(null)
                      setShowSupplierDropdown(false)
                      setSelectedShippedDate('')
                      setShowDatePicker(false)
                      setShowAddSampleModal(true)
                    }}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Sample
                  </button>
                  <button 
                    onClick={() => setFilterStatus('all')}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1 ${
                      filterStatus === 'all' 
                        ? 'bg-gray-900 text-white' 
                        : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    All ({sampleStats.total})
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                {filteredSamples.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No Sample Requests</h4>
                    <p className="text-gray-500">
                      {selectedProject 
                        ? "No sample requests found for this project. Use the 'Add Sample' button above to get started."
                        : "Select a project to view sample requests."
                      }
                    </p>
                  </div>
                ) : (
                  filteredSamples.map((sample) => {
                  const StatusIcon = getStatusIcon(sample.status)
                  
                  // Get conditional styling based on sample status
                  const getCardStyling = (status: string) => {
                    switch (status) {
                      case 'failed':
                        return 'bg-red-50 border-red-200 hover:shadow-md hover:border-red-300'
                      case 'passed':
                        return 'bg-green-50 border-green-200 hover:shadow-md hover:border-green-300'
                      default:
                        return 'bg-white border-gray-200 hover:shadow-md hover:border-gray-300'
                    }
                  }
                  
                  // Get text color adjustments for better contrast
                  const getTextStyling = (status: string) => {
                    switch (status) {
                      case 'failed':
                        return 'text-red-900' // Darker red text for better contrast on red background
                      case 'passed':
                        return 'text-green-900' // Darker green text for better contrast on green background
                      default:
                        return 'text-gray-900' // Default text color
                    }
                  }
                  
                  return (
                    <div key={sample.id} className={`rounded-lg p-4 transition-all ${getCardStyling(sample.status)}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <input
                              type="checkbox"
                              checked={bulkSelected.includes(sample.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setBulkSelected(prev => [...prev, sample.id])
                                } else {
                                  setBulkSelected(prev => prev.filter(id => id !== sample.id))
                                }
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <h5 className={`font-semibold ${getTextStyling(sample.status)}`}>{sample.productName}</h5>
                            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(sample.status)}`}>
                              <StatusIcon className="h-3 w-3" />
                              {sample.status.charAt(0).toUpperCase() + sample.status.slice(1)}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span>{sample.supplier.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>Requested: {new Date(sample.requestDate).toLocaleDateString()}</span>
                            </div>
                          </div>
                          
                          {/* Tags */}
                          <div className="flex flex-wrap gap-1 mb-3">
                            {sample.tags.map((tag, index) => (
                              <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                {tag}
                              </span>
                            ))}
                          </div>
                          
                          {/* Cost & Tracking */}
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-gray-600">Cost: <span className={`font-medium ${getTextStyling(sample.status)}`}>${sample.cost.totalCost.toFixed(2)}</span></span>
                            {sample.trackingNumber && (
                              <span className="text-gray-600">Tracking: <span className="font-medium text-blue-600">{sample.trackingNumber}</span></span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {sample.evaluation && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                              <Star className="h-3 w-3" />
                              {sample.evaluation.overall}/5
                            </div>
                          )}
                          
                          {/* Stage Navigation Arrows */}
                          <div className="flex items-center gap-1">
                            {getPreviousStage(sample.status) && (
                              <button 
                                onClick={() => moveSampleToStage(sample.id, getPreviousStage(sample.status)!)}
                                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                title={`Move to ${getPreviousStage(sample.status)}`}
                              >
                                <ArrowLeft className="h-4 w-4" />
                              </button>
                            )}
                            {/* Only show right arrow if NOT in received stage (since evaluation is required first) */}
                            {getNextStage(sample.status) && sample.status !== 'received' && (
                              <button 
                                onClick={() => moveSampleToStage(sample.id, getNextStage(sample.status)!)}
                                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                title={`Move to ${getNextStage(sample.status)}`}
                              >
                                <ArrowRight className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          
                          {sample.status === 'received' && (
                            <button 
                              onClick={() => {
                                setSelectedSampleForEvaluation(sample)
                                // Reset evaluation form
                                setEvaluation({
                                  buildQuality: 0,
                                  packagingQuality: 0,
                                  designQuality: 0,
                                  supplierCommunication: 0,
                                  itemDimensions: { width: '', height: '', depth: '', weight: '' },
                                  packageDimensions: { width: '', height: '', depth: '', weight: '' },
                                  notes: ''
                                })
                              }}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded hover:bg-gray-800 transition-colors"
                            >
                              <Star className="h-3 w-3 mr-1" />
                              Evaluate
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {/* Progress Bar for Status */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                          <span>Progress</span>
                          <span>{getProgressStage(sample.status)}/3</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className="bg-blue-600 h-1.5 rounded-full transition-all" 
                            style={{ width: `${(getProgressStage(sample.status) / 3) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )
                }))
                }
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Sample Modal */}
      {showAddSampleModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Add Sample</h3>
                <button 
                  onClick={() => setShowAddSampleModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <form className="space-y-4" onSubmit={async (e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                await createSampleRequest(formData)
              }}>
                {/* Supplier Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supplier
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowSupplierDropdown(!showSupplierDropdown)}
                      disabled={suppliersLoading || availableSuppliers.length === 0}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-gray-300 focus:border-gray-900 focus:ring-4 focus:ring-gray-100 focus:outline-none transition-all duration-200 text-left disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50"
                    >
                      <div className="flex items-center justify-between">
                        <span className={selectedSupplier ? "text-gray-900 text-sm font-medium" : "text-gray-500 text-sm"}>
                          {suppliersLoading 
                            ? 'Loading suppliers...' 
                            : availableSuppliers.length === 0 
                              ? 'No suppliers in current project'
                              : selectedSupplier 
                                ? selectedSupplier.name
                                : 'Choose supplier...'
                          }
                        </span>
                        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${showSupplierDropdown ? 'rotate-180' : ''}`} />
                      </div>
                    </button>
                    
                    {/* Custom Dropdown */}
                    {showSupplierDropdown && availableSuppliers.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                        {availableSuppliers.map((supplier) => (
                          <button
                            key={supplier.id}
                            type="button"
                            onClick={() => {
                              setSelectedSupplier(supplier)
                              setShowSupplierDropdown(false)
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 focus:bg-gray-50 focus:outline-none"
                          >
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-gray-900">{supplier.name}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Product Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Name
                  </label>
                  <input
                    type="text"
                    name="productName"
                    placeholder="e.g., Bluetooth Speaker BT-300"
                    required
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-gray-300 focus:border-gray-900 focus:ring-4 focus:ring-gray-100 focus:outline-none transition-all duration-200 text-gray-900 text-sm placeholder:text-gray-500"
                  />
                </div>

                {/* Sample Cost */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sample Cost (incl. shipping)
                  </label>
                  <input
                    type="number"
                    name="sampleCost"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-gray-300 focus:border-gray-900 focus:ring-4 focus:ring-gray-100 focus:outline-none transition-all duration-200 text-gray-900 text-sm placeholder:text-gray-500"
                  />
                </div>

                {/* Date Shipped */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date Shipped
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowDatePicker(!showDatePicker)}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-gray-300 focus:border-gray-900 focus:ring-4 focus:ring-gray-100 focus:outline-none transition-all duration-200 text-left"
                    >
                      <div className="flex items-center justify-between">
                        <span className={selectedShippedDate ? "text-gray-900 text-sm font-medium" : "text-gray-500 text-sm"}>
                          {selectedShippedDate ? formatDateForDisplay(selectedShippedDate) : 'Select shipping date'}
                        </span>
                        <CalendarDays className="h-4 w-4 text-gray-400" />
                      </div>
                    </button>
                    
                    {/* Calendar View */}
                    {showDatePicker && (
                      <div className="absolute z-50 w-64 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                        {/* Calendar Header */}
                        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
                          <button
                            type="button"
                            onClick={goToPreviousMonth}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                          >
                            <ChevronLeft className="h-3 w-3 text-gray-600" />
                          </button>
                          <h3 className="text-xs font-semibold text-gray-900">
                            {formatMonthYear(currentMonth)}
                          </h3>
                          <button
                            type="button"
                            onClick={goToNextMonth}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                          >
                            <ChevronRight className="h-3 w-3 text-gray-600" />
                          </button>
                        </div>
                        
                        {/* Calendar Grid */}
                        <div className="p-3">
                          {/* Day Headers */}
                          <div className="grid grid-cols-7 gap-1 mb-1">
                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                              <div key={`day-header-${index}`} className="text-center text-xs font-medium text-gray-500 py-1">
                                {day}
                              </div>
                            ))}
                          </div>
                          
                          {/* Calendar Days */}
                          <div className="grid grid-cols-7 gap-1">
                            {getDaysInMonth(currentMonth).map((date, index) => (
                              <div key={index} className="aspect-square">
                                {date ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedShippedDate(date.toISOString().split('T')[0])
                                      setShowDatePicker(false)
                                    }}
                                    className={`w-full h-full flex items-center justify-center text-xs rounded transition-colors ${
                                      selectedShippedDate && isSameDay(date, new Date(selectedShippedDate))
                                        ? 'bg-gray-900 text-white font-medium'
                                        : isToday(date)
                                        ? 'bg-blue-100 text-blue-700 font-medium'
                                        : 'hover:bg-gray-100 text-gray-700'
                                    }`}
                                  >
                                    {date.getDate()}
                                  </button>
                                ) : (
                                  <div></div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {/* Today Button */}
                        <div className="border-t border-gray-100 p-2">
                          <button
                            type="button"
                            onClick={() => {
                              const today = new Date()
                              setSelectedShippedDate(today.toISOString().split('T')[0])
                              setShowDatePicker(false)
                            }}
                            className="w-full px-2 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded transition-colors"
                          >
                            Today
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tracking Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tracking Number (Optional)
                  </label>
                  <input
                    type="text"
                    name="trackingNumber"
                    placeholder="e.g., 1234567890"
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-gray-300 focus:border-gray-900 focus:ring-4 focus:ring-gray-100 focus:outline-none transition-all duration-200 text-gray-900 text-sm placeholder:text-gray-500"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSupplier(null)
                      setShowSupplierDropdown(false)
                      setSelectedShippedDate('')
                      setShowDatePicker(false)
                      setShowAddSampleModal(false)
                    }}
                    className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedSupplier || isCreatingSample}
                    className="flex-1 px-4 py-3 text-sm font-medium text-white bg-gray-900 rounded-xl hover:bg-gray-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreatingSample ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Creating...
                      </div>
                    ) : (
                      'Add Sample'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Samples</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone</p>
                </div>
              </div>
              
              <p className="text-gray-700 mb-6">
                Are you sure you want to delete <span className="font-semibold">{bulkSelected.length} sample{bulkSelected.length > 1 ? 's' : ''}</span>? 
                This will permanently remove {bulkSelected.length > 1 ? 'them' : 'it'} from your sample tracker.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirmModal(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteSamples}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sample Evaluation Modal */}
      {selectedSampleForEvaluation && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Star className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Evaluate Sample</h3>
                    <p className="text-sm text-gray-500">{selectedSampleForEvaluation.productName}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedSampleForEvaluation(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Quality Assessment Section */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-600" />
                  Quality Assessment
                </h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-1">
                  <StarRating
                    label="Build Quality"
                    rating={evaluation.buildQuality}
                    onRatingChange={(rating) => setEvaluation(prev => ({ ...prev, buildQuality: rating }))}
                  />
                  <StarRating
                    label="Packaging Quality"
                    rating={evaluation.packagingQuality}
                    onRatingChange={(rating) => setEvaluation(prev => ({ ...prev, packagingQuality: rating }))}
                  />
                  <StarRating
                    label="Design Quality"
                    rating={evaluation.designQuality}
                    onRatingChange={(rating) => setEvaluation(prev => ({ ...prev, designQuality: rating }))}
                  />
                  <StarRating
                    label="Supplier Communication"
                    rating={evaluation.supplierCommunication}
                    onRatingChange={(rating) => setEvaluation(prev => ({ ...prev, supplierCommunication: rating }))}
                  />
                </div>
              </div>

              {/* Physical Specifications Section */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Package className="h-4 w-4 text-gray-600" />
                  Physical Specifications (Optional)
                </h4>
                
                {/* Item Dimensions */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Item Dimensions & Weight</label>
                  <div className="grid grid-cols-4 gap-3">
                    <input
                      type="number"
                      placeholder="Width (cm)"
                      value={evaluation.itemDimensions.width}
                      onChange={(e) => setEvaluation(prev => ({
                        ...prev,
                        itemDimensions: { ...prev.itemDimensions, width: e.target.value }
                      }))}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-gray-900 focus:ring-4 focus:ring-gray-100 focus:outline-none transition-all"
                    />
                    <input
                      type="number"
                      placeholder="Height (cm)"
                      value={evaluation.itemDimensions.height}
                      onChange={(e) => setEvaluation(prev => ({
                        ...prev,
                        itemDimensions: { ...prev.itemDimensions, height: e.target.value }
                      }))}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-gray-900 focus:ring-4 focus:ring-gray-100 focus:outline-none transition-all"
                    />
                    <input
                      type="number"
                      placeholder="Depth (cm)"
                      value={evaluation.itemDimensions.depth}
                      onChange={(e) => setEvaluation(prev => ({
                        ...prev,
                        itemDimensions: { ...prev.itemDimensions, depth: e.target.value }
                      }))}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-gray-900 focus:ring-4 focus:ring-gray-100 focus:outline-none transition-all"
                    />
                    <input
                      type="number"
                      placeholder="Weight (kg)"
                      value={evaluation.itemDimensions.weight}
                      onChange={(e) => setEvaluation(prev => ({
                        ...prev,
                        itemDimensions: { ...prev.itemDimensions, weight: e.target.value }
                      }))}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-gray-900 focus:ring-4 focus:ring-gray-100 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Package Dimensions */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Package Dimensions & Weight</label>
                  <div className="grid grid-cols-4 gap-3">
                    <input
                      type="number"
                      placeholder="Width (cm)"
                      value={evaluation.packageDimensions.width}
                      onChange={(e) => setEvaluation(prev => ({
                        ...prev,
                        packageDimensions: { ...prev.packageDimensions, width: e.target.value }
                      }))}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-gray-900 focus:ring-4 focus:ring-gray-100 focus:outline-none transition-all"
                    />
                    <input
                      type="number"
                      placeholder="Height (cm)"
                      value={evaluation.packageDimensions.height}
                      onChange={(e) => setEvaluation(prev => ({
                        ...prev,
                        packageDimensions: { ...prev.packageDimensions, height: e.target.value }
                      }))}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-gray-900 focus:ring-4 focus:ring-gray-100 focus:outline-none transition-all"
                    />
                    <input
                      type="number"
                      placeholder="Depth (cm)"
                      value={evaluation.packageDimensions.depth}
                      onChange={(e) => setEvaluation(prev => ({
                        ...prev,
                        packageDimensions: { ...prev.packageDimensions, depth: e.target.value }
                      }))}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-gray-900 focus:ring-4 focus:ring-gray-100 focus:outline-none transition-all"
                    />
                    <input
                      type="number"
                      placeholder="Weight (kg)"
                      value={evaluation.packageDimensions.weight}
                      onChange={(e) => setEvaluation(prev => ({
                        ...prev,
                        packageDimensions: { ...prev.packageDimensions, weight: e.target.value }
                      }))}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-gray-900 focus:ring-4 focus:ring-gray-100 focus:outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Notes Section */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                <textarea
                  placeholder="Additional comments about the sample..."
                  value={evaluation.notes}
                  onChange={(e) => setEvaluation(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-gray-900 focus:ring-4 focus:ring-gray-100 focus:outline-none transition-all resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleEvaluationSubmit('failed')}
                  className="flex-1 px-4 py-3 text-sm font-medium text-red-700 bg-white border border-red-200 rounded-xl hover:bg-red-50 hover:border-red-300 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Mark as Failed
                </button>
                <button
                  onClick={() => handleEvaluationSubmit('passed')}
                  className="flex-1 px-4 py-3 text-sm font-medium text-white bg-gray-900 rounded-xl hover:bg-gray-800 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Mark as Passed
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}