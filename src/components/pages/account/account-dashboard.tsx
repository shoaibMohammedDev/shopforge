'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Package,
  Heart,
  MapPin,
  Settings,
  ShoppingBag,
  ChevronRight,
} from 'lucide-react'
import { useRouterStore } from '@/stores/router-store'
import { useAuthStore } from '@/stores/auth-store'
import { useWishlistStore } from '@/stores/wishlist-store'
import { api } from '@/lib/api-client'
import type { AddressDisplay, RoutePath } from '@/types'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

import {
  AccountLayout,
  useAuthGuard,
  formatCurrency,
  formatDate,
  STATUS_COLORS,
  type OrderWithItems,
} from './account-layout'

// ============================================================================
// AccountPage (Dashboard)
// ============================================================================

export function AccountPage() {
  const isAuthenticated = useAuthGuard()
  const user = useAuthStore((s) => s.user)
  const navigate = useRouterStore((s) => s.navigate)
  const productIds = useWishlistStore((s) => s.productIds)

  const { data: orders = [], isLoading: ordersLoading } = useQuery<OrderWithItems[]>({
    queryKey: ['user-orders', user?.id],
    queryFn: async () => {
      const result = await api.get<OrderWithItems[]>('/orders', { userId: user!.id })
      return result.success && result.data ? result.data : []
    },
    enabled: !!user?.id,
  })

  const { data: addresses = [] } = useQuery<AddressDisplay[]>({
    queryKey: ['user-addresses', user?.id],
    queryFn: async () => {
      const result = await api.get<AddressDisplay[]>('/addresses', { userId: user!.id })
      return result.success && result.data ? result.data : []
    },
    enabled: !!user?.id,
  })

  if (!isAuthenticated || !user) return null

  const recentOrders = orders.slice(0, 5)
  const stats = [
    {
      label: 'Total Orders',
      value: orders.length,
      icon: Package,
      color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
      onClick: () => navigate('account-orders'),
    },
    {
      label: 'Wishlist Items',
      value: productIds.length,
      icon: Heart,
      color: 'text-rose-600 bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400',
      onClick: () => navigate('account-wishlist'),
    },
    {
      label: 'Addresses',
      value: addresses.length,
      icon: MapPin,
      color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400',
      onClick: () => navigate('account-addresses'),
    },
  ]

  return (
    <AccountLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back, {user.name?.split(' ')[0] || 'User'}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Here&apos;s an overview of your account activity.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <Card
                key={stat.label}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={stat.onClick}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`rounded-lg p-3 ${stat.color}`}>
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg">Recent Orders</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={() => navigate('account-orders')}
            >
              View All
              <ChevronRight className="size-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="text-center py-8">
                <Package className="size-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No orders yet</p>
                <Button
                  variant="outline"
                  className="mt-3"
                  onClick={() => navigate('products')}
                >
                  Start Shopping
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() =>
                      navigate('account-order-detail', { orderId: order.id })
                    }
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-muted p-2">
                        <ShoppingBag className="size-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(order.createdAt)} &middot; {order.items?.length || 0} item(s)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="secondary"
                        className={STATUS_COLORS[order.status] || ''}
                      >
                        {order.status}
                      </Badge>
                      <span className="text-sm font-medium">
                        {formatCurrency(order.totalAmount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Browse Products', icon: ShoppingBag, route: 'products' as RoutePath },
            { label: 'My Orders', icon: Package, route: 'account-orders' as RoutePath },
            { label: 'My Wishlist', icon: Heart, route: 'account-wishlist' as RoutePath },
            { label: 'Account Settings', icon: Settings, route: 'account-settings' as RoutePath },
          ].map((link) => {
            const Icon = link.icon
            return (
              <Card
                key={link.label}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(link.route)}
              >
                <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                  <Icon className="size-5 text-primary" />
                  <span className="text-sm font-medium">{link.label}</span>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </motion.div>
    </AccountLayout>
  )
}
