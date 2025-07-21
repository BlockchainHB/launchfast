'use client';

import type React from 'react';
import { ArrowRight, Target, DollarSign, Shield, TrendingUp, BarChart3, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import Navbar from '@/components/ui/navbar';
import { cn } from '@/lib/utils';

// Product metrics for social proof
const metrics = [
  { value: '500+', label: 'Amazon Sellers' },
  { value: '$2.1M+', label: 'Revenue Found' },
  { value: '12,000+', label: 'Products Analyzed' },
];

export default function WaitlistPage() {



  return (
    <>
      <Navbar />
      <div className="h-16 sm:h-18"></div> {/* Spacer for fixed navbar */}
      <main className="relative min-h-[calc(100vh-4rem)] sm:min-h-[calc(100vh-4.5rem)] w-full">
        <div className="mx-auto max-w-6xl px-6 py-12 sm:py-20 lg:px-8">
          {/* Header Section */}
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-2 text-sm font-medium text-muted-foreground"
            >
              <img src="/favicon.svg" alt="LaunchFast" className="h-5 w-5" />
              Amazon Product Intelligence
              <ArrowRight className="h-4 w-4" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tighter text-foreground mb-4 leading-none"
              style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif' }}
            >
              Find Profitable Amazon Products
            </motion.h1>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tighter text-primary mb-8 leading-none"
              style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif' }}
            >
              in 60 Seconds
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-12 font-medium"
              style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", system-ui, sans-serif' }}
            >
              Advanced A10-F1 scoring system analyzes 1000+ data points to identify
              low-competition, high-profit opportunities on Amazon.
            </motion.p>
          </div>

          {/* Features Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-16 grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            <div className="group p-6 border rounded-lg bg-card hover:shadow-lg transition-all duration-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-bold text-lg tracking-tight" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif' }}>Smart Product Discovery</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                AI-powered analysis identifies low-competition opportunities with high profit potential.
              </p>
            </div>

            <div className="group p-6 border rounded-lg bg-card hover:shadow-lg transition-all duration-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-bold text-lg tracking-tight" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif' }}>Real-Time Analytics</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Live profit calculations, demand forecasting, and market trend analysis.
              </p>
            </div>

            <div className="group p-6 border rounded-lg bg-card hover:shadow-lg transition-all duration-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-bold text-lg tracking-tight" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif' }}>Risk Assessment</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Advanced scoring system evaluates market saturation and competitive landscape.
              </p>
            </div>
          </motion.div>

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-center mb-16"
          >
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button className="px-8 py-4 border border-border text-foreground font-bold rounded-xl hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all duration-300 text-lg flex items-center gap-2 tracking-tight" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif' }}>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                Watch Demo
              </button>
              
              <a href="/api/subscribe" className="px-8 py-4 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 hover:shadow-lg hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all duration-300 text-lg inline-block text-center tracking-tight" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif' }}>
                Start for $50/month
              </a>
            </div>
          </motion.div>

          {/* Social Proof Metrics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12 border-t"
          >
            {metrics.map((metric, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl font-bold text-foreground mb-1">{metric.value}</div>
                <div className="text-sm text-muted-foreground">{metric.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </main>
    </>
  );
}
