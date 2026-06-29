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

function StarRating({ rating, count }: { rating: number; count?: number }) {
  return (
    <div className="flex items-center gap-1">
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
      {count !== undefined && (
        <span className="text-xs text-muted-foreground">({count})</span>
      )}
    </div>
  )
}

// ============================================================================
// Animation Variants
// ============================================================================

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
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
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

// ============================================================================
// Hero Banner Data
// ============================================================================

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

const stats = [
  { icon: Package, label: '10K+ Products', color: 'text-emerald-600' },
  { icon: Users, label: '50K+ Customers', color: 'text-blue-600' },
  { icon: ShieldCheck, label: '99.9% Uptime', color: 'text-amber-600' },
  { icon: Headset, label: '24/7 Support', color: 'text-violet-600' },
]

// ============================================================================
// Helper: Parse product images
// ============================================================================

function parseImages(imagesStr: string): string[] {
  try {
    const parsed = JSON.parse(imagesStr)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price)
}

// ============================================================================
// Reusable Product Card Component
// ============================================================================

function ProductCard({ product }: { product: ProductListItem }) {
  const navigate = useRouterStore((s) => s.navigate)
  const addItem = useCartStore((s) => s.addItem)
  const toggleItem = useWishlistStore((s) => s.toggleItem)
  const isInWishlist = useWishlistStore((s) => s.isInWishlist)
  const wishlisted = isInWishlist(product.id)

  const images = parseImages(product.images)
  const hasDiscount = product.comparePrice && product.comparePrice > product.price
  const discountPercent = hasDiscount
    ? Math.round(((product.comparePrice! - product.price) / product.comparePrice!) * 100)
    : 0

  const displayPrice =
    product.flashSaleProduct?.salePrice ?? product.price

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

  const handleWishlist = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      toggleItem(product.id)
    },
    [toggleItem, product.id]
  )

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

          {/* Discount badge */}
          {discountPercent > 0 && (
            <Badge className="absolute top-2 left-2 bg-red-500 text-white hover:bg-red-600 border-0 text-xs">
              -{discountPercent}%
            </Badge>
          )}

          {/* Flash sale badge */}
          {product.flashSaleProduct && product.flashSaleProduct.flashSale?.isActive && (
            <Badge className="absolute top-2 left-2 bg-orange-500 text-white hover:bg-orange-600 border-0 text-xs gap-1">
              <Zap className="size-3" /> Flash
            </Badge>
          )}

          {/* Wishlist button */}
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
          {/* Brand */}
          {product.brand && (
            <p className="text-xs text-muted-foreground truncate">
              {product.brand.name}
            </p>
          )}

          {/* Name */}
          <h3 className="font-medium text-sm line-clamp-2 leading-tight min-h-[2.5rem]">
            {product.name}
          </h3>

          {/* Rating */}
          <StarRating rating={product.avgRating} count={product.reviewCount} />

          {/* Price */}
          <div className="flex items-baseline gap-2">
            <span
              className={`font-semibold ${
                product.flashSaleProduct && product.flashSaleProduct.flashSale?.isActive ? 'text-red-600 dark:text-red-400' : ''
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

          {/* Add to cart */}
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

function ProductCardSkeleton() {
  return (
    <Card className="overflow-hidden py-0 gap-0">
      <Skeleton className="aspect-square w-full" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="size-3.5 rounded-full" />
          ))}
        </div>
        <div className="flex items-baseline gap-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-8 w-full" />
      </div>
    </Card>
  )
}

// ============================================================================
// Countdown Timer Hook
// ============================================================================

function useCountdown(targetDate: Date) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
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
    const interval = setInterval(calculate, 1000)
    return () => clearInterval(interval)
  }, [targetDate])

  return timeLeft
}

// ============================================================================
// Main HomePage Component
// ============================================================================

export default function HomePage() {
  const navigate = useRouterStore((s) => s.navigate)
  const [carouselApi, setCarouselApi] = useState<CarouselApi>()
  const [currentSlide, setCurrentSlide] = useState(0)
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  // Flash sale countdown: ends at midnight today + 8 hours
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

  // Carousel autoplay
  useEffect(() => {
    if (!carouselApi) return
    const interval = setInterval(() => {
      carouselApi.scrollNext()
    }, 5000)
    return () => clearInterval(interval)
  }, [carouselApi])

  // Track current slide
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

  const { data: flashSaleData, isLoading: bestSellerLoading } = useQuery({
    queryKey: ['products', 'flash-sale'],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<ProductListItem>>('/products', {
        limit: 20,
      })
      return res.success ? res.data : null
    },
  })

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get<CategoryDisplay[]>('/categories')
      return res.success ? res.data : null
    },
  })

  const { data: brands, isLoading: brandsLoading } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const res = await api.get<BrandDisplay[]>('/brands')
      return res.success ? res.data : null
    },
  })

  // Filter flash sale items from all products
  const flashSaleProducts = useMemo(() => {
    if (!flashSaleData?.items) return []
    return flashSaleData.items.filter((p) => p.flashSaleProduct && p.flashSaleProduct.flashSale?.isActive)
  }, [flashSaleData])

  // Take up to 8 categories for the grid
  const displayCategories = useMemo(() => {
    if (!categories) return []
    return categories.slice(0, 8)
  }, [categories])

  // ---- Handlers ----

  const handleSubscribe = useCallback(() => {
    if (email.trim() && email.includes('@')) {
      setSubscribed(true)
      setEmail('')
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
                  {/* Decorative circles */}
                  <div className="absolute -top-20 -right-20 size-80 rounded-full bg-white/10" />
                  <div className="absolute -bottom-16 -left-16 size-64 rounded-full bg-white/10" />
                  <div className="absolute top-1/2 right-1/4 size-40 rounded-full bg-white/5" />

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

          {/* Navigation arrows */}
          <CarouselPrevious className="left-4 top-1/2 -translate-y-1/2 bg-white/20 border-0 text-white hover:bg-white/30 hover:text-white size-10" />
          <CarouselNext className="right-4 top-1/2 -translate-y-1/2 bg-white/20 border-0 text-white hover:bg-white/30 hover:text-white size-10" />

          {/* Dots indicator */}
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
      {/* ================================================================== */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={fadeInUp}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg">
                <Zap className="size-5" />
                <span className="font-bold text-lg">Flash Sale</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Timer className="size-4" />
                <span>Ends in</span>
              </div>
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
            <Button
              variant="ghost"
              className="gap-1 text-sm"
              onClick={() => navigate('products')}
            >
              View All <ChevronRight className="size-4" />
            </Button>
          </div>

          {/* Flash sale products */}
          {bestSellerLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : flashSaleProducts.length > 0 ? (
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
                        <div
                          className={`size-14 rounded-full ${style.bg} flex items-center justify-center`}
                        >
                          <IconComp className={`size-7 ${style.color}`} />
                        </div>
                        <span className="font-medium text-sm text-center">
                          {cat.name}
                        </span>
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : featuredData?.items && featuredData.items.length > 0 ? (
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
            <div className="flex gap-4 overflow-x-auto pb-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="size-24 rounded-xl shrink-0"
                />
              ))}
            </div>
          ) : brands && brands.length > 0 ? (
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
            <div className="rounded-xl border border-dashed p-6 text-center">
              <p className="text-muted-foreground text-sm">No brands available</p>
            </div>
          )}
        </motion.div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 6: Newsletter CTA                                          */}
      {/* ================================================================== */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={fadeIn}
        >
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-500 px-6 py-12 sm:px-12 sm:py-16">
            {/* Decorative shapes */}
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
