/**
 * @file checkout-page.tsx
 * @description Multi-step checkout page component for the ShopForge e-commerce application.
 * Guides the customer through shipping address entry, payment details, and order confirmation
 * with a stepper UI, form validation, and a celebratory confetti effect on successful orders.
 *
 * @keyfeatures
 * - Three-step checkout flow: Shipping → Payment → Confirmation
 * - Visual stepper with completed/current/pending state indicators
 * - Shipping address form with Zod schema validation (name, address, city, state, zip, phone)
 * - Payment form with card number formatting, expiry auto-slash, and CVC masking
 * - Standard vs. Express shipping method selection with dynamic pricing
 * - Order summary sidebar (full on desktop, collapsible on mobile)
 * - Coupon code re-validation on mount (carried over from cart page)
 * - Order creation via POST /api/orders with full cart and address payload
 * - Confetti animation and order confirmation display on success
 * - Redirect guards: empty cart → cart page, unauthenticated → login page
 */

'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Truck,
  CreditCard,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Loader2,
  ShoppingBag,
  Package,
  ArrowLeft,
  Lock,
} from 'lucide-react'
import { useRouterStore } from "@/shared/stores/router-store"
import { useCartStore } from "@/modules/cart/stores/cart-store"
import { useAuthStore } from "@/modules/auth/stores/auth-store"
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
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group"
import { Label } from "@/shared/components/ui/label"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/components/ui/collapsible"

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

/**
 * Union type representing the three steps in the checkout flow.
 * - 'shipping'     — Collect shipping address and method
 * - 'payment'      — Collect payment card details and place order
 * - 'confirmation' — Display order confirmation after successful placement
 */
type CheckoutStep = 'shipping' | 'payment' | 'confirmation'

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
// Zod Schema
// ============================================================================

/**
 * Zod validation schema for the shipping address form.
 * Validates all required address fields with appropriate rules:
 * - Names and address fields require at least 1 character
 * - Postal code must match US ZIP format (5-digit or ZIP+4)
 * - Phone number must match common international formats
 */
const shippingSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  street1: z.string().min(1, 'Street address is required'),
  street2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  postalCode: z
    .string()
    .min(1, 'Postal code is required')
    .regex(/^[0-9]{5}(-[0-9]{4})?$/, 'Enter a valid postal code'),
  country: z.string().min(1, 'Country is required'),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(/^[+]?[0-9\s\-()]{7,20}$/, 'Enter a valid phone number'),
})

/** Inferred TypeScript type from the shipping Zod schema */
type ShippingFormValues = z.infer<typeof shippingSchema>

/**
 * Zod validation schema for the payment card form.
 * Validates card number (13-19 digits with spaces), expiry (MM/YY),
 * and CVC (3-4 digits) with appropriate regex patterns.
 */
const paymentSchema = z.object({
  cardNumber: z
    .string()
    .min(1, 'Card number is required')
    .regex(/^[0-9\s]{13,19}$/, 'Enter a valid card number'),
  expiry: z
    .string()
    .min(1, 'Expiry date is required')
    .regex(/^(0[1-9]|1[0-2])\/[0-9]{2}$/, 'Use format MM/YY'),
  cvc: z
    .string()
    .min(1, 'CVC is required')
    .regex(/^[0-9]{3,4}$/, 'Enter a valid CVC'),
})

/** Inferred TypeScript type from the payment Zod schema */
type PaymentFormValues = z.infer<typeof paymentSchema>

// ============================================================================
// Confetti Effect
// ============================================================================

/**
 * ConfettiEffect renders a full-screen canvas-based confetti animation
 * that plays once when the order is successfully placed. Particles are
 * launched from the center of the screen with random velocities, colors,
 * and rotation speeds, then fade out over time.
 *
 * The animation automatically cleans up via requestAnimationFrame cancellation
 * when the component unmounts.
 */
