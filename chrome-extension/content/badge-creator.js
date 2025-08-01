/**
 * LaunchFast Badge Creator
 * Creates and manages A10-F1 product analysis cards for Amazon pages
 */

class LaunchFastBadgeCreator {
  constructor() {
    this.badges = new Map(); // Track created badges by ASIN
    this.loadingBadges = new Set(); // Track badges currently loading
    this.gradeColors = this.initGradeColors();
  }

  /**
   * Initialize grade color mapping
   */
  initGradeColors() {
    return {
      'A10': { bg: '#dcfce7', border: '#16a34a', text: '#15803d' },
      'A9': { bg: '#dcfce7', border: '#16a34a', text: '#15803d' },
      'A8': { bg: '#dcfce7', border: '#16a34a', text: '#15803d' },
      'A7': { bg: '#dcfce7', border: '#16a34a', text: '#15803d' },
      'A6': { bg: '#d1fae5', border: '#059669', text: '#047857' },
      'A5': { bg: '#d1fae5', border: '#059669', text: '#047857' },
      'A4': { bg: '#d1fae5', border: '#059669', text: '#047857' },
      'A3': { bg: '#d1fae5', border: '#059669', text: '#047857' },
      'A2': { bg: '#d1fae5', border: '#059669', text: '#047857' },
      'A1': { bg: '#d1fae5', border: '#059669', text: '#047857' },
      'B10': { bg: '#ecfdf5', border: '#84cc16', text: '#65a30d' },
      'B9': { bg: '#ecfdf5', border: '#84cc16', text: '#65a30d' },
      'B8': { bg: '#ecfdf5', border: '#84cc16', text: '#65a30d' },
      'B7': { bg: '#ecfdf5', border: '#84cc16', text: '#65a30d' },
      'B6': { bg: '#f7fee7', border: '#65a30d', text: '#4d7c0f' },
      'B5': { bg: '#f7fee7', border: '#65a30d', text: '#4d7c0f' },
      'B4': { bg: '#f7fee7', border: '#65a30d', text: '#4d7c0f' },
      'B3': { bg: '#f7fee7', border: '#65a30d', text: '#4d7c0f' },
      'B2': { bg: '#f7fee7', border: '#65a30d', text: '#4d7c0f' },
      'B1': { bg: '#f7fee7', border: '#65a30d', text: '#4d7c0f' },
      'C10': { bg: '#fefce8', border: '#eab308', text: '#ca8a04' },
      'C9': { bg: '#fefce8', border: '#eab308', text: '#ca8a04' },
      'C8': { bg: '#fefce8', border: '#eab308', text: '#ca8a04' },
      'C7': { bg: '#fefce8', border: '#eab308', text: '#ca8a04' },
      'C6': { bg: '#fffbeb', border: '#ca8a04', text: '#a16207' },
      'C5': { bg: '#fffbeb', border: '#ca8a04', text: '#a16207' },
      'C4': { bg: '#fffbeb', border: '#ca8a04', text: '#a16207' },
      'C3': { bg: '#fffbeb', border: '#ca8a04', text: '#a16207' },
      'C2': { bg: '#fffbeb', border: '#ca8a04', text: '#a16207' },
      'C1': { bg: '#fffbeb', border: '#ca8a04', text: '#a16207' },
      'D10': { bg: '#fff7ed', border: '#f97316', text: '#ea580c' },
      'D9': { bg: '#fff7ed', border: '#f97316', text: '#ea580c' },
      'D8': { bg: '#fff7ed', border: '#f97316', text: '#ea580c' },
      'D7': { bg: '#fff7ed', border: '#f97316', text: '#ea580c' },
      'D6': { bg: '#fed7aa', border: '#ea580c', text: '#c2410c' },
      'D5': { bg: '#fed7aa', border: '#ea580c', text: '#c2410c' },
      'D4': { bg: '#fed7aa', border: '#ea580c', text: '#c2410c' },
      'D3': { bg: '#fed7aa', border: '#ea580c', text: '#c2410c' },
      'D2': { bg: '#fed7aa', border: '#ea580c', text: '#c2410c' },
      'D1': { bg: '#fed7aa', border: '#ea580c', text: '#c2410c' },
      'F1': { bg: '#fef2f2', border: '#ef4444', text: '#dc2626' },
      'Unknown': { bg: '#f9fafb', border: '#6b7280', text: '#374151' }
    };
  }

  /**
   * Create loading badge
   */
  createLoadingBadge(asin) {
    const loadingHtml = `
      <div class="launchfast-badge launchfast-loading" data-asin="${asin}">
        <div class="launchfast-header">
          <div class="launchfast-logo">
            🚀 LaunchFast
          </div>
          <div class="launchfast-loading-spinner"></div>
        </div>
        <div class="launchfast-loading-text">
          Analyzing product...
        </div>
      </div>
    `;

    const badge = this.createBadgeElement(loadingHtml);
    this.loadingBadges.add(asin);
    return badge;
  }

