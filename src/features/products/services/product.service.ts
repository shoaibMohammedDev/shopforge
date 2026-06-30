// ============================================================================
// ShopForge - Product Service
// Business logic layer that sits between API routes and repositories
// Encapsulates validation, transformation, and orchestration
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

class ProductService {
  /**
   * Get paginated product list with filters
   */
  async getProducts(query: ProductListQueryDTO): Promise<PaginatedProductsDTO> {
    return apiLogger.measure('getProducts', async () => {
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

      const sort: ProductSortOptions = { sort: query.sort || 'newest' }
      const result = await productRepository.findFiltered(filters, sort, {
        page: query.page,
        limit: query.limit,
      })

      return result as unknown as PaginatedProductsDTO
    })
  }

  /**
   * Get product detail by ID or slug
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
   * Create a new product (admin only)
   */
  async createProduct(data: CreateProductDTO): Promise<Record<string, unknown>> {
    return apiLogger.measure('createProduct', async () => {
      const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

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
          sku: `SKU-${Date.now()}`,
          images: JSON.stringify(data.images || []),
          isFeatured: data.isFeatured || false,
          isDigital: data.isDigital || false,
          weight: data.weight,
          dimensions: data.dimensions,
          isActive: true,
        },
      })

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
   * Update an existing product (admin only)
   */
  async updateProduct(id: string, data: UpdateProductDTO): Promise<Record<string, unknown>> {
    return apiLogger.measure('updateProduct', async () => {
      // Verify product exists
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
   * Get featured products for homepage
   */
  async getFeaturedProducts(limit: number = 8): Promise<Record<string, unknown>[]> {
    const result = await productRepository.findFiltered({ isFeatured: true }, { sort: 'popular' }, { limit })
    return result.items
  }
}

export const productService = new ProductService()
