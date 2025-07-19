'use client'

import { IconTrendingDown, IconTrendingUp, IconPackage, IconSearch } from "@tabler/icons-react"
import { DashboardStats } from "@/types/dashboard"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function SectionCards({ 
  stats, 
  loading,
  mode = 'market'
}: { 
  stats?: DashboardStats | null
  loading?: boolean
  mode?: 'market' | 'product'
}) {

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
    const skeletonCards = mode === 'market' 
      ? [
          { title: 'Markets Analyzed', hasIcon: true },
          { title: 'Products Analyzed', hasIcon: true },
          { title: 'High-Grade Markets', hasIcon: true },
          { title: 'Average Market Revenue', hasIcon: true }
        ]
      : [
          { title: 'Products Analyzed', hasIcon: true },
          { title: 'High-Grade Products', hasIcon: true },
          { title: 'Avg Monthly Revenue', hasIcon: true },
          { title: 'Total Profit Potential', hasIcon: true }
        ]
    
    return (
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {skeletonCards.map((card, i) => (
          <Card key={i} className="@container/card">
            <CardHeader>
              <CardDescription>
                <div className="animate-pulse bg-muted rounded h-4 w-32"></div>
              </CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                <div className="animate-pulse bg-muted rounded h-8 w-20"></div>
              </CardTitle>
              <CardAction>
                <div className="animate-pulse bg-muted rounded-full h-6 w-20"></div>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                <div className="animate-pulse bg-muted rounded h-4 w-32"></div>
                <div className="animate-pulse bg-muted rounded h-4 w-4"></div>
              </div>
              <div className="text-muted-foreground">
                <div className="animate-pulse bg-muted rounded h-3 w-40"></div>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        <Card className="@container/card col-span-full">
          <CardHeader>
            <CardDescription>No data available</CardDescription>
            <CardTitle className="text-lg text-muted-foreground">
              Start researching to see your market statistics
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // Render market-centric cards
  if (mode === 'market') {
    return (
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Markets Analyzed</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.marketsAnalyzed.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconSearch />
              Markets
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Market research completed <IconSearch className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Total markets researched and analyzed
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Products Analyzed</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.totalProducts.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconPackage />
              Products
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Individual products researched <IconPackage className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Total products analyzed across all markets
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>High-Grade Markets</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.highGradeMarkets.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="grade-a10">
              <IconTrendingUp />
              A-B Grade
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Premium market opportunities <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">Markets with A & B grades identified</div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Average Market Revenue</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {formatCurrency(stats.avgMarketRevenue)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              Per Market
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Average market performance <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">Monthly revenue across analyzed markets</div>
        </CardFooter>
      </Card>
    </div>
    )
  }

  // Render product-centric cards (original version)
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
              {stats.recentActivity > 0 ? `+${stats.recentActivity}` : '0'} recent
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {stats.recentActivity > 0 ? 'New products added' : 'No recent activity'} <IconPackage className="size-4" />
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
