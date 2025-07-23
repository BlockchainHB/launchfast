'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles, GraduationCap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const features = [
  'Unlimited product searches',
  'Unlimited CSV exports', 
  'Advanced market analytics',
  'Risk assessment tools',
  'Keyword intelligence',
  'Batch operations',
  'API access',
  'Priority support'
];

export function PricingSection() {
  return (
    <section className="py-24 px-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tighter text-foreground mb-4 leading-none"
            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif' }}
          >
            Simple, Transparent Pricing
          </h2>
          <p 
            className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", system-ui, sans-serif' }}
          >
            Choose the plan that fits your Amazon selling journey
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* Regular Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Card className="relative h-full border border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
              <CardHeader className="text-center pb-8">
                <CardTitle 
                  className="text-2xl font-bold tracking-tight"
                  style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif' }}
                >
                  LaunchFast Pro
                </CardTitle>
                <CardDescription className="text-base">
                  For serious Amazon sellers
                </CardDescription>
                <div className="mt-6">
                  <div className="flex items-baseline justify-center gap-2">
                    <span 
                      className="text-5xl font-extrabold tracking-tighter text-foreground"
                      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif' }}
                    >
                      $199
                    </span>
                    <span className="text-lg text-muted-foreground font-medium">/month</span>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <ul className="space-y-4">
                  {features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className="p-1 rounded-full bg-primary/10">
                        <Check className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-sm font-medium">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  className="w-full bg-gradient-to-b from-primary to-primary/80 hover:shadow-[0_0_20px_rgba(98,49,163,0.4)] transition-all duration-300 py-6 text-lg font-bold tracking-tight"
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
            <Card className="relative h-full border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 backdrop-blur-sm hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300">
              {/* Popular Badge */}
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-4 py-2 text-sm font-bold shadow-lg">
                  <Sparkles className="h-4 w-4 mr-1" />
                  75% OFF
                </Badge>
              </div>
              
              <CardHeader className="text-center pb-8 pt-8">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <GraduationCap className="h-6 w-6 text-primary" />
                  <CardTitle 
                    className="text-2xl font-bold tracking-tight text-primary"
                    style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif' }}
                  >
                    LegacyX Student
                  </CardTitle>
                </div>
                <CardDescription className="text-base">
                  Exclusive pricing for LegacyX FBA students
                </CardDescription>
                <div className="mt-6">
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-2xl text-muted-foreground line-through font-semibold">$199</span>
                    <span 
                      className="text-5xl font-extrabold tracking-tighter text-primary"
                      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif' }}
                    >
                      $50
                    </span>
                    <span className="text-lg text-muted-foreground font-medium">/month</span>
                  </div>
                  <p className="text-sm text-primary font-semibold mt-2">Save $149/month</p>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-sm text-center font-medium text-primary">
                    ✨ Use your LegacyX FBA email address during signup to automatically unlock this exclusive pricing
                  </p>
                </div>
                
                <ul className="space-y-4">
                  {features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className="p-1 rounded-full bg-primary/20">
                        <Check className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-sm font-medium">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  className="w-full bg-gradient-to-b from-primary via-primary to-primary/90 hover:shadow-[0_0_30px_rgba(98,49,163,0.6)] transition-all duration-300 py-6 text-lg font-bold tracking-tight ring-2 ring-primary/20 hover:ring-primary/40"
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
          className="text-center mt-12"
        >
          <p className="text-sm text-muted-foreground">
            All plans include a 7-day free trial. Cancel anytime.
          </p>
        </motion.div>
      </div>
    </section>
  );
}