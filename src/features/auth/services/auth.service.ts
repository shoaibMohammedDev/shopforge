// ============================================================================
// ShopForge - Auth Service
// Business logic layer for authentication and user management
// ============================================================================

import { authRepository } from '../repositories/auth.repository'
import { authLogger } from '@/lib/logger'
import { AuthenticationError, ConflictError, ValidationError } from '@/lib/errors'
import type { AuthRequestDTO, AuthResponseDTO, UserDTO, ChangePasswordResponseDTO } from '../dto/auth.dto'
import { db } from '@/lib/db'

class AuthService {
  /**
   * Handle login
   */
  async login(email: string, password: string): Promise<AuthResponseDTO> {
    return authLogger.measure('login', async () => {
      const user = await authRepository.findByEmail(email)

      if (!user || !user.passwordHash) {
        throw new AuthenticationError('Invalid email or password')
      }

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
   * Handle registration
   */
  async register(email: string, password: string, name: string): Promise<AuthResponseDTO> {
    return authLogger.measure('register', async () => {
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
   * Verify user session
   */
  async verifySession(userId: string): Promise<AuthResponseDTO> {
    // Use db directly for type-safe access
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user || !user.isActive) {
      throw new AuthenticationError('Invalid session')
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...safeUser } = user
    return { user: safeUser as unknown as UserDTO }
  }

  /**
   * Change password
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

      const currentValid = await authRepository.verifyPassword(user as { passwordHash: string }, currentPassword)
      if (!currentValid) {
        throw new ValidationError('Current password is incorrect')
      }

      await authRepository.upgradePasswordHash(userId, newPassword)
      authLogger.info('Password changed', { userId })
      return { message: 'Password updated' }
    })
  }

  /**
   * Route auth request to the appropriate handler
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

export const authService = new AuthService()
