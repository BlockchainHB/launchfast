'use client'

import React, { useState, useRef } from 'react'
import { Users, Plus, Search, Filter, MoreHorizontal, GripVertical, Tag, Clock, MessageCircle, Star, Award, Shield, Calendar, ChevronRight, X, Edit3, Eye } from 'lucide-react'
import type { SupplierSearchResult } from '@/types/supplier'

interface SupplierManagerTabProps {
  data: SupplierSearchResult | null
}

interface SupplierCard {
  id: string
  companyName: string
  location: { city: string; country: string }
  qualityScore: number
  yearsInBusiness: number
  trust: { goldSupplier: boolean; tradeAssurance: boolean }
  stage: string
  lastContact: string
  nextAction: string
  tags: string[]
  notes: string
  relationshipHealth: 'excellent' | 'good' | 'fair' | 'poor'
}

const mockSuppliers: SupplierCard[] = [
  {
    id: '1',
    companyName: 'TechPro Manufacturing Ltd.',
    location: { city: 'Shenzhen', country: 'China' },
    qualityScore: 92,
    yearsInBusiness: 8,
    trust: { goldSupplier: true, tradeAssurance: true },
    stage: 'prospects',
    lastContact: '2024-01-20',
    nextAction: 'Send initial inquiry',
    tags: ['bluetooth', 'high-quality'],
    notes: 'Excellent reviews, fast response time',
    relationshipHealth: 'excellent'
  },
  {
    id: '2',
    companyName: 'Quality Electronics Co.',
    location: { city: 'Guangzhou', country: 'China' },
    qualityScore: 85,
    yearsInBusiness: 12,
    trust: { goldSupplier: false, tradeAssurance: true },
    stage: 'contacted',
    lastContact: '2024-01-18',
    nextAction: 'Follow up on quote',
    tags: ['electronics', 'reliable'],
    notes: 'Responded within 24 hours, competitive pricing',
    relationshipHealth: 'good'
  },
  {
    id: '3',
    companyName: 'Innovation Factory',
    location: { city: 'Dongguan', country: 'China' },
    qualityScore: 78,
    yearsInBusiness: 6,
    trust: { goldSupplier: true, tradeAssurance: false },
    stage: 'sampling',
    lastContact: '2024-01-15',
    nextAction: 'Evaluate samples',
    tags: ['samples-sent', 'innovative'],
    notes: 'Samples received, quality testing in progress',
    relationshipHealth: 'good'
  },
  {
    id: '4',
    companyName: 'Premium Components Ltd.',
    location: { city: 'Hangzhou', country: 'China' },
    qualityScore: 88,
    yearsInBusiness: 15,
    trust: { goldSupplier: true, tradeAssurance: true },
    stage: 'negotiating',
    lastContact: '2024-01-22',
    nextAction: 'Finalize MOQ terms',
    tags: ['premium', 'negotiating-moq'],
    notes: 'Great samples, negotiating final terms',
    relationshipHealth: 'excellent'
  },
  {
    id: '5', 
    companyName: 'Reliable Manufacturing Co.',
    location: { city: 'Foshan', country: 'China' },
    qualityScore: 94,
    yearsInBusiness: 10,
    trust: { goldSupplier: true, tradeAssurance: true },
    stage: 'partners',
    lastContact: '2024-01-19',
    nextAction: 'Schedule monthly review',
    tags: ['established-partner', 'top-performer'],
    notes: 'Excellent ongoing partnership, consistent quality',
    relationshipHealth: 'excellent'
  }
]

