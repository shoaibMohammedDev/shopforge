import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PUT /api/users/[id] - Update user profile
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, image } = body

    const existing = await db.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const user = await db.user.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(image !== undefined && { image }),
      },
    })

    const { passwordHash: _, ...safeUser } = user
    return NextResponse.json(safeUser)
  } catch (error) {
    console.error('Update user API error:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}
