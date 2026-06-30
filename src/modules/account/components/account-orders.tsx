/**
 * @file account-orders.tsx
 * @description Order history list and order detail pages for the ShopForge
 * e-commerce account section. Provides two exported components:
 * - AccountOrdersPage: Filterable list of all user orders with status tabs
 * - AccountOrderDetailPage: Detailed single-order view with timeline, items,
 *   addresses, payment info, and order summary breakdown
 *
 * @keyfeatures
 * - Status filter tabs (ALL, PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED)
 * - Order cards with image thumbnails, status badges, and quick view button
 * - Order detail page with visual status timeline progression
 * - Shipping/billing address display parsed from JSON
 * - Payment method and status information
 * - Order total breakdown (subtotal, shipping, tax, discount, total)
 * - Loading skeletons and empty/error states
 * - Back navigation via router store goBack()
 */
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
import { useRouterStore } from "@/shared/stores/router-store"
import { useAuthStore } from "@/modules/auth/stores/auth-store"
import { api } from "@/shared/lib/api-client"

import { Button } from "@/shared/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"
import { Separator } from "@/shared/components/ui/separator"
import { Badge } from "@/shared/components/ui/badge"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"

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

/**
 * @function AccountOrdersPage
 * @description Displays a filterable list of the authenticated user's orders.
 * Users can filter orders by status using tab buttons, view order image
 * thumbnails, and navigate to the order detail page.
 *
 * @state
 * - `isAuthenticated` - from useAuthGuard, ensures user is logged in
 * - `user` - from useAuthStore, the current user object
 * - `navigate` - from useRouterStore, programmatic navigation function
 * - `statusFilter` - local state for the active status filter tab (default: 'ALL')
 * - `orders` - fetched via TanStack Query from /orders API endpoint
 *
 * @remarks
 * - Returns null if user is not authenticated or user object is unavailable
 * - Filter tabs include ALL plus all order statuses
 * - Each order card shows up to 4 product image thumbnails with overflow indicator
 */
