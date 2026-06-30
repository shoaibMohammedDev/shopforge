import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { productQuerySchema } from '@/lib/validators'
import { handleApiError } from '@/lib/errors'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants'

// GET /api/products - List products with filters, search, pagination
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())

    // Validate query parameters with Zod
    const parsed = productQuerySchema.safeParse(params)
    if (!parsed.success) {
      const errors = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
      return NextResponse.json(
        { success: false, error: errors, code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const { search, categoryId, brandId, minPrice, maxPrice, minRating, sort, page, limit, isFeatured, tag } = parsed.data

    const where: Record<string, unknown> = { isActive: true }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { shortDesc: { contains: search } },
        { description: { contains: search } },
        { sku: { contains: search } },
      ]
    }

    if (categoryId) {
      where.categoryId = categoryId
    }

    if (brandId) {
      where.brandId = brandId
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {}
      if (minPrice !== undefined) (where.price as Record<string, number>).gte = minPrice
      if (maxPrice !== undefined) (where.price as Record<string, number>).lte = maxPrice
    }

    if (minRating !== undefined) {
      where.avgRating = { gte: minRating }
    }

    if (isFeatured) {
      where.isFeatured = true
    }

    if (tag) {
      where.tags = { some: { tag } }
    }

    let orderBy: Record<string, string> = { createdAt: 'desc' }
    switch (sort) {
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
          flashSaleProduct: {
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

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    return handleApiError(error)
  }
}
