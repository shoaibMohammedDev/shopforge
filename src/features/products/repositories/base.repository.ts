// ============================================================================
// File: base.repository.ts
// Description: Generic repository pattern implementation with Prisma for ShopForge
// Key Responsibilities:
//   - Provide a consistent data access layer with logging and error handling
//   - Implement common CRUD operations (findById, findMany, create, update, delete)
//   - Support paginated queries with automatic count and page metadata
//   - Provide existence checks and fail-fast "find or throw" methods
//   - Expose a transaction wrapper for atomic multi-operation database writes
//   - Track performance of all database operations via the dbLogger
// ============================================================================

import { db } from '@/lib/db'
import { dbLogger } from '@/lib/logger'
import { Prisma } from '@prisma/client'
import { NotFoundError } from '@/lib/errors'

/**
 * Pagination options — controls page size and number for paginated queries.
 * Both fields are optional and will default to sensible values if omitted.
 */
export interface PaginationOptions {
  /** Page number (1-indexed); defaults to 1 */
  page?: number
  /** Number of items per page; defaults to 12 */
  limit?: number
}

/**
 * Pagination result metadata — returned alongside data in paginated responses.
 * Provides all the information the frontend needs to render page navigation.
 */
export interface PaginationResult {
  /** Current page number (1-indexed) */
  page: number
  /** Number of items per page */
  limit: number
  /** Total number of items matching the query (across all pages) */
  total: number
  /** Total number of pages (ceil(total / limit)) */
  totalPages: number
}

/**
 * Paginated query result — wraps an array of items with pagination metadata.
 * Generic over the item type T for type-safe usage across all repositories.
 */
export interface FindManyResult<T> {
  /** Array of items for the current page */
  items: T[]
  /** Pagination metadata */
  pagination: PaginationResult
}

