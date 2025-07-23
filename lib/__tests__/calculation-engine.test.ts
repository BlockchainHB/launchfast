import { 
  createCalculationEngine, 
  createCalculationContext,
  type EnhancedProduct 
} from '../calculation-engine'

describe('CalculationEngine', () => {
  const mockUserId = 'test-user-123'
  const mockContext = createCalculationContext('initial', mockUserId, 'Test calculation')
  const engine = createCalculationEngine(mockContext)

  // Mock product data
  const mockProduct: EnhancedProduct = {
    id: 'test-product-1',
    asin: 'B123456789',
    title: 'Test Product',
    price: 25.99,
    reviews: 150,
    rating: 4.2,
    bsr: 50000,
    salesData: {
      monthlySales: 100,
      monthlyRevenue: 2599,
      monthlyProfit: 649.75,
      margin: 0.25,
      cogs: 19.49,
      ppu: 6.50
    },
    keywords: [
      { keyword: 'test keyword', cpc: 1.25, searchVolume: 1000 },
      { keyword: 'another keyword', cpc: 1.50, searchVolume: 500 }
    ]
  } as EnhancedProduct

  describe('Product Validation', () => {
    test('should validate valid product correctly', () => {
      const isValid = engine.isValidProduct(mockProduct)
      expect(isValid).toBe(true)
    })

    test('should reject product with zero price', () => {
      const invalidProduct = { ...mockProduct, price: 0 }
      const isValid = engine.isValidProduct(invalidProduct)
      expect(isValid).toBe(false)
    })

    test('should reject product with no sales data', () => {
      const invalidProduct = { 
        ...mockProduct, 
        salesData: { monthlySales: 0, monthlyRevenue: 0 },
        monthlyRevenue: 0,
        monthlySales: 0
      }
      const isValid = engine.isValidProduct(invalidProduct)
      expect(isValid).toBe(false)
    })
  })

  describe('Safe Number Operations', () => {
    test('should handle null values correctly', () => {
      const result = engine.createSafeNumber(null, 10, { min: 0, max: 100 }, 'test')
      expect(result.isValid).toBe(false)
      expect(result.value).toBe(10)
      expect(result.source).toBe('fallback')
    })

    test('should handle out-of-bounds values', () => {
      const result = engine.createSafeNumber(150, 50, { min: 0, max: 100 }, 'test')
      expect(result.isValid).toBe(false)
      expect(result.value).toBe(50) // Should use fallback
      expect(result.source).toBe('fallback')
    })

    test('should handle valid values correctly', () => {
      const result = engine.createSafeNumber(75, 50, { min: 0, max: 100 }, 'test')
      expect(result.isValid).toBe(true)
      expect(result.value).toBe(75)
      expect(result.source).toBe('original')
    })
  })

  describe('Safe Division', () => {
    test('should handle division by zero', () => {
      const result = engine.safeDivide(100, 0, 0, 'test division')
      expect(result.isValid).toBe(false)
      expect(result.value).toBe(0)
      expect(result.fallbackReason).toContain('test division failed')
    })

    test('should handle null values', () => {
      const result = engine.safeDivide(null, 10, 0, 'test division')
      expect(result.isValid).toBe(false)
      expect(result.value).toBe(0)
    })

    test('should handle valid division', () => {
      const result = engine.safeDivide(100, 10, 0, 'test division')
      expect(result.isValid).toBe(true)
      expect(result.value).toBe(10)
    })
  })

  describe('PPU Calculation Fix', () => {
    test('should calculate PPU correctly from profit and sales', () => {
      const ppu = engine.calculateProfitPerUnit(mockProduct)
      
      // Expected: monthlyProfit / monthlySales = 649.75 / 100 = 6.4975
      expect(ppu.isValid).toBe(true)
      expect(ppu.value).toBeCloseTo(6.4975, 2)
    })

    test('should handle zero sales gracefully', () => {
      const productWithZeroSales = {
        ...mockProduct,
        salesData: { ...mockProduct.salesData!, monthlySales: 0 }
      }
      
      const ppu = engine.calculateProfitPerUnit(productWithZeroSales)
      expect(ppu.isValid).toBe(false)
      expect(ppu.value).toBe(0)
      expect(ppu.fallbackReason).toContain('profit per unit calculation failed')
    })
  })

  describe('Product Metrics Extraction', () => {
    test('should extract all metrics correctly', () => {
      const metrics = engine.extractProductMetrics(mockProduct)
      
      expect(metrics.isValid).toBe(true)
      expect(metrics.price.value).toBe(25.99)
      expect(metrics.monthlySales.value).toBe(100)
      expect(metrics.monthlyRevenue.value).toBe(2599)
      expect(metrics.profitPerUnit.value).toBeCloseTo(6.4975, 2)
      expect(metrics.margin.value).toBe(0.25)
      expect(metrics.avgCpc.value).toBe(1.375) // Average of 1.25 and 1.50
    })

    test('should handle missing keyword data', () => {
      const productWithoutKeywords = { ...mockProduct, keywords: [] }
      const metrics = engine.extractProductMetrics(productWithoutKeywords)
      
      expect(metrics.avgCpc.isValid).toBe(false)
      expect(metrics.avgCpc.source).toBe('estimated')
    })
  })

  describe('Market Aggregation', () => {
    test('should aggregate multiple products correctly', () => {
      const products = [mockProduct, { 
        ...mockProduct, 
        id: 'test-product-2',
        price: 35.99,
        salesData: {
          ...mockProduct.salesData!,
          monthlySales: 200,
          monthlyRevenue: 7198,
          monthlyProfit: 1799.5
        }
      }]

      const result = engine.calculateMarketMetrics(products)
      
      expect(result.validation.isValid).toBe(true)
      expect(result.value.validProducts).toBe(2)
      expect(result.value.avgPrice.value).toBeCloseTo(30.99, 2) // Average of 25.99 and 35.99
      
      // Critical test: Market-level PPU should be calculated from aggregated values
      const expectedMarketPPU = (649.75 + 1799.5) / (100 + 200) // Total profit / total sales
      expect(result.value.avgProfitPerUnit.value).toBeCloseTo(expectedMarketPPU, 2)
    })

    test('should handle empty product list', () => {
      const result = engine.calculateMarketMetrics([])
      
      expect(result.validation.isValid).toBe(false)
      expect(result.validation.errors).toContain('No valid products found for market calculation')
      expect(result.value.validProducts).toBe(0)
    })

    test('should handle products with invalid data', () => {
      const invalidProducts = [
        { ...mockProduct, price: 0 }, // Invalid price
        { ...mockProduct, salesData: { monthlySales: 0, monthlyRevenue: 0 } } // Invalid sales
      ]

      const result = engine.calculateMarketMetrics(invalidProducts)
      
      expect(result.validation.isValid).toBe(false)
      expect(result.value.validProducts).toBe(0)
    })
  })

  describe('Calculation Context', () => {
    test('should create context with proper metadata', () => {
      const context = createCalculationContext('deletion', mockUserId, 'Product deletion test')
      
      expect(context.type).toBe('deletion')
      expect(context.userId).toBe(mockUserId)
      expect(context.reason).toBe('Product deletion test')
      expect(context.timestamp).toBeDefined()
    })
  })
})

// Additional edge case tests
describe('CalculationEngine Edge Cases', () => {
  const mockUserId = 'test-user-edge'
  const mockContext = createCalculationContext('recalculation', mockUserId)
  const engine = createCalculationEngine(mockContext)

  test('should handle Infinity values', () => {
    const result = engine.safeDivide(100, 0.0000001, 0)
    // This might result in a very large number, engine should handle appropriately
    expect(isFinite(result.value)).toBe(true)
  })

  test('should handle NaN values', () => {
    const result = engine.createSafeNumber(NaN, 10, { min: 0, max: 100 }, 'NaN test')
    expect(result.isValid).toBe(false)
    expect(result.value).toBe(10)
  })

  test('should handle negative values in positive-only fields', () => {
    const result = engine.createSafeNumber(-50, 25, { min: 0, max: 100 }, 'negative test')
    expect(result.isValid).toBe(false)
    expect(result.value).toBe(25) // Should use fallback
  })
})