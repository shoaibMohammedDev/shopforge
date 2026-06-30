/**
 * @file home-page.tsx
 * @description Homepage component for the ShopForge e-commerce application.
 * This is the landing page that users see when they first visit the site.
 * It features a hero carousel banner, flash sale countdown, category grid,
 * featured products, brand showcase, newsletter signup, and stats bar.
 *
 * @key_features
 * - Auto-rotating hero carousel with promotional banners
 * - Flash sale section with real-time countdown timer
 * - Category browsing grid with dynamic icons
 * - Featured products display with cart/wishlist integration
 * - Brand showcase with horizontal scroll
 * - Newsletter subscription form with validation
 * - Trust stats bar (products count, customers, uptime, support)
 */

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Smartphone,
  Laptop,
  Headphones,
  Shirt,
  Home as HomeIcon,
  Dumbbell,
  BookOpen,
  Sparkles,
  Heart,
  ShoppingCart,
  Star,
  ChevronRight,
  Zap,
  Timer,
  Mail,
  Package,
  Users,
  ShieldCheck,
  Headset,
  ArrowRight,
} from 'lucide-react'
import { useRouterStore } from '@/stores/router-store'
import { useCartStore } from '@/stores/cart-store'
import { useWishlistStore } from '@/stores/wishlist-store'
import { api } from '@/lib/api-client'
import type {
  ProductListItem,
  CategoryDisplay,
  BrandDisplay,
  PaginatedResponse,
} from '@/types'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from '@/components/ui/carousel'

// ============================================================================
// Star Rating Component
// ============================================================================

/**
 * StarRating - Renders a row of 1–5 star icons based on a numeric rating value.
 *
 * @param {number} rating - The average rating value (e.g., 4.3). Rounded to the nearest integer for fill state.
 * @param {number} [count] - Optional review count displayed in parentheses next to the stars.
 * @returns {JSX.Element} A flex row of filled/empty star icons with an optional count label.
 */
function StarRating({ rating, count }: { rating: number; count?: number }) {
  return (
    <div className="flex items-center gap-1">
      {/* Render 5 stars; fill stars up to the rounded rating value */}
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3.5 w-3.5 ${
              star <= Math.round(rating)
                ? 'text-amber-400 fill-amber-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
      {/* Show review count if provided */}
      {count !== undefined && (
        <span className="text-xs text-muted-foreground">({count})</span>
      )}
    </div>
  )
}

// ============================================================================
// Animation Variants
// ============================================================================

/**
 * Framer Motion animation variants used throughout the homepage.
 * - fadeInUp: Elements fade in and slide up from below
 * - fadeIn: Simple opacity fade-in
 * - staggerContainer: Parent container that staggers children animations
 * - staggerItem: Individual child item animation for staggered lists
 */
const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
}

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, ease: 'easeOut' as const } },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
}

const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
}

// ============================================================================
// Hero Banner Data
// ============================================================================

/**
 * Static data for the hero carousel slides.
 * Each slide contains a title, subtitle, CTA button text, gradient colors,
 * and the route to navigate to when the CTA is clicked.
 */
const heroSlides = [
  {
    title: 'Summer Collection 2025',
    subtitle: 'Discover the latest trends with up to 40% off on premium styles',
    cta: 'Shop Now',
    gradient: 'from-emerald-600 via-teal-500 to-emerald-400',
    accent: 'text-emerald-50',
    route: 'products' as const,
  },
  {
    title: 'Tech Essentials Sale',
    subtitle: 'Top-rated gadgets and electronics at unbeatable prices',
    cta: 'Explore Deals',
    gradient: 'from-amber-500 via-orange-500 to-amber-400',
    accent: 'text-amber-50',
    route: 'products' as const,
  },
  {
    title: 'New Arrivals',
    subtitle: 'Be the first to shop our freshest picks and exclusive items',
    cta: 'View Collection',
    gradient: 'from-violet-600 via-purple-500 to-violet-400',
    accent: 'text-violet-50',
    route: 'products' as const,
  },
]

// ============================================================================
// Category Icon Map
// ============================================================================

/**
 * Maps category slug keywords to their corresponding icon, text color, and background color.
 * Used to render dynamic category cards with appropriate visual styling.
 * The slug is matched via substring inclusion (e.g., "electronics" matches "electronics-accessories").
 */
