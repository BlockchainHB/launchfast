# Amazon DOM Structure Analysis for LaunchFast Chrome Extension

## Overview
This document provides a comprehensive analysis of Amazon's DOM structure based on systematic examination of search results HTML. This analysis is essential for building the LaunchFast Chrome extension that will inject A10-F1 product scoring directly into Amazon product listings.

## HTML File Analyzed
- **Source**: `/Volumes/T7/Launch Fast/launchfast-fresh/amazon.html`
- **Content**: Amazon search results page for "niche pet products"
- **Size**: 8000+ lines of HTML
- **Date Extracted**: Current session

## Core Product Container Structure

### Primary Product Containers
```html
<!-- Main product result container -->
<div class="s-result-item s-card-container" data-asin="[ASIN]" data-index="[position]">
  <div class="puis-card-container s-card-container s-overflow-hidden aok-relative puis-expand-height puis-include-content-margin puis puis-v[version] s-latency-cf-section puis-card-border">
    <!-- Product content here -->
  </div>
</div>

<!-- Alternative sponsored product container -->
<span class="a-declarative" data-csa-c-item-id="amzn1.asin.[ASIN]" data-csa-c-posx="[position]" data-csa-c-type="item" data-csa-c-owner="puis">
  <div class="puis-card-container s-card-container s-overflow-hidden aok-relative puis-expand-height puis-include-content-margin puis puis-v[version] s-latency-cf-section puis-card-border">
    <!-- Sponsored product content -->
  </div>
</span>
```

### Key Container Classes
- `.s-result-item` - Primary product container identifier
- `.puis-card-container` - Product card wrapper
- `.s-card-container` - Card styling container
- `data-asin="[ASIN]"` - Critical ASIN identifier attribute
- `data-index="[number]"` - Position in search results

## Product Title Extraction

### Title Selectors
```html
<!-- Standard product title structure -->
<h2 class="a-size-base-plus a-spacing-none a-color-base a-text-normal">
  <a class="a-link-normal s-line-clamp-4 s-link-style a-text-normal" href="[product-url]">
    <span>[Product Title Text]</span>
  </a>
</h2>

<!-- Sponsored product title variant -->
<h2 aria-label="Sponsored Ad - [Full Product Title]" class="a-size-base-plus a-spacing-none a-color-base a-text-normal">
  <span>[Product Title Text]</span>
</h2>
```

### Title Extraction Strategy
- **Primary selector**: `h2.a-size-base-plus .a-text-normal span`
- **Alternative**: `h2.a-size-base-plus span` (direct span child)
- **Fallback**: `h2.a-size-base-plus a[href*="/dp/"]` (link text)
- **Line clamping**: `.s-line-clamp-4` indicates 4-line text truncation

## Product Image Extraction

### Image Container Structure
```html
<div class="s-product-image-container aok-relative s-text-center s-image-overlay-grey puis-image-overlay-grey s-padding-left-small s-padding-right-small puis-spacing-small s-height-equalized">
  <span data-component-type="s-product-image" class="rush-component">
    <a aria-hidden="true" class="a-link-normal s-no-outline" tabindex="-1" href="[product-url]">
      <div class="a-section aok-relative s-image-square-aspect">
        <img class="s-image" 
             src="[primary-image-url]" 
             srcset="[responsive-image-urls]" 
             alt="[product-title]" 
             data-image-index="[number]" 
             data-image-load="" 
             data-image-latency="s-product-image" 
             data-image-source-density="1">
      </div>
    </a>
  </span>
</div>
```

### Image Extraction Strategy
- **Primary selector**: `.s-product-image-container .s-image`
- **Image URL**: `src` attribute for primary image
- **Responsive URLs**: `srcset` attribute for multiple resolutions
- **Alt text**: Contains product title for accessibility
- **Image quality indicators**: 
  - `_AC_UL320_.jpg` - 320px width
  - `_AC_UL480_FMwebp_QL65_.jpg` - 480px WebP format
  - `_AC_UL640_FMwebp_QL65_.jpg` - 640px WebP format

### Image URL Patterns
```
Base URL: https://m.media-amazon.com/images/I/[IMAGE_ID]
Formats:
- _AC_UL320_.jpg (1x)
- _AC_UL480_FMwebp_QL65_.jpg (1.5x)
- _AC_UL640_FMwebp_QL65_.jpg (2x)
- _AC_UL800_FMwebp_QL65_.jpg (2.5x)
- _AC_UL960_FMwebp_QL65_.jpg (3x)
```

