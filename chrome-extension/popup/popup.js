/**
 * LaunchFast Chrome Extension Popup
 * Handles popup UI interactions and settings management
 */

class PopupManager {
  constructor() {
    this.settings = {};
    this.authStatus = null;
    this.stats = {
      productsAnalyzed: 0,
      productsSaved: 0
    };
    
    this.init();
  }

  /**
   * Initialize popup
   */
  async init() {
    try {
      // Show loading state
      this.showState('loading');
      
      // Load data in parallel
      await Promise.all([
        this.loadSettings(),
        this.checkAuthentication(),
        this.loadStats(),
        this.checkCurrentPage()
      ]);
      
      // Setup UI
      this.setupEventListeners();
      this.updateUI();
      
      // Show appropriate state
      if (this.authStatus?.authenticated) {
        this.showState('main');
      } else {
        this.showState('auth-required');
      }
      
    } catch (error) {
      console.error('Popup initialization failed:', error);
      this.showError(error.message);
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
      
      this.settings = response || {
        isEnabled: true,
        showCards: true,
        autoAnalyze: true
      };
    } catch (error) {
      console.error('Failed to load settings:', error);
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
      
      this.authStatus = response || { authenticated: false };
    } catch (error) {
      console.error('Auth check failed:', error);
      this.authStatus = { authenticated: false };
    }
  }

  /**
   * Load usage statistics
   */
  async loadStats() {
    try {
      // Get stats from local storage
      const result = await chrome.storage.local.get([
        'stats_products_analyzed',
        'stats_products_saved'
      ]);
      
      this.stats = {
        productsAnalyzed: result.stats_products_analyzed || 0,
        productsSaved: result.stats_products_saved || 0
      };
    } catch (error) {
      console.error('Failed to load stats:', error);
      this.stats = {
        productsAnalyzed: 0,
        productsSaved: 0
      };
    }
  }

