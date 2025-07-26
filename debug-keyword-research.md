# Keyword Research Debug Guide

## Summary of Changes

The issue was that the Market Analysis tab was showing null values for Products and Purchase Rate columns because:

1. **Database Query Issue**: The `sessionReconstructQuery` in `lib/supabase-client.ts` was only selecting basic fields (keyword_text, search_volume, cpc) instead of all enhanced fields

2. **Missing Data Structure**: The `allKeywordsWithCompetition` field wasn't being built in the database reconstruction method

3. **Type Mismatch**: The MarketAnalysisTab was receiving `aggregatedKeywords` (which lacks enhanced fields) instead of `allKeywordsWithCompetition`

## Fixed Files

1. **lib/supabase-client.ts** - Updated query to include all enhanced fields:
   - purchases, purchase_rate, products_count, ad_products_count, etc.

2. **lib/keyword-research-db.ts** - Added code to build `allKeywordsWithCompetition` with enhanced data

3. **components/keyword-research/KeywordResearchResultsTable.tsx** - Updated to pass `allKeywordsWithCompetition` to MarketAnalysisTab

4. **types/index.ts** - Added missing enhanced fields to OpportunityData interface

5. **lib/keyword-research.ts** - Updated `findTargetedOpportunities` to return both opportunities and allKeywordsWithCompetition

## Testing Steps

1. Run the dev server: `npm run dev`

2. Go to keyword research page

3. Enter ASIN(s) and run research

4. Check the Market Analysis tab - Products and Purchase Rate columns should now show data

## Database Fields Required

The following fields must exist in `keyword_research_keywords` table:
- purchases (integer)
- purchase_rate (float)
- products_count (integer)
- ad_products_count (integer)
- avg_price (float)
- avg_rating (float)
- bid_min (float)
- bid_max (float)
- monopoly_click_rate (float)
- title_density (float)
- relevancy_score (float)

## If Still Having Issues

1. Check browser console for errors
2. Verify the database has the enhanced fields populated
3. Run the test script: `node test-keyword-display.js` (need to add auth cookie first)
4. Check that SellerSprite API is returning enhanced data 