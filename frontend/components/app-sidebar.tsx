"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { SIDEBAR_CONFIG, DEFAULT_SIDEBAR_ITEMS } from "@/config/navigation"
import { useSession } from "@/lib/auth-client"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { data: session } = useSession()

  const userType = session?.user?.role as keyof typeof SIDEBAR_CONFIG || "default"
  const navItems = SIDEBAR_CONFIG[userType] || DEFAULT_SIDEBAR_ITEMS

  return (
    <Sidebar {...props}>
      <SidebarHeader className="h-16 border-b !p-0 !flex-row items-center">
        <div className="flex flex-col gap-0 ml-4">
          <div className="flex items-center gap-0 text-2xl font-bold tracking-tight">
            <span className="text-sidebar-accent-foreground">TPVRA</span>
            {/* <span className="text-slate-900">A</span> */}
          </div>
          {/* <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest -mt-1">
            {userType === "admin" ? "Admin Portal" : userType === "vendor" ? "Vendor Portal" : "Assessor Portal"}
          </span> */}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = pathname === item.url || pathname.startsWith(item.url + "/")
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className="py-6"
                    >
                      <Link href={item.url} className="flex items-center gap-3">
                        {item.icon && <item.icon className="h-5 w-5" />}
                        <span className="font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  )
}
