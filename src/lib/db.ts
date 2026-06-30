/**
 * @file db.ts
 * @description Prisma ORM database client singleton for ShopForge.
 *   Ensures that only **one** PrismaClient instance exists per process,
 *   preventing the "too many connections" problem that occurs when hot-reloading
 *   creates new client instances in development.
 *
 * Key Responsibilities:
 *   - Export a single, reusable `db` (PrismaClient) instance
 *   - Cache the instance on `globalThis` during development so it survives
 *     Next.js Fast Refresh cycles without spawning extra connections
 *   - Enable query logging in all environments for debugging
 */

import { PrismaClient } from '@prisma/client'

/**
 * Extend `globalThis` with an optional PrismaClient property.
 *
 * In development, Next.js rebuilds modules on every file change. Without
 * this cache, each rebuild would instantiate a new PrismaClient, rapidly
 * exhausting the database connection pool. By stashing the client on
 * `globalThis`, we reuse the same connection across hot-reload cycles.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Singleton PrismaClient instance.
 *
 * - If a client already exists on `globalThis` (from a previous hot-reload
 *   cycle in development), reuse it.
 * - Otherwise, create a new client with query logging enabled.
 * - Query logging (`log: ['query']`) prints every SQL statement to stdout,
 *   which is invaluable for debugging N+1 queries and verifying generated SQL.
 */
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

/**
 * Persist the client on `globalThis` in non-production environments.
 *
 * Production builds are stateless — each server process creates exactly one
 * client, so the global cache is unnecessary. In development, however,
 * the cache prevents connection-pool exhaustion during Fast Refresh.
 */
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
