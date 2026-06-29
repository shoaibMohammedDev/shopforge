import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PUT /api/addresses/[id] - Update an address
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      label, firstName, lastName, street1, street2,
      city, state, postalCode, country, phone, isDefault, userId,
    } = body

    const existing = await db.address.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 })
    }

    // If setting as default, unset other defaults
    if (isDefault && !existing.isDefault) {
      await db.address.updateMany({
        where: { userId: userId || existing.userId, isDefault: true },
        data: { isDefault: false },
      })
    }

    const address = await db.address.update({
      where: { id },
      data: {
        label: label !== undefined ? (label || null) : undefined,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        street1: street1 || undefined,
        street2: street2 !== undefined ? (street2 || null) : undefined,
        city: city || undefined,
        state: state || undefined,
        postalCode: postalCode || undefined,
        country: country || undefined,
        phone: phone !== undefined ? (phone || null) : undefined,
        isDefault: isDefault !== undefined ? isDefault : undefined,
      },
    })

    return NextResponse.json(address)
  } catch (error) {
    console.error('Update address API error:', error)
    return NextResponse.json({ error: 'Failed to update address' }, { status: 500 })
  }
}

// DELETE /api/addresses/[id] - Delete an address
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.address.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 })
    }

    await db.address.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete address API error:', error)
    return NextResponse.json({ error: 'Failed to delete address' }, { status: 500 })
  }
}
