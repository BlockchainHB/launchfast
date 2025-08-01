/**
 * Amazon DOM Selectors for LaunchFast Chrome Extension
 * Based on comprehensive DOM analysis - handles multiple Amazon layout variations
 */

const AmazonSelectors = {
  // Product container identification
  PRODUCT_CONTAINERS: {
    // Standard organic results (most reliable)
    organic: '.s-result-item[data-asin]',
    
    // Sponsored products (may lack data-asin)
    sponsored: '[data-csa-c-item-id*="amzn1.asin"]',
    
    // Universal fallback (requires ASIN validation)
    fallback: '.puis-card-container .s-card-container',
    
    // Alternative container patterns
    alternative: 'div[data-component-type="s-search-result"] .s-result-item'
  },

  // ASIN extraction methods
  ASIN_ATTRIBUTES: [
    'data-asin',
    'data-csa-c-item-id'
  ],

  // Product title selectors (priority order)
  TITLE_SELECTORS: [
    'h2.a-size-base-plus .a-text-normal span',
    'h2.a-size-base-plus > span:first-child',
    'h2.a-size-base-plus a[href*="/dp/"]',
    'h2[class*="size-base"] span',
    'h2[class*="size-base"] a'
  ],

  // Product image selectors
  IMAGE_SELECTORS: {
    primary: '.s-product-image-container .s-image',
    secondary: '.s-image[src*="media-amazon.com"]',
    fallback: 'img[alt*="product"], img[src*="images/I/"]'
  },

  // Price information selectors
  PRICE_SELECTORS: {
    primary: '.a-price .a-offscreen',
    visual: {
      symbol: '.a-price-symbol',
      whole: '.a-price-whole',
      fraction: '.a-price-fraction'
    },
    unit: '.a-text-price .a-offscreen',
    discount: '.a-color-secondary:contains("Save"), .a-color-secondary:contains("with")'
  },

  // Rating and review selectors
  RATING_SELECTORS: {
    rating: '.a-size-small.a-color-base, .a-icon-star-mini .a-icon-alt',
    stars: '.a-icon-star-mini[class*="a-star-mini-"]',
    reviewCount: 'a[aria-label*="ratings"] span, a[aria-label*="reviews"] span',
    purchaseVolume: '.a-color-secondary:contains("bought"), .a-color-secondary:contains("purchased")'
  },

  // Sponsored product detection
  SPONSORED_INDICATORS: {
    labelText: '.puis-sponsored-label-text, [class*="sponsored"]',
    urlPattern: /\/sspa\/click\?/,
    csaOwner: '[data-csa-c-owner="puis"]'
  },

  // Injection points for LaunchFast cards
  INJECTION_POINTS: {
    afterPrice: '[data-cy="price-recipe"]',
    afterReviews: '[data-cy="reviews-block"]',
    beforeDelivery: '[data-cy="delivery-recipe"]',
    imageOverlay: '.s-product-image-container'
  },

  // URL patterns for different Amazon pages
  PAGE_PATTERNS: {
    searchResults: /\/s\?/,
    productDetail: /\/dp\/[A-Z0-9]{10}/,
    categoryPage: /\/b\?node=/,
    dealsPage: /\/deals/
  }
};

/**
 * Main product data extractor class
 */
class AmazonProductExtractor {
  constructor() {
    this.asinRegex = /^[A-Z0-9]{10}$/;
    this.processedASINs = new Set();
  }

