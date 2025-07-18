'use client'

import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/40">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo/Brand */}
          <div className="flex items-center space-x-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <div className="flex flex-col">
              <span className="text-lg font-bold text-foreground">Launch Fast</span>
              <span className="text-xs text-muted-foreground -mt-1">Powered By LegacyX FBA</span>
            </div>
          </div>

          {/* Login Button */}
          <div className="flex items-center">
            <Button 
              asChild 
              variant="default" 
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
            >
              <Link href="/login">Early Access</Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}