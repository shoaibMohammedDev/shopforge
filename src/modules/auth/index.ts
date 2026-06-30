/**
 * @file modules/auth/index.ts
 * @description Barrel export for the Auth module.
 */
export { LoginPage, RegisterPage } from './components/auth-pages'
export { useAuthStore } from './stores/auth-store'
export { authService } from './services/auth.service'
export { authRepository } from './repositories/auth.repository'
export type {
  LoginRequestDTO, RegisterRequestDTO, VerifySessionRequestDTO,
  ChangePasswordRequestDTO, AuthRequestDTO, UserDTO, AuthResponseDTO,
  ChangePasswordResponseDTO,
} from './dto/auth.dto'
