import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { handleApiError } from '@/lib/errors'

// GET /api/categories
export async function GET() {
  try {
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
    return handleApiError(error)
  }
}
