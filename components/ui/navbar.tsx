'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] bg-background/95 backdrop-blur-md border-b">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo/Brand */}
          <div className="flex items-center gap-3">
            <img src="/favicon.svg" alt="LaunchFast" className="h-8 w-8" />
            <div>
              <div className="text-lg font-semibold text-foreground">LaunchFast</div>
              <div className="text-xs text-muted-foreground -mt-0.5">
                Built by <span className="text-primary font-medium">LegacyX FBA</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <Button 
              asChild
              variant="ghost" 
              className="text-sm font-medium"
            >
              <Link href="/signup">Sign Up</Link>
            </Button>
            <Button 
              asChild 
              variant="default" 
              className="text-sm font-medium"
            >
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}