  /**
   * Find all product containers on the current page
   */
  findProductContainers() {
    const containers = [];
    
    // Try different container selectors in priority order
    const selectors = [
      AmazonSelectors.PRODUCT_CONTAINERS.organic,
      AmazonSelectors.PRODUCT_CONTAINERS.sponsored,
      AmazonSelectors.PRODUCT_CONTAINERS.alternative
    ];
    
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        if (!containers.includes(el)) {
          containers.push(el);
        }
      });
    }
    
    // Filter out containers without ASINs
    return containers.filter(container => this.extractASIN(container));
  }

  /**
   * Extract ASIN from product container using multiple methods
   */
  extractASIN(container) {
    // Method 1: Direct data attribute
    const directASIN = container.getAttribute('data-asin');
    if (directASIN && this.isValidASIN(directASIN)) {
      return directASIN;
    }

    // Method 2: CSA tracking ID
    const csaId = container.getAttribute('data-csa-c-item-id');
    if (csaId) {
      const match = csaId.match(/amzn1\.asin\.([A-Z0-9]{10})/);
      if (match && this.isValidASIN(match[1])) {
        return match[1];
      }
    }

    // Method 3: URL parsing from links
    const links = container.querySelectorAll('a[href*="/dp/"]');
    for (const link of links) {
      const match = link.href.match(/\/dp\/([A-Z0-9]{10})/);
      if (match && this.isValidASIN(match[1])) {
        return match[1];
      }
    }

    // Method 4: Sponsored URL parsing
    const sponsoredLinks = container.querySelectorAll('a[href*="/sspa/click"]');
    for (const link of sponsoredLinks) {
      const urlParam = link.href.match(/url=([^&]+)/);
      if (urlParam) {
        try {
          const decodedUrl = decodeURIComponent(urlParam[1]);
          const match = decodedUrl.match(/\/dp\/([A-Z0-9]{10})/);
          if (match && this.isValidASIN(match[1])) {
            return match[1];
          }
        } catch (e) {
          console.warn('Failed to decode sponsored URL:', e);
        }
      }
    }

    return null;
  }

  /**
   * Extract product title
   */
  extractTitle(container) {
    for (const selector of AmazonSelectors.TITLE_SELECTORS) {
      const element = container.querySelector(selector);
      if (element) {
        const title = element.textContent?.trim();
        if (title && title.length > 5) {
          return title;
        }
      }
    }
    return null;
  }

  /**
   * Extract product image data
   */
  extractImageData(container) {
    const img = container.querySelector(AmazonSelectors.IMAGE_SELECTORS.primary) ||
                container.querySelector(AmazonSelectors.IMAGE_SELECTORS.secondary) ||
                container.querySelector(AmazonSelectors.IMAGE_SELECTORS.fallback);

    if (!img) return null;

    return {
      src: img.src,
      srcset: img.srcset,
      alt: img.alt,
      dimensions: {
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height
      }
    };
  }

  /**
   * Extract price information
   */
  extractPriceInfo(container) {
    const priceElement = container.querySelector(AmazonSelectors.PRICE_SELECTORS.primary);
    const unitElement = container.querySelector(AmazonSelectors.PRICE_SELECTORS.unit);

    let price = null;
    let unitPrice = null;

    if (priceElement) {
      const priceText = priceElement.textContent.replace(/[^\d.]/g, '');
      price = parseFloat(priceText) || null;
    }

    if (unitElement) {
      const unitText = unitElement.textContent.replace(/[^\d.]/g, '');
      unitPrice = parseFloat(unitText) || null;
    }

    return {
      price,
      unitPrice,
      currency: 'USD',
      hasDiscount: container.querySelector(AmazonSelectors.PRICE_SELECTORS.discount) !== null
    };
  }

  /**
   * Extract rating and review information
   */
  extractRatingInfo(container) {
    // Extract rating value
    let rating = null;
    const ratingElement = container.querySelector(AmazonSelectors.RATING_SELECTORS.rating);
    if (ratingElement) {
      const ratingText = ratingElement.textContent || ratingElement.getAttribute('alt') || '';
      const match = ratingText.match(/(\d+\.?\d*)\s*out of/);
      if (match) {
        rating = parseFloat(match[1]);
      }
    }

    // Extract review count
    let reviewCount = 0;
    const reviewElement = container.querySelector(AmazonSelectors.RATING_SELECTORS.reviewCount);
    if (reviewElement) {
      const reviewText = reviewElement.textContent.replace(/[^\d]/g, '');
      reviewCount = parseInt(reviewText) || 0;
    }

    // Extract purchase volume
    let purchaseVolume = null;
    const volumeElement = container.querySelector(AmazonSelectors.RATING_SELECTORS.purchaseVolume);
    if (volumeElement) {
      const volumeText = volumeElement.textContent;
      const match = volumeText.match(/(\d+[KM]?\+?)\s*bought/i);
      if (match) {
        purchaseVolume = match[1];
      }
    }

    return {
      rating,
      reviewCount,
      purchaseVolume
    };
  }

  /**
   * Check if product is sponsored
   */
  isSponsored(container) {
    // Check for sponsored label
    if (container.querySelector(AmazonSelectors.SPONSORED_INDICATORS.labelText)) {
      return true;
    }

    // Check for sponsored URL pattern
    const links = container.querySelectorAll('a[href]');
    for (const link of links) {
      if (AmazonSelectors.SPONSORED_INDICATORS.urlPattern.test(link.href)) {
        return true;
      }
    }

    // Check CSA tracking
    if (container.querySelector(AmazonSelectors.SPONSORED_INDICATORS.csaOwner)) {
      return true;
    }

    return false;
  }

  /**
   * Find best injection point for LaunchFast card
   */
  findInjectionPoint(container) {
    const candidates = [
      container.querySelector(AmazonSelectors.INJECTION_POINTS.afterPrice),
      container.querySelector(AmazonSelectors.INJECTION_POINTS.afterReviews),
      container.querySelector(AmazonSelectors.INJECTION_POINTS.beforeDelivery)
    ];

    return candidates.find(el => el !== null) || container;
  }

  /**
   * Extract complete product data from container
   */
  extractProductData(container) {
    const asin = this.extractASIN(container);
    if (!asin) return null;

    // Skip if already processed
    if (this.processedASINs.has(asin)) {
      return null;
    }

    const productData = {
      asin,
      title: this.extractTitle(container),
      image: this.extractImageData(container),
      pricing: this.extractPriceInfo(container),
      rating: this.extractRatingInfo(container),
      isSponsored: this.isSponsored(container),
      container: container,
      injectionPoint: this.findInjectionPoint(container),
      timestamp: Date.now()
    };

    // Mark as processed
    this.processedASINs.add(asin);

    return productData;
  }

  /**
   * Extract all products from current page
   */
  extractAllProducts() {
    const containers = this.findProductContainers();
    const products = [];

    for (const container of containers) {
      const productData = this.extractProductData(container);
      if (productData) {
        products.push(productData);
      }
    }

    console.log(`LaunchFast: Extracted ${products.length} products from page`);
    return products;
  }

  /**
   * Validate ASIN format
   */
  isValidASIN(asin) {
    return asin && typeof asin === 'string' && this.asinRegex.test(asin);
  }

  /**
   * Reset processed ASINs (for page navigation)
   */
  reset() {
    this.processedASINs.clear();
  }

  /**
   * Check if current page is supported
   */
  isSupportedPage() {
    const url = window.location.href;
    return Object.values(AmazonSelectors.PAGE_PATTERNS).some(pattern => pattern.test(url));
  }
}

// Create global instance
window.AmazonProductExtractor = new AmazonProductExtractor();

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AmazonSelectors, AmazonProductExtractor };
}