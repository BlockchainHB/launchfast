"use client"

import { useState } from "react"
import { IconCirclePlusFilled, type Icon } from "@tabler/icons-react"
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

export function NavMain({
  items,
  onDataRefresh,
}: {
  items: {
    title: string
    url: string
    icon?: Icon
  }[]
  onDataRefresh?: () => void
}) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-1 px-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Quick Research"
              className="bg-primary hover:bg-primary/90 active:bg-primary/90 h-9 rounded-md transition-all duration-200 ease-out flex items-center justify-start gap-3 px-3"
              onClick={() => setIsModalOpen(true)}
            >
              <IconCirclePlusFilled className="h-4 w-4" />
              <span className="flex-1 sidebar-action-button">Quick Research</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <div className="h-2"></div>

        <SidebarMenu className="space-y-1">
          {items.map((item) => {
            const isActive = pathname === item.url || (pathname === '/dashboard' && item.url === '/dashboard')
            const isDisabled = item.url === '#'
            
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton 
                  tooltip={item.title}
                  onClick={() => {
                    if (item.url && item.url !== '#') {
                      router.push(item.url)
                    }
                  }}
                  className={`
                    h-9 rounded-md transition-all duration-200 ease-out px-3 flex items-center justify-start gap-3
                    ${!isDisabled ? 'cursor-pointer' : 'cursor-default opacity-50'}
                    ${isActive ? 'bg-secondary' : 'hover:bg-secondary/60'}
                  `}
                  data-active={isActive}
                >
                  {item.icon && <item.icon className="h-4 w-4" />}
                  <span className={`flex-1 ${isActive ? 'sidebar-nav-item-active' : 'sidebar-nav-item'}`}>
                    {item.title}
                  </span>
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
