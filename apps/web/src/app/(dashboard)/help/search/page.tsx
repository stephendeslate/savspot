'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FileText, SearchX } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@savspot/ui';
import { searchHelp } from '@/lib/help/search';
import { collections } from '@/generated/helpContent';
import { ROUTES } from '@/lib/constants';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const results = searchHelp(query);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Search Results</h1>
      <p className="mb-6 text-muted-foreground">
        {results.length} {results.length === 1 ? 'result' : 'results'} for &ldquo;{query}&rdquo;
      </p>

      {results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <SearchX className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-lg font-medium">No articles found</p>
          <p className="mt-1 text-muted-foreground">
            Try a different search term or{' '}
            <Link href={ROUTES.HELP} className="text-primary hover:underline">
              browse all topics
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((result) => {
            const collection = collections.find((c) => c.id === result.collectionId);
            return (
              <Link
                key={`${result.collectionId}/${result.slug}`}
                href={`${ROUTES.HELP}/${result.collectionId}/${result.slug}`}
              >
                <Card className="transition-colors hover:bg-secondary/50">
                  <CardHeader className="py-4">
                    <div className="flex items-start gap-3">
                      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <CardTitle className="text-sm font-medium">{result.title}</CardTitle>
                        <CardDescription className="mt-1 text-xs">
                          {collection?.title}
                        </CardDescription>
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                          {result.snippet}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
