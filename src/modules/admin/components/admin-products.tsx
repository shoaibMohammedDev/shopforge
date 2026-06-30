/**
 * @file admin-products.tsx
 * @description Product management page for the ShopForge admin panel. Provides
 * a searchable product list table with actions for viewing, activating/
 * deactivating, and deleting products. Includes a dialog form for creating
 * new products with fields for name, description, price, category, brand,
 * stock, and image URLs.
 *
 * @keyfeatures
 * - Searchable product table with responsive column hiding
 * - Product image thumbnails in table rows
 * - Activate/deactivate product toggle via dropdown menu
 * - Delete product via dropdown menu
 * - "Add Product" dialog form with comprehensive fields
 * - Real-time search filtering by name, category, or brand
 * - Loading skeletons and empty state handling
 * - Stock quantity with low-stock warning (red text when <= 10)
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Package,
  Search,
  Plus,
  Trash2,
  Eye,
  MoreHorizontal,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { useRouterStore } from "@/shared/stores/router-store"
import { toast } from "@/shared/hooks/use-toast"

import { Button } from "@/shared/components/ui/button"
import { Card, CardContent } from "@/shared/components/ui/card"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { Textarea } from "@/shared/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"

import { formatCurrency, StatusBadge } from './admin-page'

// ============================================================================
// AdminProductsContent
// ============================================================================

/**
 * @interface AdminProduct
 * @description Represents a product as returned by the admin API. Includes
 * related category and brand names, inventory quantities, and activation status.
 *
 * @property {string} id - Unique product identifier
 * @property {string} name - Product display name
 * @property {string} slug - URL-friendly product slug
 * @property {number} price - Current selling price
 * @property {number | null} comparePrice - Original/reference price for showing discounts
 * @property {string} images - JSON-encoded array of image URLs
 * @property {boolean} isActive - Whether the product is visible in the store
 * @property {boolean} isFeatured - Whether the product is featured on the homepage
 * @property {{ name: string } | null} category - Related category with name
 * @property {{ name: string } | null} brand - Related brand with name
 * @property {{ quantity: number; reserved: number }[]} inventory - Array of inventory records
 */
interface AdminProduct {
  id: string
  name: string
  slug: string
  price: number
  comparePrice: number | null
  images: string
  isActive: boolean
  isFeatured: boolean
  category: { name: string } | null
  brand: { name: string } | null
  inventory: { quantity: number; reserved: number }[]
}

/**
 * @function AdminProductsContent
 * @description Product management content for the admin panel. Displays a
 * searchable, filterable table of all products with actions for managing
 * product status and creating new products.
 *
 * @state
 * - `products` - array of AdminProduct fetched from /api/admin?action=products
 * - `loading` - boolean for initial data fetch state
 * - `search` - local search string for client-side filtering
 * - `showAddDialog` - boolean controlling the add product dialog visibility
 * - `saving` - boolean for the create product API call loading state
 * - Form fields: formName, formDesc, formPrice, formComparePrice, formCategory,
 *   formBrand, formStock, formImages - individual state for each form input
 *
 * @remarks
 * - Products are filtered client-side by name, category, or brand
 * - Total stock is calculated by summing all inventory quantity values
 * - Low stock (<= 10) is highlighted in red
 */
