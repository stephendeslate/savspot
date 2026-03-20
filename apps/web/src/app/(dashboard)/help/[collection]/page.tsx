'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { FileText } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@savspot/ui';
import { collections, articles } from '@/generated/helpContent';
import { ROUTES } from '@/lib/constants';

export default function CollectionPage() {
  const { collection: collectionId } = useParams<{ collection: string }>();
  const collection = collections.find((c) => c.id === collectionId);
  const collectionArticles = articles.filter((a) => a.collectionId === collectionId);
  const otherCollections = collections.filter((c) => c.id !== collectionId);

  if (!collection) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Collection not found.</p>
        <Link href={ROUTES.HELP} className="text-primary hover:underline mt-2 inline-block">
          Back to Help Center
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      {/* Articles list */}
      <div className="flex-1 space-y-3">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">{collection.title}</h1>
          {collection.description && (
            <p className="mt-1 text-muted-foreground">{collection.description}</p>
          )}
        </div>
        {collectionArticles.map((article) => (
          <Link
            key={article.slug}
            href={`${ROUTES.HELP}/${collectionId}/${article.slug}`}
          >
            <Card className="transition-colors hover:bg-secondary/50">
              <CardHeader className="py-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <CardTitle className="text-sm font-medium">{article.title}</CardTitle>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
        {collectionArticles.length === 0 && (
          <p className="text-muted-foreground">No articles in this collection yet.</p>
        )}
      </div>

      {/* Other collections sidebar */}
      <aside className="w-full shrink-0 lg:w-64">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Other Topics
        </h2>
        <div className="space-y-1">
          {otherCollections.map((c) => (
            <Link
              key={c.id}
              href={`${ROUTES.HELP}/${c.id}`}
              className="block rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {c.title}
            </Link>
          ))}
        </div>
      </aside>
    </div>
  );
}
