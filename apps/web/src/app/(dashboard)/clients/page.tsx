'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
} from 'lucide-react';
import { Button, Badge, Card, CardContent, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Avatar, AvatarFallback, Skeleton } from '@savspot/ui';
import { apiClient } from '@/lib/api-client';
import { useTenant } from '@/hooks/use-tenant';
import { useDebounce } from '@/hooks/use-debounce';
import { formatAmount } from '@/lib/format-utils';
import { queryKeys } from '@/hooks/use-api';

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
  data: Client[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
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

  // Filter state (UI state)
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('lastVisit');
  const [tagFilter, setTagFilter] = useState('');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search, 300);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, sortBy, tagFilter]);

  const queryParams = useMemo(() => {
    const params: Record<string, string> = {
      page: String(page),
      limit: String(PAGE_LIMIT),
    };
    if (debouncedSearch) params['search'] = debouncedSearch;
    if (sortBy) params['sortBy'] = sortBy;
    if (tagFilter) params['tag'] = tagFilter;
    return params;
  }, [page, debouncedSearch, sortBy, tagFilter]);

  const { data: clientsRes, isLoading, error: queryError } = useQuery({
    queryKey: queryKeys.clients(tenantId!, queryParams),
    queryFn: () => {
      const searchParams = new URLSearchParams(queryParams).toString();
      return apiClient.getRaw<ClientsResponse>(
        `/api/tenants/${tenantId}/clients?${searchParams}`,
      );
    },
    enabled: !!tenantId,
  });

  const clients = useMemo(() => clientsRes?.data ?? [], [clientsRes?.data]);
  const total = clientsRes?.meta?.total ?? 0;
  const error = queryError
    ? (queryError instanceof Error ? queryError.message : 'Failed to load clients')
    : null;
  const totalPages = Math.ceil(total / PAGE_LIMIT);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    clients.forEach((client) => {
      client.tags?.forEach((tag: string) => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [clients]);

  const handlePreviousPage = () => {
    setPage((p) => p - 1);
  };

  const handleNextPage = () => {
    setPage((p) => p + 1);
  };

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
        <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
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
              value={tagFilter || 'all'}
              onValueChange={(v) => setTagFilter(v === 'all' ? '' : v)}
            >
              <SelectTrigger id="client-tag-filter" className="w-full">
                <SelectValue placeholder="All Tags" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags</SelectItem>
                {allTags.map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
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
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger id="client-sort" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
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
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/clients/${client.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    router.push(`/clients/${client.id}`);
                  }
                }}
              >
                <CardContent className="pt-6">
                  {/* Client identity */}
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="text-base">
                        {client.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
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
                        {formatAmount(client.totalRevenue, 'USD')}
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
                          onClick={() => setPage(pageNum)}
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
