'use client';

import type React from 'react';
import { useState, useEffect } from 'react';
import { ArrowRight, Sparkles, Loader2, Target, DollarSign, Shield, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Particles } from '@/components/ui/particles';
import { Spotlight } from '@/components/ui/spotlight';
import Navbar from '@/components/ui/navbar';
import { useTheme } from 'next-themes';
import { Bricolage_Grotesque } from 'next/font/google';
import { cn } from '@/lib/utils';

const brico = Bricolage_Grotesque({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
});

// Sample users for the waitlist display
const users = [
  { imgUrl: 'https://avatars.githubusercontent.com/u/111780029' },
  { imgUrl: 'https://avatars.githubusercontent.com/u/123104247' },
  { imgUrl: 'https://avatars.githubusercontent.com/u/115650165' },
  { imgUrl: 'https://avatars.githubusercontent.com/u/71373838' },
];

export default function WaitlistPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();
  const [color, setColor] = useState('#ffffff');

  useEffect(() => {
    setColor(resolvedTheme === 'dark' ? '#ffffff' : '#6231a3');
  }, [resolvedTheme]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          metadata: {
            source: 'landing_page',
            page: 'waitlist',
            timestamp: new Date().toISOString()
          }
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitted(true);
        setEmail(''); // Clear email field
      } else {
        setError(data.error || 'Failed to join waitlist');
      }
    } catch (error) {
      console.error('Error submitting waitlist:', error);
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden xl:h-screen no-select pt-24">
        <Spotlight />

      <Particles
        className="absolute inset-0 z-0"
        quantity={100}
        ease={80}
        refresh
        color={color}
      />

      <div className="relative z-[100] mx-auto max-w-4xl px-6 py-16 text-center sm:px-8 lg:px-12 lg:py-20">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/10 bg-gradient-to-r from-primary/15 to-primary/5 px-4 py-2 backdrop-blur-sm hover:from-primary/20 hover:to-primary/10 hover:border-primary/20 transition-all duration-300 cursor-pointer"
        >
          <img src="/favicon.svg" alt="LegacyX FBA" className="h-6 w-6" />
          <span className="text-sm font-medium">Built by <span className="text-primary">LegacyX FBA</span></span>
          <motion.div
            animate={{ x: [0, 5, 0] }}
            transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
          >
            <ArrowRight className="h-4 w-4" />
          </motion.div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className={cn(
            'mb-6 cursor-crosshair bg-gradient-to-b from-foreground via-foreground/80 to-foreground/40 bg-clip-text text-5xl font-bold text-transparent sm:text-6xl lg:text-7xl xl:text-8xl',
            brico.className,
          )}
        >
          Find Profitable{' '}
          <br />
          <span className="bg-gradient-to-b from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
            Products Fast
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="mb-16 text-lg text-foreground/80 sm:text-xl lg:text-2xl max-w-3xl mx-auto leading-relaxed"
        >
          Find your next $10K/month Amazon product in under 60 seconds.
          <br className="hidden sm:block" /> We analyze 1000+ data points so you don't have to.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="mb-20 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:gap-8"
        >
          <div
            className={cn(
              'flex flex-col items-center justify-center rounded-xl border border-primary/10 bg-white/5 p-6 lg:p-8 backdrop-blur-md hover:scale-105 hover:border-primary/30 hover:bg-white/10 transition-all duration-300 cursor-pointer',
              resolvedTheme === 'dark' ? 'glass' : 'glass2',
            )}
          >
            <Target className="mb-3 h-6 w-6 text-primary" />
            <span className="text-lg lg:text-xl font-bold">Low-Competition</span>
            <span className="text-sm text-foreground/70">Product Finder</span>
          </div>

          <div
            className={cn(
              'flex flex-col items-center justify-center rounded-xl border border-primary/10 bg-white/5 p-6 lg:p-8 backdrop-blur-md hover:scale-105 hover:border-primary/30 hover:bg-white/10 transition-all duration-300 cursor-pointer',
              resolvedTheme === 'dark' ? 'glass' : 'glass2',
            )}
          >
            <DollarSign className="mb-3 h-6 w-6 text-primary" />
            <span className="text-lg lg:text-xl font-bold">Live Profit</span>
            <span className="text-sm text-foreground/70">Calculations</span>
          </div>

          <div
            className={cn(
              'flex flex-col items-center justify-center rounded-xl border border-primary/10 bg-white/5 p-6 lg:p-8 backdrop-blur-md hover:scale-105 hover:border-primary/30 hover:bg-white/10 transition-all duration-300 cursor-pointer',
              resolvedTheme === 'dark' ? 'glass' : 'glass2',
            )}
          >
            <Shield className="mb-3 h-6 w-6 text-primary" />
            <span className="text-lg lg:text-xl font-bold">Smart Risk</span>
            <span className="text-sm text-foreground/70">Assessment</span>
          </div>

          <div
            className={cn(
              'flex flex-col items-center justify-center rounded-xl border border-primary/10 bg-white/5 p-4 backdrop-blur-md sm:hidden',
              resolvedTheme === 'dark' ? 'glass' : 'glass2',
            )}
          >
            <Clock className="mb-3 h-6 w-6 text-primary" />
            <span className="text-lg lg:text-xl font-bold">60sec</span>
            <span className="text-sm text-foreground/70">Analysis</span>
          </div>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          onSubmit={handleSubmit}
          className="mx-auto flex flex-col gap-4 sm:flex-row max-w-2xl"
        >
          <AnimatePresence mode="wait">
            {!submitted ? (
              <>
                <div className="relative flex-1">
                  <motion.input
                    key="email-input"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    type="email"
                    name="email"
                    id="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEmail(e.target.value)
                    }
                    required
                    className="w-full rounded-xl border border-primary/20 bg-white/5 px-6 py-5 text-lg text-foreground backdrop-blur-md transition-all placeholder:text-muted-foreground/70 hover:border-primary/40 hover:bg-white/10 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  {error && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-1 text-sm text-destructive/90 sm:absolute"
                    >
                      {error}
                    </motion.p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || submitted}
                  className="group relative overflow-hidden rounded-xl bg-gradient-to-b from-primary to-primary/80 px-8 py-5 text-lg font-semibold text-primary-foreground shadow-[0px_2px_0px_0px_rgba(255,255,255,0.3)_inset] transition-all duration-300 hover:shadow-[0_0_20px_rgba(98,49,163,0.4)] focus:outline-none focus:ring-2 focus:ring-primary/50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Getting you early access...
                      </>
                    ) : (
                      <>
                        Find My First Product
                        <Sparkles className="h-4 w-4 transition-all duration-300 group-hover:rotate-12" />
                      </>
                    )}
                  </span>
                  <span className="absolute inset-0 z-0 bg-gradient-to-r from-primary/80 to-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100"></span>
                </button>
              </>
            ) : (
              <motion.div
                key="thank-you-message"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.6 }}
                className={cn(
                  'flex-1 cursor-pointer rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 px-6 py-4 font-medium text-primary backdrop-blur-md transition-all duration-300 hover:shadow-[0_0_20px_rgba(98,49,163,0.3)] active:brightness-125',
                  resolvedTheme === 'dark' ? 'glass' : 'glass2',
                )}
              >
                <span className="flex items-center justify-center gap-2">
                  🎉 You're in! Check your email for next steps{' '}
                  <Sparkles className="h-4 w-4 animate-pulse" />
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.form>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1 }}
          className="mt-16 flex items-center justify-center gap-4"
        >
          <div className="flex -space-x-3">
            {users.map((user, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, x: -10 }}
                animate={{ scale: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 1 + i * 0.2 }}
                className="size-10 rounded-full border-2 border-background bg-gradient-to-r from-primary to-primary/70 p-[2px]"
              >
                <div className="overflow-hidden rounded-full">
                  <img
                    src={user.imgUrl}
                    alt="Avatar"
                    className="rounded-full transition-all duration-300 hover:rotate-6 hover:scale-110"
                    width={40}
                    height={40}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </motion.div>
            ))}
          </div>
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 1.3 }}
            className="ml-2 text-foreground/80"
          >
            Join <span className="font-semibold text-primary">500+</span> sellers finding profitable products ✨
          </motion.span>
        </motion.div>
      </div>

      </main>
    </>
  );
}
