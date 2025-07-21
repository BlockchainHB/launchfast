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
import { IconX, IconLoader2 } from "@tabler/icons-react"
import type { EnhancedProduct } from "@/types"

interface BatchEditModalProps {
  open: boolean
  onClose: () => void
  selectedProducts: EnhancedProduct[]
  onProductsUpdated?: (updatedProducts: EnhancedProduct[]) => void
}

// Individual product override form
interface ProductOverrideForm {
  productId: string
  asin: string
  title: string // for display
  
  // Field-specific overrides with enabled flags
  consistencyRating?: { value: string; enabled: boolean }
  riskClassification?: { value: string; enabled: boolean }
  monthlyRevenue?: { value: number; enabled: boolean }
  monthlySales?: { value: number; enabled: boolean }
  cogs?: { value: number; enabled: boolean }
  margin?: { value: number; enabled: boolean }
  dailyRevenue?: { value: number; enabled: boolean }
  fulfillmentFees?: { value: number; enabled: boolean }
  launchBudget?: { value: number; enabled: boolean }
  profitPerUnitAfterLaunch?: { value: number; enabled: boolean }
  variations?: { value: number; enabled: boolean }
  reviews?: { value: number; enabled: boolean }
  rating?: { value: number; enabled: boolean }
  avgCpc?: { value: number; enabled: boolean }
  weight?: { value: number; enabled: boolean }
}

// Overall form state
interface BatchEditForm {
  productOverrides: Record<string, ProductOverrideForm>
  globalNotes?: string
}

const gradeOptions = [
  'A10', 'A9', 'A8', 'A7', 'A6', 'A5', 'A4', 'A3', 'A2', 'A1',
  'B10', 'B9', 'B8', 'B7', 'B6', 'B5', 'B4', 'B3', 'B2', 'B1', 
  'C10', 'C9', 'C8', 'C7', 'C6', 'C5', 'C4', 'C3', 'C2', 'C1',
  'F1'
]
const riskOptions = ['No Risk', 'Electric', 'Breakable', 'Banned']
const consistencyOptions = ['Consistent', 'Seasonal', 'Trendy']

