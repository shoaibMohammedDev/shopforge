// ============================================================================
// ShopForge Type Definitions
// ============================================================================

// ---- Router ----
export type RoutePath =
  | 'home'
  | 'products'
  | 'product-detail'
  | 'cart'
  | 'checkout'
  | 'login'
  | 'register'
  | 'account'
  | 'account-orders'
  | 'account-order-detail'
  | 'account-wishlist'
  | 'account-addresses'
  | 'account-settings'
  | 'admin'
  | 'admin-products'
  | 'admin-orders'
  | 'admin-customers'
  | 'admin-analytics'
  | 'admin-coupons'
  | 'admin-reviews'
  | 'admin-settings'
  | 'admin-banners'

export interface RouterState {
  currentRoute: RoutePath
  params: Record<string, string>
  navigate: (route: RoutePath, params?: Record<string, string>) => void
  goBack: () => void
  history: Array<{ route: RoutePath; params: Record<string, string> }>
}

// ---- Product ----
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
  flashSaleProduct?: { salePrice: number; flashSale: { isActive: boolean; startsAt: string; endsAt: string } }[]
}

export interface ProductDetail {
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
  variants: ProductVariant[]
  inventory: { id: string; quantity: number; reserved: number; lowStockThreshold: number; sku: string }[]
  tags: { tag: string }[]
  reviews: ReviewItem[]
  flashSaleProduct?: { salePrice: number; flashSale: { isActive: boolean; startsAt: string; endsAt: string } }[]
}

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

// ---- Cart ----
export interface CartItemDisplay {
  id: string
  productId: string
  variantId: string | null
  quantity: number
  product: {
    id: string
    name: string
    slug: string
    price: number
    comparePrice: number | null
    images: string
  }
  variant: {
    id: string
    name: string
    price: number
    attributes: string
  } | null
}

export interface CartDisplay {
  id: string
  items: CartItemDisplay[]
  coupon: {
    id: string
    code: string
    type: string
    value: number
    minPurchase: number
    maxDiscount: number | null
  } | null
}

// ---- Order ----
export interface OrderDisplay {
  id: string
  orderNumber: string
  status: string
  subtotal: number
  taxAmount: number
  shippingAmount: number
  discountAmount: number
  totalAmount: number
  shippingMethod: string | null
  trackingNumber: string | null
  createdAt: string
  items: OrderItemDisplay[]
  timeline: OrderTimelineItem[]
}

export interface OrderItemDisplay {
  id: string
  productId: string
  productName: string
  variantName: string | null
  sku: string
  price: number
  quantity: number
  total: number
  image: string | null
}

export interface OrderTimelineItem {
  id: string
  status: string
  message: string | null
  createdAt: string
}

// ---- Review ----
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

// ---- User ----
export interface UserProfile {
  id: string
  email: string
  name: string | null
  image: string | null
  role: string
  emailVerified: boolean
}

// ---- Category ----
export interface CategoryDisplay {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  parentId: string | null
  sortOrder: number
  _count?: { products: number }
  children?: CategoryDisplay[]
}

// ---- Brand ----
export interface BrandDisplay {
  id: string
  name: string
  slug: string
  logo: string | null
  _count?: { products: number }
}

// ---- Filters ----
export interface ProductFilters {
  search?: string
  categoryId?: string
  brandId?: string
  minPrice?: number
  maxPrice?: number
  minRating?: number
  sort?: 'price-asc' | 'price-desc' | 'rating' | 'newest' | 'popular'
  page?: number
  limit?: number
  isFeatured?: boolean
  tag?: string
}

// ---- API Response ----
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ---- Admin Stats ----
export interface AdminStats {
  totalRevenue: number
  totalOrders: number
  totalCustomers: number
  totalProducts: number
  revenueChange: number
  orderChange: number
  customerChange: number
  recentOrders: OrderDisplay[]
  topProducts: { product: { id: string; name: string; price: number; images: string }; totalSold: number; revenue: number }[]
  salesByMonth: { month: string; revenue: number; orders: number }[]
  ordersByStatus: { status: string; count: number }[]
}

// ---- Banner ----
export interface BannerDisplay {
  id: string
  title: string
  subtitle: string | null
  image: string
  link: string | null
  buttonText: string | null
  position: string
  sortOrder: number
}

// ---- Coupon ----
export interface CouponDisplay {
  id: string
  code: string
  type: string
  value: number
  minPurchase: number
  maxDiscount: number | null
  usageLimit: number | null
  usedCount: number
  perUserLimit: number | null
  isActive: boolean
  startsAt: string | null
  expiresAt: string | null
}

// ---- Address ----
export interface AddressDisplay {
  id: string
  label: string | null
  firstName: string
  lastName: string
  street1: string
  street2: string | null
  city: string
  state: string
  postalCode: string
  country: string
  phone: string | null
  isDefault: boolean
}