export function AccountOrdersPage() {
  const isAuthenticated = useAuthGuard()
  const user = useAuthStore((s) => s.user)
  const navigate = useRouterStore((s) => s.navigate)
  const [statusFilter, setStatusFilter] = useState('ALL')

  // Fetch user's orders from the API, enabled only when user ID is available
  const { data: orders = [], isLoading } = useQuery<OrderWithItems[]>({
    queryKey: ['user-orders', user?.id],
    queryFn: async () => {
      const result = await api.get<OrderWithItems[]>('/orders', { userId: user!.id })
      return result.success && result.data ? result.data : []
    },
    enabled: !!user?.id,
  })

  // Guard: don't render if not authenticated or user data not loaded
  if (!isAuthenticated || !user) return null

  // Apply status filter: show all orders or filter by selected status
  const filteredOrders =
    statusFilter === 'ALL'
      ? orders
      : orders.filter((o) => o.status === statusFilter)

  // Available filter tab options for order status filtering
  const filterTabs = ['ALL', 'PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']

  return (
    <AccountLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold">My Orders</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage your orders
          </p>
        </div>

        {/* Filter Tabs - horizontally scrollable status filter buttons */}
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

        {/* Orders List - renders loading, empty, or order cards */}
        {isLoading ? (
          /* Loading state: skeleton placeholders */
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-132 w-full" />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          /* Empty state: contextual message based on active filter */
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
          /* Order cards: each card shows order header, item thumbnails, total, and view button */
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <Card key={order.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Order Header - order number, status badge, date, and item count */}
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

                  {/* Order Items Preview - up to 4 product image thumbnails with overflow count */}
                  <div className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Stacked image thumbnails showing product variety */}
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
                        {/* Overflow indicator when more than 4 items */}
                        {order.items && order.items.length > 4 && (
                          <div className="w-10 h-10 rounded-lg border-2 border-background bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                            +{order.items.length - 4}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        {/* Order total amount */}
                        <span className="text-lg font-bold">
                          {formatCurrency(order.totalAmount)}
                        </span>
                        {/* View Details button navigates to order detail page */}
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

/**
 * @function AccountOrderDetailPage
 * @description Renders the full detail view for a single order. Displays the
 * order status timeline, item list with images and pricing, shipping and
 * billing addresses, payment information, and an order summary breakdown.
 *
 * @state
 * - `isAuthenticated` - from useAuthGuard, ensures user is logged in
 * - `params` - from useRouterStore, contains `orderId` for the current order
 * - `navigate` - from useRouterStore, programmatic navigation function
 * - `goBack` - from useRouterStore, navigates to the previous page
 * - `order` - fetched via TanStack Query from /orders API endpoint using orderId
 *
 * @remarks
 * - Shows loading skeletons while the order data is being fetched
 * - Displays an error state card if the order is not found or API fails
 * - Shipping and billing addresses are parsed from JSON strings when necessary
 * - The status timeline renders icons for each step (Clock, CreditCard, Package, Truck, CheckCircle)
 * - Cancelled orders get a special red styling on the current timeline step
 */
export function AccountOrderDetailPage() {
  const isAuthenticated = useAuthGuard()
  const params = useRouterStore((s) => s.params)
  const navigate = useRouterStore((s) => s.navigate)
  const goBack = useRouterStore((s) => s.goBack)
  const orderId = params.orderId

  // Fetch the specific order details from the API using orderId from route params
  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order-detail', orderId],
    queryFn: async (): Promise<OrderWithItems | null> => {
      const result = await api.get<OrderWithItems>('/orders', { orderId })
      return result.success && result.data ? result.data : null
    },
    enabled: !!orderId,
  })

  // Guard: don't render if not authenticated
  if (!isAuthenticated) return null

  // Loading state: skeleton placeholders mimicking the detail layout
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

  // Error/not-found state: display a message and back-to-orders button
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

  // Parse shipping address from JSON string if necessary
  const shippingAddr = order.shippingAddress
    ? typeof order.shippingAddress === 'string'
      ? JSON.parse(order.shippingAddress)
      : order.shippingAddress
    : null

  // Parse billing address from JSON string if necessary
  const billingAddr = order.billingAddress
    ? typeof order.billingAddress === 'string'
      ? JSON.parse(order.billingAddress)
      : order.billingAddress
    : null

  // Determine the current position in the order status timeline
  const timelineSteps = ORDER_STATUS_STEPS
  const currentStepIndex = timelineSteps.indexOf(order.status)

  return (
    <AccountLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header - back button, order number, date, and status badge */}
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
          {/* Status badge aligned to the right */}
          <Badge
            variant="secondary"
            className={`ml-auto ${STATUS_COLORS[order.status] || ''}`}
          >
            {order.status}
          </Badge>
        </div>

        {/* Status Timeline - visual progression through order lifecycle steps */}
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

                // Select the appropriate icon for each status step
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
                    {/* Connector line between steps */}
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
                    {/* Step circle with icon - green for completed, red for cancelled current, muted for future */}
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
                    {/* Step label text */}
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
            {/* Tracking number display - shown only when a tracking number exists */}
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

        {/* Order Items - list of products with images, names, variants, quantities, and totals */}
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
                {/* Product image thumbnail */}
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
                {/* Item details: name, variant, quantity x price */}
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
                {/* Item total */}
                <span className="font-semibold text-sm shrink-0">
                  {formatCurrency(item.total)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Addresses & Payment - side-by-side shipping and billing address cards */}
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

        {/* Payment Info - method and payment status */}
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

        {/* Order Total Breakdown - subtotal, shipping, tax, discount, and final total */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {/* Subtotal */}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            {/* Shipping cost - shows "Free" if zero */}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span>
                {order.shippingAmount > 0
                  ? formatCurrency(order.shippingAmount)
                  : 'Free'}
              </span>
            </div>
            {/* Tax amount */}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>{formatCurrency(order.taxAmount)}</span>
            </div>
            {/* Discount - shown only when a discount was applied */}
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-green-600 dark:text-green-400">
                <span>Discount</span>
                <span>-{formatCurrency(order.discountAmount)}</span>
              </div>
            )}
            <Separator />
            {/* Final total */}
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
