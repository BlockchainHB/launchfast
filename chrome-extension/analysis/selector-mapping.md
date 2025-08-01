# Amazon Selector Mapping for LaunchFast Chrome Extension

## Critical Selectors for Data Extraction

### Product Container Identification
```javascript
// Primary product containers
const PRODUCT_CONTAINERS = {
  // Standard organic results
  organic: '.s-result-item[data-asin]',
  
  // Sponsored products (may lack data-asin)
  sponsored: '[data-csa-c-item-id*="amzn1.asin"]',
  
  // Universal fallback (requires ASIN validation)
  fallback: '.puis-card-container .s-card-container'
}
```

### ASIN Extraction Methods
```javascript
const ASIN_EXTRACTION = {
  // Method 1: Direct data attribute (most reliable)
  dataAttribute: (element) => element.getAttribute('data-asin'),
  
  // Method 2: CSA tracking ID
  csaTracking: (element) => {
    const csaId = element.getAttribute('data-csa-c-item-id');
    const match = csaId?.match(/amzn1\.asin\.([A-Z0-9]{10})/);
    return match ? match[1] : null;
  },
  
  // Method 3: Product URL parsing
  urlParsing: (element) => {
    const link = element.querySelector('a[href*="/dp/"]');
    const match = link?.href.match(/\/dp\/([A-Z0-9]{10})/);
    return match ? match[1] : null;
  },
  
  // Method 4: Sponsored URL parsing  
  sponsoredUrl: (element) => {
    const link = element.querySelector('a[href*="/sspa/click"]');
    const urlParam = link?.href.match(/url=([^&]+)/);
    if (urlParam) {
      const decodedUrl = decodeURIComponent(urlParam[1]);
      const match = decodedUrl.match(/\/dp\/([A-Z0-9]{10})/);
      return match ? match[1] : null;
    }
    return null;
  }
}
```

### Product Title Extraction
```javascript
const TITLE_SELECTORS = [
  // Primary: Standard product titles
  'h2.a-size-base-plus .a-text-normal span',
  
  // Secondary: Direct span in title
  'h2.a-size-base-plus > span',
  
  // Tertiary: Link text within title
  'h2.a-size-base-plus a[href*="/dp/"]',
  
  // Fallback: Any title-like heading
  'h2[class*="size-base"] span, h2[class*="size-base"] a'
]

function extractTitle(container) {
  for (const selector of TITLE_SELECTORS) {
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
```

### Product Image Extraction
```javascript
const IMAGE_SELECTORS = {
  // Primary: Standard product images
  primary: '.s-product-image-container .s-image',
  
  // Secondary: Alternative image containers
  secondary: '.s-image[src*="media-amazon.com"]',
  
  // Tertiary: Any product image
  fallback: 'img[alt*="product"], img[src*="images/I/"]'
}

function extractImageData(container) {
  const img = container.querySelector(IMAGE_SELECTORS.primary) ||
              container.querySelector(IMAGE_SELECTORS.secondary) ||
              container.querySelector(IMAGE_SELECTORS.fallback);
              
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
```

### Price Information Extraction
```javascript
const PRICE_SELECTORS = {
  // Primary price (screen reader accessible)
  primary: '.a-price .a-offscreen',
  
  // Visual price components
  visual: {
    symbol: '.a-price-symbol',
    whole: '.a-price-whole',
    fraction: '.a-price-fraction'
  },
  
  // Unit price information
  unit: '.a-text-price .a-offscreen',
  
  // Discount information
  discount: '.a-color-secondary:contains("Save"), .a-color-secondary:contains("with")'
}

function extractPriceInfo(container) {
  const priceElement = container.querySelector(PRICE_SELECTORS.primary);
  const unitElement = container.querySelector(PRICE_SELECTORS.unit);
  
  let price = null;
  let unitPrice = null;
  
  if (priceElement) {
    const priceText = priceElement.textContent.replace(/[^\d.]/g, '');
    price = parseFloat(priceText);
  }
  
  if (unitElement) {
    const unitText = unitElement.textContent.replace(/[^\d.]/g, '');
    unitPrice = parseFloat(unitText);
  }
  
  return {
    price,
    unitPrice,
    currency: 'USD', // Could be extracted from symbol
    hasDiscount: container.querySelector(PRICE_SELECTORS.discount) !== null
  };
}
```

