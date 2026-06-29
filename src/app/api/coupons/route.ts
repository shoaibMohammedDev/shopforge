import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/coupons/validate?code=XXX&subtotal=YYY
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const subtotal = parseFloat(searchParams.get('subtotal') || '0')

    if (!code) {
      return NextResponse.json({ error: 'Coupon code required' }, { status: 400 })
    }

    const coupon = await db.coupon.findUnique({ where: { code } })

    if (!coupon) {
      return NextResponse.json({ error: 'Invalid coupon code' }, { status: 404 })
    }

    if (!coupon.isActive) {
      return NextResponse.json({ error: 'Coupon is no longer active' }, { status: 400 })
    }

    if (coupon.startsAt && new Date(coupon.startsAt) > new Date()) {
      return NextResponse.json({ error: 'Coupon is not yet active' }, { status: 400 })
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Coupon has expired' }, { status: 400 })
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return NextResponse.json({ error: 'Coupon usage limit reached' }, { status: 400 })
    }

    if (subtotal < coupon.minPurchase) {
      return NextResponse.json({ error: `Minimum purchase of $${coupon.minPurchase} required` }, { status: 400 })
    }

    // Calculate discount
    let discount = 0
    if (coupon.type === 'PERCENTAGE') {
      discount = subtotal * (coupon.value / 100)
      if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount)
    } else {
      discount = coupon.value
    }

    return NextResponse.json({
      id: coupon.id,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      minPurchase: coupon.minPurchase,
      maxDiscount: coupon.maxDiscount,
      discount: Math.round(discount * 100) / 100,
    })
  } catch (error) {
    console.error('Coupon validate API error:', error)
    return NextResponse.json({ error: 'Failed to validate coupon' }, { status: 500 })
  }
}
