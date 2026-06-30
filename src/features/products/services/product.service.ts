// ============================================================================
// File: product.service.ts
// Description: Product listing, search, filtering, and management service for ShopForge
// Key Responsibilities:
//   - Retrieve paginated product lists with multi-dimensional filtering
//     (search, category, brand, price range, rating, featured, tags)
//   - Retrieve single product details by ID or URL slug
//   - Create new products with auto-generated slugs and SKU codes (admin)
//   - Update existing products with existence validation (admin)
//   - Retrieve featured products for the homepage
// ============================================================================

import { productRepository, type ProductFilterOptions, type ProductSortOptions } from '../repositories/product.repository'
import { apiLogger } from '@/lib/logger'
import { NotFoundError, ValidationError } from '@/lib/errors'
import type {
  ProductListQueryDTO,
  CreateProductDTO,
  UpdateProductDTO,
  ProductDetailDTO,
  PaginatedProductsDTO,
} from '../dto/product.dto'
import { db } from '@/lib/db'

/**
 * ProductService — business logic layer for product operations.
 *
 * Sits between the API route handlers and the product repository,
 * handling validation, data transformation, and orchestration.
 * All public methods are wrapped with `apiLogger.measure()` for
 * automatic performance tracking.
 */
class ProductService {
  /**
   * Retrieve a paginated, filtered, and sorted list of products.
   *
   * Maps the incoming query DTO to the repository's filter and sort
   * options, then delegates to the repository for the actual query.
   *
   * @param {ProductListQueryDTO} query - The filter, sort, and pagination parameters
   * @param {string} [query.search] - Full-text search across name, description, SKU
   * @param {string} [query.categoryId] - Filter by category ID
   * @param {string} [query.brandId] - Filter by brand ID
   * @param {number} [query.minPrice] - Minimum price filter
   * @param {number} [query.maxPrice] - Maximum price filter
   * @param {number} [query.minRating] - Minimum average rating filter
   * @param {string} [query.sort='newest'] - Sort strategy
   * @param {number} [query.page] - Page number (1-indexed)
   * @param {number} [query.limit] - Items per page
   * @param {boolean} [query.isFeatured] - Filter to featured products only
   * @param {string} [query.tag] - Filter by product tag
   * @returns {Promise<PaginatedProductsDTO>} Paginated product list with metadata
   */
  async getProducts(query: ProductListQueryDTO): Promise<PaginatedProductsDTO> {
    return apiLogger.measure('getProducts', async () => {
      // Map the query DTO fields to the repository's filter options
      const filters: ProductFilterOptions = {
        search: query.search,
        categoryId: query.categoryId,
        brandId: query.brandId,
        minPrice: query.minPrice,
        maxPrice: query.maxPrice,
        minRating: query.minRating,
        isFeatured: query.isFeatured,
        tag: query.tag,
      }

      // Default to 'newest' sort if none specified
      const sort: ProductSortOptions = { sort: query.sort || 'newest' }
      const result = await productRepository.findFiltered(filters, sort, {
        page: query.page,
        limit: query.limit,
      })

      return result as unknown as PaginatedProductsDTO
    })
  }

  /**
   * Retrieve a single product's full details by ID or URL slug.
   *
   * The repository's `findDetail` method automatically detects whether
   * the input is a UUID (long string) or a slug (short string) and
   * queries accordingly.
   *
   * @param {string} idOrSlug - Either the product's UUID or its URL-friendly slug
   * @returns {Promise<ProductDetailDTO>} The product with variants, inventory, reviews, and flash sale data
   * @throws {NotFoundError} If no product matches the given ID or slug
   */
  async getProductDetail(idOrSlug: string): Promise<ProductDetailDTO> {
    return apiLogger.measure('getProductDetail', async () => {
      const product = await productRepository.findDetail(idOrSlug)
      if (!product) {
        throw new NotFoundError('Product')
      }

      return product as unknown as ProductDetailDTO
    })
  }

