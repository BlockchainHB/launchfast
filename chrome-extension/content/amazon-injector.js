/**
 * LaunchFast Amazon Injector - Main Content Script
 * Orchestrates product extraction, analysis, and badge injection on Amazon pages
 */

class AmazonInjector {
  constructor() {
    this.isEnabled = true;
    this.isProcessing = false;
    this.processedProducts = new Set();
    this.settings = {};
    this.observerActive = false;
    
    // Throttling
    this.processingQueue = new Set();
    this.maxConcurrent = 3;
    this.processDelay = 2000; // 2 second delay between batches
    
    this.init();
  }

  /**
   * Initialize the injector
   */
  async init() {
    try {
      console.log('LaunchFast: Initializing Amazon Injector');
      
      // Set up message listener for background script requests
      this.setupMessageListener();
      
      // Load settings
      await this.loadSettings();
      
      // Check if extension is enabled
      if (!this.settings.isEnabled) {
        console.log('LaunchFast: Extension disabled');
        return;
      }

      // Check if current page is supported
      if (!this.isSupportedPage()) {
        console.log('LaunchFast: Page not supported');
        return;
      }

      // Check authentication
      const authStatus = await this.checkAuthentication();
      if (!authStatus.authenticated) {
        console.log('LaunchFast: User not authenticated');
        this.showAuthenticationPrompt();
        return;
      }

      console.log('LaunchFast: User authenticated:', authStatus.user?.email);

      // Start processing products
      this.startProcessing();
      
      // Set up observers for dynamic content
      this.setupObservers();
      
      console.log('LaunchFast: Initialization complete');
    } catch (error) {
      console.error('LaunchFast: Initialization failed:', error);
    }
  }

