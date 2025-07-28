"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import {
  LayoutDashboard,
  Search,
  Lightbulb,
  BarChart3,
  Users,
  Package,
  Settings,
  MessageSquare,
  Plus,
  FlaskConical,
  BookOpen,
  ShieldCheck,
  Rocket,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavTools } from "@/components/nav-tools"
import { NavSupport } from "@/components/nav-support"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

interface UserProfile {
  name: string
  email: string
  avatar: string
  company?: string
  role?: string
  subscriptionTier?: string
}

const defaultUser = {
  name: "Launch Fast User",
  email: "user@launchfast.com",
  avatar: "/avatars/user.svg",
}

const navData = {
  // Primary navigation
  main: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      description: "Overview and analytics",
    },
    {
      title: "Product Search", 
      url: "/dashboard/products",
      icon: Search,
      description: "Find winning products",
    },
  ],
  // Power tools section
  tools: [
    {
      name: "Product Analysis",
      url: "/dashboard/product-analysis",
      icon: BarChart3,
      active: true,
      badge: "Enhanced",
      badgeColor: "bg-emerald-100 text-emerald-700",
      description: "Deep product insights",
    },
    {
      name: "Keyword Research",
      url: "/dashboard/keyword-research",
      icon: Lightbulb,
      active: true,
      badge: "New",
      badgeColor: "bg-blue-100 text-blue-700",
      description: "PPC & SEO optimization",
    },
    {
      name: "Supplier Sourcing",
      url: "#",
      icon: Users,
      active: false,
      badge: "Soon",
      badgeColor: "bg-gray-100 text-gray-600",
      description: "Find reliable suppliers",
    },
    {
      name: "Patent Check",
      url: "#",
      icon: ShieldCheck,
      active: false,
      badge: "Soon",
      badgeColor: "bg-gray-100 text-gray-600",
      description: "Verify product patents",
    },
  ],
  // Support & settings
  support: [
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: Settings,
    },
    {
      title: "Contact Support",
      url: "/dashboard/contact",
      icon: MessageSquare,
    },
  ],
}

export function AppSidebar({ 
  onDataRefresh,
  ...props 
}: React.ComponentProps<typeof Sidebar> & {
  onDataRefresh?: () => void
}) {
  const [user, setUser] = useState<UserProfile>(defaultUser)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUserProfile()
  }, [])

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/user/profile')
      if (response.ok) {
        const result = await response.json()
        setUser({
          name: result.full_name || result.email?.split('@')[0] || 'User',
          email: result.email,
          avatar: result.avatar_url || defaultUser.avatar,
          company: result.company,
          subscriptionTier: result.subscription_tier
        })
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sidebar collapsible="offcanvas" className="border-r border-gray-200 min-w-[240px]" {...props}>
      <SidebarHeader className="border-b border-gray-100">
        <div className="flex items-center gap-2.5 px-2.5 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black shadow-sm flex-shrink-0">
            <Rocket className="h-5 w-5 text-amber-500" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-gray-900 truncate">Launch Fast</span>
            <span className="text-[10px] text-gray-500 truncate">by LegacyX FBA</span>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="gap-0">
        <NavMain items={navData.main} onDataRefresh={onDataRefresh} />
        <NavTools items={navData.tools} />
        <NavSupport items={navData.support} />
      </SidebarContent>
      
      <SidebarFooter className="border-t border-gray-100">
        <NavUser user={user} loading={loading} />
      </SidebarFooter>
      
      <SidebarRail />
    </Sidebar>
  )
}
