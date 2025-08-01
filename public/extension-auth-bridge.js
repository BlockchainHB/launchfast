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
    
    // Check if user is authenticated by looking for auth cookies/session storage
    // This is a fallback method when Supabase client isn't directly accessible
    
    // Try to get session from localStorage (Supabase's default storage)
    const supabaseUrl = 'https://nodcoywsdlxgjtptpmnz.supabase.co'
    const storageKey = `sb-${supabaseUrl.split('//')[1].replace(/\./g, '-')}-auth-token`
    
    const authData = localStorage.getItem(storageKey)
    
    if (!authData) {
      console.log('No auth data found in localStorage');
      sendAuthResponse(requestId, {
        authenticated: false,
        error: 'No authentication data found'
      });
      return;
    }

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