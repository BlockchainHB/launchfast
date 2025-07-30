'use client'

import React, { useState } from 'react'
import { Package, Plus, Clock, CheckCircle, Truck, Star, DollarSign, Calendar, MapPin, Upload, Edit3, Eye, Camera, FileText, TrendingUp, AlertCircle, Target, X } from 'lucide-react'
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
  status: 'planning' | 'requested' | 'shipped' | 'received' | 'evaluated'
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

const mockSamples: Sample[] = [
  {
    id: '1',
    productName: 'Bluetooth Speaker BT-300',
    supplier: { name: 'TechPro Manufacturing', location: 'Shenzhen, CN' },
    status: 'shipped',
    requestDate: '2024-01-15',
    expectedDelivery: '2024-01-25',
    cost: { sampleCost: 35.00, shippingCost: 15.00, totalCost: 50.00 },
    trackingNumber: 'SF1234567890',
    tags: ['bluetooth', 'high-priority'],
    potentialOrderValue: 25000
  },
  {
    id: '2', 
    productName: 'Wireless Earbuds WE-400',
    supplier: { name: 'Audio Solutions Ltd.', location: 'Guangzhou, CN' },
    status: 'evaluated',
    requestDate: '2024-01-12',
    actualDelivery: '2024-01-22',
    cost: { sampleCost: 65.00, shippingCost: 20.00, totalCost: 85.00 },
    evaluation: {
      quality: 4,
      design: 5,
      materials: 4,
      overall: 4,
      passed: true,
      notes: 'Excellent sound quality, minor packaging improvements needed',
      photos: ['photo1.jpg', 'photo2.jpg']
    },
    tags: ['earbuds', 'approved'],
    potentialOrderValue: 40000
  },
  {
    id: '3',
    productName: 'Phone Case Premium',
    supplier: { name: 'Quality Accessories Co.', location: 'Dongguan, CN' },
    status: 'received',
    requestDate: '2024-01-18',
    actualDelivery: '2024-01-28',
    cost: { sampleCost: 15.00, shippingCost: 10.00, totalCost: 25.00 },
    tags: ['phone-case', 'testing'],
    potentialOrderValue: 15000
  },
  {
    id: '4',
    productName: 'Power Bank 10000mAh',
    supplier: { name: 'Innovation Electronics', location: 'Hangzhou, CN' },
    status: 'requested',
    requestDate: '2024-01-20',
    expectedDelivery: '2024-01-30',
    cost: { sampleCost: 45.00, shippingCost: 18.00, totalCost: 63.00 },
    tags: ['power-bank', 'new-supplier'],
    potentialOrderValue: 30000
  },
  {
    id: '5',
    productName: 'Smart Watch Basic',
    supplier: { name: 'Wearable Tech Ltd.', location: 'Foshan, CN' },
    status: 'planning',
    requestDate: '2024-01-22',
    cost: { sampleCost: 80.00, shippingCost: 25.00, totalCost: 105.00 },
    tags: ['smartwatch', 'research-phase'],
    potentialOrderValue: 50000
  }
]

