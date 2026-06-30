/**
 * @file account-wishlist.tsx
 * @description Wishlist page for the ShopForge e-commerce account section.
 * Displays all products the user has saved to their wishlist as a responsive
 * grid of product cards. Each card shows the product image, name, price,
 * rating, and action buttons for adding to cart or removing from the wishlist.
 *
 * @keyfeatures
 * - Responsive product card grid (2-4 columns based on breakpoint)
 * - Individual product data fetched per card via TanStack Query
 * - Add to cart directly from the wishlist
 * - Remove items from wishlist with toast feedback
 * - Product image parsing from JSON string format
 * - Loading skeletons per card while product data loads
 * - Empty state with browse products call-to-action
 * - Force re-render mechanism after item removal
 */
'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Heart,
  Trash2,
  ShoppingCart,
  Star,
} from 'lucide-react'
import { useRouterStore } from '@/stores/router-store'
import { useCartStore } from '@/stores/cart-store'
import { useWishlistStore } from '@/stores/wishlist-store'
import { api } from '@/lib/api-client'
import { toast } from '@/hooks/use-toast'
import type { ProductListItem } from '@/types'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

import {
  AccountLayout,
  useAuthGuard,
  formatCurrency,
} from './account-layout'

// ============================================================================
// WishlistProductCard (internal helper)
// ============================================================================

/**
 * @function WishlistProductCard
 * @description Internal helper component that renders a single product card
 * within the wishlist. Fetches the product's details by ID, displays its
 * image, name, price, rating, and provides "Add to Cart" and "Remove" buttons.
 *
 * @param {Object} props - Component props
 * @param {string} props.productId - The ID of the wishlisted product to fetch and display
 * @param {() => void} props.onRemove - Callback invoked after the item is removed from the wishlist
 *
 * @state
 * - `product` - fetched via TanStack Query from /products/:productId API endpoint
 * - Uses useCartStore.addItem to add the product to the shopping cart
 * - Uses useWishlistStore.removeItem to remove the product from the wishlist
 *
 * @remarks
 * - Shows a loading skeleton while the product data is being fetched
 * - Returns null if the product fetch fails (e.g. product was deleted)
 * - Image field is parsed from JSON string to extract the first image URL
 * - Clicking the product image or name navigates to the product detail page
 */
function WishlistProductCard({
  productId,
  onRemove,
}: {
  productId: string
  onRemove: () => void
}) {
  const navigate = useRouterStore((s) => s.navigate)
  const addItem = useCartStore((s) => s.addItem)
  const removeItem = useWishlistStore((s) => s.removeItem)

  // Fetch individual product details by ID
  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: async (): Promise<ProductListItem | null> => {
      const result = await api.get<ProductListItem>(`/products/${productId}`)
      return result.success && result.data ? result.data : null
    },
    enabled: !!productId,
  })

  /**
   * Handles adding the wishlisted product to the shopping cart.
   * Parses the product image from JSON, constructs a cart item, and
   * shows a success toast notification.
   */
  const handleAddToCart = () => {
    if (!product) return
    // Parse the image field from JSON string to extract the first URL
    const images = (() => {
      try {
        const parsed = JSON.parse(product.images)
        return Array.isArray(parsed) ? parsed[0] : product.images
      } catch {
        return product.images
      }
    })()

    // Add the product to the cart store with quantity 1
    addItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      comparePrice: product.comparePrice || undefined,
      image: images,
      sku: product.id,
      quantity: 1,
    })
    toast({
      title: 'Added to cart',
      description: `${product.name} has been added to your cart.`,
    })
  }

  /**
   * Handles removing the product from the wishlist. Removes the item
   * from the wishlist store, triggers the parent's onRemove callback
   * for re-rendering, and shows a toast notification.
   */
  const handleRemove = () => {
    removeItem(productId)
    onRemove()
    toast({
      title: 'Removed from wishlist',
      description: 'Item has been removed from your wishlist.',
    })
  }

  // Loading state: skeleton placeholder while product data is being fetched
  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <Skeleton className="aspect-square w-full" />
        <CardContent className="p-4 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    )
  }

  // If the product no longer exists (e.g. was deleted), don't render the card
  if (!product) return null

  // Parse the main image URL from the product's images JSON string
  const mainImage = (() => {
    try {
      const parsed = JSON.parse(product.images)
      return Array.isArray(parsed) ? parsed[0] : product.images
    } catch {
      return product.images
    }
  })()

  return (
    <Card className="overflow-hidden group">
      {/* Product image - clickable to navigate to product detail page */}
      <div
        className="relative aspect-square bg-muted cursor-pointer overflow-hidden"
        onClick={() => navigate('product-detail', { id: product.id })}
      >
        <img
          src={mainImage}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <CardContent className="p-4">
        {/* Product name - clickable to navigate to product detail */}
        <h3
          className="font-medium text-sm truncate cursor-pointer hover:text-primary transition-colors"
          onClick={() => navigate('product-detail', { id: product.id })}
        >
          {product.name}
        </h3>
        {/* Price display with optional compare-at (original) price */}
        <div className="flex items-center gap-2 mt-1">
          <span className="font-bold text-sm">
            {formatCurrency(product.price)}
          </span>
          {product.comparePrice && (
            <span className="text-xs text-muted-foreground line-through">
              {formatCurrency(product.comparePrice)}
            </span>
          )}
        </div>
        {/* Rating display - shown only when the product has reviews */}
        {product.avgRating > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <Star className="size-3 fill-yellow-400 text-yellow-400" />
            <span className="text-xs text-muted-foreground">
              {product.avgRating.toFixed(1)} ({product.reviewCount})
            </span>
          </div>
        )}
      </CardContent>
      {/* Action buttons: Add to Cart and Remove from Wishlist */}
      <CardFooter className="p-4 pt-0 flex gap-2">
        <Button
          size="sm"
          className="flex-1 gap-1"
          onClick={handleAddToCart}
        >
          <ShoppingCart className="size-3.5" />
          Add to Cart
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0"
          onClick={handleRemove}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </CardFooter>
    </Card>
  )
}

