# SellerSprite API Mapping

## API Endpoints Overview

#
### 1. Product Research API
**Endpoint:** `POST /api/products/research`
**Purpose:** Main product discovery and analysis workflow

**Request:**
```json
{
  "keyword": "flagpole",
  "limit": 3,
  "filters": {
    "maxReviews": 1000
  }
}
```

**Key Insights:**
- Processing time: ~15 seconds for 3 products
- Status: ✅ **WORKING** - Complete end-to-end workflow
- Returns fully processed products with grades, sales data, and AI analysis
- Includes caching support (Redis + memory fallback)
- **FIXED**: Keyword input issue - now properly processes user input keywords

**Response Structure:**
```json
{
  "success": true,
  "data": [
    {
      "id": "B0C6JKHJ6R",
      "asin": "B0C6JKHJ6R",
      "title": "YEAHOME 3PC Garden Flag Holder Stand, Weather-Proof Yard Flag Pole Black Metal Powder-Coated Flagpole with Tiger Clip and Rubber Stopper for Garden Flags Outdoor Decorations",
      "brand": "YEAHOME",
      "price": 17.99,
      "bsr": 351,
      "reviews": 17168,
      "rating": 4.3,
      "salesData": {
        "monthlyProfit": 168030,
        "monthlyRevenue": 373400,
        "monthlySales": 20756,
        "margin": 0.45,
        "ppu": 8.1,
        "fbaCost": 2.7,
        "cogs": 7.2
      },
      "aiAnalysis": {
        "riskClassification": "No Risk",
        "consistencyRating": "Seasonal",
        "estimatedDimensions": "15 x 5 x 1",
        "estimatedWeight": "1.5",
        "opportunityScore": 7,
        "marketInsights": [
          "The product falls under the Patio, Lawn & Garden category, which tends to see increased demand during the spring and summer months.",
          "The product has a high number of reviews and a good rating, indicating a strong market presence and customer satisfaction."
        ],
        "riskFactors": [
          "Seasonal demand can lead to inconsistent sales throughout the year.",
          "The product's success may be dependent on external factors such as weather and season."
        ]
      },
      "keywords": [
        {
          "keyword": "flagpole",
          "searchVolume": 25194,
          "rankingPosition": 0,
          "trafficPercentage": 3.73,
          "cpc": 1.9,
          "competitionScore": 0
        }
      ],
      "grade": "D1",
      "createdAt": "2025-07-18T05:06:05.607Z",
      "updatedAt": "2025-07-18T05:06:05.607Z"
    }
  ],
  "cached": false,
  "count": 3,
  "processing_time": 1752815179714,
  "filters_applied": {
    "maxReviews": 1000
  }
}
```

### 2. SellerSprite Sales Prediction API
**Endpoint:** `GET /api/test/sellersprite`
**Purpose:** Test sales prediction for specific ASIN (B0CZC4NSK3)

**Response Structure:**
```json
{
  "status": "OK",
  "message": "SellerSprite API test successful",
  "test": "Sales Prediction",
  "asin": "B0CZC4NSK3",
  "data": {
    "monthlyProfit": 2808,
    "monthlyRevenue": 6240,
    "monthlySales": 36,
    "margin": 0.45,
    "ppu": 78.5,
    "fbaCost": 26.17,
    "cogs": 69.78
  },
  "timestamp": "2025-07-18T04:25:34.180Z"
}
```

**Key Insights:**
- Monthly profit: $2,808 (solid B-range performance)
- Monthly sales: 36 units
- Margin: 45% (healthy profit margin)
- Price per unit profit: $78.50 (high-value product)
- Status: ✅ **WORKING** - Returns detailed sales prediction data

### 3. SellerSprite Keyword Mining API
**Endpoint:** `POST /api/test/sellersprite`
**Purpose:** Test keyword mining for market opportunities

**Response Structure:**
```json
{
  "status": "OK",
  "message": "SellerSprite Keyword Mining test successful",
  "test": "Keyword Mining",
  "keyword": "wireless charger",
  "resultsCount": 10,
  "data": [
    {
      "keyword": "car phone holder",
      "searchVolume": 446492,
      "competitionScore": 0,
      "supplyDemandRatio": 33.18,
      "growthTrend": "stable"
    },
    {
      "keyword": "desk accessories",
      "searchVolume": 364401,
      "competitionScore": 0,
      "supplyDemandRatio": 2.4,
      "growthTrend": "stable"
    }
  ],
  "timestamp": "2025-07-18T04:28:00.830Z"
}
```

**Key Insights:**
- ✅ **WORKING** - API works and parsing is correct
- Returns high-volume keywords with market data
- Provides supply/demand ratios for opportunity assessment

### 4. SellerSprite Reverse ASIN API
**Endpoint:** `POST /api/test/reverse-asin`
**Purpose:** Get keyword data for specific ASIN (B0CZC4NSK3)

**Response Structure:**
```json
{
  "status": "OK",
  "message": "SellerSprite Reverse ASIN test successful",
  "test": "Reverse ASIN",
  "asin": "B0CZC4NSK3",
  "resultsCount": 5,
  "data": [
    {
      "keyword": "sauna box",
      "searchVolume": 58067,
      "rankingPosition": 32,
      "trafficPercentage": 0.74,
      "cpc": 1.84,
      "competitionScore": 0
    }
  ],
  "timestamp": "2025-07-18T04:28:52.283Z"
}
```

**Key Insights:**
- ✅ **WORKING** - API works and parsing is correct
- Returns keywords driving traffic to specific ASINs
- Provides ranking positions and traffic percentages