export function SampleTrackerTab({ data }: SampleTrackerTabProps) {
  const [samples, setSamples] = useState<Sample[]>(mockSamples)
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null)
  const [showEvaluationModal, setShowEvaluationModal] = useState(false)
  const [bulkSelected, setBulkSelected] = useState<string[]>([])
  const [filterStatus, setFilterStatus] = useState<string>('all')
  
  // Calculate sample statistics
  const sampleStats = {
    total: samples.length,
    planning: samples.filter(s => s.status === 'planning').length,
    requested: samples.filter(s => s.status === 'requested').length,
    shipped: samples.filter(s => s.status === 'shipped').length,
    received: samples.filter(s => s.status === 'received').length,
    evaluated: samples.filter(s => s.status === 'evaluated').length,
    totalCost: samples.reduce((sum, s) => sum + s.cost.totalCost, 0),
    totalPotentialValue: samples.reduce((sum, s) => sum + (s.potentialOrderValue || 0), 0),
    approvalRate: samples.filter(s => s.evaluation?.passed).length / Math.max(samples.filter(s => s.status === 'evaluated').length, 1) * 100
  }

  const samplePipeline = [
    { id: 'planning', name: 'Planning', icon: Target, color: 'bg-gray-100 text-gray-700' },
    { id: 'requested', name: 'Requested', icon: Package, color: 'bg-blue-100 text-blue-700' },
    { id: 'shipped', name: 'Shipped', icon: Truck, color: 'bg-yellow-100 text-yellow-700' },
    { id: 'received', name: 'Received', icon: CheckCircle, color: 'bg-green-100 text-green-700' },
    { id: 'evaluated', name: 'Evaluated', icon: Star, color: 'bg-purple-100 text-purple-700' }
  ].map(stage => ({
    ...stage,
    count: samples.filter(s => s.status === stage.id).length
  }))
  
  const filteredSamples = filterStatus === 'all' 
    ? samples 
    : samples.filter(s => s.status === filterStatus)
    
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


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-gray-900">Sample Tracker</h3>
          <p className="text-sm text-gray-500">
            Track {sampleStats.total} samples • ${sampleStats.totalCost.toFixed(2)} invested • ${(sampleStats.totalPotentialValue/1000).toFixed(0)}k potential value
          </p>
        </div>
        <div className="flex items-center gap-2">
          {bulkSelected.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-sm text-blue-700">{bulkSelected.length} selected</span>
              <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">Update Status</button>
              <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">Export</button>
            </div>
          )}
          <button className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors">
            <Plus className="h-4 w-4 mr-2" />
            Request Sample
          </button>
        </div>
      </div>

      {/* Sample Pipeline Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {samplePipeline.map((stage) => {
          const Icon = stage.icon
          return (
            <div 
              key={stage.id} 
              className={`bg-white border border-gray-200 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                filterStatus === stage.id ? 'ring-2 ring-blue-500 border-blue-500' : ''
              }`}
              onClick={() => setFilterStatus(filterStatus === stage.id ? 'all' : stage.id)}
            >
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

      {/* Enhanced Analytics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Cost Overview */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900">Cost Analysis</h4>
            <DollarSign className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Investment</span>
              <span className="text-lg font-bold text-gray-900">${sampleStats.totalCost.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Avg per Sample</span>
              <span className="text-sm font-semibold text-gray-700">${(sampleStats.totalCost / sampleStats.total).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Potential ROI</span>
              <span className="text-sm font-semibold text-green-600">{((sampleStats.totalPotentialValue - sampleStats.totalCost) / sampleStats.totalCost * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>
        
        {/* Performance Metrics */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900">Performance</h4>
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Approval Rate</span>
              <span className="text-lg font-bold text-green-600">{sampleStats.approvalRate.toFixed(0)}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Avg Quality Score</span>
              <span className="text-sm font-semibold text-gray-700">4.2/5</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Active Requests</span>
              <span className="text-sm font-semibold text-blue-600">{sampleStats.requested + sampleStats.shipped}</span>
            </div>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900">Quick Actions</h4>
            <Package className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-2">
            <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
              📦 Bulk sample request
            </button>
            <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
              ⭐ Evaluate received samples
            </button>
            <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
              📊 Export cost report
            </button>
            <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
              🔔 Set delivery reminders
            </button>
          </div>
        </div>
      </div>

      {/* Sample Pipeline Board */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h4 className="font-medium text-gray-900">Sample Pipeline</h4>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  filterStatus === 'all' 
                    ? 'bg-gray-900 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All ({sampleStats.total})
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {filteredSamples.map((sample) => {
              const StatusIcon = getStatusIcon(sample.status)
              return (
                <div key={sample.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
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
                        <h5 className="font-semibold text-gray-900">{sample.productName}</h5>
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(sample.status)}`}>
                          <StatusIcon className="h-3 w-3" />
                          {sample.status.charAt(0).toUpperCase() + sample.status.slice(1)}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span>{sample.supplier.name} • {sample.supplier.location}</span>
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
                      
                      {/* Cost & Potential Value */}
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-600">Cost: <span className="font-medium text-gray-900">${sample.cost.totalCost.toFixed(2)}</span></span>
                        {sample.potentialOrderValue && (
                          <span className="text-gray-600">Potential: <span className="font-medium text-green-600">${(sample.potentialOrderValue/1000).toFixed(0)}k</span></span>
                        )}
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
                      <button 
                        onClick={() => setSelectedSample(sample)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {sample.status === 'received' && (
                        <button 
                          onClick={() => {
                            setSelectedSample(sample)
                            setShowEvaluationModal(true)
                          }}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors"
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
                      <span>{samplePipeline.findIndex(s => s.id === sample.status) + 1}/5</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div 
                        className="bg-blue-600 h-1.5 rounded-full transition-all" 
                        style={{ width: `${((samplePipeline.findIndex(s => s.id === sample.status) + 1) / 5) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Sample Detail Modal */}
      {selectedSample && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <h3 className="text-2xl font-semibold text-gray-900 mb-2">{selectedSample.productName}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{selectedSample.supplier.name}</span>
                    <span>{selectedSample.supplier.location}</span>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedSample.status)}`}>
                      {selectedSample.status.charAt(0).toUpperCase() + selectedSample.status.slice(1)}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedSample(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Cost Breakdown */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Cost Breakdown</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600">Sample Cost</div>
                        <div className="font-semibold text-gray-900">${selectedSample.cost.sampleCost.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Shipping</div>
                        <div className="font-semibold text-gray-900">${selectedSample.cost.shippingCost.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Total</div>
                        <div className="font-semibold text-green-600">${selectedSample.cost.totalCost.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Evaluation Results */}
                  {selectedSample.evaluation && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3">Evaluation Results</h4>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Quality</span>
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`h-3 w-3 ${i < selectedSample.evaluation!.quality ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                                />
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Design</span>
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`h-3 w-3 ${i < selectedSample.evaluation!.design ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Materials</span>
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`h-3 w-3 ${i < selectedSample.evaluation!.materials ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                                />
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Overall</span>
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`h-3 w-3 ${i < selectedSample.evaluation!.overall ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          selectedSample.evaluation.passed 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {selectedSample.evaluation.passed ? '✓ Approved' : '✗ Not Approved'}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium text-gray-900 mb-1">Notes</div>
                        <p className="text-sm text-gray-600">{selectedSample.evaluation.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Timeline & Actions */}
                <div className="space-y-4">
                  {/* Actions */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Actions</h4>
                    <div className="space-y-2">
                      {selectedSample.status === 'received' && (
                        <button 
                          onClick={() => setShowEvaluationModal(true)}
                          className="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Evaluate Sample
                        </button>
                      )}
                      <button className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                        Update Status
                      </button>
                      <button className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                        Add Notes
                      </button>
                    </div>
                  </div>
                  
                  {/* Timeline */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Timeline</h4>
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <Calendar className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">Request Date</div>
                          <div className="text-xs text-gray-500">{new Date(selectedSample.requestDate).toLocaleDateString()}</div>
                        </div>
                      </div>
                      {selectedSample.expectedDelivery && (
                        <div className="flex items-start gap-2">
                          <Truck className="h-4 w-4 text-gray-400 mt-0.5" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">Expected Delivery</div>
                            <div className="text-xs text-gray-500">{new Date(selectedSample.expectedDelivery).toLocaleDateString()}</div>
                          </div>
                        </div>
                      )}
                      {selectedSample.actualDelivery && (
                        <div className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">Delivered</div>
                            <div className="text-xs text-gray-500">{new Date(selectedSample.actualDelivery).toLocaleDateString()}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}