"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import {
  IconDashboard,
  IconFileAnalytics,
  IconSearch,
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
      url: "/dashboard",
      icon: IconDashboard,
    },
    {
      title: "Product Search", 
      url: "/dashboard/products",
      icon: IconSearch,
    },
  ],
  navSecondary: [],
  documents: [
    {
      name: "Product Analysis",
      url: "#",
      icon: IconFileAnalytics,
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
        <NavDocuments items={data.documents} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} loading={loading} />
      </SidebarFooter>
    </Sidebar>
  )
}
