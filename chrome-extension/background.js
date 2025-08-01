/**
 * LaunchFast Chrome Extension - Background Service Worker
 * Handles API communication, authentication, and data management
 */

// Note: Supabase auth calls moved to content scripts to avoid service worker issues

// Extension configuration
const CONFIG = {
  apiBaseUrl: 'https://launchfastlegacyx.com', // Replace with actual domain
  devApiBaseUrl: 'http://localhost:3000',
  maxConcurrentRequests: 5,
  cacheExpiry: 30 * 60 * 1000, // 30 minutes
  retryAttempts: 3
};

// API request queue management
let requestQueue = [];
let activeRequests = 0;

/**
 * Initialize background service worker
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('LaunchFast Extension installed:', details);
  
  // Set default settings
  await chrome.storage.local.set({
    isEnabled: true,
    showCards: true,
    autoAnalyze: true,
    apiEnvironment: 'production',
    lastSync: Date.now()
  });
});

/**
 * Handle messages from content scripts
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'ANALYZE_PRODUCTS':
      handleProductAnalysis(message.data, sendResponse);
      break;
      
    case 'GET_CACHED_DATA':
      getCachedProductData(message.asin, sendResponse);
      break;
      
    case 'SAVE_PRODUCT':
      saveProductToLaunchFast(message.data, sendResponse);
      break;
      
    case 'CHECK_AUTH':
      checkAuthenticationStatus(sendResponse);
      break;
      
    case 'LOGIN':
      initiateOAuthLogin(sendResponse);
      break;
      
    case 'LOGOUT':
      handleLogout(sendResponse);
      break;
      
    case 'GET_SETTINGS':
      getExtensionSettings(sendResponse);
      break;
      
    case 'UPDATE_SETTINGS':
      updateExtensionSettings(message.data, sendResponse);
      break;
      
    default:
      console.warn('Unknown message type:', message.type);
      sendResponse({ error: 'Unknown message type' });
  }
  
  // Return true to indicate async response
  return true;
});

/**
 * Handle product analysis requests
 */
async function handleProductAnalysis(products, sendResponse) {
  try {
    console.log('Analyzing products:', products.length);
    
    // Filter out already cached products
    const uncachedProducts = [];
    const cachedResults = [];
    
    for (const product of products) {
      const cached = await getCachedData(product.asin);
      if (cached && !isCacheExpired(cached.timestamp)) {
        cachedResults.push({ ...cached.data, cached: true });
      } else {
        uncachedProducts.push(product);
      }
    }
    
    // Send cached results immediately
    if (cachedResults.length > 0) {
      sendResponse({
        success: true,
        data: cachedResults,
        cached: true,
        remaining: uncachedProducts.length
      });
    }
    
    // Process uncached products
    if (uncachedProducts.length > 0) {
      const analysisResults = await batchAnalyzeProducts(uncachedProducts);
      
      // Cache results
      for (const result of analysisResults) {
        await cacheProductData(result.asin, result);
      }
      
      sendResponse({
        success: true,
        data: analysisResults,
        cached: false,
        total: products.length
      });
    }
    
  } catch (error) {
    console.error('Product analysis failed:', error);
    sendResponse({
      success: false,
      error: error.message,
      data: []
    });
  }
}

/**
 * Batch analyze products with rate limiting
 */
async function batchAnalyzeProducts(products) {
  const results = [];
  const batches = chunkArray(products, CONFIG.maxConcurrentRequests);
  
  for (const batch of batches) {
    const batchPromises = batch.map(product => analyzeProduct(product));
    const batchResults = await Promise.allSettled(batchPromises);
    
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        console.error('Product analysis failed:', batch[index].asin, result.reason);
        // Add placeholder result for failed analysis
        results.push({
          asin: batch[index].asin,
          error: 'Analysis failed',
          grade: 'Unknown',
          cached: false
        });
      }
    });
    
    // Rate limiting delay between batches
    if (batches.indexOf(batch) < batches.length - 1) {
      await delay(1000); // 1 second delay between batches
    }
  }
  
  return results;
}

/**
 * Analyze single product using LaunchFast API
 */
