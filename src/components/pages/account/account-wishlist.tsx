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

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: async (): Promise<ProductListItem | null> => {
      const result = await api.get<ProductListItem>(`/products/${productId}`)
      return result.success && result.data ? result.data : null
    },
    enabled: !!productId,
  })

  const handleAddToCart = () => {
    if (!product) return
    const images = (() => {
      try {
        const parsed = JSON.parse(product.images)
        return Array.isArray(parsed) ? parsed[0] : product.images
      } catch {
        return product.images
      }
    })()

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

  const handleRemove = () => {
    removeItem(productId)
    onRemove()
    toast({
      title: 'Removed from wishlist',
      description: 'Item has been removed from your wishlist.',
    })
  }

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

  if (!product) return null

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
        <h3
          className="font-medium text-sm truncate cursor-pointer hover:text-primary transition-colors"
          onClick={() => navigate('product-detail', { id: product.id })}
        >
          {product.name}
        </h3>
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
        {product.avgRating > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <Star className="size-3 fill-yellow-400 text-yellow-400" />
            <span className="text-xs text-muted-foreground">
              {product.avgRating.toFixed(1)} ({product.reviewCount})
            </span>
          </div>
        )}
      </CardContent>
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

export function AccountWishlistPage() {
  const isAuthenticated = useAuthGuard()
  const productIds = useWishlistStore((s) => s.productIds)
  const [, setRefresh] = useState(0)

  const handleRemove = () => {
    setRefresh((prev) => prev + 1)
  }

  if (!isAuthenticated) return null

  return (
    <AccountLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div>
          <h1 className="text-2xl font-bold">My Wishlist</h1>
          <p className="text-muted-foreground mt-1">
            {productIds.length} item(s) saved for later
          </p>
        </div>

        {productIds.length === 0 ? (
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
