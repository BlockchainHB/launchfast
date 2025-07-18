"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import {
  IconChartBar,
  IconDashboard,
  IconDatabase,
  IconFileAnalytics,
  IconHistory,
  IconHelp,
  IconInnerShadowTop,
  IconPackage,
  IconSearch,
  IconSettings,
  IconTrendingUp,
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
  avatar: "/avatars/user.jpg",
}

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "#",
      icon: IconDashboard,
    },
    {
      title: "Product Search",
      url: "#",
      icon: IconSearch,
    },
    {
      title: "Analytics",
      url: "#",
      icon: IconChartBar,
    },
    {
      title: "Search History",
      url: "#",
      icon: IconHistory,
    },
    {
      title: "Opportunities",
      url: "#",
      icon: IconTrendingUp,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: IconSettings,
    },
    {
      title: "Get Help",
      url: "#",
      icon: IconHelp,
    },
    {
      title: "API Status",
      url: "#",
      icon: IconDatabase,
    },
  ],
  documents: [
    {
      name: "High-Grade Products",
      url: "#",
      icon: IconTrendingUp,
    },
    {
      name: "Analysis Reports",
      url: "#",
      icon: IconFileAnalytics,
    },
    {
      name: "Product Database",
      url: "#",
      icon: IconPackage,
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
        if (result.success && result.data) {
          setUser({
            name: result.data.name,
            email: result.data.email,
            avatar: result.data.avatar || defaultUser.avatar,
            company: result.data.company,
            role: result.data.role,
            subscriptionTier: result.data.subscriptionTier
          })
        }
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
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#">
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">Launch Fast</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} onDataRefresh={onDataRefresh} />
        <NavDocuments items={data.documents} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} loading={loading} />
      </SidebarFooter>
    </Sidebar>
  )
}
