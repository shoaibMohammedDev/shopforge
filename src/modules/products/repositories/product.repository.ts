// ============================================================================
// File: product.repository.ts
// Description: Data access layer for product-related operations in ShopForge
// Key Responsibilities:
//   - Find products with advanced filtering (search, category, brand, price,
//     rating, featured, tags), sorting, and pagination
//   - Find a single product by ID or slug with full detail relations
//   - Find related products within the same category for cross-selling
//   - Update product review statistics (avgRating, reviewCount) after
//     review moderation
//   - Include active flash sale data in product queries for sale pricing
// ============================================================================

import { BaseRepository, type PaginationOptions, type FindManyResult } from "@/infrastructure/base-repository"
import { db } from "@/infrastructure/database"

/**
 * Filter options for product queries — all fields are optional.
 *
 * When multiple filters are provided, they are combined with AND logic.
 * The `isActive` field defaults to `true` to hide inactive products
 * from storefront queries by default.
 */
export interface ProductFilterOptions {
  /** Full-text search query — matches against name, shortDesc, description, and SKU */
  search?: string
  /** Filter by category ID */
  categoryId?: string
  /** Filter by brand ID */
  brandId?: string
  /** Minimum price filter (inclusive) */
  minPrice?: number
  /** Maximum price filter (inclusive) */
  maxPrice?: number
  /** Minimum average rating filter (inclusive, 0–5 scale) */
  minRating?: number
  /** Filter to featured products only */
  isFeatured?: boolean
  /** Filter by product tag (e.g., "new-arrival") */
  tag?: string
  /** Whether to include inactive products; defaults to true (active only) */
  isActive?: boolean
}

/**
 * Sort options for product queries.
 *
 * Maps user-friendly sort names to Prisma orderBy clauses.
 */
export interface ProductSortOptions {
  /** Sort strategy — controls the ordering of results */
  sort: 'newest' | 'price-asc' | 'price-desc' | 'rating' | 'popular'
}

/**
 * ProductRepository — extends BaseRepository with product-specific queries.
 *
 * Handles complex filtering with dynamic Prisma `where` clause construction,
 * multi-relation includes (category, brand, inventory, tags, flash sales,
 * reviews), and slug-based lookups for SEO-friendly product URLs.
 */
export class ProductRepository extends BaseRepository<
  Record<string, unknown>,
  Record<string, unknown>,
  Record<string, unknown>
