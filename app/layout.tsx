import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "LaunchFast - Amazon Product Intelligence Dashboard",
  description: "Advanced Amazon product sourcing dashboard with A10-F1 scoring system. Built by Hasaam Bhatti for LegacyX FBA.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <Toaster position="top-center" expand={true} richColors />
      </body>
    </html>
  );
}
