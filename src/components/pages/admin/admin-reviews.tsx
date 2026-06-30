/**
 * @file admin-reviews.tsx
 * @description Review management page for the ShopForge admin panel. Provides
 * a filterable table of all product reviews with actions for approving,
 * rejecting, and deleting reviews. Includes status filter tabs for
 * All, Pending, Approved, and Rejected reviews.
 *
 * @keyfeatures
 * - Status filter tabs (ALL, PENDING, APPROVED, REJECTED)
 * - Reviews table with product name, user, star rating, title, and status
 * - Approve/reject review actions via dropdown menu
 * - Delete review via dropdown menu
 * - Star rating visual display using StarRating component
 * - Client-side filtering based on review approval status
 * - Loading skeletons and empty state handling
 */
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

/**
 * @interface AdminReview
 * @description Represents a product review as returned by the admin API.
 * Includes the review content, rating, approval status, and related
 * user and product information.
 *
 * @property {string} id - Unique review identifier
 * @property {number} rating - Star rating value (1-5)
 * @property {string | null} title - Review headline/title (may be null)
 * @property {string | null} content - Review body text (may be null)
 * @property {boolean | null} isApproved - Approval state: true=approved, false=rejected, null=pending
 * @property {string} createdAt - ISO 8601 creation timestamp
 * @property {{ name: string | null; email: string }} user - The review author
 * @property {{ name: string; images: string }} product - The reviewed product
 */
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

/**
 * @function AdminReviewsContent
 * @description Review management content for the admin panel. Displays a
 * filterable table of reviews with approval, rejection, and deletion actions.
 *
 * @state
 * - `reviews` - array of AdminReview fetched from /api/admin?action=reviews
 * - `loading` - boolean for initial data fetch state
 * - `filter` - current filter tab value: 'ALL', 'PENDING', 'APPROVED', or 'REJECTED'
 *
 * @remarks
 * - Reviews are filtered client-side based on the isApproved field
 * - isApproved: true = Approved, false = Rejected, null = Pending
 * - Approve/reject actions only appear if the review isn't already in that state
 * - Dropdown menu dynamically shows relevant actions based on current status
 */
export function AdminReviewsContent() {
  const [reviews, setReviews] = useState<AdminReview[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL')

  /**
   * Fetches all reviews from the admin API. Called on mount and after
   * mutations (approve, reject, delete) to refresh the review list.
   */
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

  // Fetch reviews on component mount
  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  /**
   * Approves a review by setting isApproved to true. Sends a PUT request
   * to the admin API and refreshes the review list on success.
   *
   * @param {string} id - The ID of the review to approve
   */
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

  /**
   * Rejects a review by setting isApproved to false. Sends a PUT request
   * to the admin API and refreshes the review list on success.
   *
   * @param {string} id - The ID of the review to reject
   */
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

  /**
   * Deletes a review by ID. Sends a DELETE request to the admin API
   * and refreshes the review list on success.
   *
   * @param {string} id - The ID of the review to delete
   */
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

  /**
   * Determines the display status of a review based on its isApproved field.
   *
   * @param {AdminReview} review - The review to evaluate
   * @returns {'Pending' | 'Approved' | 'Rejected'} The human-readable status
   */
  function getReviewStatus(review: AdminReview): 'Pending' | 'Approved' | 'Rejected' {
    if (review.isApproved === true) return 'Approved'
    if (review.isApproved === false) return 'Rejected'
    return 'Pending'
  }

  // Client-side filtering: show all or filter by approval status
  const filteredReviews = reviews.filter((r) => {
    if (filter === 'ALL') return true
    const status = getReviewStatus(r)
    return status.toUpperCase() === filter
  })

  return (
    <>
      {/* Filter Tabs - review status filter buttons */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="mb-6">
        <TabsList>
          <TabsTrigger value="ALL">All</TabsTrigger>
          <TabsTrigger value="PENDING">Pending</TabsTrigger>
          <TabsTrigger value="APPROVED">Approved</TabsTrigger>
          <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Reviews Table */}
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
                  <TableHead>Product</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Rating</TableHead>
                  {/* Title column - hidden on small screens */}
                  <TableHead className="hidden md:table-cell">Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReviews.length === 0 ? (
                  /* Empty state: no reviews match the current filter */
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                      No reviews found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReviews.map((review) => (
                    <TableRow key={review.id}>
                      {/* Product name - truncated for long names */}
                      <TableCell className="text-sm max-w-[150px] truncate">
                        {review.product?.name || 'Unknown Product'}
                      </TableCell>
                      {/* Review author name or email */}
                      <TableCell className="text-sm text-gray-600">
                        {review.user?.name || review.user?.email || 'Anonymous'}
                      </TableCell>
                      {/* Star rating display */}
                      <TableCell><StarRating rating={review.rating} /></TableCell>
                      {/* Review title - hidden on small screens */}
                      <TableCell className="hidden md:table-cell text-sm text-gray-500 max-w-[200px] truncate">
                        {review.title || '—'}
                      </TableCell>
                      {/* Approval status badge */}
                      <TableCell>
                        <StatusBadge status={getReviewStatus(review)} />
                      </TableCell>
                      {/* Action dropdown menu - actions vary based on current status */}
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {/* Approve action - only shown for non-approved reviews */}
                            {getReviewStatus(review) !== 'Approved' && (
                              <DropdownMenuItem onClick={() => handleApprove(review.id)}>
                                <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                                Approve
                              </DropdownMenuItem>
                            )}
                            {/* Reject action - only shown for non-rejected reviews */}
                            {getReviewStatus(review) !== 'Rejected' && (
                              <DropdownMenuItem onClick={() => handleReject(review.id)}>
                                <XCircle className="mr-2 h-4 w-4 text-red-600" />
                                Reject
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {/* Delete review action */}
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
