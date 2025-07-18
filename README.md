# LaunchFast - Amazon Product Intelligence Dashboard

**Built by Hasaam Bhatti for LegacyX FBA**

A comprehensive Amazon product sourcing dashboard that automates product research and analysis using advanced APIs and machine learning. This dashboard replaces manual spreadsheet workflows with real-time data analysis and A10-F1 scoring system.

> **Proprietary Software** - This is custom-built software exclusively for LegacyX FBA operations.

## 🚀 Features

### Core Functionality
- **Advanced Product Research**: Keyword and ASIN-based product discovery
- **A10-F1 Scoring System**: Automated grading from A10 (excellent) to F1 (failed opportunities)
- **Real-time API Integration**: SellerSprite, Apify, and OpenAI for comprehensive analysis
- **Competitive Intelligence**: Analysis of competitor reviews and market gaps
- **User Authentication**: Invitation-based signup system with secure user management
- **Data Persistence**: Save and track research results with user-specific databases

### Dashboard Capabilities
- **Quick Research Modal**: Easy-to-use interface for product analysis
- **Live Stats Cards**: Real-time metrics showing products analyzed, high-grade opportunities, revenue potential
- **Data Table**: Comprehensive view of saved products with all key metrics
- **User Management**: Profile display, logout functionality, session management

### Analytics & Intelligence
- **Monthly Profit Predictions**: Revenue and profit estimates based on sales data
- **Risk Assessment**: Product risk classification (Electric, Breakable, Banned, No Risk)
- **Keyword Intelligence**: Search volume, competition scores, and CPC data
- **Review Analysis**: Sentiment analysis and competitive differentiation opportunities
- **Market Insights**: Generated recommendations for product improvements

## 🛠 Tech Stack

### Frontend
- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **ShadCN UI** components for professional interface
- **Framer Motion** for smooth animations

### Backend
- **Next.js API Routes** for serverless functions
- **Supabase** for database and authentication
- **PostgreSQL** with Row Level Security
- **Redis** for caching (optional)

### APIs & Services
- **SellerSprite API** for Amazon sales data and predictions
- **Apify** for product discovery and detailed information
- **OpenAI GPT-4** for analysis and competitive intelligence

## 📋 Prerequisites

Before you begin, ensure you have:

- Node.js 18+ installed
- A Supabase account and project
- SellerSprite API access
- Apify account and token
- OpenAI API key

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/BlockchainHB/launchfast.git
cd launchfast
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# API Keys
SELLERSPRITE_API_KEY=your_sellersprite_api_key
OPENAI_API_KEY=your_openai_api_key
APIFY_API_TOKEN=your_apify_token

# Optional: Redis for caching
REDIS_URL=your_redis_url

# Application Settings
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Database Setup

Run the database setup script in your Supabase SQL editor:

```sql
-- Copy and run the contents of lib/database.sql
-- This creates all necessary tables and RLS policies
```

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 📖 User Guide

### Getting Started

1. **Landing Page**: Visit the homepage to join the waitlist or access early features
2. **Authentication**: Use the invitation-based signup system (requires invitation code)
3. **Dashboard**: Access your personal dashboard after authentication

### Using the Research Module

1. **Quick Research**: Click the "Quick Research" button in the sidebar
2. **Enter Search Terms**: 
   - **Keyword Tab**: Enter product keywords (e.g., "wireless charger")
   - **ASIN Tab**: Enter specific Amazon ASINs for detailed analysis
3. **Review Results**: See up to 3 products with detailed analysis including:
   - A10-F1 grade with color coding
   - Monthly profit estimates
   - Risk classification
   - Sales volume and margin data
4. **Save Products**: Click "Save to Database" to store results for future reference

### Understanding the A10-F1 Scoring System

The grading system evaluates products based on multiple factors:

- **A Grades (A10-A1)**: Excellent opportunities with high profit potential
- **B Grades (B10-B1)**: Good opportunities with moderate profit potential  
- **C Grades (C10-C1)**: Average opportunities requiring careful evaluation
- **D Grades (D10-D1)**: Poor opportunities with significant challenges
- **F Grades (F10-F1)**: Failed opportunities not recommended for sourcing

### Dashboard Features

- **Stats Cards**: Live metrics showing your research progress and opportunities
- **Data Table**: Comprehensive view of all saved products with sorting and filtering
- **User Profile**: Access account settings and logout functionality

## 🔧 Configuration

### API Configuration

