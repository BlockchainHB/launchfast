// Professional AI Analysis Document Templates

interface AIAnalysisData {
  id: string
  risk_classification: string
  consistency_rating: string
  estimated_dimensions: string
  estimated_weight: string
  opportunity_score: number
  market_insights: string[]
  risk_factors: string[]
  created_at: string
}

interface ProductData {
  asin: string
  title: string
  brand?: string
  price: number
  bsr?: number
  reviews: number
  rating: number
  grade: string
  monthly_revenue?: number
  monthly_profit?: number
}

interface ComprehensiveAnalysisData {
  product: ProductData
  aiAnalysis: AIAnalysisData
  reportTitle?: string
}

export function generateComprehensiveAnalysisHTML(data: ComprehensiveAnalysisData): string {
  const {
    product,
    aiAnalysis,
    reportTitle = `Product Analysis Report - ${product.title}`
  } = data

  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const riskColor = getRiskColor(aiAnalysis.risk_classification)
  const consistencyColor = getConsistencyColor(aiAnalysis.consistency_rating)
  const gradeColor = getGradeColor(product.grade)

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${reportTitle}</title>
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
            background: #fff;
        }
        
        .document {
            max-width: 1000px;
            margin: 0 auto;
            padding: 40px;
            background: white;
        }
        
        .header {
            border-bottom: 3px solid #2563eb;
            padding-bottom: 30px;
            margin-bottom: 40px;
        }
        
        .logo-section {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
        }
        
        .report-date {
            color: #666;
            font-size: 14px;
        }
        
        .title {
            font-size: 32px;
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 8px;
        }
        
        .subtitle {
            font-size: 18px;
            color: #64748b;
        }
        
        .executive-summary {
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 40px;
            border-left: 6px solid #2563eb;
        }
        
        .summary-title {
            font-size: 24px;
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 20px;
        }
        
        .key-metrics {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        
        .metric-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            text-align: center;
        }
        
        .metric-label {
            font-size: 14px;
            color: #64748b;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .metric-value {
            font-size: 24px;
            font-weight: bold;
        }
        
        .section {
            margin-bottom: 40px;
        }
        
        .section-title {
            font-size: 24px;
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e2e8f0;
        }
        
        .product-overview {
            background: #f8fafc;
            padding: 25px;
            border-radius: 12px;
            margin-bottom: 30px;
        }
        
        .product-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
        }
        
        .detail-item {
            padding: 15px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .detail-label {
            font-weight: 600;
            color: #475569;
            margin-bottom: 4px;
        }
        
        .detail-value {
            color: #1e293b;
            font-size: 16px;
        }
        
        .risk-analysis {
            background: #fef7f0;
            border: 1px solid #fed7aa;
            border-radius: 12px;
            padding: 25px;
            margin: 20px 0;
        }
        
        .opportunity-analysis {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 12px;
            padding: 25px;
            margin: 20px 0;
        }
        
        .insight-list {
            list-style: none;
            padding: 0;
        }
        
        .insight-item {
            background: white;
            margin: 10px 0;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 1px 4px rgba(0,0,0,0.1);
            border-left: 4px solid #2563eb;
        }
        
        .badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .badge-safe { background: #dcfce7; color: #166534; }
        .badge-electric { background: #fef3c7; color: #92400e; }
        .badge-breakable { background: #fed7aa; color: #c2410c; }
        .badge-medical { background: #dbeafe; color: #1d4ed8; }
        .badge-prohibited { background: #fecaca; color: #dc2626; }
        
        .badge-consistent { background: #dcfce7; color: #166534; }
        .badge-low { background: #fecaca; color: #dc2626; }
        .badge-trendy { background: #fecaca; color: #dc2626; }
        
        .grade-badge {
            font-size: 28px;
            font-weight: bold;
            padding: 10px 20px;
            border-radius: 8px;
            display: inline-block;
        }
        
        .recommendation {
            background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
            color: white;
            padding: 30px;
            border-radius: 12px;
            margin: 30px 0;
        }
        
        .recommendation-title {
            font-size: 22px;
            font-weight: bold;
            margin-bottom: 15px;
        }
        
        .footer {
            border-top: 2px solid #e2e8f0;
            padding-top: 30px;
            margin-top: 50px;
            text-align: center;
            color: #64748b;
        }
        
        .disclaimer {
            background: #f1f5f9;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            font-size: 14px;
            color: #475569;
        }
        
        @media print {
            .document { padding: 20px; }
            .section { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="document">
        <!-- Header -->
        <div class="header">
            <div class="logo-section">
                <div class="logo">SellerSprite AI Analysis</div>
                <div class="report-date">Generated: ${currentDate}</div>
            </div>
            <h1 class="title">${reportTitle}</h1>
            <p class="subtitle">Comprehensive AI-Powered Product Analysis</p>
        </div>

        <!-- Executive Summary -->
        <div class="executive-summary">
            <h2 class="summary-title">Executive Summary</h2>
            <p>This comprehensive analysis evaluates the business opportunity for <strong>${product.title}</strong> (ASIN: ${product.asin}) using advanced AI algorithms and market intelligence.</p>
            
            <div class="key-metrics">
                <div class="metric-card">
                    <div class="metric-label">Overall Grade</div>
                    <div class="metric-value grade-badge" style="color: ${gradeColor};">${product.grade}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Opportunity Score</div>
                    <div class="metric-value" style="color: #059669;">${aiAnalysis.opportunity_score}/10</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Risk Level</div>
                    <div class="metric-value">
                        <span class="badge badge-${aiAnalysis.risk_classification.toLowerCase()}">${aiAnalysis.risk_classification}</span>
                    </div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Demand Pattern</div>
                    <div class="metric-value">
                        <span class="badge badge-${aiAnalysis.consistency_rating.toLowerCase()}">${aiAnalysis.consistency_rating}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Product Overview -->
        <div class="section">
            <h2 class="section-title">Product Overview</h2>
            <div class="product-overview">
                <div class="product-details">
                    <div class="detail-item">
                        <div class="detail-label">Product Title</div>
                        <div class="detail-value">${product.title}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">ASIN</div>
                        <div class="detail-value">${product.asin}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Brand</div>
                        <div class="detail-value">${product.brand || 'Not specified'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Current Price</div>
                        <div class="detail-value">$${product.price.toFixed(2)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Customer Reviews</div>
                        <div class="detail-value">${product.reviews.toLocaleString()} reviews</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Average Rating</div>
                        <div class="detail-value">${product.rating}/5.0 stars</div>
                    </div>
                    ${product.bsr ? `
                    <div class="detail-item">
                        <div class="detail-label">Best Seller Rank</div>
                        <div class="detail-value">#${product.bsr.toLocaleString()}</div>
                    </div>` : ''}
                    <div class="detail-item">
                        <div class="detail-label">Estimated Dimensions</div>
                        <div class="detail-value">${aiAnalysis.estimated_dimensions}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Estimated Weight</div>
                        <div class="detail-value">${aiAnalysis.estimated_weight}</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Market Insights -->
        <div class="section">
            <h2 class="section-title">Market Intelligence</h2>
            <div class="opportunity-analysis">
                <h3 style="color: #166534; margin-bottom: 15px;">Key Market Insights</h3>
                <ul class="insight-list">
                    ${aiAnalysis.market_insights.map(insight => `
                        <li class="insight-item">${insight}</li>
                    `).join('')}
                </ul>
            </div>
        </div>

        <!-- Risk Analysis -->
        <div class="section">
            <h2 class="section-title">Risk Assessment</h2>
            <div class="risk-analysis">
                <h3 style="color: #c2410c; margin-bottom: 15px;">Risk Factors & Considerations</h3>
                <ul class="insight-list">
                    ${aiAnalysis.risk_factors.map(risk => `
                        <li class="insight-item">${risk}</li>
                    `).join('')}
                </ul>
            </div>
        </div>

        <!-- Recommendation -->
        <div class="recommendation">
            <h3 class="recommendation-title">AI Recommendation</h3>
            <p>${generateRecommendation(product.grade, aiAnalysis.opportunity_score, aiAnalysis.risk_classification)}</p>
        </div>

        <!-- Disclaimer -->
        <div class="disclaimer">
            <strong>Disclaimer:</strong> This analysis is generated using AI algorithms and market data. While we strive for accuracy, this should not be considered as financial advice. Always conduct your own due diligence before making business decisions.
        </div>

        <!-- Footer -->
        <div class="footer">
            <p>Generated by SellerSprite AI Analysis System</p>
            <p>Report ID: ${aiAnalysis.id} | Generated: ${currentDate}</p>
        </div>
    </div>
</body>
</html>
  `.trim()
}

function getRiskColor(risk: string): string {
  switch (risk.toLowerCase()) {
    case 'safe': return '#059669'
    case 'electric': return '#d97706'
    case 'breakable': return '#ea580c'
    case 'medical': return '#2563eb'
    case 'prohibited': return '#dc2626'
    default: return '#6b7280'
  }
}

function getConsistencyColor(consistency: string): string {
  switch (consistency.toLowerCase()) {
    case 'consistent': return '#059669'
    case 'low': return '#dc2626'
    case 'trendy': return '#dc2626'
    case 'seasonal': return '#2563eb'
    default: return '#6b7280'
  }
}

function getGradeColor(grade: string): string {
  if (grade.startsWith('A')) return '#059669'
  if (grade.startsWith('B')) return '#0284c7'
  if (grade.startsWith('C')) return '#d97706'
  if (grade.startsWith('D')) return '#ea580c'
  if (grade === 'Avoid') return '#dc2626'
  return '#dc2626'
}

function generateRecommendation(grade: string, opportunityScore: number, risk: string): string {
  if (grade === 'Avoid') {
    return 'This product is not recommended for private label business due to high-risk factors. Consider exploring alternative products with better risk profiles.'
  }
  
  if (grade.startsWith('A') && opportunityScore >= 8) {
    return 'Excellent opportunity! This product shows strong potential for private label success with favorable market conditions and manageable risk factors.'
  }
  
  if (grade.startsWith('B') && opportunityScore >= 6) {
    return 'Good opportunity with solid profit potential. Consider this product for your private label portfolio while monitoring the identified risk factors.'
  }
  
  if (opportunityScore < 5) {
    return 'Proceed with caution. While not immediately disqualified, this product shows limited opportunity and may require additional market validation.'
  }
  
  return 'Moderate opportunity identified. Conduct additional market research and consider your risk tolerance before proceeding.'
}

export default {
  generateComprehensiveAnalysisHTML
}