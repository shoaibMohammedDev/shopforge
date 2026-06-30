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
import { useRouterStore } from '@/stores/router-store'
import { toast } from '@/hooks/use-toast'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { formatCurrency, StatusBadge } from './admin-page'

// ============================================================================
// AdminProductsContent
// ============================================================================

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

export function AdminProductsContent() {
  const { navigate } = useRouterStore()
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [saving, setSaving] = useState(false)

  // Add product form state
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formComparePrice, setFormComparePrice] = useState('')
  const [formCategory, setFormCategory] = useState('')
  const [formBrand, setFormBrand] = useState('')
  const [formStock, setFormStock] = useState('')
  const [formImages, setFormImages] = useState('')

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

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.brand?.name?.toLowerCase().includes(search.toLowerCase())
  )

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
      {/* Header bar */}
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
                  <TableHead className="hidden md:table-cell">Category</TableHead>
                  <TableHead className="hidden lg:table-cell">Brand</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="hidden sm:table-cell">Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                      No products found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => {
                    const images: string[] = product.images ? JSON.parse(product.images) : []
                    const totalStock = product.inventory?.reduce((s, inv) => s + inv.quantity, 0) || 0
                    return (
                      <TableRow key={product.id}>
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
                        <TableCell>
                          <p className="font-medium text-sm max-w-[200px] truncate">
                            {product.name}
                          </p>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-gray-500">
                          {product.category?.name || '—'}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-gray-500">
                          {product.brand?.name || '—'}
                        </TableCell>
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
                        <TableCell className="hidden sm:table-cell">
                          <span
                            className={`text-sm font-medium ${
                              totalStock <= 10 ? 'text-red-600' : 'text-gray-700'
                            }`}
                          >
                            {totalStock}
                          </span>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={product.isActive ? 'ACTIVE' : 'INACTIVE'} />
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate('product-detail', { id: product.id })}>
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleActive(product)}>
                                {product.isActive ? (
                                  <XCircle className="mr-2 h-4 w-4" />
                                ) : (
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                )}
                                {product.isActive ? 'Deactivate' : 'Activate'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
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

      {/* Add Product Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Product</DialogTitle>
            <DialogDescription>Create a new product listing.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="prod-name">Product Name</Label>
              <Input
                id="prod-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Enter product name"
              />
            </div>
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
