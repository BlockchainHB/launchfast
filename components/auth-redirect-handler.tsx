'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function AuthRedirectHandler() {
  const router = useRouter()

  useEffect(() => {
    // Check if we have auth tokens in the URL hash (from Supabase auth redirect)
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash.substring(1) // Remove the #
      const params = new URLSearchParams(hash)
      
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')
      const type = params.get('type')
      
      // If this is a recovery (password reset) redirect
      if (accessToken && type === 'recovery') {
        // Extract user email from the JWT token
        try {
          const payload = JSON.parse(atob(accessToken.split('.')[1]))
          const email = payload.email
          
          // Clean the URL by removing the hash
          window.history.replaceState({}, document.title, window.location.pathname)
          
          // Redirect to reset password page with the necessary info
          router.push(`/reset-password?token=${accessToken}&email=${email}`)
        } catch (error) {
          console.error('Error parsing access token:', error)
          // Fallback - just redirect to reset password page
          router.push('/reset-password')
        }
      }
      // Handle other auth types if needed
      else if (accessToken && (type === 'signup' || !type)) {
        // Clean the URL
        window.history.replaceState({}, document.title, window.location.pathname)
        // Redirect to dashboard for signup confirmations
        router.push('/dashboard')
      }
    }
  }, [router])

  return null // This component doesn't render anything
}