export function AdminProductsContent() {
  const { navigate } = useRouterStore()
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [saving, setSaving] = useState(false)

  // Add product form state - individual fields for the create product dialog
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formComparePrice, setFormComparePrice] = useState('')
  const [formCategory, setFormCategory] = useState('')
  const [formBrand, setFormBrand] = useState('')
  const [formStock, setFormStock] = useState('')
  const [formImages, setFormImages] = useState('')

  /**
   * Fetches all products from the admin API. Called on mount and after
   * mutations (create, toggle, delete) to refresh the product list.
   */
  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/admin?action=products')
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setProducts(data)
    } catch (err) {
      console.error('Failed to fetch products:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch products on component mount
  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Client-side filtering: search by name, category, or brand
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.brand?.name?.toLowerCase().includes(search.toLowerCase())
  )

  /**
   * Toggles a product's active status (activate/deactivate). Sends a PUT
   * request to the admin API and refreshes the product list on success.
   *
   * @param {AdminProduct} product - The product to toggle
   */
  async function handleToggleActive(product: AdminProduct) {
    try {
      const res = await fetch('/api/admin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-product',
          id: product.id,
          data: { isActive: !product.isActive },
        }),
      })
      if (!res.ok) throw new Error('Failed')
      toast({ title: `Product ${product.isActive ? 'deactivated' : 'activated'}` })
      fetchProducts()
    } catch {
      toast({ title: 'Failed to update product', variant: 'destructive' })
    }
  }

  /**
   * Deletes a product by ID. Sends a DELETE request to the admin API
   * and refreshes the product list on success.
   *
   * @param {string} id - The ID of the product to delete
   */
  async function handleDeleteProduct(id: string) {
    try {
      const res = await fetch(`/api/admin?action=delete-product&id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      toast({ title: 'Product deleted' })
      fetchProducts()
    } catch {
      toast({ title: 'Failed to delete product', variant: 'destructive' })
    }
  }

  /**
   * Handles the add product form submission. Sends a POST request to create
   * a new product with the form field values. Parses comma-separated image
   * URLs into an array. Resets the form and closes the dialog on success.
   */
  async function handleAddProduct() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-product',
          data: {
            name: formName,
            description: formDesc,
            price: parseFloat(formPrice) || 0,
            comparePrice: formComparePrice ? parseFloat(formComparePrice) : null,
            category: formCategory,
            brand: formBrand,
            stock: parseInt(formStock) || 0,
            // Parse comma-separated URLs into an array
            images: formImages ? formImages.split(',').map((s) => s.trim()) : [],
          },
        }),
      })
      if (!res.ok) throw new Error('Failed')
      toast({ title: 'Product created successfully' })
      setShowAddDialog(false)
      resetForm()
      fetchProducts()
    } catch {
      toast({ title: 'Failed to create product', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  /**
   * Resets all add product form fields to their default empty values.
   */
  function resetForm() {
    setFormName('')
    setFormDesc('')
    setFormPrice('')
    setFormComparePrice('')
    setFormCategory('')
    setFormBrand('')
    setFormStock('')
    setFormImages('')
  }

  return (
    <>
      {/* Header bar with search input and Add Product button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Products table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            /* Loading state: skeleton placeholders */
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Name</TableHead>
                  {/* Category column - hidden on small screens */}
                  <TableHead className="hidden md:table-cell">Category</TableHead>
                  {/* Brand column - hidden on medium and smaller screens */}
                  <TableHead className="hidden lg:table-cell">Brand</TableHead>
                  <TableHead>Price</TableHead>
                  {/* Stock column - hidden on extra-small screens */}
                  <TableHead className="hidden sm:table-cell">Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  /* Empty state: no products match the search filter */
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                      No products found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => {
                    // Parse images JSON and calculate total stock across all inventory records
                    const images: string[] = product.images ? JSON.parse(product.images) : []
                    const totalStock = product.inventory?.reduce((s, inv) => s + inv.quantity, 0) || 0
                    return (
                      <TableRow key={product.id}>
                        {/* Product image thumbnail or placeholder */}
                        <TableCell>
                          {images[0] ? (
                            <img
                              src={images[0]}
                              alt={product.name}
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                              <Package className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                        </TableCell>
                        {/* Product name - truncated for long names */}
                        <TableCell>
                          <p className="font-medium text-sm max-w-[200px] truncate">
                            {product.name}
                          </p>
                        </TableCell>
                        {/* Category name */}
                        <TableCell className="hidden md:table-cell text-sm text-gray-500">
                          {product.category?.name || '—'}
                        </TableCell>
                        {/* Brand name */}
                        <TableCell className="hidden lg:table-cell text-sm text-gray-500">
                          {product.brand?.name || '—'}
                        </TableCell>
                        {/* Price with optional compare-at (strikethrough) price */}
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-medium">
                              {formatCurrency(product.price)}
                            </span>
                            {product.comparePrice && product.comparePrice > product.price && (
                              <span className="text-xs text-gray-400 line-through">
                                {formatCurrency(product.comparePrice)}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        {/* Stock quantity - red text for low stock (<= 10) */}
                        <TableCell className="hidden sm:table-cell">
                          <span
                            className={`text-sm font-medium ${
                              totalStock <= 10 ? 'text-red-600' : 'text-gray-700'
                            }`}
                          >
                            {totalStock}
                          </span>
                        </TableCell>
                        {/* Active/Inactive status badge */}
                        <TableCell>
                          <StatusBadge status={product.isActive ? 'ACTIVE' : 'INACTIVE'} />
                        </TableCell>
                        {/* Action dropdown menu */}
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {/* View product detail page */}
                              <DropdownMenuItem onClick={() => navigate('product-detail', { id: product.id })}>
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </DropdownMenuItem>
                              {/* Toggle active/inactive status */}
                              <DropdownMenuItem onClick={() => handleToggleActive(product)}>
                                {product.isActive ? (
                                  <XCircle className="mr-2 h-4 w-4" />
                                ) : (
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                )}
                                {product.isActive ? 'Deactivate' : 'Activate'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {/* Delete product */}
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => handleDeleteProduct(product.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Product Dialog - form with all product fields */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Product</DialogTitle>
            <DialogDescription>Create a new product listing.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Product name field */}
            <div className="grid gap-2">
              <Label htmlFor="prod-name">Product Name</Label>
              <Input
                id="prod-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Enter product name"
              />
            </div>
            {/* Product description field */}
            <div className="grid gap-2">
              <Label htmlFor="prod-desc">Description</Label>
              <Textarea
                id="prod-desc"
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Enter product description"
                rows={3}
              />
            </div>
            {/* Price and Compare Price - side by side */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="prod-price">Price</Label>
                <Input
                  id="prod-price"
                  type="number"
                  step="0.01"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="prod-compare">Compare Price</Label>
                <Input
                  id="prod-compare"
                  type="number"
                  step="0.01"
                  value={formComparePrice}
                  onChange={(e) => setFormComparePrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            {/* Category and Brand - side by side */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="prod-category">Category</Label>
                <Input
                  id="prod-category"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  placeholder="Category name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="prod-brand">Brand</Label>
                <Input
                  id="prod-brand"
                  value={formBrand}
                  onChange={(e) => setFormBrand(e.target.value)}
                  placeholder="Brand name"
                />
              </div>
            </div>
            {/* Stock quantity */}
            <div className="grid gap-2">
              <Label htmlFor="prod-stock">Stock Quantity</Label>
              <Input
                id="prod-stock"
                type="number"
                value={formStock}
                onChange={(e) => setFormStock(e.target.value)}
                placeholder="0"
              />
            </div>
            {/* Image URLs - comma-separated */}
            <div className="grid gap-2">
              <Label htmlFor="prod-images">Image URLs</Label>
              <Input
                id="prod-images"
                value={formImages}
                onChange={(e) => setFormImages(e.target.value)}
                placeholder="Comma-separated image URLs"
              />
              <p className="text-xs text-gray-500">Separate multiple URLs with commas</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            {/* Submit button - disabled while saving or when required fields are empty */}
            <Button onClick={handleAddProduct} disabled={saving || !formName || !formPrice}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
