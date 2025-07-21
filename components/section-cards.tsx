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
          { title: 'Markets Analyzed' },
          { title: 'Products Analyzed' },
          { title: 'High-Grade Markets' },
          { title: 'Average Market Revenue' }
        ]
      : [
          { title: 'Products Analyzed' },
          { title: 'High-Grade Products' },
          { title: 'Avg Monthly Revenue' },
          { title: 'Total Profit Potential' }
        ]
    
    return (
      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 md:grid-cols-2 lg:grid-cols-4">
        {skeletonCards.map((card, i) => (
          <Card key={i} className="stats-card">
            <div className="stats-card-header">
              <div className="stats-card-title">
                <div className="animate-pulse bg-muted rounded h-4 w-32"></div>
              </div>
            </div>
            <div className="stats-card-value">
              <div className="animate-pulse bg-muted rounded h-8 w-20"></div>
            </div>
            <div className="stats-card-change">
              <div className="animate-pulse bg-muted rounded h-3 w-24"></div>
            </div>
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="stats-card col-span-full">
          <div className="text-center">
            <div className="empty-state-title mb-2">No data available</div>
            <div className="empty-state-description">
              Start researching to see your statistics
            </div>
          </div>
        </Card>
      </div>
    )
  }

  // Render market-centric cards
  if (mode === 'market') {
    return (
      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="stats-card hover-lift">
          <div className="stats-card-header">
            <div className="stats-card-title">Markets Analyzed</div>
            <Badge variant="outline" className="badge-text">
              <IconSearch className="w-3 h-3 mr-1" />
              Active
            </Badge>
          </div>
          <div className="stats-card-value">
            {stats.marketsAnalyzed.toLocaleString()}
          </div>
          <div className="stats-card-change">
            Total markets researched
          </div>
        </Card>
        <Card className="stats-card hover-lift">
          <div className="stats-card-header">
            <div className="stats-card-title">Products Analyzed</div>
            <Badge variant="outline" className="badge-text">
              <IconPackage className="w-3 h-3 mr-1" />
              Total
            </Badge>
          </div>
          <div className="stats-card-value">
            {stats.totalProducts.toLocaleString()}
          </div>
          <div className="stats-card-change">
            Across all markets
          </div>
        </Card>

        <Card className="stats-card hover-lift">
          <div className="stats-card-header">
            <div className="stats-card-title">High-Grade Markets</div>
            <Badge variant="outline" className="status-excellent badge-text">
              <IconTrendingUp className="w-3 h-3 mr-1" />
              A-B
            </Badge>
          </div>
          <div className="stats-card-value">
            {stats.highGradeMarkets.toLocaleString()}
          </div>
          <div className="stats-card-change">
            Premium opportunities
          </div>
        </Card>

        <Card className="stats-card hover-lift">
          <div className="stats-card-header">
            <div className="stats-card-title">Avg Market Revenue</div>
            <Badge variant="outline" className="badge-text">
              <IconTrendingUp className="w-3 h-3 mr-1" />
              Monthly
            </Badge>
          </div>
          <div className="stats-card-value">
            {formatCurrency(stats.avgMarketRevenue)}
          </div>
          <div className="stats-card-change">
            Per market performance
          </div>
        </Card>
    </div>
    )
  }

  // Render product-centric cards (original version)
  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 md:grid-cols-2 lg:grid-cols-4">
      <Card className="stats-card hover-lift">
        <div className="stats-card-header">
          <div className="stats-card-title">Products Analyzed</div>
          <Badge variant="outline" className="badge-text">
            <IconTrendingUp className="w-3 h-3 mr-1" />
            {stats.recentActivity > 0 ? `+${stats.recentActivity}` : '0'}
          </Badge>
        </div>
        <div className="stats-card-value">
          {stats.totalProducts.toLocaleString()}
        </div>
        <div className="stats-card-change">
          {stats.recentActivity > 0 ? 'New products added' : 'Total in database'}
        </div>
      </Card>
      <Card className="stats-card hover-lift">
        <div className="stats-card-header">
          <div className="stats-card-title">High-Grade Products</div>
          <Badge variant="outline" className="status-excellent badge-text">
            {stats.highGradePercentage}% A-B
          </Badge>
        </div>
        <div className="stats-card-value">
          {stats.highGradeProducts}
        </div>
        <div className="stats-card-change">
          Premium opportunities found
        </div>
      </Card>

      <Card className="stats-card hover-lift">
        <div className="stats-card-header">
          <div className="stats-card-title">Avg Monthly Revenue</div>
          <Badge variant="outline" className="badge-text">
            <IconTrendingUp className="w-3 h-3 mr-1" />
            Per Product
          </Badge>
        </div>
        <div className="stats-card-value">
          {formatCurrency(stats.avgMonthlyRevenue)}
        </div>
        <div className="stats-card-change">
          Average revenue potential
        </div>
      </Card>

      <Card className="stats-card hover-lift">
        <div className="stats-card-header">
          <div className="stats-card-title">Total Profit Potential</div>
          <Badge variant="outline" className="badge-text">
            <IconTrendingUp className="w-3 h-3 mr-1" />
            Monthly
          </Badge>
        </div>
        <div className="stats-card-value">
          {formatCurrency(stats.totalProfitPotential)}
        </div>
        <div className="stats-card-change">
          Combined profit potential
        </div>
      </Card>
    </div>
  )
}
