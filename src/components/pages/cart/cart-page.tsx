'use client'

import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShoppingCart,
  Trash2,
  Minus,
  Plus,
  ArrowLeft,
  Tag,
  X,
  Truck,
  ShoppingBag,
  ChevronRight,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { useRouterStore } from '@/stores/router-store'
import { useCartStore, type LocalCartItem } from '@/stores/cart-store'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// ============================================================================
// Types
// ============================================================================

interface CouponResult {
  id: string
  code: string
  type: string
  value: number
  discount: number
}

// ============================================================================
// Helpers
// ============================================================================

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price)
}

const PRODUCT_GRADIENTS = [
  'from-rose-400 to-pink-500',
  'from-violet-400 to-purple-500',
  'from-cyan-400 to-blue-500',
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',
  'from-fuchsia-400 to-pink-500',
  'from-sky-400 to-indigo-400',
  'from-lime-400 to-green-500',
]

function getGradient(productId: string): string {
  let hash = 0
  for (let i = 0; i < productId.length; i++) {
    hash = productId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return PRODUCT_GRADIENTS[Math.abs(hash) % PRODUCT_GRADIENTS.length]
}

// ============================================================================
// Product Image Placeholder
// ============================================================================

function ProductImagePlaceholder({
  productId,
  name,
  className,
}: {
  productId: string
  name: string
  className?: string
}) {
  const gradient = getGradient(productId)
  return (
    <div
      className={`bg-gradient-to-br ${gradient} flex items-center justify-center ${className || ''}`}
    >
      <ShoppingBag className="h-6 w-6 text-white/70" />
      <span className="sr-only">{name}</span>
    </div>
  )
}

// ============================================================================
// Quantity Selector
// ============================================================================

function QuantitySelector({
  quantity,
  onIncrease,
  onDecrease,
}: {
  quantity: number
  onIncrease: () => void
  onDecrease: () => void
}) {
  return (
    <div className="flex items-center gap-0">
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 rounded-r-none"
        onClick={onDecrease}
        disabled={quantity <= 1}
        aria-label="Decrease quantity"
      >
        <Minus className="h-3 w-3" />
      </Button>
      <div className="flex h-8 w-10 items-center justify-center border-y border-input bg-background text-sm font-medium">
        {quantity}
      </div>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 rounded-l-none"
        onClick={onIncrease}
        disabled={quantity >= 99}
        aria-label="Increase quantity"
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  )
}

// ============================================================================
// Empty Cart State
// ============================================================================

function EmptyCart() {
  const navigate = useRouterStore((s) => s.navigate)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 px-4"
    >
      <div className="relative mb-8">
        <div className="h-32 w-32 rounded-full bg-muted flex items-center justify-center">
          <ShoppingCart className="h-14 w-14 text-muted-foreground" />
        </div>
        <div className="absolute -top-1 -right-1 h-8 w-8 rounded-full bg-background border-2 border-muted flex items-center justify-center">
          <span className="text-sm font-bold text-muted-foreground">0</span>
        </div>
      </div>
      <h2 className="text-2xl font-bold text-foreground mb-2">
        Your cart is empty
      </h2>
      <p className="text-muted-foreground text-center mb-8 max-w-md">
        Looks like you haven&apos;t added anything to your cart yet. Explore our
        products and find something you love!
      </p>
      <Button
        size="lg"
        className="gap-2"
        onClick={() => navigate('products')}
      >
        <ShoppingBag className="h-5 w-5" />
        Start Shopping
      </Button>
    </motion.div>
  )
}

// ============================================================================
// Cart Item Row (Desktop)
// ============================================================================