export function BatchEditModal({ open, onClose, selectedProducts, onProductsUpdated }: BatchEditModalProps) {
  const [form, setForm] = React.useState<BatchEditForm>({ productOverrides: {} })
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Initialize form data when modal opens
  React.useEffect(() => {
    if (open && selectedProducts.length > 0) {
      const productOverrides: Record<string, ProductOverrideForm> = {}
      
      selectedProducts.forEach(product => {
        productOverrides[product.id] = {
          productId: product.id,
          asin: product.asin,
          title: product.title
          // Field overrides will be added as user enables them
        }
      })
      
      setForm({ productOverrides })
    }
  }, [open, selectedProducts])

  const handleFieldToggle = (field: string, enabled: boolean) => {
    setEnabledFields(prev => ({ ...prev, [field]: enabled }))
    if (!enabled && form[field as keyof BatchEditForm] !== undefined) {
      setForm(prev => {
        const newForm = { ...prev }
        delete newForm[field as keyof BatchEditForm]
        return newForm
      })
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    
    try {
      // Get user ID from auth
      const userResponse = await fetch('/api/user/profile')
      const userData = await userResponse.json()
      
      if (!userData.success || !userData.data?.id) {
        alert('Authentication required. Please refresh and try again.')
        setIsSubmitting(false)
        return
      }
      
      const userId = userData.data.id

      // Transform form data to database schema format
      // Include ALL values for enabled fields (both changed and unchanged)
      const transformProductToDatabase = (product: EnhancedProduct, formData: BatchEditForm) => {
        const dbFields: any = {}
        
        // Helper functions to get current values from product
        const getCurrentValue = (field: keyof BatchEditForm, product: EnhancedProduct): any => {
          switch (field) {
            case 'consistencyRating':
              return product.aiAnalysis?.consistencyRating
            case 'riskClassification':
              return product.aiAnalysis?.riskClassification
            case 'monthlyRevenue':
              return product.salesData?.monthlyRevenue || product.monthlyRevenue
            case 'monthlySales':
              return product.salesData?.monthlySales || product.monthlySales
            case 'cogs':
              return product.salesData?.cogs
            case 'margin':
              return product.salesData?.margin
            case 'dailyRevenue':
              return product.calculatedMetrics?.dailyRevenue
            case 'fulfillmentFees':
              return product.calculatedMetrics?.fulfillmentFees
            case 'launchBudget':
              return product.calculatedMetrics?.launchBudget
            case 'profitPerUnitAfterLaunch':
              return product.calculatedMetrics?.profitPerUnitAfterLaunch
            case 'variations':
              return product.calculatedMetrics?.variations
            case 'reviews':
              return product.reviews
            case 'rating':
              return product.rating
            case 'avgCpc':
              // Calculate average CPC from keywords
              const keywords = product.keywords || []
              if (keywords.length > 0) {
                const validCpcs = keywords.map(kw => kw.cpc).filter(cpc => cpc && cpc > 0)
                return validCpcs.length > 0 ? validCpcs.reduce((sum, cpc) => sum + cpc, 0) / validCpcs.length : null
              }
              return null
            case 'weight':
              return product.dimensions?.weight
            default:
              return null
          }
        }
        
        // ONLY include fields that are enabled AND have actual form values
        // Do NOT include current values for unchanged fields - only override what user actually changed
        if (enabledFields.consistencyRating && formData.consistencyRating) {
          dbFields.consistency_rating = formData.consistencyRating
        }
        if (enabledFields.riskClassification && formData.riskClassification) {
          dbFields.risk_classification = formData.riskClassification
        }
        if (enabledFields.monthlyRevenue && formData.monthlyRevenue !== undefined) {
          dbFields.monthly_revenue = formData.monthlyRevenue
        }
        if (enabledFields.monthlySales && formData.monthlySales !== undefined) {
          dbFields.monthly_sales = formData.monthlySales
        }
        if (enabledFields.cogs && formData.cogs !== undefined) {
          dbFields.cogs = formData.cogs
        }
        if (enabledFields.margin && formData.margin !== undefined) {
          dbFields.margin = formData.margin
        }
        if (enabledFields.dailyRevenue && formData.dailyRevenue !== undefined) {
          dbFields.daily_revenue = formData.dailyRevenue
        }
        if (enabledFields.fulfillmentFees && formData.fulfillmentFees !== undefined) {
          dbFields.fulfillment_fees = formData.fulfillmentFees
        }
        if (enabledFields.launchBudget && formData.launchBudget !== undefined) {
          dbFields.launch_budget = formData.launchBudget
        }
        if (enabledFields.profitPerUnitAfterLaunch && formData.profitPerUnitAfterLaunch !== undefined) {
          dbFields.profit_per_unit_after_launch = formData.profitPerUnitAfterLaunch
        }
        if (enabledFields.variations && formData.variations !== undefined) {
          dbFields.variations = formData.variations
        }
        if (enabledFields.reviews && formData.reviews !== undefined) {
          dbFields.reviews = formData.reviews
        }
        if (enabledFields.rating && formData.rating !== undefined) {
          dbFields.rating = formData.rating
        }
        if (enabledFields.avgCpc && formData.avgCpc !== undefined) {
          dbFields.avg_cpc = formData.avgCpc
        }
        if (enabledFields.weight && formData.weight !== undefined) {
          dbFields.weight = formData.weight
        }
        
        return dbFields
      }

      // Create overrides for each selected product with complete data snapshots
      const overrides = selectedProducts.map(product => ({
        product_id: product.id,
        asin: product.asin,
        override_reason: form.notes || 'Batch product edit',
        notes: form.notes,
        ...transformProductToDatabase(product, form)
      }))

      const response = await fetch('/api/product-overrides/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ overrides }),
      })

      if (!response.ok) {
        throw new Error('Failed to save batch edits')
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to save batch edits')
      }

      // Show success message
      console.log(`✅ ${result.message}`)
      if (result.warning) {
        console.warn(`⚠️ ${result.warning}`)
      }
      
      // Update frontend with merged product data if available
      if (result.updatedProducts && onProductsUpdated) {
        console.log(`🔄 Updating ${result.updatedProducts.length} products in frontend`)
        onProductsUpdated(result.updatedProducts)
      }

      // Reset form and close modal
      setForm({})
      setEnabledFields({})
      onClose()
      
      // Show success feedback
      // TODO: Replace with toast notification
      alert(`Successfully updated ${selectedProducts.length} products!${result.warning ? '\n\nWarning: ' + result.warning : ''}`)
      
      // Fallback: If callback wasn't provided or failed, refresh the page
      if (!onProductsUpdated) {
        console.log('⚠️ No onProductsUpdated callback provided, falling back to page reload')
        window.location.reload()
      }
    } catch (error) {
      console.error('Error saving batch edits:', error)
      alert('Failed to save batch edits. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderField = (
    field: string, 
    label: string, 
    type: 'text' | 'number' | 'select',
    options?: string[]
  ) => {
    const isEnabled = enabledFields[field]
    const value = form[field as keyof BatchEditForm]

    return (
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            checked={isEnabled}
            onCheckedChange={(checked) => handleFieldToggle(field, !!checked)}
          />
          <Label className="text-sm font-medium">{label}</Label>
        </div>
        {isEnabled && (
          type === 'select' && options ? (
            <Select 
              value={value?.toString()} 
              onValueChange={(val) => handleInputChange(field, val)}
            >
              <SelectTrigger className="h-8">
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
              placeholder={`Override ${label.toLowerCase()}`}
              value={value?.toString() || ''}
              onChange={(e) => handleInputChange(
                field, 
                type === 'number' ? parseFloat(e.target.value) || undefined : e.target.value
              )}
              className="h-8"
            />
          )
        )}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Batch Edit Products ({selectedProducts.length} selected)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Selected Products Preview */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Selected Products:</Label>
            <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto p-2 border rounded-md bg-muted/30">
              {selectedProducts.map(product => (
                <Badge key={product.id} variant="secondary" className="text-xs">
                  {product.title.slice(0, 30)}...
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              💡 Select fields below to override. Markets will automatically recalculate with your changes.
            </p>
          </div>

          {/* Override Fields Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* AI Analysis (Dropdowns) */}
            {renderField('consistencyRating', 'Consistency Rating', 'select', consistencyOptions)}
            {renderField('riskClassification', 'Risk Classification', 'select', riskOptions)}
            
            {/* Revenue & Sales */}
            {renderField('dailyRevenue', 'Daily Revenue ($)', 'number')}
            {renderField('monthlyRevenue', 'Monthly Revenue ($)', 'number')}
            {renderField('monthlySales', 'Sales Volume (monthly)', 'number')}
            
            {/* Costs & Fees */}
            {renderField('avgCpc', 'CPC ($)', 'number')}
            {renderField('cogs', 'COG ($)', 'number')}
            {renderField('fulfillmentFees', 'FBA Fees ($)', 'number')}
            
            {/* Margins & Profits */}
            {renderField('margin', 'Margin (0-1)', 'number')}
            {renderField('launchBudget', 'Launch Budget ($)', 'number')}
            {renderField('profitPerUnitAfterLaunch', 'Profit/Unit ($)', 'number')}
            
            {/* Product Details */}
            {renderField('reviews', 'Reviews Count', 'number')}
            {renderField('rating', 'Rating (0-5)', 'number')}
            {renderField('variations', 'Variations', 'number')}
            {renderField('weight', 'Weight (lbs)', 'number')}
          </div>

          {/* Notes Field */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about these changes... (optional)"
              value={form.notes || ''}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              className="min-h-20"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Saving Changes...' : `Save Overrides for ${selectedProducts.length} Product${selectedProducts.length > 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}