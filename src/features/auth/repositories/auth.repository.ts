// ============================================================================
// ShopForge - Auth Repository
// Data access layer for user authentication operations
// ============================================================================

import { BaseRepository } from '@/features/products/repositories/base.repository'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { createHash } from 'crypto'

export class AuthRepository extends BaseRepository<
  Record<string, unknown>,
  Record<string, unknown>,
  Record<string, unknown>
> {
  protected modelName = 'user'

  /**
   * Find user by email address
   */
  async findByEmail(email: string): Promise<Record<string, unknown> | null> {
    return db.user.findUnique({ where: { email } }) as Promise<Record<string, unknown> | null>
  }

  /**
   * Verify password (supports bcrypt and legacy SHA-256)
   */
  async verifyPassword(user: { passwordHash: string }, password: string): Promise<boolean> {
    if (user.passwordHash.startsWith('$2')) {
      return bcrypt.compare(password, user.passwordHash)
    }
    // Legacy SHA-256 support
    const sha256Hash = createHash('sha256').update(password).digest('hex')
    return sha256Hash === user.passwordHash
  }

  /**
   * Hash password with bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12)
  }

  /**
   * Upgrade legacy SHA-256 hash to bcrypt
   */
  async upgradePasswordHash(userId: string, plainPassword: string): Promise<void> {
    const newHash = await this.hashPassword(plainPassword)
    await db.user.update({ where: { id: userId }, data: { passwordHash: newHash } })
  }

  /**
   * Create a new user with hashed password
   */
  async createUser(data: {
    email: string
    name: string
    password: string
    role?: string
  }): Promise<Record<string, unknown>> {
    const passwordHash = await this.hashPassword(data.password)
    const user = await db.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash,
        role: (data.role || 'CUSTOMER') as 'CUSTOMER',
        emailVerified: false,
      },
    })
    return user as unknown as Record<string, unknown>
  }

  /**
   * Strip sensitive fields from user object for API responses
   */
  sanitizeUser(user: Record<string, unknown>): Omit<Record<string, unknown>, 'passwordHash'> {
    const { passwordHash, ...safeUser } = user
    return safeUser
  }
}

export const authRepository = new AuthRepository()
