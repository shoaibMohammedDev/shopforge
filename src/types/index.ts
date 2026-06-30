/**
 * @file types/index.ts
 * @description Centralized TypeScript type definitions for the ShopForge e-commerce application.
 *
 * This file serves as the single source of truth for all shared type definitions
 * used across the frontend. Types are organized by domain:
 *
 * - **Router**: Route identifiers and navigation state
 * - **Product**: Product listings, details, and variants
 * - **Cart**: Shopping cart items and cart display models
 * - **Order**: Order details, line items, and timeline events
 * - **Review**: Product review entries
 * - **User**: User profile data
 * - **Category**: Product category hierarchy
 * - **Brand**: Product brand information
 * - **Filters**: Product filtering and sorting parameters
 * - **API Response**: Standardized API response wrappers
 * - **Admin Stats**: Dashboard analytics data
 * - **Banner**: Promotional banner data
 * - **Coupon**: Discount coupon definitions
 * - **Address**: Shipping/billing address data
 *
 * Key Responsibilities:
 * - Provide strongly-typed contracts between API responses and UI components
 * - Ensure type safety across Zustand stores, hooks, and components
 * - Document the data shapes used throughout the application
 */

// ============================================================================
// Router
// ============================================================================

/**
 * Union type representing all navigable route identifiers in the application.
 *
 * Each value corresponds to a unique page/view in the SPA. The router store
 * uses these identifiers (rather than URL strings) for type-safe navigation.
 * URL mapping is handled separately in `router-store.ts`.
 *
 * Route naming convention:
 * - Top-level routes: single segment (e.g., `'home'`, `'cart'`, `'login'`)
 * - Nested routes: hyphen-separated hierarchy (e.g., `'account-orders'`, `'admin-analytics'`)
 * - Detail routes: suffixed with `-detail` (e.g., `'product-detail'`, `'account-order-detail'`)
 */
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

/**
 * Shape of the router state, exposed by the router Zustand store.
 *
 * Combines the current route context (route + params) with navigation actions
 * and a history stack for back-navigation support.
 *
 * @property currentRoute - The currently active route identifier
 * @property params - Key-value map of route parameters (path + query params)
 * @property navigate - Action to navigate to a new route with optional params
 * @property goBack - Action to navigate to the previous route in history
 * @property history - Ordered stack of visited routes (last entry = current)
 */
export interface RouterState {
  currentRoute: RoutePath
  params: Record<string, string>
  navigate: (route: RoutePath, params?: Record<string, string>) => void
  goBack: () => void
  history: Array<{ route: RoutePath; params: Record<string, string> }>
}

// ============================================================================
// Product
// ============================================================================

/**
 * Lightweight product representation used in listing views (search results, category pages).
 *
 * This is a denormalized, read-optimized shape returned by the product listing API.
 * It includes only the fields needed for product cards and list items — heavy data
 * like full descriptions and variants are excluded for performance.
 *
 * @property id - Unique product identifier
 * @property name - Display name of the product
 * @property slug - URL-friendly identifier for SEO-friendly product URLs
 * @property shortDesc - Truncated description for card/list preview; null if not provided
 * @property price - Current selling price (may reflect a sale price)
 * @property comparePrice - Original/list price before discount; used for strikethrough display.
 *   Null when there is no discount (i.e., price === comparePrice)
 * @property images - JSON-encoded string of image URL array; must be parsed before use
 * @property avgRating - Average customer rating (0.0–5.0)
 * @property reviewCount - Total number of verified reviews
 * @property totalSold - Cumulative units sold (used for "popular" sorting)
 * @property isFeatured - Whether the product is featured on the homepage
 * @property isActive - Whether the product is published and visible to customers
 * @property category - The product's primary category (id, name, slug)
 * @property brand - The product's brand; null if unbranded
 * @property inventory - Array of inventory records (one per variant or one for the base product).
 *   Each record tracks available quantity and reserved (allocated but unshipped) quantity
 * @property tags - Array of tag objects; each contains a `tag` string for filtering
 * @property flashSaleProduct - Optional array of active flash sale pricing entries.
 *   When present, `salePrice` overrides the regular `price` during the sale window
 */
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