// ============================================================================
// AccountWishlistPage
// ============================================================================

/**
 * @function AccountWishlistPage
 * @description Wishlist page that displays all products the user has saved
 * for later. Reads product IDs from the wishlist store and renders a
 * WishlistProductCard for each one. Uses a force re-render mechanism to
 * update the UI when items are removed.
 *
 * @state
 * - `isAuthenticated` - from useAuthGuard, ensures user is logged in
 * - `productIds` - from useWishlistStore, array of wishlisted product IDs
 * - `refresh` - local counter state used to force re-render after item removal
 *
 * @remarks
 * - Uses a refresh counter pattern because WishlistProductCard manages its own
 *   data fetching, and removing an item from the store doesn't automatically
 *   unmount the card. Incrementing the counter forces a re-render cycle.
 * - Empty state encourages the user to browse products
 */
export function AccountWishlistPage() {
  const isAuthenticated = useAuthGuard()
  const productIds = useWishlistStore((s) => s.productIds)
  // Refresh counter to force re-render after removing items from the wishlist
  const [, setRefresh] = useState(0)

  /**
   * Force re-render callback triggered when a wishlist item is removed.
   * Increments the refresh counter to cause the component to re-render
   * with the updated product IDs list.
   */
  const handleRemove = () => {
    setRefresh((prev) => prev + 1)
  }

  // Guard: don't render if not authenticated
  if (!isAuthenticated) return null

  return (
    <AccountLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Page Header - shows item count */}
        <div>
          <h1 className="text-2xl font-bold">My Wishlist</h1>
          <p className="text-muted-foreground mt-1">
            {productIds.length} item(s) saved for later
          </p>
        </div>

        {/* Wishlist Grid - empty state or product cards */}
        {productIds.length === 0 ? (
          /* Empty state: prompt user to browse and save products */
          <Card>
            <CardContent className="py-12 text-center">
              <Heart className="size-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-medium mb-1">Your wishlist is empty</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Save items you love for later.
              </p>
              <Button onClick={() => useRouterStore.getState().navigate('products')}>
                Browse Products
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Product card grid: 2 columns on mobile, 3 on tablet, 4 on desktop */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {productIds.map((id) => (
              <WishlistProductCard
                key={id}
                productId={id}
                onRemove={handleRemove}
              />
            ))}
          </div>
        )}
      </motion.div>
    </AccountLayout>
  )
}
