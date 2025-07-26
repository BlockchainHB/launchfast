"use client"

import { type LucideIcon } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export function NavSupport({
  items,
}: {
  items: {
    title: string
    url: string
    icon: LucideIcon
    external?: boolean
  }[]
}) {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <SidebarGroup className="mt-auto border-t border-gray-100 pt-4">
      <SidebarGroupContent className="px-2">
        <SidebarMenu className="space-y-0.5">
          {items.map((item) => {
            const isActive = pathname === item.url
            const Icon = item.icon
            
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  onClick={() => {
                    if (item.external) {
                      window.open(item.url, '_blank')
                    } else {
                      router.push(item.url)
                    }
                  }}
                  className={cn(
                    "group h-9 w-full justify-start gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-all duration-200",
                    isActive 
                      ? "bg-gray-100 text-gray-900" 
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <Icon className={cn(
                    "h-4 w-4 transition-colors",
                    isActive ? "text-gray-900" : "text-gray-400 group-hover:text-gray-600"
                  )} />
                  <span className="flex-1 text-left truncate">{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
} 