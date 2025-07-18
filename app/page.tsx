import WaitlistPage from '@/components/mvpblocks/waitlist'
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "LaunchFast - Amazon Product Intelligence Dashboard",
  description: "Advanced Amazon product sourcing dashboard with A10-F1 scoring system. Join the waitlist for early access."
}

export default function HomePage() {
  return <WaitlistPage />
}
