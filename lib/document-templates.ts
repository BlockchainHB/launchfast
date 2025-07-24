// Updated document template - Launch Fast V1.0 - Notion-style design
export function generateAnalysisDocument(product: any, aiAnalysis: any): string {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const getRiskClass = (risk: string): string => {
    switch (risk?.toLowerCase()) {
      case 'prohibited':
      case 'medical':
        return 'risk-high'
      case 'electric':
      case 'breakable':
        return 'risk-medium'
      case 'safe':
      default:
        return 'risk-safe'
    }
  }

  const getMetricColor = (value: string, type: 'risk' | 'consistency'): string => {
    if (type === 'risk') {
      switch (value?.toLowerCase()) {
        case 'prohibited':
        case 'medical':
          return 'metric-high'
        case 'electric':
        case 'breakable':
          return 'metric-medium'
        case 'safe':
        default:
          return 'metric-safe'
      }
    } else {
      switch (value?.toLowerCase()) {
        case 'high':
          return 'metric-safe'
        case 'medium':
          return 'metric-medium'
        case 'low':
        default:
          return 'metric-high'
      }
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Product Analysis Report - ${product.asin}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol";
      line-height: 1.5;
      color: rgb(55, 53, 47);
      background: rgb(255, 255, 255);
      font-size: 16px;
      font-weight: 400;
    }
    
    .container {
      max-width: 900px;
      margin: 0 auto;
      padding: 0;
      background: white;
    }
    
    /* Clean header with custom image - matches content width */
    .header {
      background: url('/analysis-header.png') center center / cover;
      margin-bottom: 0;
      height: 225px;
    }
    
    
    /* Content area */
    .content {
      padding: 48px;
      background: white;
    }
    
    /* Page properties (Notion-style) */
    .page-properties {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 48px;
      padding: 24px;
      background: rgb(247, 246, 243);
      border-radius: 8px;
      border: 1px solid rgb(227, 226, 224);
    }
    
    .property {
      display: flex;
      align-items: center;
      min-height: 32px;
    }
    
    .property-name {
      font-size: 14px;
      color: rgb(120, 119, 116);
      font-weight: 500;
      min-width: 100px;
      margin-right: 12px;
    }
    
    .property-value {
      font-size: 14px;
      color: rgb(55, 53, 47);
      font-weight: 500;
    }
    
    .property-tag {
      background: rgb(221, 243, 228);
      color: rgb(28, 56, 41);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }
    
    .property-tag.risk-safe { background: rgb(219, 237, 219); color: rgb(28, 56, 41); }
    .property-tag.risk-medium { background: rgb(251, 243, 219); color: rgb(73, 69, 41); }
    .property-tag.risk-high { background: rgb(255, 226, 221); color: rgb(93, 23, 21); }
    
    /* Section styling */
    .section {
      margin-bottom: 48px;
    }
    
    .section-header {
      display: flex;
      align-items: center;
      margin-bottom: 24px;
    }
    
    .section-icon {
      width: 24px;
      height: 24px;
      margin-right: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }
    
    .section-title {
      font-size: 24px;
      font-weight: 600;
      color: rgb(55, 53, 47);
      line-height: 1.2;
    }
    
    /* Database-style blocks */
    .database-view {
      border: 1px solid rgb(227, 226, 224);
      border-radius: 8px;
      overflow: hidden;
      background: white;
    }
    
    .database-header {
      background: rgb(251, 250, 249);
      padding: 12px 16px;
      border-bottom: 1px solid rgb(227, 226, 224);
      font-size: 14px;
      font-weight: 600;
      color: rgb(55, 53, 47);
    }
    
    .database-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      border-bottom: 1px solid rgb(237, 236, 235);
    }
    
    .database-row:last-child {
      border-bottom: none;
    }
    
    .database-cell {
      padding: 12px 16px;
      font-size: 14px;
      display: flex;
      align-items: center;
    }
    
    .database-cell:first-child {
      color: rgb(120, 119, 116);
      border-right: 1px solid rgb(237, 236, 235);
      font-weight: 500;
    }
    
    .database-cell:last-child {
      color: rgb(55, 53, 47);
      font-weight: 500;
    }
    
    /* Callout blocks */
    .callout {
      display: flex;
      padding: 16px;
      border-radius: 8px;
      margin: 24px 0;
      border: 1px solid rgb(227, 226, 224);
    }
    
    .callout-icon {
      width: 24px;
      height: 24px;
      margin-right: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      flex-shrink: 0;
    }
    
    .callout-content {
      flex: 1;
    }
    
    .callout-content h4 {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 8px;
      color: rgb(55, 53, 47);
    }
    
    .callout-content p {
      font-size: 14px;
      line-height: 1.5;
      color: rgb(55, 53, 47);
      margin: 0;
    }
    
    .callout-success { background: rgb(237, 243, 236); }
    .callout-info { background: rgb(231, 243, 248); }
    .callout-warning { background: rgb(251, 243, 219); }
    
    /* Metrics cards */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin: 24px 0;
    }
    
    .metric-card {
      background: white;
      border: 1px solid rgb(227, 226, 224);
      border-radius: 8px;
      padding: 20px;
      text-align: center;
      transition: all 0.1s ease;
    }
    
    .metric-card:hover {
      border-color: rgb(55, 53, 47);
      box-shadow: rgb(15 15 15 / 10%) 0px 0px 0px 1px, rgb(15 15 15 / 10%) 0px 2px 4px;
    }
    
    .metric-value {
      font-size: 32px;
      font-weight: 700;
      line-height: 1;
      margin-bottom: 8px;
      color: rgb(55, 53, 47);
    }
    
    .metric-label {
      font-size: 12px;
      color: rgb(120, 119, 116);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 500;
    }
    
    .metric-safe { color: rgb(0, 135, 90); }
    .metric-medium { color: rgb(203, 145, 47); }
    .metric-high { color: rgb(212, 76, 71); }
    .metric-blue { color: rgb(0, 122, 255); }
    
    /* Toggle lists (collapsible content) */
    .toggle-list {
      margin: 16px 0;
    }
    
    .toggle-item {
      border: 1px solid rgb(227, 226, 224);
      border-radius: 8px;
      margin-bottom: 8px;
      background: white;
    }
    
    .toggle-header {
      padding: 12px 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      font-weight: 500;
      color: rgb(55, 53, 47);
      user-select: none;
    }
    
    .toggle-header:hover {
      background: rgb(251, 250, 249);
    }
    
    .toggle-icon {
      margin-right: 8px;
      font-size: 12px;
      transition: transform 0.1s ease;
    }
    
    .toggle-content {
      padding: 0 16px 16px 40px;
      color: rgb(120, 119, 116);
      font-size: 14px;
      line-height: 1.5;
    }
    
    .toggle-content ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    
    .toggle-content li {
      margin-bottom: 6px;
      position: relative;
      padding-left: 16px;
    }
    
    .toggle-content li:before {
      content: "•";
      position: absolute;
      left: 0;
      color: rgb(120, 119, 116);
    }
    
    /* Summary block */
    .summary-block {
      background: rgb(251, 250, 249);
      border: 1px solid rgb(227, 226, 224);
      border-radius: 8px;
      padding: 32px;
      margin: 32px 0;
    }
    
    .summary-block h3 {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 16px;
      color: rgb(55, 53, 47);
    }
    
    .summary-block p {
      font-size: 16px;
      line-height: 1.6;
      color: rgb(55, 53, 47);
      margin-bottom: 16px;
    }
    
    /* Footer */
    .footer {
      background: rgb(251, 250, 249);
      padding: 32px 48px;
      border-top: 1px solid rgb(227, 226, 224);
      font-size: 14px;
      color: rgb(120, 119, 116);
      line-height: 1.5;
    }
    
    .footer p {
      margin-bottom: 12px;
    }
    
    /* Responsive */
    @media (max-width: 768px) {
      .header {
        padding: 48px 24px 32px;
      }
      
      .content {
        padding: 32px 24px;
      }
      
      .footer {
        padding: 24px;
      }
      
      .database-row {
        grid-template-columns: 1fr;
      }
      
      .database-cell:first-child {
        border-right: none;
        border-bottom: 1px solid rgb(237, 236, 235);
      }
      
      .page-properties {
        grid-template-columns: 1fr;
      }
    }
    
    /* Print optimizations */
    @media print {
      .header {
        background: rgb(0, 122, 255) !important;
        -webkit-print-color-adjust: exact;
        color-adjust: exact;
      }
      
      .callout-success {
        background: rgb(237, 243, 236) !important;
        -webkit-print-color-adjust: exact;
      }
      
      .page-properties {
        background: rgb(247, 246, 243) !important;
        -webkit-print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Clean custom header image -->
    <header class="header">
    </header>
    
    <main class="content">
      <!-- Page properties (Notion-style) -->
      <div class="page-properties">
        <div class="property">
          <span class="property-name">ASIN</span>
          <span class="property-value">${product.asin}</span>
        </div>
        <div class="property">
          <span class="property-name">Risk Level</span>
          <span class="property-tag ${getRiskClass(aiAnalysis.riskClassification)}">${aiAnalysis.riskClassification || 'Safe'}</span>
        </div>
        <div class="property">
          <span class="property-name">Consistency</span>
          <span class="property-tag ${getRiskClass(aiAnalysis.consistencyRating)}">${aiAnalysis.consistencyRating || 'High'}</span>
        </div>
        <div class="property">
          <span class="property-name">Price</span>
          <span class="property-value">$${product.price?.toFixed(2) || 'N/A'}</span>
        </div>
        <div class="property">
          <span class="property-name">BSR</span>
          <span class="property-value">#${product.bsr?.toLocaleString() || 'N/A'}</span>
        </div>
        <div class="property">
          <span class="property-name">Reviews</span>
          <span class="property-value">${product.reviews?.toLocaleString() || 'N/A'}</span>
        </div>
        <div class="property">
          <span class="property-name">Grade</span>
          <span class="property-value">${product.grade || 'N/A'}</span>
        </div>
        <div class="property">
          <span class="property-name">Monthly Revenue</span>
          <span class="property-value">${product.monthly_revenue ? '$' + product.monthly_revenue.toLocaleString() : (product.salesData?.monthlyRevenue ? '$' + product.salesData.monthlyRevenue.toLocaleString() : 'N/A')}</span>
        </div>
      </div>
      
      <!-- Generated Date -->
      <div style="text-align: center; margin-bottom: 32px; padding: 16px; background: rgb(251, 250, 249); border-radius: 8px; border: 1px solid rgb(227, 226, 224);">
        <p style="margin: 0; color: rgb(120, 119, 116); font-size: 14px; font-weight: 500;">
          Generated on ${currentDate}
        </p>
      </div>
      
      <!-- Product Image -->
      ${product.images ? `
      <section class="section">
        <div class="product-image-container" style="text-align: center; margin-bottom: 32px;">
          <img 
            src="${Array.isArray(product.images) ? product.images[0] : product.images}" 
            alt="Product Image - ${product.title}"
            style="max-width: 300px; max-height: 300px; border-radius: 12px; box-shadow: rgb(15 15 15 / 10%) 0px 0px 0px 1px, rgb(15 15 15 / 10%) 0px 2px 8px; object-fit: contain; background: white; padding: 16px;"
            onerror="this.style.display='none'"
          />
        </div>
      </section>
      ` : ''}
      
      <!-- Key metrics -->
      <section class="section">
        <div class="section-header">
          <div class="section-icon">📊</div>
          <h2 class="section-title">Key Metrics</h2>
        </div>
        
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-value ${getMetricColor(aiAnalysis.riskClassification, 'risk')}">${aiAnalysis.riskClassification || 'Safe'}</div>
            <div class="metric-label">Risk Classification</div>
          </div>
          <div class="metric-card">
            <div class="metric-value ${getMetricColor(aiAnalysis.consistencyRating, 'consistency')}">${aiAnalysis.consistencyRating || 'High'}</div>
            <div class="metric-label">Market Consistency</div>
          </div>
        </div>
      </section>
      
      <!-- Product details -->
      <section class="section">
        <div class="section-header">
          <div class="section-icon">📦</div>
          <h2 class="section-title">Product Information</h2>
        </div>
        
        <div class="database-view">
          <div class="database-header">Basic Details</div>
          <div class="database-row">
            <div class="database-cell">Product Title</div>
            <div class="database-cell">${product.title}</div>
          </div>
          <div class="database-row">
            <div class="database-cell">Brand</div>
            <div class="database-cell">${product.brand || 'N/A'}</div>
          </div>
          <div class="database-row">
            <div class="database-cell">Rating</div>
            <div class="database-cell">${product.rating || 'N/A'} ⭐ (${product.reviews?.toLocaleString() || product.reviewsData?.total?.toLocaleString() || 'N/A'} reviews)</div>
          </div>
          <div class="database-row">
            <div class="database-cell">Dimensions</div>
            <div class="database-cell">${product.dimensions ? (product.dimensions.length && product.dimensions.width && product.dimensions.height ? `${product.dimensions.length}" × ${product.dimensions.width}" × ${product.dimensions.height}" (${product.dimensions.unit || 'inches'})` : aiAnalysis.estimatedDimensions || 'N/A') : aiAnalysis.estimatedDimensions || 'N/A'}</div>
          </div>
          <div class="database-row">
            <div class="database-cell">Weight</div>
            <div class="database-cell">${product.dimensions?.weight ? `${product.dimensions.weight} ${product.dimensions.weightUnit || 'lbs'}` : aiAnalysis.estimatedWeight || 'N/A'}</div>
          </div>
          <div class="database-row">
            <div class="database-cell">Monthly Sales</div>
            <div class="database-cell">${product.monthly_sales ? product.monthly_sales.toLocaleString() : (product.salesData?.monthlySales ? product.salesData.monthlySales.toLocaleString() : 'N/A')}</div>
          </div>
          <div class="database-row">
            <div class="database-cell">COGS</div>
            <div class="database-cell">${product.salesData?.cogs ? '$' + product.salesData.cogs.toFixed(2) : 'N/A'}</div>
          </div>
          <div class="database-row">
            <div class="database-cell">FBA Fees</div>
            <div class="database-cell">${product.salesData?.fbaCost ? '$' + product.salesData.fbaCost.toFixed(2) : 'N/A'}</div>
          </div>
          <div class="database-row">
            <div class="database-cell">Product Grade</div>
            <div class="database-cell">${product.grade || 'N/A'}</div>
          </div>
        </div>
      </section>
      
      <!-- Analysis sections -->
      <section class="section">
        <div class="section-header">
          <div class="section-icon">🔍</div>
          <h2 class="section-title">Detailed Analysis</h2>
        </div>
        
        <div class="toggle-list">
          <div class="toggle-item">
            <div class="toggle-header" onclick="toggleSection(this)">
              <span class="toggle-icon">▶</span>
              Risk Assessment
            </div>
            <div class="toggle-content" style="display: none;">
              <ul>
                ${aiAnalysis.riskFactors ? 
                  (Array.isArray(aiAnalysis.riskFactors) ? 
                    aiAnalysis.riskFactors.map((risk: string) => `<li>${risk}</li>`).join('') 
                    : `<li>${aiAnalysis.riskFactors}</li>`
                  ) 
                  : `<li>No major regulatory concerns identified for ${aiAnalysis.riskClassification || 'Safe'} classification</li>
                     <li>Standard product category with clear guidelines</li>
                     <li>Established product type with manageable compliance barriers</li>`
                }
              </ul>
            </div>
          </div>
          
          <div class="toggle-item">
            <div class="toggle-header" onclick="toggleSection(this)">
              <span class="toggle-icon">▶</span>
              Market Intelligence
            </div>
            <div class="toggle-content" style="display: none;">
              <ul>
                ${aiAnalysis.marketInsights ? 
                  (Array.isArray(aiAnalysis.marketInsights) ? 
                    aiAnalysis.marketInsights.map((insight: string) => `<li>${insight}</li>`).join('') 
                    : `<li>${aiAnalysis.marketInsights}</li>`
                  ) 
                  : `<li>Current BSR ranking (#${product.bsr?.toLocaleString() || 'N/A'}) indicates market position</li>
                     <li>Review count (${product.reviews?.toLocaleString() || 'N/A'}) suggests customer engagement level</li>
                     <li>Rating (${product.rating || 'N/A'} ⭐) reflects product satisfaction</li>
                     <li>Price point ($${product.price?.toFixed(2) || 'N/A'}) positioned for competitive analysis</li>
                     <li>Monthly revenue ($${product.monthly_revenue ? product.monthly_revenue.toLocaleString() : (product.salesData?.monthlyRevenue ? product.salesData.monthlyRevenue.toLocaleString() : 'N/A')}) indicates market potential</li>`
                }
              </ul>
            </div>
          </div>
          
          <div class="toggle-item">
            <div class="toggle-header" onclick="toggleSection(this)">
              <span class="toggle-icon">▶</span>
              Customer Reviews Analysis
            </div>
            <div class="toggle-content" style="display: none;">
              <ul>
                ${product.reviewsData ? `
                  <li>Total Reviews: ${product.reviewsData.total || 0} (${product.reviewsData.positive?.length || 0} positive, ${product.reviewsData.negative?.length || 0} negative)</li>
                  <li>Positive Sentiment Rate: ${product.reviewsData.total ? Math.round((product.reviewsData.positive?.length || 0) / product.reviewsData.total * 100) : 0}%</li>
                  ${product.reviewsData.positive?.length > 0 ? `<li>Recent Positive: "${product.reviewsData.positive[0].text.substring(0, 100)}..."</li>` : ''}
                  ${product.reviewsData.negative?.length > 0 ? `<li>Recent Concern: "${product.reviewsData.negative[0].text.substring(0, 100)}..."</li>` : '<li>No negative reviews identified</li>'}
                  <li>Average Helpful Votes: ${product.reviewsData.positive?.length ? Math.round(product.reviewsData.positive.reduce((sum: number, review: any) => sum + (review.helpful || 0), 0) / product.reviewsData.positive.length * 10) / 10 : 0}</li>`
                  : `<li>Review analysis data not available</li>
                     <li>Consider gathering customer feedback for product improvement insights</li>
                     <li>Monitor review patterns for competitive intelligence</li>`
                }
              </ul>
            </div>
          </div>
        </div>
        
        <div class="callout callout-info">
          <div class="callout-icon">💡</div>
          <div class="callout-content">
            <h4>Analysis Insight</h4>
            <p>This product shows ${aiAnalysis.consistencyRating || 'High'} consistency rating with ${aiAnalysis.riskClassification || 'Safe'} risk classification, indicating ${aiAnalysis.riskClassification === 'Safe' ? 'favorable conditions' : 'areas requiring attention'} for private label consideration.</p>
          </div>
        </div>
      </section>
      
      <!-- Executive summary -->
      <section class="section">
        <div class="section-header">
          <div class="section-icon">📋</div>
          <h2 class="section-title">Executive Summary</h2>
        </div>
        
        <div class="summary-block">
          <h3>Assessment Overview</h3>
          
          <p>Product <strong>${product.asin}</strong> (${product.title}) has been classified with <strong>${aiAnalysis.riskClassification || 'Safe'}</strong> risk level and <strong>${aiAnalysis.consistencyRating || 'High'}</strong> market consistency rating for Amazon FBA private label assessment.</p>
          
          <div class="callout ${aiAnalysis.riskClassification === 'Safe' ? 'callout-success' : aiAnalysis.riskClassification === 'Prohibited' || aiAnalysis.riskClassification === 'Medical' ? 'callout-warning' : 'callout-info'}">
            <div class="callout-icon">${aiAnalysis.riskClassification === 'Safe' ? '✅' : aiAnalysis.riskClassification === 'Prohibited' || aiAnalysis.riskClassification === 'Medical' ? '⚠️' : '🔍'}</div>
            <div class="callout-content">
              <h4>Recommendation: ${aiAnalysis.riskClassification === 'Safe' && aiAnalysis.consistencyRating === 'High' ? 'Proceed with Confidence' : aiAnalysis.riskClassification === 'Prohibited' || aiAnalysis.riskClassification === 'Medical' ? 'Exercise Caution' : 'Additional Research Required'}</h4>
              <p>${aiAnalysis.riskClassification === 'Safe' && aiAnalysis.consistencyRating === 'High' ? 
                'This product demonstrates favorable characteristics for private label development. The analysis indicates minimal regulatory barriers and strong market fundamentals. Recommended next steps include supplier research, competitive analysis, and product differentiation strategy development.' :
                aiAnalysis.riskClassification === 'Prohibited' || aiAnalysis.riskClassification === 'Medical' ?
                'This product category requires careful consideration due to elevated regulatory requirements and compliance complexities. Consult with legal and compliance professionals before proceeding. Consider alternative product categories with lower barriers to entry.' :
                'This product presents mixed indicators that warrant additional research and analysis. Consider conducting deeper market research, competitive analysis, and regulatory review before making final decisions. Evaluate alternative products with stronger profiles.'
              }</p>
            </div>
          </div>
        </div>
      </section>
    </main>
    
    <footer class="footer">
      <p><strong>Disclaimer:</strong> This AI-generated analysis is for informational purposes only. Conduct independent research and consult professionals before making business decisions. Market conditions may change rapidly.</p>
      <p><strong>Launch Fast V1.0</strong> • AI-Powered Amazon FBA Analysis Platform • LegacyX FBA</p>
    </footer>
  </div>
  
  <script>
    function toggleSection(header) {
      const content = header.nextElementSibling;
      const icon = header.querySelector('.toggle-icon');
      
      if (content.style.display === 'none' || content.style.display === '') {
        content.style.display = 'block';
        icon.textContent = '▼';
        icon.style.transform = 'rotate(0deg)';
      } else {
        content.style.display = 'none';
        icon.textContent = '▶';
        icon.style.transform = 'rotate(0deg)';
      }
    }
  </script>
</body>
</html>`
}