> {
  /** Prisma model name used by BaseRepository to access the correct delegate */
  protected modelName = 'product'

  /**
   * Find products with advanced filtering, sorting, and pagination.
   *
   * This method builds a dynamic Prisma `where` clause by conditionally
   * adding filters for each provided option. The search filter uses Prisma's
   * `OR` operator to match across multiple fields (name, shortDesc,
   * description, SKU) for comprehensive search results.
   *
   * Flash sale data is included for products that are part of an active
   * flash sale (isActive: true, within the start/end date window), enabling
   * the frontend to display sale prices without a separate query.
   *
   * @param {ProductFilterOptions} [filters={}] - Filter criteria for the query
   * @param {ProductSortOptions} [sort={sort:'newest'}] - Sort strategy
   * @param {PaginationOptions} [pagination={}] - Page number and limit
   * @returns {Promise<FindManyResult<Record<string, unknown>>>} Paginated products with relations
   */
  async findFiltered(
    filters: ProductFilterOptions = {},
    sort: ProductSortOptions = { sort: 'newest' },
    pagination: PaginationOptions = {}
  ): Promise<FindManyResult<Record<string, unknown>>> {
    const { search, categoryId, brandId, minPrice, maxPrice, minRating, isFeatured, tag, isActive = true } = filters
    const page = pagination.page || 1
    const limit = pagination.limit || 12

    // Build the dynamic where clause — starts with the active filter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { isActive }

    // Search: use OR to match across multiple text fields for broad search
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { shortDesc: { contains: search } },
        { description: { contains: search } },
        { sku: { contains: search } },
      ]
    }
    // Category and brand are simple equality filters
    if (categoryId) where.categoryId = categoryId
    if (brandId) where.brandId = brandId
    // Price range: use Prisma's gte/lte operators for inclusive bounds
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {
        ...(minPrice !== undefined ? { gte: minPrice } : {}),
        ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
      }
    }
    // Rating filter: only include products with avgRating >= minRating
    if (minRating !== undefined) where.avgRating = { gte: minRating }
    // Featured flag: override the default to filter for featured products
    if (isFeatured) where.isFeatured = true
    // Tag filter: use Prisma's relation filter to match tags
    if (tag) where.tags = { some: { tag } }

    // Map sort strategy to Prisma orderBy clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let orderBy: any = { createdAt: 'desc' }
    switch (sort.sort) {
      case 'price-asc': orderBy = { price: 'asc' }; break
      case 'price-desc': orderBy = { price: 'desc' }; break
      case 'rating': orderBy = { avgRating: 'desc' }; break
      case 'popular': orderBy = { totalSold: 'desc' }; break
    }

    // Run data and count queries in parallel for efficiency
    const [items, total] = await Promise.all([
      db.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          brand: { select: { id: true, name: true, slug: true } },
          inventory: { select: { quantity: true, reserved: true } },
          tags: { select: { tag: true } },
          // Include active flash sales for sale price display
          // Only joins flash sales that are currently active and within the date window
          flashSales: {
            where: { flashSale: { isActive: true, startsAt: { lte: new Date() }, endsAt: { gte: new Date() } } },
            include: { flashSale: { select: { isActive: true, startsAt: true, endsAt: true } } },
          },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.product.count({ where }),
    ])

    return {
      items: items as unknown as Record<string, unknown>[],
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }
  }

  /**
   * Find a single product by its ID or URL slug with full detail relations.
   *
   * Uses a simple heuristic to determine whether the input is a UUID or slug:
   * UUIDs are longer than 20 characters (e.g., "550e8400-e29b-41d4-a716-446655440000"),
   * while slugs are typically shorter (e.g., "sony-wh-1000xm5").
   *
   * Includes all relations needed for the product detail page:
   *   - Category and brand for breadcrumb/navigation
   *   - Active variants with their inventory
   *   - Full inventory records with low-stock thresholds
   *   - Approved reviews with user info (limited to 50 most recent)
   *   - Active flash sale data
   *
   * @param {string} idOrSlug - Either the product's UUID or its URL-friendly slug
   * @returns {Promise<Record<string, unknown> | null>} The product with full details, or null if not found
   */
  async findDetail(idOrSlug: string): Promise<Record<string, unknown> | null> {
    // Heuristic: UUIDs are typically 36 characters, slugs are shorter
    const isUUID = idOrSlug.length > 20
    const where = isUUID ? { id: idOrSlug } : { slug: idOrSlug }

    return db.product.findUnique({
      where,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
        // Only include active variants for the storefront
        variants: {
          where: { isActive: true },
          include: { inventory: { select: { id: true, quantity: true, reserved: true } } },
        },
        inventory: true,
        tags: { select: { tag: true } },
        // Only include approved reviews to prevent unreviewed content from showing
        reviews: {
          where: { isApproved: true },
          include: { user: { select: { id: true, name: true, image: true } } },
          orderBy: { createdAt: 'desc' },
          take: 50,  // Limit reviews to prevent unbounded payload sizes
        },
        // Include active flash sale data for sale pricing
        flashSales: {
          where: { flashSale: { isActive: true, startsAt: { lte: new Date() }, endsAt: { gte: new Date() } } },
          include: { flashSale: true },
        },
      },
    }) as Promise<Record<string, unknown> | null>
  }

  /**
   * Find related products in the same category for cross-selling.
   *
   * Excludes the current product from results and orders by popularity
   * (totalSold descending) so the best-selling related items appear first.
   * Used on the product detail page's "You may also like" section.
   *
   * @param {string} productId - The current product's ID (excluded from results)
   * @param {string} categoryId - The category to find related products in
   * @param {number} [limit=4] - Maximum number of related products to return
   * @returns {Promise<Record<string, unknown>[]>} List of related products
   */
  async findRelated(productId: string, categoryId: string, limit: number = 4): Promise<Record<string, unknown>[]> {
    return db.product.findMany({
      where: { categoryId, isActive: true, id: { not: productId } },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        inventory: { select: { quantity: true, reserved: true } },
      },
      take: limit,
      // Order by totalSold so the most popular related items show first
      orderBy: { totalSold: 'desc' },
    }) as Promise<Record<string, unknown>[]>
  }

  /**
   * Recalculate and persist a product's review statistics.
   *
   * Aggregates all approved reviews for the product to compute:
   *   - `avgRating`: The mean rating across all approved reviews (0–5)
   *   - `reviewCount`: The total number of approved reviews
   *
   * Should be called after any review approval/rejection to keep the
   * product's displayed rating in sync with its actual reviews.
   *
   * @param {string} productId - The product whose stats should be recalculated
   * @returns {Promise<void>}
   */
  async updateReviewStats(productId: string): Promise<void> {
    // Aggregate rating and count from approved reviews only
    const stats = await db.review.aggregate({
      where: { productId, isApproved: true },
      _avg: { rating: true },
      _count: true,
    })

    // Persist the computed stats on the product record for fast reads
    // (avoids recomputing on every product list/detail query)
    await db.product.update({
      where: { id: productId },
      data: {
        avgRating: stats._avg.rating || 0,
        reviewCount: stats._count,
      },
    })
  }
}

/** Singleton instance of ProductRepository for use across the application */
export const productRepository = new ProductRepository()
