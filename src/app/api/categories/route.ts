import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/categories
export async function GET() {
  try {
    const categories = await db.category.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { products: { where: { isActive: true } } } },
        children: {
          where: { isActive: true },
          include: {
            _count: { select: { products: { where: { isActive: true } } } },
          },
        },
      },
      where: { isActive: true, parentId: null },
      orderBy: { sortOrder: 'asc' },
    })

    // Fix: we need to re-query since we have conflicting where clauses
    const result = await db.category.findMany({
      where: { isActive: true, parentId: null },
      include: {
        _count: { select: { products: { where: { isActive: true } } } },
        children: {
          where: { isActive: true },
          include: {
            _count: { select: { products: { where: { isActive: true } } } },
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Categories API error:', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}
