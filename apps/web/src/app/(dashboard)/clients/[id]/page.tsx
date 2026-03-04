'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Mail,
  Phone,
  Plus,
  Save,
  Tag,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { apiClient } from '@/lib/api-client';
import { ROUTES } from '@/lib/constants';
import { useTenant } from '@/hooks/use-tenant';

// ---------- Types ----------

interface ClientDetail {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  tags: string[];
  notes: string | null;
  totalBookings: number;
  totalRevenue: string;
  lastVisit: string | null;
  noShows: number;
  createdAt: string;
  bookings: ClientBooking[];
  payments: ClientPayment[];
}

interface ClientBooking {
  id: string;
  status: string;
  startTime: string;
  totalAmount: string;
  currency: string;
  service: {
    id: string;
    name: string;
  };
}

interface ClientPayment {
  id: string;
  invoiceNumber: string | null;
  amount: string;
  currency: string;
  status: string;
  createdAt: string;
}

// ---------- Helpers ----------

function getStatusColor(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800';
    case 'CONFIRMED':
      return 'bg-blue-100 text-blue-800';
    case 'IN_PROGRESS':
      return 'bg-purple-100 text-purple-800';
    case 'COMPLETED':
      return 'bg-green-100 text-green-800';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800';
    case 'NO_SHOW':
      return 'bg-gray-100 text-gray-800';
    case 'SUCCEEDED':
      return 'bg-green-100 text-green-800';
    case 'FAILED':
      return 'bg-red-100 text-red-800';
    case 'REFUNDED':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ');
}

function formatAmount(amount: string, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(Number(amount));
}

// ---------- Component ----------

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { tenantId } = useTenant();

  const clientId = params['id'] as string;

  // Data state
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Notes editing
  const [editedNotes, setEditedNotes] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);

  // Tags editing
  const [newTag, setNewTag] = useState('');
  const [tagsSaving, setTagsSaving] = useState(false);

  const fetchClient = useCallback(async () => {
    if (!tenantId || !clientId) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await apiClient.get<ClientDetail>(
        `/api/tenants/${tenantId}/clients/${clientId}`,
      );
      setClient(data);
      setEditedNotes(data.notes ?? '');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load client',
      );
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, clientId]);

  useEffect(() => {
    if (!tenantId) {
      setIsLoading(false);
      return;
    }
    void fetchClient();
  }, [tenantId, fetchClient]);

  // ---------- Handlers ----------

  const handleSaveNotes = async () => {
    if (!tenantId || !clientId) return;
    setNotesSaving(true);
    setNotesError(null);
    try {
      await apiClient.patch(
        `/api/tenants/${tenantId}/clients/${clientId}`,
        { notes: editedNotes || null },
      );
      setClient((prev) =>
        prev ? { ...prev, notes: editedNotes || null } : prev,
      );
    } catch (err) {
      setNotesError(
        err instanceof Error ? err.message : 'Failed to save notes',
      );
    } finally {
      setNotesSaving(false);
    }
  };

  const handleAddTag = async () => {
    if (!tenantId || !clientId || !newTag.trim() || !client) return;

    const tag = newTag.trim();
    if (client.tags.includes(tag)) {
      setNewTag('');
      return;
    }

    setTagsSaving(true);
    try {
      const updatedTags = [...client.tags, tag];
      await apiClient.patch(
        `/api/tenants/${tenantId}/clients/${clientId}`,
        { tags: updatedTags },
      );
      setClient((prev) => (prev ? { ...prev, tags: updatedTags } : prev));
      setNewTag('');
    } catch (err) {
      setNotesError(
        err instanceof Error ? err.message : 'Failed to add tag',
      );
    } finally {
      setTagsSaving(false);
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!tenantId || !clientId || !client) return;

    setTagsSaving(true);
    try {
      const updatedTags = client.tags.filter((t) => t !== tagToRemove);
      await apiClient.patch(
        `/api/tenants/${tenantId}/clients/${clientId}`,
        { tags: updatedTags },
      );
      setClient((prev) => (prev ? { ...prev, tags: updatedTags } : prev));
    } catch (err) {
      setNotesError(
        err instanceof Error ? err.message : 'Failed to remove tag',
      );
    } finally {
      setTagsSaving(false);
    }
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleAddTag();
    }
  };

  // ---------- Loading ----------

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="mt-2 h-4 w-32" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="mt-1 h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------- Error ----------

  if (error || !client) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => router.push(ROUTES.CLIENTS)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Clients
        </Button>
        <div className="rounded-md bg-destructive/10 p-6 text-center">
          <p className="text-sm text-destructive">
            {error ?? 'Client not found'}
          </p>
        </div>
      </div>
    );
  }

  // ---------- Render ----------

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(ROUTES.CLIENTS)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Avatar
            alt={client.name}
            className="h-14 w-14 text-xl"
          />
          <div>
            <h2 className="text-lg font-semibold">{client.name}</h2>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                {client.email}
              </span>
              {client.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {client.phone}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Member since {format(new Date(client.createdAt), 'MMM yyyy')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {notesError && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {notesError}
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{client.totalBookings}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatAmount(client.totalRevenue, 'USD')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Visit</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {client.lastVisit
                ? format(new Date(client.lastVisit), 'MMM d')
                : '--'}
            </div>
            {client.lastVisit && (
              <p className="text-xs text-muted-foreground">
                {format(new Date(client.lastVisit), 'yyyy')}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">No-Shows</CardTitle>
            <X className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{client.noShows}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: bookings & payments */}
        <div className="space-y-6 lg:col-span-2">
          {/* Booking History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Booking History</CardTitle>
            </CardHeader>
            <CardContent>
              {client.bookings && client.bookings.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {client.bookings.slice(0, 10).map((booking) => (
                      <TableRow
                        key={booking.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/bookings/${booking.id}`)}
                      >
                        <TableCell className="whitespace-nowrap">
                          {format(
                            new Date(booking.startTime),
                            'MMM d, yyyy h:mm a',
                          )}
                        </TableCell>
                        <TableCell>{booking.service.name}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={getStatusColor(booking.status)}
                          >
                            {formatStatus(booking.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatAmount(booking.totalAmount, booking.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No bookings found for this client.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Payment History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {client.payments && client.payments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {client.payments.slice(0, 10).map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {payment.invoiceNumber ?? '--'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatAmount(payment.amount, payment.currency)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={getStatusColor(payment.status)}
                          >
                            {formatStatus(payment.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {format(
                            new Date(payment.createdAt),
                            'MMM d, yyyy',
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No payments found for this client.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: tags & notes */}
        <div className="space-y-6">
          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                <span className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Tags
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Existing tags */}
                <div className="flex flex-wrap gap-2">
                  {client.tags && client.tags.length > 0 ? (
                    client.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          disabled={tagsSaving}
                          className="ml-1 rounded-full hover:bg-muted-foreground/20"
                          aria-label={`Remove tag ${tag}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No tags yet
                    </p>
                  )}
                </div>

                <Separator />

                {/* Add tag */}
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Add a tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    disabled={tagsSaving}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handleAddTag()}
                    disabled={tagsSaving || !newTag.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Textarea
                  placeholder="Add notes about this client..."
                  value={editedNotes}
                  onChange={(e) => setEditedNotes(e.target.value)}
                  rows={6}
                />
                <Button
                  size="sm"
                  onClick={() => void handleSaveNotes()}
                  disabled={
                    notesSaving || editedNotes === (client.notes ?? '')
                  }
                >
                  <Save className="mr-2 h-4 w-4" />
                  {notesSaving ? 'Saving...' : 'Save Notes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
