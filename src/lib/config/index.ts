// ============================================================================
// ShopForge - Application Configuration
// Centralized config with environment variable validation
// ============================================================================

import { z } from 'zod/v4'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_APP_NAME: z.string().default('ShopForge'),
  DATABASE_URL: z.string().min(1),
  NEXTAUTH_SECRET: z.string().min(1).optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLIC_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
  REDIS_URL: z.string().optional(),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_FORMAT: z.enum(['json', 'text']).default('json'),
})

export type EnvConfig = z.infer<typeof envSchema>

let _config: EnvConfig | null = null

export function getConfig(): EnvConfig {
  if (!_config) {
    const result = envSchema.safeParse(process.env)
    if (!result.success) {
      console.error('[Config] Invalid environment variables:', result.error.issues)
      // In development, use defaults; in production, throw
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Invalid environment configuration')
      }
      // Fallback for development with partial config
      _config = {
        NODE_ENV: 'development',
        NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
        NEXT_PUBLIC_APP_NAME: 'ShopForge',
        DATABASE_URL: process.env.DATABASE_URL || 'file:./db/custom.db',
        RATE_LIMIT_WINDOW_MS: 60000,
        RATE_LIMIT_MAX_REQUESTS: 100,
        LOG_LEVEL: 'debug',
        LOG_FORMAT: 'text',
      }
    } else {
      _config = result.data
    }
  }
  return _config
}

// Convenience getters
export const appConfig = {
  get isDev() { return getConfig().NODE_ENV === 'development' },
  get isProd() { return getConfig().NODE_ENV === 'production' },
  get isTest() { return getConfig().NODE_ENV === 'test' },
  get appUrl() { return getConfig().NEXT_PUBLIC_APP_URL },
  get appName() { return getConfig().NEXT_PUBLIC_APP_NAME },
  get databaseUrl() { return getConfig().DATABASE_URL },
  get stripe() {
    const c = getConfig()
    return {
      secretKey: c.STRIPE_SECRET_KEY,
      publicKey: c.STRIPE_PUBLIC_KEY,
      webhookSecret: c.STRIPE_WEBHOOK_SECRET,
      isConfigured: !!(c.STRIPE_SECRET_KEY && c.STRIPE_PUBLIC_KEY),
    }
  },
  get email() {
    const c = getConfig()
    return {
      apiKey: c.RESEND_API_KEY,
      from: c.EMAIL_FROM || 'noreply@shopforge.dev',
      isConfigured: !!c.RESEND_API_KEY,
    }
  },
  get redis() {
    const c = getConfig()
    return {
      url: c.REDIS_URL,
      isConfigured: !!c.REDIS_URL,
    }
  },
  get rateLimit() {
    const c = getConfig()
    return {
      windowMs: c.RATE_LIMIT_WINDOW_MS,
      maxRequests: c.RATE_LIMIT_MAX_REQUESTS,
    }
  },
  get logging() {
    const c = getConfig()
    return {
      level: c.LOG_LEVEL,
      format: c.LOG_FORMAT,
    }
  },
}