function ConfettiEffect() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas to full viewport size
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    // Festive color palette for confetti particles
    const colors = [
      '#f59e0b', '#ef4444', '#10b981', '#8b5cf6',
      '#ec4899', '#06b6d4', '#f97316', '#14b8a6',
    ]

    // Particle type definition for the confetti system
    const particles: Array<{
      x: number
      y: number
      vx: number
      vy: number
      color: string
      size: number
      rotation: number
      rotationSpeed: number
      opacity: number
    }> = []

    // Initialize 120 confetti particles with random properties
    for (let i = 0; i < 120; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 200,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 15,
        vy: -Math.random() * 18 - 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 3,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        opacity: 1,
      })
    }

    let animationId: number

    /** Animation loop — updates and renders each particle every frame */
    function animate() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      let alive = false
      particles.forEach((p) => {
        // Apply physics: velocity, gravity, rotation, and fade
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.3       // Gravity pulls particles downward
        p.rotation += p.rotationSpeed
        p.opacity -= 0.008 // Gradually fade out

        // Only render particles that are still visible
        if (p.opacity > 0) {
          alive = true
          ctx.save()
          ctx.translate(p.x, p.y)
          ctx.rotate((p.rotation * Math.PI) / 180)
          ctx.globalAlpha = p.opacity
          ctx.fillStyle = p.color
          // Draw rectangular confetti piece
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
          ctx.restore()
        }
      })

      if (alive) {
        animationId = requestAnimationFrame(animate)
      } else {
        // All particles faded out — clear the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }

    // Start the animation loop
    animate()

    // Cleanup: cancel animation frame on unmount
    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      aria-hidden="true"
    />
  )
}

// ============================================================================
// Stepper
// ============================================================================

/**
 * CheckoutStepper renders a horizontal step indicator showing the current
 * position in the checkout flow. Each step displays an icon and label,
 * with visual styling for completed (green check), current (primary color),
 * and pending (muted) states. Steps are connected by horizontal lines
 * that fill with color as steps are completed.
 *
 * @param props
 * @param props.currentStep - The active checkout step ('shipping' | 'payment' | 'confirmation')
 */
