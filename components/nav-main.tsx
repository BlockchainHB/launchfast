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
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">
            <SidebarMenuButton
              tooltip="Quick Research"
              className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear"
              onClick={() => setIsModalOpen(true)}
            >
              <IconCirclePlusFilled />
              <span>Quick Research</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
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
                    ${!isDisabled ? 'cursor-pointer' : 'cursor-default opacity-60'}
                    ${isActive ? 'bg-primary/10 text-primary border-primary/20 border' : ''}
                    ${!isDisabled && !isActive ? 'hover:bg-muted/50 hover:text-foreground transition-colors' : ''}
                  `}
                  data-active={isActive}
                >
                  {item.icon && <item.icon className={isActive ? 'text-primary' : ''} />}
                  <span>{item.title}</span>
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
