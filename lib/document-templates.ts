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
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #1f2937;
          background: #ffffff;
          margin: 0;
          padding: 0;
        }
        
        .container {
          max-width: 100%;
          margin: 0;
          background: white;
          min-height: 100vh;
        }
        
        .header {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
          color: white;
          padding: 60px 40px;
          text-align: center;
          position: relative;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url('data:image/svg+xml,<svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="evenodd"><g fill="rgba(255,255,255,0.05)" fill-opacity="0.4"><circle cx="30" cy="30" r="2"/></g></svg>');
          opacity: 0.6;
        }
        
        .header > * {
          position: relative;
          z-index: 1;
        }
        
        .header h1 {
          font-size: 3.5rem;
          margin-bottom: 20px;
          font-weight: 900;
          letter-spacing: -0.025em;
          text-shadow: 0 4px 8px rgba(0,0,0,0.3);
          background: linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .header p {
          font-size: 1.4rem;
          opacity: 0.9;
          font-weight: 400;
          letter-spacing: 0.5px;
          margin-bottom: 10px;
        }
        
        .brand-badge {
          display: inline-block;
          background: rgba(255,255,255,0.15);
          padding: 12px 24px;
          border-radius: 30px;
          font-size: 1rem;
          font-weight: 600;
          margin-top: 20px;
          backdrop-filter: blur(15px);
          border: 2px solid rgba(255,255,255,0.2);
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        
        .content {
          padding: 50px;
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .product-overview {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          margin-bottom: 50px;
          padding: 40px;
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          position: relative;
        }
        
        .product-overview::before {
          content: '';
          position: absolute;
          top: -1px;
          left: -1px;
          right: -1px;
          bottom: -1px;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6, #06b6d4);
          border-radius: 16px;
          z-index: -1;
        }
        
        .product-overview::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: #ffffff;
          border-radius: 15px;
          z-index: -1;
        }
        
        .product-details h2 {
          color: #0f172a;
          margin-bottom: 25px;
          font-size: 1.8rem;
          font-weight: 700;
          position: relative;
          padding-bottom: 10px;
        }
        
        .product-details h2::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 40px;
          height: 3px;
          background: linear-gradient(90deg, #3b82f6, #8b5cf6);
          border-radius: 2px;
        }
        
        .product-info {
          list-style: none;
        }
        
        .product-info li {
          margin-bottom: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 20px;
          background: #f8fafc;
          border-radius: 8px;
          border-left: 4px solid #e2e8f0;
          transition: all 0.2s ease;
        }
        
        .product-info li:hover {
          background: #f1f5f9;
          border-left-color: #3b82f6;
          transform: translateX(2px);
        }
        
        .product-info li:last-child {
          margin-bottom: 0;
        }
        
        .label {
          font-weight: 600;
          color: #374151;
          font-size: 0.95rem;
        }
        
        .value {
          color: #111827;
          font-weight: 600;
          font-size: 1rem;
        }
        
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 25px;
          margin-bottom: 50px;
        }
        
        .metric-card {
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 30px;
          text-align: center;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        
        .metric-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #3b82f6, #8b5cf6, #06b6d4);
        }
        
        .metric-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
          border-color: #3b82f6;
        }
        
        .metric-value {
          font-size: 2.5rem;
          font-weight: 800;
          margin-bottom: 12px;
          background: linear-gradient(135deg, #1e293b, #3b82f6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .metric-label {
          color: #64748b;
          font-size: 0.95rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 600;
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
          font-size: 2rem;
          color: #0f172a;
          margin-bottom: 30px;
          padding-bottom: 15px;
          border-bottom: 3px solid transparent;
          background: linear-gradient(90deg, #3b82f6, #8b5cf6) bottom / 100px 3px no-repeat;
          font-weight: 700;
          position: relative;
        }
        
        .insights-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 35px;
        }
        
        .insight-card {
          background: #ffffff;
          border-radius: 16px;
          padding: 30px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          position: relative;
          overflow: hidden;
        }
        
        .insight-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: linear-gradient(180deg, #3b82f6, #8b5cf6);
        }
        
        .insight-card h3 {
          color: #0f172a;
          margin-bottom: 18px;
          font-size: 1.4rem;
          font-weight: 700;
          padding-left: 15px;
        }
        
        .insight-list {
          list-style: none;
        }
        
        .insight-list li {
          margin-bottom: 12px;
          padding-left: 25px;
          position: relative;
          line-height: 1.6;
          color: #374151;
          font-size: 1rem;
        }
        
        .insight-list li:before {
          content: "▶";
          color: #3b82f6;
          position: absolute;
          left: 15px;
          font-weight: bold;
          font-size: 0.8rem;
        }
        
        .risk-factors::before {
          background: linear-gradient(180deg, #dc2626, #ef4444);
        }
        
        .market-insights::before {
          background: linear-gradient(180deg, #0284c7, #0ea5e9);
        }
        
        .opportunity-insights::before {
          background: linear-gradient(180deg, #16a34a, #22c55e);
        }
        
        .footer {
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
          padding: 40px;
          text-align: center;
          color: #64748b;
          font-size: 0.9rem;
          border-top: 3px solid #e2e8f0;
          position: relative;
        }
        
        .footer::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 60px;
          height: 3px;
          background: linear-gradient(90deg, #3b82f6, #1d4ed8);
          border-radius: 0 0 3px 3px;
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
          <div class="brand-badge">Launch Fast by LegacyX FBA • Version 1.0</div>
          <p style="margin-top: 20px; font-size: 0.95rem; opacity: 0.8;">Generated on ${currentDate}</p>
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
              <h2>Analysis Insights</h2>
              <ul class="product-info">
                <li>
                  <span class="label">Dimensions:</span>
                  <span class="value">${aiAnalysis.estimated_dimensions || 'N/A'}</span>
                </li>
                <li>
                  <span class="label">Weight:</span>
                  <span class="value">${aiAnalysis.estimated_weight || 'N/A'}</span>
                </li>
                <li>
                  <span class="label">Market Position:</span>
                  <span class="value">BSR #${product.bsr?.toLocaleString() || 'N/A'}</span>
                </li>
                <li>
                  <span class="label">Market Analysis:</span>
                  <span class="value">Professional Grade Assessment</span>
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
              <div class="metric-value">${aiAnalysis.opportunity_score}/100</div>
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
            <div class="insight-card opportunity-insights" style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border: 2px solid #22c55e; border-radius: 20px; padding: 40px; position: relative;">
              <div style="display: flex; align-items: center; margin-bottom: 25px;">
                <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #22c55e, #16a34a); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 20px;">
                  <span style="color: white; font-size: 24px; font-weight: bold;">✓</span>
                </div>
                <h3 style="margin: 0; font-size: 1.8rem; color: #0f172a; font-weight: 800;">Analysis Complete</h3>
              </div>
              
              <p style="font-size: 1.2rem; line-height: 1.8; color: #374151; margin-bottom: 25px;">
                This <strong>${product.title}</strong> (ASIN: <span style="background: #e5e7eb; padding: 4px 8px; border-radius: 6px; font-family: monospace;">${product.asin}</span>) has been classified as <span style="background: ${aiAnalysis.risk_classification === 'Safe' ? '#dcfce7' : '#fef2f2'}; color: ${aiAnalysis.risk_classification === 'Safe' ? '#16a34a' : '#dc2626'}; padding: 4px 12px; border-radius: 20px; font-weight: 700;">${aiAnalysis.risk_classification}</span> risk 
                with <span style="background: #dbeafe; color: #1d4ed8; padding: 4px 12px; border-radius: 20px; font-weight: 700;">${aiAnalysis.consistency_rating}</span> consistency rating for Amazon FBA private label opportunities.
              </p>
              
              <div style="background: #ffffff; padding: 25px; border-radius: 16px; border: 1px solid #e5e7eb; margin-bottom: 25px;">
                <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 15px;">
                  <div style="font-size: 3rem; font-weight: 900; background: linear-gradient(135deg, #3b82f6, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">${aiAnalysis.opportunity_score}</div>
                  <div style="font-size: 1.5rem; color: #6b7280; margin-left: 8px;">/100</div>
                </div>
                <p style="text-align: center; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; font-size: 0.9rem;">Opportunity Score</p>
                <p style="text-align: center; color: #374151; font-size: 1.1rem; margin-top: 10px; font-weight: 600;">
                  ${aiAnalysis.opportunity_score >= 70 ? '🚀 Strong Potential' : 
                    aiAnalysis.opportunity_score >= 50 ? '⚡ Moderate Potential' : '⚠️ Limited Potential'}
                </p>
              </div>
              
              <div style="background: linear-gradient(135deg, #f8fafc, #f1f5f9); padding: 25px; border-radius: 16px; border-left: 4px solid #3b82f6;">
                <h4 style="color: #0f172a; font-size: 1.3rem; font-weight: 700; margin-bottom: 15px; display: flex; align-items: center;">
                  <span style="margin-right: 10px;">💡</span> Key Recommendation
                </h4>
                <p style="font-size: 1.1rem; line-height: 1.7; color: #374151; margin: 0;">
                  ${aiAnalysis.opportunity_score >= 70 && aiAnalysis.risk_classification === 'Safe' ? 
                    '🎯 This product shows <strong>excellent potential</strong> for private label development with minimal regulatory concerns. Consider moving forward with supplier research and competitive analysis.' :
                    aiAnalysis.risk_classification === 'Prohibited' || aiAnalysis.risk_classification === 'Medical' ?
                    '🚫 <strong>Avoid this product</strong> due to high regulatory risks and compliance requirements. Focus efforts on safer product categories.' :
                    '🔍 Consider this product with <strong>caution</strong> and conduct additional market research before proceeding. Review competitive landscape and compliance requirements.'
                  }
                </p>
              </div>
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
              <strong>Generated by Launch Fast V1.0</strong> • AI-Powered Amazon FBA Analysis Platform by LegacyX FBA<br>
              <span style="font-size: 0.8rem; opacity: 0.7; margin-top: 5px; display: block;">Enhanced features and deeper insights coming in V1.2</span>
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