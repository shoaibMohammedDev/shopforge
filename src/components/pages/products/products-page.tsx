'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  SlidersHorizontal,
  Star,
  Heart,
  ShoppingCart,
  ChevronRight,
  X,
  Zap,
  PackageOpen,
  Home,
} from 'lucide-react'
import { useRouterStore } from '@/stores/router-store'
import { useCartStore, type LocalCartItem } from '@/stores/cart-store'
import { useWishlistStore } from '@/stores/wishlist-store'
import { api } from '@/lib/api-client'
import { useIsMobile } from '@/hooks/use-mobile'
import type {
  ProductListItem,
  CategoryDisplay,
  BrandDisplay,
  PaginatedResponse,
  ProductFilters,
} from '@/types'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination'

// ============================================================================
// Animation Variants
// ============================================================================

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
}

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

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

// ============================================================================
// Filter State Interface
// ============================================================================

interface FilterState {
  search: string
  categoryIds: string[]
  brandIds: string[]
  minPrice: string
  maxPrice: string
  minRating: number
  sort: string
  page: number
}

const defaultFilters: FilterState = {
  search: '',
  categoryIds: [],
  brandIds: [],
  minPrice: '',
  maxPrice: '',
  minRating: 0,
  sort: 'newest',
  page: 1,
}

// ============================================================================
// Star Rating Filter Component
// ============================================================================

function StarRatingFilter({
  value,
  onChange,
}: {
  value: number
  onChange: (rating: number) => void
}) {
  const options = [4, 3, 2, 1]

  return (
    <div className="space-y-2">
      {options.map((rating) => (
        <button
          key={rating}
          type="button"
          onClick={() => onChange(value === rating ? 0 : rating)}
          className={`flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm transition-colors ${
            value === rating
              ? 'bg-primary/10 text-primary font-medium'
              : 'hover:bg-accent'
          }`}
        >
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`size-3.5 ${
                  i < rating
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-muted-foreground/40'
                }`}
              />
            ))}
          </div>
          <span className="text-muted-foreground">& up</span>
        </button>
      ))}
    </div>
  )
}

// ============================================================================
// Filter Sidebar Content (shared between desktop & mobile)
// ============================================================================

