import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authSchema } from '@/lib/validators'
import { handleApiError, AuthenticationError, ConflictError, ValidationError } from '@/lib/errors'
import { createHash } from 'crypto'
import bcrypt from 'bcryptjs'

// POST /api/auth - Login / Register / Verify / Change Password
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate input with Zod schema
    const parsed = authSchema.safeParse(body)
    if (!parsed.success) {
      const fields: Record<string, string[]> = {}
      for (const issue of parsed.error.issues) {
        const key = String(issue.path.join('.'))
        if (!fields[key]) fields[key] = []
        fields[key].push(issue.message)
      }
      throw new ValidationError('Invalid input', fields)
    }

    const data = parsed.data

    // ---- LOGIN ----
    if (data.action === 'login') {
      const user = await db.user.findUnique({ where: { email: data.email } })

      if (!user || !user.passwordHash) {
        throw new AuthenticationError('Invalid email or password')
      }

      if (!user.isActive) {
        throw new AuthenticationError('Account is disabled')
      }

      // Verify password with bcrypt (supports both old SHA-256 and new bcrypt hashes)
      let passwordValid = false
      if (user.passwordHash.startsWith('$2')) {
        // bcrypt hash
        passwordValid = await bcrypt.compare(data.password, user.passwordHash)
      } else {
        // Legacy SHA-256 hash — verify and upgrade
        const sha256Hash = createHash('sha256').update(data.password).digest('hex')
        passwordValid = sha256Hash === user.passwordHash

        // Upgrade to bcrypt on successful login
        if (passwordValid) {
          const newHash = await bcrypt.hash(data.password, 12)
          await db.user.update({ where: { id: user.id }, data: { passwordHash: newHash } })
        }
      }

      if (!passwordValid) {
        throw new AuthenticationError('Invalid email or password')
      }

      const { passwordHash: _, ...safeUser } = user
      return NextResponse.json({ success: true, data: { user: safeUser } })
    }

    // ---- REGISTER ----
    if (data.action === 'register') {
      const existing = await db.user.findUnique({ where: { email: data.email } })
      if (existing) {
        throw new ConflictError('Email already registered')
      }

      const passwordHash = await bcrypt.hash(data.password, 12)
      const user = await db.user.create({
        data: {
          email: data.email,
          name: data.name,
          passwordHash,
          role: 'CUSTOMER',
          emailVerified: false,
        },
      })

      const { passwordHash: _, ...safeUser } = user
      return NextResponse.json({ success: true, data: { user: safeUser } }, { status: 201 })
    }

    // ---- VERIFY SESSION ----
    if (data.action === 'verify') {
      const user = await db.user.findUnique({ where: { id: data.userId } })
      if (!user || !user.isActive) {
        throw new AuthenticationError('Invalid session')
      }
      const { passwordHash: _, ...safeUser } = user
      return NextResponse.json({ success: true, data: { user: safeUser } })
    }

    // ---- CHANGE PASSWORD ----
    if (data.action === 'change-password') {
      const user = await db.user.findUnique({ where: { id: data.userId } })
      if (!user || !user.passwordHash) {
        throw new AuthenticationError('User not found')
      }

      // Verify current password
      let currentValid = false
      if (user.passwordHash.startsWith('$2')) {
        currentValid = await bcrypt.compare(data.currentPassword, user.passwordHash)
      } else {
        const sha256Hash = createHash('sha256').update(data.currentPassword).digest('hex')
        currentValid = sha256Hash === user.passwordHash
      }

      if (!currentValid) {
        throw new ValidationError('Current password is incorrect')
      }

      const newHash = await bcrypt.hash(data.newPassword, 12)
      await db.user.update({ where: { id: user.id }, data: { passwordHash: newHash } })

      return NextResponse.json({ success: true, data: { message: 'Password updated' } })
    }

    return NextResponse.json({ success: false, error: 'Invalid action', code: 'BAD_REQUEST' }, { status: 400 })
  } catch (error) {
    return handleApiError(error)
  }
}
