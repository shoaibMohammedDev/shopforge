import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import crypto from 'crypto'

// POST /api/auth - Login / Register
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, email, password, name } = body

    if (action === 'login') {
      const hash = crypto.createHash('sha256').update(password).digest('hex')
      const user = await db.user.findUnique({
        where: { email },
      })

      if (!user || user.passwordHash !== hash) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
      }

      if (!user.isActive) {
        return NextResponse.json({ error: 'Account is disabled' }, { status: 403 })
      }

      const { passwordHash: _, ...safeUser } = user
      return NextResponse.json({ user: safeUser })
    }

    if (action === 'register') {
      const existing = await db.user.findUnique({ where: { email } })
      if (existing) {
        return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
      }

      const hash = crypto.createHash('sha256').update(password).digest('hex')
      const user = await db.user.create({
        data: {
          email,
          name,
          passwordHash: hash,
          role: 'CUSTOMER',
          emailVerified: false,
        },
      })

      const { passwordHash: _, ...safeUser } = user
      return NextResponse.json({ user: safeUser }, { status: 201 })
    }

    if (action === 'verify') {
      // Check if session is valid
      const { userId } = body
      const user = await db.user.findUnique({ where: { id: userId } })
      if (!user || !user.isActive) {
        return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
      }
      const { passwordHash: _, ...safeUser } = user
      return NextResponse.json({ user: safeUser })
    }

    if (action === 'change-password') {
      const { userId, currentPassword, newPassword } = body
      if (!userId || !currentPassword || !newPassword) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
      }

      const user = await db.user.findUnique({ where: { id: userId } })
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      const currentHash = crypto.createHash('sha256').update(currentPassword).digest('hex')
      if (user.passwordHash !== currentHash) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 })
      }

      const newHash = crypto.createHash('sha256').update(newPassword).digest('hex')
      await db.user.update({
        where: { id: userId },
        data: { passwordHash: newHash },
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Auth API error:', error)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
  }
}