async function analyzeProduct(product) {
  const settings = await getExtensionSettings();
  const apiUrl = settings.apiEnvironment === 'development' 
    ? CONFIG.devApiBaseUrl 
    : CONFIG.apiBaseUrl;
  
  try {
    // Get access token for authentication
    const accessToken = await LaunchFastSupabase.getAccessToken();
    if (!accessToken) {
      throw new Error('No access token available. Please login first.');
    }
    
    // Use streaming endpoint for real-time analysis
    const response = await fetch(`${apiUrl}/api/products/research/asin/stream?asin=${product.asin}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    // Handle streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let analysisResult = null;
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.phase === 'complete' && data.data?.products?.length > 0) {
              analysisResult = data.data.products[0];
            }
          } catch (e) {
            console.warn('Failed to parse streaming data:', e);
          }
        }
      }
    }
    
    if (analysisResult) {
      return {
        ...analysisResult,
        timestamp: Date.now(),
        cached: false
      };
    } else {
      throw new Error('No analysis result received');
    }
    
  } catch (error) {
    console.error('API request failed:', error);
    
    // Fallback to basic analysis if API fails
    return {
      asin: product.asin,
      title: product.title || 'Unknown Product',
      price: product.price || 0,
      grade: 'Unknown',
      error: error.message,
      timestamp: Date.now(),
      cached: false
    };
  }
}

/**
 * Cache management functions
 */
async function getCachedData(asin) {
  try {
    const result = await chrome.storage.local.get(`product_${asin}`);
    return result[`product_${asin}`] || null;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

async function cacheProductData(asin, data) {
  try {
    const cacheKey = `product_${asin}`;
    await chrome.storage.local.set({
      [cacheKey]: {
        data,
        timestamp: Date.now()
      }
    });
  } catch (error) {
    console.error('Cache set error:', error);
  }
}

function isCacheExpired(timestamp) {
  return Date.now() - timestamp > CONFIG.cacheExpiry;
}

/**
 * Authentication management - uses background script to bypass CORS
 */
async function checkAuthenticationStatus(sendResponse) {
  try {
    console.log('🔐 Background: Checking authentication status directly');
    
    // Background scripts can make cross-origin requests without CORS restrictions
    const response = await fetch('https://launchfastlegacyx.com/api/auth/user', {
      method: 'GET',
      credentials: 'include', // Include HTTP-only cookies
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Background: User authenticated:', data.user?.email);
      
      sendResponse({
        authenticated: true,
        user: data.user,
        session: { authenticated: true, timestamp: Date.now() }
      });
    } else if (response.status === 401) {
      console.log('❌ Background: User not authenticated');
      sendResponse({
        authenticated: false,
        error: 'Not authenticated'
      });
    } else {
      throw new Error(`API request failed: ${response.status}`);
    }
    
  } catch (error) {
    console.error('❌ Background: Auth check failed:', error);
    sendResponse({
      authenticated: false,
      error: error.message
    });
  }
}

/**
 * Login handlers - delegates to content script
 */
async function initiateOAuthLogin(sendResponse) {
  try {
    console.log('🔐 Background: Initiating login via content script');
    
    // Send message to content script to handle login
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length === 0) {
      sendResponse({
        success: false,
        error: 'No active tab found'
      });
      return;
    }
    
    chrome.tabs.sendMessage(tabs[0].id, {
      type: 'INITIATE_LOGIN'
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Failed to communicate with content script:', chrome.runtime.lastError);
        sendResponse({
          success: false,
          error: 'Could not initiate login'
        });
      } else {
        sendResponse(response);
      }
    });
    
  } catch (error) {
    console.error('Login initiation failed:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

async function handleLogout(sendResponse) {
  try {
    console.log('👋 Handling logout');
    
    // Check if Supabase client is available
    if (typeof LaunchFastSupabase === 'undefined') {
      console.error('LaunchFastSupabase not available');
      sendResponse({
        success: false,
        error: 'Authentication system not initialized'
      });
      return;
    }
    
    // Sign out user
    const result = await LaunchFastSupabase.signOut();
    
    if (result.success) {
      sendResponse({
        success: true,
        message: 'Logged out successfully'
      });
    } else {
      sendResponse({
        success: false,
        error: result.error || 'Logout failed'
      });
    }
  } catch (error) {
    console.error('Logout failed:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// OAuth tab listener removed - now using message passing authentication

/**
 * Settings management
 */
async function getExtensionSettings(sendResponse) {
  try {
    const settings = await chrome.storage.local.get([
      'isEnabled',
      'showCards',
      'autoAnalyze',
      'apiEnvironment'
    ]);
    
    const result = {
      isEnabled: settings.isEnabled ?? true,
      showCards: settings.showCards ?? true,
      autoAnalyze: settings.autoAnalyze ?? true,
      apiEnvironment: settings.apiEnvironment ?? 'production'
    };
    
    if (sendResponse) {
      sendResponse(result);
    }
    return result;
  } catch (error) {
    console.error('Settings get error:', error);
    const fallback = {
      isEnabled: true,
      showCards: true,
      autoAnalyze: true,
      apiEnvironment: 'production'
    };
    
    if (sendResponse) {
      sendResponse(fallback);
    }
    return fallback;
  }
}

async function updateExtensionSettings(newSettings, sendResponse) {
  try {
    await chrome.storage.local.set(newSettings);
    sendResponse({ success: true });
  } catch (error) {
    console.error('Settings update error:', error);
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

/**
 * Product saving functionality
 */
async function saveProductToLaunchFast(productData, sendResponse) {
  try {
    const settings = await getExtensionSettings();
    const apiUrl = settings.apiEnvironment === 'development' 
      ? CONFIG.devApiBaseUrl 
      : CONFIG.apiBaseUrl;
    
    // Get access token for authentication
    const accessToken = await LaunchFastSupabase.getAccessToken();
    if (!accessToken) {
      throw new Error('No access token available. Please login first.');
    }
    
    const response = await fetch(`${apiUrl}/api/products/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(productData)
    });
    
    if (response.ok) {
      const result = await response.json();
      sendResponse({
        success: true,
        data: result
      });
    } else {
      throw new Error(`Save failed: ${response.status}`);
    }
  } catch (error) {
    console.error('Product save failed:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * Utility functions
 */
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Handle extension updates
chrome.runtime.onUpdateAvailable.addListener(() => {
  console.log('Extension update available');
  chrome.runtime.reload();
});

console.log('LaunchFast Background Service Worker initialized');