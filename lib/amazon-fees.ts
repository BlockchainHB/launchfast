/**
 * Amazon Referral Fee Calculator
 * 
 * This utility calculates Amazon referral fees based on the official Amazon fee structure.
 * It handles both simple flat rates and complex tiered pricing structures.
 */

export interface FeeTier {
  min: number;
  max?: number;
  rate: number;
}

export interface FeeStructure {
  tiers: FeeTier[];
  fixedFee: number;
  category: string;
}

/**
 * Amazon referral fee structures by category
 * Based on official Amazon seller fee schedule
 */
export const AMAZON_FEE_STRUCTURES: Record<string, FeeStructure> = {
  'Amazon Device Accessories': {
    tiers: [{ min: 0, rate: 0.45 }],
    fixedFee: 0.30,
    category: 'Amazon Device Accessories'
  },
  'Automotive and Powersports': {
    tiers: [{ min: 0, rate: 0.12 }],
    fixedFee: 0.30,
    category: 'Automotive and Powersports'
  },
  'Baby Products': {
    tiers: [
      { min: 0, max: 10.00, rate: 0.08 },
      { min: 10.01, rate: 0.15 }
    ],
    fixedFee: 0.30,
    category: 'Baby Products'
  },
  'Backpacks, Handbags, and Luggage': {
    tiers: [{ min: 0, rate: 0.15 }],
    fixedFee: 0.30,
    category: 'Backpacks, Handbags, and Luggage'
  },
  'Base Equipment Power Tools': {
    tiers: [{ min: 0, rate: 0.12 }],
    fixedFee: 0.30,
    category: 'Base Equipment Power Tools'
  },
  'Beauty, Health and Personal Care': {
    tiers: [
      { min: 0, max: 10.00, rate: 0.08 },
      { min: 10.01, rate: 0.15 }
    ],
    fixedFee: 0.30,
    category: 'Beauty, Health and Personal Care'
  },
  'Business, Industrial, and Scientific Supplies': {
    tiers: [{ min: 0, rate: 0.12 }],
    fixedFee: 0.30,
    category: 'Business, Industrial, and Scientific Supplies'
  },
  'Clothing and Accessories': {
    tiers: [
      { min: 0, max: 15.00, rate: 0.05 },
      { min: 15.01, max: 20.00, rate: 0.10 },
      { min: 20.01, rate: 0.17 }
    ],
    fixedFee: 0.30,
    category: 'Clothing and Accessories'
  },
  'Compact Appliances': {
    tiers: [
      { min: 0, max: 300.00, rate: 0.15 },
      { min: 300.01, rate: 0.08 }
    ],
    fixedFee: 0.30,
    category: 'Compact Appliances'
  },
  'Computers': {
    tiers: [{ min: 0, rate: 0.08 }],
    fixedFee: 0.30,
    category: 'Computers'
  },
  'Consumer Electronics': {
    tiers: [{ min: 0, rate: 0.08 }],
    fixedFee: 0.30,
    category: 'Consumer Electronics'
  },
  'Electronics Accessories': {
    tiers: [
      { min: 0, max: 100.00, rate: 0.15 },
      { min: 100.01, rate: 0.08 }
    ],
    fixedFee: 0.30,
    category: 'Electronics Accessories'
  },
  'Everything Else': {
    tiers: [{ min: 0, rate: 0.15 }],
    fixedFee: 0.30,
    category: 'Everything Else'
  },
  'Eyewear': {
    tiers: [{ min: 0, rate: 0.15 }],
    fixedFee: 0.30,
    category: 'Eyewear'
  },
  'Fine Art': {
    tiers: [
      { min: 0, max: 100.00, rate: 0.20 },
      { min: 100.01, max: 1000.00, rate: 0.15 },
      { min: 1000.01, max: 5000.00, rate: 0.10 },
      { min: 5000.01, rate: 0.05 }
    ],
    fixedFee: 0,
    category: 'Fine Art'
  },
  'Footwear': {
    tiers: [{ min: 0, rate: 0.15 }],
    fixedFee: 0.30,
    category: 'Footwear'
  },
  'Full-Size Appliances': {
    tiers: [{ min: 0, rate: 0.08 }],
    fixedFee: 0.30,
    category: 'Full-Size Appliances'
  },
  'Furniture': {
    tiers: [
      { min: 0, max: 200.00, rate: 0.15 },
      { min: 200.01, rate: 0.10 }
    ],
    fixedFee: 0.30,
    category: 'Furniture'
  },
  'Gift Cards': {
    tiers: [{ min: 0, rate: 0.20 }],
    fixedFee: 0,
    category: 'Gift Cards'
  },
  'Grocery and Gourmet': {
    tiers: [
      { min: 0, max: 15.00, rate: 0.08 },
      { min: 15.01, rate: 0.15 }
    ],
    fixedFee: 0,
    category: 'Grocery and Gourmet'
  },
  'Home and Kitchen': {
    tiers: [{ min: 0, rate: 0.15 }],
    fixedFee: 0.30,
    category: 'Home and Kitchen'
  },
  'Jewelry': {
    tiers: [
      { min: 0, max: 250.00, rate: 0.20 },
      { min: 250.01, rate: 0.05 }
    ],
    fixedFee: 0.30,
    category: 'Jewelry'
  },
  'Lawn and Garden': {
    tiers: [{ min: 0, rate: 0.15 }],
    fixedFee: 0.30,
    category: 'Lawn and Garden'
  },
  'Lawn Mowers and Snow Throwers': {
    tiers: [
      { min: 0, max: 500.00, rate: 0.15 },
      { min: 500.01, rate: 0.08 }
    ],
    fixedFee: 0.30,
    category: 'Lawn Mowers and Snow Throwers'
  },
  'Mattresses': {
    tiers: [{ min: 0, rate: 0.15 }],
    fixedFee: 0.30,
    category: 'Mattresses'
  },
  'Media - Books, DVD, Music, Software, Video': {
    tiers: [{ min: 0, rate: 0.15 }],
    fixedFee: 0,
    category: 'Media - Books, DVD, Music, Software, Video'
  },
  'Merchant Fulfilled Services': {
    tiers: [{ min: 0, rate: 0.20 }],
    fixedFee: 0.30,
    category: 'Merchant Fulfilled Services'
  },
  'Musical Instruments and AV Production': {
    tiers: [{ min: 0, rate: 0.15 }],
    fixedFee: 0.30,
    category: 'Musical Instruments and AV Production'
  },
  'Office Products': {
    tiers: [{ min: 0, rate: 0.15 }],
    fixedFee: 0.30,
    category: 'Office Products'
  },
  'Pet Products': {
    tiers: [{ min: 0, rate: 0.15 }], // Note: 22% for veterinary diets not implemented
    fixedFee: 0.30,
    category: 'Pet Products'
  },
  'Sports and Outdoors': {
    tiers: [{ min: 0, rate: 0.15 }],
    fixedFee: 0.30,
    category: 'Sports and Outdoors'
  },
  'Tires': {
    tiers: [{ min: 0, rate: 0.10 }],
    fixedFee: 0.30,
    category: 'Tires'
  },
  'Tools and Home Improvement': {
    tiers: [{ min: 0, rate: 0.15 }],
    fixedFee: 0.30,
    category: 'Tools and Home Improvement'
  },
  'Toys and Games': {
    tiers: [{ min: 0, rate: 0.15 }],
    fixedFee: 0.30,
    category: 'Toys and Games'
  },
  'Video Game Consoles': {
    tiers: [{ min: 0, rate: 0.08 }],
    fixedFee: 0,
    category: 'Video Game Consoles'
  },
  'Video Games and Gaming Accessories': {
    tiers: [{ min: 0, rate: 0.15 }],
    fixedFee: 0,
    category: 'Video Games and Gaming Accessories'
  },
  'Watches': {
    tiers: [
      { min: 0, max: 1500.00, rate: 0.16 },
      { min: 1500.01, rate: 0.03 }
    ],
    fixedFee: 0.30,
    category: 'Watches'
  }
};

