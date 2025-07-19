'use client'

import { useState } from 'react'
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

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const { user, error: loginError } = await authHelpers.signIn(
        formData.email,
        formData.password
      )

      if (loginError) {
        setError(loginError)
        setIsSubmitting(false)
        return
      }

      if (user) {
        // Redirect to dashboard
        router.push('/dashboard')
      }
    } catch (error) {
      setError('An unexpected error occurred')
      setIsSubmitting(false)
    }
  }

  const handleRequestEarlyAccess = () => {
    router.push('/')
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border border-primary/10 bg-white/5 backdrop-blur-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Login</CardTitle>
          <CardDescription>
            Access your Launch Fast Amazon intelligence dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-6">
              <div className="grid gap-6">
                <div className="grid gap-3">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="border-primary/20 bg-white/5 backdrop-blur-sm hover:border-primary/40 focus:border-primary/50"
                  />
                </div>
                <div className="grid gap-3">
                  <div className="flex items-center">
                    <Label htmlFor="password">Password</Label>
                    <a
                      href="#"
                      className="ml-auto text-sm underline-offset-4 hover:underline"
                    >
                      Forgot your password?
                    </a>
                  </div>
                  <Input 
                    id="password" 
                    type="password" 
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
                    {isSubmitting ? 'Signing in...' : 'Login'}
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
                Don&apos;t have an account?{" "}
                <Link href="/signup" className="underline underline-offset-4">
                  Sign up
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="text-muted-foreground text-center text-xs text-balance">
        By clicking continue, you agree to our{" "}
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
