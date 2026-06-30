/**
 * @file products-page.tsx
 * @description Products listing page for the ShopForge e-commerce application.
 * Displays a filterable, searchable, and sortable grid of products with
 * pagination, breadcrumb navigation, and responsive filter sidebar.
 *
 * @key_features
 * - Full-text search with debounced input (400ms delay)
 * - Multi-faceted filtering: category, brand, price range, and rating
 * - Sort options: newest, price (asc/desc), rating, popularity
 * - Desktop: persistent sidebar filters; Mobile: sheet-based filter drawer
 * - Active filter chips with individual removal
 * - Paginated product grid with skeleton loading states
 * - Breadcrumb navigation reflecting active category
 * - Empty state for zero results with "clear filters" action
 */

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
import { useRouterStore } from "@/shared/stores/router-store"
import { useCartStore, type LocalCartItem } from "@/modules/cart/stores/cart-store"
import { useWishlistStore } from "@/modules/wishlist/stores/wishlist-store"
import { api } from "@/shared/lib/api-client"
import { useIsMobile } from "@/shared/hooks/use-mobile"
import type {
  ProductListItem,
  CategoryDisplay,
  BrandDisplay,
  PaginatedResponse,
  ProductFilters,
} from "@/shared/types"

import { Button } from "@/shared/components/ui/button"
import { Card, CardContent } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { Input } from "@/shared/components/ui/input"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { Label } from "@/shared/components/ui/label"
import { Separator } from "@/shared/components/ui/separator"
import { ScrollArea } from "@/shared/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/shared/components/ui/sheet"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/shared/components/ui/breadcrumb"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/shared/components/ui/pagination"

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
 * Framer Motion animation variants for the products page.
 * - staggerContainer: Parent container that staggers children entrance animations
 * - staggerItem: Individual child item animation with slide-up effect
 */
const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
}

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
}

// ============================================================================
// Helpers
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
// Filter State Interface
// ============================================================================

/**
 * FilterState - Represents the current state of all product filters.
 * Each filter change resets the page to 1 to avoid empty results on higher pages.
 *
 * @property {string} search - Full-text search query string
 * @property {string[]} categoryIds - Array of selected category IDs (multi-select)
 * @property {string[]} brandIds - Array of selected brand IDs (multi-select)
 * @property {string} minPrice - Minimum price filter (empty string means no filter)
 * @property {string} maxPrice - Maximum price filter (empty string means no filter)
 * @property {number} minRating - Minimum star rating filter (0 means no filter)
 * @property {string} sort - Current sort option key
 * @property {number} page - Current pagination page number
 */
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

/** Default filter state with no active filters and newest sort order */
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

/**
 * StarRatingFilter - A clickable star rating filter for the sidebar.
 * Displays options for "4 stars & up", "3 stars & up", etc.
 * Clicking an active rating deselects it (toggles off).
 *
 * @param {Object} props
 * @param {number} props.value - The currently selected minimum rating (0 = no filter).
 * @param {(rating: number) => void} props.onChange - Callback when the minimum rating changes.
 */
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
          {/* Render 5 stars for this rating level */}
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

