// ============================================================================
// ShopForge - Product DTOs (Data Transfer Objects)
// Typed interfaces for API request/response payloads
// ============================================================================

// ---- Request DTOs ----
export interface ProductListQueryDTO {
  search?: string
  categoryId?: string
  brandId?: string
  minPrice?: number
  maxPrice?: number
  minRating?: number
  sort?: 'newest' | 'price-asc' | 'price-desc' | 'rating' | 'popular'
  page?: number
  limit?: number
  isFeatured?: boolean
  tag?: string
}

export interface ProductDetailQueryDTO {
  id: string
}

export interface CreateProductDTO {
  name: string
  description: string
  shortDesc?: string
  price: number
  comparePrice?: number
  categoryId: string
  brandId?: string
  stock?: number
  images?: string[]
  isFeatured?: boolean
  isDigital?: boolean
  weight?: number
  dimensions?: string
}

export interface UpdateProductDTO {
  name?: string
  description?: string
  price?: number
  comparePrice?: number
  isActive?: boolean
  isFeatured?: boolean
}

// ---- Response DTOs ----
export interface ProductListItemDTO {
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
  flashSaleProduct?: Array<{
    salePrice: number
    flashSale: { isActive: boolean; startsAt: string; endsAt: string }
  }>
}

export interface ProductDetailDTO {
  id: string
  name: string
  slug: string
  description: string
  shortDesc: string | null
  sku: string
  price: number
  comparePrice: number | null
  costPrice: number | null
  images: string
  isActive: boolean
  isFeatured: boolean
  weight: number | null
  dimensions: string | null
  avgRating: number
  reviewCount: number
  totalSold: number
  category: { id: string; name: string; slug: string }
  brand: { id: string; name: string; slug: string } | null
  variants: ProductVariantDTO[]
  inventory: Array<{ id: string; quantity: number; reserved: number; lowStockThreshold: number; sku: string }>
  tags: { tag: string }[]
  reviews: ReviewDTO[]
  flashSaleProduct?: Array<{
    salePrice: number
    flashSale: { isActive: boolean; startsAt: string; endsAt: string }
  }>
}

export interface ProductVariantDTO {
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

export interface ReviewDTO {
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

export interface PaginatedProductsDTO {
  items: ProductListItemDTO[]
  total: number
  page: number
  limit: number
  totalPages: number
}
