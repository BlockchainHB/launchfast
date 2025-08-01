/**
 * LaunchFast API Client for Chrome Extension
 * Handles communication with LaunchFast backend APIs
 */

class LaunchFastAPIClient {
  constructor() {
    this.baseUrl = this.getApiBaseUrl();
    this.requestTimeout = 30000; // 30 seconds
    this.maxRetries = 3;
  }

  /**
   * Get API base URL based on environment
   */
  getApiBaseUrl() {
    // This will be configured based on extension settings
    return 'https://your-launchfast-domain.vercel.app'; // Replace with actual domain
  }

  /**
   * Make authenticated API request
   */
  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'LaunchFast-Chrome-Extension/1.0.0'
      },
      credentials: 'include', // Include cookies for authentication
      timeout: this.requestTimeout,
      ...options
    };

    let lastError;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`API Request (attempt ${attempt}):`, url);
        
        const response = await fetch(url, defaultOptions);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        // Handle different content types
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          return await response.json();
        } else if (contentType?.includes('text/event-stream')) {
          return response; // Return response for streaming
        } else {
          return await response.text();
        }
        
      } catch (error) {
        lastError = error;
        console.error(`API request failed (attempt ${attempt}):`, error);
        
        // Don't retry on authentication errors
        if (error.message.includes('401') || error.message.includes('403')) {
          break;
        }
        
        // Exponential backoff for retries
        if (attempt < this.maxRetries) {
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Analyze products using streaming API
   */
  async analyzeProductStream(asin) {
    try {
      const response = await this.makeRequest(`/api/products/research/asin/stream?asin=${asin}`, {
        method: 'GET'
      });
      
      return this.processStreamResponse(response);
    } catch (error) {
      console.error('Stream analysis failed:', error);
      throw error;
    }
  }

  /**
   * Process streaming API response
   */
  async processStreamResponse(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let analysisResult = null;
    let progress = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              // Update progress
              progress = data.progress || 0;
              
              // Check for completion
              if (data.phase === 'complete' && data.data?.products?.length > 0) {
                analysisResult = data.data.products[0];
                break;
              }
              
              // Check for errors
              if (data.phase === 'error') {
                throw new Error(data.message || 'Analysis failed');
              }
              
            } catch (parseError) {
              console.warn('Failed to parse streaming data:', parseError);
            }
          }
        }
        
        if (analysisResult) break;
      }
    } finally {
      reader.releaseLock();
    }

    if (!analysisResult) {
      throw new Error('No analysis result received from stream');
    }

    return analysisResult;
  }

  /**
   * Get product analysis (fallback non-streaming)
   */
  async analyzeProduct(asin) {
    try {
      const response = await this.makeRequest('/api/products/research', {
        method: 'POST',
        body: JSON.stringify({
          keyword: asin,
          limit: 1,
          type: 'asin'
        })
      });

      if (response.success && response.data?.length > 0) {
        return response.data[0];
      } else {
        throw new Error('No product data received');
      }
    } catch (error) {
      console.error('Product analysis failed:', error);
      throw error;
    }
  }

  /**
   * Save product to LaunchFast dashboard
   */
  async saveProduct(productData) {
    try {
      const response = await this.makeRequest('/api/products/save', {
        method: 'POST',
        body: JSON.stringify(productData)
      });

      return response;
    } catch (error) {
      console.error('Product save failed:', error);
      throw error;
    }
  }

  /**
   * Check user authentication status
   */
  async checkAuth() {
    try {
      const response = await this.makeRequest('/api/auth/user', {
        method: 'GET'
      });

      return {
        authenticated: true,
        user: response
      };
    } catch (error) {
      if (error.message.includes('401')) {
        return {
          authenticated: false,
          error: 'Not authenticated'
        };
      }
      throw error;
    }
  }

  /**
   * Get user subscription info
   */
  async getSubscriptionInfo() {
    try {
      const response = await this.makeRequest('/api/user/subscription', {
        method: 'GET'
      });

      return response;
    } catch (error) {
      console.error('Subscription check failed:', error);
      throw error;
    }
  }

  /**
   * Batch analyze multiple products
   */
  async batchAnalyzeProducts(asins, onProgress = null) {
    const results = [];
    const total = asins.length;
    
    for (let i = 0; i < asins.length; i++) {
      const asin = asins[i];
      
      try {
        // Update progress
        if (onProgress) {
          onProgress({
            current: i + 1,
            total,
            asin,
            progress: Math.round(((i + 1) / total) * 100)
          });
        }
        
        const result = await this.analyzeProductStream(asin);
        results.push(result);
        
        // Rate limiting delay
        if (i < asins.length - 1) {
          await this.delay(1000); // 1 second between requests
        }
        
      } catch (error) {
        console.error(`Failed to analyze ASIN ${asin}:`, error);
        results.push({
          asin,
          error: error.message,
          grade: 'Unknown',
          failed: true
        });
      }
    }
    
    return results;
  }

  /**
   * Utility: Delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate ASIN format
   */
  isValidASIN(asin) {
    const asinRegex = /^[A-Z0-9]{10}$/;
    return asinRegex.test(asin);
  }

  /**
   * Extract ASIN from Amazon URL
   */
  extractASINFromUrl(url) {
    const match = url.match(/\/dp\/([A-Z0-9]{10})/);
    return match ? match[1] : null;
  }
}

// Create global instance
if (typeof window !== 'undefined') {
  window.LaunchFastAPI = new LaunchFastAPIClient();
} else {
  // For background script
  globalThis.LaunchFastAPI = new LaunchFastAPIClient();
}