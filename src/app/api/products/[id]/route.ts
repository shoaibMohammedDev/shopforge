import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/products/[id] - Get product detail
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Try to find by ID first, then by slug
    let product = await db.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
        variants: {
          where: { isActive: true },
          include: {
            inventory: { select: { id: true, quantity: true, reserved: true } },
          },
        },
        inventory: { select: { id: true, quantity: true, reserved: true, lowStockThreshold: true, sku: true } },
        tags: { select: { tag: true } },
        reviews: {
          where: { isApproved: true },
          include: { user: { select: { id: true, name: true, image: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        flashSales: {
          where: { flashSale: { isActive: true, startsAt: { lte: new Date() }, endsAt: { gte: new Date() } } },
          include: { flashSale: { select: { isActive: true, startsAt: true, endsAt: true } } },
        },
      },
    })

    if (!product) {
      product = await db.product.findUnique({
        where: { slug: id },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          brand: { select: { id: true, name: true, slug: true } },
          variants: {
            where: { isActive: true },
            include: {
              inventory: { select: { id: true, quantity: true, reserved: true } },
            },
          },
          inventory: { select: { id: true, quantity: true, reserved: true, lowStockThreshold: true, sku: true } },
          tags: { select: { tag: true } },
          reviews: {
            where: { isApproved: true },
            include: { user: { select: { id: true, name: true, image: true } } },
            orderBy: { createdAt: 'desc' },
            take: 20,
          },
          flashSales: {
            where: { flashSale: { isActive: true, startsAt: { lte: new Date() }, endsAt: { gte: new Date() } } },
            include: { flashSale: { select: { isActive: true, startsAt: true, endsAt: true } } },
          },
        },
      })
    }

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Get related products
    const related = await db.product.findMany({
      where: {
        categoryId: product.categoryId,
        isActive: true,
        id: { not: product.id },
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
        inventory: { select: { quantity: true, reserved: true } },
        tags: { select: { tag: true } },
      },
      take: 4,
      orderBy: { totalSold: 'desc' },
    })

    return NextResponse.json({ ...product, relatedProducts: related })
  } catch (error) {
    console.error('Product detail API error:', error)
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 })
  }
}
