import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/products - List products with filters, search, pagination
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || undefined
    const categoryIdParam = searchParams.get('categoryId') || undefined
    const brandIdParam = searchParams.get('brandId') || undefined
    const categoryIds = categoryIdParam ? categoryIdParam.split(',') : undefined
    const brandIds = brandIdParam ? brandIdParam.split(',') : undefined
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const minRating = searchParams.get('minRating')
    const sort = searchParams.get('sort') || 'newest'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const isFeatured = searchParams.get('isFeatured') === 'true'
    const tag = searchParams.get('tag') || undefined

    const where: Record<string, unknown> = {
      isActive: true,
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { shortDesc: { contains: search } },
        { description: { contains: search } },
        { sku: { contains: search } },
      ]
    }

    if (categoryIds && categoryIds.length > 0) {
      if (categoryIds.length === 1) {
        where.categoryId = categoryIds[0]
      } else {
        where.categoryId = { in: categoryIds }
      }
    }

    if (brandIds && brandIds.length > 0) {
      if (brandIds.length === 1) {
        where.brandId = brandIds[0]
      } else {
        where.brandId = { in: brandIds }
      }
    }

    if (minPrice || maxPrice) {
      where.price = {}
      if (minPrice) (where.price as Record<string, number>).gte = parseFloat(minPrice)
      if (maxPrice) (where.price as Record<string, number>).lte = parseFloat(maxPrice)
    }

    if (minRating) {
      where.avgRating = { gte: parseFloat(minRating) }
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

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Products API error:', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}