### Rating and Review Extraction
```javascript
const RATING_SELECTORS = {
  // Rating value (text)
  rating: '.a-size-small.a-color-base, .a-icon-star-mini .a-icon-alt',
  
  // Star visual indicator
  stars: '.a-icon-star-mini[class*="a-star-mini-"]',
  
  // Review count
  reviewCount: 'a[aria-label*="ratings"] span, a[aria-label*="reviews"] span',
  
  // Purchase volume
  purchaseVolume: '.a-color-secondary:contains("bought"), .a-color-secondary:contains("purchased")'
}

function extractRatingInfo(container) {
  // Extract rating value
  let rating = null;
  const ratingElement = container.querySelector(RATING_SELECTORS.rating);
  if (ratingElement) {
    const ratingText = ratingElement.textContent || ratingElement.getAttribute('alt') || '';
    const match = ratingText.match(/(\d+\.?\d*)\s*out of/);
    if (match) {
      rating = parseFloat(match[1]);
    }
  }
  
  // Extract review count
  let reviewCount = 0;
  const reviewElement = container.querySelector(RATING_SELECTORS.reviewCount);
  if (reviewElement) {
    const reviewText = reviewElement.textContent.replace(/[^\d]/g, '');
    reviewCount = parseInt(reviewText) || 0;
  }
  
  // Extract purchase volume
  let purchaseVolume = null;
  const volumeElement = container.querySelector(RATING_SELECTORS.purchaseVolume);
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
```

### Sponsored Product Detection
```javascript
const SPONSORED_INDICATORS = {
  // Sponsored label text
  labelText: '.puis-sponsored-label-text, [class*="sponsored"]',
  
  // Sponsored URL patterns
  urlPattern: /\/sspa\/click\?/,
  
  // CSA tracking indicators
  csaOwner: '[data-csa-c-owner="puis"]'
}

function isSponsored(container) {
  // Check for sponsored label
  if (container.querySelector(SPONSORED_INDICATORS.labelText)) {
    return true;
  }
  
  // Check for sponsored URL pattern
  const links = container.querySelectorAll('a[href]');
  for (const link of links) {
    if (SPONSORED_INDICATORS.urlPattern.test(link.href)) {
      return true;
    }
  }
  
  // Check CSA tracking
  if (container.querySelector(SPONSORED_INDICATORS.csaOwner)) {
    return true;
  }
  
  return false;
}
```

## LaunchFast Badge Injection Points

### Optimal Injection Locations
```javascript
const INJECTION_POINTS = {
  // After price section (recommended)
  afterPrice: '[data-cy="price-recipe"]',
  
  // After reviews section
  afterReviews: '[data-cy="reviews-block"]',
  
  // Before delivery info
  beforeDelivery: '[data-cy="delivery-recipe"]',
  
  // Image overlay
  imageOverlay: '.s-product-image-container'
}

function findBestInjectionPoint(container) {
  // Priority order for injection
  const candidates = [
    container.querySelector(INJECTION_POINTS.afterPrice),
    container.querySelector(INJECTION_POINTS.afterReviews),
    container.querySelector(INJECTION_POINTS.beforeDelivery)
  ];
  
  return candidates.find(el => el !== null);
}
```