## Price Information Extraction

### Price Container Structure
```html
<div data-cy="price-recipe" class="a-section a-spacing-none a-spacing-top-small s-price-instructions-style">
  <div class="a-row a-size-base a-color-base">
    <div class="a-row">
      <a class="a-link-normal s-no-hover s-underline-text s-underline-link-text s-link-style a-text-normal" href="[product-url]">
        <span class="a-price" data-a-size="xl" data-a-color="base">
          <span class="a-offscreen">$35.00</span>
          <span aria-hidden="true">
            <span class="a-price-symbol">$</span>
            <span class="a-price-whole">35<span class="a-price-decimal">.</span></span>
            <span class="a-price-fraction">00</span>
          </span>
        </span>
        <span class="a-size-base a-color-secondary">
          (<span class="a-price a-text-price" data-a-size="b" data-a-color="secondary">
            <span class="a-offscreen">$1.17</span>
            <span aria-hidden="true">$1.17</span>
          </span>/count)
        </span>
      </a>
    </div>
  </div>
  <!-- Subscription discount row -->
  <div class="a-row a-size-base a-color-secondary">
    <span>$31.50 with Subscribe &amp; Save discount</span>
  </div>
</div>
```

### Price Extraction Strategy
- **Primary price**: `.a-price .a-offscreen` (screen reader accessible)
- **Visual price components**:
  - `.a-price-symbol` - Currency symbol ($)
  - `.a-price-whole` - Whole number part
  - `.a-price-fraction` - Decimal part
- **Unit price**: `.a-text-price .a-offscreen` (per unit cost)
- **Discounts**: Look for "Subscribe & Save" or similar discount text

## Rating and Review Information

### Rating Structure
```html
<div data-cy="reviews-block" class="a-section a-spacing-none a-spacing-top-micro">
  <div class="a-row a-size-small">
    <span aria-hidden="true" class="a-size-small a-color-base">4.0</span>
    <span class="a-declarative" data-action="a-popover">
      <a aria-label="4.0 out of 5 stars, rating details" href="javascript:void(0)" class="a-popover-trigger a-declarative mvt-review-star-mini-popover">
        <i data-cy="reviews-ratings-slot" aria-hidden="true" class="a-icon a-icon-star-mini a-star-mini-4 mvt-review-star-mini mvt-review-star-with-margin">
          <span class="a-icon-alt">4.0 out of 5 stars</span>
        </i>
        <i class="a-icon a-icon-popover"></i>
      </a>
    </span>
    <!-- Review count -->
    <a aria-label="557 ratings" class="a-link-normal s-underline-text s-underline-link-text s-link-style" href="[reviews-url]">
      <span aria-hidden="true" class="a-size-small puis-normal-weight-text s-underline-text">(557)</span>
    </a>
  </div>
  <!-- Additional info -->
  <div class="a-row a-size-base">
    <span class="a-size-base a-color-secondary">4K+ bought in past month</span>
  </div>
</div>
```

### Rating Extraction Strategy
- **Rating value**: `.a-size-small.a-color-base` (numeric rating)
- **Star display**: `.a-icon-star-mini.a-star-mini-[rating]` (visual stars)
- **Review count**: Look for `([number])` pattern in links with "ratings" aria-label
- **Purchase volume**: Text containing "bought in past month"
- **Rating classes**: `.a-star-mini-[0-5]` indicates rating level

## Sponsored Product Identification

### Sponsored Indicators
```html
<!-- Sponsored label with popover -->
<span class="a-declarative" data-action="a-popover" data-a-popover="{...}">
  <a href="javascript:void(0)" class="puis-label-popover puis-sponsored-label-text">
    <span class="puis-label-popover-default">
      <span aria-label="View Sponsored information or leave ad feedback" class="a-color-secondary">Sponsored</span>
    </span>
    <span class="puis-label-popover-hover">
      <span aria-hidden="true" class="a-color-base">Sponsored</span>
    </span>
    <span class="aok-inline-block puis-sponsored-label-info-icon"></span>
  </a>
</span>
```

### Sponsored Detection Strategy
- **Primary indicator**: `.puis-sponsored-label-text` class
- **Text content**: "Sponsored" text within product container
- **URL patterns**: `/sspa/click?` in product links indicates sponsored
- **Container attributes**: `data-csa-c-owner="puis"` may indicate sponsored content

## Brand Information Extraction