const categoryIconMap: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  electronics: { icon: Smartphone, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  computers: { icon: Laptop, color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
  audio: { icon: Headphones, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  clothing: { icon: Shirt, color: 'text-pink-600', bg: 'bg-pink-100 dark:bg-pink-900/30' },
  home: { icon: HomeIcon, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  sports: { icon: Dumbbell, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
  books: { icon: BookOpen, color: 'text-teal-600', bg: 'bg-teal-100 dark:bg-teal-900/30' },
  default: { icon: Sparkles, color: 'text-rose-600', bg: 'bg-rose-100 dark:bg-rose-900/30' },
}

/**
 * Resolves the visual style (icon + colors) for a given category slug.
 * Performs case-insensitive substring matching against the categoryIconMap keys.
 *
 * @param {string} slug - The category slug to look up (e.g., "electronics-accessories").
 * @returns The matching icon, text color, and background color; falls back to the default style.
 */
function getCategoryStyle(slug: string) {
  const normalized = slug.toLowerCase()
  for (const [key, style] of Object.entries(categoryIconMap)) {
    if (normalized.includes(key)) return style
  }
  return categoryIconMap.default
}

// ============================================================================
// Stats Data
// ============================================================================

/**
 * Static trust/credibility stats displayed at the bottom of the homepage.
 * Each entry has an icon, a label string, and a Tailwind text color class.
 */
const stats = [
  { icon: Package, label: '10K+ Products', color: 'text-emerald-600' },
  { icon: Users, label: '50K+ Customers', color: 'text-blue-600' },
  { icon: ShieldCheck, label: '99.9% Uptime', color: 'text-amber-600' },
  { icon: Headset, label: '24/7 Support', color: 'text-violet-600' },
]

// ============================================================================
// Helper: Parse product images
// ============================================================================

/**
 * Parses a JSON string of image URLs into a string array.
 * Safely handles malformed JSON by returning an empty array on parse failure.
 *
 * @param {string} imagesStr - JSON-encoded string of image URL array.
 * @returns {string[]} Array of image URL strings, or empty array if parsing fails.
 */
function parseImages(imagesStr: string): string[] {
  try {
    const parsed = JSON.parse(imagesStr)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Formats a numeric price value into a USD currency string.
 * Uses the Intl.NumberFormat API for locale-aware formatting.
 *
 * @param {number} price - The price value to format.
 * @returns {string} Formatted price string (e.g., "$29.99").
 */
function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price)
}

// ============================================================================
// Reusable Product Card Component
// ============================================================================

/**
 * ProductCard - A reusable card component for displaying a product in grid layouts.
 *
 * Renders the product image (or a gradient placeholder), discount/flash sale badges,
 * a wishlist toggle button, brand name, product name, star rating, price with
 * optional strikethrough for the compare-at price, and an "Add to Cart" button.
 *
 * Clicking the card navigates to the product detail page.
 *
 * @param {Object} props
 * @param {ProductListItem} props.product - The product data to display.
 *
 * @state
 * - Uses cart store (addItem) for adding items to cart
 * - Uses wishlist store (toggleItem, isInWishlist) for wishlist toggling
 * - Uses router store (navigate) for navigation to product detail
 */
function ProductCard({ product }: { product: ProductListItem }) {
  const navigate = useRouterStore((s) => s.navigate)
  const addItem = useCartStore((s) => s.addItem)
  const toggleItem = useWishlistStore((s) => s.toggleItem)
  const isInWishlist = useWishlistStore((s) => s.isInWishlist)
  const wishlisted = isInWishlist(product.id)

  // Parse the product images JSON string into an array of URLs
  const images = parseImages(product.images)
  // Determine if the product has an active discount (comparePrice > selling price)
  const hasDiscount = product.comparePrice && product.comparePrice > product.price
  // Calculate the discount percentage for the badge display
  const discountPercent = hasDiscount
    ? Math.round(((product.comparePrice! - product.price) / product.comparePrice!) * 100)
    : 0

  // Use flash sale price if the product is part of an active flash sale; otherwise use regular price
  const displayPrice =
    product.flashSaleProduct?.[0]?.salePrice ?? product.price

  /**
   * Handles adding the product to the cart.
   * Stops event propagation to prevent triggering the card's navigation onClick.
   * Uses the flash sale price if applicable.
   */
  const handleAddToCart = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      addItem({
        productId: product.id,
        name: product.name,
        slug: product.slug,
        price: displayPrice,
        comparePrice: product.comparePrice ?? undefined,
        image: images[0] ?? '',
        quantity: 1,
        sku: product.slug,
      })
    },
    [addItem, product, images, displayPrice]
  )

  /**
   * Handles toggling the product in the wishlist.
   * Stops event propagation to prevent navigation.
   */
  const handleWishlist = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      toggleItem(product.id)
    },
    [toggleItem, product.id]
  )

  /**
   * Navigates to the product detail page when the card is clicked.
   */
  const handleNavigate = useCallback(() => {
    navigate('product-detail', { id: product.id, slug: product.slug })
  }, [navigate, product.id, product.slug])

  return (
    <motion.div variants={staggerItem} className="group">
      <Card
        className="overflow-hidden cursor-pointer transition-shadow hover:shadow-lg py-0 gap-0"
        onClick={handleNavigate}
      >
        {/* Image / Gradient placeholder */}
        <div className="relative aspect-square overflow-hidden bg-muted">
          {/* Render the product image if available, otherwise show a gradient with the first letter */}
          {images[0] ? (
            <img
              src={images[0]}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800">
              <span className="text-4xl font-bold text-slate-400 dark:text-slate-500">
                {product.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {/* Discount badge - shows percentage off when compare price exists */}
          {discountPercent > 0 && (
            <Badge className="absolute top-2 left-2 bg-red-500 text-white hover:bg-red-600 border-0 text-xs">
              -{discountPercent}%
            </Badge>
          )}

          {/* Flash sale badge - overrides discount badge position when flash sale is active */}
          {product.flashSaleProduct?.[0] && product.flashSaleProduct[0].flashSale?.isActive && (
            <Badge className="absolute top-2 left-2 bg-orange-500 text-white hover:bg-orange-600 border-0 text-xs gap-1">
              <Zap className="size-3" /> Flash
            </Badge>
          )}

          {/* Wishlist button - toggles heart icon fill state on click */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 size-8 rounded-full bg-white/80 dark:bg-black/50 hover:bg-white dark:hover:bg-black/70"
            onClick={handleWishlist}
            aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart
              className={`size-4 ${
                wishlisted
                  ? 'fill-red-500 text-red-500'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            />
          </Button>
        </div>

        <CardContent className="p-4 space-y-2">
          {/* Brand name - shown if the product has an associated brand */}
          {product.brand && (
            <p className="text-xs text-muted-foreground truncate">
              {product.brand.name}
            </p>
          )}

          {/* Product name - truncated to 2 lines with minimum height for consistent card sizing */}
          <h3 className="font-medium text-sm line-clamp-2 leading-tight min-h-[2.5rem]">
            {product.name}
          </h3>

          {/* Star rating with review count */}
          <StarRating rating={product.avgRating} count={product.reviewCount} />

          {/* Price display - shows sale price in red for flash sale items, with optional strikethrough compare price */}
          <div className="flex items-baseline gap-2">
            <span
              className={`font-semibold ${
                product.flashSaleProduct?.[0] && product.flashSaleProduct[0].flashSale?.isActive ? 'text-red-600 dark:text-red-400' : ''
              }`}
            >
              {formatPrice(displayPrice)}
            </span>
            {hasDiscount && (
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(product.comparePrice!)}
              </span>
            )}
          </div>

          {/* Add to cart button - uses flash sale price when applicable */}
          <Button
            size="sm"
            className="w-full mt-1 gap-2"
            onClick={handleAddToCart}
          >
            <ShoppingCart className="size-4" />
            Add to Cart
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ============================================================================
// Product Card Skeleton
// ============================================================================

/**
 * ProductCardSkeleton - A loading placeholder that mimics the ProductCard layout.
 * Used while product data is being fetched to prevent layout shift.
 *
 * @returns {JSX.Element} A skeleton card with placeholder shapes matching the ProductCard structure.
 */
function ProductCardSkeleton() {
  return (
    <Card className="overflow-hidden py-0 gap-0">
      <Skeleton className="aspect-square w-full" />
      <div className="p-4 space-y-3">
        {/* Brand placeholder */}
        <Skeleton className="h-3 w-16" />
        {/* Name placeholder (2 lines) */}
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        {/* Stars placeholder */}
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="size-3.5 rounded-full" />
          ))}
        </div>
        {/* Price placeholder */}
        <div className="flex items-baseline gap-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
        {/* Button placeholder */}
        <Skeleton className="h-8 w-full" />
      </div>
    </Card>
  )
}

// ============================================================================
// Countdown Timer Hook
// ============================================================================

/**
 * useCountdown - A custom hook that computes the time remaining until a target date.
 * Updates every second to provide a live countdown.
 *
 * @param {Date} targetDate - The future date/time to count down to.
 * @returns {{ hours: number, minutes: number, seconds: number }} The remaining time broken into hours, minutes, and seconds.
 *
 * @example
 * const countdown = useCountdown(new Date('2025-12-31T00:00:00'))
 * // => { hours: 120, minutes: 45, seconds: 30 }
 */
function useCountdown(targetDate: Date) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    /** Calculates the remaining time and updates state. Returns all zeros if the target has passed. */
    function calculate() {
      const now = new Date().getTime()
      const distance = targetDate.getTime() - now
      if (distance <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 })
        return
      }
      setTimeLeft({
        hours: Math.floor(distance / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
      })
    }
    calculate()
    // Update the countdown every second
    const interval = setInterval(calculate, 1000)
    return () => clearInterval(interval)
  }, [targetDate])

  return timeLeft
}

// ============================================================================
// Main HomePage Component
// ============================================================================

/**
 * HomePage - The main landing page component for the ShopForge e-commerce platform.
 *
 * Renders a comprehensive storefront homepage with the following sections:
 * 1. Hero Banner Carousel - Auto-rotating promotional slides
 * 2. Flash Sale Countdown - Time-limited deals with live countdown
 * 3. Category Grid - Browsable product categories with icons
 * 4. Featured Products - Curated product selection
 * 5. Brand Showcase - Horizontal scrolling brand logos/names
 * 6. Newsletter CTA - Email subscription form
 * 7. Stats Bar - Trust indicators
 *
 * @state
 * - carouselApi: Controls the hero carousel instance for programmatic navigation
 * - currentSlide: Tracks the currently visible hero slide index for dot indicators
 * - email: Controlled input for the newsletter subscription form
 * - subscribed: Temporary boolean to show success feedback after subscribing
 *
 * @data_fetching
 * - Featured products (isFeatured: true, limit: 4)
 * - All products (filtered client-side for flash sale items)
 * - Categories for the category grid
 * - Brands for the brand showcase
 */
export default function HomePage() {
  const navigate = useRouterStore((s) => s.navigate)
  const [carouselApi, setCarouselApi] = useState<CarouselApi>()
  const [currentSlide, setCurrentSlide] = useState(0)
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  // Flash sale countdown: ends at 8PM today, or 8PM tomorrow if already past 8PM
  const flashSaleEnd = useMemo(() => {
    const now = new Date()
    const end = new Date(now)
    end.setHours(20, 0, 0, 0)
    if (end.getTime() <= now.getTime()) {
      end.setDate(end.getDate() + 1)
    }
    return end
  }, [])
  const countdown = useCountdown(flashSaleEnd)

  // Carousel autoplay: advance to the next slide every 5 seconds
  useEffect(() => {
    if (!carouselApi) return
    const interval = setInterval(() => {
      carouselApi.scrollNext()
    }, 5000)
    return () => clearInterval(interval)
  }, [carouselApi])

  // Track current slide index for dot indicator highlighting
  useEffect(() => {
    if (!carouselApi) return
    const onSelect = () => {
      setCurrentSlide(carouselApi.selectedScrollSnap())
    }
    carouselApi.on('select', onSelect)
    return () => {
      carouselApi.off('select', onSelect)
    }
  }, [carouselApi])

  // ---- Data Fetching ----

  /** Fetch featured products (marked with isFeatured flag, limited to 4) */
  const { data: featuredData, isLoading: featuredLoading } = useQuery({
    queryKey: ['products', 'featured', { isFeatured: true, limit: 4 }],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<ProductListItem>>('/products', {
        isFeatured: true,
        limit: 4,
      })
      return res.success ? res.data : null
    },
  })

  /** Fetch all products and filter for flash sale items client-side */
  const { data: flashSaleData, isLoading: bestSellerLoading } = useQuery({
    queryKey: ['products', 'flash-sale'],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<ProductListItem>>('/products', {
        limit: 20,
      })
      return res.success ? res.data : null
    },
  })

  /** Fetch all categories for the category grid section */
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get<CategoryDisplay[]>('/categories')
      return res.success ? res.data : null
    },
  })

  /** Fetch all brands for the brand showcase section */
  const { data: brands, isLoading: brandsLoading } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const res = await api.get<BrandDisplay[]>('/brands')
      return res.success ? res.data : null
    },
  })

  // Filter flash sale items from all products (only show products with active flash sales)
  const flashSaleProducts = useMemo(() => {
    if (!flashSaleData?.items) return []
    return flashSaleData.items.filter((p) => p.flashSaleProduct?.[0] && p.flashSaleProduct[0].flashSale?.isActive)
  }, [flashSaleData])

  // Take up to 8 categories for the grid display
  const displayCategories = useMemo(() => {
    if (!categories) return []
    return categories.slice(0, 8)
  }, [categories])

  // ---- Handlers ----

  /**
   * Handles newsletter subscription.
   * Performs basic email validation (non-empty + contains '@'),
   * sets a temporary success state, and auto-resets after 3 seconds.
   */
  const handleSubscribe = useCallback(() => {
    if (email.trim() && email.includes('@')) {
      setSubscribed(true)
      setEmail('')
      // Auto-hide the success message after 3 seconds
      setTimeout(() => setSubscribed(false), 3000)
    }
  }, [email])

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <div className="flex flex-col gap-12 pb-12">
      {/* ================================================================== */}
      {/* SECTION 1: Hero Banner Carousel                                    */}
      {/* Displays rotating promotional banners with gradient backgrounds,   */}
      {/* decorative circles, animated title/subtitle, and CTA button.       */}
      {/* ================================================================== */}
      <section className="w-full">
        <Carousel
          setApi={setCarouselApi}
          opts={{ loop: true }}
          className="w-full"
        >
          <CarouselContent>
            {heroSlides.map((slide, idx) => (
              <CarouselItem key={idx}>
                <div
                  className={`relative bg-gradient-to-r ${slide.gradient} flex items-center justify-center overflow-hidden`}
                >
                  {/* Decorative background circles for visual depth */}
                  <div className="absolute -top-20 -right-20 size-80 rounded-full bg-white/10" />
                  <div className="absolute -bottom-16 -left-16 size-64 rounded-full bg-white/10" />
                  <div className="absolute top-1/2 right-1/4 size-40 rounded-full bg-white/5" />

                  {/* Slide content: title, subtitle, and CTA with staggered entrance animations */}
                  <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 py-16 sm:py-24 max-w-3xl mx-auto">
                    <motion.h1
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.2 }}
                      className={`text-3xl sm:text-4xl md:text-5xl font-bold ${slide.accent} mb-4`}
                    >
                      {slide.title}
                    </motion.h1>
                    <motion.p
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.35 }}
                      className={`text-base sm:text-lg ${slide.accent} opacity-90 mb-8 max-w-lg`}
                    >
                      {slide.subtitle}
                    </motion.p>
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.5 }}
                    >
                      {/* CTA button navigates to the products page */}
                      <Button
                        size="lg"
                        className="bg-white text-slate-900 hover:bg-white/90 font-semibold gap-2 shadow-lg"
                        onClick={() => navigate(slide.route)}
                      >
                        {slide.cta}
                        <ArrowRight className="size-4" />
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>

          {/* Carousel navigation arrows - semi-transparent on the gradient background */}
          <CarouselPrevious className="left-4 top-1/2 -translate-y-1/2 bg-white/20 border-0 text-white hover:bg-white/30 hover:text-white size-10" />
          <CarouselNext className="right-4 top-1/2 -translate-y-1/2 bg-white/20 border-0 text-white hover:bg-white/30 hover:text-white size-10" />

          {/* Dot indicators - active dot is wider to indicate current position */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {heroSlides.map((_, idx) => (
              <button
                key={idx}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentSlide
                    ? 'w-6 bg-white'
                    : 'w-2 bg-white/50'
                }`}
                onClick={() => carouselApi?.scrollTo(idx)}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </Carousel>
      </section>

      {/* ================================================================== */}
      {/* SECTION 2: Flash Sale Countdown                                    */}
      {/* Shows time-limited deals with a live countdown timer. Products     */}
      {/* that are part of an active flash sale are displayed in a grid.     */}
      {/* ================================================================== */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={fadeInUp}
        >
          {/* Header row: Flash Sale label, countdown timer, and "View All" link */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              {/* Flash Sale badge */}
              <div className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg">
                <Zap className="size-5" />
                <span className="font-bold text-lg">Flash Sale</span>
              </div>
              {/* "Ends in" label */}
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Timer className="size-4" />
                <span>Ends in</span>
              </div>
              {/* Countdown timer digits - monospaced for stable layout */}
              <div className="flex items-center gap-1">
                {[
                  { value: countdown.hours, label: 'h' },
                  { value: countdown.minutes, label: 'm' },
                  { value: countdown.seconds, label: 's' },
                ].map((unit, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <span className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-mono font-bold text-lg px-2 py-1 rounded min-w-[2.5rem] text-center">
                      {String(unit.value).padStart(2, '0')}
                    </span>
                    <span className="text-sm font-medium text-muted-foreground">
                      {unit.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {/* Link to view all products */}
            <Button
              variant="ghost"
              className="gap-1 text-sm"
              onClick={() => navigate('products')}
            >
              View All <ChevronRight className="size-4" />
            </Button>
          </div>

          {/* Flash sale products grid - shows skeleton, products, or empty state */}
          {bestSellerLoading ? (
            /* Loading skeleton: 4 placeholder cards */
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : flashSaleProducts.length > 0 ? (
            /* Flash sale products with staggered entrance animation */
            <motion.div
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
            >
              {flashSaleProducts.slice(0, 4).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </motion.div>
          ) : (
            /* Empty state when no flash sale products are available */
            <div className="rounded-xl border border-dashed p-8 text-center">
              <Zap className="size-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">
                No flash sale items available right now. Check back soon!
              </p>
            </div>
          )}
        </motion.div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 3: Category Grid                                           */}
      {/* Displays up to 8 product categories as clickable cards with        */}
      {/* dynamic icons and product counts. Clicking navigates to the        */}
      {/* products page filtered by that category.                           */}
      {/* ================================================================== */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={fadeInUp}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Shop by Category</h2>
            <Button
              variant="ghost"
              className="gap-1 text-sm"
              onClick={() => navigate('products')}
            >
              View All <ChevronRight className="size-4" />
            </Button>
          </div>

          {categoriesLoading ? (
            /* Loading skeleton: 8 placeholder category cards */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i} className="p-4">
                  <div className="flex flex-col items-center gap-3">
                    <Skeleton className="size-12 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-14" />
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            /* Category cards with staggered entrance and hover lift effect */
            <motion.div
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
            >
              {displayCategories.map((cat) => {
                const style = getCategoryStyle(cat.slug)
                const IconComp = style.icon
                return (
                  <motion.div key={cat.id} variants={staggerItem}>
                    <Card
                      className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 py-0"
                      onClick={() =>
                        navigate('products', { categoryId: cat.id })
                      }
                    >
                      <CardContent className="flex flex-col items-center gap-3 p-5">
                        {/* Category icon with themed background */}
                        <div
                          className={`size-14 rounded-full ${style.bg} flex items-center justify-center`}
                        >
                          <IconComp className={`size-7 ${style.color}`} />
                        </div>
                        <span className="font-medium text-sm text-center">
                          {cat.name}
                        </span>
                        {/* Product count within the category */}
                        <span className="text-xs text-muted-foreground">
                          {cat._count?.products ?? 0} Products
                        </span>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </motion.div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 4: Featured Products                                       */}
      {/* Displays up to 4 products marked as "featured" by the store.       */}
      {/* Each product card supports cart and wishlist interactions.          */}
      {/* ================================================================== */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={fadeInUp}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Featured Products</h2>
            <Button
              variant="ghost"
              className="gap-1 text-sm"
              onClick={() => navigate('products')}
            >
              View All <ChevronRight className="size-4" />
            </Button>
          </div>

          {featuredLoading ? (
            /* Loading skeleton: 4 placeholder product cards */
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : featuredData?.items && featuredData.items.length > 0 ? (
            /* Featured products with staggered entrance animation */
            <motion.div
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
            >
              {featuredData.items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </motion.div>
          ) : (
            /* Empty state when no featured products exist */
            <div className="rounded-xl border border-dashed p-8 text-center">
              <Package className="size-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">
                No featured products at the moment.
              </p>
            </div>
          )}
        </motion.div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 5: Brand Showcase                                          */}
      {/* Horizontal scrolling list of brand logos/names. Clicking a brand   */}
      {/* card navigates to the products page filtered by that brand.        */}
      {/* ================================================================== */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={fadeInUp}
        >
          <h2 className="text-2xl font-bold mb-6">Popular Brands</h2>

          {brandsLoading ? (
            /* Loading skeleton: 6 placeholder brand cards */
            <div className="flex gap-4 overflow-x-auto pb-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="size-24 rounded-xl shrink-0"
                />
              ))}
            </div>
          ) : brands && brands.length > 0 ? (
            /* Brand cards in a horizontal scroll container */
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
              {brands.map((brand) => (
                <Card
                  key={brand.id}
                  className="shrink-0 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 py-0"
                  onClick={() =>
                    navigate('products', { brandId: brand.id })
                  }
                >
                  <CardContent className="flex flex-col items-center justify-center p-5 min-w-[120px] h-[100px]">
                    {/* Brand logo or initial letter gradient placeholder */}
                    {brand.logo ? (
                      <img
                        src={brand.logo}
                        alt={brand.name}
                        className="h-10 w-auto object-contain mb-1"
                      />
                    ) : (
                      <div className="size-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-700 flex items-center justify-center mb-1">
                        <span className="font-bold text-sm text-slate-500 dark:text-slate-300">
                          {brand.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <span className="text-xs font-medium text-muted-foreground text-center truncate max-w-[100px]">
                      {brand.name}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            /* Empty state when no brands exist */
            <div className="rounded-xl border border-dashed p-6 text-center">
              <p className="text-muted-foreground text-sm">No brands available</p>
            </div>
          )}
        </motion.div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 6: Newsletter CTA                                          */}
      {/* Email subscription form with gradient background and decorative    */}
      {/* shapes. Shows a success message briefly after subscribing.         */}
      {/* ================================================================== */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={fadeIn}
        >
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-500 px-6 py-12 sm:px-12 sm:py-16">
            {/* Decorative background shapes */}
            <div className="absolute -top-10 -right-10 size-40 rounded-full bg-white/10" />
            <div className="absolute -bottom-8 -left-8 size-32 rounded-full bg-white/10" />
            <div className="absolute top-1/3 right-1/3 size-20 rounded-full bg-white/5" />

            <div className="relative z-10 flex flex-col items-center text-center max-w-xl mx-auto">
              <Mail className="size-10 text-white/80 mb-4" />
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                Stay in the Loop
              </h2>
              <p className="text-white/80 mb-8 text-sm sm:text-base">
                Subscribe to our newsletter for exclusive deals, new arrivals, and insider-only discounts.
              </p>
              {/* Toggle between subscription form and success message */}
              {subscribed ? (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-white/20 backdrop-blur-sm rounded-lg px-6 py-3 text-white font-medium"
                >
                  Thanks for subscribing!
                </motion.div>
              ) : (
                <div className="flex w-full max-w-md gap-2">
                  {/* Email input with Enter key support for submission */}
                  <Input
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubscribe()}
                    className="bg-white/20 border-white/30 text-white placeholder:text-white/60 focus-visible:border-white focus-visible:ring-white/30 h-11"
                  />
                  <Button
                    onClick={handleSubscribe}
                    className="bg-white text-emerald-700 hover:bg-white/90 font-semibold shrink-0 h-11 px-6"
                  >
                    Subscribe
                  </Button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 7: Stats Bar                                               */}
      {/* Grid of trust/credibility statistics with icons.                   */}
      {/* ================================================================== */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={staggerContainer}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {stats.map((stat) => {
            const IconComp = stat.icon
            return (
              <motion.div key={stat.label} variants={staggerItem}>
                <Card className="py-0">
                  <CardContent className="flex flex-col items-center gap-2 p-5">
                    <IconComp className={`size-8 ${stat.color}`} />
                    <span className="font-bold text-lg">{stat.label}</span>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      </section>
    </div>
  )
}
