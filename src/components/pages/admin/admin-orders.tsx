/**
 * @file admin-orders.tsx
 * @description Order management page for the ShopForge admin panel. Provides
 * a filterable table of all orders with status tabs, and an update status
 * dialog for changing order statuses. Includes a dropdown menu for each
 * order row with View Details and Update Status actions.
 *
 * @keyfeatures
 * - Status filter tabs (ALL, PENDING, PAID, PROCESSING, SHIPPED, DELIVERED, CANCELLED)
 * - Orders table with customer info, item count, total, and status badge
 * - View order details navigation via dropdown menu
 * - Update order status dialog with Select dropdown
 * - Server-side filtering by status via query parameter
 * - Loading skeletons and empty state handling
 * - Status changes trigger a refetch of the filtered order list
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Eye,
  MoreHorizontal,
  ArrowUpDown,
  Loader2,
} from 'lucide-react'
import { useRouterStore } from '@/stores/router-store'
import { toast } from '@/hooks/use-toast'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { formatCurrency, formatDate, StatusBadge } from './admin-page'

// ============================================================================
// AdminOrdersContent
// ============================================================================

/**
 * @interface AdminOrder
 * @description Represents an order as returned by the admin API for the
 * orders management table. Includes customer info, item count, payment
 * details, and the order's current status.
 *
 * @property {string} id - Unique order identifier
 * @property {string} orderNumber - Human-readable order number
 * @property {string} status - Current order status
 * @property {number} totalAmount - Final total for the order
 * @property {string} createdAt - ISO 8601 creation timestamp
 * @property {{ id: string; name: string | null; email: string } | null} user - The ordering user, or null for guest checkouts
 * @property {{ id: string; productName: string; quantity: number; total: number }[]} items - Order line items
 * @property {{ status: string; method: string } | null} payment - Payment information
 */
interface AdminOrder {
  id: string
  orderNumber: string
  status: string
  totalAmount: number
  createdAt: string
  user: { id: string; name: string | null; email: string } | null
  items: { id: string; productName: string; quantity: number; total: number }[]
  payment: { status: string; method: string } | null
}

/**
 * @function AdminOrdersContent
 * @description Order management content for the admin panel. Displays a
 * filterable table of orders with status tabs and provides a dialog for
 * updating order statuses.
 *
 * @state
 * - `orders` - array of AdminOrder fetched from the API (optionally filtered by status)
 * - `loading` - boolean for data fetch state
 * - `activeTab` - currently selected status filter tab
 * - `statusDialogOrder` - the order currently selected for status update (null when dialog is closed)
 * - `newStatus` - the new status value selected in the update dialog
 * - `saving` - boolean for the status update API call loading state
 *
 * @remarks
 * - Tab changes trigger a refetch with the selected status as a query parameter
 * - The update status dialog pre-populates with the order's current status
 * - Submit button is disabled when the new status matches the current status
 */
export function AdminOrdersContent() {
  const { navigate } = useRouterStore()
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('ALL')
  const [statusDialogOrder, setStatusDialogOrder] = useState<AdminOrder | null>(null)
  const [newStatus, setNewStatus] = useState('')
  const [saving, setSaving] = useState(false)

  /**
   * Fetches orders from the admin API, optionally filtered by status.
   * When status is 'ALL', fetches all orders without a status filter.
   *
   * @param {string} [status] - Optional status filter (e.g. 'PENDING', 'SHIPPED')
   */
  const fetchOrders = useCallback(async (status?: string) => {
    setLoading(true)
    try {
      const url = status && status !== 'ALL'
        ? `/api/admin?action=orders&status=${status}`
        : '/api/admin?action=orders'
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setOrders(data)
    } catch (err) {
      console.error('Failed to fetch orders:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Refetch orders whenever the active filter tab changes
  useEffect(() => {
    fetchOrders(activeTab)
  }, [activeTab, fetchOrders])

  /**
   * Handles updating an order's status via the admin API. Sends a PUT
   * request with the new status, closes the dialog on success, and
   * refreshes the order list for the current filter tab.
   */
  async function handleUpdateStatus() {
    if (!statusDialogOrder || !newStatus) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-order-status',
          id: statusDialogOrder.id,
          data: { status: newStatus },
        }),
      })
      if (!res.ok) throw new Error('Failed')
      toast({ title: 'Order status updated' })
      setStatusDialogOrder(null)
      fetchOrders(activeTab)
    } catch {
      toast({ title: 'Failed to update status', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // Available order status filter tabs
  const orderStatuses = ['ALL', 'PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']

  return (
    <>
      {/* Filter Tabs - horizontally scrollable status filter buttons */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="flex-wrap h-auto gap-1">
          {orderStatuses.map((status) => (
            <TabsTrigger key={status} value={status} className="text-xs px-3">
              {status === 'ALL' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            /* Loading state: skeleton placeholders */
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  {/* Items column - hidden on small screens */}
                  <TableHead className="hidden md:table-cell">Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  {/* Date column - hidden on extra-small screens */}
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  /* Empty state: no orders found for the current filter */
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                      No orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => (
                    <TableRow key={order.id}>
                      {/* Order number */}
                      <TableCell className="font-medium text-sm">
                        #{order.orderNumber}
                      </TableCell>
                      {/* Customer name or email, fallback to "Guest" */}
                      <TableCell className="text-sm">
                        {order.user?.name || order.user?.email || 'Guest'}
                      </TableCell>
                      {/* Item count */}
                      <TableCell className="hidden md:table-cell text-sm text-gray-500">
                        {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                      </TableCell>
                      {/* Order total */}
                      <TableCell className="text-sm font-medium">
                        {formatCurrency(order.totalAmount)}
                      </TableCell>
                      {/* Status badge */}
                      <TableCell>
                        <StatusBadge status={order.status} />
                      </TableCell>
                      {/* Order date */}
                      <TableCell className="hidden sm:table-cell text-sm text-gray-500">
                        {formatDate(order.createdAt)}
                      </TableCell>
                      {/* Action dropdown menu */}
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {/* View order detail page */}
                            <DropdownMenuItem
                              onClick={() => navigate('account-order-detail', { id: order.id })}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            {/* Open the update status dialog */}
                            <DropdownMenuItem
                              onClick={() => {
                                setStatusDialogOrder(order)
                                setNewStatus(order.status)
                              }}
                            >
                              <ArrowUpDown className="mr-2 h-4 w-4" />
                              Update Status
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Update Status Dialog - select dropdown for choosing a new order status */}
      <Dialog open={!!statusDialogOrder} onOpenChange={(open) => !open && setStatusDialogOrder(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
            <DialogDescription>
              Order #{statusDialogOrder?.orderNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="order-status">New Status</Label>
            {/* Status selector dropdown */}
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger className="mt-2 w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.charAt(0) + s.slice(1).toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOrder(null)}>
              Cancel
            </Button>
            {/* Update button - disabled while saving or when status unchanged */}
            <Button onClick={handleUpdateStatus} disabled={saving || newStatus === statusDialogOrder?.status}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
