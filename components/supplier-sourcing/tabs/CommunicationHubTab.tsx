'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Edit, FileText, X, Copy, Check } from 'lucide-react'
import type { SupplierSearchResult } from '@/types/supplier'
import type { CommunicationTemplate, TemplateCategory } from '@/types/communication'

interface CommunicationHubTabProps {
  data: SupplierSearchResult | null
}

export function CommunicationHubTab({ data }: CommunicationHubTabProps) {
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<CommunicationTemplate | null>(null)
  const [copiedTemplateId, setCopiedTemplateId] = useState<string | null>(null)
  const [isCustomCategory, setIsCustomCategory] = useState(false)
  
  // Modal form state
  const [formData, setFormData] = useState({
    category: '',
    title: '',
    content: ''
  })

  // Predefined categories
  const predefinedCategories = [
    'Introduction',
    'Sample Requests', 
    'Negotiation',
    'Follow-up',
    'Quality Concerns',
    'Order Management',
    'Custom'
  ]

  // Load templates on component mount
  useEffect(() => {
    fetchTemplates()
  }, [])

  // Default templates for Amazon FBA sellers
  const defaultTemplates = [
    {
      category: 'Introduction',
      title: 'Initial Product Inquiry',
      content: `Dear [Supplier Name],

I hope this email finds you well. I am reaching out regarding your [Product Name] listings on Alibaba.

I'm an Amazon FBA seller based in the United States, and I'm interested in sourcing this product for the US market. Could you please provide the following information:

• Current pricing for quantities starting at 100 units
• Available colors/variations
• Lead time for production and shipping
• Minimum order quantity (MOQ)
• Product specifications and certifications (CE, FCC, etc.)
• Shipping options to Amazon warehouses in the US

I'm looking to build a long-term partnership with a reliable supplier who can maintain consistent quality and delivery times.

Please let me know if you need any additional information from my side.

Best regards,
[Your Name]
[Your Company]
[Your Contact Information]`
    },
    {
      category: 'Sample Requests',
      title: 'Sample Request with Shipping',
      content: `Dear [Supplier Name],

Thank you for your prompt response to my inquiry about [Product Name].

I would like to request samples to evaluate the quality before placing a larger order. Could you please send:

• 2-3 samples of [Product Name] in different colors/variations
• Product packaging as it would be shipped to customers
• Any product documentation or certificates

Shipping Details:
Name: [Your Name]
Company: [Your Company]
Address: [Your Address]
Phone: [Your Phone]

Please let me know:
• Sample cost and shipping fees
• Expected delivery time
• Payment method for samples (PayPal, Western Union, etc.)

I'm prepared to place an initial order of 100-300 units if the samples meet our quality standards.

Looking forward to your response.

Best regards,
[Your Name]`
    },
    {
      category: 'Negotiation',
      title: 'MOQ Negotiation (100 Units)',
      content: `Dear [Supplier Name],

Thank you for the quotation. The product quality looks excellent based on the samples.

I noticed your standard MOQ is [Current MOQ] units. As a new seller testing this product in the US market, I would like to start with a smaller initial order of 100 units to validate demand.

Would you be able to accommodate this smaller quantity? I understand there may be a slight price adjustment for lower volumes, and I'm open to discussing this.

If the product performs well, I plan to:
• Reorder every 2-3 months
• Gradually increase order quantities to 500+ units
• Potentially expand to additional product variations

This would be the beginning of a long-term business relationship. Could we work out terms for this initial 100-unit order?

I'm ready to proceed quickly once we agree on terms.

Best regards,
[Your Name]`
    },
    {
      category: 'Negotiation',
      title: 'Price Discussion',
      content: `Dear [Supplier Name],

Thank you for the detailed quotation for [Product Name].

I've reviewed your pricing and compared it with market rates. To make this work for both of us, I was hoping we could discuss the pricing a bit further.

Current quoted price: $[Current Price] per unit
My target price: $[Target Price] per unit

Factors that could help reach this target:
• I'm planning regular monthly orders of 200-500 units
• Long-term partnership (12+ months commitment)
• Flexible on payment terms (30% deposit, 70% before shipping)
• Simple packaging requirements

Would it be possible to meet somewhere in the middle? I'm confident this product will do well in our market, and I'd love to build a partnership that benefits both of us.

Please let me know your thoughts.

Best regards,
[Your Name]`
    },
    {
      category: 'Quality Concerns',
      title: 'Quality Standards Inquiry',
      content: `Dear [Supplier Name],

I'm very interested in your [Product Name] and would like to understand your quality control processes.

For Amazon FBA sales, quality consistency is crucial. Could you please provide information about:

Quality Control:
• What quality checks do you perform before shipping?
• Do you have quality certifications (ISO 9001, etc.)?
• What is your defect rate for this product?
• Do you provide quality guarantees?

Product Compliance:
• Does the product meet US safety standards?
• Are certifications included (CE, FCC, RoHS, etc.)?
• Can you provide test reports?

Packaging:
• How is the product packaged to prevent damage?
• Is the packaging Amazon FBA compliant?
• Can you add "Made in China" labels as required?

I want to ensure we maintain high customer satisfaction ratings on Amazon.

Thank you for your time.

Best regards,
[Your Name]`
    },
    {
      category: 'Order Management',
      title: 'Amazon Warehouse Shipping',
      content: `Dear [Supplier Name],

I'm ready to place my order for [Quantity] units of [Product Name].

Since I'm selling on Amazon FBA, the products need to be shipped directly to Amazon warehouses. Here are the specific requirements:

Shipping Requirements:
• Products must be individually poly-bagged (if required)
• Each unit needs a scannable barcode (I'll provide labels)
• Packaging must be Amazon FBA compliant
• Include commercial invoice for customs

Amazon Warehouse Address:
[I'll provide the specific FBA warehouse address after placing the order]

Timeline:
• When can production start?
• What's the estimated completion date?
• How long for shipping to US West Coast?

Payment:
• I can do 30% deposit via PayPal/Wire Transfer
• Remaining 70% before shipping
• Please provide your banking details

Please confirm receipt of this order and provide a proforma invoice.

Best regards,
[Your Name]`
    },
    {
      category: 'Follow-up',
      title: 'Follow-up After No Response',
      content: `Dear [Supplier Name],

I hope you're doing well. I sent an inquiry about your [Product Name] a few days ago but haven't heard back yet.

I understand you're probably busy with many inquiries, but I wanted to follow up as I'm genuinely interested in working with your company.

Quick recap of what I'm looking for:
• [Product Name] for Amazon FBA sales
• Initial order: 100-200 units
• Monthly reorders if product performs well
• Long-term business partnership

If you're currently too busy to take on new clients, I completely understand. Otherwise, I'd appreciate a quick response when you have a moment.

Thank you for your time.

Best regards,
[Your Name]
[Your Contact Information]`
    }
  ]

  // Seed database with default templates
  const seedDefaultTemplates = async () => {
    try {
      console.log('Seeding default templates...')
      const createdTemplates = []
      
      for (const template of defaultTemplates) {
        const response = await fetch('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(template)
        })
        
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data) {
            createdTemplates.push(result.data)
          }
        } else {
          console.error('Failed to create template:', template.title)
        }
      }
      
      // Update templates state directly to avoid infinite loop
      setTemplates(createdTemplates)
      console.log('Seeded', createdTemplates.length, 'default templates')
    } catch (error) {
      console.error('Failed to seed default templates:', error)
    }
  }

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      console.log('Fetching templates...')
      const response = await fetch('/api/templates')
      const result = await response.json()
      console.log('Fetch templates response:', result)
      
      if (response.ok && result.success) {
        const templateData = result.data || []
        setTemplates(templateData)
        
        // If no templates exist, seed with defaults
        if (templateData.length === 0) {
          await seedDefaultTemplates()
        }
      } else {
        console.error('Failed to fetch templates:', result.error)
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error)
    } finally {
      setLoading(false)
    }
  }

  // Format category names for display
  const formatCategoryName = (category: string) => {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  // Group templates by category
  const templateCategories: TemplateCategory[] = React.useMemo(() => {
    const categoryMap = new Map<string, CommunicationTemplate[]>()
    
    templates.forEach(template => {
      const displayCategory = formatCategoryName(template.category)
      if (!categoryMap.has(displayCategory)) {
        categoryMap.set(displayCategory, [])
      }
      categoryMap.get(displayCategory)!.push(template)
    })

    return Array.from(categoryMap.entries()).map(([name, templates]) => ({
      name,
      templates: templates.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    })).sort((a, b) => a.name.localeCompare(b.name))
  }, [templates])

  // Handle template click - copy to clipboard
  const handleTemplateClick = async (template: CommunicationTemplate) => {
    try {
      await navigator.clipboard.writeText(template.content)
      setCopiedTemplateId(template.id)
      setTimeout(() => setCopiedTemplateId(null), 2000)
    } catch (error) {
      console.error('Failed to copy template:', error)
    }
  }

  // Handle new template
  const handleNewTemplate = () => {
    setEditingTemplate(null)
    setFormData({ category: '', title: '', content: '' })
    setIsCustomCategory(false)
    setShowTemplateModal(true)
  }

  // Handle edit template
  const handleEditTemplate = (template: CommunicationTemplate) => {
    setEditingTemplate(template)
    setFormData({
      category: template.category,
      title: template.title,
      content: template.content
    })
    // Check if it's a custom category
    const displayCategory = formatCategoryName(template.category)
    setIsCustomCategory(!predefinedCategories.slice(0, -1).includes(displayCategory))
    setShowTemplateModal(true)
  }

  // Handle save template
  const handleSaveTemplate = async () => {
    if (!formData.category || !formData.title || !formData.content) {
      console.error('❌ Please fill in all fields')
      return
    }

    try {
      // Convert display category back to database format
      const dbCategory = formData.category.toLowerCase().replace(/\s+/g, '_')
      
      // Check if we're editing a default template (user_id is null)
      const isEditingDefaultTemplate = editingTemplate && !editingTemplate.user_id
      
      let url, method
      if (isEditingDefaultTemplate) {
        // Create a new personal copy of the default template
        url = '/api/templates'
        method = 'POST'
        console.log('Creating personal copy of default template')
      } else if (editingTemplate) {
        // Update existing user template
        url = `/api/templates/${editingTemplate.id}`
        method = 'PATCH'
        console.log('Updating existing user template')
      } else {
        // Create new template
        url = '/api/templates'
        method = 'POST'
        console.log('Creating new template')
      }
      
      const requestData = {
        category: dbCategory,
        title: formData.title,
        content: formData.content
      }
      
      console.log('Saving template:', { method, url, requestData })
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })

      const result = await response.json()
      console.log('Save response:', result)

      if (response.ok && result.success) {
        await fetchTemplates() // Refresh templates
        setShowTemplateModal(false)
        setFormData({ category: '', title: '', content: '' })
        setEditingTemplate(null)
        setIsCustomCategory(false)
        
        if (isEditingDefaultTemplate) {
          // Use Sonner toast instead of alert
          console.log('✅ Template saved to personal library')
        } else {
          console.log(editingTemplate ? '✅ Template updated successfully' : '✅ Template created successfully')
        }
      } else {
        console.error('❌ Failed to save template:', result.error || 'Unknown error')
      }
    } catch (error) {
      console.error('❌ Failed to save template:', error)
    }
  }

  // Handle delete template
  const handleDeleteTemplate = async (template: CommunicationTemplate) => {
    if (!confirm(`Are you sure you want to delete "${template.title}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/templates/${template.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchTemplates() // Refresh templates
        console.log('✅ Template deleted successfully')
      } else {
        console.error('❌ Failed to delete template')
      }
    } catch (error) {
      console.error('❌ Failed to delete template:', error)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="h-6 w-48 bg-gray-200 animate-pulse rounded" />
            <div className="h-4 w-72 bg-gray-200 animate-pulse rounded" />
          </div>
          <div className="h-9 w-32 bg-gray-200 animate-pulse rounded-lg" />
        </div>
        
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="p-6">
            <div className="space-y-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <div className="h-5 w-32 bg-gray-200 animate-pulse rounded" />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <div key={j} className="h-16 bg-gray-100 animate-pulse rounded-lg" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-gray-900">Template Library</h3>
          <p className="text-sm text-gray-500">
            Click any template to copy to clipboard • Organize your communication templates
          </p>
        </div>
        <button 
          onClick={handleNewTemplate}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </button>
      </div>

      {/* Template Library */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="p-6">
          {templateCategories.length === 0 ? (
            // Empty state
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">No templates yet</h4>
              <p className="text-sm text-gray-500 mb-4">
                Create your first email template to streamline supplier communication
              </p>
              <button 
                onClick={handleNewTemplate}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {templateCategories.map((category, index) => (
                <div key={index} className="border-b border-gray-100 last:border-0 pb-6 last:pb-0">
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="font-medium text-gray-900">{category.name}</h5>
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                      {category.templates.length} template{category.templates.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {category.templates.map((template) => (
                      <div 
                        key={template.id} 
                        onClick={() => handleTemplateClick(template)}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-sm hover:border-gray-300 transition-all cursor-pointer group relative"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h6 className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors pr-2">
                            {template.title}
                          </h6>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                handleEditTemplate(template) 
                              }}
                              className="text-gray-400 hover:text-blue-600 p-1"
                              title={template.user_id ? "Edit template" : "Edit template (creates personal copy)"}
                            >
                              <Edit className="h-3 w-3" />
                            </button>
                            {/* Only show delete button for user-owned templates */}
                            {template.user_id && (
                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  handleDeleteTemplate(template) 
                                }}
                                className="text-gray-400 hover:text-red-600 p-1"
                                title="Delete template"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-xs text-gray-500 line-clamp-2 mb-3">
                          {template.content.substring(0, 100)}...
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">
                            Click to copy
                          </span>
                          {copiedTemplateId === template.id ? (
                            <div className="flex items-center gap-1 text-green-600">
                              <Check className="h-3 w-3" />
                              <span className="text-xs font-medium">Copied!</span>
                            </div>
                          ) : (
                            <Copy className="h-3 w-3 text-gray-400 group-hover:text-blue-600 transition-colors" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingTemplate ? 'Edit Template' : 'New Template'}
                </h3>
                <button 
                  onClick={() => {
                    setShowTemplateModal(false)
                    setFormData({ category: '', title: '', content: '' })
                    setEditingTemplate(null)
                    setIsCustomCategory(false)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              {/* Category Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Category
                </label>
                <select 
                  value={isCustomCategory ? 'Custom' : formData.category}
                  onChange={(e) => {
                    if (e.target.value === 'Custom') {
                      setIsCustomCategory(true)
                      setFormData(prev => ({ ...prev, category: '' }))
                    } else {
                      setIsCustomCategory(false)
                      setFormData(prev => ({ ...prev, category: e.target.value }))
                    }
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a category</option>
                  {predefinedCategories.map(cat => (
                    <option key={cat} value={cat}>{cat === 'Custom' ? '+ Custom Category' : cat}</option>
                  ))}
                </select>
              </div>

              {/* Custom Category Input */}
              {isCustomCategory && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Custom Category Name
                  </label>
                  <input 
                    type="text" 
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter category name"
                  />
                </div>
              )}

              {/* Title Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Template Title
                </label>
                <input 
                  type="text" 
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Initial Product Inquiry"
                />
              </div>

              {/* Content Textarea */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Template Content
                </label>
                <textarea 
                  rows={12}
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Dear [Supplier Name],

I hope this email finds you well. I am reaching out regarding...

Best regards,
[Your Name]"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use placeholders like [Supplier Name], [Your Name], [Product] for personalization
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => {
                    setShowTemplateModal(false)
                    setFormData({ category: '', title: '', content: '' })
                    setEditingTemplate(null)
                    setIsCustomCategory(false)
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveTemplate}
                  disabled={!formData.category || !formData.title || !formData.content}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {editingTemplate ? 'Update Template' : 'Save Template'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}