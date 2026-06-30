'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus,
  Trash2,
  MoreHorizontal,
  Loader2,
  CheckCircle2,
  XCircle,
  Copy,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import type { CouponDisplay } from '@/types'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { formatCurrency, StatusBadge } from './admin-page'

// ============================================================================
// AdminCouponsContent
// ============================================================================

export function AdminCouponsContent() {
  const [coupons, setCoupons] = useState<CouponDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formCode, setFormCode] = useState('')
  const [formType, setFormType] = useState('PERCENTAGE')
  const [formValue, setFormValue] = useState('')
  const [formMinPurchase, setFormMinPurchase] = useState('')
  const [formMaxDiscount, setFormMaxDiscount] = useState('')
  const [formUsageLimit, setFormUsageLimit] = useState('')
  const [formExpiresAt, setFormExpiresAt] = useState('')

  const fetchCoupons = useCallback(async () => {
    try {
      const res = await fetch('/api/admin?action=coupons')
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setCoupons(data)
    } catch (err) {
      console.error('Failed to fetch coupons:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCoupons()
  }, [fetchCoupons])

  async function handleCreateCoupon() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-coupon',
          data: {
            code: formCode.toUpperCase(),
            type: formType,
            value: parseFloat(formValue) || 0,
            minPurchase: parseFloat(formMinPurchase) || 0,
            maxDiscount: formMaxDiscount ? parseFloat(formMaxDiscount) : null,
            usageLimit: formUsageLimit ? parseInt(formUsageLimit) : null,
            perUserLimit: 1,
            isActive: true,
            startsAt: new Date().toISOString(),
            expiresAt: formExpiresAt ? new Date(formExpiresAt).toISOString() : null,
          },
        }),
      })
      if (!res.ok) throw new Error('Failed')
      toast({ title: 'Coupon created successfully' })
      setShowCreateDialog(false)
      resetCouponForm()
      fetchCoupons()
    } catch {
      toast({ title: 'Failed to create coupon', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteCoupon(id: string) {
    try {
      const res = await fetch(`/api/admin?action=delete-coupon&id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      toast({ title: 'Coupon deleted' })
      fetchCoupons()
    } catch {
      toast({ title: 'Failed to delete coupon', variant: 'destructive' })
    }
  }

  async function handleToggleCoupon(coupon: CouponDisplay) {
    try {
      const res = await fetch('/api/admin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-coupon',
          id: coupon.id,
          data: { isActive: !coupon.isActive },
        }),
      })
      if (!res.ok) throw new Error('Failed')
      toast({ title: `Coupon ${coupon.isActive ? 'deactivated' : 'activated'}` })
      fetchCoupons()
    } catch {
      toast({ title: 'Failed to update coupon', variant: 'destructive' })
    }
  }

  function resetCouponForm() {
    setFormCode('')
    setFormType('PERCENTAGE')
    setFormValue('')
    setFormMinPurchase('')
    setFormMaxDiscount('')
    setFormUsageLimit('')
    setFormExpiresAt('')
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-700">
          {coupons.length} coupon{coupons.length !== 1 ? 's' : ''}
        </h2>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Coupon
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead className="hidden md:table-cell">Min Purchase</TableHead>
                  <TableHead className="hidden sm:table-cell">Usage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                      No coupons found
                    </TableCell>
                  </TableRow>
                ) : (
                  coupons.map((coupon) => (
                    <TableRow key={coupon.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="rounded bg-gray-100 px-2 py-1 text-sm font-mono font-semibold">
                            {coupon.code}
                          </code>
                          <Button
                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={() => {
                                              navigator.clipboard.writeText(coupon.code)
                                              toast({ title: 'Code copied!' })
                                            }}
                                          >
                                            <Copy className="h-3 w-3" />
                                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {coupon.type === 'PERCENTAGE' ? 'Percentage' : 'Fixed'}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {coupon.type === 'PERCENTAGE' ? `${coupon.value}%` : formatCurrency(coupon.value)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-gray-500">
                        {formatCurrency(coupon.minPurchase)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-gray-500">
                        {coupon.usedCount}/{coupon.usageLimit || '∞'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={coupon.isActive ? 'ACTIVE' : 'INACTIVE'} />
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleToggleCoupon(coupon)}>
                              {coupon.isActive ? (
                                <XCircle className="mr-2 h-4 w-4" />
                              ) : (
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                              )}
                              {coupon.isActive ? 'Deactivate' : 'Activate'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => handleDeleteCoupon(coupon.id)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
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

      {/* Create Coupon Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Coupon</DialogTitle>
            <DialogDescription>Create a new discount coupon for your store.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="coupon-code">Coupon Code</Label>
              <Input
                id="coupon-code"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                placeholder="e.g. SUMMER2024"
                className="uppercase"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="coupon-type">Type</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger id="coupon-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                    <SelectItem value="FIXED">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="coupon-value">Value</Label>
                <Input
                  id="coupon-value"
                  type="number"
                  step="0.01"
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  placeholder={formType === 'PERCENTAGE' ? '10' : '5.00'}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="coupon-min">Min Purchase</Label>
                <Input
                  id="coupon-min"
                  type="number"
                  step="0.01"
                  value={formMinPurchase}
                  onChange={(e) => setFormMinPurchase(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="coupon-max">Max Discount</Label>
                <Input
                  id="coupon-max"
                  type="number"
                  step="0.01"
                  value={formMaxDiscount}
                  onChange={(e) => setFormMaxDiscount(e.target.value)}
                  placeholder="No limit"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="coupon-usage">Usage Limit</Label>
                <Input
                  id="coupon-usage"
                  type="number"
                  value={formUsageLimit}
                  onChange={(e) => setFormUsageLimit(e.target.value)}
                  placeholder="Unlimited"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="coupon-expires">Expires At</Label>
                <Input
                  id="coupon-expires"
                  type="date"
                  value={formExpiresAt}
                  onChange={(e) => setFormExpiresAt(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCoupon} disabled={saving || !formCode || !formValue}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Coupon
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
