'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Package,
  ShoppingBag,
  Eye,
  Loader2,
  CheckCircle2,
  Circle,
  Truck,
  CreditCard,
  AlertTriangle,
  Clock,
  ArrowLeft,
} from 'lucide-react'
import { useRouterStore } from '@/stores/router-store'
import { useAuthStore } from '@/stores/auth-store'
import { api } from '@/lib/api-client'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

import {
  AccountLayout,
  useAuthGuard,
  formatCurrency,
  formatDate,
  STATUS_COLORS,
  ORDER_STATUS_STEPS,
  type OrderWithItems,
} from './account-layout'

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
              <Skeleton key={i} className="h-132 w-full" />
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