  /**
   * Check current page status
   */
  async checkCurrentPage() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab) {
        this.currentPage = {
          url: tab.url,
          isAmazon: /amazon\.com/.test(tab.url),
          isSupported: this.isSupportedPage(tab.url)
        };
      } else {
        this.currentPage = {
          url: '',
          isAmazon: false,
          isSupported: false
        };
      }
    } catch (error) {
      console.error('Failed to check current page:', error);
      this.currentPage = {
        url: '',
        isAmazon: false,
        isSupported: false
      };
    }
  }

  /**
   * Check if page is supported
   */
  isSupportedPage(url) {
    const supportedPatterns = [
      /\/s\?/, // Search results
      /\/dp\//, // Product pages
      /\/b\?node=/, // Category pages
      /\/deals/ // Deals pages
    ];
    
    return supportedPatterns.some(pattern => pattern.test(url));
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Toggle switches
    this.setupToggle('toggle-enabled', 'isEnabled');
    this.setupToggle('toggle-cards', 'showCards');
    this.setupToggle('toggle-auto', 'autoAnalyze');
    
    // Action buttons
    document.getElementById('analyze-page-btn')?.addEventListener('click', () => {
      this.analyzeCurrentPage();
    });
    
    document.getElementById('clear-cache-btn')?.addEventListener('click', () => {
      this.clearCache();
    });
    
    document.getElementById('retry-btn')?.addEventListener('click', () => {
      this.init();
    });
    
    document.getElementById('refresh-auth-btn')?.addEventListener('click', () => {
      this.refreshAuthentication();
    });
  }

  /**
   * Setup toggle switch
   */
  setupToggle(toggleId, settingKey) {
    const toggle = document.getElementById(toggleId);
    if (!toggle) return;
    
    // Set initial state
    if (this.settings[settingKey]) {
      toggle.classList.add('active');
    }
    
    // Add click handler
    toggle.addEventListener('click', async () => {
      const newValue = !this.settings[settingKey];
      this.settings[settingKey] = newValue;
      
      // Update UI
      if (newValue) {
        toggle.classList.add('active');
      } else {
        toggle.classList.remove('active');
      }
      
      // Save setting
      try {
        await chrome.runtime.sendMessage({
          type: 'UPDATE_SETTINGS',
          data: { [settingKey]: newValue }
        });
        
        this.showSuccess('Setting updated successfully');
      } catch (error) {
        console.error('Failed to update setting:', error);
        this.showError('Failed to update setting');
        
        // Revert UI
        this.settings[settingKey] = !newValue;
        if (!newValue) {
          toggle.classList.add('active');
        } else {
          toggle.classList.remove('active');
        }
      }
    });
  }

  /**
   * Update UI with current data
   */
  updateUI() {
    // Status section
    const extensionStatus = document.getElementById('extension-status');
    if (extensionStatus) {
      extensionStatus.textContent = this.settings.isEnabled ? 'Enabled' : 'Disabled';
      extensionStatus.className = this.settings.isEnabled ? 'status-value status-online' : 'status-value status-offline';
    }
    
    const authStatus = document.getElementById('auth-status');
    if (authStatus) {
      if (this.authStatus?.authenticated) {
        authStatus.textContent = 'Authenticated';
        authStatus.className = 'status-value status-online';
      } else {
        authStatus.textContent = 'Not Authenticated';
        authStatus.className = 'status-value status-offline';
      }
    }
    
    const pageStatus = document.getElementById('page-status');
    if (pageStatus) {
      if (this.currentPage?.isSupported) {
        pageStatus.textContent = 'Supported';
        pageStatus.className = 'status-value status-online';
      } else if (this.currentPage?.isAmazon) {
        pageStatus.textContent = 'Amazon (Limited)';
        pageStatus.className = 'status-value status-unknown';
      } else {
        pageStatus.textContent = 'Not Supported';
        pageStatus.className = 'status-value status-offline';
      }
    }
    
    // Stats section
    const productsAnalyzed = document.getElementById('products-analyzed');
    if (productsAnalyzed) {
      productsAnalyzed.textContent = this.stats.productsAnalyzed.toLocaleString();
    }
    
    const productsSaved = document.getElementById('products-saved');
    if (productsSaved) {
      productsSaved.textContent = this.stats.productsSaved.toLocaleString();
    }
    
    // Enable/disable analyze button
    const analyzeBtn = document.getElementById('analyze-page-btn');
    if (analyzeBtn) {
      if (this.currentPage?.isSupported && this.authStatus?.authenticated) {
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = 'Analyze Current Page';
      } else if (!this.authStatus?.authenticated) {
        analyzeBtn.disabled = true;
        analyzeBtn.textContent = 'Login Required';
      } else {
        analyzeBtn.disabled = true;
        analyzeBtn.textContent = 'Page Not Supported';
      }
    }
  }

  /**
   * Analyze current page
   */
  async analyzeCurrentPage() {
    try {
      const analyzeBtn = document.getElementById('analyze-page-btn');
      if (analyzeBtn) {
        analyzeBtn.textContent = 'Analyzing...';
        analyzeBtn.disabled = true;
      }
      
      // Send message to content script to start analysis
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab) {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'START_ANALYSIS'
        });
        
        this.showSuccess('Analysis started');
        
        // Update stats
        await this.updateStats('productsAnalyzed', 1);
      }
      
    } catch (error) {
      console.error('Page analysis failed:', error);
      this.showError('Failed to analyze page');
    } finally {
      const analyzeBtn = document.getElementById('analyze-page-btn');
      if (analyzeBtn) {
        analyzeBtn.textContent = 'Analyze Current Page';
        analyzeBtn.disabled = false;
      }
    }
  }

  /**
   * Clear extension cache
   */
  async clearCache() {
    try {
      const clearBtn = document.getElementById('clear-cache-btn');
      if (clearBtn) {
        clearBtn.textContent = 'Clearing...';
        clearBtn.disabled = true;
      }
      
      // Clear local storage (keep settings)
      const keysToRemove = [];
      const allKeys = await chrome.storage.local.get();
      
      Object.keys(allKeys).forEach(key => {
        if (key.startsWith('product_') || key.startsWith('cache_')) {
          keysToRemove.push(key);
        }
      });
      
      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
      }
      
      this.showSuccess(`Cleared ${keysToRemove.length} cached items`);
      
    } catch (error) {
      console.error('Cache clear failed:', error);
      this.showError('Failed to clear cache');
    } finally {
      const clearBtn = document.getElementById('clear-cache-btn');
      if (clearBtn) {
        clearBtn.textContent = 'Clear Cache';
        clearBtn.disabled = false;
      }
    }
  }

  /**
   * Refresh authentication status
   */
  async refreshAuthentication() {
    try {
      const refreshBtn = document.getElementById('refresh-auth-btn');
      if (refreshBtn) {
        refreshBtn.textContent = 'Checking...';
        refreshBtn.disabled = true;
      }
      
      await this.checkAuthentication();
      
      if (this.authStatus?.authenticated) {
        this.showState('main');
        this.updateUI();
        this.showSuccess('Authentication verified');
      } else {
        this.showError('Still not authenticated');
      }
      
    } catch (error) {
      console.error('Auth refresh failed:', error);
      this.showError('Failed to check authentication');
    } finally {
      const refreshBtn = document.getElementById('refresh-auth-btn');
      if (refreshBtn) {
        refreshBtn.textContent = 'Check Authentication';
        refreshBtn.disabled = false;
      }
    }
  }

  /**
   * Update usage statistics
   */
  async updateStats(statKey, increment = 1) {
    try {
      const storageKey = `stats_${statKey.replace(/([A-Z])/g, '_$1').toLowerCase()}`;
      const newValue = this.stats[statKey] + increment;
      
      this.stats[statKey] = newValue;
      await chrome.storage.local.set({ [storageKey]: newValue });
      
      // Update UI
      this.updateUI();
    } catch (error) {
      console.error('Failed to update stats:', error);
    }
  }

  /**
   * Show specific state
   */
  showState(stateName) {
    const states = ['loading', 'main', 'auth-required', 'error'];
    
    states.forEach(state => {
      const element = document.getElementById(`${state}-state`);
      if (element) {
        if (state === stateName) {
          element.classList.remove('hidden');
        } else {
          element.classList.add('hidden');
        }
      }
    });
  }

  /**
   * Show error message
   */
  showError(message) {
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
      errorElement.textContent = message;
    }
    
    this.showState('error');
  }

  /**
   * Show success message
   */
  showSuccess(message) {
    // Create temporary success message
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    
    const content = document.getElementById('main-content');
    if (content) {
      content.insertBefore(successDiv, content.firstChild);
      
      // Remove after 3 seconds
      setTimeout(() => {
        if (successDiv.parentNode) {
          successDiv.parentNode.removeChild(successDiv);
        }
      }, 3000);
    }
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});

// Handle popup opening
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'POPUP_OPENED') {
    // Popup was opened, refresh data
    location.reload();
  }
});