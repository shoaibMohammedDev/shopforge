'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Package,
  Heart,
  MapPin,
  Settings,
  LogOut,
  ShoppingBag,
  Eye,
  Trash2,
  Plus,
  Pencil,
  Loader2,
  ChevronRight,
  CheckCircle2,
  Circle,
  Truck,
  CreditCard,
  AlertTriangle,
  ShoppingCart,
  Clock,
  ArrowLeft,
  Star,
} from 'lucide-react'
import { useRouterStore } from '@/stores/router-store'
import { useAuthStore } from '@/stores/auth-store'
import { useCartStore } from '@/stores/cart-store'
import { useWishlistStore } from '@/stores/wishlist-store'
import { api } from '@/lib/api-client'
import { useIsMobile } from '@/hooks/use-mobile'
import { toast } from '@/hooks/use-toast'
import type {
  AddressDisplay,
  UserProfile,
  RoutePath,
  ProductListItem,
} from '@/types'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

// ============================================================================
// Types
// ============================================================================

interface OrderWithItems {
  id: string
  orderNumber: string
  status: string
  subtotal: number
  taxAmount: number
  shippingAmount: number
  discountAmount: number
  totalAmount: number
  shippingMethod: string | null
  trackingNumber: string | null
  shippingAddress: string
  billingAddress: string
  createdAt: string
  items: {
    id: string
    productId: string
    productName: string
    variantName: string | null
    sku: string
    price: number
    quantity: number
    total: number
    image: string | null
  }[]
  payment?: {
    status: string
    method: string
  } | null
  timeline?: {
    id: string
    status: string
    message: string | null
    createdAt: string
  }[]
}

// ============================================================================
// Constants
// ============================================================================

const SIDEBAR_LINKS: {
  label: string
  route: RoutePath
  icon: React.ElementType
}[] = [
  { label: 'Dashboard', route: 'account', icon: LayoutDashboard },
  { label: 'Orders', route: 'account-orders', icon: Package },
  { label: 'Wishlist', route: 'account-wishlist', icon: Heart },
  { label: 'Addresses', route: 'account-addresses', icon: MapPin },
  { label: 'Settings', route: 'account-settings', icon: Settings },
]

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  PAID: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  PROCESSING: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  SHIPPED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  DELIVERED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  REFUNDED: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
}

const ORDER_STATUS_STEPS = ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED']

// ============================================================================
// Helper: Auth Guard
// ============================================================================

function useAuthGuard() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const navigate = useRouterStore((s) => s.navigate)

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('login')
    }
  }, [isAuthenticated, navigate])

  return isAuthenticated
}

// ============================================================================
// Helper: Format currency
// ============================================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function getInitials(name: string | null): string {
  if (!name) return 'U'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// ============================================================================
// Shared Layout: AccountLayout
// ============================================================================

function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useRouterStore((s) => s.navigate)
  const currentRoute = useRouterStore((s) => s.currentRoute)
  const isMobile = useIsMobile()

  const handleLogout = () => {
    logout()
    navigate('home')
  }

  if (!user) return null

  // Mobile: horizontal scrollable tab bar
  if (isMobile) {
    return (
      <div className="space-y-4">
        {/* Mobile Tab Bar */}
        <div className="sticky top-16 z-40 bg-background border-b">
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex items-center gap-1 px-4 py-2">
              {SIDEBAR_LINKS.map((link) => {
                const Icon = link.icon
                const isActive = currentRoute === link.route
                return (
                  <Button
                    key={link.route}
                    variant={isActive ? 'secondary' : 'ghost'}
                    size="sm"
                    className="shrink-0 gap-1.5"
                    onClick={() => navigate(link.route)}
                  >
                    <Icon className="size-4" />
                    {link.label}
                  </Button>
                )
              })}
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 gap-1.5 text-destructive hover:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="size-4" />
                Logout
              </Button>
            </div>
          </ScrollArea>
        </div>

        {/* User info strip */}
        <div className="flex items-center gap-3 px-4">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.image || undefined} alt={user.name || 'User'} />
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{user.name || 'User'}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pb-6">{children}</div>
      </div>
    )
  }

  // Desktop: sidebar + content
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex gap-8">
        {/* Sidebar */}
        <aside className="w-64 shrink-0">
          <div className="sticky top-24 space-y-6">
            {/* User Card */}
            <Card>
              <CardContent className="p-6 text-center">
                <Avatar className="h-20 w-20 mx-auto mb-3">
                  <AvatarImage src={user.image || undefined} alt={user.name || 'User'} />
                  <AvatarFallback className="text-lg">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <p className="font-semibold">{user.name || 'User'}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </CardContent>
            </Card>

            {/* Nav Links */}
            <nav className="space-y-1">
              {SIDEBAR_LINKS.map((link) => {
                const Icon = link.icon
                const isActive = currentRoute === link.route
                return (
                  <Button
                    key={link.route}
                    variant={isActive ? 'secondary' : 'ghost'}
                    className="w-full justify-start gap-3"
                    onClick={() => navigate(link.route)}
                  >
                    <Icon className="size-4" />
                    {link.label}
                    {isActive && <ChevronRight className="ml-auto size-4" />}
                  </Button>
                )
              })}
            </nav>

            <Separator />

            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-destructive hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="size-4" />
              Logout
            </Button>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}

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

