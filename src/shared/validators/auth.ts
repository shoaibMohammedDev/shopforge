/**
 * @file shared/validators/auth.ts
 * @description Zod validation schemas for auth payloads.
 */
import { z } from 'zod/v4'

export const loginSchema = z.object({
  action: z.literal('login'),
  email: z.email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const registerSchema = z.object({
  action: z.literal('register'),
  email: z.email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100),
})

export const authSchema = z.discriminatedUnion('action', [
  loginSchema,
  registerSchema,
  z.object({ action: z.literal('verify'), userId: z.string().min(1) }),
  z.object({
    action: z.literal('change-password'),
    userId: z.string().min(1),
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  }),
])
