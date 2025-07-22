import Link from "next/link"
import { SignupForm } from "@/components/signup-form"
import { Metadata } from "next"
import { Particles } from '@/components/ui/particles'
import { Spotlight } from '@/components/ui/spotlight'

export const metadata: Metadata = {
  title: "Sign Up - LaunchFast",
  description: "Create your LaunchFast account - Amazon Product Intelligence Dashboard"
}

export default function SignupPage() {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10 overflow-hidden">
      <Spotlight />
      <Particles
        className="absolute inset-0 z-0"
        quantity={100}
        ease={80}
        refresh
        color="#6231a3"
      />
      <div className="relative z-10 flex w-full max-w-sm flex-col gap-6">
        <Link href="/" className="flex items-center gap-3 self-center font-medium">
          <img src="/favicon.svg" alt="LaunchFast" className="h-8 w-8" />
          <div className="flex flex-col">
            <span className="text-lg font-bold">Launch Fast</span>
            <span className="text-sm text-muted-foreground -mt-1">Built by <span className="text-primary">LegacyX FBA</span></span>
          </div>
        </Link>
        <SignupForm />
      </div>
    </div>
  )
}