### Brand Detection Patterns
```html
<!-- Brand information is often embedded in title or separate containers -->
<!-- Check for brand-specific classes or data attributes -->
<span class="s-oam-brand-name">[Brand Name]</span>

<!-- Or within product title structure -->
<span class="a-text-bold">[Brand Name]</span>
```

### Brand Extraction Strategy
- **Direct brand selectors**: `.s-oam-brand-name`, `.brand-name`
- **Title parsing**: Extract brand from beginning of product title
- **Structured data**: Look for brand in product metadata
- **Alternative patterns**: "by [Brand]" text patterns

## ASIN Extraction Methods

### Primary ASIN Sources
1. **Container data attribute**: `data-asin="B0CNS4R8QH"`
2. **CSA tracking**: `data-csa-c-item-id="amzn1.asin.B0CNS4R8QH"`
3. **Product URLs**: `/dp/B0CNS4R8QH/` or `/product/B0CNS4R8QH`
4. **Image URLs**: Often contain ASIN in metadata

### ASIN Validation
- **Format**: 10 characters, alphanumeric (A-Z, 0-9)
- **Regex**: `/^[A-Z0-9]{10}$/`
- **Examples**: `B0CNS4R8QH`, `B07GBZ4Q68`

## Additional Product Metadata

### Delivery Information
```html
<div data-cy="delivery-recipe" class="a-section a-spacing-none a-spacing-top-micro">
  <div class="a-row a-size-base a-color-secondary s-align-children-center">
    <div data-cy="delivery-block" class="a-section a-spacing-none a-padding-none udm-delivery-block">
      <div class="a-row a-color-base udm-primary-delivery-message">
        <div class="a-column a-span12">FREE delivery <span class="a-text-bold">Sun, Aug 3</span></div>
      </div>
      <div class="a-row a-color-base udm-secondary-delivery-message">
        <div class="a-column a-span12">Or fastest delivery <span class="a-text-bold">Tomorrow, Aug 2</span></div>
      </div>
    </div>
  </div>
</div>
```

### Product Certifications
```html
<div data-cy="certification-recipe" class="a-section a-spacing-none a-spacing-top-micro">
  <div class="s-pc-faceout-container">
    <a data-cy="s-pc-faceout-badge" class="a-link-normal s-no-underline s-pc-badge s-align-children-center aok-block">
      <img alt="" src="https://m.media-amazon.com/images/I/111mHoVK0kL._SS200_.png" class="s-image" height="18px" width="18px">
      <span class="a-size-base a-color-base">Small Business</span>
    </a>
  </div>
</div>
```

## Search Result Pagination

### Pagination Structure
```html
<ul class="a-pagination">
  <li class="a-disabled">
    <span>Previous</span>
  </li>
  <li class="a-selected">
    <a href="#">1</a>
  </li>
  <li>
    <a href="/s?k=keyword&page=2">2</a>
  </li>
  <li>
    <a href="/s?k=keyword&page=3">Next</a>
  </li>
</ul>
```

### Navigation Elements
- **Pagination container**: `.a-pagination`
- **Current page**: `.a-selected`
- **Disabled states**: `.a-disabled`
- **Page links**: Extract page numbers from href attributes

## CSS Classes and Styling Patterns

### Key Utility Classes
```css
/* Spacing utilities */
.puis-spacing-small { margin-bottom: 8px !important; }
.puis-spacing-micro { margin-bottom: 4px !important; }
.puis-padding-left-small { padding-left: 8px !important; }

/* Typography */
.a-size-base-plus { font-size: 16px; }
.a-size-base { font-size: 14px; }
.a-size-small { font-size: 12px; }

/* Colors */
.a-color-base { color: #0f1111; }
.a-color-secondary { color: #565959; }
.a-text-bold { font-weight: 700; }

/* Layout */
.s-result-item { /* Main product container */ }
.puis-card-container { border-radius: 4px; }
.s-card-container { /* Card styling wrapper */ }
```

### Responsive Design Patterns
- **Image sizing**: `s-image-square-aspect` maintains aspect ratio
- **Text clamping**: `.s-line-clamp-4` truncates after 4 lines
- **Flexible containers**: `.aok-relative` for positioning context

## Chrome Extension Integration Points

### Optimal Injection Targets
1. **Product card containers**: `.s-result-item` - Best for card-level overlays
2. **Image containers**: `.s-product-image-container` - For image overlays
3. **Title sections**: After `[data-cy="title-recipe"]` - For title enhancements
4. **Price sections**: After `[data-cy="price-recipe"]` - For profit calculations
5. **Review sections**: After `[data-cy="reviews-block"]` - For competition analysis

