'use client'

import { useEffect, useState } from 'react'
import { createClientSide } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

export default function ExtensionCallbackPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState<string>('')

  useEffect(() => {
    const handleExtensionCallback = async () => {
      try {
        const supabase = createClientSide()
        
        // Get the session from Supabase auth
        const { data: { session, user }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth error:', error)
          setStatus('error')
          setMessage(`Authentication failed: ${error.message}`)
          return
        }

        if (!session || !user) {
          console.error('No session or user found')
          setStatus('error')
          setMessage('No valid session found. Please try logging in again.')
          return
        }

        console.log('✅ Extension callback: User authenticated:', user.email)
        
        // Extract tokens for the extension
        const tokens = {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_in: session.expires_in || 3600,
          expires_at: session.expires_at || Math.floor(Date.now() / 1000) + 3600,
          token_type: 'bearer',
          user: {
            id: user.id,
            email: user.email,
            user_metadata: user.user_metadata
          }
        }

        // Create callback URL with tokens in hash for the extension to capture
        const callbackUrl = new URL(window.location.href)
        callbackUrl.hash = new URLSearchParams({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_in: tokens.expires_in.toString(),
          expires_at: tokens.expires_at.toString(),
          token_type: tokens.token_type
        }).toString()

        // Update the URL so the extension can capture the tokens
        window.history.replaceState(null, '', callbackUrl.toString())

        setStatus('success')
        setMessage(`Successfully authenticated as ${user.email}. You can close this tab.`)

        // Auto-close the tab after 3 seconds
        setTimeout(() => {
          window.close()
        }, 3000)

      } catch (error) {
        console.error('Extension callback error:', error)
        setStatus('error')
        setMessage(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    handleExtensionCallback()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {status === 'loading' && (
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle className="h-12 w-12 text-green-600" />
            )}
            {status === 'error' && (
              <XCircle className="h-12 w-12 text-red-600" />
            )}
          </div>
          <CardTitle className="text-xl font-bold">
            LaunchFast Extension Authentication
          </CardTitle>
          <CardDescription>
            {status === 'loading' && 'Processing authentication...'}
            {status === 'success' && 'Authentication successful!'}
            {status === 'error' && 'Authentication failed'}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-gray-600 mb-4">
            {message}
          </p>
          {status === 'success' && (
            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
              Your LaunchFast Chrome extension is now authenticated and ready to use.
              This tab will close automatically.
            </div>
          )}
          {status === 'error' && (
            <div className="text-xs text-red-600 bg-red-50 p-3 rounded-lg">
              Please try logging in to LaunchFast again or contact support if the issue persists.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}