'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the token hash and type from URL
        const tokenHash = searchParams.get('token_hash')
        const type = searchParams.get('type') 
        const next = searchParams.get('next') || '/'

        if (tokenHash && type) {
          // Verify the token with Supabase
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as any
          })

          if (error) {
            console.error('Auth callback error:', error)
            router.push('/login?error=Invalid or expired link')
            return
          }

          // Redirect based on the verification type
          if (type === 'recovery') {
            // Password reset - redirect to reset password page with user info
            router.push(`/reset-password?token=${tokenHash}&email=${data.user?.email}`)
          } else if (type === 'signup' || type === 'confirmation') {
            // Email confirmation - redirect to dashboard
            router.push('/dashboard')
          } else {
            // Default redirect
            router.push(next)
          }
        } else {
          // No token found, redirect to login
          router.push('/login')
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        router.push('/login?error=Authentication failed')
      }
    }

    handleAuthCallback()
  }, [router, searchParams])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Processing authentication...</p>
      </div>
    </div>
  )
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}