function CheckoutStepper({ currentStep }: { currentStep: CheckoutStep }) {
  // Define the three checkout steps with their icons and labels
  const steps = [
    { key: 'shipping' as const, label: 'Shipping', icon: Truck },
    { key: 'payment' as const, label: 'Payment', icon: CreditCard },
    { key: 'confirmation' as const, label: 'Confirmation', icon: CheckCircle2 },
  ]

  // Determine the index of the current step for progress calculation
  const currentIndex = steps.findIndex((s) => s.key === currentStep)

  return (
    <div className="flex items-center justify-center gap-0 w-full max-w-lg mx-auto mb-8">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex  // Step was already finished
        const isCurrent = index === currentIndex   // Step is currently active
        const Icon = step.icon

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-initial">
            {/* Step circle with icon — changes appearance based on state */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  isCompleted
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : isCurrent
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'bg-background border-muted-foreground/30 text-muted-foreground'
                }`}
              >
                {/* Show checkmark for completed steps, icon for current/pending */}
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>
              {/* Step label — color changes based on state */}
              <span
                className={`text-xs font-medium whitespace-nowrap ${
                  isCompleted
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : isCurrent
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                }`}
              >
                {step.label}
              </span>
            </div>
            {/* Connecting line between steps — fills green when the preceding step is complete */}
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-3 mt-[-1.25rem] transition-colors duration-300 ${
                  index < currentIndex
                    ? 'bg-emerald-500'
                    : 'bg-muted-foreground/20'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ============================================================================
// Order Summary Component
// ============================================================================

/**
 * CheckoutOrderSummary renders a compact order summary showing all cart items,
 * price breakdown (subtotal, discount, shipping, tax, total), and optionally
 * wraps the content in a collapsible container for mobile views.
 *
 * @param props
 * @param props.couponResult    - Validated coupon result, or null if none applied
 * @param props.shippingMethod  - Selected shipping method ('standard' or 'express')
 * @param props.collapsible     - If true, wraps content in a Collapsible component (for mobile)
 *
 * @state isOpen - Controls the collapsible open/close state (mobile only)
 */
function CheckoutOrderSummary({
  couponResult,
  shippingMethod,
  collapsible = false,
}: {
  couponResult: CouponResult | null
  shippingMethod: string
  collapsible?: boolean
}) {
  const items = useCartStore((s) => s.items)
  /** Controls the collapsible section open state on mobile */
  const [isOpen, setIsOpen] = useState(false)

  /** Calculate subtotal from all cart items (price × quantity) */
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  }, [items])

  // Price breakdown calculations
  const discount = couponResult?.discount ?? 0                          // Discount from applied coupon
  const shipping =                                                      // Express: $9.99, Standard: free if $50+, else $9.99
    shippingMethod === 'express'
      ? 9.99
      : subtotal >= 50
        ? 0
        : 9.99
  const afterDiscount = subtotal - discount                             // Subtotal minus coupon discount
  const tax = Math.round(afterDiscount * 0.08 * 100) / 100             // 8% tax on discounted subtotal
  const total = Math.round((afterDiscount + shipping + tax) * 100) / 100 // Final total

  /** The summary content — reused in both collapsible and non-collapsible modes */
  const content = (
    <div className="space-y-3">
      {/* Cart items list — scrollable if many items */}
      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {items.map((item) => (
          <div
            key={`${item.productId}-${item.variantId || 'default'}`}
            className="flex items-center gap-3"
          >
            {/* Product image placeholder with gradient */}
            <div
              className={`h-10 w-10 rounded-md bg-gradient-to-br ${getGradient(item.productId)} flex items-center justify-center shrink-0`}
            >
              <ShoppingBag className="h-4 w-4 text-white/70" />
            </div>
            {/* Product name and variant */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.name}</p>
              {item.variantName && (
                <p className="text-xs text-muted-foreground">{item.variantName}</p>
              )}
            </div>
            {/* Line total and quantity indicator */}
            <div className="text-right shrink-0">
              <p className="text-sm font-medium">
                {formatPrice(item.price * item.quantity)}
              </p>
              {item.quantity > 1 && (
                <p className="text-xs text-muted-foreground">x{item.quantity}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <Separator />

      {/* Price breakdown section */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        {/* Discount line — only shown when a coupon discount exists */}
        {discount > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Discount</span>
            <span className="text-emerald-600 dark:text-emerald-400">
              -{formatPrice(discount)}
            </span>
          </div>
        )}
        {/* Shipping line — shows "Free" badge or dollar amount */}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Shipping</span>
          {shipping === 0 ? (
            <Badge
              variant="secondary"
              className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 font-normal"
            >
              Free
            </Badge>
          ) : (
            <span>{formatPrice(shipping)}</span>
          )}
        </div>
        {/* Tax line — fixed 8% rate */}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tax (8%)</span>
          <span>{formatPrice(tax)}</span>
        </div>
      </div>

      <Separator />

      {/* Final total */}
      <div className="flex justify-between items-baseline">
        <span className="font-semibold">Total</span>
        <span className="text-lg font-bold">{formatPrice(total)}</span>
      </div>
    </div>
  )

  // Render in collapsible mode for mobile, or standard div for desktop
  if (collapsible) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-3">
          <span className="font-semibold text-sm">
            Order Summary ({items.reduce((s, i) => s + i.quantity, 0)} items)
          </span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>{content}</CollapsibleContent>
      </Collapsible>
    )
  }

  return <div className="space-y-4">{content}</div>
}

// ============================================================================
// Step 1: Shipping
// ============================================================================

/**
 * ShippingStep renders the first checkout step containing the shipping address
 * form and shipping method selection. The form is validated using Zod schema
 * and react-hook-form. It includes a sidebar with the order summary.
 *
 * @param props
 * @param props.onSubmit               - Callback fired when the shipping form is submitted with valid data
 * @param props.shippingMethod         - Currently selected shipping method ('standard' or 'express')
 * @param props.onShippingMethodChange - Callback to update the selected shipping method
 * @param props.couponResult           - Validated coupon result for price calculation, or null
 */
function ShippingStep({
  onSubmit,
  shippingMethod,
  onShippingMethodChange,
  couponResult,
}: {
  onSubmit: (data: ShippingFormValues) => void
  shippingMethod: string
  onShippingMethodChange: (method: string) => void
  couponResult: CouponResult | null
}) {
  const navigate = useRouterStore((s) => s.navigate)
  const subtotal = useCartStore((s) => s.getSubtotal())

  // Initialize the shipping form with Zod resolver and default values
  const form = useForm<ShippingFormValues>({
    resolver: zodResolver(shippingSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      street1: '',
      street2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'US',
      phone: '',
    },
  })

  // Determine if standard shipping is free based on subtotal threshold
  const standardShippingFree = subtotal >= 50

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Shipping form — spans 2 columns on large screens */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Shipping Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  {/* First and last name — side by side on larger screens */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Street address line 1 — required */}
                  <FormField
                    control={form.control}
                    name="street1"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street Address</FormLabel>
                        <FormControl>
                          <Input placeholder="123 Main St" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {/* Street address line 2 — optional (apartment, suite, etc.) */}
                  <FormField
                    control={form.control}
                    name="street2"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Apartment, suite, etc.{' '}
                          <span className="text-muted-foreground">(optional)</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Apt 4B" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* City, State, and Postal Code — 3-column grid on larger screens */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="New York" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input placeholder="NY" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="postalCode"
                      render={({ field }) => (
                        <FormItem className="col-span-2 sm:col-span-1">
                          <FormLabel>Postal Code</FormLabel>
                          <FormControl>
                            <Input placeholder="10001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Country and Phone — 2-column grid on larger screens */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Input placeholder="US" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="(555) 123-4567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator className="my-6" />

                  {/* Shipping method selection — radio group with styled cards */}
                  <div>
                    <h3 className="font-semibold mb-3">Shipping Method</h3>
                    <RadioGroup
                      value={shippingMethod}
                      onValueChange={onShippingMethodChange}
                      className="space-y-3"
                    >
                      {/* Standard shipping option — free for orders $50+ */}
                      <Label
                        htmlFor="standard"
                        className={`flex items-center justify-between rounded-lg border p-4 cursor-pointer transition-colors ${
                          shippingMethod === 'standard'
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value="standard" id="standard" />
                          <div>
                            <p className="font-medium text-sm">Standard Shipping</p>
                            <p className="text-xs text-muted-foreground">
                              5-7 business days
                            </p>
                          </div>
                        </div>
                        {/* Price display — "Free" badge if subtotal >= $50, otherwise $9.99 */}
                        <span className="text-sm font-medium">
                          {standardShippingFree ? (
                            <Badge
                              variant="secondary"
                              className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                            >
                              Free
                            </Badge>
                          ) : (
                            '$9.99'
                          )}
                        </span>
                      </Label>

                      {/* Express shipping option — always $9.99 */}
                      <Label
                        htmlFor="express"
                        className={`flex items-center justify-between rounded-lg border p-4 cursor-pointer transition-colors ${
                          shippingMethod === 'express'
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value="express" id="express" />
                          <div>
                            <p className="font-medium text-sm">Express Shipping</p>
                            <p className="text-xs text-muted-foreground">
                              2-3 business days
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-medium">$9.99</span>
                      </Label>
                    </RadioGroup>
                  </div>

                  {/* Navigation buttons — back to cart and continue to payment */}
                  <div className="flex items-center justify-between pt-4">
                    <Button
                      type="button"
                      variant="ghost"
                      className="gap-2"
                      onClick={() => navigate('cart')}
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to Cart
                    </Button>
                    <Button type="submit" className="gap-2">
                      Continue to Payment
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar order summary — sticky on scroll */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <CheckoutOrderSummary
                couponResult={couponResult}
                shippingMethod={shippingMethod}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================================
// Step 2: Payment
// ============================================================================

/**
 * PaymentStep renders the second checkout step containing the payment card form.
 * Includes card number formatting (auto-spaces every 4 digits), expiry formatting
 * (auto-slash after month), and CVC digit-only input. The "Place Order" button
 * triggers the order creation API call.
 *
 * @param props
 * @param props.onSubmit      - Callback fired when the payment form is submitted with valid data
 * @param props.onBack        - Callback to navigate back to the shipping step
 * @param props.shippingMethod - Selected shipping method for price calculation
 * @param props.couponResult  - Validated coupon result for price calculation, or null
 * @param props.isSubmitting  - Whether the order creation request is in progress
 */
function PaymentStep({
  onSubmit,
  onBack,
  shippingMethod,
  couponResult,
  isSubmitting,
}: {
  onSubmit: (data: PaymentFormValues) => void
  onBack: () => void
  shippingMethod: string
  couponResult: CouponResult | null
  isSubmitting: boolean
}) {
  // Initialize the payment form with Zod resolver and default values
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      cardNumber: '',
      expiry: '',
      cvc: '',
    },
  })

  /**
   * Formats a card number string by stripping non-digits and inserting
   * a space every 4 digits for readability (e.g., "4242 4242 4242 4242").
   *
   * @param value - Raw input string from the card number field
   * @returns Formatted card number string with spaces
   */
  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 16)
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ')
  }

  /**
   * Formats an expiry date string by stripping non-digits and inserting
   * a slash after the first 2 digits (e.g., "12/25").
   *
   * @param value - Raw input string from the expiry field
   * @returns Formatted expiry string with slash separator
   */
  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4)
    if (digits.length >= 3) {
      return digits.slice(0, 2) + '/' + digits.slice(2)
    }
    return digits
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Payment form card — spans 2 columns on large screens */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  {/* Card number input — auto-formats with spaces every 4 digits */}
                  <FormField
                    control={form.control}
                    name="cardNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Card Number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="4242 4242 4242 4242"
                            {...field}
                            onChange={(e) => {
                              // Intercept input and format the card number
                              field.onChange(formatCardNumber(e.target.value))
                            }}
                            maxLength={19}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Expiry date and CVC — side by side */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Expiry date input — auto-formats with slash (MM/YY) */}
                    <FormField
                      control={form.control}
                      name="expiry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expiry Date</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="MM/YY"
                              {...field}
                              onChange={(e) => {
                                // Intercept input and format the expiry date
                                field.onChange(formatExpiry(e.target.value))
                              }}
                              maxLength={5}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {/* CVC input — digits only, masked as password */}
                    <FormField
                      control={form.control}
                      name="cvc"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CVC</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="123"
                              {...field}
                              onChange={(e) => {
                                // Strip non-digits and limit to 4 characters
                                const val = e.target.value
                                    .replace(/\D/g, '')
                                    .slice(0, 4)
                                field.onChange(val)
                              }}
                              maxLength={4}
                              type="password"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Security notice — reassures the customer about payment safety */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                    <Lock className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      Your payment information is encrypted and secure. This is a
                      demo — no real charges will be made.
                    </span>
                  </div>

                  {/* Navigation buttons — back to shipping and place order */}
                  <div className="flex items-center justify-between pt-4">
                    <Button
                      type="button"
                      variant="ghost"
                      className="gap-2"
                      onClick={onBack}
                      disabled={isSubmitting}
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to Shipping
                    </Button>
                    {/* Place Order button — shows loading spinner while submitting */}
                    <Button type="submit" className="gap-2" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4" />
                          Place Order
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar order summary — sticky on scroll */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Desktop: full expanded summary */}
              <div className="hidden lg:block">
                <CheckoutOrderSummary
                  couponResult={couponResult}
                  shippingMethod={shippingMethod}
                />
              </div>
              {/* Mobile: collapsible summary to save screen space */}
              <div className="lg:hidden">
                <CheckoutOrderSummary
                  couponResult={couponResult}
                  shippingMethod={shippingMethod}
                  collapsible
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================================
// Step 3: Confirmation
// ============================================================================

/**
 * ConfirmationStep renders the final checkout step shown after a successful order.
 * Displays a celebratory confetti animation, a success icon with spring animation,
 * the order number, status, estimated delivery date, and navigation buttons
 * to view orders or continue shopping.
 *
 * @param props
 * @param props.orderNumber - The unique order number returned from the API after order creation
 */
function ConfirmationStep({ orderNumber }: { orderNumber: string }) {
  const navigate = useRouterStore((s) => s.navigate)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="max-w-lg mx-auto text-center py-12"
    >
      {/* Full-screen confetti animation overlay */}
      <ConfettiEffect />

      {/* Animated success checkmark icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
        className="mx-auto mb-6"
      >
        <div className="h-24 w-24 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center mx-auto">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.4 }}
          >
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
          </motion.div>
        </div>
      </motion.div>

      {/* Success heading and message */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Order Confirmed!
        </h2>
        <p className="text-muted-foreground mb-6">
          Thank you for your purchase. Your order has been placed successfully.
        </p>
      </motion.div>

      {/* Order details card — order number, status, and estimated delivery */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="space-y-3">
              {/* Order number — monospace font for readability */}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Order Number</span>
                <span className="font-mono font-semibold text-foreground">
                  {orderNumber}
                </span>
              </div>
              <Separator />
              {/* Order status badge */}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                  Confirmed
                </Badge>
              </div>
              {/* Estimated delivery — 7 days from now */}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Estimated Delivery</span>
                <span className="font-medium">
                  {new Date(
                    Date.now() + 7 * 24 * 60 * 60 * 1000
                  ).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Action buttons — navigate to orders page or continue shopping */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="flex flex-col sm:flex-row items-center justify-center gap-3"
      >
        <Button
          variant="outline"
          className="gap-2 w-full sm:w-auto"
          onClick={() => navigate('account-orders')}
        >
          <Package className="h-4 w-4" />
          View Orders
        </Button>
        <Button
          className="gap-2 w-full sm:w-auto"
          onClick={() => navigate('products')}
        >
          <ShoppingBag className="h-4 w-4" />
          Continue Shopping
        </Button>
      </motion.div>
    </motion.div>
  )
}

// ============================================================================
// Main Checkout Page
// ============================================================================

/**
 * CheckoutPage is the main checkout page component that orchestrates the
 * three-step checkout flow: Shipping → Payment → Confirmation.
 *
 * It manages the overall checkout state including the current step, shipping
 * address, shipping method, and coupon data. It also handles redirect guards
 * (empty cart → cart page, unauthenticated → login) and the order creation
 * API call.
 *
 * @state currentStep      - The active checkout step in the flow
 * @state shippingMethod   - Selected shipping method ('standard' or 'express')
 * @state shippingAddress  - Saved shipping address from step 1, used in order payload
 * @state orderNumber      - The order number returned after successful order creation
 * @state isSubmitting     - Whether the order creation API call is in progress
 * @state orderError       - Error message from a failed order creation attempt
 * @state couponResult     - Validated coupon result carried over from the cart page
 *
 * @store items       - Cart items from the global cart store (Zustand)
 * @store clearCart   - Action to empty the cart after successful order
 * @store couponCode  - Currently applied coupon code string
 * @store user        - Authenticated user object from the auth store
 */
export default function CheckoutPage() {
  const items = useCartStore((s) => s.items)
  const clearCart = useCartStore((s) => s.clearCart)
  const couponCode = useCartStore((s) => s.couponCode)
  const navigate = useRouterStore((s) => s.navigate)
  const user = useAuthStore((s) => s.user)

  /** Current step in the checkout flow */
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('shipping')
  /** Selected shipping method — affects shipping cost calculation */
  const [shippingMethod, setShippingMethod] = useState('standard')
  /** Shipping address data saved from step 1, included in the order payload */
  const [shippingAddress, setShippingAddress] = useState<ShippingFormValues | null>(null)
  /** Order number assigned by the backend after successful order creation */
  const [orderNumber, setOrderNumber] = useState('')
  /** Loading state during the order creation API call */
  const [isSubmitting, setIsSubmitting] = useState(false)
  /** Error message displayed when order creation fails */
  const [orderError, setOrderError] = useState<string | null>(null)

  /** Coupon result carried over from the cart page */
  const [couponResult, setCouponResult] = useState<CouponResult | null>(null)

  /**
   * Redirect guard: navigate back to cart if the cart becomes empty.
   * The confirmation step is exempt — the cart is cleared after order placement.
   */
  useEffect(() => {
    if (items.length === 0 && currentStep !== 'confirmation') {
      navigate('cart')
    }
  }, [items.length, currentStep, navigate])

  /**
   * Auth guard: redirect to login page if the user is not authenticated.
   * Checkout requires an authenticated session to associate the order with a user.
   */
  useEffect(() => {
    if (!user) {
      navigate('login')
    }
  }, [user, navigate])

  /**
   * Re-validate the coupon on mount if one was applied in the cart.
   * This ensures the coupon is still valid when the user reaches checkout,
   * and fetches the discount amount for the order summary calculations.
   * Silently fails if the coupon is no longer valid.
   */
  useEffect(() => {
    if (couponCode && !couponResult) {
      const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
      fetch(`/api/coupons?code=${encodeURIComponent(couponCode)}&subtotal=${subtotal}`)
        .then((res) => res.json())
        .then((data) => {
          if (!data.error) {
            setCouponResult(data)
          }
        })
        .catch(() => {
          // Silently fail — coupon will just not apply
        })
    }
  }, [couponCode, couponResult, items])

  /**
   * Handles shipping form submission.
   * Saves the shipping address to state and advances to the payment step.
   * Scrolls to the top of the page so the user sees the payment form.
   *
   * @param data - Validated shipping form data from react-hook-form
   */
  const handleShippingSubmit = useCallback(
    (data: ShippingFormValues) => {
      setShippingAddress(data)
      setCurrentStep('payment')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    []
  )

  /**
   * Handles payment form submission and creates the order via the API.
   * Calculates the final price breakdown, assembles the order payload with
   * all items, addresses, and pricing, then POSTs to /api/orders.
   * On success, clears the cart and navigates to the confirmation step.
   * On failure, displays an error banner.
   *
   * @param _data - Validated payment form data (not used in payload, but required by form)
   */
  const handlePaymentSubmit = useCallback(
    async (_data: PaymentFormValues) => {
      // Guard: ensure the user is still authenticated
      if (!user?.id) {
        setOrderError('Please sign in to place an order.')
        navigate('login')
        return
      }

      // Set loading state and clear any previous errors
      setIsSubmitting(true)
      setOrderError(null)

      try {
        // Calculate the full price breakdown for the order payload
        const subtotal = items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        )
        const discount = couponResult?.discount ?? 0
        const shipping =
          shippingMethod === 'express'
            ? 9.99
            : subtotal >= 50
              ? 0
              : 9.99
        const afterDiscount = subtotal - discount
        const tax = Math.round(afterDiscount * 0.08 * 100) / 100
        const total = Math.round((afterDiscount + shipping + tax) * 100) / 100

        // Map cart items to the order item format expected by the API
        const orderItems = items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId || null,
          productName: item.name,
          variantName: item.variantName || null,
          sku: item.sku,
          price: item.price,
          quantity: item.quantity,
          total: item.price * item.quantity,
          image: item.image || null,
        }))

        // Assemble the complete order payload
        const orderPayload = {
          userId: user.id,
          items: orderItems,
          shippingAddress,
          billingAddress: shippingAddress,  // Billing same as shipping
          shippingMethod:
            shippingMethod === 'express' ? 'Express' : 'Standard',
          subtotal,
          taxAmount: tax,
          shippingAmount: shipping,
          discountAmount: discount,
          totalAmount: total,
          couponId: couponResult?.id || null,
        }

        // Send the order creation request to the API
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderPayload),
        })

        const data = await res.json()

        if (!res.ok) {
          // API returned an error — throw with the error message
          throw new Error(data.error || 'Failed to place order')
        }

        // Order created successfully — update state and navigate to confirmation
        setOrderNumber(data.orderNumber)
        clearCart()  // Empty the cart now that the order is placed
        setCurrentStep('confirmation')
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } catch (error) {
        // Log the error for debugging and display a user-friendly message
        console.error('Order creation error:', error)
        setOrderError(
          error instanceof Error ? error.message : 'Failed to place order. Please try again.'
        )
      } finally {
        // Always clear the loading state, regardless of success or failure
        setIsSubmitting(false)
      }
    },
    [items, shippingMethod, shippingAddress, couponResult, user, clearCart, navigate]
  )

  /**
   * Handles navigating back from the payment step to the shipping step.
   * Scrolls to the top of the page so the user sees the shipping form.
   */
  const handleBackToShipping = useCallback(() => {
    setCurrentStep('shipping')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-3xl font-bold text-foreground">Checkout</h1>
        <p className="text-muted-foreground mt-1">
          Complete your purchase
        </p>
      </motion.div>

      {/* Step progress indicator */}
      <CheckoutStepper currentStep={currentStep} />

      {/* Error banner — displayed when order creation fails */}
      {orderError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive"
        >
          {orderError}
        </motion.div>
      )}

      {/* Step content — animated transitions between steps */}
      <AnimatePresence mode="wait">
        {currentStep === 'shipping' && (
          <ShippingStep
            key="shipping"
            onSubmit={handleShippingSubmit}
            shippingMethod={shippingMethod}
            onShippingMethodChange={setShippingMethod}
            couponResult={couponResult}
          />
        )}
        {currentStep === 'payment' && (
          <PaymentStep
            key="payment"
            onSubmit={handlePaymentSubmit}
            onBack={handleBackToShipping}
            shippingMethod={shippingMethod}
            couponResult={couponResult}
            isSubmitting={isSubmitting}
          />
        )}
        {currentStep === 'confirmation' && (
          <ConfirmationStep key="confirmation" orderNumber={orderNumber} />
        )}
      </AnimatePresence>
    </div>
  )
}
