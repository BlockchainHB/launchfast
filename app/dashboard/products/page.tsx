'use client'

import { AppSidebar } from "@/components/app-sidebar"
import { DataTable } from "@/components/data-table"
import { ProductTableSkeleton } from "@/components/product-table-skeleton"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { useEffect, useState } from "react"
import { DashboardData, DashboardDataResponse } from "@/types/dashboard"

export default function Page() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Update document title
    document.title = "Products - LaunchFast"
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/dashboard/data')
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data')
      }
      const result: DashboardDataResponse = await response.json()
      
      if (result.success) {
        setDashboardData(result.data)
        console.log('✅ Dashboard data loaded:', result.cached ? '(cached)' : '(fresh)', result.stats)
      } else {
        throw new Error(result.error || 'Failed to load dashboard data')
      }
    } catch (err) {
      console.error('❌ Dashboard data fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <AppSidebar variant="inset" onDataRefresh={fetchDashboardData} />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                <SectionCards stats={dashboardData?.stats} loading={true} mode="product" />
                <ProductTableSkeleton />
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  if (error) {
    return (
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <AppSidebar variant="inset" onDataRefresh={fetchDashboardData} />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                <SectionCards stats={dashboardData?.stats} loading={false} mode="product" />
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <p className="text-destructive mb-2">Error: {error}</p>
                    <button 
                      onClick={fetchDashboardData}
                      className="text-sm text-primary hover:underline"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" onDataRefresh={fetchDashboardData} />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <SectionCards stats={dashboardData?.stats} loading={false} mode="product" />
              {(!dashboardData?.legacyProducts || dashboardData.legacyProducts.length === 0) ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <div className="mb-4">
                      <svg
                        className="mx-auto h-12 w-12 text-muted-foreground"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">No Products Saved</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Start researching to see your individual product analysis here.
                    </p>
                  </div>
                </div>
              ) : (
                <DataTable data={dashboardData.legacyProducts} onDashboardRefresh={fetchDashboardData} />
              )}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