function CartItemRow({
  item,
  onUpdateQuantity,
  onRemove,
}: {
  item: LocalCartItem
  onUpdateQuantity: (productId: string, quantity: number, variantId?: string) => void
  onRemove: (productId: string, variantId?: string) => void
}) {
  return (
    <>
      <TableCell className="py-4">
        <div className="flex items-center gap-4">
          <ProductImagePlaceholder
            productId={item.productId}
            name={item.name}
            className="h-16 w-16 rounded-lg shrink-0"
          />
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate">{item.name}</p>
            {item.variantName && (
              <p className="text-sm text-muted-foreground">{item.variantName}</p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">SKU: {item.sku}</p>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-right py-4">
        <span className="font-medium">{formatPrice(item.price)}</span>
        {item.comparePrice && item.comparePrice > item.price && (
          <span className="ml-2 text-sm text-muted-foreground line-through">
            {formatPrice(item.comparePrice)}
          </span>
        )}
      </TableCell>
      <TableCell className="py-4">
        <div className="flex justify-center">
          <QuantitySelector
            quantity={item.quantity}
            onIncrease={() => onUpdateQuantity(item.productId, item.quantity + 1, item.variantId)}
            onDecrease={() => onUpdateQuantity(item.productId, item.quantity - 1, item.variantId)}
          />
        </div>
      </TableCell>
      <TableCell className="text-right py-4 font-medium">
        {formatPrice(item.price * item.quantity)}
      </TableCell>
      <TableCell className="py-4 text-right">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={() => onRemove(item.productId, item.variantId)}
          aria-label={`Remove ${item.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </>
  )
}

// ============================================================================
// Cart Item Card (Mobile)
// ============================================================================

function CartItemCard({
  item,
  onUpdateQuantity,
  onRemove,
}: {
  item: LocalCartItem
  onUpdateQuantity: (productId: string, quantity: number, variantId?: string) => void
  onRemove: (productId: string, variantId?: string) => void
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex gap-4 p-4 bg-card border rounded-lg"
    >
      <ProductImagePlaceholder
        productId={item.productId}
        name={item.name}
        className="h-20 w-20 rounded-lg shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate">{item.name}</p>
            {item.variantName && (
              <p className="text-sm text-muted-foreground">{item.variantName}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive -mt-1 -mr-2"
            onClick={() => onRemove(item.productId, item.variantId)}
            aria-label={`Remove ${item.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex items-center justify-between mt-3">
          <QuantitySelector
            quantity={item.quantity}
            onIncrease={() => onUpdateQuantity(item.productId, item.quantity + 1, item.variantId)}
            onDecrease={() => onUpdateQuantity(item.productId, item.quantity - 1, item.variantId)}
          />
          <div className="text-right">
            <p className="font-semibold">{formatPrice(item.price * item.quantity)}</p>
            {item.quantity > 1 && (
              <p className="text-xs text-muted-foreground">
                {formatPrice(item.price)} each
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================================
// Order Summary
// ============================================================================

function OrderSummary({
  couponResult,
  onApplyCoupon,
  onRemoveCoupon,
  couponLoading,
  couponError,
}: {
  couponResult: CouponResult | null
  onApplyCoupon: (code: string) => void
  onRemoveCoupon: () => void
  couponLoading: boolean
  couponError: string | null
}) {
  const navigate = useRouterStore((s) => s.navigate)
  const items = useCartStore((s) => s.items)
  const couponCode = useCartStore((s) => s.couponCode)
  const [couponInput, setCouponInput] = useState('')

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  }, [items])

  const discount = couponResult?.discount ?? 0
  const shipping = subtotal >= 50 ? 0 : 9.99
  const afterDiscount = subtotal - discount
  const tax = Math.round(afterDiscount * 0.08 * 100) / 100
  const total = Math.round((afterDiscount + shipping + tax) * 100) / 100

  const handleApplyCoupon = useCallback(() => {
    if (couponInput.trim()) {
      onApplyCoupon(couponInput.trim())
    }
  }, [couponInput, onApplyCoupon])

  return (
    <Card className="sticky top-24">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Item count */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            Items ({items.reduce((s, i) => s + i.quantity, 0)})
          </span>
          <span>{formatPrice(subtotal)}</span>
        </div>

        {/* Coupon section */}
        <div className="space-y-2">
          {couponCode && couponResult ? (
            <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-md px-3 py-2">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    {couponResult.code}
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    {couponResult.type === 'PERCENTAGE'
                      ? `${couponResult.value}% off`
                      : `${formatPrice(couponResult.value)} off`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  -{formatPrice(discount)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-emerald-600 dark:text-emerald-400 hover:text-destructive"
                  onClick={onRemoveCoupon}
                  aria-label="Remove coupon"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Coupon code"
                    className="pl-9 h-9"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleApplyCoupon()
                    }}
                    disabled={couponLoading}
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-4"
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || couponInput.trim().length === 0}
                >
                  {couponLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Apply'
                  )}
                </Button>
              </div>
              {couponError && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {couponError}
                </p>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* Subtotal */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatPrice(subtotal)}</span>
        </div>

        {/* Discount */}
        {discount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Discount</span>
            <span className="text-emerald-600 dark:text-emerald-400">
              -{formatPrice(discount)}
            </span>
          </div>
        )}

        {/* Shipping */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Shipping</span>
          {shipping === 0 ? (
            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 font-normal">
              Free
            </Badge>
          ) : (
            <span>{formatPrice(shipping)}</span>
          )}
        </div>
        {shipping > 0 && (
          <p className="text-xs text-muted-foreground">
            <Truck className="inline h-3 w-3 mr-1" />
            Free shipping on orders over $50.00
          </p>
        )}

        {/* Tax */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Tax (8%)</span>
          <span>{formatPrice(tax)}</span>
        </div>

        <Separator />

        {/* Total */}
        <div className="flex justify-between items-baseline">
          <span className="font-semibold text-foreground">Total</span>
          <span className="text-xl font-bold">{formatPrice(total)}</span>
        </div>

        {/* Checkout button */}
        <Button
          className="w-full gap-2 h-11"
          size="lg"
          onClick={() => navigate('checkout')}
        >
          Proceed to Checkout
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Continue shopping */}
        <Button
          variant="ghost"
          className="w-full gap-2"
          onClick={() => navigate('products')}
        >
          <ArrowLeft className="h-4 w-4" />
          Continue Shopping
        </Button>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Main Cart Page
// ============================================================================

export default function CartPage() {
  const items = useCartStore((s) => s.items)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const removeItem = useCartStore((s) => s.removeItem)
  const applyCoupon = useCartStore((s) => s.applyCoupon)
  const removeCoupon = useCartStore((s) => s.removeCoupon)
  const couponCode = useCartStore((s) => s.couponCode)
  const navigate = useRouterStore((s) => s.navigate)

  const [couponResult, setCouponResult] = useState<CouponResult | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState<string | null>(null)

  const handleApplyCoupon = useCallback(
    async (code: string) => {
      setCouponLoading(true)
      setCouponError(null)

      const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)

      try {
        const res = await fetch(
          `/api/coupons?code=${encodeURIComponent(code)}&subtotal=${subtotal}`
        )
        const data = await res.json()

        if (!res.ok) {
          setCouponError(data.error || 'Invalid coupon code')
          return
        }

        setCouponResult(data)
        applyCoupon(code)
      } catch {
        setCouponError('Failed to validate coupon. Please try again.')
      } finally {
        setCouponLoading(false)
      }
    },
    [items, applyCoupon]
  )

  const handleRemoveCoupon = useCallback(() => {
    removeCoupon()
    setCouponResult(null)
    setCouponError(null)
  }, [removeCoupon])

  if (items.length === 0) {
    return <EmptyCart />
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Shopping Cart</h1>
            <p className="text-muted-foreground mt-1">
              {items.length} {items.length === 1 ? 'item' : 'items'} in your cart
            </p>
          </div>
          <Button
            variant="ghost"
            className="gap-2 hidden sm:flex"
            onClick={() => navigate('products')}
          >
            <ArrowLeft className="h-4 w-4" />
            Continue Shopping
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          {/* Desktop Table */}
          <div className="hidden md:block">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Product</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-center w-[140px]">Quantity</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-[50px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence mode="popLayout">
                      {items.map((item) => (
                        <motion.tr
                          key={`${item.productId}-${item.variantId || 'default'}`}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0, height: 0 }}
                          className="border-b transition-colors hover:bg-muted/50"
                        >
                          <CartItemRow
                            item={item}
                            onUpdateQuantity={updateQuantity}
                            onRemove={removeItem}
                          />
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            <AnimatePresence mode="popLayout">
              {items.map((item) => (
                <CartItemCard
                  key={`mobile-${item.productId}-${item.variantId || 'default'}`}
                  item={item}
                  onUpdateQuantity={updateQuantity}
                  onRemove={removeItem}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Mobile continue shopping */}
          <div className="md:hidden mt-4">
            <Button
              variant="ghost"
              className="gap-2 w-full"
              onClick={() => navigate('products')}
            >
              <ArrowLeft className="h-4 w-4" />
              Continue Shopping
            </Button>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <OrderSummary
            couponResult={couponResult}
            onApplyCoupon={handleApplyCoupon}
            onRemoveCoupon={handleRemoveCoupon}
            couponLoading={couponLoading}
            couponError={couponError}
          />
        </div>
      </div>
    </div>
  )
}