#### SellerSprite Setup
1. Sign up for SellerSprite API access
2. Get your API key from the dashboard
3. Add to environment variables

#### Apify Setup
1. Create an Apify account
2. Get your API token
3. Configure the Amazon Product Scraper actor

#### OpenAI Setup
1. Get an OpenAI API key
2. Ensure access to GPT-4 model
3. Configure function calling capabilities

### Database Configuration

The application uses Supabase with the following key tables:
- `user_profiles`: User information and settings
- `products`: Saved product research data
- `keywords`: Keyword intelligence data
- `ai_analysis`: Generated insights and analysis
- `invitation_codes`: Invitation system management

## 📊 API Endpoints

### Product Research
- `POST /api/products/research` - Main research endpoint
- `GET /api/products/save` - Retrieve saved products
- `POST /api/products/save` - Save research results

### Authentication
- `POST /api/auth/signup` - User registration with invitation
- Dashboard auth handled by Supabase

### Analytics
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/user/profile` - User profile data

### Testing Endpoints
- `GET /api/test/sellersprite` - Test SellerSprite integration
- `POST /api/test/reverse-asin` - Test keyword analysis
- `POST /api/test/scoring` - Test A10-F1 scoring system

## 🚀 Deployment

### Vercel Deployment (Recommended)

1. **Connect Repository**: Link your GitHub repository to Vercel
2. **Environment Variables**: Add all required environment variables in Vercel dashboard
3. **Deploy**: Vercel will automatically build and deploy your application

### Manual Deployment

1. **Build the Application**:
   ```bash
   npm run build
   ```

2. **Start Production Server**:
   ```bash
   npm start
   ```

## 🔍 Development

### Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard pages
│   ├── login/            # Authentication pages
│   └── signup/           
├── components/            # React components
│   ├── ui/               # Base UI components
│   └── mvpblocks/        # Feature components
├── lib/                  # Utility libraries
│   ├── supabase.ts       # Database client
│   ├── sellersprite.ts   # SellerSprite API
│   ├── openai.ts         # OpenAI integration
│   ├── scoring.ts        # A10-F1 scoring logic
│   └── cache.ts          # Redis caching
├── types/                # TypeScript definitions
└── middleware.ts         # Authentication middleware
```

### Key Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Development Tips

1. **API Testing**: Use the `/api/test/*` endpoints to verify integrations
2. **Database**: Monitor queries in Supabase dashboard
3. **Caching**: Implement Redis for production performance
4. **Error Handling**: Check browser console and Vercel logs for debugging

## 🔐 Security Features

- **Row Level Security**: Database access restricted to authenticated users
- **API Key Protection**: All sensitive keys stored in environment variables
- **Invitation System**: Controlled user registration
- **Session Management**: Secure authentication with Supabase
- **Input Validation**: Comprehensive validation on all user inputs

## 📈 Performance Optimization

- **Parallel API Calls**: Simultaneous requests to multiple APIs
- **Smart Caching**: Redis caching for frequently accessed data
- **Optimized Queries**: Efficient database queries with proper indexing
- **Lazy Loading**: Components loaded on demand
- **Image Optimization**: Next.js automatic image optimization

## 📝 License & Ownership

This is proprietary software built by **Hasaam Bhatti** exclusively for **LegacyX FBA**. All rights reserved.

- **Developer**: Hasaam Bhatti
- **Owner**: LegacyX FBA
- **License**: Proprietary - No redistribution or modification allowed
- **Usage**: Licensed exclusively to LegacyX FBA and authorized users

## 🆘 Support

For technical support or questions, contact:

- **Developer**: Hasaam Bhatti
- **Company**: LegacyX FBA
- **Documentation**: Check `/api-map.md` and `CLAUDE.md` for technical details

## 🔄 Updates & Roadmap

### Recent Updates
- Complete research module implementation with save functionality
- Enhanced dashboard with real user data integration
- Improved authentication flow with logout functionality
- Advanced error handling and user feedback systems

### Planned Features
- Export functionality for research data
- Advanced filtering and search capabilities
- Bulk research operations
- Enhanced competitive analysis tools
- Mobile responsive improvements
- API rate limiting and usage monitoring

---

**LaunchFast - Built by Hasaam Bhatti for LegacyX FBA** | **Proprietary Software - All Rights Reserved**

This dashboard is designed specifically for LegacyX FBA's Amazon product sourcing operations. Ensure compliance with Amazon's terms of service and all applicable regulations when using this tool for product sourcing activities.
