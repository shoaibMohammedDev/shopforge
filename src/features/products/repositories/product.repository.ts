// ============================================================================
// ShopForge - Product Repository
// Data access layer for product-related operations
// ============================================================================

import { BaseRepository, type PaginationOptions, type FindManyResult } from '@/features/products/repositories/base.repository'
import { db } from '@/lib/db'

export interface ProductFilterOptions {
  search?: string
  categoryId?: string
  brandId?: string
  minPrice?: number
  maxPrice?: number
  minRating?: number
  isFeatured?: boolean
  tag?: string
  isActive?: boolean
}

export interface ProductSortOptions {
  sort: 'newest' | 'price-asc' | 'price-desc' | 'rating' | 'popular'
}

export class ProductRepository extends BaseRepository<
  Record<string, unknown>,
  Record<string, unknown>,
  Record<string, unknown>
> {
  protected modelName = 'product'

  /**
   * Find products with advanced filtering, sorting, and pagination
   */
  async findFiltered(
    filters: ProductFilterOptions = {},
    sort: ProductSortOptions = { sort: 'newest' },
    pagination: PaginationOptions = {}
  ): Promise<FindManyResult<Record<string, unknown>>> {
    const { search, categoryId, brandId, minPrice, maxPrice, minRating, isFeatured, tag, isActive = true } = filters
    const page = pagination.page || 1
    const limit = pagination.limit || 12

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { isActive }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { shortDesc: { contains: search } },
        { description: { contains: search } },
        { sku: { contains: search } },
      ]
    }
    if (categoryId) where.categoryId = categoryId
    if (brandId) where.brandId = brandId
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {
        ...(minPrice !== undefined ? { gte: minPrice } : {}),
        ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
      }
    }
    if (minRating !== undefined) where.avgRating = { gte: minRating }
    if (isFeatured) where.isFeatured = true
    if (tag) where.tags = { some: { tag } }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let orderBy: any = { createdAt: 'desc' }
    switch (sort.sort) {
      case 'price-asc': orderBy = { price: 'asc' }; break
      case 'price-desc': orderBy = { price: 'desc' }; break
      case 'rating': orderBy = { avgRating: 'desc' }; break
      case 'popular': orderBy = { totalSold: 'desc' }; break
    }

    const [items, total] = await Promise.all([
      db.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          brand: { select: { id: true, name: true, slug: true } },
          inventory: { select: { quantity: true, reserved: true } },
          tags: { select: { tag: true } },
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
   * Find a single product by ID or slug with full details
   */
  async findDetail(idOrSlug: string): Promise<Record<string, unknown> | null> {
    const isUUID = idOrSlug.length > 20
    const where = isUUID ? { id: idOrSlug } : { slug: idOrSlug }

    return db.product.findUnique({
      where,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
        variants: {
          where: { isActive: true },
          include: { inventory: { select: { id: true, quantity: true, reserved: true } } },
        },
        inventory: true,
        tags: { select: { tag: true } },
        reviews: {
          where: { isApproved: true },
          include: { user: { select: { id: true, name: true, image: true } } },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        flashSales: {
          where: { flashSale: { isActive: true, startsAt: { lte: new Date() }, endsAt: { gte: new Date() } } },
          include: { flashSale: true },
        },
      },
    }) as Promise<Record<string, unknown> | null>
  }

  /**
   * Find related products in the same category
   */
  async findRelated(productId: string, categoryId: string, limit: number = 4): Promise<Record<string, unknown>[]> {
    return db.product.findMany({
      where: { categoryId, isActive: true, id: { not: productId } },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        inventory: { select: { quantity: true, reserved: true } },
      },
      take: limit,
      orderBy: { totalSold: 'desc' },
    }) as Promise<Record<string, unknown>[]>
  }

  /**
   * Update product review statistics
   */
  async updateReviewStats(productId: string): Promise<void> {
    const stats = await db.review.aggregate({
      where: { productId, isApproved: true },
      _avg: { rating: true },
      _count: true,
    })

    await db.product.update({
      where: { id: productId },
      data: {
        avgRating: stats._avg.rating || 0,
        reviewCount: stats._count,
      },
    })
  }
}

export const productRepository = new ProductRepository()