  /**
   * Create error badge
   */
  createErrorBadge(asin, error) {
    const errorHtml = `
      <div class="launchfast-badge launchfast-error" data-asin="${asin}">
        <div class="launchfast-header">
          <div class="launchfast-logo">
            🚀 LaunchFast
          </div>
          <div class="launchfast-grade launchfast-grade-error">
            ⚠️
          </div>
        </div>
        <div class="launchfast-error-message">
          ${error || 'Analysis failed'}
        </div>
        <div class="launchfast-actions">
          <button class="launchfast-btn launchfast-btn-retry" data-asin="${asin}">
            Retry Analysis
          </button>
        </div>
      </div>
    `;

    return this.createBadgeElement(errorHtml);
  }

  /**
   * Create complete analysis badge
   */
  createAnalysisBadge(productData) {
    const { asin, grade, calculatedMetrics, salesData, aiAnalysis } = productData;
    
    const gradeColor = this.gradeColors[grade] || this.gradeColors['Unknown'];
    const monthlyProfit = salesData?.monthlyProfit || calculatedMetrics?.monthlyProfit || 0;
    const margin = salesData?.margin || calculatedMetrics?.margin || 0;
    const monthlyRevenue = salesData?.monthlyRevenue || calculatedMetrics?.monthlyRevenue || 0;
    const reviews = productData.reviews || 0;
    const isSponsored = productData.isSponsored || false;
    const riskClass = aiAnalysis?.riskClassification || 'Unknown';

    // Format numbers
    const formattedProfit = this.formatCurrency(monthlyProfit);
    const formattedRevenue = this.formatCurrency(monthlyRevenue);
    const formattedMargin = Math.round(margin * 100);
    const competitionLevel = this.getCompetitionLevel(reviews);

    const badgeHtml = `
      <div class="launchfast-badge" data-asin="${asin}">
        <div class="launchfast-header">
          <div class="launchfast-logo">
            🚀 LaunchFast
          </div>
          <div class="launchfast-grade" style="background-color: ${gradeColor.bg}; border-color: ${gradeColor.border}; color: ${gradeColor.text};">
            ${grade}
          </div>
        </div>
        
        <div class="launchfast-metrics">
          <div class="launchfast-metric-row">
            <div class="launchfast-metric">
              <span class="launchfast-label">Profit:</span>
              <span class="launchfast-value">${formattedProfit}/mo</span>
            </div>
            <div class="launchfast-metric">
              <span class="launchfast-label">Margin:</span>
              <span class="launchfast-value">${formattedMargin}%</span>
            </div>
          </div>
          
          <div class="launchfast-metric-row">
            <div class="launchfast-metric">
              <span class="launchfast-label">Revenue:</span>
              <span class="launchfast-value">${formattedRevenue}/mo</span>
            </div>
            <div class="launchfast-metric">
              <span class="launchfast-label">Competition:</span>
              <span class="launchfast-value">${competitionLevel}</span>
            </div>
          </div>
          
          <div class="launchfast-tags">
            ${isSponsored ? '<span class="launchfast-tag launchfast-tag-sponsored">Sponsored</span>' : '<span class="launchfast-tag launchfast-tag-organic">Organic</span>'}
            <span class="launchfast-tag launchfast-tag-risk">${riskClass}</span>
            <span class="launchfast-tag launchfast-tag-reviews">${reviews.toLocaleString()} reviews</span>
          </div>
        </div>
        
        <div class="launchfast-actions">
          <button class="launchfast-btn launchfast-btn-primary launchfast-btn-analyze" data-asin="${asin}">
            Full Analysis
          </button>
          <button class="launchfast-btn launchfast-btn-secondary launchfast-btn-save" data-asin="${asin}">
            Save Product
          </button>
        </div>
      </div>
    `;

    return this.createBadgeElement(badgeHtml);
  }

  /**
   * Create DOM element from HTML string
   */
  createBadgeElement(html) {
    const template = document.createElement('div');
    template.innerHTML = html.trim();
    const badge = template.firstChild;
    
    // Add event listeners
    this.attachEventListeners(badge);
    
    return badge;
  }

