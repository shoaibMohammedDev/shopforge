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

export function AdminOrdersContent() {
  const { navigate } = useRouterStore()
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('ALL')
  const [statusDialogOrder, setStatusDialogOrder] = useState<AdminOrder | null>(null)
  const [newStatus, setNewStatus] = useState('')
  const [saving, setSaving] = useState(false)

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

  useEffect(() => {
    fetchOrders(activeTab)
  }, [activeTab, fetchOrders])

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

  const orderStatuses = ['ALL', 'PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']

  return (
    <>
      {/* Filter tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="flex-wrap h-auto gap-1">
          {orderStatuses.map((status) => (
            <TabsTrigger key={status} value={status} className="text-xs px-3">
              {status === 'ALL' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Orders table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
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
                  <TableHead className="hidden md:table-cell">Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                      No orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium text-sm">
                        #{order.orderNumber}
                      </TableCell>
                      <TableCell className="text-sm">
                        {order.user?.name || order.user?.email || 'Guest'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-gray-500">
                        {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {formatCurrency(order.totalAmount)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={order.status} />
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-gray-500">
                        {formatDate(order.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => navigate('account-order-detail', { id: order.id })}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
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

      {/* Update Status Dialog */}
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
