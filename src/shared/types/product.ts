/**
 * @file shared/types/product.ts
 * @description Product domain type definitions.
 */

/** Lightweight product for listing grids. */
export interface ProductListItem {
  id: string
  name: string
  slug: string
  shortDesc: string | null
  price: number
  comparePrice: number | null
  images: string
  avgRating: number
  reviewCount: number
  totalSold: number
  isFeatured: boolean
  isActive: boolean
  category: { id: string; name: string; slug: string }
  brand: { id: string; name: string; slug: string } | null
  inventory: { quantity: number; reserved: number }[]
  tags: { tag: string }[]
  flashSaleProduct?: {
    salePrice: number
    flashSale: { isActive: boolean; startsAt: string; endsAt: string }
  }[]
}

/** Full product detail with variants, reviews, and inventory. */
export interface ProductDetail {
  id: string
  name: string
  slug: string
  description: string
  shortDesc: string | null
  price: number
  comparePrice: number | null
  sku: string
  costPrice: number | null
  images: string
  avgRating: number
  reviewCount: number
  totalSold: number
  isFeatured: boolean
  isActive: boolean
  weight: number | null
  dimensions: string | null
  category: { id: string; name: string; slug: string }
  brand: { id: string; name: string; slug: string } | null
  inventory: { id: string; quantity: number; reserved: number; lowStockThreshold: number; sku: string }[]
  tags: { tag: string }[]
  variants: ProductVariant[]
  reviews: ReviewItem[]
  flashSaleProduct?: {
    salePrice: number
    flashSale: { isActive: boolean; startsAt: string; endsAt: string }
  }[]
  createdAt: string
  updatedAt: string
}

/** Product variant with its own price and inventory. */
export interface ProductVariant {
  id: string
  name: string
  sku: string
  price: number
  comparePrice: number | null
  images: string | null
  attributes: string
  isActive: boolean
  inventory?: { id: string; quantity: number; reserved: number } | null
}

/** A single product review. */
export interface ReviewItem {
  id: string
  rating: number
  title: string | null
  content: string | null
  images: string | null
  isVerified: boolean
  helpfulYes: number
  helpfulNo: number
  createdAt: string
  user: { id: string; name: string | null; image: string | null }
}

/** Product filter/sort query parameters. */
export interface ProductFilters {
  search?: string
  categoryId?: string
  brandId?: string
  minPrice?: number
  maxPrice?: number
  minRating?: number
  sort?: 'newest' | 'price-asc' | 'price-desc' | 'rating' | 'popular' | 'best-selling'
  page?: number
  limit?: number
  isFeatured?: boolean
  tag?: string
}
