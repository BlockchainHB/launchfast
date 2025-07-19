'use client'

import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-md border-b border-border/20">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="flex h-18 items-center justify-between">
          {/* Logo/Brand */}
          <div className="flex items-center space-x-2">
            <img src="/favicon.svg" alt="LegacyX FBA" className="h-8 w-8" />
            <div className="flex flex-col">
              <span className="text-lg font-bold text-foreground">Launch Fast</span>
              <span className="text-xs text-muted-foreground -mt-1">Built by <span className="text-primary">LegacyX FBA</span></span>
            </div>
          </div>

          {/* Login Button */}
          <div className="flex items-center">
            <Button 
              asChild 
              variant="default" 
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-6 py-3 text-base rounded-lg transition-all duration-200 hover:scale-105"
            >
              <Link href="/login">Early Access</Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}