/**
 * Maps Apify breadcrumb categories to Amazon referral fee categories
 */
export const APIFY_TO_AMAZON_CATEGORY_MAP: Record<string, string> = {
  // Exact matches
  'Home & Kitchen': 'Home and Kitchen',
  'Tools & Home Improvement': 'Tools and Home Improvement',
  'Sports & Outdoors': 'Sports and Outdoors',
  'Toys & Games': 'Toys and Games',
  'Beauty & Personal Care': 'Beauty, Health and Personal Care',
  'Health & Household': 'Beauty, Health and Personal Care',
  'Baby & Toddler': 'Baby Products',
  'Baby': 'Baby Products',
  'Clothing, Shoes & Jewelry': 'Clothing and Accessories',
  'Clothing': 'Clothing and Accessories',
  'Shoes': 'Footwear',
  'Jewelry': 'Jewelry',
  'Electronics': 'Consumer Electronics',
  'Computers': 'Computers',
  'Office Products': 'Office Products',
  'Pet Supplies': 'Pet Products',
  'Automotive': 'Automotive and Powersports',
  'Industrial & Scientific': 'Business, Industrial, and Scientific Supplies',
  'Grocery & Gourmet Food': 'Grocery and Gourmet',
  'Arts, Crafts & Sewing': 'Everything Else',
  'Books': 'Media - Books, DVD, Music, Software, Video',
  'Movies & TV': 'Media - Books, DVD, Music, Software, Video',
  'Music': 'Media - Books, DVD, Music, Software, Video',
  'Video Games': 'Video Games and Gaming Accessories',
  'Musical Instruments': 'Musical Instruments and AV Production',
  'Patio, Lawn & Garden': 'Lawn and Garden',
  'Appliances': 'Full-Size Appliances',
  'Furniture & Décor': 'Furniture',
  'Furniture': 'Furniture',
  'Mattresses': 'Mattresses',
  'Luggage & Travel Gear': 'Backpacks, Handbags, and Luggage',
  'Collectibles & Fine Art': 'Fine Art',
  'Gift Cards': 'Gift Cards',
  
  // Fallback for unmapped categories
  'default': 'Everything Else'
};

