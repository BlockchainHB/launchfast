'use client'

import React from 'react'
import { MessageCircle, Plus, Edit, Send, Clock, FileText, Zap } from 'lucide-react'  
import type { SupplierSearchResult } from '@/types/supplier'

interface CommunicationHubTabProps {
  data: SupplierSearchResult | null
}

export function CommunicationHubTab({ data }: CommunicationHubTabProps) {
  // Mock template data - in real implementation, this would come from the templates API
  const templateCategories = [
    {
      name: 'Introduction',
      count: 5,
      templates: [
        { name: 'Initial Inquiry', used: 24, lastUsed: '2 days ago' },
        { name: 'Company Introduction', used: 18, lastUsed: '1 week ago' },
        { name: 'Product Interest', used: 12, lastUsed: '3 days ago' }
      ]
    },
    {
      name: 'Sample Requests',
      count: 4,
      templates: [
        { name: 'Sample Request', used: 32, lastUsed: '1 day ago' },
        { name: 'Sample Follow-up', used: 15, lastUsed: '5 days ago' },
        { name: 'Sample Feedback', used: 8, lastUsed: '1 week ago' }
      ]
    },
    {
      name: 'Negotiation',
      count: 6,
      templates: [
        { name: 'MOQ Negotiation', used: 19, lastUsed: '3 days ago' },
        { name: 'Price Discussion', used: 22, lastUsed: '2 days ago' },
        { name: 'Terms & Conditions', used: 11, lastUsed: '1 week ago' }
      ]
    }
  ]

  const recentCommunications = [
    {
      supplier: 'TechPro Manufacturing',
      subject: 'Sample Request - Bluetooth Speaker',
      type: 'email_sent',
      time: '2 hours ago',
      status: 'sent'
    },
    {
      supplier: 'Quality Electronics Ltd.',
      subject: 'MOQ Negotiation Follow-up',
      type: 'email_received',
      time: '1 day ago',
      status: 'replied'
    },
    {
      supplier: 'Innovation Factory',
      subject: 'Initial Product Inquiry',
      type: 'email_sent',
      time: '2 days ago',
      status: 'read'
    },
    {
      supplier: 'Reliable Components Co.',
      subject: 'Sample Evaluation Feedback',
      type: 'email_sent',
      time: '3 days ago',
      status: 'sent'
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-blue-100 text-blue-700'
      case 'replied': return 'bg-green-100 text-green-700'
      case 'read': return 'bg-yellow-100 text-yellow-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getTypeIcon = (type: string) => {
    return type === 'email_received' ? '←' : '→'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-gray-900">Communication Hub</h3>
          <p className="text-sm text-gray-500">
            Manage templates and track communications with suppliers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            <Edit className="h-4 w-4 mr-2" />
            Edit Template
          </button>
          <button className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800">
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">15</div>
            <div className="text-xs text-gray-500 mt-1">Total Templates</div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">143</div>
            <div className="text-xs text-gray-500 mt-1">Times Used</div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">89%</div>
            <div className="text-xs text-gray-500 mt-1">Response Rate</div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">2.3h</div>
            <div className="text-xs text-gray-500 mt-1">Avg Response Time</div>
          </div>
        </div>
      </div>

      {/* Template Library */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900">Template Library</h4>
            <FileText className="h-5 w-5 text-gray-400" />
          </div>
          
          <div className="space-y-6">
            {templateCategories.map((category, index) => (
              <div key={index} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-medium text-gray-900">{category.name}</h5>
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                    {category.count} templates
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {category.templates.map((template, templateIndex) => (
                    <div key={templateIndex} className="border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow cursor-pointer">
                      <div className="flex items-start justify-between mb-2">
                        <h6 className="text-sm font-medium text-gray-900">{template.name}</h6>
                        <button className="text-gray-400 hover:text-gray-600">
                          <Edit className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Used {template.used} times</span>
                        <span>{template.lastUsed}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Communications */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900">Recent Communications</h4>
            <MessageCircle className="h-5 w-5 text-gray-400" />
          </div>
          
          <div className="space-y-3">
            {recentCommunications.map((comm, index) => (
              <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full text-sm font-medium">
                    {getTypeIcon(comm.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h6 className="text-sm font-medium text-gray-900 truncate">{comm.supplier}</h6>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(comm.status)}`}>
                        {comm.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{comm.subject}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Clock className="h-3 w-3" />
                  <span>{comm.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center hover:shadow-sm transition-shadow cursor-pointer">
          <Send className="h-8 w-8 text-blue-600 mx-auto mb-2" />
          <h5 className="font-medium text-gray-900 mb-1">Compose Email</h5>
          <p className="text-xs text-gray-500">Send custom message to suppliers</p>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center hover:shadow-sm transition-shadow cursor-pointer">
          <Zap className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
          <h5 className="font-medium text-gray-900 mb-1">Quick Templates</h5>
          <p className="text-xs text-gray-500">Access most used email templates</p>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center hover:shadow-sm transition-shadow cursor-pointer">
          <FileText className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <h5 className="font-medium text-gray-900 mb-1">Template Analytics</h5>
          <p className="text-xs text-gray-500">View performance and response rates</p>
        </div>
      </div>

      {/* Communication Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <MessageCircle className="h-6 w-6 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-2">Communication Best Practices</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Always be professional and respectful in your communications</li>
              <li>• Include specific product details and quantities in your inquiries</li>
              <li>• Follow up on sample requests within 3-5 business days</li>
              <li>• Use templates to maintain consistency across communications</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}