'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  MapPin,
  Trash2,
  Plus,
  Pencil,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { api } from '@/lib/api-client'
import { toast } from '@/hooks/use-toast'
import type { AddressDisplay } from '@/types'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

import {
  AccountLayout,
  useAuthGuard,
} from './account-layout'

// ============================================================================
// Schema
// ============================================================================

const addressSchema = z.object({
  label: z.string().optional(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  street1: z.string().min(1, 'Street address is required'),
  street2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  country: z.string().min(1, 'Country is required'),
  phone: z.string().optional(),
  isDefault: z.boolean().optional(),
})

type AddressFormValues = z.infer<typeof addressSchema>

// ============================================================================
// AddressCard (internal helper)
// ============================================================================

function AddressCard({
  address,
  onEdit,
  onDelete,
}: {
  address: AddressDisplay
  onEdit: (address: AddressDisplay) => void
  onDelete: (id: string) => void
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-semibold">
                {address.firstName} {address.lastName}
              </span>
              {address.isDefault && (
                <Badge variant="secondary" className="text-xs">
                  Default
                </Badge>
              )}
              {address.label && (
                <Badge variant="outline" className="text-xs">
                  {address.label}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">{address.street1}</p>
            {address.street2 && (
              <p className="text-muted-foreground">{address.street2}</p>
            )}
            <p className="text-muted-foreground">
              {address.city}, {address.state} {address.postalCode}
            </p>
            <p className="text-muted-foreground">{address.country}</p>
            {address.phone && (
              <p className="text-muted-foreground">{address.phone}</p>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            <Button
              size="icon"
              variant="ghost"
              className="size-8"
              onClick={() => onEdit(address)}
            >
              <Pencil className="size-3.5" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Address</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this address? This action
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => onDelete(address.id)}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// AccountAddressesPage
// ============================================================================

export function AccountAddressesPage() {
  const isAuthenticated = useAuthGuard()
  const user = useAuthStore((s) => s.user)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<AddressDisplay | null>(null)

  const { data: addresses = [], isLoading, refetch } = useQuery<AddressDisplay[]>({
    queryKey: ['user-addresses', user?.id],
    queryFn: async () => {
      const result = await api.get<AddressDisplay[]>('/addresses', { userId: user!.id })
      return result.success && result.data ? result.data : []
    },
    enabled: !!user?.id,
  })

  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      label: '',
      firstName: '',
      lastName: '',
      street1: '',
      street2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'US',
      phone: '',
      isDefault: false,
    },
  })

  const openAddDialog = () => {
    setEditingAddress(null)
    form.reset({
      label: '',
      firstName: '',
      lastName: '',
      street1: '',
      street2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'US',
      phone: '',
      isDefault: false,
    })
    setDialogOpen(true)
  }

  const openEditDialog = (address: AddressDisplay) => {
    setEditingAddress(address)
    form.reset({
      label: address.label || '',
      firstName: address.firstName,
      lastName: address.lastName,
      street1: address.street1,
      street2: address.street2 || '',
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      phone: address.phone || '',
      isDefault: address.isDefault,
    })
    setDialogOpen(true)
  }

  const onSubmitAddress = async (values: AddressFormValues) => {
    try {
      const payload = {
        userId: user!.id,
        ...values,
        label: values.label || null,
        street2: values.street2 || null,
        phone: values.phone || null,
      }

      if (editingAddress) {
        const result = await api.put(`/addresses/${editingAddress.id}`, payload)
        if (result.success) {
          toast({ title: 'Address updated', description: 'Your address has been updated.' })
        } else {
          toast({ title: 'Error', description: result.error || 'Failed to update address', variant: 'destructive' })
          return
        }
      } else {
        const result = await api.post('/addresses', payload)
        if (result.success) {
          toast({ title: 'Address added', description: 'New address has been saved.' })
        } else {
          toast({ title: 'Error', description: result.error || 'Failed to add address', variant: 'destructive' })
          return
        }
      }
      setDialogOpen(false)
      refetch()
    } catch {
      toast({ title: 'Error', description: 'An unexpected error occurred.', variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const result = await api.delete(`/addresses/${id}`)
      if (result.success) {
        toast({ title: 'Address deleted', description: 'The address has been removed.' })
        refetch()
      } else {
        toast({ title: 'Error', description: result.error || 'Failed to delete address', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'An unexpected error occurred.', variant: 'destructive' })
    }
  }

  if (!isAuthenticated || !user) return null

  return (
    <AccountLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Addresses</h1>
            <p className="text-muted-foreground mt-1">
              Manage your shipping and billing addresses
            </p>
          </div>
          <Button className="gap-1" onClick={openAddDialog}>
            <Plus className="size-4" />
            Add New
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : addresses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MapPin className="size-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-medium mb-1">No addresses saved</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add a shipping address for faster checkout.
              </p>
              <Button onClick={openAddDialog}>
                <Plus className="size-4 mr-1" />
                Add Address
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {addresses.map((addr) => (
              <AddressCard
                key={addr.id}
                address={addr}
                onEdit={openEditDialog}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Add/Edit Address Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAddress ? 'Edit Address' : 'Add New Address'}
              </DialogTitle>
              <DialogDescription>
                {editingAddress
                  ? 'Update your address details below.'
                  : 'Fill in the details for your new address.'}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmitAddress)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="label"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Label (e.g. Home, Work)</FormLabel>
                      <FormControl>
                        <Input placeholder="Home" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="street1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main St" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="street2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apartment, suite, etc. (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Apt 4B" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="New York" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input placeholder="NY" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal Code</FormLabel>
                        <FormControl>
                          <Input placeholder="10001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input placeholder="US" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 (555) 123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isDefault"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <FormLabel>Set as default address</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingAddress ? 'Save Changes' : 'Add Address'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </motion.div>
    </AccountLayout>
  )
}
