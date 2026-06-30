// ============================================================================
// ShopForge - Base Repository
// Generic repository pattern implementation with Prisma
// Provides a consistent data access layer with logging and error handling
// ============================================================================

import { db } from '@/lib/db'
import { dbLogger } from '@/lib/logger'
import { Prisma } from '@prisma/client'
import { NotFoundError } from '@/lib/errors'

export interface PaginationOptions {
  page?: number
  limit?: number
}

export interface PaginationResult {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface FindManyResult<T> {
  items: T[]
  pagination: PaginationResult
}

/**
 * Base repository providing common CRUD operations
 * All feature repositories should extend this class
 *
 * Uses `any` for Prisma model delegates since Prisma's generated types
 * don't easily support generic model access patterns.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export abstract class BaseRepository<T, CreateInput = any, UpdateInput = any> {
  protected abstract modelName: string
  protected logger = dbLogger.child(this.constructor.name)

  /**
   * Get the Prisma delegate for this model
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected get model(): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (db as any)[this.modelName]
  }

  async findById(id: string, include?: Record<string, unknown>): Promise<T | null> {
    return this.logger.measure(`findById:${this.modelName}`, async () => {
      return this.model.findUnique({ where: { id }, ...(include ? { include } : {}) })
    }, { id })
  }

  async findByIdOrFail(id: string, include?: Record<string, unknown>): Promise<T> {
    const record = await this.findById(id, include)
    if (!record) {
      throw new NotFoundError(`${this.modelName} with id ${id}`)
    }
    return record
  }

  async findMany(options: Record<string, unknown> = {}): Promise<T[]> {
    return this.logger.measure(`findMany:${this.modelName}`, async () => {
      return this.model.findMany(options)
    })
  }

  async findPaginated(
    options: Record<string, unknown> = {},
    pagination: PaginationOptions = {}
  ): Promise<FindManyResult<T>> {
    const page = pagination.page || 1
    const limit = pagination.limit || 12
    const skip = (page - 1) * limit

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

  async create(data: CreateInput, include?: Record<string, unknown>): Promise<T> {
    return this.logger.measure(`create:${this.modelName}`, async () => {
      return this.model.create({ data, ...(include ? { include } : {}) })
    })
  }

  async update(id: string, data: UpdateInput, include?: Record<string, unknown>): Promise<T> {
    return this.logger.measure(`update:${this.modelName}`, async () => {
      const existing = await this.findById(id)
      if (!existing) {
        throw new NotFoundError(`${this.modelName} with id ${id}`)
      }
      return this.model.update({ where: { id }, data, ...(include ? { include } : {}) })
    })
  }

  async delete(id: string): Promise<T> {
    return this.logger.measure(`delete:${this.modelName}`, async () => {
      const existing = await this.findById(id)
      if (!existing) {
        throw new NotFoundError(`${this.modelName} with id ${id}`)
      }
      return this.model.delete({ where: { id } })
    })
  }

  async count(where?: Record<string, unknown>): Promise<number> {
    return this.model.count({ where })
  }

  async exists(id: string): Promise<boolean> {
    const record = await this.findById(id)
    return record !== null
  }

  /**
   * Execute operations within a Prisma transaction
   */
  async transaction<R>(fn: (tx: Prisma.TransactionClient) => Promise<R>): Promise<R> {
    return db.$transaction(fn)
  }
}
