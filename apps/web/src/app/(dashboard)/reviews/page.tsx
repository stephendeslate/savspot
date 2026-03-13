'use client';

import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  Star,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Skeleton, Textarea } from '@savspot/ui';
import { apiClient } from '@/lib/api-client';
import { useTenant } from '@/hooks/use-tenant';

// ---------- Types ----------

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  clientName: string;
  serviceName: string;
  createdAt: string;
  reply: string | null;
  repliedAt: string | null;
}

interface ReviewsResponse {
  data: Review[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<string, number>;
}

// ---------- Helpers ----------

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
        />
      ))}
    </div>
  );
}

// ---------- Constants ----------

const PAGE_LIMIT = 20;

// ---------- Component ----------

export default function ReviewsPage() {
  const { tenantId } = useTenant();

  // Data state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState<ReviewStats>({
    averageRating: 0,
    totalReviews: 0,
    ratingDistribution: {},
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Reply dialog state
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [replyReviewId, setReplyReviewId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [replySuccess, setReplySuccess] = useState<string | null>(null);

  const fetchReviews = useCallback(
    async (pageNum: number) => {
      if (!tenantId) return;

      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set('page', String(pageNum));
        params.set('limit', String(PAGE_LIMIT));

        const res = await apiClient.getRaw<ReviewsResponse>(
          `/api/tenants/${tenantId}/reviews?${params.toString()}`,
        );
        setReviews(res.data);
        setTotal(res.meta.total);
        setPage(res.meta.page);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load reviews',
        );
      } finally {
        setIsLoading(false);
      }
    },
    [tenantId],
  );

  const fetchStats = useCallback(async () => {
    if (!tenantId) return;

    setStatsLoading(true);
    try {
      const data = await apiClient.get<ReviewStats>(
        `/api/tenants/${tenantId}/reviews/stats`,
      );
      setStats(data);
    } catch {
      // Stats are non-critical, silently fail
    } finally {
      setStatsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId) {
      setIsLoading(false);
      setStatsLoading(false);
      return;
    }
    void fetchReviews(1);
    void fetchStats();
  }, [tenantId, fetchReviews, fetchStats]);

  const handlePreviousPage = () => {
    if (page > 1) {
      void fetchReviews(page - 1);
    }
  };

  const handleNextPage = () => {
    const tp = Math.ceil(total / PAGE_LIMIT);
    if (page < tp) {
      void fetchReviews(page + 1);
    }
  };

  const openReplyDialog = (reviewId: string) => {
    setReplyReviewId(reviewId);
    setReplyText('');
    setReplyError(null);
    setReplySuccess(null);
    setReplyDialogOpen(true);
  };

  const handleSubmitReply = async () => {
    if (!tenantId || !replyReviewId || !replyText.trim()) return;

    setReplySubmitting(true);
    setReplyError(null);

    try {
      await apiClient.post(
        `/api/tenants/${tenantId}/reviews/${replyReviewId}/reply`,
        { reply: replyText.trim() },
      );
      setReplySuccess('Reply submitted successfully');
      void fetchReviews(page);
      setTimeout(() => {
        setReplyDialogOpen(false);
      }, 1000);
    } catch (err) {
      setReplyError(
        err instanceof Error ? err.message : 'Failed to submit reply',
      );
    } finally {
      setReplySubmitting(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_LIMIT);
  const fiveStarCount = Number(stats.ratingDistribution['5'] ?? 0);

  // ---------- Loading ----------

  if (isLoading && reviews.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-6 w-24" />
          <Skeleton className="mt-2 h-4 w-48" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ---------- Render ----------

  return (
    <div className="min-w-0 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">Reviews</h2>
        <p className="text-sm text-muted-foreground">
          View and respond to client feedback
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Stats */}
      {statsLoading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Average Rating
              </CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.averageRating.toFixed(1)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Reviews
              </CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalReviews}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                5-Star Reviews
              </CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fiveStarCount}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Star className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-medium">No reviews yet</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Reviews will appear here when clients leave feedback after
                their bookings.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <StarRating rating={review.rating} />
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">
                          {review.clientName}
                        </span>
                        <span className="text-muted-foreground">
                          {review.serviceName}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(review.createdAt), 'MMM d, yyyy')}
                    </span>
                  </div>

                  {review.comment && (
                    <p className="text-sm">{review.comment}</p>
                  )}

                  {review.reply ? (
                    <div className="ml-4 rounded-md border-l-2 border-muted-foreground/20 pl-4">
                      <p className="text-sm text-muted-foreground">
                        {review.reply}
                      </p>
                      {review.repliedAt && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Replied {format(new Date(review.repliedAt), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openReplyDialog(review.id)}
                    >
                      Reply
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={page >= totalPages}
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reply Dialog */}
      <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reply to Review</DialogTitle>
            <DialogDescription>
              Your reply will be visible to the client and other visitors.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {replyError && (
              <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {replyError}
              </div>
            )}
            {replySuccess && (
              <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-700">
                {replySuccess}
              </div>
            )}
            <Textarea
              placeholder="Write your reply..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReplyDialogOpen(false)}
              disabled={replySubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleSubmitReply()}
              disabled={replySubmitting || !replyText.trim()}
            >
              {replySubmitting ? 'Submitting...' : 'Submit Reply'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