/**
 * Full product representation used on the product detail page.
 *
 * Extends the listing model with comprehensive data needed for the detail view:
 * full description, variants, detailed inventory, reviews, and cost pricing.
 *
 * @property description - Full HTML/markdown product description
 * @property sku - Base SKU identifier; variants have their own SKUs
 * @property costPrice - Internal cost price for margin calculations; null if not tracked.
 *   Should never be exposed to customers
 * @property weight - Shipping weight (in the store's configured unit, typically kg)
 * @property dimensions - Shipping dimensions as a formatted string (e.g., "10x20x30 cm")
 * @property variants - Array of product variants (size, color, material, etc.)
 * @property inventory - Detailed inventory records including low-stock threshold and per-record SKU
 * @property reviews - Customer review entries for this product
 */
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

/**
 * A specific variant of a product (e.g., "Large / Red" for a t-shirt).
 *
 * Variants allow a single product to have multiple purchasable configurations
 * with potentially different prices, SKUs, and images.
 *
 * @property id - Unique variant identifier
 * @property name - Human-readable variant label (e.g., "Large / Red")
 * @property sku - Variant-specific SKU for inventory and order tracking
 * @property price - Variant-specific selling price (may differ from base product price)
 * @property comparePrice - Variant-specific list price; null if no discount
 * @property images - JSON-encoded string of variant-specific image URLs; null if
 *   the variant inherits the parent product's images
 * @property attributes - JSON-encoded string of variant attributes (e.g., color, size)
 *   stored as key-value pairs for programmatic access
 * @property isActive - Whether this variant is available for purchase
 * @property inventory - Optional inventory record for this specific variant;
 *   null if inventory is tracked at the product level only
 */
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

// ============================================================================
// Cart
// ============================================================================

/**
 * A single item within a server-side cart display model.
 *
 * Unlike `LocalCartItem` (used in the client-side cart store), this type
 * represents the cart item as returned by the API, with product and variant
 * data embedded as nested objects rather than flattened fields.
 *
 * @property id - The cart item's unique identifier
 * @property productId - The parent product's ID
 * @property variantId - The selected variant's ID; null for products without variants
 * @property quantity - Number of units in the cart
 * @property product - Embedded product data for display (name, price, images)
 * @property variant - Embedded variant data; null if no variant is selected
 */
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

/**
 * Server-side cart display model returned by the cart API.
 *
 * Includes the cart items and any applied coupon with its full details,
 * enabling the frontend to calculate discounts without additional API calls.
 *
 * @property id - The cart's unique identifier
 * @property items - Array of cart items with embedded product/variant data
 * @property coupon - The currently applied coupon, or null if none is applied.
 *   Contains all fields needed for discount calculation on the frontend
 */
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

// ============================================================================
// Order
// ============================================================================

/**
 * Full order display model with items, totals, and status timeline.
 *
 * Used on the order detail page and in order listing cards. All monetary
 * values are in the store's base currency.
 *
 * @property id - Unique order identifier
 * @property orderNumber - Human-facing order reference number (e.g., "SF-2024-00123")
 * @property status - Current order status (e.g., "pending", "processing", "shipped", "delivered")
 * @property subtotal - Sum of item prices before tax, shipping, and discounts
 * @property taxAmount - Total tax applied to the order
 * @property shippingAmount - Shipping cost
 * @property discountAmount - Total discount from applied coupons
 * @property totalAmount - Final amount charged to the customer (subtotal + tax + shipping - discount)
 * @property shippingMethod - Name of the selected shipping method; null if not yet chosen
 * @property trackingNumber - Carrier tracking number; null until the order is shipped
 * @property createdAt - ISO 8601 timestamp of when the order was placed
 * @property items - Array of ordered items with pricing at time of purchase
 * @property timeline - Ordered list of status change events for the order timeline UI
 */
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

/**
 * A single line item within an order.
 *
 * Captures the product details at the time of purchase (not the current
 * product state), ensuring historical accuracy even if the product's
 * price or name changes later.
 *
 * @property id - Unique order item identifier
 * @property productId - Reference to the original product
 * @property productName - Product name at time of purchase
 * @property variantName - Variant name at time of purchase; null if no variant
 * @property sku - SKU at time of purchase
 * @property price - Unit price at time of purchase
 * @property quantity - Number of units ordered
 * @property total - Line total (price × quantity)
 * @property image - Product image URL at time of purchase; null if no image
 */
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

/**
 * A single entry in the order status timeline.
 *
 * Represents a state transition in the order's lifecycle (e.g., "placed",
 * "shipped", "delivered"), displayed chronologically in the order detail UI.
 *
 * @property id - Unique timeline entry identifier
 * @property status - The status the order transitioned to
 * @property message - Optional human-readable description of the transition;
 *   null if the status change is self-explanatory
 * @property createdAt - ISO 8601 timestamp of when this status change occurred
 */
