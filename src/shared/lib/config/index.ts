/**
 * @file config/index.ts
 * @description Centralised application configuration backed by environment variables.
 *   All runtime configuration is read exclusively through this module, ensuring a
 *   single source of truth and consistent validation via Zod schemas.
 *
 * Key Responsibilities:
 *   - Validate environment variables at startup using a Zod schema
 *   - Provide safe defaults for development when env vars are missing
 *   - Fail fast in production if required configuration is invalid
 *   - Expose convenience getters (`appConfig`) for common config slices
 */

import { z } from 'zod/v4'

/**
 * Zod schema describing every recognised environment variable.
 *
 * - Required fields (e.g. `DATABASE_URL`) must be present in production.
 * - Optional fields default to `undefined` and downstream services fall back
 *   to mock/local mode when they detect the missing key.
 * - `z.coerce.number()` is used for numeric env vars because `process.env`
 *   always stores strings.
 */
const envSchema = z.object({
  /** Node.js environment: determines logging verbosity, error handling strictness, etc. */
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  /** Public-facing base URL of the application (used for email links, SEO, etc.). */
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  /** Human-readable application name shown in emails, titles, and structured data. */
  NEXT_PUBLIC_APP_NAME: z.string().default('ShopForge'),
  /** Prisma connection string. Required — the app cannot start without a database. */
  DATABASE_URL: z.string().min(1),
  /** Secret used by NextAuth.js for signing/encrypting sessions. */
  NEXTAUTH_SECRET: z.string().min(1).optional(),
  /** Stripe server-side secret key (sk_live_… / sk_test_…). */
  STRIPE_SECRET_KEY: z.string().optional(),
  /** Stripe publishable key (pk_live_… / pk_test_…). */
  STRIPE_PUBLIC_KEY: z.string().optional(),
  /** Secret used to verify that Stripe webhook payloads are authentic. */
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  /** Resend.com API key for transactional email delivery. */
  RESEND_API_KEY: z.string().optional(),
  /** "From" address for outgoing emails. Must be a valid email format. */
  EMAIL_FROM: z.string().email().optional(),
  /** Redis connection URL for session storage / caching (optional feature). */
  REDIS_URL: z.string().optional(),
  /** Sliding window duration (ms) for the rate limiter. */
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  /** Maximum number of requests allowed within the rate-limit window. */
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  /** Minimum log level to emit. Lower levels are silently discarded. */
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  /** Output format for log entries — JSON for production machines, text for humans. */
  LOG_FORMAT: z.enum(['json', 'text']).default('json'),
})

/** Inferred TypeScript type representing the fully validated environment configuration. */
export type EnvConfig = z.infer<typeof envSchema>

/**
 * Cached configuration object. `null` means the config has not been
 * parsed yet; subsequent calls to `getConfig()` reuse the cached value.
 */
let _config: EnvConfig | null = null

/**
 * Parse and return the application configuration.
 *
 * - On the first call the environment variables are validated through the
 *   Zod schema. The result is then cached for the lifetime of the process.
 * - In **development** mode, invalid or missing env vars produce a console
 *   warning but the app continues with safe defaults so DX isn't blocked.
 * - In **production** mode, invalid configuration throws immediately to
 *   prevent a misconfigured deployment from serving traffic.
 *
 * @returns The validated `EnvConfig` object.
 * @throws {Error} In production when environment validation fails.
 */
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

/**
 * Convenience accessor object that lazily evaluates `getConfig()` and exposes
 * semantic slices of the configuration through getter properties.
 *
 * Using getters (instead of plain values) ensures the underlying config is
 * resolved on first access, avoiding import-time side effects.
 */
export const appConfig = {
  /** `true` when running in development mode. */
  get isDev() { return getConfig().NODE_ENV === 'development' },
  /** `true` when running in production mode. */
  get isProd() { return getConfig().NODE_ENV === 'production' },
  /** `true` when running inside the test runner. */
  get isTest() { return getConfig().NODE_ENV === 'test' },
  /** Public base URL of the application. */
  get appUrl() { return getConfig().NEXT_PUBLIC_APP_URL },
  /** Display name of the application. */
  get appName() { return getConfig().NEXT_PUBLIC_APP_NAME },
  /** Prisma database connection string. */
  get databaseUrl() { return getConfig().DATABASE_URL },
  /**
   * Stripe payment configuration slice.
   * `isConfigured` is `true` only when both secret and public keys are present.
   */
  get stripe() {
    const c = getConfig()
    return {
      secretKey: c.STRIPE_SECRET_KEY,
      publicKey: c.STRIPE_PUBLIC_KEY,
      webhookSecret: c.STRIPE_WEBHOOK_SECRET,
      isConfigured: !!(c.STRIPE_SECRET_KEY && c.STRIPE_PUBLIC_KEY),
    }
  },
  /**
   * Email delivery configuration slice.
   * Falls back to a default "from" address when `EMAIL_FROM` is not set.
   */
  get email() {
    const c = getConfig()
    return {
      apiKey: c.RESEND_API_KEY,
      from: c.EMAIL_FROM || 'noreply@shopforge.dev',
      isConfigured: !!c.RESEND_API_KEY,
    }
  },
  /**
   * Redis configuration slice.
   * `isConfigured` is `true` only when a Redis URL is provided.
   */
  get redis() {
    const c = getConfig()
    return {
      url: c.REDIS_URL,
      isConfigured: !!c.REDIS_URL,
    }
  },
  /** Rate-limiting parameters: sliding window size and max request count. */
  get rateLimit() {
    const c = getConfig()
    return {
      windowMs: c.RATE_LIMIT_WINDOW_MS,
      maxRequests: c.RATE_LIMIT_MAX_REQUESTS,
    }
  },
  /** Logging parameters: minimum level and output format. */
  get logging() {
    const c = getConfig()
    return {
      level: c.LOG_LEVEL,
      format: c.LOG_FORMAT,
    }
  },
}
