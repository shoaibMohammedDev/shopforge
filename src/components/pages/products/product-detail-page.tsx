'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Star,
  Heart,
  ShoppingCart,
  Minus,
  Plus,
  Truck,
  ShieldCheck,
  RotateCcw,
  Package,
  ThumbsUp,
  ThumbsDown,
  Home,
  ChevronRight,
  Zap,
  Clock,
  Eye,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowLeft,
} from 'lucide-react'
import { useRouterStore } from '@/stores/router-store'
import { useCartStore, type LocalCartItem } from '@/stores/cart-store'
import { useWishlistStore } from '@/stores/wishlist-store'
import { api } from '@/lib/api-client'
import type {
  ProductDetail,
  ProductListItem,
  ReviewItem,
} from '@/types'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'

// ============================================================================
// Helpers
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

function getDiscountPercent(price: number, comparePrice: number): number {
  if (comparePrice <= 0) return 0
  return Math.round(((comparePrice - price) / comparePrice) * 100)
}

// Color palette for gradient placeholders
const GRADIENT_PALETTES = [
  ['from-rose-400 to-orange-300'],
  ['from-violet-400 to-purple-300'],
  ['from-emerald-400 to-teal-300'],
  ['from-amber-400 to-yellow-300'],
  ['from-cyan-400 to-sky-300'],
  ['from-pink-400 to-rose-300'],
  ['from-indigo-400 to-blue-300'],
  ['from-lime-400 to-green-300'],
]

function getGradientForIndex(index: number): string {
  return GRADIENT_PALETTES[index % GRADIENT_PALETTES.length][0]
}

// ============================================================================
// Flash Sale Countdown
// ============================================================================

function FlashSaleCountdown({ endsAt }: { endsAt: string }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const calculate = () => {
      const end = new Date(endsAt).getTime()
      const now = Date.now()
      const diff = Math.max(0, end - now)
      setTimeLeft({
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      })
    }
    calculate()
    const interval = setInterval(calculate, 1000)
    return () => clearInterval(interval)
  }, [endsAt])

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-4 py-3"
    >
      <Zap className="size-5 text-red-500 fill-red-500" />
      <span className="text-sm font-semibold text-red-600 dark:text-red-400">Flash Sale</span>
      <div className="flex items-center gap-1 ml-2">
        <Clock className="size-4 text-red-500" />
        <span className="text-xs text-red-500 dark:text-red-400">Ends in</span>
        {[
          { value: timeLeft.hours, label: 'h' },
          { value: timeLeft.minutes, label: 'm' },
          { value: timeLeft.seconds, label: 's' },
        ].map((unit, i) => (
          <span key={i} className="flex items-center">
            <span className="inline-flex items-center justify-center bg-red-600 text-white text-xs font-bold rounded px-1.5 py-0.5 min-w-[28px]">
              {String(unit.value).padStart(2, '0')}
            </span>
            <span className="text-red-500 text-xs mx-0.5">{unit.label}</span>
          </span>
        ))}
      </div>
    </motion.div>
  )
}

// ============================================================================
// Star Rating Display
// ============================================================================

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'size-5' : size === 'md' ? 'size-4' : 'size-3.5'
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`${sizeClass} ${
            i < Math.floor(rating)
              ? 'fill-amber-400 text-amber-400'
              : i < rating
                ? 'fill-amber-400/50 text-amber-400'
                : 'text-muted-foreground/30'
          }`}
        />
      ))}
    </div>
  )
}

// ============================================================================
// Stock Status Badge
// ============================================================================

