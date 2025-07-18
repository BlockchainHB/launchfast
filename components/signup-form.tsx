'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { authHelpers } from '@/lib/auth'

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    password: '',
    confirmPassword: '',
    invitationCode: ''
  })

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setIsSubmitting(false)
      return
    }

    try {
      const { user, error: signupError } = await authHelpers.signUpWithInvitation(
        formData.email,
        formData.password,
        formData.name,
        formData.company,
        formData.invitationCode
      )

      if (signupError) {
        setError(signupError)
        setIsSubmitting(false)
        return
      }

      if (user) {
        // Redirect to dashboard or confirmation page
        router.push('/dashboard')
      }
    } catch (error) {
      setError('An unexpected error occurred')
      setIsSubmitting(false)
    }
  }, [formData, router])

  const handleRequestEarlyAccess = useCallback(() => {
    router.push('/')
  }, [router])

  // Optimized input handlers to prevent unnecessary re-renders
  const handleInputChange = useCallback((field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }))
  }, [])

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border border-primary/10 bg-white/5 backdrop-blur-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Sign Up</CardTitle>
          <CardDescription>
            Create your Launch Fast account with an invitation code
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-6">
              <div className="grid gap-6">
                <div className="grid gap-3">
                  <Label htmlFor="invitationCode">Invitation Code</Label>
                  <Input
                    id="invitationCode"
                    type="text"
                    placeholder="Enter your invitation code"
                    value={formData.invitationCode}
                    onChange={handleInputChange('invitationCode')}
                    required
                    className="border-primary/20 bg-white/5 backdrop-blur-sm hover:border-primary/40 focus:border-primary/50"
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={handleInputChange('name')}
                    required
                    className="border-primary/20 bg-white/5 backdrop-blur-sm hover:border-primary/40 focus:border-primary/50"
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    value={formData.email}
                    onChange={handleInputChange('email')}
                    required
                    className="border-primary/20 bg-white/5 backdrop-blur-sm hover:border-primary/40 focus:border-primary/50"
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="company">Company/Business (Optional)</Label>
                  <Input
                    id="company"
                    type="text"
                    placeholder="Your Amazon Business"
                    value={formData.company}
                    onChange={handleInputChange('company')}
                    className="border-primary/20 bg-white/5 backdrop-blur-sm hover:border-primary/40 focus:border-primary/50"
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange('password')}
                    required
                    className="border-primary/20 bg-white/5 backdrop-blur-sm hover:border-primary/40 focus:border-primary/50"
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange('confirmPassword')}
                    required
                    className="border-primary/20 bg-white/5 backdrop-blur-sm hover:border-primary/40 focus:border-primary/50"
                  />
                </div>
                
                {error && (
                  <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                    {error}
                  </div>
                )}
                
                <div className="grid gap-3">
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-b from-primary to-primary/80 hover:shadow-[0_0_20px_rgba(98,49,163,0.4)] transition-all duration-300" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Creating Account...' : 'Sign Up'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full border-primary/20 bg-white/5 backdrop-blur-sm hover:border-primary/40 hover:bg-white/10"
                    onClick={handleRequestEarlyAccess}
                  >
                    Request Early Access
                  </Button>
                </div>
              </div>
              <div className="text-center text-sm">
                Already have an account?{" "}
                <Link href="/login" className="underline underline-offset-4">
                  Login
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="text-muted-foreground text-center text-xs text-balance">
        By creating an account, you agree to our{" "}
        <a href="#" className="underline underline-offset-4 hover:text-primary">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="#" className="underline underline-offset-4 hover:text-primary">
          Privacy Policy
        </a>
        .
      </div>
    </div>
  )
}