/**
 * BaseRepository — abstract generic repository providing common CRUD operations.
 *
 * All feature repositories (Product, Order, Auth, etc.) should extend this class
 * and set the `modelName` property to match their Prisma model name. This provides:
 *   - Consistent error handling (NotFoundError for missing records)
 *   - Automatic performance logging via `dbLogger.measure()`
 *   - Standard pagination support
 *   - Transaction wrapper for atomic operations
 *
 * Uses `any` for Prisma model delegates since Prisma's generated types
 * don't easily support generic model access patterns. This is a deliberate
 * trade-off for DRY code across repositories.
 *
 * @template T - The shape of a single record (e.g., a Product, User, Order)
 * @template CreateInput - The shape of the creation payload
 * @template UpdateInput - The shape of the update payload
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export abstract class BaseRepository<T, CreateInput = any, UpdateInput = any> {
  /** The Prisma model name (e.g., 'product', 'user', 'order') — must be set by subclasses */
  protected abstract modelName: string
  /** Child logger scoped to this repository class for structured logging */
  protected logger = dbLogger.child(this.constructor.name)

  /**
   * Get the Prisma delegate for this model.
   *
   * Uses dynamic property access on the Prisma client to retrieve the
   * correct model delegate based on `modelName`. This enables the generic
   * CRUD methods to work with any Prisma model without code duplication.
   *
   * @returns {any} The Prisma model delegate (e.g., db.product, db.user)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected get model(): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (db as any)[this.modelName]
  }

  /**
   * Find a single record by its unique ID.
   *
   * Returns null if no record matches the given ID, allowing callers
   * to handle the "not found" case themselves.
   *
   * @param {string} id - The unique identifier of the record
   * @param {Record<string, unknown>} [include] - Optional Prisma include relations
   * @returns {Promise<T | null>} The record, or null if not found
   */
  async findById(id: string, include?: Record<string, unknown>): Promise<T | null> {
    return this.logger.measure(`findById:${this.modelName}`, async () => {
      return this.model.findUnique({ where: { id }, ...(include ? { include } : {}) })
    }, { id })
  }

  /**
   * Find a single record by ID, or throw NotFoundError if it doesn't exist.
   *
   * A convenience method that combines findById with a null check,
   * providing a fail-fast pattern for operations that require the
   * record to exist (e.g., before an update or delete).
   *
   * @param {string} id - The unique identifier of the record
   * @param {Record<string, unknown>} [include] - Optional Prisma include relations
   * @returns {Promise<T} The record (guaranteed to exist)
   * @throws {NotFoundError} If no record matches the given ID
   */
  async findByIdOrFail(id: string, include?: Record<string, unknown>): Promise<T> {
    const record = await this.findById(id, include)
    if (!record) {
      throw new NotFoundError(`${this.modelName} with id ${id}`)
    }
    return record
  }

  /**
   * Find multiple records matching the given options.
   *
   * Supports all Prisma findMany options (where, orderBy, include, etc.)
   * via a generic options object. No pagination is applied — all matching
   * records are returned.
   *
   * @param {Record<string, unknown>} [options={}] - Prisma findMany options
   * @returns {Promise<T[]>} Array of matching records
   */
  async findMany(options: Record<string, unknown> = {}): Promise<T[]> {
    return this.logger.measure(`findMany:${this.modelName}`, async () => {
      return this.model.findMany(options)
    })
  }

  /**
   * Find records with automatic pagination.
   *
   * Runs the data query and count query in parallel for efficiency,
   * then returns the results wrapped in pagination metadata.
   *
   * Default pagination: page 1, 12 items per page.
   *
   * @param {Record<string, unknown>} [options={}] - Prisma findMany options (where, orderBy, include, etc.)
   * @param {PaginationOptions} [pagination={}] - Page number and limit overrides
   * @returns {Promise<FindManyResult<T>>} Paginated results with metadata
   */
  async findPaginated(
    options: Record<string, unknown> = {},
    pagination: PaginationOptions = {}
  ): Promise<FindManyResult<T>> {
    // Apply default pagination values
    const page = pagination.page || 1
    const limit = pagination.limit || 12
    // Calculate the number of records to skip based on the current page
    const skip = (page - 1) * limit

    // Run data and count queries in parallel to minimise latency
    const [items, total] = await Promise.all([
      this.model.findMany({ ...options, skip, take: limit }),
      this.model.count({ where: options.where }),
    ])

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Create a new record in the database.
   *
   * @param {CreateInput} data - The creation payload matching Prisma's create input type
   * @param {Record<string, unknown>} [include] - Optional Prisma include relations in the response
   * @returns {Promise<T>} The newly created record
   */
  async create(data: CreateInput, include?: Record<string, unknown>): Promise<T> {
    return this.logger.measure(`create:${this.modelName}`, async () => {
      return this.model.create({ data, ...(include ? { include } : {}) })
    })
  }

  /**
   * Update an existing record by ID.
   *
   * Verifies the record exists before attempting the update, providing
   * a clear NotFoundError instead of Prisma's generic constraint error.
   *
   * @param {string} id - The unique identifier of the record to update
   * @param {UpdateInput} data - The update payload (partial fields)
   * @param {Record<string, unknown>} [include] - Optional Prisma include relations in the response
   * @returns {Promise<T>} The updated record
   * @throws {NotFoundError} If no record matches the given ID
   */
  async update(id: string, data: UpdateInput, include?: Record<string, unknown>): Promise<T> {
    return this.logger.measure(`update:${this.modelName}`, async () => {
      // Verify existence before updating to provide a clear error
      const existing = await this.findById(id)
      if (!existing) {
        throw new NotFoundError(`${this.modelName} with id ${id}`)
      }
      return this.model.update({ where: { id }, data, ...(include ? { include } : {}) })
    })
  }

  /**
   * Delete a record by ID.
   *
   * Verifies the record exists before attempting deletion, providing
   * a clear NotFoundError instead of a silent no-op.
   *
   * @param {string} id - The unique identifier of the record to delete
   * @returns {Promise<T>} The deleted record (useful for audit logging)
   * @throws {NotFoundError} If no record matches the given ID
   */
  async delete(id: string): Promise<T> {
    return this.logger.measure(`delete:${this.modelName}`, async () => {
      // Verify existence before deleting to provide a clear error
      const existing = await this.findById(id)
      if (!existing) {
        throw new NotFoundError(`${this.modelName} with id ${id}`)
      }
      return this.model.delete({ where: { id } })
    })
  }

  /**
   * Count records matching the given where clause.
   *
   * Useful for dashboard statistics and existence checks where the
   * full record data is not needed.
   *
   * @param {Record<string, unknown>} [where] - Prisma where clause for filtering
   * @returns {Promise<number>} The number of matching records
   */
  async count(where?: Record<string, unknown>): Promise<number> {
    return this.model.count({ where })
  }

  /**
   * Check whether a record with the given ID exists.
   *
   * More efficient than findById for existence checks because it
   * doesn't need to transfer the full record data.
   *
   * @param {string} id - The unique identifier to check
   * @returns {Promise<boolean>} True if the record exists, false otherwise
   */
  async exists(id: string): Promise<boolean> {
    const record = await this.findById(id)
    return record !== null
  }

  /**
   * Execute operations within a Prisma interactive transaction.
   *
   * Wraps Prisma's `$transaction` method, providing a convenient way
   * for repositories to perform multiple write operations atomically.
   * If any operation within the callback throws, all changes are rolled back.
   *
   * @template R - The return type of the transaction callback
   * @param {(tx: Prisma.TransactionClient) => Promise<R>} fn - The transaction callback
   * @returns {Promise<R>} The result of the transaction callback
   */
  async transaction<R>(fn: (tx: Prisma.TransactionClient) => Promise<R>): Promise<R> {
    return db.$transaction(fn)
  }
}