function FilterSidebarContent({
  filters,
  setFilters,
  categories,
  brands,
  categoriesLoading,
  brandsLoading,
  onClose,
}: {
  filters: FilterState
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>
  categories: CategoryDisplay[]
  brands: BrandDisplay[]
  categoriesLoading: boolean
  brandsLoading: boolean
  onClose?: () => void
}) {
  const toggleCategory = useCallback(
    (id: string) => {
      setFilters((prev) => ({
        ...prev,
        categoryIds: prev.categoryIds.includes(id)
          ? prev.categoryIds.filter((c) => c !== id)
          : [...prev.categoryIds, id],
        page: 1,
      }))
    },
    [setFilters]
  )

  const toggleBrand = useCallback(
    (id: string) => {
      setFilters((prev) => ({
        ...prev,
        brandIds: prev.brandIds.includes(id)
          ? prev.brandIds.filter((b) => b !== id)
          : [...prev.brandIds, id],
        page: 1,
      }))
    },
    [setFilters]
  )

  const clearFilters = useCallback(() => {
    setFilters({ ...defaultFilters })
    onClose?.()
  }, [setFilters, onClose])

  const hasActiveFilters =
    filters.categoryIds.length > 0 ||
    filters.brandIds.length > 0 ||
    filters.minPrice !== '' ||
    filters.maxPrice !== '' ||
    filters.minRating > 0

  return (
    <div className="space-y-6">
      {/* Header with Clear */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm uppercase tracking-wider">Filters</h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
            Clear All
          </Button>
        )}
      </div>

      <Separator />

      {/* Category Filter */}
      <div className="space-y-3">
        <h4 className="font-medium text-sm">Category</h4>
        {categoriesLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        ) : (
          <ScrollArea className="max-h-48">
            <div className="space-y-2 pr-2">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`cat-${cat.id}`}
                    checked={filters.categoryIds.includes(cat.id)}
                    onCheckedChange={() => toggleCategory(cat.id)}
                  />
                  <Label
                    htmlFor={`cat-${cat.id}`}
                    className="text-sm cursor-pointer flex-1 leading-tight"
                  >
                    {cat.name}
                    {cat._count && (
                      <span className="text-muted-foreground ml-1">
                        ({cat._count.products})
                      </span>
                    )}
                  </Label>
                </div>
              ))}
              {/* Render children */}
              {categories.flatMap((cat) =>
                cat.children
                  ? cat.children.map((child) => (
                      <div key={child.id} className="flex items-center gap-2 pl-4">
                        <Checkbox
                          id={`cat-${child.id}`}
                          checked={filters.categoryIds.includes(child.id)}
                          onCheckedChange={() => toggleCategory(child.id)}
                        />
                        <Label
                          htmlFor={`cat-${child.id}`}
                          className="text-sm cursor-pointer flex-1 leading-tight"
                        >
                          {child.name}
                          {child._count && (
                            <span className="text-muted-foreground ml-1">
                              ({child._count.products})
                            </span>
                          )}
                        </Label>
                      </div>
                    ))
                  : []
              )}
            </div>
          </ScrollArea>
        )}
      </div>

      <Separator />

      {/* Brand Filter */}
      <div className="space-y-3">
        <h4 className="font-medium text-sm">Brand</h4>
        {brandsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        ) : (
          <ScrollArea className="max-h-48">
            <div className="space-y-2 pr-2">
              {brands.map((brand) => (
                <div key={brand.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`brand-${brand.id}`}
                    checked={filters.brandIds.includes(brand.id)}
                    onCheckedChange={() => toggleBrand(brand.id)}
                  />
                  <Label
                    htmlFor={`brand-${brand.id}`}
                    className="text-sm cursor-pointer flex-1 leading-tight"
                  >
                    {brand.name}
                    {brand._count && (
                      <span className="text-muted-foreground ml-1">
                        ({brand._count.products})
                      </span>
                    )}
                  </Label>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      <Separator />

      {/* Price Range */}
      <div className="space-y-3">
        <h4 className="font-medium text-sm">Price Range</h4>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={filters.minPrice}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, minPrice: e.target.value, page: 1 }))
            }
            className="h-8 text-sm"
            min={0}
          />
          <span className="text-muted-foreground text-sm">—</span>
          <Input
            type="number"
            placeholder="Max"
            value={filters.maxPrice}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, maxPrice: e.target.value, page: 1 }))
            }
            className="h-8 text-sm"
            min={0}
          />
        </div>
      </div>

      <Separator />

      {/* Rating Filter */}
      <div className="space-y-3">
        <h4 className="font-medium text-sm">Rating</h4>
        <StarRatingFilter
          value={filters.minRating}
          onChange={(rating) =>
            setFilters((prev) => ({ ...prev, minRating: rating, page: 1 }))
          }
        />
      </div>

      {/* Mobile Apply Button */}
      {onClose && (
        <>
          <Separator />
          <Button className="w-full" onClick={onClose}>
            Apply Filters
          </Button>
        </>
      )}
    </div>
  )
}

