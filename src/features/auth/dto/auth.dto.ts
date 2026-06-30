// ============================================================================
// File: auth.dto.ts
// Description: Auth Data Transfer Objects (DTOs) for ShopForge — typed interfaces
//              that define the shape of authentication request and response payloads
// Key Responsibilities:
//   - Define strict TypeScript contracts for each auth action (login, register,
//     verify, change-password)
//   - Use discriminated union types to enable type-safe request dispatching
//   - Specify the shape of user data returned in API responses
// ============================================================================

// ---- Request DTOs ----

/**
 * Login request payload — authenticates an existing user by email and password.
 * The `action` discriminator is set to 'login'.
 */
export interface LoginRequestDTO {
  /** Discriminator identifying this as a login request */
  action: 'login'
  /** The user's registered email address */
  email: string
  /** The user's plaintext password */
  password: string
}

/**
 * Registration request payload — creates a new user account.
 * The `action` discriminator is set to 'register'.
 */
export interface RegisterRequestDTO {
  /** Discriminator identifying this as a registration request */
  action: 'register'
  /** The email address for the new account (must be unique) */
  email: string
  /** The plaintext password for the new account (will be hashed before storage) */
  password: string
  /** The display name for the new user */
  name: string
}

/**
 * Session verification request payload — checks if a user session is still valid.
 * The `action` discriminator is set to 'verify'.
 */
export interface VerifySessionRequestDTO {
  /** Discriminator identifying this as a session verification request */
  action: 'verify'
  /** The ID of the user whose session should be verified */
  userId: string
}

/**
 * Password change request payload — updates a user's password after validating
 * the current password. The `action` discriminator is set to 'change-password'.
 */
export interface ChangePasswordRequestDTO {
  /** Discriminator identifying this as a password change request */
  action: 'change-password'
  /** The ID of the user changing their password */
  userId: string
  /** The user's current plaintext password (must be verified before allowing the change) */
  currentPassword: string
  /** The new plaintext password (will be hashed before storage) */
  newPassword: string
}

/**
 * Discriminated union of all auth request types.
 *
 * TypeScript narrows the type based on the `action` field, so the handler
 * can safely access `data.email` when `action === 'login'` without runtime
 * checks for every field.
 */
export type AuthRequestDTO =
  | LoginRequestDTO
  | RegisterRequestDTO
  | VerifySessionRequestDTO
  | ChangePasswordRequestDTO

// ---- Response DTOs ----

/**
 * Safe user representation for API responses.
 *
 * Excludes sensitive fields like `passwordHash` to prevent credential leaks.
 * All date fields are serialized as ISO 8601 strings.
 */
export interface UserDTO {
  /** Unique user identifier (UUID) */
  id: string
  /** User's email address */
  email: string
  /** User's display name (nullable for OAuth-only accounts) */
  name: string | null
  /** URL to the user's profile image (nullable) */
  image: string | null
  /** User's role: 'CUSTOMER' or 'ADMIN' */
  role: string
  /** Whether the user has verified their email address */
  emailVerified: boolean
  /** Whether the user's account is active (not disabled by admin) */
  isActive: boolean
  /** ISO 8601 timestamp of when the account was created */
  createdAt: string
}

/**
 * Standard auth response containing the authenticated/registered user data.
 *
 * Returned by login, register, and verify-session operations.
 */
export interface AuthResponseDTO {
  /** The authenticated or registered user (sans passwordHash) */
  user: UserDTO
}

/**
 * Response returned after a successful password change.
 *
 * Contains only a confirmation message since no user data needs to be
 * returned for this operation.
 */
export interface ChangePasswordResponseDTO {
  /** Human-readable confirmation that the password was updated */
  message: string
}