### Badge HTML Template
```javascript
function createLaunchFastBadge(productData) {
  const { asin, grade, monthlyProfit, margin, competition } = productData;
  
  return `
    <div class="launchfast-badge" data-asin="${asin}">
      <div class="launchfast-header">
        <span class="launchfast-logo">LaunchFast</span>
        <span class="launchfast-grade launchfast-grade-${grade.toLowerCase()}">${grade}</span>
      </div>
      <div class="launchfast-metrics">
        <div class="launchfast-metric">
          <span class="launchfast-label">Profit:</span>
          <span class="launchfast-value">$${monthlyProfit.toLocaleString()}/mo</span>
        </div>
        <div class="launchfast-metric">
          <span class="launchfast-label">Margin:</span>
          <span class="launchfast-value">${Math.round(margin * 100)}%</span>
        </div>
        <div class="launchfast-metric">
          <span class="launchfast-label">Competition:</span>
          <span class="launchfast-value">${competition}</span>
        </div>
      </div>
      <div class="launchfast-actions">
        <button class="launchfast-btn launchfast-btn-analyze">Full Analysis</button>
        <button class="launchfast-btn launchfast-btn-save">Save Product</button>
      </div>
    </div>
  `;
}
```

## Performance-Optimized Selectors

### Efficient Query Strategies
```javascript
// Use more specific selectors to reduce DOM traversal
const EFFICIENT_SELECTORS = {
  // Instead of: document.querySelectorAll('.s-result-item')
  // Use: More specific path
  productCards: 'div[data-component-type="s-search-result"] .s-result-item',
  
  // Instead of: container.querySelector('span')
  // Use: More specific selector
  titleSpan: 'h2.a-size-base-plus > span:first-child',
  
  // Instead of: container.querySelector('img')
  // Use: Product-specific image selector
  productImage: '.s-product-image-container img.s-image[src]'
}
```

### Batch Processing Optimization
```javascript
function processBatchedProducts(containers) {
  const results = [];
  const fragment = document.createDocumentFragment();
  
  // Process in batches to avoid blocking UI
  function processBatch(startIndex) {
    const batchSize = 10;
    const endIndex = Math.min(startIndex + batchSize, containers.length);
    
    for (let i = startIndex; i < endIndex; i++) {
      const container = containers[i];
      const productData = extractProductData(container);
      
      if (productData.asin) {
        results.push(productData);
        const badge = createLaunchFastBadge(productData);
        fragment.appendChild(badge);
      }
    }
    
    // Continue processing if more containers
    if (endIndex < containers.length) {
      requestAnimationFrame(() => processBatch(endIndex));
    } else {
      // All processing complete
      injectBadges(fragment);
    }
  }
  
  processBatch(0);
  return results;
}
```

## Error Handling and Fallbacks

### Robust Data Extraction
```javascript
function safeExtract(container, extractorFn, fallback = null) {
  try {
    const result = extractorFn(container);
    return result !== null && result !== undefined ? result : fallback;
  } catch (error) {
    console.warn('LaunchFast: Extraction failed', error);
    return fallback;
  }
}

function extractProductData(container) {
  return {
    asin: safeExtract(container, extractASIN),
    title: safeExtract(container, extractTitle, 'Unknown Product'),
    price: safeExtract(container, extractPrice, 0),
    rating: safeExtract(container, extractRating, 0),
    reviewCount: safeExtract(container, extractReviewCount, 0),
    image: safeExtract(container, extractImage, ''),
    isSponsored: safeExtract(container, isSponsored, false)
  };
}
```

### Selector Validation
```javascript
function validateSelectors() {
  const testResults = {};
  
  // Test critical selectors on current page
  testResults.productContainers = document.querySelectorAll(PRODUCT_CONTAINERS.organic).length;
  testResults.titleElements = document.querySelectorAll(TITLE_SELECTORS[0]).length;
  testResults.priceElements = document.querySelectorAll(PRICE_SELECTORS.primary).length;
  testResults.imageElements = document.querySelectorAll(IMAGE_SELECTORS.primary).length;
  
  // Log results for monitoring
  console.log('LaunchFast Selector Validation:', testResults);
  
  return testResults;
}
```

This comprehensive selector mapping provides the technical foundation for reliably extracting product data from Amazon's search results and injecting LaunchFast's A10-F1 scoring system.