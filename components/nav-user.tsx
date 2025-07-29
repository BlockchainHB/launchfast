"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import {
  MoreVertical,
  LogOut,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { authHelpers } from "@/lib/auth"
import { cn } from "@/lib/utils"

export function NavUser({
  user,
  loading = false,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
  loading?: boolean
}) {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const { error } = await authHelpers.signOut()
      if (error && error !== 'Auth session missing!') {
        console.error('Logout error:', error)
      }
      
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
        return
      }
      
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
        return
      }
      router.push('/login')
    } finally {
      setIsLoggingOut(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="w-full px-2 py-2 hover:bg-gray-50 data-[state=open]:bg-gray-50 transition-colors duration-200"
            >
              <Avatar className="h-8 w-8 rounded-full border border-gray-200">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-xs font-medium">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col flex-1 text-left ml-2.5">
                {loading ? (
                  <>
                    <div className="animate-pulse bg-gray-200 rounded h-3.5 w-20 mb-1"></div>
                    <div className="animate-pulse bg-gray-200 rounded h-3 w-28"></div>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {user.name}
                    </span>
                    <span className="text-xs text-gray-500 truncate">
                      {user.email}
                    </span>
                  </>
                )}
              </div>
              <MoreVertical className="h-4 w-4 text-gray-400" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-[220px] rounded-lg shadow-lg border border-gray-200"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={8}
          >
            <DropdownMenuLabel className="px-3 py-2">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 rounded-full border border-gray-200">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-sm font-medium">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  {loading ? (
                    <>
                      <div className="animate-pulse bg-gray-200 rounded h-4 w-24 mb-1"></div>
                      <div className="animate-pulse bg-gray-200 rounded h-3 w-32"></div>
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {user.name}
                      </span>
                      <span className="text-xs text-gray-500 truncate">
                        {user.email}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </DropdownMenuLabel>
            
            <DropdownMenuSeparator className="bg-gray-100" />
            
            <DropdownMenuItem 
              onClick={handleLogout} 
              disabled={isLoggingOut}
              className={cn(
                "px-3 py-2 text-sm cursor-pointer hover:bg-gray-50",
                isLoggingOut && "opacity-50 cursor-not-allowed"
              )}
            >
              <LogOut className="mr-2.5 h-4 w-4 text-gray-400" />
              {isLoggingOut ? 'Logging out...' : 'Log out'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
