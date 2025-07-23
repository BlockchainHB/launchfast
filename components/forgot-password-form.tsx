'use client'

import { useState } from 'react'
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
import { ArrowLeft, CheckCircle } from "lucide-react"

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [email, setEmail] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to send reset email')
        setIsSubmitting(false)
        return
      }

      setSuccess(true)
    } catch (error) {
      setError('An unexpected error occurred')
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card className="border border-primary/10 bg-white/5 backdrop-blur-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-xl">Check your email</CardTitle>
            <CardDescription>
              We've sent a password reset link to <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Didn't receive the email? Check your spam folder or try again in a few minutes.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setSuccess(false)
                    setEmail('')
                  }}
                >
                  Try again
                </Button>
                <Button asChild className="flex-1 bg-gradient-to-b from-primary to-primary/80">
                  <Link href="/login">Back to login</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border border-primary/10 bg-white/5 backdrop-blur-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Forgot your password?</CardTitle>
          <CardDescription>
            Enter your email address and we'll send you a link to reset your password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-6">
              <div className="grid gap-3">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border-primary/20 bg-white/5 backdrop-blur-sm hover:border-primary/40 focus:border-primary/50"
                />
              </div>
              
              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  {error}
                </div>
              )}
              
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-b from-primary to-primary/80 hover:shadow-[0_0_20px_rgba(98,49,163,0.4)] transition-all duration-300" 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending...' : 'Send reset link'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      
      <div className="text-center">
        <Link 
          href="/login" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>
      </div>
    </div>
  )
}