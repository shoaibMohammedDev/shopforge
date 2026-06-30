/**
 * @file admin-coupons.tsx
 * @description Coupon management page for the ShopForge admin panel. Provides
 * a table of all discount coupons with actions for toggling activation,
 * deleting coupons, and copying coupon codes. Includes a dialog form for
 * creating new coupons with support for percentage and fixed discount types.
 *
 * @keyfeatures
 * - Coupon list table with code, type, value, min purchase, usage, and status
 * - Copy coupon code to clipboard with toast feedback
 * - Activate/deactivate coupon toggle via dropdown menu
 * - Delete coupon via dropdown menu
 * - "Create Coupon" dialog form with comprehensive fields
 * - Support for PERCENTAGE and FIXED discount types
 * - Configurable min purchase, max discount, usage limit, and expiry date
 * - Loading skeletons and empty state handling
 */
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
import { toast } from "@/shared/hooks/use-toast"
import type { CouponDisplay } from "@/shared/types"

import { Button } from "@/shared/components/ui/button"
import { Card, CardContent } from "@/shared/components/ui/card"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"

import { formatCurrency, StatusBadge } from './admin-page'

// ============================================================================
// AdminCouponsContent
// ============================================================================

/**
 * @function AdminCouponsContent
 * @description Coupon management content for the admin panel. Displays a
 * table of all coupons with actions for activation toggle, deletion, and
 * code copying. Provides a dialog form for creating new coupons.
 *
 * @state
 * - `coupons` - array of CouponDisplay fetched from /api/admin?action=coupons
 * - `loading` - boolean for initial data fetch state
 * - `showCreateDialog` - boolean controlling the create coupon dialog visibility
 * - `saving` - boolean for the create coupon API call loading state
 * - Form fields: formCode, formType, formValue, formMinPurchase, formMaxDiscount,
 *   formUsageLimit, formExpiresAt - individual state for each form input
 *
 * @remarks
 * - Coupon codes are automatically uppercased on input
 * - PERCENTAGE type shows value as "X%", FIXED type shows value as currency
 * - Usage column displays usedCount/usageLimit or "∞" for unlimited
 * - New coupons default to active status with perUserLimit of 1
 */
export function AdminCouponsContent() {
  const [coupons, setCoupons] = useState<CouponDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [saving, setSaving] = useState(false)

  // Create coupon form state - individual fields for the create dialog
  const [formCode, setFormCode] = useState('')
  const [formType, setFormType] = useState('PERCENTAGE')
  const [formValue, setFormValue] = useState('')
  const [formMinPurchase, setFormMinPurchase] = useState('')
  const [formMaxDiscount, setFormMaxDiscount] = useState('')
  const [formUsageLimit, setFormUsageLimit] = useState('')
  const [formExpiresAt, setFormExpiresAt] = useState('')

  /**
   * Fetches all coupons from the admin API. Called on mount and after
   * mutations (create, toggle, delete) to refresh the coupon list.
   */
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

  // Fetch coupons on component mount
  useEffect(() => {
    fetchCoupons()
  }, [fetchCoupons])

  /**
   * Handles the create coupon form submission. Sends a POST request to create
   * a new coupon with the form field values. The code is uppercased, and
   * optional numeric fields are converted to appropriate types or null.
   * Resets the form and closes the dialog on success.
   */
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
            perUserLimit: 1, // Default per-user limit
            isActive: true, // New coupons are active by default
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

  /**
   * Deletes a coupon by ID. Sends a DELETE request to the admin API
   * and refreshes the coupon list on success.
   *
   * @param {string} id - The ID of the coupon to delete
   */
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

  /**
   * Toggles a coupon's active/inactive status. Sends a PUT request to
   * the admin API and refreshes the coupon list on success.
   *
   * @param {CouponDisplay} coupon - The coupon to activate or deactivate
   */
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

  /**
   * Resets all create coupon form fields to their default values.
   */
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
      {/* Header bar with coupon count and Create Coupon button */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-700">
          {coupons.length} coupon{coupons.length !== 1 ? 's' : ''}
        </h2>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Coupon
        </Button>
      </div>

      {/* Coupons Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            /* Loading state: skeleton placeholders */
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
                  {/* Min Purchase column - hidden on small screens */}
                  <TableHead className="hidden md:table-cell">Min Purchase</TableHead>
                  {/* Usage column - hidden on extra-small screens */}
                  <TableHead className="hidden sm:table-cell">Usage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.length === 0 ? (
                  /* Empty state: no coupons exist */
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                      No coupons found
                    </TableCell>
                  </TableRow>
                ) : (
                  coupons.map((coupon) => (
                    <TableRow key={coupon.id}>
                      {/* Coupon code with copy-to-clipboard button */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="rounded bg-gray-100 px-2 py-1 text-sm font-mono font-semibold">
                            {coupon.code}
                          </code>
                          {/* Copy code button - writes to clipboard and shows toast */}
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
                      {/* Discount type label */}
                      <TableCell className="text-sm">
                        {coupon.type === 'PERCENTAGE' ? 'Percentage' : 'Fixed'}
                      </TableCell>
                      {/* Value display: percentage or currency based on type */}
                      <TableCell className="text-sm font-medium">
                        {coupon.type === 'PERCENTAGE' ? `${coupon.value}%` : formatCurrency(coupon.value)}
                      </TableCell>
                      {/* Minimum purchase amount */}
                      <TableCell className="hidden md:table-cell text-sm text-gray-500">
                        {formatCurrency(coupon.minPurchase ?? 0)}
                      </TableCell>
                      {/* Usage: used count / limit or infinity symbol for unlimited */}
                      <TableCell className="hidden sm:table-cell text-sm text-gray-500">
                        {coupon.usedCount}/{coupon.usageLimit || '∞'}
                      </TableCell>
                      {/* Active/Inactive status badge */}
                      <TableCell>
                        <StatusBadge status={coupon.isActive ? 'ACTIVE' : 'INACTIVE'} />
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
                            {/* Toggle active/inactive status */}
                            <DropdownMenuItem onClick={() => handleToggleCoupon(coupon)}>
                              {coupon.isActive ? (
                                <XCircle className="mr-2 h-4 w-4" />
                              ) : (
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                              )}
                              {coupon.isActive ? 'Deactivate' : 'Activate'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {/* Delete coupon */}
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

      {/* Create Coupon Dialog - form with all coupon configuration fields */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Coupon</DialogTitle>
            <DialogDescription>Create a new discount coupon for your store.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Coupon code field - auto-uppercased on input */}
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
            {/* Type and Value - side by side */}
            <div className="grid grid-cols-2 gap-4">
              {/* Discount type selector */}
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
              {/* Discount value (percentage number or fixed amount) */}
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
            {/* Min Purchase and Max Discount - side by side */}
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
            {/* Usage Limit and Expiry Date - side by side */}
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
            {/* Submit button - disabled while saving or when required fields are empty */}
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
