'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles, GraduationCap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const regularFeatures = [
  'Unlimited product searches',
  'Unlimited CSV exports', 
  'Advanced market analytics',
  'Risk assessment tools',
  'Keyword intelligence',
  'Batch operations',
  'Priority support'
];

const studentFeatures = [
  'Unlimited product searches',
  'Unlimited CSV exports', 
  'Advanced market analytics',
  'Risk assessment tools',
  'Keyword intelligence',
  'Batch operations',
  'Priority support'
];

export function PricingSection() {
  return (
    <section className="py-16 px-6">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 
            className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tighter text-foreground leading-none"
            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif' }}
          >
            Simple, Transparent Pricing
          </h2>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start max-w-4xl mx-auto">
          {/* Regular Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Card className="relative border border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
              <CardHeader className="text-center pb-4">
                <CardTitle 
                  className="text-xl font-bold tracking-tight"
                  style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif' }}
                >
                  LaunchFast Pro
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  For serious Amazon sellers
                </CardDescription>
                <div className="mt-4">
                  <div className="flex items-baseline justify-center gap-2">
                    <span 
                      className="text-3xl font-extrabold tracking-tighter text-foreground"
                      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif' }}
                    >
                      $199
                    </span>
                    <span className="text-sm text-muted-foreground font-medium">/month</span>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {regularFeatures.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <div className="p-0.5 rounded-full bg-primary/10">
                        <Check className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-xs font-medium">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  className="w-full bg-gradient-to-b from-primary to-primary/80 hover:shadow-[0_0_20px_rgba(98,49,163,0.4)] transition-all duration-300 py-3 text-sm font-bold tracking-tight mt-4"
                  style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif' }}
                  asChild
                >
                  <a href="/signup">Get Started</a>
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* LegacyX Student Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="relative border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 backdrop-blur-sm hover:shadow-xl hover:shadow-primary/10 transition-all duration-300">
              {/* Popular Badge */}
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-3 py-1 text-xs font-bold shadow-lg">
                  <Sparkles className="h-3 w-3 mr-1" />
                  75% OFF
                </Badge>
              </div>
              
              <CardHeader className="text-center pb-4 pt-6">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  <CardTitle 
                    className="text-xl font-bold tracking-tight text-primary"
                    style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif' }}
                  >
                    LegacyX Student
                  </CardTitle>
                </div>
                <CardDescription className="text-sm text-muted-foreground">
                  Exclusive pricing for LegacyX FBA students
                </CardDescription>
                <div className="mt-4">
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-lg text-muted-foreground line-through font-semibold">$199</span>
                    <span 
                      className="text-3xl font-extrabold tracking-tighter text-primary"
                      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif' }}
                    >
                      $50
                    </span>
                    <span className="text-sm text-muted-foreground font-medium">/month</span>
                  </div>
                  <p className="text-xs text-primary font-semibold mt-1">Save $149/month</p>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-xs text-center font-medium text-primary leading-relaxed">
                    ✨ Use your LegacyX FBA email during signup to automatically unlock this pricing
                  </p>
                </div>
                
                <ul className="space-y-2">
                  {studentFeatures.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <div className="p-0.5 rounded-full bg-primary/20">
                        <Check className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-xs font-medium">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  className="w-full bg-gradient-to-b from-primary via-primary to-primary/90 hover:shadow-[0_0_25px_rgba(98,49,163,0.5)] transition-all duration-300 py-3 text-sm font-bold tracking-tight ring-1 ring-primary/20 hover:ring-primary/40 mt-4"
                  style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif' }}
                  asChild
                >
                  <a href="/signup">Claim Student Discount</a>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Footer Note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-8"
        >
          <p className="text-sm text-muted-foreground">
            Cancel anytime. No long-term commitments.
          </p>
        </motion.div>
      </div>
    </section>
  );
}