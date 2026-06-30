import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/brands
export async function GET() {
  try {
    const brands = await db.brand.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { products: { where: { isActive: true } } } },
      },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(brands)
  } catch (error) {
    console.error('Brands API error:', error)
    return NextResponse.json({ error: 'Failed to fetch brands' }, { status: 500 })
  }
}
