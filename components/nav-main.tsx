"use client"

import { useState } from "react"
import { Plus, type LucideIcon } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { ResearchModal } from "@/components/research-modal"
import { cn } from "@/lib/utils"

export function NavMain({
  items,
  onDataRefresh,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    description?: string
  }[]
  onDataRefresh?: () => void
}) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  return (
    <SidebarGroup className="pt-2">
      <SidebarGroupContent className="px-2">
        {/* Quick Research Button */}
        <SidebarMenu className="pb-2">
          <SidebarMenuItem>
            <Button
              onClick={() => setIsModalOpen(true)}
              className="w-full h-10 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm transition-all duration-200 flex items-center gap-2.5 font-medium text-sm"
            >
              <Plus className="h-4 w-4" />
              Quick Research
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Main Navigation */}
        <SidebarMenu className="space-y-0.5">
          {items.map((item) => {
            const isActive = pathname === item.url
            const Icon = item.icon
            
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton 
                  tooltip={item.description || item.title}
                  onClick={() => router.push(item.url)}
                  className={cn(
                    "group h-10 w-full justify-start gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-all duration-200",
                    isActive 
                      ? "bg-gray-100 text-gray-900" 
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  {Icon && (
                    <Icon className={cn(
                      "h-4 w-4 transition-colors",
                      isActive ? "text-gray-900" : "text-gray-400 group-hover:text-gray-600"
                    )} />
                  )}
                  <span className="flex-1 text-left">{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
      
      <ResearchModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onSaveSuccess={onDataRefresh}
      />
    </SidebarGroup>
  )
}
