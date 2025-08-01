# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# LaunchFast Amazon Product Intelligence Dashboard

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

## Core Architecture Patterns

### 1. Streaming API Design
**Critical Pattern:** Many APIs use streaming responses for real-time updates
- `app/api/products/research/stream/route.ts`: Streaming product research
- `app/api/keywords/research/stream/route.ts`: Streaming keyword research  
- `app/api/suppliers/search/stream/route.ts`: Streaming supplier search

**Implementation:** APIs use `ReadableStream` and `TextEncoder` to send progressive updates to the frontend, allowing real-time UI updates during long-running operations.

### 2. Calculation Engine Architecture
**File:** `lib/calculation-engine.ts`
**Pattern:** Industry-grade mathematical operations with comprehensive validation
- **SafeNumber system**: All numbers wrapped with validation and fallback logic
- **CalculationContext**: Tracks operation source (initial/override/recalculation)
- **ValidationResult**: Comprehensive error and warning tracking
- **Immutable calculations**: Operations return new objects, never mutate

### 3. A10-F1 Scoring System Implementation
**Files:** `lib/scoring.ts`, profit thresholds hard-coded
- **Base grading**: Monthly profit determines initial grade (A10: $100k, F1: $0)
- **Penalty system**: Deductions for high competition, risks, low margins
- **Boost system**: Bonuses for exceptional metrics
- **A10 gate**: Strict requirements prevent artificial A10 grades
- **Disqualifiers**: Instant F1 for prohibited/dangerous products

### 4. Database Patterns
**Row Level Security (RLS):** All tables use RLS policies for data isolation
**Soft deletes:** Most tables use `deleted_at` timestamp instead of hard deletes
**Override system:** Products and markets can be manually overridden with audit trails
**Session management:** Keyword research uses session-based state management

### 5. State Management Architecture  
**Frontend:** Zustand stores in `lib/stores/` for client state
**Server state:** React Query (`@tanstack/react-query`) for API data
**Real-time updates:** Custom hooks for streaming API consumption

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

## Critical Files for Development

### Core Business Logic (Start Here)
- `lib/calculation-engine.ts`: Mathematical operations engine - **READ FIRST** for any calculation work
- `lib/scoring.ts`: A10-F1 grading system with profit thresholds
- `lib/keyword-research.ts`: Orchestrates complex keyword research workflows
- `lib/supabase.ts`: Database client with comprehensive type definitions

### API Architecture 
**Main Research Endpoints:**
- `app/api/products/research/route.ts`: Primary product research endpoint
- `app/api/products/research/stream/route.ts`: Streaming product research
- `app/api/keywords/research/route.ts`: Keyword research orchestration
- `app/api/keywords/research/stream/route.ts`: Real-time keyword streaming

**Authentication & Billing:**
- `app/api/auth/signup/route.ts`: Invitation-based user registration
- `app/api/stripe/webhooks/route.ts`: Stripe subscription webhook handling
- `middleware.ts`: Route protection and authentication

### Frontend Components
**Primary Interfaces:**
- `components/keyword-research/KeywordResearchResultsTable.tsx`: Main research interface
- `components/supplier-sourcing/SupplierSourcingResultsTable.tsx`: Supplier management
- `components/data-table.tsx`: Reusable table component with sorting/filtering
- `app/dashboard/page.tsx`: Main dashboard layout

### Configuration Files
- `next.config.ts`: Security headers, build config (ignores TS/ESLint errors)
- `tsconfig.json`: TypeScript configuration with path mapping
- `middleware.ts`: Route protection and user authentication

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

### Core Development
- `npm run dev`: Start development server on localhost:3000
- `npm run build`: Build for production (checks TypeScript and builds)
- `npm run start`: Start production server
- `npm run lint`: Run ESLint with Next.js rules

### System Testing Commands
The following test scripts validate core functionality:

**API Integration Tests:**
- `node test-sellersprite-endpoints.js`: Test SellerSprite API integration
- `node test-api-endpoint.js`: Test main product research endpoints
- `node test-amazon-fees.js`: Test fee calculation system

**Keyword Research Tests:**
- `node test-keyword-research.js`: Basic keyword research flow
- `node test-enhanced-keyword-research-complete.js`: Complete keyword research system
- `node test-streaming-keyword-research.js`: Test streaming API endpoints
- `node test-keyword-flow.js`: Test keyword processing pipeline

**Supplier & CRM Tests:**
- `node test-supplier-search.js`: Test supplier search functionality
- `node test-supplier-crm-apis.js`: Test CRM API endpoints
- `node test-supplier-search-streaming.js`: Test streaming supplier search

**System Integration:**
- `node test-enhanced-integration.js`: Full integration testing
- `node test-workflow-trace.js`: Debug workflow tracing

### Running Single Tests
Use `node <test-file>` to run individual test scripts. Most test files are self-contained and will output detailed logs.

## Debugging & Monitoring

### Logging
- **Structured logging** with context information
- **Error tracking** with detailed stack traces
- **Performance monitoring** for API calls
- **User activity tracking** for analytics

### Common Issues & Debugging

1. **API Rate Limits**: All external APIs (SellerSprite, Apify, OpenAI) have rate limits
   - Use test scripts to verify API connectivity before debugging application issues
   - Check API key validity in environment variables

2. **Streaming API Issues**: 
   - Frontend expects `data: {json}` format from streaming endpoints
   - Use browser Network tab to inspect streaming responses
   - Test streaming with `test-streaming-*.js` scripts

3. **Calculation Engine Errors**:
   - All calculations return `CalculationResult<T>` with validation info
   - Check `validation.errors` array for mathematical operation failures
   - SafeNumber fallbacks prevent crashes but may indicate data quality issues

4. **Database Issues**:
   - Use `supabase-migrations/` SQL files for schema changes
   - RLS policies can cause "no data" issues - check user permissions
   - Override system logs are in `product_overrides` and `market_overrides` tables

5. **TypeScript Build Errors**: 
   - `next.config.ts` ignores TS errors during builds (line 8)
   - Fix type issues in development, don't rely on build-time bypasses

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