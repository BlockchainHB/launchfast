# LaunchFast - Claude Code Project Guide

## Project Overview
Amazon product sourcing dashboard using SellerSprite API + OpenAI GPT-4 for automated A10-F1 scoring system.

## Tech Stack
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS + ShadCN UI
- **Backend**: Next.js API routes + Prisma ORM  
- **Database**: PostgreSQL + Redis (caching)
- **APIs**: SellerSprite (primary) + OpenAI GPT-4 (enhancement) + Apify (fallback)
- **Deployment**: Vercel (full-stack)

## Key Commands

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript check
```

### Database
```bash
npx prisma generate  # Generate Prisma client
npx prisma migrate dev # Run database migrations
npx prisma studio    # Open database GUI
```

### Testing
```bash
npm run test         # Run tests (when implemented)
```

## Project Structure
```
/
├── app/                 # Next.js app router
│   ├── api/            # API routes
│   ├── dashboard/      # Dashboard pages
│   └── globals.css     # Global styles with custom CSS variables
├── components/         # React components
│   ├── ui/            # ShadCN UI components
│   └── custom/        # Custom components
├── lib/               # Utility libraries
│   ├── sellersprite.ts # SellerSprite API client
│   ├── openai.ts      # OpenAI integration
│   ├── apify.ts       # Apify fallback service
│   ├── cache.ts       # Redis caching layer
│   ├── scoring.ts     # A10-F1 scoring algorithm
│   └── utils.ts       # General utilities
├── prisma/            # Database schema
└── types/             # TypeScript types
```

## Environment Variables
```env
DATABASE_URL="postgresql://user:password@localhost:5432/sellersprite"
REDIS_URL="redis://localhost:6379"
SELLERSPRITE_API_KEY="your_api_key"
OPENAI_API_KEY="your_openai_key"
APIFY_API_TOKEN="your_apify_token"
```

## API Integration Strategy

### SellerSprite Endpoints
1. **Product Research** (`/v1/product/research`) - Primary discovery
2. **Sales Prediction** (`/v1/sales/prediction/asin`) - Profit calculations
3. **Reverse ASIN** (`/v1/traffic/keyword`) - Keyword intelligence
4. **Keyword Mining** (`/v1/keyword/miner`) - Market opportunities

### Caching Strategy
- **Product Research**: 6 hours
- **Sales Prediction**: 24 hours  
- **Reverse ASIN**: 7 days
- **Keyword Mining**: 3 days

### OpenAI Integration
- **Model**: GPT-4 with function calling
- **Purpose**: Risk classification, market insights, dimension estimation
- **Cost Optimization**: Batch processing for multiple products

## A10-F1 Scoring Algorithm

### Base Grades (Monthly Profit)
- A10: $100K+, A9: $74K+, A8: $62K+... down to F1: $0

### Instant Disqualifiers
- Price < $25 → F1
- Margin < 25% → F1  
- Risk = "Banned" → F1
- Consistency = "Trendy" → D1

### Penalty System
- High reviews (500+ = -9 pts, 200+ = -5 pts, 50+ = -1 pt)
- High CPC (≥$2.50 = -3 pts)
- Risk factors (Electric = -4 pts, Breakable = -5 pts)

### Boost System
- Low CPC (<$0.50 = +1 to +2 pts)
- High margins (≥50% + good PPU = +3 pts)

## Data Flow
1. **User Input**: Keyword search
2. **SellerSprite**: Product research + sales prediction
3. **OpenAI**: Risk analysis + market insights
4. **Scoring**: Apply A10-F1 algorithm
5. **Display**: Dashboard with results

## Key Features
- Real-time product analysis
- A10-F1 scoring with color-coded grades
- Keyword intelligence and opportunities
- Market insights and risk assessment
- 30-day tracking system
- Export functionality

## Common Issues & Solutions

### Rate Limiting
- Use exponential backoff for API calls
- Implement smart caching with Redis
- Batch process multiple products

### Data Quality
- Validate all API responses
- Use Apify as fallback for missing data
- Add confidence scores for estimates

### Performance
- Parallel API calls with Promise.all
- Optimize database queries
- Use React Query for frontend caching

## Development Notes
- Use TypeScript for all files
- Follow ShadCN UI component patterns
- Implement proper error handling
- Add loading states for all async operations
- Use the custom CSS variables for consistent theming

## Deployment
- Deploy to Vercel for integrated frontend/backend
- Use Railway for PostgreSQL database
- Configure Redis for caching
- Set up monitoring and logging

## Testing Strategy
- Unit tests for scoring algorithm
- Integration tests for API endpoints
- E2E tests for critical user flows
- Performance tests for API response times