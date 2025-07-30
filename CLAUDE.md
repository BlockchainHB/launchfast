# CLAUDE.md - LaunchFast Amazon Product Intelligence Dashboard

## Project Overview

**LaunchFast** is a sophisticated Amazon product sourcing dashboard built for LegacyX FBA operations. It automates product research and analysis using advanced APIs and machine learning, replacing manual spreadsheet workflows with real-time data analysis and an A10-F1 scoring system.

### Key Information
- **Built by**: Hasaam Bhatti
- **Owner**: LegacyX FBA
- **License**: Proprietary software
- **Framework**: Next.js 15 with App Router
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel

## Architecture & Tech Stack

### Frontend
- **Next.js 15** with App Router (React 19.1.1)
- **TypeScript** for type safety
- **Tailwind CSS 4** for styling
- **ShadCN UI** components for professional interface
- **Framer Motion** for animations
- **Zustand** for state management

### Backend
- **Next.js API Routes** for serverless functions
- **Supabase** for database and authentication
- **PostgreSQL** with Row Level Security
- **Redis** (optional) for caching via Upstash

### Key Dependencies
- **@supabase/supabase-js**: Database client and authentication
- **stripe**: Payment processing and subscription management
- **openai**: AI analysis and competitive intelligence
- **apify-client**: Product discovery and scraping
- **@tanstack/react-table**: Advanced data tables
- **@tanstack/react-query**: Server state management

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes for all backend functionality
│   │   ├── products/      # Product research and management
│   │   ├── keywords/      # Keyword research system
│   │   ├── auth/          # Authentication endpoints
│   │   ├── billing/       # Stripe integration
│   │   └── dashboard/     # Dashboard data endpoints
│   ├── dashboard/         # Main dashboard pages
│   └── (auth)/           # Authentication pages
├── components/            # React components
│   ├── ui/               # Base UI components (ShadCN)
│   ├── keyword-research/ # Keyword research specific components
│   └── settings/         # Settings components
├── lib/                  # Core business logic
│   ├── calculation-engine.ts  # Mathematical operations engine
│   ├── scoring.ts            # A10-F1 grading system
│   ├── supabase.ts          # Database client
│   ├── stripe.ts            # Payment processing
│   ├── openai.ts            # AI analysis
│   └── apify.ts             # Product scraping
├── types/                # TypeScript definitions
└── hooks/                # React hooks
```

## Core Features

### 1. Product Research System
- **Keyword-based research**: Find products by search terms
- **ASIN-based analysis**: Deep dive into specific products
- **A10-F1 scoring**: Proprietary grading from A10 (goldmine) to F1 (avoid)
- **Save functionality**: Store research results in database

### 2. Advanced Keyword Research
- **Multi-tab interface**: Overview, Market Analysis, Gap Analysis, Opportunities, Product Comparison
- **Real-time streaming**: Progressive data loading with WebSocket-like updates
- **Session management**: Save and restore research sessions
- **Decision tracking**: Record research decisions and outcomes

### 3. Market Analysis Engine
- **Calculation Engine** (`lib/calculation-engine.ts`): Industry-grade mathematical operations
- **Safe number handling**: Robust validation and fallback systems
- **Market metrics aggregation**: Calculate market-level insights from product data
- **Risk assessment**: Product risk classification (Electric, Breakable, Medical, Safe)

### 4. Scoring System
- **Base grading**: Monthly profit determines base grade
- **Penalty system**: Competition, costs, and risks reduce grade
- **Boost system**: Low competition and high margins improve grade
- **A10 gate**: Strict requirements for highest grade
- **Disqualifiers**: Instant rejection criteria

## API Integration

### External APIs
1. **SellerSprite API**: Amazon sales data and predictions
2. **Apify**: Product discovery and detailed information scraping
3. **OpenAI GPT-4**: Analysis and competitive intelligence generation

### Internal API Structure
- **RESTful design** with consistent error handling
- **Streaming endpoints** for real-time updates
- **Rate limiting** and usage tracking
- **Comprehensive logging** for debugging

## Database Schema

### Core Tables
- `user_profiles`: User information and subscription data
- `products`: Saved product research data
- `keywords`: Keyword intelligence data
- `keyword_research_sessions`: Research session management
- `markets`: Market analysis data
- `ai_analysis`: Generated insights and analysis
- `invitation_codes`: Invitation system management

### Key Features
- **Row Level Security** for data isolation
- **Audit trails** for all operations
- **Soft deletes** for data recovery
- **Indexing** for performance optimization

## Authentication & Authorization

### System Design
- **Supabase Auth** for user management
- **Invitation-based signup** with code validation
- **Row Level Security** for data access control
- **Session management** with automatic refresh

### User Roles
- **Admin**: Full system access
- **User**: Standard dashboard access
- **Trial**: Limited feature access

## Subscription & Billing

### Stripe Integration
- **Subscription management** with multiple tiers
- **Usage tracking** and limits
- **Trial system** with automatic notifications
- **Payment method management**
- **Webhook handling** for real-time updates

## Development Guidelines

### Code Standards
- **TypeScript strict mode** enabled
- **ESLint** configuration with Next.js rules
- **Component composition** over inheritance
- **Error boundaries** for graceful failures
- **Loading states** for all async operations

### Testing
- **Unit tests** in `lib/__tests__/`
- **API endpoint testing** with dedicated test files
- **Integration testing** for critical workflows

### Performance
- **Next.js optimization** with automatic code splitting
- **Image optimization** for product images
- **Caching strategies** with Redis
- **Parallel API calls** for data aggregation
- **Streaming responses** for real-time updates

## Key Files to Understand

### Core Business Logic
- `lib/calculation-engine.ts`: Mathematical operations and validation engine
- `lib/scoring.ts`: A10-F1 grading system implementation
- `lib/keyword-research.ts`: Keyword research orchestration
- `lib/supabase.ts`: Database client and type definitions

### API Routes
- `app/api/products/research/route.ts`: Main product research endpoint
- `app/api/keywords/research/route.ts`: Keyword research system
- `app/api/keywords/research/stream/route.ts`: Real-time keyword updates
- `app/api/stripe/webhooks/route.ts`: Payment processing

### Components
- `components/keyword-research/KeywordResearchResultsTable.tsx`: Main results interface
- `components/data-table.tsx`: Reusable data table component
- `components/research-modal.tsx`: Product research modal

## Environment Variables

### Required Variables
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# APIs
SELLERSPRITE_API_KEY=
OPENAI_API_KEY=
APIFY_API_TOKEN=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Optional
REDIS_URL=
NEXT_PUBLIC_APP_URL=
```

