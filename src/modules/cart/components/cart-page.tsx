/**
 * @file cart-page.tsx
 * @description Shopping cart page component for the ShopForge e-commerce application.
 * Provides a full-featured cart experience with item management, coupon codes,
 * and an order summary sidebar with real-time price calculations.
 *
 * @keyfeatures
 * - Desktop table view and mobile card view for cart items (responsive)
 * - Quantity controls with increase/decrease buttons (min 1, max 99)
 * - Coupon code validation via API with apply/remove functionality
 * - Real-time price breakdown: subtotal, discount, shipping, tax, total
 * - Free shipping threshold indicator ($50+ orders ship free)
 * - Animated item removal and layout transitions via Framer Motion
 * - Empty cart state with call-to-action to continue shopping
 */

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
import { useRouterStore } from "@/shared/stores/router-store"
import { useCartStore, type LocalCartItem } from "@/modules/cart/stores/cart-store"
import { Button } from "@/shared/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"
import { Input } from "@/shared/components/ui/input"
import { Separator } from "@/shared/components/ui/separator"
import { Badge } from "@/shared/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"

// ============================================================================
// Types
// ============================================================================

/**
 * Represents the result returned from the coupon validation API.
 * Contains the coupon details and the calculated discount amount.
 *
 * @property id       - Unique coupon identifier from the database
 * @property code     - The coupon code string (e.g., "SAVE10")
 * @property type     - Discount type: "PERCENTAGE" or "FIXED"
 * @property value    - The discount value (percentage number or fixed dollar amount)
 * @property discount - The calculated discount amount in dollars applied to the current cart
 */
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

/**
 * Formats a numeric price value into a USD currency string.
 * Uses the Intl.NumberFormat API for locale-aware formatting.
 *
 * @param price - The numeric price value to format
 * @returns Formatted currency string (e.g., "$19.99")
 */
function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price)
}

/**
 * Array of Tailwind CSS gradient class pairs used as product image placeholders.
 * Each entry provides a unique color gradient to visually differentiate products
 * when actual product images are not available.
 */
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

/**
 * Generates a deterministic gradient class string based on a product ID.
 * Uses a simple hash function to consistently map the same product ID
 * to the same gradient, ensuring visual consistency across re-renders.
 *
 * @param productId - The unique product identifier to hash
 * @returns A Tailwind CSS gradient class string (e.g., "from-rose-400 to-pink-500")
 */
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

/**
 * ProductImagePlaceholder component renders a colored gradient square with a
 * shopping bag icon as a visual stand-in when no actual product image is available.
 * The gradient color is deterministically chosen based on the product ID.
 *
 * @param props
 * @param props.productId - Product ID used to select the gradient color
 * @param props.name      - Product name used for screen reader accessibility
 * @param props.className - Optional additional CSS classes for sizing/layout
 */
function ProductImagePlaceholder({
  productId,
  name,
  className,
}: {
  productId: string
  name: string
  className?: string
}) {
  // Select a consistent gradient based on the product ID hash
  const gradient = getGradient(productId)
  return (
    <div
      className={`bg-gradient-to-br ${gradient} flex items-center justify-center ${className || ''}`}
    >
      {/* Decorative shopping bag icon centered in the gradient */}
      <ShoppingBag className="h-6 w-6 text-white/70" />
      {/* Screen reader-only text for accessibility */}
      <span className="sr-only">{name}</span>
    </div>
  )
}

// ============================================================================
// Quantity Selector
// ============================================================================

/**
 * QuantitySelector provides a compact inline control for adjusting item quantity.
 * Consists of a minus button, a numeric display, and a plus button arranged horizontally.
 * The minus button is disabled when quantity is 1 (minimum) and the plus button
 * is disabled when quantity reaches 99 (maximum).
 *
 * @param props
 * @param props.quantity    - Current quantity value to display
 * @param props.onIncrease - Callback fired when the plus button is clicked
 * @param props.onDecrease - Callback fired when the minus button is clicked
 */
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
      {/* Decrease button — disabled at minimum quantity of 1 */}
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
      {/* Numeric quantity display centered between the two buttons */}
      <div className="flex h-8 w-10 items-center justify-center border-y border-input bg-background text-sm font-medium">
        {quantity}
      </div>
      {/* Increase button — disabled at maximum quantity of 99 */}
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