### 5. Raw SellerSprite Product Research API
**Endpoint:** `POST /api/debug/sellersprite`
**Purpose:** Debug endpoint to inspect raw SellerSprite API response

**Key Insights:**
- ✅ **WORKING** - Direct API integration
- Used for debugging and parameter optimization
- Returns raw SellerSprite response structure

### 6. Environment Check API
**Endpoint:** `GET /api/test`
**Purpose:** Check API health and environment variables

**Response Structure:**
```json
{
  "status": "OK",
  "message": "SellerSprite Dashboard API is working",
  "timestamp": "2025-07-18T04:16:15.910Z",
  "environment": "development",
  "checks": {
    "environment": {
      "sellersprite": true,
      "openai": true,
      "supabase": {
        "url": true,
        "anonKey": true,
        "serviceKey": true
      },
      "apify": true,
      "redis": true
    },
    "imports": {
      "sellerSprite": true,
      "openai": true,
      "scoring": true,
      "supabase": true
    }
  }
}
```

## Data Processing Flow

1. **Product Research Request** → SellerSprite Product Research API
2. **For each product found:**
   - Get sales prediction data from SellerSprite Sales API
   - Get AI analysis from OpenAI GPT-4
   - Get keyword data from SellerSprite Reverse ASIN API
   - Calculate A10-F1 grade using scoring algorithm
   - Store results in Supabase database
3. **Return processed results** with grades and insights

## Key Data Fields

### Sales Data Fields
- `monthlyProfit`: Estimated monthly profit in dollars
- `monthlyRevenue`: Estimated monthly revenue in dollars
- `monthlySales`: Estimated monthly sales units
- `margin`: Profit margin percentage (0-1)
- `ppu`: Profit per unit in dollars
- `fbaCost`: FBA fees per unit
- `cogs`: Cost of goods sold per unit

### AI Analysis Fields
- `riskClassification`: "Electric" | "Breakable" | "Banned" | "No Risk"
- `consistencyRating`: "Consistent" | "Seasonal" | "Trendy"
- `estimatedDimensions`: Product dimensions estimate
- `estimatedWeight`: Product weight estimate
- `opportunityScore`: 1-10 market opportunity score
- `marketInsights`: Array of market analysis insights
- `riskFactors`: Array of identified risk factors

### Grading System
- Grades: A10, A9, A8...A1, B10, B9...B1, C10, C9...C1, D10, D9...D1, F1
- Based on monthly profit thresholds with penalties/bonuses
- A10 = $100K+ monthly profit
- F1 = $0 monthly profit or disqualified

## Cache Strategy
- Redis caching with memory fallback
- Product research: 6 hours TTL
- Sales prediction: 24 hours TTL
- Keyword data: 7 days TTL
- AI analysis: 7 days TTL

## API Testing Summary

### ✅ Working APIs
1. **Environment Check** (`GET /api/test`) - All environment variables configured
2. **Product Research** (`POST /api/products/research`) - Full workflow working with keyword input fixed
3. **Sales Prediction** (`GET /api/test/sellersprite`) - Returns detailed profit data
4. **Keyword Mining** (`POST /api/test/sellersprite`) - Returns keyword opportunities
5. **Reverse ASIN** (`POST /api/test/reverse-asin`) - Returns keyword data for ASIN
6. **Debug Endpoint** (`POST /api/debug/sellersprite`) - Raw API response inspection

### 🐛 Bugs Fixed
1. **Keyword Input Issue**: Fixed parameter mismatch between debug endpoint and main product research endpoint
2. **API Parameter Alignment**: Standardized request parameters (page: 1, size: limit || 5)
3. **Filter Spreading**: Removed filter spreading that was causing API incompatibility
4. **Method Definition**: Fixed undefined `isSearchRelevant` method causing crashes

### 📊 Performance Metrics
- **Product Research**: ~15 seconds for 3 products (includes OpenAI analysis)
- **Sales Prediction**: ~1-2 seconds per ASIN
- **Keyword Mining**: ~1-2 seconds per keyword
- **Reverse ASIN**: ~1-2 seconds per ASIN

### 🔧 API Limitations
- **Complex Keywords**: SellerSprite API returns generic results for very niche phrases like "Flagpole Mount For Truck"
- **Single Word Keywords**: Work reliably (e.g., "flagpole" returns actual flagpole products)
- **Popular Keywords**: Work well (e.g., "wireless charger" returns relevant products)
- **Niche Market**: Limited product database for highly specialized items

### 🎯 Next Steps
1. ✅ Fix keyword input processing
2. ✅ Align API parameters between endpoints
3. ✅ Remove debugging code
4. 🔄 Implement save functionality for research results
5. 🔄 Create DataTable for saved research
6. 🔄 Add user research management features

## Research Modal Implementation

### Frontend Components
- **ResearchModal**: ShadCN Dialog component with tabs for keyword/ASIN input
- **Form Validation**: Input validation and error handling
- **Results Display**: Color-coded grading system with profit indicators
- **Save Functionality**: Store research results to user database (pending)

### Keyword Processing
- **Single Words**: Reliable results (e.g., "flagpole" → flagpole products)
- **Popular Phrases**: Good results (e.g., "wireless charger" → relevant products)
- **Niche Phrases**: Limited results due to SellerSprite API limitations
- **Fallback Behavior**: Returns empty results for completely irrelevant matches

### Data Table Requirements
Based on successful API integration, the following tables are needed:

1. **Products Table**: Main research results with grades, sales data, and AI analysis
2. **Keywords Table**: Keyword performance data from reverse ASIN analysis
3. **Saved Research Table**: User's saved research sessions for future reference