## Development Commands

### Standard Commands
- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run start`: Start production server
- `npm run lint`: Run ESLint

### Testing Commands
- `node test-keyword-research.js`: Test keyword research flow
- `node test-sellersprite-endpoints.js`: Test API integrations
- `node test-enhanced-keyword-research-complete.js`: Full system test

## Debugging & Monitoring

### Logging
- **Structured logging** with context information
- **Error tracking** with detailed stack traces
- **Performance monitoring** for API calls
- **User activity tracking** for analytics

### Common Issues
1. **API rate limits**: Implement exponential backoff
2. **Database connection limits**: Use connection pooling
3. **Memory usage**: Monitor calculation engine operations
4. **CORS issues**: Properly configured for frontend/backend communication

## Security Considerations

### Data Protection
- **Row Level Security** enforced at database level
- **API key protection** with environment variables
- **Input validation** on all user inputs
- **SQL injection prevention** with parameterized queries

### Security Headers
- Content Security Policy configured
- XSS protection enabled
- Frame options set to DENY
- HTTPS enforcement in production

## Performance Optimization

### Frontend
- **Code splitting** with Next.js automatic optimization
- **Image optimization** with Next.js Image component
- **Lazy loading** for heavy components
- **Memoization** for expensive calculations

### Backend
- **Connection pooling** for database operations
- **Caching** with Redis for frequently accessed data
- **Parallel processing** for API aggregation
- **Streaming responses** for large datasets

## Deployment

### Vercel Configuration
- **Automatic deployments** from main branch
- **Environment variables** configured in dashboard
- **Edge functions** for global performance
- **Analytics** and monitoring enabled

### Database Migrations
- SQL migration files in `supabase-migrations/`
- Version-controlled schema changes
- Rollback procedures documented

This documentation provides a comprehensive overview of the LaunchFast system architecture, codebase structure, and development practices. Use this as a reference for understanding the project and making informed development decisions.