/**
 * EmptyCart renders the empty-state view when the shopping cart has no items.
 * Displays a large cart icon with a "0" badge, a helpful message, and a
 * call-to-action button that navigates the user to the products page.
 *
 * @state Uses useRouterStore to navigate to the products page
 */
function EmptyCart() {
  const navigate = useRouterStore((s) => s.navigate)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 px-4"
    >
      {/* Cart icon with zero-count badge */}
      <div className="relative mb-8">
        <div className="h-32 w-32 rounded-full bg-muted flex items-center justify-center">
          <ShoppingCart className="h-14 w-14 text-muted-foreground" />
        </div>
        {/* Badge showing zero items in the cart */}
        <div className="absolute -top-1 -right-1 h-8 w-8 rounded-full bg-background border-2 border-muted flex items-center justify-center">
          <span className="text-sm font-bold text-muted-foreground">0</span>
        </div>
      </div>
      {/* Empty cart messaging */}
      <h2 className="text-2xl font-bold text-foreground mb-2">
        Your cart is empty
      </h2>
      <p className="text-muted-foreground text-center mb-8 max-w-md">
        Looks like you haven&apos;t added anything to your cart yet. Explore our
        products and find something you love!
      </p>
      {/* Primary CTA — navigate to product listing */}
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

/**
 * CartItemRow renders a single cart item as a table row for the desktop view.
 * Displays the product image placeholder, name, variant, SKU, unit price,
 * quantity selector, line total, and a remove button.
 *
 * @param props
 * @param props.item             - The cart item data to render
 * @param props.onUpdateQuantity - Callback to update item quantity (productId, newQuantity, variantId?)
 * @param props.onRemove         - Callback to remove the item from the cart (productId, variantId?)
 */
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
      {/* Product info cell — image, name, variant, and SKU */}
      <TableCell className="py-4">
        <div className="flex items-center gap-4">
          <ProductImagePlaceholder
            productId={item.productId}
            name={item.name}
            className="h-16 w-16 rounded-lg shrink-0"
          />
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate">{item.name}</p>
            {/* Conditionally render variant name if the item has a selected variant */}
            {item.variantName && (
              <p className="text-sm text-muted-foreground">{item.variantName}</p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">SKU: {item.sku}</p>
          </div>
        </div>
      </TableCell>
      {/* Unit price cell — shows sale price and optional strikethrough compare-at price */}
      <TableCell className="text-right py-4">
        <span className="font-medium">{formatPrice(item.price)}</span>
        {/* Show the original compare-at price if it's higher than the sale price */}
        {item.comparePrice && item.comparePrice > item.price && (
          <span className="ml-2 text-sm text-muted-foreground line-through">
            {formatPrice(item.comparePrice)}
          </span>
        )}
      </TableCell>
      {/* Quantity selector cell — centered within the column */}
      <TableCell className="py-4">
        <div className="flex justify-center">
          <QuantitySelector
            quantity={item.quantity}
            onIncrease={() => onUpdateQuantity(item.productId, item.quantity + 1, item.variantId)}
            onDecrease={() => onUpdateQuantity(item.productId, item.quantity - 1, item.variantId)}
          />
        </div>
      </TableCell>
      {/* Line total cell — price multiplied by quantity */}
      <TableCell className="text-right py-4 font-medium">
        {formatPrice(item.price * item.quantity)}
      </TableCell>
      {/* Remove button cell — deletes the item from the cart */}
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

/**
 * CartItemCard renders a single cart item as a card layout for the mobile view.
 * Uses Framer Motion for smooth enter/exit animations when items are added or removed.
 * Layout is stacked vertically with product image, details, quantity controls, and price.
 *
 * @param props
 * @param props.item             - The cart item data to render
 * @param props.onUpdateQuantity - Callback to update item quantity (productId, newQuantity, variantId?)
 * @param props.onRemove         - Callback to remove the item from the cart (productId, variantId?)
 */
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
      {/* Product image placeholder */}
      <ProductImagePlaceholder
        productId={item.productId}
        name={item.name}
        className="h-20 w-20 rounded-lg shrink-0"
      />
      {/* Item details and controls */}
      <div className="flex-1 min-w-0">
        {/* Top row: name + remove button */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate">{item.name}</p>
            {/* Conditionally render variant name */}
            {item.variantName && (
              <p className="text-sm text-muted-foreground">{item.variantName}</p>
            )}
          </div>
          {/* Remove item button */}
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
        {/* Bottom row: quantity selector and line total */}
        <div className="flex items-center justify-between mt-3">
          <QuantitySelector
            quantity={item.quantity}
            onIncrease={() => onUpdateQuantity(item.productId, item.quantity + 1, item.variantId)}
            onDecrease={() => onUpdateQuantity(item.productId, item.quantity - 1, item.variantId)}
          />
          <div className="text-right">
            <p className="font-semibold">{formatPrice(item.price * item.quantity)}</p>
            {/* Show per-unit price when quantity is more than 1 */}
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

/**
 * OrderSummary renders the sidebar card that displays the cart's price breakdown
 * and coupon functionality. It calculates and displays subtotal, discount,
 * shipping, tax, and total in real-time as the cart changes.
 *
 * Features:
 * - Coupon code input with validation via API
 * - Applied coupon display with remove option
 * - Free shipping indicator for orders $50+
 * - 8% tax calculation
 * - Navigation buttons to checkout and continue shopping
 *
 * @param props
 * @param props.couponResult   - The validated coupon result, or null if none applied
 * @param props.onApplyCoupon  - Callback to validate and apply a coupon code
 * @param props.onRemoveCoupon - Callback to remove the currently applied coupon
 * @param props.couponLoading  - Whether a coupon validation request is in progress
 * @param props.couponError    - Error message from the last coupon validation attempt, or null
 *
 * @state couponInput - Local state for the coupon code text input
 */
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
  /** Local input state for the coupon code text field */
  const [couponInput, setCouponInput] = useState('')

  /** Calculate subtotal from all cart items (price × quantity) */
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  }, [items])

  // Price breakdown calculations
  const discount = couponResult?.discount ?? 0                          // Discount from applied coupon
  const shipping = subtotal >= 50 ? 0 : 9.99                           // Free shipping threshold: $50
  const afterDiscount = subtotal - discount                             // Subtotal minus coupon discount
  const tax = Math.round(afterDiscount * 0.08 * 100) / 100             // 8% tax on discounted subtotal
  const total = Math.round((afterDiscount + shipping + tax) * 100) / 100 // Final total

  /**
   * Handles applying the coupon code from the input field.
   * Trims whitespace before passing to the parent's onApplyCoupon callback.
   * Memoized to prevent unnecessary re-renders.
   */
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
        {/* Item count and subtotal */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            Items ({items.reduce((s, i) => s + i.quantity, 0)})
          </span>
          <span>{formatPrice(subtotal)}</span>
        </div>

        {/* Coupon section — displays either the applied coupon or the input form */}
        <div className="space-y-2">
          {couponCode && couponResult ? (
            /* Applied coupon badge — shows code, discount type, amount, and remove button */
            <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-md px-3 py-2">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    {couponResult.code}
                  </p>
                  {/* Display discount type: percentage or fixed amount */}
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    {couponResult.type === 'PERCENTAGE'
                      ? `${couponResult.value}% off`
                      : `${formatPrice(couponResult.value)} off`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Calculated discount amount in dollars */}
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  -{formatPrice(discount)}
                </span>
                {/* Remove coupon button */}
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
            /* Coupon code input form — text field with apply button */
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Coupon code"
                    className="pl-9 h-9"
                    value={couponInput}
                    /* Auto-uppercase the coupon input for better UX */
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    /* Allow submitting via Enter key */
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
                  {/* Show spinner while validating, otherwise "Apply" text */}
                  {couponLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Apply'
                  )}
                </Button>
              </div>
              {/* Display coupon validation error if present */}
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

        {/* Subtotal line */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatPrice(subtotal)}</span>
        </div>

        {/* Discount line — only shown when a coupon is applied */}
        {discount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Discount</span>
            <span className="text-emerald-600 dark:text-emerald-400">
              -{formatPrice(discount)}
            </span>
          </div>
        )}

        {/* Shipping line — shows "Free" badge or dollar amount */}
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
        {/* Free shipping threshold reminder — shown only when shipping is not free */}
        {shipping > 0 && (
          <p className="text-xs text-muted-foreground">
            <Truck className="inline h-3 w-3 mr-1" />
            Free shipping on orders over $50.00
          </p>
        )}

        {/* Tax line — fixed 8% rate */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Tax (8%)</span>
          <span>{formatPrice(tax)}</span>
        </div>

        <Separator />

        {/* Total line — the final amount the customer will pay */}
        <div className="flex justify-between items-baseline">
          <span className="font-semibold text-foreground">Total</span>
          <span className="text-xl font-bold">{formatPrice(total)}</span>
        </div>

        {/* Primary CTA — navigate to the checkout page */}
        <Button
          className="w-full gap-2 h-11"
          size="lg"
          onClick={() => navigate('checkout')}
        >
          Proceed to Checkout
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Secondary CTA — navigate back to the products listing */}
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

/**
 * CartPage is the main shopping cart page component for ShopForge.
 * It orchestrates the full cart experience including item display,
 * quantity management, coupon validation, and order summary.
 *
 * The component uses a responsive layout:
 * - Desktop (lg+): 2/3 width cart items table + 1/3 order summary sidebar
 * - Mobile: Stacked card items + full-width order summary
 *
 * @state couponResult  - Validated coupon data from the API, or null
 * @state couponLoading - Loading state during coupon validation API call
 * @state couponError   - Error message from coupon validation, or null
 *
 * @store items          - Cart items from the global cart store (Zustand)
 * @store updateQuantity - Action to change an item's quantity
 * @store removeItem     - Action to remove an item from the cart
 * @store applyCoupon    - Action to store the applied coupon code
 * @store removeCoupon   - Action to clear the applied coupon code
 * @store couponCode     - Currently applied coupon code string
 */
export default function CartPage() {
  const items = useCartStore((s) => s.items)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const removeItem = useCartStore((s) => s.removeItem)
  const applyCoupon = useCartStore((s) => s.applyCoupon)
  const removeCoupon = useCartStore((s) => s.removeCoupon)
  const couponCode = useCartStore((s) => s.couponCode)
  const navigate = useRouterStore((s) => s.navigate)

  /** Validated coupon result returned from the API after successful validation */
  const [couponResult, setCouponResult] = useState<CouponResult | null>(null)
  /** Whether a coupon validation request is currently in flight */
  const [couponLoading, setCouponLoading] = useState(false)
  /** Error message from the last failed coupon validation attempt */
  const [couponError, setCouponError] = useState<string | null>(null)

  /**
   * Handles coupon code validation by calling the coupons API endpoint.
   * Sends the coupon code and current subtotal to calculate the discount.
   * On success, stores the coupon result locally and persists the code in the cart store.
   * On failure, displays an appropriate error message.
   *
   * @param code - The coupon code string to validate
   */
  const handleApplyCoupon = useCallback(
    async (code: string) => {
      // Set loading state and clear any previous errors
      setCouponLoading(true)
      setCouponError(null)

      // Calculate current subtotal for the API to determine discount
      const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)

      try {
        // Call the coupon validation API with code and subtotal
        const res = await fetch(
          `/api/coupons?code=${encodeURIComponent(code)}&subtotal=${subtotal}`
        )
        const data = await res.json()

        if (!res.ok) {
          // API returned an error — display the error message
          setCouponError(data.error || 'Invalid coupon code')
          return
        }

        // Coupon is valid — store the result and persist the code
        setCouponResult(data)
        applyCoupon(code)
      } catch {
        // Network or unexpected error
        setCouponError('Failed to validate coupon. Please try again.')
      } finally {
        // Always clear loading state
        setCouponLoading(false)
      }
    },
    [items, applyCoupon]
  )

  /**
   * Handles removing the currently applied coupon.
   * Clears the coupon from both local state and the global cart store.
   */
  const handleRemoveCoupon = useCallback(() => {
    removeCoupon()
    setCouponResult(null)
    setCouponError(null)
  }, [removeCoupon])

  // Render the empty cart state if there are no items
  if (items.length === 0) {
    return <EmptyCart />
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Page header with title, item count, and continue shopping link */}
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
          {/* Desktop-only continue shopping button */}
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

      {/* Main content grid: cart items (2/3) + order summary sidebar (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart items section — spans 2 columns on large screens */}
        <div className="lg:col-span-2">
          {/* Desktop table view — hidden on mobile */}
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
                    {/* AnimatePresence handles exit animations when items are removed */}
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

          {/* Mobile card view — hidden on desktop, uses card layout instead of table */}
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

          {/* Mobile-only continue shopping button — full width */}
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

        {/* Order summary sidebar — spans 1 column on large screens */}
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