function StockStatus({ inventory }: { inventory: ProductDetail['inventory'] }) {
  const totalQty = inventory.reduce((sum, inv) => sum + inv.quantity, 0)
  const totalReserved = inventory.reduce((sum, inv) => sum + inv.reserved, 0)
  const available = totalQty - totalReserved
  const lowThreshold = inventory[0]?.lowStockThreshold ?? 10

  let status: 'in-stock' | 'low-stock' | 'out-of-stock'
  let label: string

  if (available <= 0) {
    status = 'out-of-stock'
    label = 'Out of Stock'
  } else if (available <= lowThreshold) {
    status = 'low-stock'
    label = `Low Stock (${available} left)`
  } else {
    status = 'in-stock'
    label = 'In Stock'
  }

  const config = {
    'in-stock': { icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
    'low-stock': { icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30' },
    'out-of-stock': { icon: XCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/30' },
  }

  const Icon = config[status].icon

  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium px-2.5 py-1 rounded-md ${config[status].bg} ${config[status].color}`}>
      <Icon className="size-4" />
      {label}
    </span>
  )
}

// ============================================================================
// Review Card
// ============================================================================

function ReviewCard({ review }: { review: ReviewItem }) {
  const [helpfulYes, setHelpfulYes] = useState(review.helpfulYes)
  const [helpfulNo, setHelpfulNo] = useState(review.helpfulNo)
  const [voted, setVoted] = useState<'yes' | 'no' | null>(null)

  const handleHelpful = (type: 'yes' | 'no') => {
    if (voted === type) return
    if (voted === 'yes') setHelpfulYes((p) => p - 1)
    if (voted === 'no') setHelpfulNo((p) => p - 1)
    if (type === 'yes') setHelpfulYes((p) => p + 1)
    if (type === 'no') setHelpfulNo((p) => p + 1)
    setVoted(type)
  }

  const dateStr = new Date(review.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-4"
    >
      <div className="flex items-start gap-3">
        <div className="size-10 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
          {(review.user.name || 'U').charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{review.user.name || 'Anonymous'}</span>
            {review.isVerified && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 gap-0.5">
                <CheckCircle2 className="size-3" />
                Verified
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">{dateStr}</span>
          </div>
          <div className="mt-1">
            <StarRating rating={review.rating} size="sm" />
          </div>
          {review.title && (
            <h4 className="font-semibold text-sm mt-1.5">{review.title}</h4>
          )}
          {review.content && (
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{review.content}</p>
          )}
          <div className="flex items-center gap-3 mt-3">
            <span className="text-xs text-muted-foreground">Helpful?</span>
            <button
              onClick={() => handleHelpful('yes')}
              className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors ${
                voted === 'yes'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'hover:bg-accent text-muted-foreground'
              }`}
            >
              <ThumbsUp className="size-3" />
              {helpfulYes}
            </button>
            <button
              onClick={() => handleHelpful('no')}
              className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors ${
                voted === 'no'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  : 'hover:bg-accent text-muted-foreground'
              }`}
            >
              <ThumbsDown className="size-3" />
              {helpfulNo}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================================
// Rating Distribution
// ============================================================================

function RatingDistribution({ reviews, avgRating }: { reviews: ReviewItem[]; avgRating: number }) {
  const distribution = useMemo(() => {
    const dist = [0, 0, 0, 0, 0]
    reviews.forEach((r) => {
      const idx = Math.min(Math.max(Math.round(r.rating) - 1, 0), 4)
      dist[idx]++
    })
    return dist.reverse()
  }, [reviews])

  const total = reviews.length || 1

  return (
    <div className="flex flex-col sm:flex-row gap-6 items-start">
      <div className="text-center sm:text-left shrink-0">
        <div className="text-5xl font-bold">{avgRating.toFixed(1)}</div>
        <div className="mt-1">
          <StarRating rating={avgRating} size="md" />
        </div>
        <div className="text-sm text-muted-foreground mt-1">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</div>
      </div>
      <div className="flex-1 w-full space-y-2">
        {distribution.map((count, i) => {
          const stars = 5 - i
          const percent = (count / total) * 100
          return (
            <div key={stars} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-8 shrink-0">{stars}★</span>
              <Progress value={percent} className="h-2 flex-1" />
              <span className="text-xs text-muted-foreground w-8 text-right shrink-0">{count}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// Related Product Card
// ============================================================================

function RelatedProductCard({ product }: { product: ProductListItem }) {
  const navigate = useRouterStore((s) => s.navigate)
  const images = parseImages(product.images)
  const availableQty = product.inventory.reduce((s, i) => s + i.quantity - i.reserved, 0)
  const discount = product.comparePrice
    ? getDiscountPercent(product.price, product.comparePrice)
    : 0

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="shrink-0 w-[200px] sm:w-[220px]"
    >
      <Card
        className="cursor-pointer overflow-hidden py-0 gap-0 border transition-shadow hover:shadow-lg"
        onClick={() => navigate('product-detail', { id: product.slug || product.id })}
      >
        <div className="relative aspect-square overflow-hidden">
          {images.length > 0 ? (
            <img
              src={images[0]}
              alt={product.name}
              className="size-full object-cover transition-transform duration-300 hover:scale-105"
            />
          ) : (
            <div className={`size-full bg-gradient-to-br ${getGradientForIndex(0)} flex items-center justify-center`}>
              <span className="text-3xl font-bold text-white/80">{product.name.charAt(0)}</span>
            </div>
          )}
          {discount > 0 && (
            <Badge className="absolute top-2 left-2 bg-red-500 text-white text-[10px] px-1.5">
              -{discount}%
            </Badge>
          )}
        </div>
        <CardContent className="p-3 space-y-1">
          <p className="text-xs text-muted-foreground line-clamp-1">{product.brand?.name}</p>
          <h3 className="text-sm font-medium line-clamp-2 leading-snug min-h-[2.5rem]">{product.name}</h3>
          <div className="flex items-center gap-1">
            <StarRating rating={product.avgRating} size="sm" />
            <span className="text-[10px] text-muted-foreground">({product.reviewCount})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">{formatPrice(product.price)}</span>
            {product.comparePrice && product.comparePrice > product.price && (
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(product.comparePrice)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function ProductDetailSkeleton() {
  return (
    <div className="space-y-8">
      {/* Breadcrumb skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Main content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Gallery skeleton */}
        <div className="space-y-4">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <div className="flex gap-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="size-20 rounded-lg" />
            ))}
          </div>
        </div>

        {/* Info skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-3/4" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-6 w-20" />
          </div>
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-10 w-full" />
          <div className="flex gap-3">
            <Skeleton className="h-12 w-40" />
            <Skeleton className="h-12 w-32" />
            <Skeleton className="h-12 w-12" />
          </div>
        </div>
      </div>

      {/* Tabs skeleton */}
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-48 w-full" />
    </div>
  )
}

// ============================================================================
// Image Gallery Component
// ============================================================================

function ImageGallery({ product }: { product: ProductDetail }) {
  const images = parseImages(product.images)
  const variantImages = product.variants
    .filter((v) => v.images)
    .flatMap((v) => parseImages(v.images || '[]'))
  const allImages = [...images, ...variantImages]
  const displayImages = allImages.length > 0 ? allImages : ['__placeholder__']

  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isZoomed, setIsZoomed] = useState(false)
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 })

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isZoomed) return
      const rect = e.currentTarget.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      setZoomPos({ x, y })
    },
    [isZoomed]
  )

  const currentImage = displayImages[selectedIndex]

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative aspect-square rounded-xl overflow-hidden border bg-muted/30 cursor-crosshair"
        onMouseEnter={() => setIsZoomed(true)}
        onMouseLeave={() => setIsZoomed(false)}
        onMouseMove={handleMouseMove}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="size-full"
            style={
              isZoomed
                ? {
                    transform: 'scale(1.8)',
                    transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                    transition: 'transform-origin 0.1s ease-out',
                  }
                : {}
            }
          >
            {currentImage === '__placeholder__' ? (
              <div
                className={`size-full bg-gradient-to-br ${getGradientForIndex(selectedIndex)} flex items-center justify-center`}
              >
                <span className="text-7xl font-bold text-white/80 select-none">
                  {product.name.charAt(0)}
                </span>
              </div>
            ) : (
              <img
                src={currentImage}
                alt={`${product.name} - Image ${selectedIndex + 1}`}
                className="size-full object-cover"
                draggable={false}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Image counter */}
        <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm">
          {selectedIndex + 1} / {displayImages.length}
        </div>
      </motion.div>

      {/* Thumbnails */}
      {displayImages.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {displayImages.map((img, i) => (
            <button
              key={i}
              onClick={() => setSelectedIndex(i)}
              className={`shrink-0 size-20 rounded-lg overflow-hidden border-2 transition-all ${
                selectedIndex === i
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-transparent hover:border-muted-foreground/30'
              }`}
            >
              {img === '__placeholder__' ? (
                <div
                  className={`size-full bg-gradient-to-br ${getGradientForIndex(i)} flex items-center justify-center`}
                >
                  <span className="text-lg font-bold text-white/80">{product.name.charAt(0)}</span>
                </div>
              ) : (
                <img
                  src={img}
                  alt={`Thumbnail ${i + 1}`}
                  className="size-full object-cover"
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Main Product Detail Page
// ============================================================================

export default function ProductDetailPage() {
  const productId = useRouterStore((s) => s.params.id)
  const navigate = useRouterStore((s) => s.navigate)
  const goBack = useRouterStore((s) => s.goBack)
  const addItem = useCartStore((s) => s.addItem)
  const toggleWishlist = useWishlistStore((s) => s.toggleItem)
  const isInWishlist = useWishlistStore((s) => s.isInWishlist)

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
  const [rawQuantity, setRawQuantity] = useState(1)
  const [activeTab, setActiveTab] = useState('description')
  const reviewsRef = useRef<HTMLDivElement>(null)

  // Fetch product data
  const {
    data: productData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      const res = await api.get<ProductDetail & { relatedProducts: ProductListItem[] }>(
        `/products/${productId}`
      )
      if (!res.success || !res.data) {
        throw new Error(res.error || 'Failed to fetch product')
      }
      return res.data
    },
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
  })

  const product = productData

  // Effective variant ID: auto-select first variant when product loads
  const effectiveVariantId = useMemo(() => {
    if (!product) return selectedVariantId
    if (selectedVariantId && product.variants.some((v) => v.id === selectedVariantId)) return selectedVariantId
    if (product.variants.length > 0) return product.variants[0].id
    return null
  }, [product, selectedVariantId])

  // Derived state
  const selectedVariant = useMemo(() => {
    if (!product || !effectiveVariantId) return null
    return product.variants.find((v) => v.id === effectiveVariantId) ?? null
  }, [product, effectiveVariantId])

  const currentPrice = selectedVariant?.price ?? product?.price ?? 0
  const currentComparePrice = selectedVariant?.comparePrice ?? product?.comparePrice ?? null
  const currentSku = selectedVariant?.sku ?? product?.sku ?? ''
  const discount = currentComparePrice ? getDiscountPercent(currentPrice, currentComparePrice) : 0

  // Flash sale
  const flashSale = useMemo(() => {
    if (!product?.flashSales || product.flashSales.length === 0) return null
    return product.flashSales[0]
  }, [product])

  const flashSalePrice = flashSale?.salePrice ?? null

  // Available inventory
  const availableQty = useMemo(() => {
    if (!product) return 0
    if (selectedVariant?.inventory) {
      return selectedVariant.inventory.quantity - selectedVariant.inventory.reserved
    }
    return product.inventory.reduce((sum, inv) => sum + inv.quantity - inv.reserved, 0)
  }, [product, selectedVariant])

  const maxQuantity = Math.max(availableQty, 1)

  // Clamp quantity to max available
  const quantity = Math.min(rawQuantity, maxQuantity)

  const isWishlisted = productId ? isInWishlist(productId) : false

  // Scroll to reviews
  const scrollToReviews = useCallback(() => {
    setActiveTab('reviews')
    setTimeout(() => {
      reviewsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }, [])

  // Add to cart handler
  const handleAddToCart = useCallback(() => {
    if (!product) return
    const images = parseImages(product.images)
    const item: LocalCartItem = {
      productId: product.id,
      variantId: selectedVariant?.id,
      quantity,
      name: product.name,
      slug: product.slug,
      price: flashSalePrice ?? currentPrice,
      comparePrice: currentComparePrice ?? undefined,
      image: images[0] || '',
      variantName: selectedVariant?.name,
      sku: currentSku,
    }
    addItem(item)
  }, [product, selectedVariant, quantity, flashSalePrice, currentPrice, currentComparePrice, currentSku, addItem])

  // Buy now handler
  const handleBuyNow = useCallback(() => {
    handleAddToCart()
    navigate('cart')
  }, [handleAddToCart, navigate])

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <ProductDetailSkeleton />
      </div>
    )
  }

  // Error state
  if (isError || !product) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
          <Package className="size-16 text-muted-foreground/40" />
          <h2 className="text-xl font-semibold text-muted-foreground">
            {isError ? 'Failed to load product' : 'Product not found'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {(error as Error)?.message || 'The product you are looking for does not exist or has been removed.'}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={goBack}>
              <ArrowLeft className="size-4 mr-2" />
              Go Back
            </Button>
            <Button onClick={() => navigate('home')}>Back to Home</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-8">
      {/* ================================================================== */}
      {/* Breadcrumb */}
      {/* ================================================================== */}
      <motion.nav
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                className="cursor-pointer"
                onClick={() => navigate('home')}
              >
                <Home className="size-3.5 mr-1 inline" />
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink
                className="cursor-pointer"
                onClick={() => navigate('products', { categoryId: product.category.id })}
              >
                {product.category.name}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="truncate max-w-[200px] sm:max-w-[300px]">
                {product.name}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </motion.nav>

      {/* ================================================================== */}
      {/* Product Gallery & Info - 2 Column */}
      {/* ================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Left - Gallery */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <ImageGallery product={product} />
        </motion.div>

        {/* Right - Product Info */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-5"
        >
          {/* Brand */}
          {product.brand && (
            <p className="text-sm text-muted-foreground font-medium">{product.brand.name}</p>
          )}

          {/* Product Name */}
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight">{product.name}</h1>

          {/* Rating */}
          <button
            onClick={scrollToReviews}
            className="flex items-center gap-2 group"
          >
            <StarRating rating={product.avgRating} size="md" />
            <span className="text-sm font-medium">{product.avgRating.toFixed(1)}</span>
            <span className="text-sm text-muted-foreground group-hover:text-primary transition-colors">
              ({product.reviewCount} review{product.reviewCount !== 1 ? 's' : ''})
            </span>
          </button>

          {/* Flash Sale Countdown */}
          {flashSale && (
            <FlashSaleCountdown endsAt={flashSale.flashSale.endsAt} />
          )}

          {/* Price */}
          <div className="space-y-1">
            <div className="flex items-baseline gap-3 flex-wrap">
              {flashSalePrice !== null ? (
                <>
                  <span className="text-3xl font-bold text-red-600 dark:text-red-400">
                    {formatPrice(flashSalePrice)}
                  </span>
                  <span className="text-lg text-muted-foreground line-through">
                    {formatPrice(currentPrice)}
                  </span>
                  {currentComparePrice && (
                    <Badge variant="destructive" className="text-xs">
                      Save {formatPrice(currentComparePrice - flashSalePrice)}
                    </Badge>
                  )}
                </>
              ) : (
                <>
                  <span className="text-3xl font-bold">{formatPrice(currentPrice)}</span>
                  {currentComparePrice && currentComparePrice > currentPrice && (
                    <>
                      <span className="text-lg text-muted-foreground line-through">
                        {formatPrice(currentComparePrice)}
                      </span>
                      <Badge variant="destructive" className="text-xs">
                        -{discount}% OFF
                      </Badge>
                    </>
                  )}
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Tax included. Shipping calculated at checkout.</p>
          </div>

          {/* Short Description */}
          {product.shortDesc && (
            <p className="text-sm text-muted-foreground leading-relaxed">{product.shortDesc}</p>
          )}

          <Separator />

          {/* Variant Selector */}
          {product.variants.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">
                {product.variants[0].attributes
                  ? Object.keys(JSON.parse(product.variants[0].attributes)).map(
                      (k) => k.charAt(0).toUpperCase() + k.slice(1)
                    ).join(' / ')
                  : 'Options'}
                :{' '}
                <span className="font-normal text-muted-foreground">
                  {selectedVariant?.name || 'Select'}
                </span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant) => {
                  const isSelected = selectedVariantId === variant.id
                  const isOutOfStock = variant.inventory
                    ? variant.inventory.quantity - variant.inventory.reserved <= 0
                    : false

                  return (
                    <button
                      key={variant.id}
                      onClick={() => {
                        if (!isOutOfStock) setSelectedVariantId(variant.id)
                      }}
                      disabled={isOutOfStock}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20'
                          : isOutOfStock
                            ? 'border-muted bg-muted/50 text-muted-foreground cursor-not-allowed line-through'
                            : 'border-input hover:border-primary/50 hover:bg-accent'
                      }`}
                    >
                      {variant.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Quantity Selector */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Quantity</h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center border rounded-lg">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10 rounded-r-none"
                  onClick={() => setRawQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="size-4" />
                </Button>
                <div className="w-12 text-center font-medium text-sm tabular-nums">
                  {quantity}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10 rounded-l-none"
                  onClick={() => setRawQuantity((q) => Math.min(maxQuantity, q + 1))}
                  disabled={quantity >= maxQuantity}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
              <span className="text-xs text-muted-foreground">
                {availableQty > 0 ? `${availableQty} available` : ''}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              size="lg"
              className="flex-1 min-w-[160px] h-12 text-base font-semibold"
              onClick={handleAddToCart}
              disabled={availableQty <= 0}
            >
              <ShoppingCart className="size-5 mr-2" />
              {availableQty <= 0 ? 'Out of Stock' : 'Add to Cart'}
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="flex-1 min-w-[120px] h-12 text-base font-semibold"
              onClick={handleBuyNow}
              disabled={availableQty <= 0}
            >
              Buy Now
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-12 shrink-0"
              onClick={() => productId && toggleWishlist(productId)}
            >
              <motion.div
                animate={isWishlisted ? { scale: [1, 1.3, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                <Heart
                  className={`size-5 ${
                    isWishlisted
                      ? 'fill-red-500 text-red-500'
                      : 'text-muted-foreground'
                  }`}
                />
              </motion.div>
            </Button>
          </div>

          {/* Stock & Shipping Info */}
          <div className="space-y-3 pt-1">
            <StockStatus inventory={product.inventory} />

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Truck className="size-4 shrink-0" />
              <span>Free shipping on orders over $50</span>
            </div>

            {currentSku && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium">SKU:</span>
                <span>{currentSku}</span>
              </div>
            )}
          </div>

          {/* Trust Badges */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              { icon: ShieldCheck, label: 'Secure Payment' },
              { icon: RotateCcw, label: '30-Day Returns' },
              { icon: Truck, label: 'Fast Shipping' },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-1.5 text-center p-3 rounded-lg bg-muted/50"
              >
                <Icon className="size-5 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground leading-tight">{label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ================================================================== */}
      {/* Product Tabs */}
      {/* ================================================================== */}
      <motion.div
        ref={reviewsRef}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="specifications">Specifications</TabsTrigger>
            <TabsTrigger value="reviews">
              Reviews ({product.reviewCount})
            </TabsTrigger>
          </TabsList>

          {/* Description Tab */}
          <TabsContent value="description" className="mt-6">
            <Card>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                <div
                  dangerouslySetInnerHTML={{ __html: product.description || '<p>No description available.</p>' }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Specifications Tab */}
          <TabsContent value="specifications" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Product Specifications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {[
                    { label: 'SKU', value: product.sku },
                    { label: 'Weight', value: product.weight ? `${product.weight} kg` : 'N/A' },
                    { label: 'Dimensions', value: product.dimensions || 'N/A' },
                    { label: 'Brand', value: product.brand?.name || 'N/A' },
                    { label: 'Category', value: product.category.name },
                    {
                      label: 'Tags',
                      value: product.tags.map((t) => t.tag).join(', ') || 'N/A',
                    },
                    {
                      label: 'Variants Available',
                      value: product.variants.length > 0
                        ? product.variants.map((v) => v.name).join(', ')
                        : 'Standard',
                    },
                    {
                      label: 'Total Sold',
                      value: product.totalSold.toString(),
                    },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="flex items-center py-3 gap-4"
                    >
                      <span className="text-sm font-medium text-muted-foreground w-40 shrink-0">
                        {label}
                      </span>
                      <span className="text-sm">{value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="mt-6 space-y-6">
            {/* Rating Summary */}
            <Card>
              <CardContent className="pt-6">
                <RatingDistribution
                  reviews={product.reviews}
                  avgRating={product.avgRating}
                />
              </CardContent>
            </Card>

            {/* Individual Reviews */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Customer Reviews</CardTitle>
              </CardHeader>
              <CardContent>
                {product.reviews.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Eye className="size-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No reviews yet. Be the first to review this product!</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {product.reviews.map((review) => (
                      <ReviewCard key={review.id} review={review} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* ================================================================== */}
      {/* Related Products */}
      {/* ================================================================== */}
      {productData?.relatedProducts && productData.relatedProducts.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Related Products</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('products', { categoryId: product.category.id })}
            >
              View All
              <ChevronRight className="size-4 ml-1" />
            </Button>
          </div>
          <ScrollArea className="w-full">
            <div className="flex gap-4 pb-4">
              {productData.relatedProducts.map((rp) => (
                <RelatedProductCard key={rp.id} product={rp} />
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </motion.section>
      )}
    </div>
  )
}
