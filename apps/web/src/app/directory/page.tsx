'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { MapPin, Search, Star } from 'lucide-react';
import { Button, Card, CardContent, Input, Skeleton, Badge } from '@savspot/ui';
import { apiClient } from '@/lib/api-client';

// ---------- Types ----------

interface DirectoryBusiness {
  slug: string;
  name: string;
  description: string | null;
  category: string;
  city: string | null;
  country: string | null;
  averageRating: number | null;
  reviewCount: number;
  imageUrl: string | null;
}

interface DirectoryCategory {
  id: string;
  name: string;
  count: number;
}

// ---------- Component ----------

export default function DirectoryPage() {
  const [businesses, setBusinesses] = useState<DirectoryBusiness[]>([]);
  const [categories, setCategories] = useState<DirectoryCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search / filter state
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const PAGE_SIZE = 12;

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await apiClient.get<DirectoryCategory[]>(
          '/api/directory/categories',
        );
        setCategories(Array.isArray(data) ? data : []);
      } catch {
        // Silently handle category load errors
      }
    };
    void fetchCategories();
  }, []);

  // Fetch businesses
  const fetchBusinesses = useCallback(
    async (pageNum: number, append: boolean) => {
      if (pageNum === 1) {
        setIsLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      try {
        const params = new URLSearchParams();
        if (searchQuery) params.set('q', searchQuery);
        if (searchCategory) params.set('category', searchCategory);
        params.set('page', String(pageNum));
        params.set('limit', String(PAGE_SIZE));

        const data = await apiClient.get<DirectoryBusiness[]>(
          `/api/directory/search?${params.toString()}`,
        );
        const results = Array.isArray(data) ? data : [];

        if (append) {
          setBusinesses((prev) => [...prev, ...results]);
        } else {
          setBusinesses(results);
        }
        setHasMore(results.length === PAGE_SIZE);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load businesses',
        );
      } finally {
        setIsLoading(false);
        setLoadingMore(false);
      }
    },
    [searchQuery, searchCategory],
  );

  useEffect(() => {
    setPage(1);
    void fetchBusinesses(1, false);
  }, [fetchBusinesses]);

  // Handle search submit
  const handleSearch = () => {
    setSearchQuery(query);
    setSearchCategory(selectedCategory);
  };

  // Handle category click
  const handleCategoryClick = (categoryId: string | null) => {
    setSelectedCategory(categoryId);
    setSearchCategory(categoryId);
    setPage(1);
  };

  // Load more
  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    void fetchBusinesses(nextPage, true);
  };

  // Handle search on enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // ---------- Render ----------

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">Business Directory</h1>
        <p className="mt-2 text-muted-foreground">
          Find and book service businesses near you
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search businesses..."
            className="pl-9"
          />
        </div>
        <Button onClick={handleSearch}>Search</Button>
      </div>

      {/* Category Filter */}
      {categories.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleCategoryClick(null)}
          >
            All
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleCategoryClick(cat.id)}
            >
              {cat.name}
              <span className="ml-1 text-xs opacity-70">({cat.count})</span>
            </Button>
          ))}
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-0">
                <Skeleton className="h-40 w-full rounded-t-lg" />
                <div className="space-y-2 p-4">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : businesses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-medium">No businesses found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Try adjusting your search or filters
          </p>
        </div>
      ) : (
        <>
          {/* Business Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {businesses.map((business) => (
              <Link key={business.slug} href={`/directory/${business.slug}`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardContent className="p-0">
                    {business.imageUrl ? (
                      <div
                        className="h-40 w-full rounded-t-lg bg-cover bg-center"
                        style={{
                          backgroundImage: `url(${business.imageUrl})`,
                        }}
                      />
                    ) : (
                      <div className="flex h-40 w-full items-center justify-center rounded-t-lg bg-muted">
                        <span className="text-4xl font-bold text-muted-foreground">
                          {business.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="font-medium">{business.name}</h3>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {business.category}
                        </Badge>
                      </div>
                      {(business.city || business.country) && (
                        <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {[business.city, business.country]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      )}
                      {business.averageRating !== null && (
                        <div className="mt-2 flex items-center gap-1 text-sm">
                          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">
                            {business.averageRating.toFixed(1)}
                          </span>
                          <span className="text-muted-foreground">
                            ({business.reviewCount})
                          </span>
                        </div>
                      )}
                      {business.description && (
                        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                          {business.description}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="mt-8 flex justify-center">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading...' : 'Load More'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
