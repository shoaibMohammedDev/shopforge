'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Trash2,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { StatusBadge, StarRating } from './admin-page'

// ============================================================================
// AdminReviewsContent
// ============================================================================

interface AdminReview {
  id: string
  rating: number
  title: string | null
  content: string | null
  isApproved: boolean | null
  createdAt: string
  user: { name: string | null; email: string }
  product: { name: string; images: string }
}

export function AdminReviewsContent() {
  const [reviews, setReviews] = useState<AdminReview[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL')

  const fetchReviews = useCallback(async () => {
    try {
      const res = await fetch('/api/admin?action=reviews')
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setReviews(data)
    } catch (err) {
      console.error('Failed to fetch reviews:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  async function handleApprove(id: string) {
    try {
      const res = await fetch('/api/admin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve-review', id, data: { isApproved: true } }),
      })
      if (!res.ok) throw new Error('Failed')
      toast({ title: 'Review approved' })
      fetchReviews()
    } catch {
      toast({ title: 'Failed to approve review', variant: 'destructive' })
    }
  }

  async function handleReject(id: string) {
    try {
      const res = await fetch('/api/admin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve-review', id, data: { isApproved: false } }),
      })
      if (!res.ok) throw new Error('Failed')
      toast({ title: 'Review rejected' })
      fetchReviews()
    } catch {
      toast({ title: 'Failed to reject review', variant: 'destructive' })
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/admin?action=delete-review&id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      toast({ title: 'Review deleted' })
      fetchReviews()
    } catch {
      toast({ title: 'Failed to delete review', variant: 'destructive' })
    }
  }

  function getReviewStatus(review: AdminReview): 'Pending' | 'Approved' | 'Rejected' {
    if (review.isApproved === true) return 'Approved'
    if (review.isApproved === false) return 'Rejected'
    return 'Pending'
  }

  const filteredReviews = reviews.filter((r) => {
    if (filter === 'ALL') return true
    const status = getReviewStatus(r)
    return status.toUpperCase() === filter
  })

  return (
    <>
      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="mb-6">
        <TabsList>
          <TabsTrigger value="ALL">All</TabsTrigger>
          <TabsTrigger value="PENDING">Pending</TabsTrigger>
          <TabsTrigger value="APPROVED">Approved</TabsTrigger>
          <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
        </TabsList>
      </Tabs>

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
                  <TableHead>Product</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead className="hidden md:table-cell">Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReviews.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                      No reviews found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReviews.map((review) => (
                    <TableRow key={review.id}>
                      <TableCell className="text-sm max-w-[150px] truncate">
                        {review.product?.name || 'Unknown Product'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {review.user?.name || review.user?.email || 'Anonymous'}
                      </TableCell>
                      <TableCell><StarRating rating={review.rating} /></TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-gray-500 max-w-[200px] truncate">
                        {review.title || '—'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={getReviewStatus(review)} />
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {getReviewStatus(review) !== 'Approved' && (
                              <DropdownMenuItem onClick={() => handleApprove(review.id)}>
                                <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                                Approve
                              </DropdownMenuItem>
                            )}
                            {getReviewStatus(review) !== 'Rejected' && (
                              <DropdownMenuItem onClick={() => handleReject(review.id)}>
                                <XCircle className="mr-2 h-4 w-4 text-red-600" />
                                Reject
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => handleDelete(review.id)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  )
}