  /**
   * Load extension settings
   */
  async loadSettings() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_SETTINGS'
      });
      this.settings = response || {};
    } catch (error) {
      console.error('LaunchFast: Settings load failed:', error);
      this.settings = {
        isEnabled: true,
        showCards: true,
        autoAnalyze: true
      };
    }
  }

  /**
   * Check authentication status
   */
  async checkAuthentication() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CHECK_AUTH'
      });
      return response || { authenticated: false };
    } catch (error) {
      console.error('LaunchFast: Auth check failed:', error);
      return { authenticated: false };
    }
  }

  /**
   * Check if current page is supported
   */
  isSupportedPage() {
    const url = window.location.href;
    const supportedPatterns = [
      /\/s\?/, // Search results
      /\/dp\//, // Product pages
      /\/b\?node=/, // Category pages
      /\/deals/ // Deals pages
    ];
    
    return supportedPatterns.some(pattern => pattern.test(url));
  }

  /**
   * Start processing products on the page
   */
  async startProcessing() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    try {
      console.log('LaunchFast: Starting product processing');
      
      // Extract products from page
      const products = window.AmazonProductExtractor?.extractAllProducts() || [];
      
      if (products.length === 0) {
        console.log('LaunchFast: No products found on page');
        return;
      }

      console.log(`LaunchFast: Found ${products.length} products to process`);
      
      // Process products in batches
      await this.processBatchedProducts(products);
      
    } catch (error) {
      console.error('LaunchFast: Product processing failed:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process products in batches to avoid overwhelming the API
   */
  async processBatchedProducts(products) {
    const batches = this.chunkArray(products, this.maxConcurrent);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      console.log(`LaunchFast: Processing batch ${i + 1}/${batches.length} (${batch.length} products)`);
      
      // Process batch in parallel
      const batchPromises = batch.map(product => this.processProduct(product));
      await Promise.all(batchPromises);
      
      // Delay between batches (except for last batch)
      if (i < batches.length - 1) {
        await this.delay(this.processDelay);
      }
    }
  }

  /**
   * Process individual product
   */
  async processProduct(product) {
    const { asin, container, injectionPoint } = product;
    
    try {
      // Skip if already processed
      if (this.processedProducts.has(asin)) {
        return;
      }

      // Skip if badge already exists
      if (window.LaunchFastBadgeCreator?.hasBadge(asin)) {
        return;
      }

      this.processedProducts.add(asin);
      
      // Create and inject loading badge
      const loadingBadge = window.LaunchFastBadgeCreator?.createLoadingBadge(asin);
      if (loadingBadge && container) {
        window.LaunchFastBadgeCreator?.injectBadge(container, loadingBadge);
      }

      // Get product analysis
      const analysisData = await this.analyzeProduct(asin);
      
      if (analysisData && !analysisData.error) {
        // Update badge with analysis data
        window.LaunchFastBadgeCreator?.updateBadge(asin, analysisData);
      } else {
        // Show error badge
        const errorBadge = window.LaunchFastBadgeCreator?.createErrorBadge(
          asin, 
          analysisData?.error || 'Analysis failed'
        );
        
        // Replace loading badge with error badge
        window.LaunchFastBadgeCreator?.removeBadge(asin);
        if (errorBadge && container) {
          window.LaunchFastBadgeCreator?.injectBadge(container, errorBadge);
        }
      }
      
    } catch (error) {
      console.error(`LaunchFast: Product processing failed for ${asin}:`, error);
      
      // Show error badge
      const errorBadge = window.LaunchFastBadgeCreator?.createErrorBadge(asin, error.message);
      window.LaunchFastBadgeCreator?.removeBadge(asin);
      if (errorBadge && product.container) {
        window.LaunchFastBadgeCreator?.injectBadge(product.container, errorBadge);
      }
    }
  }

  /**
   * Analyze product using LaunchFast API
   */
  async analyzeProduct(asin) {
    try {
      console.log(`LaunchFast: Analyzing product ${asin}`);
      
      const response = await chrome.runtime.sendMessage({
        type: 'ANALYZE_PRODUCTS',
        data: [{ asin }]
      });

      if (response.success && response.data?.length > 0) {
        return response.data[0];
      } else {
        throw new Error(response.error || 'No analysis data received');
      }
    } catch (error) {
      console.error(`LaunchFast: Analysis failed for ${asin}:`, error);
      return { error: error.message };
    }
  }

  /**
   * Setup observers for dynamic content
   */
  setupObservers() {
    if (this.observerActive) return;
    
    // Intersection Observer for lazy loading
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        const visibleProducts = [];
        
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const container = entry.target;
            const asin = window.AmazonProductExtractor?.extractASIN(container);
            
            if (asin && !this.processedProducts.has(asin)) {
              visibleProducts.push({
                asin,
                container,
                injectionPoint: window.AmazonProductExtractor?.findInjectionPoint(container)
              });
            }
          }
        });
        
        if (visibleProducts.length > 0) {
          this.processBatchedProducts(visibleProducts);
        }
      },
      {
        rootMargin: '100px', // Start loading when 100px away
        threshold: 0.1
      }
    );

    // Mutation Observer for new content
    this.mutationObserver = new MutationObserver(
      this.debounce((mutations) => {
        let hasNewProducts = false;
        
        mutations.forEach(mutation => {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if new product containers were added
              const productContainers = node.querySelectorAll?.(
                '.s-result-item[data-asin], [data-csa-c-item-id*="amzn1.asin"]'
              ) || [];
              
              if (productContainers.length > 0) {
                hasNewProducts = true;
              }
            }
          });
        });
        
        if (hasNewProducts) {
          console.log('LaunchFast: New products detected, starting analysis');
          this.startProcessing();
        }
      }, 1000)
    );

    // Start observing
    const productContainers = document.querySelectorAll('.s-result-item');
    productContainers.forEach(container => {
      this.intersectionObserver.observe(container);
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    this.observerActive = true;
    console.log('LaunchFast: Observers setup complete');
  }

  /**
   * Show authentication prompt
   */
  showAuthenticationPrompt() {
    const promptHtml = `
      <div id="launchfast-auth-prompt" style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border: 2px solid #f97316;
        border-radius: 8px;
        padding: 16px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        max-width: 300px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
      ">
        <div style="display: flex; align-items: center; margin-bottom: 12px;">
          <span style="font-size: 18px; margin-right: 8px;">🚀</span>
          <strong>LaunchFast Extension</strong>
        </div>
        <p style="margin: 0 0 12px 0; color: #666;">
          Please log in to LaunchFast to enable product analysis.
        </p>
        <div style="display: flex; gap: 8px;">
          <button id="launchfast-login-btn" style="
            background: #f97316;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 8px 16px;
            cursor: pointer;
            font-size: 12px;
          ">Login</button>
          <button id="launchfast-dismiss-btn" style="
            background: #f3f4f6;
            color: #374151;
            border: none;
            border-radius: 4px;
            padding: 8px 16px;
            cursor: pointer;
            font-size: 12px;
          ">Dismiss</button>
        </div>
      </div>
    `;

    const promptElement = document.createElement('div');
    promptElement.innerHTML = promptHtml;
    document.body.appendChild(promptElement);

    // Add event listeners
    document.getElementById('launchfast-login-btn')?.addEventListener('click', () => {
      window.open('https://launchfastlegacyx.com/login?source=extension', '_blank');
      promptElement.remove();
    });

    document.getElementById('launchfast-dismiss-btn')?.addEventListener('click', () => {
      promptElement.remove();
    });

    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      if (promptElement.parentNode) {
        promptElement.remove();
      }
    }, 10000);
  }

  /**
   * Handle page navigation
   */
  handlePageNavigation() {
    // Clean up existing badges and state
    window.LaunchFastBadgeCreator?.cleanup();
    this.processedProducts.clear();
    
    // Reset extractor state
    window.AmazonProductExtractor?.reset();
    
    // Restart processing if page is supported
    if (this.isSupportedPage()) {
      setTimeout(() => {
        this.startProcessing();
      }, 1000); // Small delay to let page content load
    }
  }

  /**
   * Set up message listener for background script requests
   */
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        case 'CHECK_AUTH_STATUS':
          this.handleAuthStatusRequest(sendResponse);
          return true; // Async response
          
        case 'INITIATE_LOGIN':
          this.handleLoginRequest(sendResponse);
          return true; // Async response
          
        default:
          return false;
      }
    });
  }

  /**
   * Handle auth status request from background script
   */
  async handleAuthStatusRequest(sendResponse) {
    try {
      console.log('📱 Content: Handling auth status request');
      const authStatus = await LaunchFastSupabase.getAuthStatus();
      sendResponse(authStatus);
    } catch (error) {
      console.error('Content: Auth status check failed:', error);
      sendResponse({
        authenticated: false,
        error: error.message
      });
    }
  }

  /**
   * Handle login request from background script
   */
  async handleLoginRequest(sendResponse) {
    try {
      console.log('📱 Content: Handling login request');
      // Redirect to LaunchFast login page
      window.open('https://launchfastlegacyx.com/login', '_blank');
      sendResponse({
        success: true,
        message: 'Redirected to login page'
      });
    } catch (error) {
      console.error('Content: Login request failed:', error);
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Utility functions
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Cleanup on page unload
   */
  cleanup() {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }
    
    window.LaunchFastBadgeCreator?.cleanup();
    this.processedProducts.clear();
    this.observerActive = false;
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.AmazonInjector = new AmazonInjector();
  });
} else {
  window.AmazonInjector = new AmazonInjector();
}

// Handle page navigation (for SPAs)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    console.log('LaunchFast: Page navigation detected');
    
    if (window.AmazonInjector) {
      window.AmazonInjector.handlePageNavigation();
    }
  }
}).observe(document, { subtree: true, childList: true });

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (window.AmazonInjector) {
    window.AmazonInjector.cleanup();
  }
});

console.log('LaunchFast: Amazon Injector script loaded');