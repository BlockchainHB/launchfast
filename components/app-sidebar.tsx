"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import {
  IconDashboard,
  IconFileAnalytics,
  IconMail,
  IconSearch,
  IconTool,
  IconBulb,
  IconUsers,
  IconBox,
} from "@tabler/icons-react"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
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

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconDashboard,
    },
    {
      title: "Product Search", 
      url: "/dashboard/products",
      icon: IconSearch,
    },
    {
      title: "Contact",
      url: "/dashboard/contact",
      icon: IconMail,
    },
  ],
  navSecondary: [],
  tools: [
    {
      name: "Product Analysis",
      url: "/dashboard/product-analysis",
      icon: IconFileAnalytics,
      active: true,
      beta: true,
    },
    {
      name: "Keyword Research",
      url: "/dashboard/keyword-research",
      icon: IconBulb,
      active: true,
      beta: true,
    },
    {
      name: "Supplier Sourcing",
      url: "#",
      icon: IconUsers,
      active: false,
      comingSoon: true,
    },
    {
      name: "Blackbox",
      url: "#",
      icon: IconBox,
      active: false,
      comingSoon: true,
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
      // Keep default user data on error
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="p-4 pb-2">
        <div className="flex items-center space-x-2">
          <img src="/favicon.svg" alt="Launch Fast" className="h-8 w-8 flex-shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-lg font-bold text-foreground">Launch Fast</span>
            <span className="text-xs text-muted-foreground -mt-1">Built by <span className="text-primary">LegacyX FBA</span></span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} onDataRefresh={onDataRefresh} />
        <NavDocuments items={data.tools} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} loading={loading} />
      </SidebarFooter>
    </Sidebar>
  )
}
