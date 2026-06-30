// ============================================================================
// File: auth.service.ts
// Description: Authentication service for ShopForge — handles login, registration,
//              session verification, and password management
// Key Responsibilities:
//   - Authenticate users via email/password with bcrypt verification
//   - Register new users with duplicate-email detection
//   - Verify active sessions by user ID
//   - Handle password changes with current-password validation
//   - Automatically upgrade legacy SHA-256 password hashes to bcrypt on login
//   - Route auth requests to the appropriate handler via a unified dispatch method
// ============================================================================

import { authRepository } from '../repositories/auth.repository'
import { authLogger } from "@/shared/lib/logger"
import { AuthenticationError, ConflictError, ValidationError } from "@/shared/lib/errors"
import type { AuthRequestDTO, AuthResponseDTO, UserDTO, ChangePasswordResponseDTO } from '../dto/auth.dto'
import { db } from "@/infrastructure/database"

/**
 * AuthService — centralised business logic layer for all authentication flows.
 *
 * Follows the pattern of wrapping each method in `authLogger.measure()` for
 * automatic performance tracking. Password hashing and comparison are delegated
 * to AuthRepository, keeping this layer focused on business rules.
 */
class AuthService {
  /**
   * Authenticate a user by email and password.
   *
   * Flow:
   *   1. Look up the user by email
   *   2. Verify the account is active (not disabled by an admin)
   *   3. Compare the supplied password against the stored hash
   *   4. If the hash is legacy SHA-256 (not bcrypt), upgrade it transparently
   *   5. Return the sanitized user object (without passwordHash)
   *
   * @param {string} email - The user's email address
   * @param {string} password - The plaintext password to verify
   * @returns {Promise<AuthResponseDTO>} The authenticated user data (sans passwordHash)
   * @throws {AuthenticationError} If email/password combo is invalid or account is disabled
   */
  async login(email: string, password: string): Promise<AuthResponseDTO> {
    return authLogger.measure('login', async () => {
      const user = await authRepository.findByEmail(email)

      // Deliberately return the same error message for both "not found" and
      // "no password" cases to prevent email-enumeration attacks
      if (!user || !user.passwordHash) {
        throw new AuthenticationError('Invalid email or password')
      }

      // Admins can disable accounts; disabled users must not be allowed to log in
      if (!user.isActive) {
        throw new AuthenticationError('Account is disabled')
      }

      const passwordValid = await authRepository.verifyPassword(
        user as { passwordHash: string },
        password
      )

      if (!passwordValid) {
        throw new AuthenticationError('Invalid email or password')
      }

      // Upgrade legacy SHA-256 hash to bcrypt if needed
      // SHA-256 hashes don't start with "$2", while bcrypt hashes do.
      // This migration happens transparently on each successful login,
      // gradually moving the entire user base to the more secure bcrypt format.
      if (!(user.passwordHash as string).startsWith('$2')) {
        await authRepository.upgradePasswordHash(user.id as string, password)
        authLogger.info('Password hash upgraded to bcrypt', { userId: user.id })
      }

      const safeUser = authRepository.sanitizeUser(user) as unknown as UserDTO
      authLogger.info('User logged in', { userId: user.id, role: user.role })
      return { user: safeUser }
    })
  }

  /**
   * Register a new user account.
   *
   * Checks for duplicate emails before creating the account. New users
   * are assigned the CUSTOMER role by default (handled in the repository).
   *
   * @param {string} email - The user's email address (must be unique)
   * @param {string} password - The plaintext password (will be hashed by the repository)
   * @param {string} name - The user's display name
   * @returns {Promise<AuthResponseDTO>} The newly created user data (sans passwordHash)
   * @throws {ConflictError} If the email is already registered
   */
  async register(email: string, password: string, name: string): Promise<AuthResponseDTO> {
    return authLogger.measure('register', async () => {
      // Prevent duplicate registrations by checking email uniqueness first
      const existing = await authRepository.findByEmail(email)
      if (existing) {
        throw new ConflictError('Email already registered')
      }

      const user = await authRepository.createUser({ email, password, name })
      const safeUser = authRepository.sanitizeUser(user) as unknown as UserDTO

      authLogger.info('User registered', { userId: user.id, email })
      return { user: safeUser }
    })
  }

  /**
   * Verify that a user session is still valid.
   *
   * Used by middleware and client-side session checks to confirm the user
   * still exists and hasn't been disabled since their session was created.
   *
   * @param {string} userId - The ID of the user to verify
   * @returns {Promise<AuthResponseDTO>} The user data if the session is valid
   * @throws {AuthenticationError} If the user doesn't exist or is inactive
   */
  async verifySession(userId: string): Promise<AuthResponseDTO> {
    // Use db directly for type-safe access
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user || !user.isActive) {
      throw new AuthenticationError('Invalid session')
    }

    // Destructure out passwordHash to prevent it from leaking into API responses
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...safeUser } = user
    return { user: safeUser as unknown as UserDTO }
  }

  /**
   * Change a user's password after validating the current password.
   *
   * This method verifies the current password before allowing the change,
   * preventing unauthorized password resets if the session is hijacked.
   *
   * @param {string} userId - The ID of the user changing their password
   * @param {string} currentPassword - The user's current plaintext password
   * @param {string} newPassword - The new plaintext password (will be hashed)
   * @returns {Promise<ChangePasswordResponseDTO>} Confirmation message
   * @throws {AuthenticationError} If the user doesn't exist
   * @throws {ValidationError} If the current password is incorrect
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<ChangePasswordResponseDTO> {
    return authLogger.measure('changePassword', async () => {
      const user = await db.user.findUnique({ where: { id: userId } })
      if (!user || !user.passwordHash) {
        throw new AuthenticationError('User not found')
      }

      // Verify the current password before allowing the change
      const currentValid = await authRepository.verifyPassword(user as { passwordHash: string }, currentPassword)
      if (!currentValid) {
        throw new ValidationError('Current password is incorrect')
      }

      // Use upgradePasswordHash which always hashes with bcrypt
      await authRepository.upgradePasswordHash(userId, newPassword)
      authLogger.info('Password changed', { userId })
      return { message: 'Password updated' }
    })
  }

  /**
   * Dispatch an auth request to the appropriate handler based on the action type.
   *
   * This method acts as a unified entry point for the auth API route,
   * allowing a single endpoint to handle multiple auth operations (login,
   * register, verify, change-password) via a discriminated union DTO.
   *
   * @param {AuthRequestDTO} data - The auth request payload with an `action` discriminator
   * @returns {Promise<AuthResponseDTO | ChangePasswordResponseDTO>} The result of the dispatched operation
   * @throws {ValidationError} If the action type is not recognised
   */
  async handleAuthRequest(data: AuthRequestDTO): Promise<AuthResponseDTO | ChangePasswordResponseDTO> {
    switch (data.action) {
      case 'login':
        return this.login(data.email, data.password)
      case 'register':
        return this.register(data.email, data.password, data.name)
      case 'verify':
        return this.verifySession(data.userId)
      case 'change-password':
        return this.changePassword(data.userId, data.currentPassword, data.newPassword)
      default:
        throw new ValidationError('Invalid auth action')
    }
  }
}

/** Singleton instance of AuthService for use across the application */
export const authService = new AuthService()
