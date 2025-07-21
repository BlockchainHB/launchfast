"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { IconLoader2, IconChevronLeft, IconChevronRight } from "@tabler/icons-react"
import { toast } from "sonner"
import type { EnhancedProduct } from "@/types"

interface BatchEditModalProps {
  open: boolean
  onClose: () => void
  selectedProducts: EnhancedProduct[]
  onProductsUpdated?: (updatedProducts: EnhancedProduct[]) => void
  onDashboardRefresh?: () => void // New callback to refresh dashboard data
}

interface ProductEditForm {
  consistencyRating?: string
  riskClassification?: string
  monthlyRevenue?: number
  monthlySales?: number
  cogs?: number
  margin?: number
  dailyRevenue?: number
  fulfillmentFees?: number
  launchBudget?: number
  profitPerUnitAfterLaunch?: number
  variations?: number
  reviews?: number
  rating?: number
  avgCpc?: number
  weight?: number
  notes?: string
}

const riskOptions = ['No Risk', 'Electric', 'Breakable', 'Banned']
const consistencyOptions = ['Consistent', 'Seasonal', 'Trendy']

export function BatchEditModal({ open, onClose, selectedProducts, onProductsUpdated, onDashboardRefresh }: BatchEditModalProps) {
  const [currentProductIndex, setCurrentProductIndex] = React.useState(0)
  const [form, setForm] = React.useState<ProductEditForm>({})
  const [enabledFields, setEnabledFields] = React.useState<Record<string, boolean>>({})
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [completedProducts, setCompletedProducts] = React.useState<Set<number>>(new Set())

  const isIntegerField = (field: string): boolean => {
    return ['variations', 'reviews', 'monthlySales'].includes(field)
  }
  
  // Storage for all product form data (true batch approach)
  const [storedForms, setStoredForms] = React.useState<Map<number, ProductEditForm>>(new Map())
  const [storedEnabledFields, setStoredEnabledFields] = React.useState<Map<number, Record<string, boolean>>>(new Map())

  const currentProduct = selectedProducts[currentProductIndex]
  const isLastProduct = currentProductIndex === selectedProducts.length - 1
  const isFirstProduct = currentProductIndex === 0

  // Initialize form when product changes - load stored data if available
  React.useEffect(() => {
    console.log(`🔄 useEffect triggered - currentProductIndex: ${currentProductIndex}, open: ${open}, currentProduct:`, currentProduct?.title)
    if (currentProduct && open) {
      // Load stored form data if available, otherwise reset
      const storedForm = storedForms.get(currentProductIndex) || {}
      const storedEnabled = storedEnabledFields.get(currentProductIndex) || {}
      
      setForm(storedForm)
      setEnabledFields(storedEnabled)
      console.log(`✅ Form loaded for product ${currentProductIndex + 1}: ${currentProduct.title} (stored: ${Object.keys(storedForm).length} fields)`)
    }
  }, [currentProductIndex, open, storedForms, storedEnabledFields])

  // Reset when modal opens
  React.useEffect(() => {
    if (open) {
      setCurrentProductIndex(0)
      setCompletedProducts(new Set())
      setStoredForms(new Map())
      setStoredEnabledFields(new Map())
      console.log(`🔄 Reset all form storage for new batch edit session`)
    }
  }, [open])

  const getCurrentValue = (field: string): any => {
    if (!currentProduct) return null

    switch (field) {
      case 'consistencyRating':
        // Always preserve the actual value, never fallback to defaults for dropdowns
        return currentProduct.aiAnalysis?.consistencyRating || null
      case 'riskClassification':
        // Always preserve the actual value, never fallback to defaults for dropdowns  
        return currentProduct.aiAnalysis?.riskClassification || null
      case 'monthlyRevenue':
        return currentProduct.salesData?.monthlyRevenue || currentProduct.monthlyRevenue || 0
      case 'monthlySales':
        return currentProduct.salesData?.monthlySales || currentProduct.monthlySales || 0
      case 'cogs':
        return currentProduct.salesData?.cogs || 0
      case 'margin':
        return currentProduct.salesData?.margin || 0
      case 'dailyRevenue':
        return currentProduct.calculatedMetrics?.dailyRevenue || 0
      case 'fulfillmentFees':
        return currentProduct.calculatedMetrics?.fulfillmentFees || 0
      case 'launchBudget':
        return currentProduct.calculatedMetrics?.launchBudget || 0
      case 'profitPerUnitAfterLaunch':
        return currentProduct.calculatedMetrics?.profitPerUnitAfterLaunch || 0
      case 'variations':
        return currentProduct.calculatedMetrics?.variations || 1
      case 'reviews':
        return currentProduct.reviews || 0
      case 'rating':
        return currentProduct.rating || 0
      case 'avgCpc':
        // Check for existing CPC override first
        if (currentProduct.hasOverrides && currentProduct.overrideInfo?.avg_cpc) {
          return Number(currentProduct.overrideInfo.avg_cpc.toFixed(2))
        }
        // Fall back to keyword average, formatted to 2 decimals
        const keywords = currentProduct.keywords || []
        if (keywords.length > 0) {
          const validCpcs = keywords.map(kw => kw.cpc).filter(cpc => cpc && cpc > 0)
          if (validCpcs.length > 0) {
            const avgCpc = validCpcs.reduce((sum, cpc) => sum + cpc, 0) / validCpcs.length
            return Number(avgCpc.toFixed(2))
          }
        }
        return null
      case 'weight':
        return currentProduct.dimensions?.weight || 0
      default:
        return null
    }
  }

  const handleFieldToggle = (field: string, enabled: boolean) => {
    setEnabledFields(prev => ({ ...prev, [field]: enabled }))
    if (enabled && !form[field as keyof ProductEditForm]) {
      // Initialize with current value
      const currentValue = getCurrentValue(field)
      setForm(prev => ({ ...prev, [field]: currentValue }))
    } else if (!enabled) {
      // Remove field from form
      setForm(prev => {
        const newForm = { ...prev }
        delete newForm[field as keyof ProductEditForm]
        return newForm
      })
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }


  const storeCurrentForm = () => {
    // Store current form data
    setStoredForms(prev => new Map(prev.set(currentProductIndex, { ...form })))
    setStoredEnabledFields(prev => new Map(prev.set(currentProductIndex, { ...enabledFields })))
    console.log(`💾 Stored form data for product ${currentProductIndex + 1}`)
  }

  const handleNext = () => {
    // Store current form data
    storeCurrentForm()
    
    if (isLastProduct) {
      // This is the finish button - save all products
      handleFinish()
    } else {
      // Move to next product without saving
      setCurrentProductIndex(prev => prev + 1)
      console.log(`➡️ Moving to product ${currentProductIndex + 2} without saving`)
    }
  }

  const handleFinish = async () => {
    // Store the current form before final save
    storeCurrentForm()
    
    try {
      setIsSubmitting(true)
      
      // Show loading toast for batch save
      const loadingToast = toast.loading(`Saving ${selectedProducts.length} product edits...`, {
        description: "Processing all changes"
      })
      
      // Prepare all overrides from stored forms
      const allOverrides = []
      
      for (let i = 0; i < selectedProducts.length; i++) {
        const product = selectedProducts[i]
        // Use current form data if we're on the current product, otherwise use stored data
        const productForm = i === currentProductIndex ? form : (storedForms.get(i) || {})
        const productEnabledFields = i === currentProductIndex ? enabledFields : (storedEnabledFields.get(i) || {})
        
        // Check if any fields are enabled for this product
        const enabledOverrides = Object.entries(productEnabledFields).filter(([_, enabled]) => enabled)
        
        if (enabledOverrides.length > 0) {
          // Create override for this product (using same logic as before)
          const override = await createProductOverride(product, productForm, productEnabledFields)
          if (override) {
            allOverrides.push(override)
          }
        }
      }
      
      if (allOverrides.length === 0) {
        toast.dismiss(loadingToast)
        toast.error('No changes to save')
        return
      }
      
      // Save all overrides in one batch API call with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
      
      const response = await fetch('/api/product-overrides/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overrides: allOverrides }),
        credentials: 'include',
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Response Error:', response.status, errorText)
        throw new Error(`Failed to save overrides: ${response.status} ${errorText}`)
      }
      
      const result = await response.json()
      console.log('API Response:', result)
      
      if (!result.success) {
        console.error('API Error:', result.error)
        throw new Error(result.error || 'Failed to save overrides')
      }
      
      // Update UI with results
      if (result.updatedProducts && onProductsUpdated) {
        onProductsUpdated(result.updatedProducts)
      }
      
      // Trigger dashboard refresh
      if (onDashboardRefresh) {
        console.log(`🔄 Triggering dashboard refresh after batch completion`)
        onDashboardRefresh()
      }
      
      // Show success toast
      toast.success(`Batch edit completed!`, {
        id: loadingToast,
        description: `${allOverrides.length} products updated`
      })
      
      onClose()
      
    } catch (error) {
      console.error('Batch save error:', error)
      toast.error('Failed to save changes', {
        description: error instanceof Error ? error.message : 'Please try again'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePrevious = () => {
    if (!isFirstProduct) {
      // Store current form before moving
      storeCurrentForm()
      setCurrentProductIndex(prev => prev - 1)
      console.log(`⬅️ Moving to previous product`)
    }
  }

  const createProductOverride = async (product: EnhancedProduct, form: ProductEditForm, enabledFields: Record<string, boolean>) => {
    // Get user ID
    const userResponse = await fetch('/api/user/profile', {
      credentials: 'include'
    })
    const userData = await userResponse.json()
    
    if (!userData.id) {
      throw new Error('Authentication required')
    }
    
    const userId = userData.id

    // Helper functions (same as original)
    const getCurrentValue = (field: string): any => {
      switch (field) {
        case 'consistencyRating':
          return product.aiAnalysis?.consistencyRating || null
        case 'riskClassification':
          return product.aiAnalysis?.riskClassification || null
        case 'monthlyRevenue':
          return product.salesData?.monthlyRevenue || product.monthlyRevenue || 0
        case 'monthlySales':
          return product.salesData?.monthlySales || product.monthlySales || 0
        case 'cogs':
          return product.salesData?.cogs || 0
        case 'margin':
          return product.salesData?.margin || 0
        case 'dailyRevenue':
          return product.calculatedMetrics?.dailyRevenue || 0
        case 'fulfillmentFees':
          return product.calculatedMetrics?.fulfillmentFees || 0
        case 'launchBudget':
          return product.calculatedMetrics?.launchBudget || 0
        case 'profitPerUnitAfterLaunch':
          return product.calculatedMetrics?.profitPerUnitAfterLaunch || 0
        case 'variations':
          return product.calculatedMetrics?.variations || 1
        case 'reviews':
          return product.reviews || 0
        case 'rating':
          return product.rating || 0
        case 'avgCpc':
          // Check for existing CPC override first
          if (product.hasOverrides && product.overrideInfo?.avg_cpc) {
            return Number(product.overrideInfo.avg_cpc.toFixed(2))
          }
          // Fall back to keyword average, formatted to 2 decimals
          const keywords = product.keywords || []
          if (keywords.length > 0) {
            const validCpcs = keywords.map(kw => kw.cpc).filter(cpc => cpc && cpc > 0)
            if (validCpcs.length > 0) {
              const avgCpc = validCpcs.reduce((sum, cpc) => sum + cpc, 0) / validCpcs.length
              return Number(avgCpc.toFixed(2))
            }
          }
          return null
        case 'weight':
          return product.dimensions?.weight || 0
        default:
          return null
      }
    }

    const getFieldValue = (field: string) => {
      if (enabledFields[field] && form[field as keyof ProductEditForm] !== undefined) {
        return form[field as keyof ProductEditForm]
      }
      const currentValue = getCurrentValue(field)
      if (field === 'consistencyRating' || field === 'riskClassification') {
        return currentValue
      }
      return currentValue
    }

    const ensureInteger = (value: any): number | null => {
      if (value === null || value === undefined || value === '') return null
      const num = parseInt(String(value), 10)
      return isNaN(num) ? null : num
    }

    const ensureDecimal = (value: any): number | null => {
      if (value === null || value === undefined || value === '') return null
      const num = Number(value)
      return isNaN(num) ? null : num
    }

    return {
      product_id: product.id,
      asin: product.asin,
      override_reason: form.notes || `Batch edit - ${product.title.slice(0, 50)}`,
      notes: form.notes,
      
      ...(getFieldValue('consistencyRating') && { consistency_rating: getFieldValue('consistencyRating') }),
      ...(getFieldValue('riskClassification') && { risk_classification: getFieldValue('riskClassification') }),
      monthly_revenue: ensureDecimal(getFieldValue('monthlyRevenue')),
      monthly_sales: ensureInteger(getFieldValue('monthlySales')),
      daily_revenue: ensureDecimal(getFieldValue('dailyRevenue')),
      cogs: ensureDecimal(getFieldValue('cogs')),
      margin: ensureDecimal(getFieldValue('margin')),
      fulfillment_fees: ensureDecimal(getFieldValue('fulfillmentFees')),
      launch_budget: ensureDecimal(getFieldValue('launchBudget')),
      profit_per_unit_after_launch: ensureDecimal(getFieldValue('profitPerUnitAfterLaunch')),
      variations: ensureInteger(getFieldValue('variations')),
      reviews: ensureInteger(getFieldValue('reviews')),
      rating: ensureDecimal(getFieldValue('rating')),
      avg_cpc: ensureDecimal(getFieldValue('avgCpc')) ? Number(ensureDecimal(getFieldValue('avgCpc'))!.toFixed(2)) : null,
      weight: ensureDecimal(getFieldValue('weight'))
    }
  }

  const handleSkip = () => {
    // Store current form before skipping (in case user returns)
    storeCurrentForm()
    
    if (isLastProduct) {
      onClose()
    } else {
      setCurrentProductIndex(prev => prev + 1)
      console.log(`⏭️ Skipped product ${currentProductIndex + 1}`)
    }
  }

  const renderField = (
    field: string, 
    label: string, 
    type: 'text' | 'number' | 'select',
    options?: string[]
  ) => {
    const isEnabled = enabledFields[field]
    const value = form[field as keyof ProductEditForm]

    return (
      <div className="space-y-1">
        <div className="flex items-center space-x-2">
          <Checkbox
            checked={isEnabled}
            onCheckedChange={(checked) => handleFieldToggle(field, !!checked)}
            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
          />
          <Label className="text-xs font-medium text-gray-800">{label}</Label>
        </div>
        {isEnabled && (
          <div className="ml-5">
            {type === 'select' && options ? (
              <Select 
                value={value?.toString()} 
                onValueChange={(val) => handleInputChange(field, val)}
              >
                <SelectTrigger className="h-8 text-xs border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                  <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {options.map(option => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                type={type}
                placeholder={`Enter ${label.toLowerCase()}`}
                value={value?.toString() || ''}
                onChange={(e) => handleInputChange(
                  field, 
                  type === 'number' ? (isIntegerField(field) ? parseInt(e.target.value) || undefined : parseFloat(e.target.value) || undefined) : e.target.value
                )}
                className="h-8 text-xs border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                step={field === 'margin' || field === 'rating' ? '0.01' : '1'}
              />
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col bg-white">
        <DialogHeader className="flex-shrink-0 border-b pb-2">
          <DialogTitle className="text-base font-bold text-gray-900">
            Edit Product {currentProductIndex + 1} of {selectedProducts.length}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1 py-2">
          {currentProduct && (
            <div key={`product-${currentProductIndex}-${currentProduct.id}`} className="space-y-2">
              {/* Current Product Info */}
              <div className="p-2 bg-blue-50 rounded border">
                <div className="flex items-center space-x-2">
                  {currentProduct.images?.[0] && (
                    <img 
                      src={currentProduct.images[0]} 
                      alt={currentProduct.title}
                      className="w-8 h-8 object-cover rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-xs text-gray-900 truncate">{currentProduct.title}</div>
                    <div className="flex items-center space-x-2 mt-0.5">
                      <span className="text-xs text-gray-600">{currentProduct.asin}</span>
                      <span className="text-xs font-medium text-blue-600">${currentProduct.price}</span>
                      {currentProduct.grade && (
                        <span className={`text-xs font-bold px-1 py-0.5 rounded ${currentProduct.grade.startsWith('A') ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {currentProduct.grade}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Indicator */}
              <div className="bg-white rounded p-1.5 border">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-700">Progress</span>
                  <span className="text-xs text-gray-600">
                    {completedProducts.size}/{selectedProducts.length}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  {selectedProducts.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full ${
                        completedProducts.has(index) 
                          ? 'bg-green-500' 
                          : index === currentProductIndex 
                            ? 'bg-blue-500' 
                            : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="text-xs text-blue-700 bg-blue-50 p-1.5 rounded border">
                Check boxes for fields to override. Only selected fields will be modified.
              </div>

              {/* Override Fields Grid */}
              <div className="bg-white rounded border p-2">
                <div className="grid grid-cols-1 gap-2">
                  {renderField('consistencyRating', 'Consistency', 'select', consistencyOptions)}
                  {renderField('riskClassification', 'Risk Classification', 'select', riskOptions)}
                  {renderField('dailyRevenue', 'Daily Revenue ($)', 'number')}
                  {renderField('monthlyRevenue', 'Monthly Revenue ($)', 'number')}
                  {renderField('monthlySales', 'Sales Volume', 'number')}
                  {renderField('avgCpc', 'CPC ($)', 'number')}
                  {renderField('cogs', 'COG ($)', 'number')}
                  {renderField('fulfillmentFees', 'FBA Fees ($)', 'number')}
                  {renderField('margin', 'Margin (0-1)', 'number')}
                  {renderField('launchBudget', 'Launch Budget ($)', 'number')}
                  {renderField('profitPerUnitAfterLaunch', 'Profit/Unit ($)', 'number')}
                  {renderField('reviews', 'Reviews Count', 'number')}
                  {renderField('rating', 'Rating (0-5)', 'number')}
                  {renderField('variations', 'Variations', 'number')}
                  {renderField('weight', 'Weight (lbs)', 'number')}
                </div>
              </div>

              {/* Notes Field */}
              <div className="bg-white rounded border p-2">
                <Label htmlFor="notes" className="text-xs font-medium text-gray-800 mb-1 block">
                  Notes (Optional)
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Add notes..."
                  value={form.notes || ''}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  className="min-h-16 text-xs resize-none"
                  rows={3}
                />
              </div>

            </div>
          )}
        </div>

        {/* Fixed Navigation Footer */}
        <div className="flex-shrink-0 border-t bg-gray-50 p-3 mt-2">
          <div className="flex justify-between items-center">
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={handlePrevious} 
                disabled={isFirstProduct || isSubmitting}
                size="sm"
              >
                <IconChevronLeft className="mr-1 h-3 w-3" />
                Prev
              </Button>
              <Button 
                variant="ghost" 
                onClick={handleSkip} 
                disabled={isSubmitting}
                size="sm"
              >
                Skip
              </Button>
            </div>
            
            <div className="flex space-x-2">
              <Button variant="outline" onClick={onClose} disabled={isSubmitting} size="sm">
                Cancel
              </Button>
              <Button onClick={handleNext} disabled={isSubmitting} size="sm" className="bg-blue-600 hover:bg-blue-700">
                {isSubmitting && <IconLoader2 className="mr-1 h-3 w-3 animate-spin" />}
                {isSubmitting 
                  ? 'Saving...' 
                  : isLastProduct 
                    ? 'Finish' 
                    : 'Next'
                }
                {!isSubmitting && !isLastProduct && <IconChevronRight className="ml-1 h-3 w-3" />}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}