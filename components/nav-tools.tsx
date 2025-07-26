"use client"

import { type LucideIcon } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export function NavTools({
  items,
}: {
  items: {
    name: string
    url: string
    icon: LucideIcon
    description?: string
    active?: boolean
    badge?: string
    badgeColor?: string
  }[]
}) {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <SidebarGroup className="pt-4">
      <SidebarGroupLabel className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
        Power Tools
      </SidebarGroupLabel>
      <SidebarGroupContent className="px-2 pt-2">
        <SidebarMenu className="space-y-0.5">
          {items.map((item) => {
            const isActive = pathname === item.url
            const isDisabled = item.active === false
            const Icon = item.icon
            
            return (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton
                  tooltip={item.description || item.name}
                  onClick={() => {
                    if (!isDisabled && item.url !== '#') {
                      router.push(item.url)
                    }
                  }}
                  disabled={isDisabled}
                  className={cn(
                    "group h-10 w-full justify-start gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-all duration-200",
                    isActive 
                      ? "bg-gray-100 text-gray-900" 
                      : isDisabled
                      ? "text-gray-400 opacity-60 cursor-not-allowed"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <Icon className={cn(
                    "h-4 w-4 transition-colors",
                    isActive 
                      ? "text-gray-900" 
                      : isDisabled
                      ? "text-gray-400"
                      : "text-gray-400 group-hover:text-gray-600"
                  )} />
                  <span className="flex-1 text-left truncate">{item.name}</span>
                  {item.badge && (
                    <Badge 
                      variant="secondary"
                      className={cn(
                        "h-5 px-1.5 text-[10px] font-medium border-0",
                        item.badgeColor || "bg-gray-100 text-gray-600"
                      )}
                    >
                      {item.badge}
                    </Badge>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
} 