// ============================================================================
// AccountOrdersPage
// ============================================================================

export function AccountOrdersPage() {
  const isAuthenticated = useAuthGuard()
  const user = useAuthStore((s) => s.user)
  const navigate = useRouterStore((s) => s.navigate)
  const [statusFilter, setStatusFilter] = useState('ALL')

  const { data: orders = [], isLoading } = useQuery<OrderWithItems[]>({
    queryKey: ['user-orders', user?.id],
    queryFn: async () => {
      const result = await api.get<OrderWithItems[]>('/orders', { userId: user!.id })
      return result.success && result.data ? result.data : []
    },
    enabled: !!user?.id,
  })

  if (!isAuthenticated || !user) return null

  const filteredOrders =
    statusFilter === 'ALL'
      ? orders
      : orders.filter((o) => o.status === statusFilter)

  const filterTabs = ['ALL', 'PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']

  return (
    <AccountLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div>
          <h1 className="text-2xl font-bold">My Orders</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage your orders
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="overflow-x-auto">
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="w-full justify-start">
              {filterTabs.map((tab) => (
                <TabsTrigger key={tab} value={tab} className="text-xs sm:text-sm">
                  {tab === 'ALL' ? 'All' : tab.charAt(0) + tab.slice(1).toLowerCase()}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Orders List */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="size-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-medium mb-1">No orders found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {statusFilter !== 'ALL'
                  ? `You have no ${statusFilter.toLowerCase()} orders.`
                  : 'You haven\'t placed any orders yet.'}
              </p>
              <Button onClick={() => navigate('products')}>Start Shopping</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <Card key={order.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Order Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 border-b bg-muted/30">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-sm">
                        {order.orderNumber}
                      </span>
                      <Badge
                        variant="secondary"
                        className={STATUS_COLORS[order.status] || ''}
                      >
                        {order.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3.5" />
                        {formatDate(order.createdAt)}
                      </span>
                      <span>{order.items?.length || 0} item(s)</span>
                    </div>
                  </div>

                  {/* Order Items Preview */}
                  <div className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex -space-x-2">
                        {order.items?.slice(0, 4).map((item, idx) => (
                          <div
                            key={item.id}
                            className="w-10 h-10 rounded-lg border-2 border-background bg-muted flex items-center justify-center overflow-hidden"
                          >
                            {item.image ? (
                              <img
                                src={(() => { try { const p = JSON.parse(item.image); return Array.isArray(p) ? p[0] : item.image; } catch { return item.image; } })()}
                                alt={item.productName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ShoppingBag className="size-4 text-muted-foreground" />
                            )}
                          </div>
                        ))}
                        {order.items && order.items.length > 4 && (
                          <div className="w-10 h-10 rounded-lg border-2 border-background bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                            +{order.items.length - 4}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-lg font-bold">
                          {formatCurrency(order.totalAmount)}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() =>
                            navigate('account-order-detail', { orderId: order.id })
                          }
                        >
                          <Eye className="size-3.5" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </motion.div>
    </AccountLayout>
  )
}

// ============================================================================
// AccountOrderDetailPage
// ============================================================================

export function AccountOrderDetailPage() {
  const isAuthenticated = useAuthGuard()
  const params = useRouterStore((s) => s.params)
  const navigate = useRouterStore((s) => s.navigate)
  const goBack = useRouterStore((s) => s.goBack)
  const orderId = params.orderId

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order-detail', orderId],
    queryFn: async (): Promise<OrderWithItems | null> => {
      const result = await api.get<OrderWithItems>('/orders', { orderId })
      return result.success && result.data ? result.data : null
    },
    enabled: !!orderId,
  })

  if (!isAuthenticated) return null

  if (isLoading) {
    return (
      <AccountLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-60 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </AccountLayout>
    )
  }

  if (error || !order) {
    return (
      <AccountLayout>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="size-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-medium mb-1">Order not found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              The order you&apos;re looking for doesn&apos;t exist.
            </p>
            <Button variant="outline" onClick={() => navigate('account-orders')}>
              Back to Orders
            </Button>
          </CardContent>
        </Card>
      </AccountLayout>
    )
  }

  const shippingAddr = order.shippingAddress
    ? typeof order.shippingAddress === 'string'
      ? JSON.parse(order.shippingAddress)
      : order.shippingAddress
    : null
  const billingAddr = order.billingAddress
    ? typeof order.billingAddress === 'string'
      ? JSON.parse(order.billingAddress)
      : order.billingAddress
    : null

  const timelineSteps = ORDER_STATUS_STEPS
  const currentStepIndex = timelineSteps.indexOf(order.status)

  return (
    <AccountLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={goBack}>
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Order {order.orderNumber}</h1>
            <p className="text-sm text-muted-foreground">
              Placed on {formatDate(order.createdAt)}
            </p>
          </div>
          <Badge
            variant="secondary"
            className={`ml-auto ${STATUS_COLORS[order.status] || ''}`}
          >
            {order.status}
          </Badge>
        </div>

        {/* Status Timeline */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Order Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              {timelineSteps.map((step, idx) => {
                const isCompleted = idx <= currentStepIndex
                const isCurrent = idx === currentStepIndex
                const isCancelled = order.status === 'CANCELLED'
                const stepIcon = (() => {
                  switch (step) {
                    case 'PENDING':
                      return Clock
                    case 'PAID':
                      return CreditCard
                    case 'PROCESSING':
                      return Package
                    case 'SHIPPED':
                      return Truck
                    case 'DELIVERED':
                      return CheckCircle2
                    default:
                      return Circle
                  }
                })()
                const StepIcon = stepIcon

                return (
                  <div
                    key={step}
                    className="flex flex-col items-center flex-1 relative"
                  >
                    {/* Connector line */}
                    {idx < timelineSteps.length - 1 && (
                      <div
                        className={`absolute top-4 left-1/2 w-full h-0.5 ${
                          isCancelled
                            ? 'bg-red-200 dark:bg-red-900/30'
                            : idx < currentStepIndex
                              ? 'bg-green-400'
                              : 'bg-muted'
                        }`}
                      />
                    )}
                    <div
                      className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                        isCancelled && isCurrent
                          ? 'border-red-400 bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400'
                          : isCompleted
                            ? 'border-green-400 bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                            : 'border-muted-foreground/30 bg-background text-muted-foreground'
                      }`}
                    >
                      <StepIcon className="size-3.5" />
                    </div>
                    <span
                      className={`text-xs mt-2 text-center ${
                        isCompleted
                          ? 'font-medium text-foreground'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {step.charAt(0) + step.slice(1).toLowerCase()}
                    </span>
                  </div>
                )
              })}
            </div>
            {order.trackingNumber && (
              <div className="mt-4 p-3 bg-muted rounded-lg flex items-center gap-2">
                <Truck className="size-4 text-muted-foreground" />
                <span className="text-sm">
                  Tracking:{' '}
                  <span className="font-mono font-medium">
                    {order.trackingNumber}
                  </span>
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.items?.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 p-3 rounded-lg border"
              >
                <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                  {item.image ? (
                    <img
                      src={
                        (() => {
                          try {
                            const parsed = JSON.parse(item.image)
                            return Array.isArray(parsed) ? parsed[0] : item.image
                          } catch {
                            return item.image
                          }
                        })()
                      }
                      alt={item.productName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ShoppingBag className="size-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {item.productName}
                  </p>
                  {item.variantName && (
                    <p className="text-xs text-muted-foreground">
                      {item.variantName}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Qty: {item.quantity} &times; {formatCurrency(item.price)}
                  </p>
                </div>
                <span className="font-semibold text-sm shrink-0">
                  {formatCurrency(item.total)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Addresses & Payment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Shipping Address */}
          {shippingAddr && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Truck className="size-4" /> Shipping Address
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-0.5">
                <p className="font-medium text-foreground">
                  {shippingAddr.firstName} {shippingAddr.lastName}
                </p>
                <p>{shippingAddr.street1}</p>
                {shippingAddr.street2 && <p>{shippingAddr.street2}</p>}
                <p>
                  {shippingAddr.city}, {shippingAddr.state}{' '}
                  {shippingAddr.postalCode}
                </p>
                <p>{shippingAddr.country}</p>
                {shippingAddr.phone && <p>{shippingAddr.phone}</p>}
              </CardContent>
            </Card>
          )}

          {/* Billing Address */}
          {billingAddr && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CreditCard className="size-4" /> Billing Address
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-0.5">
                <p className="font-medium text-foreground">
                  {billingAddr.firstName} {billingAddr.lastName}
                </p>
                <p>{billingAddr.street1}</p>
                {billingAddr.street2 && <p>{billingAddr.street2}</p>}
                <p>
                  {billingAddr.city}, {billingAddr.state}{' '}
                  {billingAddr.postalCode}
                </p>
                <p>{billingAddr.country}</p>
                {billingAddr.phone && <p>{billingAddr.phone}</p>}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Payment Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CreditCard className="size-4" /> Payment Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Method</span>
              <span className="font-medium">
                {order.payment?.method || 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-muted-foreground">Payment Status</span>
              <Badge
                variant="secondary"
                className={
                  STATUS_COLORS[order.payment?.status || ''] || ''
                }
              >
                {order.payment?.status || 'N/A'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Order Total Breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span>
                {order.shippingAmount > 0
                  ? formatCurrency(order.shippingAmount)
                  : 'Free'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>{formatCurrency(order.taxAmount)}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-green-600 dark:text-green-400">
                <span>Discount</span>
                <span>-{formatCurrency(order.discountAmount)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-base">
              <span>Total</span>
              <span>{formatCurrency(order.totalAmount)}</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AccountLayout>
  )
}

// ============================================================================
// AccountWishlistPage
// ============================================================================

function WishlistProductCard({
  productId,
  onRemove,
}: {
  productId: string
  onRemove: () => void
}) {
  const navigate = useRouterStore((s) => s.navigate)
  const addItem = useCartStore((s) => s.addItem)
  const removeItem = useWishlistStore((s) => s.removeItem)

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: async (): Promise<ProductListItem | null> => {
      const result = await api.get<ProductListItem>(`/products/${productId}`)
      return result.success && result.data ? result.data : null
    },
    enabled: !!productId,
  })

  const handleAddToCart = () => {
    if (!product) return
    const images = (() => {
      try {
        const parsed = JSON.parse(product.images)
        return Array.isArray(parsed) ? parsed[0] : product.images
      } catch {
        return product.images
      }
    })()

    addItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      comparePrice: product.comparePrice || undefined,
      image: images,
      sku: product.id,
      quantity: 1,
    })
    toast({
      title: 'Added to cart',
      description: `${product.name} has been added to your cart.`,
    })
  }

  const handleRemove = () => {
    removeItem(productId)
    onRemove()
    toast({
      title: 'Removed from wishlist',
      description: 'Item has been removed from your wishlist.',
    })
  }

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <Skeleton className="aspect-square w-full" />
        <CardContent className="p-4 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    )
  }

  if (!product) return null

  const mainImage = (() => {
    try {
      const parsed = JSON.parse(product.images)
      return Array.isArray(parsed) ? parsed[0] : product.images
    } catch {
      return product.images
    }
  })()

  return (
    <Card className="overflow-hidden group">
      <div
        className="relative aspect-square bg-muted cursor-pointer overflow-hidden"
        onClick={() => navigate('product-detail', { id: product.id })}
      >
        <img
          src={mainImage}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <CardContent className="p-4">
        <h3
          className="font-medium text-sm truncate cursor-pointer hover:text-primary transition-colors"
          onClick={() => navigate('product-detail', { id: product.id })}
        >
          {product.name}
        </h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="font-bold text-sm">
            {formatCurrency(product.price)}
          </span>
          {product.comparePrice && (
            <span className="text-xs text-muted-foreground line-through">
              {formatCurrency(product.comparePrice)}
            </span>
          )}
        </div>
        {product.avgRating > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <Star className="size-3 fill-yellow-400 text-yellow-400" />
            <span className="text-xs text-muted-foreground">
              {product.avgRating.toFixed(1)} ({product.reviewCount})
            </span>
          </div>
        )}
      </CardContent>
      <CardFooter className="p-4 pt-0 flex gap-2">
        <Button
          size="sm"
          className="flex-1 gap-1"
          onClick={handleAddToCart}
        >
          <ShoppingCart className="size-3.5" />
          Add to Cart
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0"
          onClick={handleRemove}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </CardFooter>
    </Card>
  )
}

export function AccountWishlistPage() {
  const isAuthenticated = useAuthGuard()
  const productIds = useWishlistStore((s) => s.productIds)
  const [, setRefresh] = useState(0)

  const handleRemove = () => {
    setRefresh((prev) => prev + 1)
  }

  if (!isAuthenticated) return null

  return (
    <AccountLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div>
          <h1 className="text-2xl font-bold">My Wishlist</h1>
          <p className="text-muted-foreground mt-1">
            {productIds.length} item(s) saved for later
          </p>
        </div>

        {productIds.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Heart className="size-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-medium mb-1">Your wishlist is empty</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Save items you love for later.
              </p>
              <Button onClick={() => useRouterStore.getState().navigate('products')}>
                Browse Products
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {productIds.map((id) => (
              <WishlistProductCard
                key={id}
                productId={id}
                onRemove={handleRemove}
              />
            ))}
          </div>
        )}
      </motion.div>
    </AccountLayout>
  )
}

// ============================================================================
// AccountAddressesPage
// ============================================================================

const addressSchema = z.object({
  label: z.string().optional(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  street1: z.string().min(1, 'Street address is required'),
  street2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  country: z.string().min(1, 'Country is required'),
  phone: z.string().optional(),
  isDefault: z.boolean().optional(),
})

type AddressFormValues = z.infer<typeof addressSchema>

function AddressCard({
  address,
  onEdit,
  onDelete,
}: {
  address: AddressDisplay
  onEdit: (address: AddressDisplay) => void
  onDelete: (id: string) => void
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-semibold">
                {address.firstName} {address.lastName}
              </span>
              {address.isDefault && (
                <Badge variant="secondary" className="text-xs">
                  Default
                </Badge>
              )}
              {address.label && (
                <Badge variant="outline" className="text-xs">
                  {address.label}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">{address.street1}</p>
            {address.street2 && (
              <p className="text-muted-foreground">{address.street2}</p>
            )}
            <p className="text-muted-foreground">
              {address.city}, {address.state} {address.postalCode}
            </p>
            <p className="text-muted-foreground">{address.country}</p>
            {address.phone && (
              <p className="text-muted-foreground">{address.phone}</p>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            <Button
              size="icon"
              variant="ghost"
              className="size-8"
              onClick={() => onEdit(address)}
            >
              <Pencil className="size-3.5" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Address</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this address? This action
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => onDelete(address.id)}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function AccountAddressesPage() {
  const isAuthenticated = useAuthGuard()
  const user = useAuthStore((s) => s.user)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<AddressDisplay | null>(null)

  const { data: addresses = [], isLoading, refetch } = useQuery<AddressDisplay[]>({
    queryKey: ['user-addresses', user?.id],
    queryFn: async () => {
      const result = await api.get<AddressDisplay[]>('/addresses', { userId: user!.id })
      return result.success && result.data ? result.data : []
    },
    enabled: !!user?.id,
  })

  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      label: '',
      firstName: '',
      lastName: '',
      street1: '',
      street2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'US',
      phone: '',
      isDefault: false,
    },
  })

  const openAddDialog = () => {
    setEditingAddress(null)
    form.reset({
      label: '',
      firstName: '',
      lastName: '',
      street1: '',
      street2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'US',
      phone: '',
      isDefault: false,
    })
    setDialogOpen(true)
  }

  const openEditDialog = (address: AddressDisplay) => {
    setEditingAddress(address)
    form.reset({
      label: address.label || '',
      firstName: address.firstName,
      lastName: address.lastName,
      street1: address.street1,
      street2: address.street2 || '',
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      phone: address.phone || '',
      isDefault: address.isDefault,
    })
    setDialogOpen(true)
  }

  const onSubmitAddress = async (values: AddressFormValues) => {
    try {
      const payload = {
        userId: user!.id,
        ...values,
        label: values.label || null,
        street2: values.street2 || null,
        phone: values.phone || null,
      }

      if (editingAddress) {
        const result = await api.put(`/addresses/${editingAddress.id}`, payload)
        if (result.success) {
          toast({ title: 'Address updated', description: 'Your address has been updated.' })
        } else {
          toast({ title: 'Error', description: result.error || 'Failed to update address', variant: 'destructive' })
          return
        }
      } else {
        const result = await api.post('/addresses', payload)
        if (result.success) {
          toast({ title: 'Address added', description: 'New address has been saved.' })
        } else {
          toast({ title: 'Error', description: result.error || 'Failed to add address', variant: 'destructive' })
          return
        }
      }
      setDialogOpen(false)
      refetch()
    } catch {
      toast({ title: 'Error', description: 'An unexpected error occurred.', variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const result = await api.delete(`/addresses/${id}`)
      if (result.success) {
        toast({ title: 'Address deleted', description: 'The address has been removed.' })
        refetch()
      } else {
        toast({ title: 'Error', description: result.error || 'Failed to delete address', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'An unexpected error occurred.', variant: 'destructive' })
    }
  }

  if (!isAuthenticated || !user) return null

  return (
    <AccountLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Addresses</h1>
            <p className="text-muted-foreground mt-1">
              Manage your shipping and billing addresses
            </p>
          </div>
          <Button className="gap-1" onClick={openAddDialog}>
            <Plus className="size-4" />
            Add New
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : addresses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MapPin className="size-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-medium mb-1">No addresses saved</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add a shipping address for faster checkout.
              </p>
              <Button onClick={openAddDialog}>
                <Plus className="size-4 mr-1" />
                Add Address
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {addresses.map((addr) => (
              <AddressCard
                key={addr.id}
                address={addr}
                onEdit={openEditDialog}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Add/Edit Address Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAddress ? 'Edit Address' : 'Add New Address'}
              </DialogTitle>
              <DialogDescription>
                {editingAddress
                  ? 'Update your address details below.'
                  : 'Fill in the details for your new address.'}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmitAddress)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="label"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Label (e.g. Home, Work)</FormLabel>
                      <FormControl>
                        <Input placeholder="Home" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="street1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main St" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="street2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apartment, suite, etc. (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Apt 4B" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="New York" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input placeholder="NY" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal Code</FormLabel>
                        <FormControl>
                          <Input placeholder="10001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input placeholder="US" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 (555) 123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isDefault"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <FormLabel>Set as default address</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingAddress ? 'Save Changes' : 'Add Address'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </motion.div>
    </AccountLayout>
  )
}

// ============================================================================
// AccountSettingsPage
// ============================================================================

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
})

type ProfileFormValues = z.infer<typeof profileSchema>

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmNewPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Passwords do not match',
    path: ['confirmNewPassword'],
  })

type PasswordFormValues = z.infer<typeof passwordSchema>

export function AccountSettingsPage() {
  const isAuthenticated = useAuthGuard()
  const user = useAuthStore((s) => s.user)
  const updateUser = useAuthStore((s) => s.updateUser)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useRouterStore((s) => s.navigate)

  const [profileLoading, setProfileLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [notifications, setNotifications] = useState({
    orderUpdates: true,
    promotions: false,
    newsletter: true,
    priceDrops: true,
  })

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
    },
  })

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  })

  // Reset form when user changes
  useEffect(() => {
    if (user) {
      profileForm.reset({ name: user.name || '' })
    }
  }, [user, profileForm])

  const onProfileSubmit = async (values: ProfileFormValues) => {
    setProfileLoading(true)
    try {
      const result = await api.put<UserProfile>(`/users/${user!.id}`, {
        name: values.name,
      })
      if (result.success && result.data) {
        updateUser(result.data)
        toast({ title: 'Profile updated', description: 'Your name has been updated.' })
      } else {
        toast({
          title: 'Update failed',
          description: result.error || 'Could not update profile',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      })
    } finally {
      setProfileLoading(false)
    }
  }

  const onPasswordSubmit = async (values: PasswordFormValues) => {
    setPasswordLoading(true)
    try {
      const result = await api.post('/auth', {
        action: 'change-password',
        userId: user!.id,
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
      if (result.success) {
        toast({
          title: 'Password changed',
          description: 'Your password has been updated successfully.',
        })
        passwordForm.reset()
      } else {
        toast({
          title: 'Change failed',
          description: result.error || 'Could not change password',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      })
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleDeleteAccount = () => {
    logout()
    navigate('home')
    toast({
      title: 'Account deleted',
      description: 'Your account has been permanently deleted.',
    })
  }

  if (!isAuthenticated || !user) return null

  return (
    <AccountLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div>
          <h1 className="text-2xl font-bold">Account Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your profile and preferences
          </p>
        </div>

        {/* Profile Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Profile Information</CardTitle>
            <CardDescription>
              Update your personal details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...profileForm}>
              <form
                onSubmit={profileForm.handleSubmit(onProfileSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={profileForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={user.email} readOnly disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed. Contact support if you need to update it.
                  </p>
                </div>
                <Button type="submit" disabled={profileLoading}>
                  {profileLoading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Change Password Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Change Password</CardTitle>
            <CardDescription>
              Update your password to keep your account secure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...passwordForm}>
              <form
                onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter current password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="At least 8 characters" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="confirmNewPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Confirm new password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={passwordLoading}>
                  {passwordLoading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Changing...
                    </>
                  ) : (
                    'Change Password'
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notification Preferences</CardTitle>
            <CardDescription>
              Choose what notifications you want to receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                key: 'orderUpdates' as const,
                label: 'Order Updates',
                description: 'Get notified about your order status changes',
              },
              {
                key: 'promotions' as const,
                label: 'Promotions',
                description: 'Receive special offers and discounts',
              },
              {
                key: 'newsletter' as const,
                label: 'Newsletter',
                description: 'Weekly digest of new products and trends',
              },
              {
                key: 'priceDrops' as const,
                label: 'Price Drop Alerts',
                description: 'Get alerts when wishlist items go on sale',
              },
            ].map((pref) => (
              <div
                key={pref.key}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">{pref.label}</Label>
                  <p className="text-xs text-muted-foreground">
                    {pref.description}
                  </p>
                </div>
                <Switch
                  checked={notifications[pref.key]}
                  onCheckedChange={(checked) =>
                    setNotifications((prev) => ({ ...prev, [pref.key]: checked }))
                  }
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-lg text-destructive flex items-center gap-2">
              <AlertTriangle className="size-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible and destructive actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-lg border border-destructive/30 p-4">
              <div>
                <p className="font-medium text-sm">Delete Account</p>
                <p className="text-xs text-muted-foreground">
                  Permanently delete your account and all associated data.
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Are you absolutely sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete
                      your account and remove all your data from our servers,
                      including orders, addresses, and wishlist items.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={handleDeleteAccount}
                    >
                      Yes, delete my account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AccountLayout>
  )
}
