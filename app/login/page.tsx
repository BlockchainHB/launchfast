import { Sparkles } from "lucide-react"
import Link from "next/link"
import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link href="/" className="flex items-center gap-3 self-center font-medium">
          <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-md">
            <Sparkles className="size-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold">Launch Fast</span>
            <span className="text-sm text-muted-foreground -mt-1">Powered By LegacyX FBA</span>
          </div>
        </Link>
        <LoginForm />
      </div>
    </div>
  )
}
