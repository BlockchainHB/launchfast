export function generateAnalysisDocument(product: any, aiAnalysis: any): string {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const riskColor = getRiskColor(aiAnalysis.risk_classification)
  const consistencyColor = getConsistencyColor(aiAnalysis.consistency_rating)

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>AI Product Analysis Report - ${product.asin}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          background: #f8fafc;
          padding: 20px;
        }
        
        .container {
          max-width: 1200px;
          margin: 0 auto;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 40px;
          text-align: center;
        }
        
        .header h1 {
          font-size: 2.5rem;
          margin-bottom: 10px;
          font-weight: 700;
        }
        
        .header p {
          font-size: 1.1rem;
          opacity: 0.9;
        }
        
        .content {
          padding: 40px;
        }
        
        .product-overview {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-bottom: 40px;
          padding: 30px;
          background: #f8fafc;
          border-radius: 8px;
          border-left: 4px solid #667eea;
        }
        
        .product-details h2 {
          color: #1e293b;
          margin-bottom: 20px;
          font-size: 1.5rem;
        }
        
        .product-info {
          list-style: none;
        }
        
        .product-info li {
          margin-bottom: 12px;
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .product-info li:last-child {
          border-bottom: none;
        }
        
        .label {
          font-weight: 600;
          color: #475569;
        }
        
        .value {
          color: #1e293b;
          font-weight: 500;
        }
        
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 40px;
        }
        
        .metric-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 24px;
          text-align: center;
          transition: transform 0.2s ease;
        }
        
        .metric-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        
        .metric-value {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 8px;
        }
        
        .metric-label {
          color: #64748b;
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .risk-high { color: #dc2626; }
        .risk-medium { color: #ea580c; }
        .risk-low { color: #16a34a; }
        
        .consistency-high { color: #16a34a; }
        .consistency-medium { color: #ca8a04; }
        .consistency-low { color: #dc2626; }
        
        .analysis-section {
          margin-bottom: 40px;
        }
        
        .section-title {
          font-size: 1.5rem;
          color: #1e293b;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 2px solid #e2e8f0;
        }
        
        .insights-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
        }
        
        .insight-card {
          background: #f8fafc;
          border-radius: 8px;
          padding: 24px;
          border-left: 4px solid #667eea;
        }
        
        .insight-card h3 {
          color: #1e293b;
          margin-bottom: 12px;
          font-size: 1.2rem;
        }
        
        .insight-list {
          list-style: none;
        }
        
        .insight-list li {
          margin-bottom: 8px;
          padding-left: 20px;
          position: relative;
        }
        
        .insight-list li:before {
          content: "•";
          color: #667eea;
          position: absolute;
          left: 0;
          font-weight: bold;
        }
        
        .risk-factors {
          background: #fef2f2;
          border-left-color: #dc2626;
        }
        
        .market-insights {
          background: #f0f9ff;
          border-left-color: #0284c7;
        }
        
        .opportunity-insights {
          background: #f0fdf4;
          border-left-color: #16a34a;
        }
        
        .footer {
          background: #f1f5f9;
          padding: 30px;
          text-align: center;
          color: #64748b;
          font-size: 0.9rem;
        }
        
        .disclaimer {
          max-width: 800px;
          margin: 0 auto;
          line-height: 1.5;
        }
        
        @media (max-width: 768px) {
          .product-overview {
            grid-template-columns: 1fr;
          }
          
          .insights-grid {
            grid-template-columns: 1fr;
          }
          
          .metrics-grid {
            grid-template-columns: 1fr;
          }
          
          .content {
            padding: 20px;
          }
          
          .header {
            padding: 30px 20px;
          }
          
          .header h1 {
            font-size: 2rem;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>AI Product Analysis Report</h1>
          <p>Comprehensive Amazon FBA Private Label Assessment</p>
          <p style="margin-top: 10px; font-size: 0.9rem;">Generated on ${currentDate}</p>
        </div>
        
        <div class="content">
          <div class="product-overview">
            <div class="product-details">
              <h2>Product Overview</h2>
              <ul class="product-info">
                <li>
                  <span class="label">ASIN:</span>
                  <span class="value">${product.asin}</span>
                </li>
                <li>
                  <span class="label">Product Title:</span>
                  <span class="value">${product.title}</span>
                </li>
                <li>
                  <span class="label">Brand:</span>
                  <span class="value">${product.brand || 'N/A'}</span>
                </li>
                <li>
                  <span class="label">Current Price:</span>
                  <span class="value">$${product.price?.toFixed(2) || 'N/A'}</span>
                </li>
                <li>
                  <span class="label">Customer Rating:</span>
                  <span class="value">${product.rating || 'N/A'} ⭐</span>
                </li>
                <li>
                  <span class="label">Total Reviews:</span>
                  <span class="value">${product.reviews?.toLocaleString() || 'N/A'}</span>
                </li>
                <li>
                  <span class="label">BSR:</span>
                  <span class="value">${product.bsr?.toLocaleString() || 'N/A'}</span>
                </li>
              </ul>
            </div>
            
            <div class="product-details">
              <h2>Physical Estimates</h2>
              <ul class="product-info">
                <li>
                  <span class="label">Estimated Dimensions:</span>
                  <span class="value">${aiAnalysis.estimated_dimensions || 'N/A'}</span>
                </li>
                <li>
                  <span class="label">Estimated Weight:</span>
                  <span class="value">${aiAnalysis.estimated_weight || 'N/A'}</span>
                </li>
                <li>
                  <span class="label">Monthly Sales:</span>
                  <span class="value">${product.monthly_sales?.toLocaleString() || 'N/A'}</span>
                </li>
                <li>
                  <span class="label">Monthly Revenue:</span>
                  <span class="value">$${product.monthly_revenue?.toLocaleString() || 'N/A'}</span>
                </li>
                <li>
                  <span class="label">Profit Estimate:</span>
                  <span class="value">$${product.profit_estimate?.toLocaleString() || 'N/A'}</span>
                </li>
                <li>
                  <span class="label">Product Grade:</span>
                  <span class="value">${product.grade || 'N/A'}</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-value ${riskColor.class}">${aiAnalysis.risk_classification}</div>
              <div class="metric-label">Risk Classification</div>
            </div>
            
            <div class="metric-card">
              <div class="metric-value ${consistencyColor.class}">${aiAnalysis.consistency_rating}</div>
              <div class="metric-label">Consistency Rating</div>
            </div>
            
            <div class="metric-card">
              <div class="metric-value" style="color: #667eea;">${aiAnalysis.opportunity_score}/100</div>
              <div class="metric-label">Opportunity Score</div>
            </div>
          </div>
          
          <div class="analysis-section">
            <h2 class="section-title">Detailed Analysis</h2>
            <div class="insights-grid">
              <div class="insight-card risk-factors">
                <h3>Risk Factors</h3>
                <ul class="insight-list">
                  ${aiAnalysis.risk_factors ? 
                    (Array.isArray(aiAnalysis.risk_factors) ? 
                      aiAnalysis.risk_factors.map((risk: string) => `<li>${risk}</li>`).join('') 
                      : `<li>${aiAnalysis.risk_factors}</li>`
                    ) 
                    : '<li>No specific risk factors identified</li>'
                  }
                </ul>
              </div>
              
              <div class="insight-card market-insights">
                <h3>Market Insights</h3>
                <ul class="insight-list">
                  ${aiAnalysis.market_insights ? 
                    (Array.isArray(aiAnalysis.market_insights) ? 
                      aiAnalysis.market_insights.map((insight: string) => `<li>${insight}</li>`).join('') 
                      : `<li>${aiAnalysis.market_insights}</li>`
                    ) 
                    : '<li>Market analysis data not available</li>'
                  }
                </ul>
              </div>
            </div>
          </div>
          
          <div class="analysis-section">
            <h2 class="section-title">Executive Summary</h2>
            <div class="insight-card opportunity-insights">
              <p style="font-size: 1.1rem; line-height: 1.7; color: #374151;">
                This ${product.title} (ASIN: ${product.asin}) has been classified as <strong>${aiAnalysis.risk_classification}</strong> risk 
                with a <strong>${aiAnalysis.consistency_rating}</strong> consistency rating for Amazon FBA private label opportunities. 
                The product shows an opportunity score of <strong>${aiAnalysis.opportunity_score}/100</strong>, indicating 
                ${aiAnalysis.opportunity_score >= 70 ? 'strong potential' : 
                  aiAnalysis.opportunity_score >= 50 ? 'moderate potential' : 'limited potential'} 
                for private label success.
              </p>
              
              <p style="font-size: 1rem; line-height: 1.6; color: #6b7280; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <strong>Key Recommendation:</strong> 
                ${aiAnalysis.opportunity_score >= 70 && aiAnalysis.risk_classification === 'Safe' ? 
                  'This product shows excellent potential for private label development with minimal regulatory concerns.' :
                  aiAnalysis.risk_classification === 'Prohibited' || aiAnalysis.risk_classification === 'Medical' ?
                  'Avoid this product due to high regulatory risks and compliance requirements.' :
                  'Consider this product with caution and conduct additional market research before proceeding.'
                }
              </p>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <div class="disclaimer">
            <p><strong>Disclaimer:</strong> This analysis is generated by AI and should be used for informational purposes only. 
            Always conduct your own due diligence and research before making any business decisions. Market conditions, 
            regulations, and product availability can change rapidly. Consult with legal and business professionals 
            for specific advice related to your situation.</p>
            
            <p style="margin-top: 15px;">
              <strong>Generated by SellerSprite Dashboard</strong> • AI-Powered Amazon FBA Analysis Platform
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}

function getRiskColor(risk: string): { class: string; color: string } {
  switch (risk?.toLowerCase()) {
    case 'prohibited':
    case 'medical':
      return { class: 'risk-high', color: '#dc2626' }
    case 'electric':
    case 'breakable':
      return { class: 'risk-medium', color: '#ea580c' }
    case 'safe':
    default:
      return { class: 'risk-low', color: '#16a34a' }
  }
}

function getConsistencyColor(consistency: string): { class: string; color: string } {
  switch (consistency?.toLowerCase()) {
    case 'high':
      return { class: 'consistency-high', color: '#16a34a' }
    case 'medium':
      return { class: 'consistency-medium', color: '#ca8a04' }
    case 'low':
    default:
      return { class: 'consistency-low', color: '#dc2626' }
  }
}