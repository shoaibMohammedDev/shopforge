// ============================================================================
// ShopForge - Auth DTOs (Data Transfer Objects)
// Typed interfaces for authentication request/response payloads
// ============================================================================

// ---- Request DTOs ----
export interface LoginRequestDTO {
  action: 'login'
  email: string
  password: string
}

export interface RegisterRequestDTO {
  action: 'register'
  email: string
  password: string
  name: string
}

export interface VerifySessionRequestDTO {
  action: 'verify'
  userId: string
}

export interface ChangePasswordRequestDTO {
  action: 'change-password'
  userId: string
  currentPassword: string
  newPassword: string
}

export type AuthRequestDTO =
  | LoginRequestDTO
  | RegisterRequestDTO
  | VerifySessionRequestDTO
  | ChangePasswordRequestDTO

// ---- Response DTOs ----
export interface UserDTO {
  id: string
  email: string
  name: string | null
  image: string | null
  role: string
  emailVerified: boolean
  isActive: boolean
  createdAt: string
}

export interface AuthResponseDTO {
  user: UserDTO
}

export interface ChangePasswordResponseDTO {
  message: string
}
