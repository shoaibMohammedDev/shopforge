/**
 * @file admin-dashboard.tsx
 * @description Admin dashboard content component for the ShopForge e-commerce
 * admin panel. Displays key business metrics (revenue, orders, customers,
 * products), revenue trend chart, order status distribution pie chart,
 * recent orders table, and top products list.
 *
 * @keyfeatures
 * - Four stat cards with trend indicators (up/down vs last month)
 * - Revenue area chart (last 6 months) using Recharts
 * - Order status distribution donut chart using Recharts
 * - Recent orders table with status badges
 * - Top products list with rank, image, units sold, and revenue
 * - Loading skeletons and error states
 * - Data fetched from /api/admin?action=stats on mount
 */
'use client'

import { useState, useEffect } from 'react'
import {
  Package,
  ShoppingCart,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import type { AdminStats } from "@/shared/types"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"
import { Skeleton } from "@/shared/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/shared/components/ui/chart"

import { formatCurrency, formatDate, StatusBadge, PIE_COLORS } from './admin-page'

// ============================================================================
// AdminDashboardContent
// ============================================================================

/**
 * @function AdminDashboardContent
 * @description Admin dashboard content that displays an overview of the store's
 * key metrics, charts, and recent activity. Fetches admin stats from the API
 * on mount and renders stat cards, charts, tables, and product lists.
 *
 * @state
 * - `stats` - AdminStats object fetched from the API, contains all dashboard data
 * - `loading` - boolean indicating whether the stats data is being fetched
 *
 * @remarks
 * - Shows skeleton placeholders while loading
 * - Shows an error card if stats fail to load
 * - Revenue chart uses a gradient fill area chart
 * - Order status chart uses a donut (pie with inner radius) chart
 * - Stats cards show percentage change vs last month with trend arrows
 */
export function AdminDashboardContent() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch admin dashboard statistics on component mount
  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/admin?action=stats')
        if (!res.ok) throw new Error('Failed to fetch stats')
        const data = await res.json()
        setStats(data)
      } catch (err) {
        console.error('Failed to fetch admin stats:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  // Chart configuration for the revenue area chart
  const revenueChartConfig: ChartConfig = {
    revenue: { label: 'Revenue', color: '#22c55e' },
  }

  // Chart configuration for the order status pie chart with color mapping
  const orderStatusChartConfig: ChartConfig = {
    count: { label: 'Orders' },
    PENDING: { label: 'Pending', color: '#f59e0b' },
    PAID: { label: 'Paid', color: '#22c55e' },
    PROCESSING: { label: 'Processing', color: '#3b82f6' },
    SHIPPED: { label: 'Shipped', color: '#8b5cf6' },
    DELIVERED: { label: 'Delivered', color: '#06b6d4' },
    CANCELLED: { label: 'Cancelled', color: '#ef4444' },
  }

  // Loading state: skeleton placeholders matching the dashboard layout
  if (loading) {
    return (
      <>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </>
    )
  }

  // Error state: show warning card if stats couldn't be loaded
  if (!stats) {
    return (
      <>
        <Card className="mx-auto max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="mx-auto h-10 w-10 text-yellow-500" />
            <CardTitle>Unable to Load Dashboard</CardTitle>
            <CardDescription>Please try refreshing the page.</CardDescription>
          </CardHeader>
        </Card>
      </>
    )
  }

  // Stat cards configuration: each card shows a metric with trend indicator
  const statCards = [
    {
      title: 'Revenue',
      value: formatCurrency(stats.totalRevenue),
      change: stats.revenueChange,
      icon: DollarSign,
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      changeColor: stats.revenueChange >= 0 ? 'text-green-600' : 'text-red-600',
    },
    {
      title: 'Orders',
      value: stats.totalOrders.toLocaleString(),
      change: stats.orderChange,
      icon: ShoppingCart,
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      changeColor: stats.orderChange >= 0 ? 'text-green-600' : 'text-red-600',
    },
    {
      title: 'Customers',
      value: stats.totalCustomers.toLocaleString(),
      change: stats.customerChange,
      icon: Users,
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      changeColor: stats.customerChange >= 0 ? 'text-green-600' : 'text-red-600',
    },
    {
      title: 'Products',
      value: stats.totalProducts.toLocaleString(),
      change: 0, // Products count doesn't track monthly change
      icon: Package,
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600',
      changeColor: 'text-gray-500',
    },
  ]

  return (
    <>
      {/* Stat Cards - four metric cards in a responsive grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title} className="relative overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{card.title}</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{card.value}</p>
                  {/* Trend indicator with up/down arrow and percentage change */}
                  <div className="mt-2 flex items-center gap-1">
                    {card.change > 0 ? (
                      <TrendingUp className={`h-3.5 w-3.5 ${card.changeColor}`} />
                    ) : card.change < 0 ? (
                      <TrendingDown className={`h-3.5 w-3.5 ${card.changeColor}`} />
                    ) : null}
                    <span className={`text-xs font-medium ${card.changeColor}`}>
                      {card.change > 0 ? '+' : ''}
                      {card.change.toFixed(1)}%
                    </span>
                    <span className="text-xs text-gray-400">vs last month</span>
                  </div>
                </div>
                {/* Metric icon with colored background */}
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.bgColor}`}>
                  <card.icon className={`h-6 w-6 ${card.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section - revenue area chart and order status pie chart */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Revenue Overview Area Chart - last 6 months trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue Overview</CardTitle>
            <CardDescription>Last 6 months revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={revenueChartConfig} className="h-64 w-full">
              <AreaChart data={stats.salesByMonth} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                {/* Gradient fill for the area under the curve */}
                <defs>
                  <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                {/* Y-axis formatted as thousands (e.g. "$1.2k") */}
                <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v: number) => `$${(v / 1000).toFixed(1)}k`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#22c55e"
                  fill="url(#fillRevenue)"
                  strokeWidth={2}
                  name="revenue"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Orders by Status Donut Chart - current distribution of order statuses */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Orders by Status</CardTitle>
            <CardDescription>Current distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={orderStatusChartConfig} className="h-64 w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="status" />} />
                {/* Donut chart with inner radius for a modern look */}
                <Pie
                  data={stats.ordersByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="count"
                  nameKey="status"
                >
                  {stats.ordersByStatus.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            {/* Legend showing color swatches and status labels with counts */}
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              {stats.ordersByStatus.map((item, i) => (
                <div key={item.status} className="flex items-center gap-1.5 text-xs">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  <span className="text-gray-600">{item.status}</span>
                  <span className="font-medium text-gray-900">({item.count})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders + Top Products - side-by-side cards */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Recent Orders Table - last 10 orders with status and total */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                      No orders yet
                    </TableCell>
                  </TableRow>
                ) : (
                  stats.recentOrders.slice(0, 10).map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium text-sm">
                        #{order.orderNumber}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={order.status} />
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatCurrency(order.totalAmount)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDate(order.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top Products List - ranked by units sold with revenue */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Products</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topProducts.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No product data yet</p>
            ) : (
              <div className="space-y-4">
                {stats.topProducts.map((tp, idx) => {
                  // Parse product images from JSON string
                  const images: string[] = tp.product.images ? JSON.parse(tp.product.images) : []
                  return (
                    <div key={tp.product.id} className="flex items-center gap-4">
                      {/* Rank number */}
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600">
                        {idx + 1}
                      </span>
                      {/* Product thumbnail or placeholder icon */}
                      {images[0] ? (
                        <img
                          src={images[0]}
                          alt={tp.product.name}
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                          <Package className="h-5 w-5 text-gray-400" />
                        </div>
                      )}
                      {/* Product name and units sold */}
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {tp.product.name}
                        </p>
                        <p className="text-xs text-gray-500">{tp.totalSold} units sold</p>
                      </div>
                      {/* Product revenue */}
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(tp.revenue)}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