// ============================================================================
// Product Card
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
    ? Math.round(
        ((product.comparePrice! - product.price) / product.comparePrice!) * 100
      )
    : 0

  const displayPrice =
    product.flashSales?.[0]?.salePrice ?? product.price

  const totalInventory = product.inventory.reduce(
    (sum, inv) => sum + inv.quantity - inv.reserved,
    0
  )
  const inStock = totalInventory > 0

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
    navigate('product-detail', { id: product.id })
  }, [navigate, product.id])

  return (
    <motion.div variants={staggerItem} className="group">
      <Card
        className="overflow-hidden cursor-pointer transition-all hover:shadow-lg py-0 gap-0"
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
          {product.flashSales && product.flashSales.length > 0 && (
            <Badge className="absolute top-2 left-2 bg-orange-500 text-white hover:bg-orange-600 border-0 text-xs gap-1">
              <Zap className="size-3" /> Flash
            </Badge>
          )}

          {/* Out of stock overlay */}
          {!inStock && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
              <Badge variant="secondary" className="text-xs font-medium">
                Out of Stock
              </Badge>
            </div>
          )}

          {/* Wishlist button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 size-8 rounded-full bg-white/80 dark:bg-black/50 hover:bg-white dark:hover:bg-black/70 transition-opacity opacity-0 group-hover:opacity-100"
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
          <div className="flex items-center gap-1">
            <div className="flex items-center">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`size-3.5 ${
                    i < Math.round(product.avgRating)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-slate-300 dark:text-slate-600'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              ({product.reviewCount})
            </span>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-2">
            <span
              className={`font-semibold ${
                product.flashSales && product.flashSales.length > 0
                  ? 'text-red-600 dark:text-red-400'
                  : ''
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
            disabled={!inStock}
          >
            <ShoppingCart className="size-4" />
            {inStock ? 'Add to Cart' : 'Out of Stock'}
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
// Empty State
// ============================================================================

function EmptyState({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="rounded-full bg-muted p-6 mb-4">
        <PackageOpen className="size-12 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold mb-2">No products found</h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        {hasFilters
          ? 'We couldn\'t find any products matching your filters. Try adjusting your search criteria.'
          : 'There are no products available at the moment. Check back soon!'}
      </p>
      {hasFilters && (
        <Button variant="outline" onClick={onClear}>
          Clear All Filters
        </Button>
      )}
    </motion.div>
  )
}

// ============================================================================
// Pagination Helper
// ============================================================================

function generatePaginationPages(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const pages: (number | 'ellipsis')[] = [1]

  if (currentPage > 3) {
    pages.push('ellipsis')
  }

  const start = Math.max(2, currentPage - 1)
  const end = Math.min(totalPages - 1, currentPage + 1)

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }

  if (currentPage < totalPages - 2) {
    pages.push('ellipsis')
  }

  pages.push(totalPages)
  return pages
}

// ============================================================================
// Main ProductsPage Component
// ============================================================================

export default function ProductsPage() {
  const navigate = useRouterStore((s) => s.navigate)
  const params = useRouterStore((s) => s.params)
  const isMobile = useIsMobile()
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  // Initialize filters from router params
  const [filters, setFilters] = useState<FilterState>(() => ({
    ...defaultFilters,
    search: params.search || '',
    categoryIds: params.categoryId ? [params.categoryId] : [],
    brandIds: params.brandId ? [params.brandId] : [],
    sort: params.sort || defaultFilters.sort,
  }))

  // Search input with debounce
  const [searchInput, setSearchInput] = useState(filters.search)

  // Search debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchInput, page: 1 }))
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Build query params
  const queryParams = useMemo(() => {
    const p: Record<string, string | number | boolean | undefined> = {
      page: filters.page,
      limit: 12,
      sort: filters.sort,
    }
    if (filters.search) p.search = filters.search
    if (filters.categoryIds.length > 0) p.categoryId = filters.categoryIds.join(',')
    if (filters.brandIds.length > 0) p.brandId = filters.brandIds.join(',')
    if (filters.minPrice) p.minPrice = filters.minPrice
    if (filters.maxPrice) p.maxPrice = filters.maxPrice
    if (filters.minRating > 0) p.minRating = filters.minRating
    if (params.isFeatured === 'true') p.isFeatured = true
    if (params.tag) p.tag = params.tag
    return p
  }, [filters, params.isFeatured, params.tag])

  // Fetch products
  const {
    data: productsData,
    isLoading: productsLoading,
    isError: productsError,
  } = useQuery({
    queryKey: ['products', queryParams],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<ProductListItem>>(
        '/products',
        queryParams
      )
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch products')
      }
      return response.data
    },
  })

  // Fetch categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get<CategoryDisplay[]>('/categories')
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch categories')
      }
      return response.data
    },
  })

  // Fetch brands
  const { data: brands = [], isLoading: brandsLoading } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const response = await api.get<BrandDisplay[]>('/brands')
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch brands')
      }
      return response.data
    },
  })

  // Find active category name for breadcrumb
  const activeCategoryName = useMemo(() => {
    if (filters.categoryIds.length !== 1) return null
    const findName = (cats: CategoryDisplay[]): string | null => {
      for (const cat of cats) {
        if (cat.id === filters.categoryIds[0]) return cat.name
        if (cat.children) {
          const found = findName(cat.children)
          if (found) return found
        }
      }
      return null
    }
    return findName(categories)
  }, [filters.categoryIds, categories])

  const hasActiveFilters =
    filters.categoryIds.length > 0 ||
    filters.brandIds.length > 0 ||
    filters.minPrice !== '' ||
    filters.maxPrice !== '' ||
    filters.minRating > 0 ||
    filters.search !== ''

  const clearAllFilters = useCallback(() => {
    setFilters({ ...defaultFilters })
    setSearchInput('')
  }, [])

  const products = productsData?.items ?? []
  const totalProducts = productsData?.total ?? 0
  const totalPages = productsData?.totalPages ?? 0
  const currentPage = productsData?.page ?? 1

  return (
    <div className="min-h-screen flex flex-col">
      {/* Breadcrumb */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  className="cursor-pointer flex items-center gap-1"
                  onClick={() => navigate('home')}
                >
                  <Home className="size-3.5" />
                  Home
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {activeCategoryName ? (
                  <BreadcrumbLink
                    className="cursor-pointer"
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        categoryIds: [],
                        page: 1,
                      }))
                    }
                  >
                    Products
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>Products</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {activeCategoryName && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{activeCategoryName}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1">
        <div className="container mx-auto px-4 py-6">
          <div className="flex gap-6">
            {/* Desktop Filter Sidebar */}
            {!isMobile && (
              <aside className="hidden lg:block w-64 shrink-0">
                <div className="sticky top-20">
                  <ScrollArea className="h-[calc(100vh-6rem)]">
                    <div className="pr-4 pb-8">
                      <FilterSidebarContent
                        filters={filters}
                        setFilters={setFilters}
                        categories={categories}
                        brands={brands}
                        categoriesLoading={categoriesLoading}
                        brandsLoading={brandsLoading}
                      />
                    </div>
                  </ScrollArea>
                </div>
              </aside>
            )}

            {/* Product listing area */}
            <main className="flex-1 min-w-0">
              {/* Sort & Search Bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
                {/* Mobile Filter Button */}
                {isMobile && (
                  <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2 shrink-0">
                        <SlidersHorizontal className="size-4" />
                        Filters
                        {hasActiveFilters && (
                          <Badge className="ml-1 h-5 min-w-5 px-1 text-[10px]">
                            {filters.categoryIds.length +
                              filters.brandIds.length +
                              (filters.minPrice !== '' ? 1 : 0) +
                              (filters.maxPrice !== '' ? 1 : 0) +
                              (filters.minRating > 0 ? 1 : 0)}
                          </Badge>
                        )}
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-[320px] sm:w-[380px]">
                      <SheetHeader>
                        <SheetTitle className="flex items-center gap-2">
                          <SlidersHorizontal className="size-5" />
                          Filter Products
                        </SheetTitle>
                      </SheetHeader>
                      <ScrollArea className="h-[calc(100vh-10rem)] pr-2">
                        <div className="py-4">
                          <FilterSidebarContent
                            filters={filters}
                            setFilters={setFilters}
                            categories={categories}
                            brands={brands}
                            categoriesLoading={categoriesLoading}
                            brandsLoading={brandsLoading}
                            onClose={() => setMobileFiltersOpen(false)}
                          />
                        </div>
                      </ScrollArea>
                    </SheetContent>
                  </Sheet>
                )}

                {/* Search */}
                <div className="relative flex-1 w-full sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search products..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-9 pr-9 h-9"
                  />
                  {searchInput && (
                    <button
                      type="button"
                      onClick={() => setSearchInput('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>

                {/* Sort */}
                <Select
                  value={filters.sort}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, sort: value, page: 1 }))
                  }
                >
                  <SelectTrigger className="w-[180px] h-9">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="price-asc">Price: Low to High</SelectItem>
                    <SelectItem value="price-desc">Price: High to Low</SelectItem>
                    <SelectItem value="rating">Rating</SelectItem>
                    <SelectItem value="popular">Popular</SelectItem>
                  </SelectContent>
                </Select>

                {/* Results count */}
                <span className="text-sm text-muted-foreground whitespace-nowrap ml-auto">
                  {productsLoading
                    ? 'Loading...'
                    : `Showing ${products.length} of ${totalProducts} products`}
                </span>
              </div>

              {/* Active filter chips */}
              {hasActiveFilters && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {filters.search && (
                    <Badge variant="secondary" className="gap-1">
                      Search: {filters.search}
                      <X
                        className="size-3 cursor-pointer"
                        onClick={() => {
                          setSearchInput('')
                          setFilters((prev) => ({ ...prev, search: '', page: 1 }))
                        }}
                      />
                    </Badge>
                  )}
                  {filters.categoryIds.map((id) => {
                    const cat = categories.find((c) => c.id === id) ||
                      categories.flatMap((c) => c.children || []).find((c) => c.id === id)
                    return cat ? (
                      <Badge key={id} variant="secondary" className="gap-1">
                        {cat.name}
                        <X
                          className="size-3 cursor-pointer"
                          onClick={() =>
                            setFilters((prev) => ({
                              ...prev,
                              categoryIds: prev.categoryIds.filter((c) => c !== id),
                              page: 1,
                            }))
                          }
                        />
                      </Badge>
                    ) : null
                  })}
                  {filters.brandIds.map((id) => {
                    const brand = brands.find((b) => b.id === id)
                    return brand ? (
                      <Badge key={id} variant="secondary" className="gap-1">
                        {brand.name}
                        <X
                          className="size-3 cursor-pointer"
                          onClick={() =>
                            setFilters((prev) => ({
                              ...prev,
                              brandIds: prev.brandIds.filter((b) => b !== id),
                              page: 1,
                            }))
                          }
                        />
                      </Badge>
                    ) : null
                  })}
                  {filters.minPrice && (
                    <Badge variant="secondary" className="gap-1">
                      Min: ${filters.minPrice}
                      <X
                        className="size-3 cursor-pointer"
                        onClick={() =>
                          setFilters((prev) => ({ ...prev, minPrice: '', page: 1 }))
                        }
                      />
                    </Badge>
                  )}
                  {filters.maxPrice && (
                    <Badge variant="secondary" className="gap-1">
                      Max: ${filters.maxPrice}
                      <X
                        className="size-3 cursor-pointer"
                        onClick={() =>
                          setFilters((prev) => ({ ...prev, maxPrice: '', page: 1 }))
                        }
                      />
                    </Badge>
                  )}
                  {filters.minRating > 0 && (
                    <Badge variant="secondary" className="gap-1">
                      {filters.minRating}+ Stars
                      <X
                        className="size-3 cursor-pointer"
                        onClick={() =>
                          setFilters((prev) => ({ ...prev, minRating: 0, page: 1 }))
                        }
                      />
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-muted-foreground"
                    onClick={clearAllFilters}
                  >
                    Clear all
                  </Button>
                </div>
              )}

              {/* Product Grid */}
              {productsError ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <p className="text-destructive font-medium mb-2">Failed to load products</p>
                  <p className="text-muted-foreground text-sm mb-4">
                    Something went wrong. Please try again.
                  </p>
                  <Button variant="outline" onClick={clearAllFilters}>
                    Clear Filters & Retry
                  </Button>
                </div>
              ) : productsLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <ProductCardSkeleton key={i} />
                  ))}
                </div>
              ) : products.length === 0 ? (
                <EmptyState hasFilters={hasActiveFilters} onClear={clearAllFilters} />
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={JSON.stringify(queryParams)}
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                  >
                    {products.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </motion.div>
                </AnimatePresence>
              )}

              {/* Pagination */}
              {!productsLoading && totalPages > 1 && (
                <div className="mt-8 flex justify-center">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          className={
                            currentPage <= 1
                              ? 'pointer-events-none opacity-50'
                              : 'cursor-pointer'
                          }
                          onClick={() =>
                            setFilters((prev) => ({
                              ...prev,
                              page: Math.max(1, prev.page - 1),
                            }))
                          }
                        />
                      </PaginationItem>

                      {generatePaginationPages(currentPage, totalPages).map(
                        (page, idx) =>
                          page === 'ellipsis' ? (
                            <PaginationItem key={`ellipsis-${idx}`}>
                              <PaginationEllipsis />
                            </PaginationItem>
                          ) : (
                            <PaginationItem key={page}>
                              <PaginationLink
                                isActive={page === currentPage}
                                className="cursor-pointer"
                                onClick={() =>
                                  setFilters((prev) => ({ ...prev, page }))
                                }
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          )
                      )}

                      <PaginationItem>
                        <PaginationNext
                          className={
                            currentPage >= totalPages
                              ? 'pointer-events-none opacity-50'
                              : 'cursor-pointer'
                          }
                          onClick={() =>
                            setFilters((prev) => ({
                              ...prev,
                              page: Math.min(totalPages, prev.page + 1),
                            }))
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