### LaunchFast A10-F1 Badge Injection Strategy
```html
<!-- Inject LaunchFast badge after price section -->
<div data-cy="price-recipe"><!-- Existing price content --></div>
<div class="launchfast-a10f1-badge" data-asin="B0CNS4R8QH">
  <div class="launchfast-grade-display">
    <span class="launchfast-grade">A7</span>
    <span class="launchfast-score">$47,000/mo</span>
  </div>
  <div class="launchfast-metrics">
    <span class="launchfast-competition">Low Competition</span>
    <span class="launchfast-margin">32% Margin</span>
  </div>
</div>
```

### Content Script Selectors Summary
```javascript
const SELECTORS = {
  // Product containers
  productCards: '.s-result-item[data-asin]',
  sponsoredCards: '[data-csa-c-item-id*="amzn1.asin"]',
  
  // ASIN extraction
  asinAttributes: ['data-asin', 'data-csa-c-item-id'],
  asinUrlPattern: /\/dp\/([A-Z0-9]{10})/,
  
  // Product data
  titles: 'h2.a-size-base-plus span, h2.a-size-base-plus a',
  images: '.s-product-image-container .s-image',
  prices: '.a-price .a-offscreen',
  ratings: '.a-icon-star-mini .a-icon-alt, .a-size-small.a-color-base',
  reviewCounts: 'a[aria-label*="ratings"] span',
  
  // Injection points
  priceContainers: '[data-cy="price-recipe"]',
  reviewContainers: '[data-cy="reviews-block"]',
  deliveryContainers: '[data-cy="delivery-recipe"]'
}
```

## Performance Considerations

### DOM Observation Strategy
- **MutationObserver**: Watch for dynamic content loading
- **Intersection Observer**: Only process visible products
- **Debouncing**: Limit processing frequency during scroll
- **Batch processing**: Handle multiple products efficiently

### Data Extraction Optimization
- **Cache ASIN lookups**: Avoid duplicate API calls
- **Background processing**: Use chrome.runtime for heavy computations
- **Progressive enhancement**: Load basic UI first, enhance with data
- **Error handling**: Graceful fallbacks for missing elements

## Anti-Detection Considerations

### Amazon's Bot Detection
- **Rate limiting**: Avoid rapid-fire requests
- **User agent**: Maintain browser-like behavior
- **Request patterns**: Vary timing and endpoints
- **Stealth mode**: Minimal DOM manipulation footprint

### Best Practices
- **Minimal DOM changes**: Only add necessary elements
- **Native styling**: Match Amazon's design patterns
- **Clean removal**: Properly cleanup on navigation
- **Error logging**: Silent failure modes

## Version-Specific Patterns

### Dynamic Class Versioning
Amazon uses versioned classes like `puis-v2ecv5ixb479yz22uh1d08zu3c8` that change regularly:
- **Problem**: Hard-coded selectors break
- **Solution**: Use stable base classes + flexible matching
- **Example**: `.puis-card-container[class*="puis-v"]`

### A/B Testing Variations
- **Layout differences**: Card vs list views
- **Component variations**: Different price displays
- **Feature flags**: New elements appear/disappear
- **Responsive breakpoints**: Mobile vs desktop layouts

## Testing Requirements

### Cross-Browser Compatibility
- **Chrome**: Primary target (Manifest V3)
- **Edge**: Chromium-based compatibility
- **Firefox**: Different extension architecture
- **Safari**: WebKit considerations

### Device Testing
- **Desktop**: Full feature set
- **Tablet**: Responsive layout handling
- **Mobile**: Limited screen real estate
- **High DPI**: Image and text scaling

### Amazon Variant Testing
- **Search results**: Different query types
- **Category pages**: Department browsing
- **Sponsored content**: Paid placement variations
- **International sites**: amazon.co.uk, amazon.de, etc.

## Future Maintenance Notes

### DOM Stability
- **High stability**: ASIN attributes, basic price structure
- **Medium stability**: CSS classes, container hierarchy  
- **Low stability**: Specific class names, styling details
- **Monitoring needed**: Title selectors, image containers

### Update Detection
- **Automated testing**: Regular DOM structure validation
- **User feedback**: Extension break reports
- **Amazon updates**: Monitor for layout changes
- **A/B test detection**: Handle experimental features

This comprehensive analysis provides the foundation for building a robust Chrome extension that can reliably extract product data from Amazon search results and inject LaunchFast's A10-F1 scoring system.