export function SupplierManagerTab({ data }: SupplierManagerTabProps) {
  const [suppliers, setSuppliers] = useState<SupplierCard[]>(mockSuppliers)
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierCard | null>(null)
  const [draggedSupplier, setDraggedSupplier] = useState<SupplierCard | null>(null)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [bulkSelected, setBulkSelected] = useState<string[]>([])
  
  // Calculate pipeline stages with actual counts
  const pipelineStages = [
    { id: 'prospects', name: 'Prospects', color: 'bg-blue-100 text-blue-700', icon: Users },
    { id: 'contacted', name: 'Contacted', color: 'bg-yellow-100 text-yellow-700', icon: MessageCircle },
    { id: 'sampling', name: 'Sampling', color: 'bg-purple-100 text-purple-700', icon: Star },
    { id: 'negotiating', name: 'Negotiating', color: 'bg-orange-100 text-orange-700', icon: Edit3 },
    { id: 'partners', name: 'Partners', color: 'bg-green-100 text-green-700', icon: Award }
  ].map(stage => ({
    ...stage,
    count: suppliers.filter(s => s.stage === stage.id).length
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
  
  const handleDrop = (e: React.DragEvent, newStage: string) => {
    e.preventDefault()
    if (draggedSupplier && draggedSupplier.stage !== newStage) {
      setSuppliers(prev => prev.map(s => 
        s.id === draggedSupplier.id 
          ? { ...s, stage: newStage, lastContact: new Date().toISOString().split('T')[0] }
          : s
      ))
    }
    setDraggedSupplier(null)
    setDragOverStage(null)
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-gray-900">Supplier Pipeline</h3>
          <p className="text-sm text-gray-500">
            Manage relationships across {pipelineStages.reduce((sum, stage) => sum + stage.count, 0)} suppliers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search suppliers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>
          <button className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </button>
          {bulkSelected.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-sm text-blue-700">{bulkSelected.length} selected</span>
              <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">Move</button>
              <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">Tag</button>
            </div>
          )}
          <button className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors">
            <Plus className="h-4 w-4 mr-2" />
            Add Supplier
          </button>
        </div>
      </div>

      {/* Pipeline Stats */}
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

      {/* Interactive Kanban Board */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {pipelineStages.map((stage) => {
              const stageSuppliers = filteredSuppliers.filter(s => s.stage === stage.id)
              const Icon = stage.icon
              
              return (
                <div 
                  key={stage.id} 
                  className={`space-y-3 min-h-[400px] p-4 rounded-lg transition-colors ${dragOverStage === stage.id ? 'bg-blue-50 border-2 border-blue-300 border-dashed' : 'bg-gray-50'}`}
                  onDragOver={(e) => handleDragOver(e, stage.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, stage.id)}
                >
                  <div className="flex items-center justify-between sticky top-0 bg-white p-2 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-gray-600" />
                      <h4 className="font-medium text-gray-900">{stage.name}</h4>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${stage.color}`}>
                      {stageSuppliers.length}
                    </span>
                  </div>
                  
                  {/* Supplier Cards */}
                  <div className="space-y-3">
                    {stageSuppliers.map((supplier) => (
                      <div 
                        key={supplier.id}
                        draggable
                        onDragStart={() => handleDragStart(supplier)}
                        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all cursor-move group"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2">
                              <GripVertical className="h-4 w-4 text-gray-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                              <div className="flex-1">
                                <h5 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1">
                                  {supplier.companyName}
                                </h5>
                                <p className="text-xs text-gray-500">
                                  {supplier.location.city}, {supplier.location.country}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
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
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <button 
                              onClick={() => setSelectedSupplier(supplier)}
                              className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        
                        {/* Quality Score & Trust Badges */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                              <Star className="h-3 w-3" />
                              {supplier.qualityScore}
                            </div>
                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${getRelationshipHealthColor(supplier.relationshipHealth)}`}>
                              {supplier.relationshipHealth}
                            </div>
                          </div>
                        </div>
                        
                        {/* Trust Credentials */}
                        <div className="flex flex-wrap gap-1 mb-3">
                          {supplier.trust.goldSupplier && (
                            <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                              Gold
                            </span>
                          )}
                          {supplier.trust.tradeAssurance && (
                            <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                              TA
                            </span>
                          )}
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
                        
                        {/* Next Action */}
                        <div className="text-xs text-gray-500 mb-2">
                          <span className="font-medium">Next:</span> {supplier.nextAction}
                        </div>
                        
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
                    
                    {/* Add Supplier to Stage */}
                    <button className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors">
                      <Plus className="h-4 w-4 mx-auto mb-1" />
                      <div className="text-xs">Add Supplier</div>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Pipeline Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Conversion Metrics */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <h4 className="font-medium text-gray-900 mb-4">Pipeline Performance</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Prospects → Contacted</span>
              <span className="text-sm font-semibold text-green-600">75%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Contacted → Sampling</span>
              <span className="text-sm font-semibold text-blue-600">62%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Sampling → Partners</span>
              <span className="text-sm font-semibold text-purple-600">40%</span>
            </div>
          </div>
        </div>
        
        {/* Recent Activity */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <h4 className="font-medium text-gray-900 mb-4">Recent Activity</h4>
          <div className="space-y-3">
            {[
              { action: 'Moved to Negotiating', supplier: 'TechPro Manufacturing', time: '2 hours ago', type: 'move' },
              { action: 'Added note', supplier: 'Quality Electronics', time: '4 hours ago', type: 'note' },
              { action: 'Tagged as high-priority', supplier: 'Innovation Factory', time: '1 day ago', type: 'tag' },
              { action: 'Moved to Partners', supplier: 'Reliable Manufacturing', time: '2 days ago', type: 'move' }
            ].map((activity, index) => (
              <div key={index} className="flex items-start gap-3 py-2">
                <div className={`w-2 h-2 rounded-full mt-2 ${activity.type === 'move' ? 'bg-blue-500' : activity.type === 'note' ? 'bg-green-500' : 'bg-purple-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{activity.action}</p>
                  <p className="text-xs text-gray-500">{activity.supplier}</p>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <h4 className="font-medium text-gray-900 mb-4">Quick Actions</h4>
          <div className="space-y-2">
            <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
              📧 Send bulk follow-up emails
            </button>
            <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
              📊 Export pipeline report
            </button>
            <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
              🏷️ Bulk tag management
            </button>
            <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
              ⏰ Set follow-up reminders
            </button>
          </div>
        </div>
      </div>
      
      {/* Supplier Detail Modal */}
      {selectedSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <h3 className="text-2xl font-semibold text-gray-900 mb-2">{selectedSupplier.companyName}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{selectedSupplier.location.city}, {selectedSupplier.location.country}</span>
                    <span>{selectedSupplier.yearsInBusiness} years in business</span>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getRelationshipHealthColor(selectedSupplier.relationshipHealth)}`}>
                      {selectedSupplier.relationshipHealth} relationship
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedSupplier(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Quality & Trust */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Quality & Trust</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Star className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-gray-900">Quality Score: {selectedSupplier.qualityScore}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {selectedSupplier.trust.goldSupplier && (
                            <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                              <Award className="h-3 w-3 mr-1" />
                              Gold Supplier
                            </span>
                          )}
                          {selectedSupplier.trust.tradeAssurance && (
                            <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                              <Shield className="h-3 w-3 mr-1" />
                              Trade Assurance
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Notes */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-700">{selectedSupplier.notes}</p>
                    </div>
                  </div>
                  
                  {/* Tags */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedSupplier.tags.map((tag, index) => (
                        <span key={index} className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Actions & Timeline */}
                <div className="space-y-4">
                  {/* Actions */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Actions</h4>
                    <div className="space-y-2">
                      <button className="w-full px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors">
                        Send Message
                      </button>
                      <button className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                        Request Sample
                      </button>
                      <button className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                        Add Note
                      </button>
                    </div>
                  </div>
                  
                  {/* Timeline */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Recent Activity</h4>
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <Calendar className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">Last Contact</div>
                          <div className="text-xs text-gray-500">{new Date(selectedSupplier.lastContact).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <ChevronRight className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">Next Action</div>
                          <div className="text-xs text-gray-500">{selectedSupplier.nextAction}</div>
                        </div>
                      </div>
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