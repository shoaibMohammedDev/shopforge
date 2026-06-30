/**
 * @file admin-customers.tsx
 * @description Customer management page for the ShopForge admin panel. Provides
 * a searchable customer list table with options to view customer details in
 * a dialog and enable/disable customer accounts. Each row displays the
 * customer's avatar, name, email, order count, total spent, and status.
 *
 * @keyfeatures
 * - Searchable customer table with name/email filtering
 * - Customer detail dialog showing stats (orders, spending, status, join date)
 * - Enable/disable customer accounts via dropdown menu
 * - Avatar display with initials fallback
 * - Total spent calculated from order records
 * - Active/Inactive status badges
 * - Loading skeletons and empty state handling
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Search,
  Eye,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { toast } from "@/shared/hooks/use-toast"

import { Button } from "@/shared/components/ui/button"
import { Card, CardContent } from "@/shared/components/ui/card"
import { Input } from "@/shared/components/ui/input"
import { Separator } from "@/shared/components/ui/separator"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"

import { formatCurrency, formatDate, StatusBadge } from './admin-page'

// ============================================================================
// AdminCustomersContent
// ============================================================================

/**
 * @interface AdminCustomer
 * @description Represents a customer as returned by the admin API for the
 * customers management table. Includes order statistics and account status.
 *
 * @property {string} id - Unique customer identifier
 * @property {string | null} name - Customer's display name (may be null)
 * @property {string} email - Customer's email address
 * @property {string | null} image - Customer's profile image URL
 * @property {boolean} isActive - Whether the customer account is active
 * @property {string} createdAt - ISO 8601 registration timestamp
 * @property {{ orders: number }} _count - Prisma aggregate count of orders
 * @property {{ totalAmount: number }[]} orders - Array of order total amounts for spending calculation
 */
interface AdminCustomer {
  id: string
  name: string | null
  email: string
  image: string | null
  isActive: boolean
  createdAt: string
  _count: { orders: number }
  orders: { totalAmount: number }[]
}

/**
 * @function AdminCustomersContent
 * @description Customer management content for the admin panel. Displays a
 * searchable table of customers with a detail dialog and enable/disable toggle.
 *
 * @state
 * - `customers` - array of AdminCustomer fetched from /api/admin?action=customers
 * - `loading` - boolean for initial data fetch state
 * - `search` - local search string for client-side filtering by name or email
 * - `selectedCustomer` - the customer currently selected for detail view (null when dialog is closed)
 *
 * @remarks
 * - Customers are filtered client-side by name or email matching the search string
 * - Total spent is calculated by summing all order totalAmount values
 * - Enable/disable sends a PUT request to toggle the customer's isActive state
 */
export function AdminCustomersContent() {
  const [customers, setCustomers] = useState<AdminCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<AdminCustomer | null>(null)

  /**
   * Fetches all customers from the admin API. Called on mount and after
   * mutations (toggle) to refresh the customer list.
   */
  const fetchCustomers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin?action=customers')
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setCustomers(data)
    } catch (err) {
      console.error('Failed to fetch customers:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch customers on component mount
  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  /**
   * Toggles a customer's active/disabled status. Sends a PUT request to
   * the admin API and refreshes the customer list on success.
   *
   * @param {AdminCustomer} customer - The customer to enable or disable
   */
  async function handleToggleDisable(customer: AdminCustomer) {
    try {
      const res = await fetch('/api/admin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle-user',
          id: customer.id,
          data: { isActive: !customer.isActive },
        }),
      })
      if (!res.ok) throw new Error('Failed')
      toast({ title: `Customer ${customer.isActive ? 'disabled' : 'enabled'}` })
      fetchCustomers()
    } catch {
      toast({ title: 'Failed to update customer', variant: 'destructive' })
    }
  }

  // Client-side filtering: search by customer name or email
  const filteredCustomers = customers.filter(
    (c) =>
      (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      {/* Search bar - filters customers by name or email */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Customers Table */}
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
                  <TableHead>Customer</TableHead>
                  {/* Orders column - hidden on extra-small screens */}
                  <TableHead className="hidden sm:table-cell">Orders</TableHead>
                  <TableHead>Total Spent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  /* Empty state: no customers match the search filter */
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                      No customers found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => {
                    // Calculate total spent by summing all order totals
                    const totalSpent = customer.orders?.reduce((s, o) => s + o.totalAmount, 0) || 0
                    return (
                      <TableRow key={customer.id}>
                        {/* Customer avatar, name, and email */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={customer.image || undefined} />
                              {/* Fallback: first letter of name or email */}
                              <AvatarFallback className="text-xs bg-gray-100">
                                {customer.name?.charAt(0)?.toUpperCase() || customer.email.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{customer.name || 'Unnamed'}</p>
                              <p className="text-xs text-gray-500">{customer.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        {/* Order count from Prisma aggregate */}
                        <TableCell className="hidden sm:table-cell text-sm">
                          {customer._count?.orders || 0}
                        </TableCell>
                        {/* Total spent across all orders */}
                        <TableCell className="text-sm font-medium">
                          {formatCurrency(totalSpent)}
                        </TableCell>
                        {/* Active/Inactive status badge */}
                        <TableCell>
                          <StatusBadge status={customer.isActive ? 'ACTIVE' : 'INACTIVE'} />
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
                              {/* View customer details dialog */}
                              <DropdownMenuItem onClick={() => setSelectedCustomer(customer)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              {/* Enable/Disable customer account */}
                              <DropdownMenuItem onClick={() => handleToggleDisable(customer)}>
                                {customer.isActive ? (
                                  <XCircle className="mr-2 h-4 w-4" />
                                ) : (
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                )}
                                {customer.isActive ? 'Disable' : 'Enable'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Customer Detail Dialog - shows detailed customer information */}
      <Dialog open={!!selectedCustomer} onOpenChange={(open) => !open && setSelectedCustomer(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4 py-2">
              {/* Customer avatar, name, and email header */}
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={selectedCustomer.image || undefined} />
                  <AvatarFallback className="text-lg bg-gray-100">
                    {selectedCustomer.name?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-lg">{selectedCustomer.name || 'Unnamed'}</p>
                  <p className="text-sm text-gray-500">{selectedCustomer.email}</p>
                </div>
              </div>
              <Separator />
              {/* Customer statistics in a 2x2 grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Total Orders</p>
                  <p className="font-semibold">{selectedCustomer._count?.orders || 0}</p>
                </div>
                <div>
                  <p className="text-gray-500">Total Spent</p>
                  <p className="font-semibold">
                    {formatCurrency(selectedCustomer.orders?.reduce((s, o) => s + o.totalAmount, 0) || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Status</p>
                  <StatusBadge status={selectedCustomer.isActive ? 'ACTIVE' : 'INACTIVE'} />
                </div>
                <div>
                  <p className="text-gray-500">Joined</p>
                  <p className="font-medium">{formatDate(selectedCustomer.createdAt)}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
