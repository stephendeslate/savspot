'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api-client';
import { useTenant } from '@/hooks/use-tenant';

// ---------- Types ----------

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  tags: string[];
  notes: string | null;
  totalBookings: number;
  totalRevenue: string;
  lastVisit: string | null;
  createdAt: string;
}

interface ClientsResponse {
  clients: Client[];
  total: number;
  page: number;
  limit: number;
}

// ---------- Helpers ----------

function formatAmount(amount: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(amount));
}

// ---------- Constants ----------

const SORT_OPTIONS = [
  { value: 'lastVisit', label: 'Last Visit' },
  { value: 'totalBookings', label: 'Total Bookings' },
  { value: 'totalRevenue', label: 'Total Revenue' },
  { value: 'name', label: 'Name' },
];

const PAGE_LIMIT = 20;

// ---------- Component ----------

export default function ClientsPage() {
  const router = useRouter();
  const { tenantId } = useTenant();

  // Data state
  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('lastVisit');
  const [tagFilter, setTagFilter] = useState('');

  // All unique tags for the filter dropdown
  const [allTags, setAllTags] = useState<string[]>([]);

  const fetchClients = useCallback(
    async (pageNum: number) => {
      if (!tenantId) return;

      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set('page', String(pageNum));
        params.set('limit', String(PAGE_LIMIT));
        if (search) params.set('search', search);
        if (sortBy) params.set('sortBy', sortBy);
        if (tagFilter) params.set('tag', tagFilter);

        const data = await apiClient.get<ClientsResponse>(
          `/api/tenants/${tenantId}/clients?${params.toString()}`,
        );
        setClients(data.clients);
        setTotal(data.total);
        setPage(data.page);

        // Collect unique tags
        const tags = new Set<string>();
        data.clients.forEach((client) => {
          client.tags?.forEach((tag) => tags.add(tag));
        });
        setAllTags((prev) => {
          const merged = new Set([...prev, ...tags]);
          return Array.from(merged).sort();
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load clients',
        );
      } finally {
        setIsLoading(false);
      }
    },
    [tenantId, search, sortBy, tagFilter],
  );

  useEffect(() => {
    if (!tenantId) {
      setIsLoading(false);
      return;
    }
    void fetchClients(1);
  }, [tenantId, fetchClients]);

  const handleSearch = () => {
    void fetchClients(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      void fetchClients(1);
    }
  };

  const handlePreviousPage = () => {
    if (page > 1) {
      void fetchClients(page - 1);
    }
  };

  const handleNextPage = () => {
    const totalPages = Math.ceil(total / PAGE_LIMIT);
    if (page < totalPages) {
      void fetchClients(page + 1);
    }
  };

  const totalPages = Math.ceil(total / PAGE_LIMIT);

  // ---------- Loading ----------

  if (isLoading && clients.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-6 w-24" />
            <Skeleton className="mt-2 h-4 w-64" />
          </div>
        </div>
        <Skeleton className="h-10 w-full max-w-sm" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <Skeleton className="h-8" />
                  <Skeleton className="h-8" />
                  <Skeleton className="h-8" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ---------- Render ----------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">Clients</h2>
        <p className="text-sm text-muted-foreground">
          View and manage your client list
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        {/* Search */}
        <div className="flex-1 space-y-2">
          <Label htmlFor="client-search" className="sr-only">
            Search
          </Label>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="client-search"
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tag filter */}
        {allTags.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="client-tag-filter" className="sr-only">
              Tag Filter
            </Label>
            <Select
              id="client-tag-filter"
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
            >
              <option value="">All Tags</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </Select>
          </div>
        )}

        {/* Sort */}
        <div className="space-y-2">
          <Label htmlFor="client-sort" className="sr-only">
            Sort
          </Label>
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <Select
              id="client-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <Button onClick={handleSearch} size="sm" className="shrink-0">
          Search
        </Button>
      </div>

      {/* Client List */}
      {clients.length === 0 ? (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-medium">No clients yet</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Clients will appear here once they make a booking. When someone
                books a service, their information will be automatically added to
                your client list.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="text-sm text-muted-foreground">
            {total} client{total !== 1 ? 's' : ''} found
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clients.map((client) => (
              <Card
                key={client.id}
                className="cursor-pointer transition-colors hover:bg-accent/50"
                onClick={() => router.push(`/clients/${client.id}`)}
              >
                <CardContent className="pt-6">
                  {/* Client identity */}
                  <div className="flex items-center gap-3">
                    <Avatar
                      alt={client.name}
                      className="h-12 w-12 text-base"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{client.name}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {client.email}
                      </p>
                      {client.phone && (
                        <p className="truncate text-sm text-muted-foreground">
                          {client.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="mt-4 grid grid-cols-3 gap-2 rounded-md border p-2">
                    <div className="text-center">
                      <p className="text-lg font-semibold">
                        {client.totalBookings}
                      </p>
                      <p className="text-xs text-muted-foreground">Bookings</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold">
                        {formatAmount(client.totalRevenue)}
                      </p>
                      <p className="text-xs text-muted-foreground">Revenue</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">
                        {client.lastVisit
                          ? format(new Date(client.lastVisit), 'MMM d')
                          : '--'}
                      </p>
                      <p className="text-xs text-muted-foreground">Last Visit</p>
                    </div>
                  </div>

                  {/* Tags */}
                  {client.tags && client.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {client.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t pt-4">
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

                {/* Page numbers */}
                <div className="hidden items-center gap-1 sm:flex">
                  {Array.from({ length: Math.min(totalPages, 5) }).map(
                    (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={pageNum === page ? 'default' : 'outline'}
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => fetchClients(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    },
                  )}
                </div>

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
        </>
      )}
    </div>
  );
}