  /**
   * Create a new product with auto-generated slug and SKU (admin only).
   *
   * The slug is derived from the product name by lowercasing and replacing
   * non-alphanumeric characters with hyphens. If a product with the same
   * slug already exists, a validation error is thrown to prevent duplicates.
   *
   * After creating the product, an inventory record is initialised with
   * the specified stock quantity (defaulting to 0 if not provided).
   *
   * @param {CreateProductDTO} data - The product creation payload
   * @param {string} data.name - Product name (used to generate the slug)
   * @param {string} data.description - Full product description
   * @param {number} data.price - Selling price
   * @param {string} data.categoryId - Category to assign the product to
   * @returns {Promise<Record<string, unknown>>} The newly created product record
   * @throws {ValidationError} If a product with the same slug already exists
   */
  async createProduct(data: CreateProductDTO): Promise<Record<string, unknown>> {
    return apiLogger.measure('createProduct', async () => {
      // Generate a URL-friendly slug from the product name
      // e.g., "Sony WH-1000XM5" → "sony-wh-1000xm5"
      const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

      // Check for slug uniqueness — slugs must be unique for URL routing
      const existing = await db.product.findUnique({ where: { slug } })
      if (existing) {
        throw new ValidationError(`Product with slug "${slug}" already exists`)
      }

      const product = await db.product.create({
        data: {
          name: data.name,
          description: data.description,
          shortDesc: data.shortDesc,
          price: data.price,
          comparePrice: data.comparePrice,
          categoryId: data.categoryId,
          brandId: data.brandId,
          slug,
          // Auto-generate a unique SKU using timestamp for basic uniqueness
          sku: `SKU-${Date.now()}`,
          images: JSON.stringify(data.images || []),
          isFeatured: data.isFeatured || false,
          isDigital: data.isDigital || false,
          weight: data.weight,
          dimensions: data.dimensions,
          isActive: true,
        },
      })

      // Initialise inventory record for the new product
      // Low stock threshold defaults to 10 — triggers restock alerts
      await db.inventory.create({
        data: {
          productId: product.id,
          quantity: data.stock || 0,
          reserved: 0,
          lowStockThreshold: 10,
          sku: product.sku,
        },
      })

      apiLogger.info('Product created', { productId: product.id, slug })
      return product as unknown as Record<string, unknown>
    })
  }

  /**
   * Update an existing product's details (admin only).
   *
   * Verifies the product exists before attempting the update to provide
   * a clear error message rather than relying on Prisma's generic error.
   *
   * @param {string} id - The ID of the product to update
   * @param {UpdateProductDTO} data - The fields to update (partial update)
   * @param {string} [data.name] - Updated product name
   * @param {string} [data.description] - Updated description
   * @param {number} [data.price] - Updated selling price
   * @param {number} [data.comparePrice] - Updated comparison (strike-through) price
   * @param {boolean} [data.isActive] - Toggle product visibility
   * @param {boolean} [data.isFeatured] - Toggle featured status
   * @returns {Promise<Record<string, unknown>>} The updated product record
   * @throws {NotFoundError} If the product doesn't exist
   */
  async updateProduct(id: string, data: UpdateProductDTO): Promise<Record<string, unknown>> {
    return apiLogger.measure('updateProduct', async () => {
      // Verify product exists before attempting the update
      const existing = await db.product.findUnique({ where: { id } })
      if (!existing) {
        throw new NotFoundError('Product')
      }

      const product = await db.product.update({
        where: { id },
        data: data as Record<string, unknown>,
      })

      apiLogger.info('Product updated', { productId: id })
      return product as unknown as Record<string, unknown>
    })
  }

  /**
   * Retrieve featured products for the homepage.
   *
   * Delegates to the repository's filtered query with `isFeatured: true`
   * and 'popular' sort order so the most-purchased featured products
   * appear first.
   *
   * @param {number} [limit=8] - Maximum number of featured products to return
   * @returns {Promise<Record<string, unknown>[]>} List of featured products
   */
  async getFeaturedProducts(limit: number = 8): Promise<Record<string, unknown>[]> {
    const result = await productRepository.findFiltered({ isFeatured: true }, { sort: 'popular' }, { limit })
    return result.items
  }
}

/** Singleton instance of ProductService for use across the application */
export const productService = new ProductService()