export interface OrderTimelineItem {
  id: string
  status: string
  message: string | null
  createdAt: string
}

// ============================================================================
// Review
// ============================================================================

/**
 * A customer review for a product.
 *
 * Includes the review content, rating, and the reviewer's basic profile.
 * Reviews are displayed on the product detail page.
 *
 * @property id - Unique review identifier
 * @property rating - Star rating from 1 to 5
 * @property title - Optional review headline; null if not provided
 * @property content - Full review body text; null if only a rating was submitted
 * @property images - JSON-encoded string of review image URLs uploaded by the customer;
 *   null if no images were attached
 * @property isVerified - Whether the reviewer actually purchased the product
 *   (verified purchase badge)
 * @property helpfulYes - Number of "helpful" votes from other customers
 * @property helpfulNo - Number of "not helpful" votes from other customers
 * @property createdAt - ISO 8601 timestamp of when the review was submitted
 * @property user - Basic profile of the reviewer (name and avatar)
 */
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

// ============================================================================
// User
// ============================================================================

/**
 * Authenticated user profile data.
 *
 * Stored in the auth Zustand store and persisted to localStorage.
 * Contains only non-sensitive display information — passwords and tokens
 * are managed server-side via HTTP-only cookies.
 *
 * @property id - Unique user identifier
 * @property email - User's email address (used as login identifier)
 * @property name - Display name; null if the user hasn't set one
 * @property image - Profile avatar URL; null if no avatar is set
 * @property role - User role for authorization (e.g., "customer", "admin")
 * @property emailVerified - Whether the user has confirmed their email address
 */
export interface UserProfile {
  id: string
  email: string
  name: string | null
  image: string | null
  role: string
  emailVerified: boolean
}

// ============================================================================
// Category
// ============================================================================

/**
 * Product category display model supporting hierarchical (tree) structures.
 *
 * Categories can be nested via the `parentId` and `children` fields,
 * enabling multi-level category navigation (e.g., Clothing → Men → Shirts).
 *
 * @property id - Unique category identifier
 * @property name - Display name of the category
 * @property slug - URL-friendly identifier for SEO-friendly category URLs
 * @property description - Category description; null if not provided
 * @property image - Category banner/thumbnail image URL; null if no image
 * @property parentId - ID of the parent category; null for top-level categories
 * @property sortOrder - Numeric sort order for display ordering (lower = first)
 * @property _count - Optional aggregate count of products in this category;
 *   prefixed with underscore to indicate it's a computed field, not a DB column
 * @property children - Optional array of sub-categories for tree rendering;
 *   only populated when the API is requested with tree inclusion
 */
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

// ============================================================================
// Brand
// ============================================================================

/**
 * Product brand display model.
 *
 * Brands are used for brand-based filtering and navigation.
 *
 * @property id - Unique brand identifier
 * @property name - Display name of the brand
 * @property slug - URL-friendly identifier for SEO-friendly brand URLs
 * @property logo - Brand logo image URL; null if no logo is uploaded
 * @property _count - Optional aggregate count of products belonging to this brand
 */
export interface BrandDisplay {
  id: string
  name: string
  slug: string
  logo: string | null
  _count?: { products: number }
}

// ============================================================================
// Filters
// ============================================================================

/**
 * Parameters for filtering, sorting, and paginating product listings.
 *
 * All fields are optional — when omitted, the API applies sensible defaults.
 * This type is used both as the query parameter shape for the products API
 * and as the state shape for the product filter UI components.
 *
 * @property search - Free-text search query matching product name/description
 * @property categoryId - Filter by category ID
 * @property brandId - Filter by brand ID
 * @property minPrice - Minimum price filter (inclusive)
 * @property maxPrice - Maximum price filter (inclusive)
 * @property minRating - Minimum average rating filter (inclusive, 1–5)
 * @property sort - Sort strategy for the results:
 *   - 'price-asc': Lowest price first
 *   - 'price-desc': Highest price first
 *   - 'rating': Highest rated first
 *   - 'newest': Most recently created first
 *   - 'popular': Most sold first
 * @property page - Page number for pagination (1-based)
 * @property limit - Number of items per page
 * @property isFeatured - When true, filter to only featured products
 * @property tag - Filter by tag string (exact match)
 */
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

// ============================================================================
// API Response
// ============================================================================

