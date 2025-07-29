import Link from "next/link"
import { Metadata } from "next"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, Clock, CreditCard, RotateCcw } from "lucide-react"
import { Particles } from '@/components/ui/particles'
import { Spotlight } from '@/components/ui/spotlight'

export const metadata: Metadata = {
  title: "Trial Expired - LaunchFast",
  description: "Your free trial has expired. Subscribe now to continue using LaunchFast."
}

interface TrialExpiredPageProps {
  searchParams: { email?: string }
}

export default function TrialExpiredPage({ searchParams }: TrialExpiredPageProps) {
  const email = searchParams.email

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10 overflow-hidden">
      <Spotlight />
      <Particles
        className="absolute inset-0 z-0"
        quantity={100}
        ease={80}
        refresh
        color="#dc2626"
      />
      
      <div className="relative z-10 flex w-full max-w-md flex-col gap-6">
        <Link href="/" className="flex items-center gap-3 self-center font-medium">
          <img src="/favicon.svg" alt="LaunchFast" className="h-8 w-8" />
          <div className="flex flex-col">
            <span className="text-lg font-bold">Launch Fast</span>
            <span className="text-sm text-muted-foreground -mt-1">Built by <span className="text-primary">LegacyX FBA</span></span>
          </div>
        </Link>

        <Card className="border border-red-200 bg-red-50/50 backdrop-blur-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-red-100">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-xl text-red-800">Trial Expired</CardTitle>
            <CardDescription className="text-red-700">
              Your 7-day free trial has ended. Subscribe now to continue accessing your Amazon intelligence dashboard.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* What you're missing */}
            <div className="p-4 bg-white/50 rounded-lg border border-red-200">
              <h3 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                What you're missing:
              </h3>
              <ul className="space-y-2 text-sm text-red-700">
                <li>• Product research and analysis</li>
                <li>• Keyword mining and optimization</li>
                <li>• Market opportunity identification</li>
                <li>• Competitor analysis tools</li>
                <li>• Real-time BSR tracking</li>
              </ul>
            </div>

            {/* Pricing reminder */}
            <div className="text-center space-y-2">
              <p className="text-sm text-red-700">
                Continue where you left off with full access
              </p>
              <div className="text-2xl font-bold text-red-800">
                $199<span className="text-sm font-normal">/month</span>
              </div>
              <p className="text-xs text-red-600">
                No setup fees • Cancel anytime • Full feature access
              </p>
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
              <Button 
                asChild
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                size="lg"
              >
                <Link href={email ? `/api/stripe/create-checkout?plan=pro&email=${encodeURIComponent(email)}` : '/api/stripe/create-checkout?plan=pro'}>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Subscribe Now
                </Link>
              </Button>
              
              <Button 
                variant="outline" 
                asChild
                className="w-full border-red-200 text-red-700 hover:bg-red-50"
              >
                <Link href="/dashboard/settings">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Back to Settings
                </Link>
              </Button>
            </div>

            {/* Additional help */}
            <div className="text-center space-y-2 pt-4 border-t border-red-200">
              <p className="text-xs text-red-600">
                Need help? Contact us at{" "}
                <a href="mailto:support@launchfastlegacyx.com" className="underline hover:text-red-800">
                  support@launchfastlegacyx.com
                </a>
              </p>
              <p className="text-xs text-red-600">
                Want to start over?{" "}
                <Link href="/login" className="underline hover:text-red-800">
                  Sign in here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}