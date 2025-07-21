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

  const currentProduct = selectedProducts[currentProductIndex]
  const isLastProduct = currentProductIndex === selectedProducts.length - 1
  const isFirstProduct = currentProductIndex === 0

  // Initialize form when product changes
  React.useEffect(() => {
    if (currentProduct && open) {
      // Reset form for new product
      setForm({})
      setEnabledFields({})
    }
  }, [currentProductIndex, currentProduct, open])

  // Reset when modal opens
  React.useEffect(() => {
    if (open) {
      setCurrentProductIndex(0)
      setCompletedProducts(new Set())
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
        const keywords = currentProduct.keywords || []
        if (keywords.length > 0) {
          const validCpcs = keywords.map(kw => kw.cpc).filter(cpc => cpc && cpc > 0)
          return validCpcs.length > 0 ? validCpcs.reduce((sum, cpc) => sum + cpc, 0) / validCpcs.length : null
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

  const saveCurrentProduct = async () => {
    if (!currentProduct) return false

    // Check if any fields are enabled
    const enabledOverrides = Object.entries(enabledFields)
      .filter(([_, enabled]) => enabled)

    if (enabledOverrides.length === 0) {
      // No overrides for this product, just move to next
      return true
    }

    try {
      setIsSubmitting(true)
      
      // Show initial toast
      const loadingToast = toast.loading(`Saving changes for ${currentProduct.title.slice(0, 30)}...`, {
        description: "Step 1: Applying product overrides"
      })

      // Get user ID
      const userResponse = await fetch('/api/user/profile')
      const userData = await userResponse.json()
      
      if (!userData.success || !userData.data?.id) {
        toast.dismiss(loadingToast)
        toast.error('Authentication required. Please refresh and try again.')
        return false
      }
      
      const userId = userData.data.id

      // Create complete product snapshot with overrides
      // This ensures all fields maintain their values (original or overridden)
      const getFieldValue = (field: string) => {
        // If field is enabled and has a form value, use that
        if (enabledFields[field] && form[field as keyof ProductEditForm] !== undefined) {
          return form[field as keyof ProductEditForm]
        }
        // For dropdown fields (consistency, risk), if not enabled, preserve original value
        const currentValue = getCurrentValue(field)
        if (field === 'consistencyRating' || field === 'riskClassification') {
          // Only return the original value if it exists, otherwise don't include in override
          return currentValue
        }
        // For other fields, use current value
        return currentValue
      }

      // Helper to ensure integer fields are properly converted
      const ensureInteger = (value: any): number | null => {
        if (value === null || value === undefined || value === '') return null
        const num = Math.round(Number(value))
        return isNaN(num) ? null : num
      }

      // Helper to ensure decimal fields are properly converted
      const ensureDecimal = (value: any): number | null => {
        if (value === null || value === undefined || value === '') return null
        const num = Number(value)
        return isNaN(num) ? null : num
      }

      // Map all fields to database format with complete snapshot
      const override = {
        product_id: currentProduct.id,
        asin: currentProduct.asin,
        user_id: userId,
        override_reason: form.notes || `Individual product edit - ${currentProduct.title.slice(0, 50)}`,
        notes: form.notes,
        
        // Complete product data snapshot with proper type conversion
        // Only include consistency/risk if they have actual values (not null)
        ...(getFieldValue('consistencyRating') && { consistency_rating: getFieldValue('consistencyRating') }),
        ...(getFieldValue('riskClassification') && { risk_classification: getFieldValue('riskClassification') }),
        monthly_revenue: ensureDecimal(getFieldValue('monthlyRevenue')),
        monthly_sales: ensureInteger(getFieldValue('monthlySales')), // INTEGER field
        daily_revenue: ensureDecimal(getFieldValue('dailyRevenue')),
        cogs: ensureDecimal(getFieldValue('cogs')),
        margin: ensureDecimal(getFieldValue('margin')),
        fulfillment_fees: ensureDecimal(getFieldValue('fulfillmentFees')),
        launch_budget: ensureDecimal(getFieldValue('launchBudget')),
        profit_per_unit_after_launch: ensureDecimal(getFieldValue('profitPerUnitAfterLaunch')),
        variations: ensureInteger(getFieldValue('variations')), // INTEGER field
        reviews: ensureInteger(getFieldValue('reviews')), // INTEGER field
        rating: ensureDecimal(getFieldValue('rating')),
        // Only include avgCpc if it has a value or is explicitly overridden
        ...(getFieldValue('avgCpc') !== null && { avg_cpc: ensureDecimal(getFieldValue('avgCpc')) }),
        weight: ensureDecimal(getFieldValue('weight'))
      }

      // Update toast for market recalculation
      toast.loading(`Processing ${currentProduct.title.slice(0, 30)}...`, {
        id: loadingToast,
        description: "Step 2: Recalculating affected markets"
      })
      
      const response = await fetch('/api/product-overrides/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ overrides: [override] }),
      })

      if (!response.ok) {
        throw new Error('Failed to save override')
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to save override')
      }
      
      // Update toast for completion
      toast.loading(`Finalizing ${currentProduct.title.slice(0, 30)}...`, {
        id: loadingToast,
        description: "Step 3: Refreshing dashboard data"
      })
      
      // Add delay to let market recalculation complete before UI update
      await new Promise(resolve => setTimeout(resolve, 500))

      console.log(`✅ Saved complete override snapshot for ${currentProduct.title}`)
      console.log('Override fields:', enabledOverrides.map(([field]) => field))
      console.log('Market recalculations:', result.debug?.marketRecalculationResults || 0)
      
      // Update immediate frontend if callback provided
      if (result.updatedProducts && onProductsUpdated) {
        onProductsUpdated(result.updatedProducts)
      }
      
      // Store market recalculations info for final refresh (don't refresh after each individual product)
      const marketRecalculations = result.debug?.marketRecalculationResults || 0
      if (marketRecalculations > 0) {
        console.log(`🔄 ${marketRecalculations} markets recalculated - will refresh at completion`)
      }
      
      // Show success toast with market recalculation info
      const successToastId = toast.success(`Updated ${currentProduct.title.slice(0, 25)}`, {
        id: loadingToast,
        description: `${enabledOverrides.length} fields updated`
      })
      
      // Store the toast ID for potential dismissal
      ;(window as any).lastProductToastId = successToastId

      return true

    } catch (error) {
      console.error('Error saving override:', error)
      toast.error(`Failed to save changes for ${currentProduct.title.slice(0, 30)}`, {
        description: error instanceof Error ? error.message : 'Please try again.'
      })
      return false
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNext = async () => {
    const saved = await saveCurrentProduct()
    if (saved) {
      setCompletedProducts(prev => new Set([...prev, currentProductIndex]))
      
      if (isLastProduct) {
        // Dismiss the last individual product toast before showing completion
        if ((window as any).lastProductToastId) {
          toast.dismiss((window as any).lastProductToastId)
        }
        
        // All done! Trigger final dashboard refresh for market recalculations
        if (onDashboardRefresh) {
          console.log(`🔄 Triggering final dashboard refresh after batch completion`)
          onDashboardRefresh()
        }
        
        toast.success(`Batch edit completed!`, {
          description: `${selectedProducts.length} products updated`
        })
        onClose()
      } else {
        setCurrentProductIndex(prev => prev + 1)
      }
    }
  }

  const handlePrevious = () => {
    if (!isFirstProduct) {
      setCurrentProductIndex(prev => prev - 1)
    }
  }

  const handleSkip = () => {
    if (isLastProduct) {
      onClose()
    } else {
      setCurrentProductIndex(prev => prev + 1)
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
                  type === 'number' ? parseFloat(e.target.value) || undefined : e.target.value
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
            <div className="space-y-2">
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