/**
 * Standardized API response wrapper.
 *
 * All API endpoints return responses in this shape for consistent error
 * handling and data access across the frontend.
 *
 * @typeParam T - The type of the response data payload
 * @property success - Whether the API request completed successfully
 * @property data - The response payload; undefined on error or when no data is returned
 * @property error - Error message when `success` is false; undefined on success
 * @property message - Optional informational message (e.g., confirmation text)
 */
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

/**
 * Paginated API response wrapper with metadata.
 *
 * Wraps a page of items with pagination metadata, enabling the frontend
 * to render page controls and calculate total pages.
 *
 * @typeParam T - The type of the items in the paginated result set
 * @property items - The array of items on the current page
 * @property total - Total number of items across all pages
 * @property page - Current page number (1-based)
 * @property limit - Number of items per page
 * @property totalPages - Total number of available pages (calculated as ceil(total / limit))
 */
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ============================================================================
// Admin Stats
// ============================================================================

/**
 * Aggregated statistics for the admin dashboard.
 *
 * Contains key performance indicators (KPIs), recent activity, and
 * breakdowns for chart visualizations. All monetary values are in
 * the store's base currency.
 *
 * @property totalRevenue - Total revenue across all orders
 * @property totalOrders - Total number of orders placed
 * @property totalCustomers - Total number of registered customers
 * @property totalProducts - Total number of active products
 * @property revenueChange - Revenue change percentage vs. previous period (e.g., 12.5 for +12.5%)
 * @property orderChange - Order count change percentage vs. previous period
 * @property customerChange - Customer count change percentage vs. previous period
 * @property recentOrders - Latest orders for the dashboard's recent activity section
 * @property topProducts - Best-selling products by revenue for the top products chart
 * @property salesByMonth - Monthly revenue and order counts for the sales trend chart
 * @property ordersByStatus - Order count breakdown by status for the status distribution chart
 */
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

// ============================================================================
// Banner
// ============================================================================

/**
 * Promotional banner for the homepage or other pages.
 *
 * Banners are managed by admins and displayed in designated positions
 * on the storefront (e.g., hero slider, sidebar promotions).
 *
 * @property id - Unique banner identifier
 * @property title - Banner headline text
 * @property subtitle - Secondary text below the title; null if not provided
 * @property image - Banner background/image URL (required for display)
 * @property link - URL to navigate to when the banner is clicked; null if non-interactive
 * @property buttonText - Call-to-action button text; null if no button should be shown
 * @property position - Where the banner is displayed (e.g., "hero", "sidebar", "footer")
 * @property sortOrder - Numeric sort order for display ordering within the same position
 */
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

// ============================================================================
// Coupon
// ============================================================================

/**
 * Discount coupon definition.
 *
 * Coupons can be either percentage-based or fixed-amount, with optional
 * constraints on minimum purchase and maximum discount.
 *
 * @property id - Unique coupon identifier
 * @property code - The coupon code string that customers enter (e.g., "SAVE20")
 * @property type - Discount type: "percentage" for % off, "fixed" for flat amount off
 * @property value - The discount value (percentage as 0–100, or fixed amount in currency)
 * @property minPurchase - Minimum order subtotal required to apply this coupon
 * @property maxDiscount - Maximum discount amount (caps percentage discounts);
 *   null means no cap
 * @property usageLimit - Total number of times this coupon can be used across all users;
 *   null means unlimited
 * @property usedCount - Number of times this coupon has been used so far
 * @property perUserLimit - Maximum times a single user can apply this coupon;
 *   null means unlimited per user
 * @property isActive - Whether the coupon is currently available for use
 * @property startsAt - ISO 8601 timestamp when the coupon becomes valid; null means immediately
 * @property expiresAt - ISO 8601 timestamp when the coupon expires; null means never expires
 */
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

// ============================================================================
// Address
// ============================================================================

/**
 * Shipping or billing address.
 *
 * Used during checkout and stored in the user's address book for reuse.
 * Addresses follow a standard international format compatible with most
 * shipping carriers and address validation services.
 *
 * @property id - Unique address identifier
 * @property label - User-friendly label for the address (e.g., "Home", "Office");
 *   null if not labeled
 * @property firstName - Recipient's first name
 * @property lastName - Recipient's last name
 * @property street1 - Primary street address line (e.g., "123 Main St")
 * @property street2 - Secondary address line (e.g., "Apt 4B"); null if not needed
 * @property city - City/locality name
 * @property state - State/province/region name or code
 * @property postalCode - ZIP/postal code
 * @property country - Country name or ISO code
 * @property phone - Contact phone number for delivery; null if not provided
 * @property isDefault - Whether this is the user's default address (pre-selected at checkout)
 */
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