  /**
   * Attach event listeners to badge
   */
  attachEventListeners(badge) {
    const asin = badge.dataset.asin;

    // Retry button
    const retryBtn = badge.querySelector('.launchfast-btn-retry');
    if (retryBtn) {
      retryBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleRetryAnalysis(asin);
      });
    }

    // Full analysis button
    const analyzeBtn = badge.querySelector('.launchfast-btn-analyze');
    if (analyzeBtn) {
      analyzeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleFullAnalysis(asin);
      });
    }

    // Save product button
    const saveBtn = badge.querySelector('.launchfast-btn-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleSaveProduct(asin);
      });
    }
  }

  /**
   * Handle retry analysis
   */
  async handleRetryAnalysis(asin) {
    try {
      // Remove existing badge
      this.removeBadge(asin);
      
      // Trigger new analysis
      if (window.AmazonInjector) {
        window.AmazonInjector.analyzeProduct(asin);
      }
    } catch (error) {
      console.error('Retry analysis failed:', error);
    }
  }

  /**
   * Handle full analysis action
   */
  handleFullAnalysis(asin) {
    // Open LaunchFast dashboard with product analysis
    const url = `https://launchfastlegacyx.com/dashboard?asin=${asin}&source=extension`;
    window.open(url, '_blank');
  }

  /**
   * Handle save product action
   */
  async handleSaveProduct(asin) {
    try {
      const saveBtn = document.querySelector(`[data-asin="${asin}"] .launchfast-btn-save`);
      if (saveBtn) {
        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;
      }

      // Send message to background script to save product
      const response = await chrome.runtime.sendMessage({
        type: 'SAVE_PRODUCT',
        data: { asin }
      });

      if (response.success) {
        if (saveBtn) {
          saveBtn.textContent = 'Saved ✓';
          saveBtn.classList.add('launchfast-btn-success');
        }
      } else {
        throw new Error(response.error || 'Save failed');
      }
    } catch (error) {
      console.error('Save product failed:', error);
      const saveBtn = document.querySelector(`[data-asin="${asin}"] .launchfast-btn-save`);
      if (saveBtn) {
        saveBtn.textContent = 'Save Failed';
        saveBtn.disabled = false;
        saveBtn.classList.add('launchfast-btn-error');
      }
    }
  }

  /**
   * Inject badge into product container
   */
  injectBadge(productContainer, badge) {
    try {
      // Find the best injection point
      const injectionPoint = this.findInjectionPoint(productContainer);
      
      if (injectionPoint) {
        // Insert after the injection point
        injectionPoint.parentNode.insertBefore(badge, injectionPoint.nextSibling);
        
        // Track the badge
        const asin = badge.dataset.asin;
        this.badges.set(asin, badge);
        
        console.log(`LaunchFast: Badge injected for ASIN ${asin}`);
        return true;
      } else {
        console.warn('LaunchFast: No suitable injection point found');
        return false;
      }
    } catch (error) {
      console.error('LaunchFast: Badge injection failed:', error);
      return false;
    }
  }

  /**
   * Find optimal injection point in product container
   */
  findInjectionPoint(container) {
    // Try injection points in priority order
    const selectors = [
      '[data-cy="price-recipe"]',
      '[data-cy="reviews-block"]',
      '[data-cy="delivery-recipe"]',
      '.a-price',
      '.a-row.a-size-small'
    ];

    for (const selector of selectors) {
      const element = container.querySelector(selector);
      if (element) {
        return element;
      }
    }

    // Fallback: use container itself
    return container;
  }

  /**
   * Remove badge for specific ASIN
   */
  removeBadge(asin) {
    const badge = this.badges.get(asin);
    if (badge && badge.parentNode) {
      badge.parentNode.removeChild(badge);
      this.badges.delete(asin);
      this.loadingBadges.delete(asin);
    }
  }

  /**
   * Update existing badge with analysis data
   */
  updateBadge(asin, productData) {
    // Remove loading badge if exists
    if (this.loadingBadges.has(asin)) {
      this.removeBadge(asin);
    }

    // Create new analysis badge
    const badge = this.createAnalysisBadge(productData);
    
    // Find the original container
    const containers = window.AmazonProductExtractor?.findProductContainers() || [];
    const container = containers.find(c => 
      window.AmazonProductExtractor?.extractASIN(c) === asin
    );

    if (container) {
      this.injectBadge(container, badge);
    }
  }

  /**
   * Format currency values
   */
  formatCurrency(value) {
    if (!value || value === 0) return '$0';
    
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    } else {
      return `$${Math.round(value)}`;
    }
  }

  /**
   * Get competition level based on review count
   */
  getCompetitionLevel(reviews) {
    if (reviews < 20) return 'Very Low';
    if (reviews < 50) return 'Low';
    if (reviews < 200) return 'Medium';
    if (reviews < 500) return 'High';
    return 'Very High';
  }

  /**
   * Clean up all badges (for page navigation)
   */
  cleanup() {
    this.badges.forEach(badge => {
      if (badge.parentNode) {
        badge.parentNode.removeChild(badge);
      }
    });
    this.badges.clear();
    this.loadingBadges.clear();
  }

  /**
   * Check if badge already exists for ASIN
   */
  hasBadge(asin) {
    return this.badges.has(asin) || this.loadingBadges.has(asin);
  }
}

// Create global instance
window.LaunchFastBadgeCreator = new LaunchFastBadgeCreator();