/**
 * FilterSidebarContent - The filter UI shared between the desktop sidebar and mobile sheet.
 * Contains category checkboxes, brand checkboxes, price range inputs,
 * star rating filter, and optional "Apply Filters" button for mobile.
 *
 * @param {Object} props
 * @param {FilterState} props.filters - Current filter state object.
 * @param {React.Dispatch<React.SetStateAction<FilterState>>} props.setFilters - State setter for filters.
 * @param {CategoryDisplay[]} props.categories - Available categories for the category filter.
 * @param {BrandDisplay[]} props.brands - Available brands for the brand filter.
 * @param {boolean} props.categoriesLoading - Whether categories are still loading.
 * @param {boolean} props.brandsLoading - Whether brands are still loading.
 * @param {() => void} [props.onClose] - Optional close callback for the mobile sheet drawer.
 */
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
  /**
   * Toggles a category ID in the filter. Removes it if already selected,
   * adds it if not. Resets page to 1 on change.
   */
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

  /**
   * Toggles a brand ID in the filter. Removes it if already selected,
   * adds it if not. Resets page to 1 on change.
   */
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

  /**
   * Resets all filters to their default values and closes the mobile sheet if open.
   */
  const clearFilters = useCallback(() => {
    setFilters({ ...defaultFilters })
    onClose?.()
  }, [setFilters, onClose])

  // Determine if any non-search filters are active (for showing "Clear All" button)
  const hasActiveFilters =
    filters.categoryIds.length > 0 ||
    filters.brandIds.length > 0 ||
    filters.minPrice !== '' ||
    filters.maxPrice !== '' ||
    filters.minRating > 0

  return (
    <div className="space-y-6">
      {/* Header with Clear All button when filters are active */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm uppercase tracking-wider">Filters</h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
            Clear All
          </Button>
        )}
      </div>

      <Separator />

      {/* Category Filter - checkboxes for each category and its children */}
      <div className="space-y-3">
        <h4 className="font-medium text-sm">Category</h4>
        {categoriesLoading ? (
          /* Skeleton placeholders while categories are loading */
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        ) : (
          <ScrollArea className="max-h-48">
            <div className="space-y-2 pr-2">
              {/* Parent categories */}
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
              {/* Nested child categories (indented with pl-4) */}
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

      {/* Brand Filter - checkboxes for each brand */}
      <div className="space-y-3">
        <h4 className="font-medium text-sm">Brand</h4>
        {brandsLoading ? (
          /* Skeleton placeholders while brands are loading */
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

      {/* Price Range - min/max number inputs */}
      <div className="space-y-3">
        <h4 className="font-medium text-sm">Price Range</h4>
        <div className="flex items-center gap-2">
          {/* Minimum price input - updates filter and resets page */}
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
          {/* Maximum price input - updates filter and resets page */}
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

      {/* Rating Filter - star rating buttons */}
      <div className="space-y-3">
        <h4 className="font-medium text-sm">Rating</h4>
        <StarRatingFilter
          value={filters.minRating}
          onChange={(rating) =>
            setFilters((prev) => ({ ...prev, minRating: rating, page: 1 }))
          }
        />
      </div>

      {/* Mobile Apply Button - only shown in the mobile sheet drawer context */}
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

/**
 * ProductCard - A card component for displaying a single product in the listing grid.
 *
 * Renders the product image (or a gradient placeholder), discount/flash sale badges,
 * an out-of-stock overlay, a wishlist toggle button, brand name, product name,
 * star rating, price with optional strikethrough, and an "Add to Cart" button.
 * The wishlist button is hidden until hover for a cleaner look.
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
    ? Math.round(
        ((product.comparePrice! - product.price) / product.comparePrice!) * 100
      )
    : 0

  // Use flash sale price if the product is part of an active flash sale; otherwise use regular price
  const displayPrice =
    product.flashSaleProduct?.[0]?.salePrice ?? product.price

  // Calculate total available inventory across all inventory records
  const totalInventory = product.inventory.reduce(
    (sum, inv) => sum + inv.quantity - inv.reserved,
    0
  )
  const inStock = totalInventory > 0

  /**
   * Handles adding the product to the cart.
   * Stops event propagation to prevent triggering the card's navigation onClick.
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

          {/* Out of stock overlay - dims the image and shows a badge */}
          {!inStock && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
              <Badge variant="secondary" className="text-xs font-medium">
                Out of Stock
              </Badge>
            </div>
          )}

          {/* Wishlist button - only visible on hover (opacity-0 group-hover:opacity-100) */}
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
                product.flashSaleProduct?.[0] && product.flashSaleProduct[0].flashSale?.isActive
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

          {/* Add to cart button - disabled when out of stock */}
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
// Empty State
// ============================================================================

/**
 * EmptyState - Displayed when no products match the current filters.
 * Shows a contextual message and a "Clear All Filters" button when filters are active.
 *
 * @param {Object} props
 * @param {boolean} props.hasFilters - Whether any filters are currently active.
 * @param {() => void} props.onClear - Callback to clear all active filters.
 */
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
      {/* Contextual message based on whether filters are active */}
      <p className="text-muted-foreground mb-6 max-w-md">
        {hasFilters
          ? 'We couldn\'t find any products matching your filters. Try adjusting your search criteria.'
          : 'There are no products available at the moment. Check back soon!'}
      </p>
      {/* Only show clear button when filters are active */}
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

/**
 * Generates an array of page numbers and ellipsis markers for pagination display.
 * Implements a smart truncation strategy:
 * - Shows all pages if total is 7 or fewer
 * - Otherwise shows first page, last page, current page ±1, and ellipsis as needed
 *
 * @param {number} currentPage - The currently active page number.
 * @param {number} totalPages - The total number of pages.
 * @returns {(number | 'ellipsis')[]} Array of page numbers and 'ellipsis' strings for rendering.
 *
 * @example
 * generatePaginationPages(5, 10) // => [1, 'ellipsis', 4, 5, 6, 'ellipsis', 10]
 * generatePaginationPages(2, 5)  // => [1, 2, 3, 4, 5]
 */
function generatePaginationPages(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
  // If total pages is small enough, show all page numbers without ellipsis
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const pages: (number | 'ellipsis')[] = [1]

  // Add leading ellipsis if current page is far from the start
  if (currentPage > 3) {
    pages.push('ellipsis')
  }

  // Show current page and its immediate neighbors
  const start = Math.max(2, currentPage - 1)
  const end = Math.min(totalPages - 1, currentPage + 1)

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }

  // Add trailing ellipsis if current page is far from the end
  if (currentPage < totalPages - 2) {
    pages.push('ellipsis')
  }

  // Always include the last page
  pages.push(totalPages)
  return pages
}

// ============================================================================
// Main ProductsPage Component
// ============================================================================

/**
 * ProductsPage - The main product listing page for the ShopForge e-commerce platform.
 *
 * Displays a filterable, searchable, and sortable grid of products with:
 * - Responsive filter sidebar (desktop) / sheet drawer (mobile)
 * - Debounced search input
 * - Sort dropdown
 * - Active filter chips with individual removal
 * - Paginated product grid
 * - Breadcrumb navigation
 *
 * @state
 * - filters: Current FilterState controlling all filter/sort/page parameters
 * - searchInput: Raw search input value (debounced before updating filters.search)
 * - mobileFiltersOpen: Controls visibility of the mobile filter sheet
 *
 * @data_fetching
 * - Products (paginated, filtered, sorted via query params)
 * - Categories (for the category filter)
 * - Brands (for the brand filter)
 */
export default function ProductsPage() {
  const navigate = useRouterStore((s) => s.navigate)
  const params = useRouterStore((s) => s.params)
  const isMobile = useIsMobile()
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  // Initialize filters from router params (e.g., when navigating from homepage category click)
  const [filters, setFilters] = useState<FilterState>(() => ({
    ...defaultFilters,
    search: params.search || '',
    categoryIds: params.categoryId ? [params.categoryId] : [],
    brandIds: params.brandId ? [params.brandId] : [],
    sort: params.sort || defaultFilters.sort,
  }))

  // Search input with debounce - the raw input updates immediately for UX,
  // but the actual filter state updates after a 400ms delay
  const [searchInput, setSearchInput] = useState(filters.search)

  /**
   * Debounce effect: Updates filters.search after 400ms of inactivity
   * on the search input. This prevents excessive API calls while typing.
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchInput, page: 1 }))
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  /**
   * Build the query parameters object from the current filter state.
   * Only includes non-default/non-empty values to keep the API request clean.
   */
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

  /** Fetch products with the current filter/sort/page parameters */
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

  /** Fetch all categories for the filter sidebar */
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

  /** Fetch all brands for the filter sidebar */
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

  /**
   * Find the active category name for the breadcrumb display.
   * Recursively searches through categories and their children.
   */
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

  // Determine if any filters are active (including search) for chip display
  const hasActiveFilters =
    filters.categoryIds.length > 0 ||
    filters.brandIds.length > 0 ||
    filters.minPrice !== '' ||
    filters.maxPrice !== '' ||
    filters.minRating > 0 ||
    filters.search !== ''

  /**
   * Clears all filters back to defaults and resets the search input.
   */
  const clearAllFilters = useCallback(() => {
    setFilters({ ...defaultFilters })
    setSearchInput('')
  }, [])

  // Extract pagination data from the API response
  const products = productsData?.items ?? []
  const totalProducts = productsData?.total ?? 0
  const totalPages = productsData?.totalPages ?? 0
  const currentPage = productsData?.page ?? 1

  return (
    <div className="min-h-screen flex flex-col">
      {/* Breadcrumb navigation bar - shows Home > Products > [Category] path */}
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
                {/* If a category is active, "Products" becomes a link to clear the category filter */}
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
              {/* Show the active category name as the final breadcrumb if one is selected */}
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

      {/* Main content area with sidebar + product grid layout */}
      <div className="flex-1">
        <div className="container mx-auto px-4 py-6">
          <div className="flex gap-6">
            {/* Desktop Filter Sidebar - fixed width, sticky position, hidden on mobile */}
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
                {/* Mobile Filter Button - opens a sheet drawer with filter content */}
                {isMobile && (
                  <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2 shrink-0">
                        <SlidersHorizontal className="size-4" />
                        Filters
                        {/* Show active filter count badge */}
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
                    {/* Mobile filter sheet - slides in from the left */}
                    <SheetContent side="left" className="w-[320px] sm:w-[380px] p-0 flex flex-col">
                      <SheetHeader className="px-4 pt-4 pb-2">
                        <SheetTitle className="flex items-center gap-2">
                          <SlidersHorizontal className="size-5" />
                          Filter Products
                        </SheetTitle>
                        {/* Screen reader only description for accessibility */}
                        <SheetDescription className="sr-only">
                          Filter products by category, brand, price, and rating
                        </SheetDescription>
                      </SheetHeader>
                      <div className="flex-1 overflow-y-auto px-4 pb-4">
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
                    </SheetContent>
                  </Sheet>
                )}

                {/* Search input with icon and clear button */}
                <div className="relative flex-1 w-full sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search products..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-9 pr-9 h-9"
                  />
                  {/* Clear search button - only shown when there's text in the input */}
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

                {/* Sort dropdown - resets page to 1 on change */}
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

                {/* Results count display */}
                <span className="text-sm text-muted-foreground whitespace-nowrap ml-auto">
                  {productsLoading
                    ? 'Loading...'
                    : `Showing ${products.length} of ${totalProducts} products`}
                </span>
              </div>

              {/* Active filter chips - each chip shows the filter value with an X to remove it */}
              {hasActiveFilters && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {/* Search filter chip */}
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
                  {/* Category filter chips */}
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
                  {/* Brand filter chips */}
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
                  {/* Min price filter chip */}
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
                  {/* Max price filter chip */}
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
                  {/* Min rating filter chip */}
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
                  {/* Clear all button */}
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

              {/* Product Grid - shows error, loading, empty, or products */}
              {productsError ? (
                /* Error state with retry option */
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
                /* Loading skeleton: 12 placeholder cards matching the grid layout */
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <ProductCardSkeleton key={i} />
                  ))}
                </div>
              ) : products.length === 0 ? (
                /* Empty state when no products match the current filters */
                <EmptyState hasFilters={hasActiveFilters} onClear={clearAllFilters} />
              ) : (
                /* Product grid with AnimatePresence for smooth transitions when filters change */
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

              {/* Pagination - only shown when there are multiple pages */}
              {!productsLoading && totalPages > 1 && (
                <div className="mt-8 flex justify-center">
                  <Pagination>
                    <PaginationContent>
                      {/* Previous page button - disabled on first page */}
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

                      {/* Page number buttons with ellipsis for large page counts */}
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

                      {/* Next page button - disabled on last page */}
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
