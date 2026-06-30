/**
 * @file modules/products/index.ts
 * @description Barrel export for the Products module.
 */
export { default as ProductsPage } from './components/products-page'
export { default as ProductDetailPage } from './components/product-detail-page'
export { productService } from './services/product.service'
export { ProductRepository } from './repositories/product.repository'
export type {
  ProductListQueryDTO, ProductDetailQueryDTO, CreateProductDTO,
  UpdateProductDTO, ProductListItemDTO, ProductDetailDTO,
  ProductVariantDTO, ReviewDTO, PaginatedProductsDTO,
} from './dto/product.dto'
