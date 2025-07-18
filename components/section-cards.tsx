'use client'

import { useEffect, useState } from "react"
import { IconTrendingDown, IconTrendingUp, IconPackage, IconSearch } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface DashboardStats {
  totalProducts: number
  highGradeProducts: number
  avgMonthlyRevenue: number
  totalProfitPotential: number
  recentProducts: number
  highGradePercentage: number
  avgProfitPerProduct: number
}

export function SectionCards() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats')
      if (!response.ok) {
        throw new Error('Failed to fetch stats')
      }
      const data = await response.json()
      setStats(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`
    } else {
      return `$${amount.toFixed(0)}`
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="@container/card">
            <CardHeader>
              <CardDescription>Loading...</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                <div className="animate-pulse bg-muted rounded h-8 w-16"></div>
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        <Card className="@container/card col-span-full">
          <CardHeader>
            <CardDescription>Error loading dashboard stats</CardDescription>
            <CardTitle className="text-lg text-destructive">
              {error || 'Failed to load stats'}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    )
  }
  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Products Analyzed</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.totalProducts.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              {stats.recentProducts > 0 ? `+${stats.recentProducts}` : '0'} recent
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {stats.recentProducts > 0 ? 'New products added' : 'No recent activity'} <IconPackage className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Total products in your database
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>High-Grade Products</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.highGradeProducts}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="grade-a10">
              {stats.highGradePercentage}% A-B
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Premium opportunities found <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            A & B grade products discovered
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Avg Monthly Revenue</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatCurrency(stats.avgMonthlyRevenue)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              Per Product
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Average revenue potential <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">From analyzed products</div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Profit Potential</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatCurrency(stats.totalProfitPotential)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              Monthly
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Combined profit potential <IconSearch className="size-4" />
          </div>
          <div className="text-muted-foreground">From all your products</div>
        </CardFooter>
      </Card>
    </div>
  )
}
