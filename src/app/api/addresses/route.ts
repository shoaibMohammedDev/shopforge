import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/addresses - Get user's addresses
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const addresses = await db.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json(addresses)
  } catch (error) {
    console.error('Addresses API error:', error)
    return NextResponse.json({ error: 'Failed to fetch addresses' }, { status: 500 })
  }
}

// POST /api/addresses - Create new address
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      userId, label, firstName, lastName, street1, street2,
      city, state, postalCode, country, phone, isDefault,
    } = body

    if (!userId || !firstName || !lastName || !street1 || !city || !state || !postalCode || !country) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await db.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      })
    }

    const address = await db.address.create({
      data: {
        userId,
        label: label || null,
        firstName,
        lastName,
        street1,
        street2: street2 || null,
        city,
        state,
        postalCode,
        country,
        phone: phone || null,
        isDefault: isDefault || false,
      },
    })

    return NextResponse.json(address, { status: 201 })
  } catch (error) {
    console.error('Create address API error:', error)
    return NextResponse.json({ error: 'Failed to create address' }, { status: 500 })
  }
}
