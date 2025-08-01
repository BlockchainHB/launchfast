/**
 * LaunchFast Extension Authentication Bridge
 * This script runs on LaunchFast pages and handles authentication requests from the Chrome extension
 */

// Listen for messages from the Chrome extension
window.addEventListener('message', async (event) => {
  // Verify the message is from our extension
  if (event.source !== window || !event.data.type) {
    return;
  }

  switch (event.data.type) {
    case 'EXTENSION_AUTH_REQUEST':
      await handleAuthRequest(event.data.requestId);
      break;
    default:
      break;
  }
});

/**
 * Handle authentication request from extension
 */
async function handleAuthRequest(requestId) {
  try {
    console.log('🔐 LaunchFast: Extension auth request received');
    
    // Debug: Log all localStorage keys to see what's actually stored
    console.log('📊 LaunchFast: All localStorage keys:');
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      console.log(`  - ${key}`);
    }
    
    // Try multiple possible Supabase localStorage key formats
    const supabaseUrl = 'https://nodcoywsdlxgjtptpmnz.supabase.co'
    const possibleKeys = [
      `sb-${supabaseUrl.split('//')[1].replace(/\./g, '-')}-auth-token`,
      `sb-${supabaseUrl.split('//')[1]}-auth-token`,
      `supabase-auth-token`,
      'supabase.auth.token'
    ];
    
    console.log('🔍 LaunchFast: Trying localStorage keys:', possibleKeys);
    
    let authData = null;
    let usedKey = null;
    
    for (const key of possibleKeys) {
      authData = localStorage.getItem(key);
      if (authData) {
        usedKey = key;
        console.log(`✅ LaunchFast: Found auth data with key: ${key}`);
        break;
      }
    }
    
    if (!authData) {
      console.log('❌ LaunchFast: No auth data found in localStorage with any expected key');
      sendAuthResponse(requestId, {
        authenticated: false,
        error: 'No authentication data found'
      });
      return;
    }
    
    console.log('📄 LaunchFast: Auth data preview:', authData.substring(0, 100) + '...');

    const session = JSON.parse(authData)
    
    if (!session || !session.access_token || !session.user) {
      console.log('Invalid session data');
      sendAuthResponse(requestId, {
        authenticated: false,
        error: 'Invalid session data'
      });
      return;
    }

    // Check if token is expired
    const now = Math.floor(Date.now() / 1000)
    if (session.expires_at && session.expires_at < now) {
      console.log('Session expired');
      sendAuthResponse(requestId, {
        authenticated: false,
        error: 'Session expired'
      });
      return;
    }
    
    // User is authenticated - send tokens to extension
    console.log('✅ User authenticated:', session.user.email);
    
    sendAuthResponse(requestId, {
      authenticated: true,
      tokens: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in || 3600,
        expires_at: session.expires_at || Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer'
      },
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0]
      }
    });

  } catch (error) {
    console.error('Extension auth request failed:', error);
    sendAuthResponse(requestId, {
      authenticated: false,
      error: error.message
    });
  }
}

/**
 * Send authentication response back to extension
 */
function sendAuthResponse(requestId, response) {
  window.postMessage({
    type: 'EXTENSION_AUTH_RESPONSE',
    requestId: requestId,
    ...response
  }, '*');
}

// Notify extension that the bridge is ready
window.postMessage({
  type: 'EXTENSION_AUTH_BRIDGE_READY'
}, '*');

console.log('🚀 LaunchFast Extension Auth Bridge loaded');