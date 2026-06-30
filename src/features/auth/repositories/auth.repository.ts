// ============================================================================
// File: auth.repository.ts
// Description: Data access layer for user authentication operations in ShopForge
// Key Responsibilities:
//   - Look up users by email address
//   - Verify passwords against both bcrypt and legacy SHA-256 hashes
//   - Hash new passwords with bcrypt (12 salt rounds)
//   - Transparently upgrade legacy SHA-256 hashes to bcrypt on login
//   - Create new user records with hashed passwords
//   - Sanitize user objects by stripping the passwordHash before API responses
// ============================================================================

import { BaseRepository } from '@/features/products/repositories/base.repository'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { createHash } from 'crypto'

/**
 * AuthRepository — extends BaseRepository with authentication-specific queries.
 *
 * Generic type parameters:
 *   T = Record<string, unknown>           (user shape)
 *   CreateInput = Record<string, unknown>  (creation payload shape)
 *   UpdateInput = Record<string, unknown>  (update payload shape)
 *
 * Uses loose typing because Prisma's generated types are not easily
 * compatible with the generic repository pattern.
 */
export class AuthRepository extends BaseRepository<
  Record<string, unknown>,
  Record<string, unknown>,
  Record<string, unknown>
> {
  /** Prisma model name used by BaseRepository to access the correct delegate */
  protected modelName = 'user'

  /**
   * Find a user by their email address.
   *
   * Email is the primary login identifier and has a unique constraint
   * in the database, so `findUnique` is appropriate here.
   *
   * @param {string} email - The email address to search for
   * @returns {Promise<Record<string, unknown> | null>} The user record, or null if not found
   */
  async findByEmail(email: string): Promise<Record<string, unknown> | null> {
    return db.user.findUnique({ where: { email } }) as Promise<Record<string, unknown> | null>
  }

  /**
   * Verify a plaintext password against the stored hash.
   *
   * Supports two hashing algorithms for backward compatibility:
   *   - **bcrypt**: Modern, salted hashes prefixed with "$2" (e.g., "$2a$", "$2b$")
   *   - **SHA-256**: Legacy unsalted hashes from an earlier system version
   *
   * SHA-256 is inherently less secure than bcrypt because it lacks salting
   * and is designed for speed (making brute-force attacks easier). It is
   * supported here only to allow existing users to log in and have their
   * hash transparently upgraded to bcrypt via `upgradePasswordHash()`.
   *
   * @param {{ passwordHash: string }} user - Object containing the stored password hash
   * @param {string} password - The plaintext password to verify
   * @returns {Promise<boolean>} True if the password matches the hash, false otherwise
   */
  async verifyPassword(user: { passwordHash: string }, password: string): Promise<boolean> {
    if (user.passwordHash.startsWith('$2')) {
      // Modern bcrypt hash — use bcrypt.compare which handles salt extraction
      return bcrypt.compare(password, user.passwordHash)
    }
    // Legacy SHA-256 support — compare hex digests directly
    const sha256Hash = createHash('sha256').update(password).digest('hex')
    return sha256Hash === user.passwordHash
  }

  /**
   * Hash a plaintext password using bcrypt with 12 salt rounds.
   *
   * 12 rounds provides a good balance between security and performance.
   * Each round doubles the computation time, so 12 = 2^12 iterations.
   *
   * @param {string} password - The plaintext password to hash
   * @returns {Promise<string>} The bcrypt hash string (includes algorithm identifier, cost, salt, and digest)
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12)
  }

  /**
   * Upgrade a user's password hash from legacy SHA-256 to bcrypt.
   *
   * Called after a successful login when the stored hash is detected as
   * SHA-256 (doesn't start with "$2"). The plaintext password is available
   * at login time, making this the ideal moment to re-hash with bcrypt.
   *
   * @param {string} userId - The ID of the user whose hash should be upgraded
   * @param {string} plainPassword - The plaintext password to re-hash with bcrypt
   * @returns {Promise<void>}
   */
  async upgradePasswordHash(userId: string, plainPassword: string): Promise<void> {
    const newHash = await this.hashPassword(plainPassword)
    await db.user.update({ where: { id: userId }, data: { passwordHash: newHash } })
  }

  /**
   * Create a new user record with a bcrypt-hashed password.
   *
   * New users are assigned the CUSTOMER role by default. The `emailVerified`
   * field is set to false, requiring email verification before certain
   * features become available.
   *
   * @param {object} data - User creation payload
   * @param {string} data.email - The user's email address (must be unique)
   * @param {string} data.name - The user's display name
   * @param {string} data.password - The plaintext password (will be hashed before storage)
   * @param {string} [data.role='CUSTOMER'] - Optional role override (e.g., 'ADMIN')
   * @returns {Promise<Record<string, unknown>>} The newly created user record
   */
  async createUser(data: {
    email: string
    name: string
    password: string
    role?: string
  }): Promise<Record<string, unknown>> {
    // Hash the password before storing — never store plaintext passwords
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
   * Strip the passwordHash from a user object for safe API transmission.
   *
   * This must be called before returning any user data in API responses
   * to prevent the password hash from leaking to the client.
   *
   * @param {Record<string, unknown>} user - The raw user object from the database
   * @returns {Omit<Record<string, unknown>, 'passwordHash'>} The user object without the passwordHash field
   */
  sanitizeUser(user: Record<string, unknown>): Omit<Record<string, unknown>, 'passwordHash'> {
    const { passwordHash, ...safeUser } = user
    return safeUser
  }
}

/** Singleton instance of AuthRepository for use across the application */
export const authRepository = new AuthRepository()
