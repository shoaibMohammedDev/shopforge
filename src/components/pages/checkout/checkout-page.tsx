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
import { useRouterStore } from '@/stores/router-store'
import { useCartStore } from '@/stores/cart-store'
import { useAuthStore } from '@/stores/auth-store'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

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

type CheckoutStep = 'shipping' | 'payment' | 'confirmation'

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
// Zod Schema
// ============================================================================

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

type ShippingFormValues = z.infer<typeof shippingSchema>

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

type PaymentFormValues = z.infer<typeof paymentSchema>

// ============================================================================
// Confetti Effect
// ============================================================================

function ConfettiEffect() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const colors = [
      '#f59e0b', '#ef4444', '#10b981', '#8b5cf6',
      '#ec4899', '#06b6d4', '#f97316', '#14b8a6',
    ]

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

    function animate() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      let alive = false
      particles.forEach((p) => {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.3
        p.rotation += p.rotationSpeed
        p.opacity -= 0.008

        if (p.opacity > 0) {
          alive = true
          ctx.save()
          ctx.translate(p.x, p.y)
          ctx.rotate((p.rotation * Math.PI) / 180)
          ctx.globalAlpha = p.opacity
          ctx.fillStyle = p.color
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
          ctx.restore()
        }
      })

      if (alive) {
        animationId = requestAnimationFrame(animate)
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }

    animate()

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

function CheckoutStepper({ currentStep }: { currentStep: CheckoutStep }) {
  const steps = [
    { key: 'shipping' as const, label: 'Shipping', icon: Truck },
    { key: 'payment' as const, label: 'Payment', icon: CreditCard },
    { key: 'confirmation' as const, label: 'Confirmation', icon: CheckCircle2 },
  ]

  const currentIndex = steps.findIndex((s) => s.key === currentStep)

  return (
    <div className="flex items-center justify-center gap-0 w-full max-w-lg mx-auto mb-8">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex
        const isCurrent = index === currentIndex
        const Icon = step.icon

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-initial">
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
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>
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
  const [isOpen, setIsOpen] = useState(false)

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  }, [items])

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

  const content = (
    <div className="space-y-3">
      {/* Items */}
      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {items.map((item) => (
          <div
            key={`${item.productId}-${item.variantId || 'default'}`}
            className="flex items-center gap-3"
          >
            <div
              className={`h-10 w-10 rounded-md bg-gradient-to-br ${getGradient(item.productId)} flex items-center justify-center shrink-0`}
            >
              <ShoppingBag className="h-4 w-4 text-white/70" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.name}</p>
              {item.variantName && (
                <p className="text-xs text-muted-foreground">{item.variantName}</p>
              )}
            </div>
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

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Discount</span>
            <span className="text-emerald-600 dark:text-emerald-400">
              -{formatPrice(discount)}
            </span>
          </div>
        )}
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
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tax (8%)</span>
          <span>{formatPrice(tax)}</span>
        </div>
      </div>

      <Separator />

      <div className="flex justify-between items-baseline">
        <span className="font-semibold">Total</span>
        <span className="text-lg font-bold">{formatPrice(total)}</span>
      </div>
    </div>
  )

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

  const standardShippingFree = subtotal >= 50

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
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
                  {/* Name row */}
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

                  {/* Street */}
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

                  {/* City / State / Zip */}
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

                  {/* Country / Phone */}
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

                  {/* Shipping Method */}
                  <div>
                    <h3 className="font-semibold mb-3">Shipping Method</h3>
                    <RadioGroup
                      value={shippingMethod}
                      onValueChange={onShippingMethodChange}
                      className="space-y-3"
                    >
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

                  {/* Actions */}
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

        {/* Sidebar summary */}
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
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      cardNumber: '',
      expiry: '',
      cvc: '',
    },
  })

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 16)
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ')
  }

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
        {/* Payment Form */}
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
                  {/* Card Number */}
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
                              field.onChange(formatCardNumber(e.target.value))
                            }}
                            maxLength={19}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Expiry & CVC */}
                  <div className="grid grid-cols-2 gap-4">
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
                                field.onChange(formatExpiry(e.target.value))
                              }}
                              maxLength={5}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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

                  {/* Security notice */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                    <Lock className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      Your payment information is encrypted and secure. This is a
                      demo — no real charges will be made.
                    </span>
                  </div>

                  {/* Actions */}
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

        {/* Sidebar summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Desktop: full summary */}
              <div className="hidden lg:block">
                <CheckoutOrderSummary
                  couponResult={couponResult}
                  shippingMethod={shippingMethod}
                />
              </div>
              {/* Mobile: collapsible */}
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

function ConfirmationStep({ orderNumber }: { orderNumber: string }) {
  const navigate = useRouterStore((s) => s.navigate)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="max-w-lg mx-auto text-center py-12"
    >
      <ConfettiEffect />

      {/* Success animation */}
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

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Order Number</span>
                <span className="font-mono font-semibold text-foreground">
                  {orderNumber}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                  Confirmed
                </Badge>
              </div>
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

export default function CheckoutPage() {
  const items = useCartStore((s) => s.items)
  const clearCart = useCartStore((s) => s.clearCart)
  const couponCode = useCartStore((s) => s.couponCode)
  const navigate = useRouterStore((s) => s.navigate)
  const user = useAuthStore((s) => s.user)

  const [currentStep, setCurrentStep] = useState<CheckoutStep>('shipping')
  const [shippingMethod, setShippingMethod] = useState('standard')
  const [shippingAddress, setShippingAddress] = useState<ShippingFormValues | null>(null)
  const [orderNumber, setOrderNumber] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderError, setOrderError] = useState<string | null>(null)

  const [couponResult, setCouponResult] = useState<CouponResult | null>(null)

  // Redirect to cart if empty (except on confirmation step)
  useEffect(() => {
    if (items.length === 0 && currentStep !== 'confirmation') {
      navigate('cart')
    }
  }, [items.length, currentStep, navigate])

  // Validate coupon on mount if we have one
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

  const handleShippingSubmit = useCallback(
    (data: ShippingFormValues) => {
      setShippingAddress(data)
      setCurrentStep('payment')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    []
  )

  const handlePaymentSubmit = useCallback(
    async (_data: PaymentFormValues) => {
      setIsSubmitting(true)
      setOrderError(null)

      try {
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

        const orderPayload = {
          userId: user?.id || 'guest',
          items: orderItems,
          shippingAddress,
          billingAddress: shippingAddress,
          shippingMethod:
            shippingMethod === 'express' ? 'Express' : 'Standard',
          subtotal,
          taxAmount: tax,
          shippingAmount: shipping,
          discountAmount: discount,
          totalAmount: total,
          couponId: couponResult?.id || null,
        }

        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderPayload),
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || 'Failed to place order')
        }

        setOrderNumber(data.orderNumber)
        clearCart()
        setCurrentStep('confirmation')
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } catch (error) {
        setOrderError(
          error instanceof Error ? error.message : 'Failed to place order. Please try again.'
        )
      } finally {
        setIsSubmitting(false)
      }
    },
    [items, shippingMethod, shippingAddress, couponResult, user, clearCart]
  )

  const handleBackToShipping = useCallback(() => {
    setCurrentStep('shipping')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
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

      {/* Stepper */}
      <CheckoutStepper currentStep={currentStep} />

      {/* Error banner */}
      {orderError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive"
        >
          {orderError}
        </motion.div>
      )}

      {/* Steps */}
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
