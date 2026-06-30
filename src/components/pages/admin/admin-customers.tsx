'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Search,
  Eye,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { formatCurrency, formatDate, StatusBadge } from './admin-page'

// ============================================================================
// AdminCustomersContent
// ============================================================================

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

export function AdminCustomersContent() {
  const [customers, setCustomers] = useState<AdminCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<AdminCustomer | null>(null)

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

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

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

  const filteredCustomers = customers.filter(
    (c) =>
      (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
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
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden sm:table-cell">Orders</TableHead>
                  <TableHead>Total Spent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                      No customers found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => {
                    const totalSpent = customer.orders?.reduce((s, o) => s + o.totalAmount, 0) || 0
                    return (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={customer.image || undefined} />
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
                        <TableCell className="hidden sm:table-cell text-sm">
                          {customer._count?.orders || 0}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {formatCurrency(totalSpent)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={customer.isActive ? 'ACTIVE' : 'INACTIVE'} />
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelectedCustomer(customer)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
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

      {/* Customer Detail Dialog */}
      <Dialog open={!!selectedCustomer} onOpenChange={(open) => !open && setSelectedCustomer(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4 py-2">
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