/**
 * Extracts the primary category from Apify breadcrumbs
 * Example: "Home & Kitchen > Kitchen & Dining > Small Appliances" -> "Home & Kitchen"
 */
export function extractPrimaryCategory(breadcrumbs: string): string {
  if (!breadcrumbs) return 'default';
  
  const categories = breadcrumbs.split(' > ');
  return categories[0]?.trim() || 'default';
}

/**
 * Maps Apify category to Amazon referral fee category
 */
export function mapApifyToAmazonCategory(apifyCategory: string): string {
  const primaryCategory = extractPrimaryCategory(apifyCategory);
  return APIFY_TO_AMAZON_CATEGORY_MAP[primaryCategory] || APIFY_TO_AMAZON_CATEGORY_MAP['default'];
}

/**
 * Calculates Amazon referral fee for a given price and category
 */
export function calculateAmazonReferralFee(price: number, amazonCategory: string): number {
  const feeStructure = AMAZON_FEE_STRUCTURES[amazonCategory];
  
  if (!feeStructure) {
    // Default to "Everything Else" if category not found
    return calculateAmazonReferralFee(price, 'Everything Else');
  }
  
  let totalFee = 0;
  let remainingPrice = price;
  
  // Calculate tiered fees
  for (const tier of feeStructure.tiers) {
    if (remainingPrice <= 0) break;
    
    const tierMin = tier.min;
    const tierMax = tier.max || Infinity;
    const applicableAmount = Math.min(remainingPrice, tierMax - tierMin + 0.01);
    
    if (price >= tierMin) {
      const feeAmount = applicableAmount * tier.rate;
      totalFee += feeAmount;
      remainingPrice -= applicableAmount;
    }
  }
  
  // Add fixed fee
  totalFee += feeStructure.fixedFee;
  
  return Math.round(totalFee * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate referral fee from Apify breadcrumbs and price
 */
export function calculateReferralFeeFromApify(breadcrumbs: string, price: number): {
  fee: number;
  category: string;
  rate: string;
} {
  const amazonCategory = mapApifyToAmazonCategory(breadcrumbs);
  const fee = calculateAmazonReferralFee(price, amazonCategory);
  const feeStructure = AMAZON_FEE_STRUCTURES[amazonCategory];
  
  // Create a user-friendly rate description
  let rateDescription = '';
  if (feeStructure) {
    if (feeStructure.tiers.length === 1) {
      rateDescription = `${(feeStructure.tiers[0].rate * 100).toFixed(1)}%`;
    } else {
      rateDescription = 'Tiered';
    }
    if (feeStructure.fixedFee > 0) {
      rateDescription += ` + $${feeStructure.fixedFee.toFixed(2)}`;
    }
  }
  
  return {
    fee,
    category: amazonCategory,
    rate: rateDescription
  };
}