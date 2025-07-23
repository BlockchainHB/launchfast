"use client"

import {
  IconDots,
  IconFolder,
  IconShare3,
  IconTrash,
  type Icon,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useRouter, usePathname } from "next/navigation"

export function NavDocuments({
  items,
}: {
  items: {
    name: string
    url: string
    icon: Icon
    active?: boolean
    comingSoon?: boolean
  }[]
}) {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const pathname = usePathname()

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel className="px-2">Tools</SidebarGroupLabel>
      <SidebarGroupContent className="flex flex-col gap-1 px-2">
        <SidebarMenu className="space-y-1">
          {items.map((item) => {
            const isActive = pathname === item.url
            const isDisabled = item.active === false
            
            return (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton
                  tooltip={item.name}
                  onClick={() => {
                    if (item.url && item.url !== '#' && !isDisabled) {
                      router.push(item.url)
                    }
                  }}
                  className={`
                    h-9 rounded-md transition-all duration-200 ease-out px-3 flex items-center justify-start gap-3
                    ${!isDisabled ? 'cursor-pointer' : 'cursor-default opacity-50'}
                    ${isActive ? 'bg-secondary' : 'hover:bg-secondary/60'}
                  `}
                  data-active={isActive}
                  disabled={isDisabled}
                >
                  <item.icon className="h-4 w-4" />
                  <span className={`flex-1 ${isActive ? 'sidebar-nav-item-active' : 'sidebar-nav-item'}`}>
                    {item.name}
                  </span>
                  {item.comingSoon && (
                    <Badge variant="secondary" className="text-xs">
                      Soon
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
