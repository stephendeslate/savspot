'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { FileText } from 'lucide-react';
import { articles, collections } from '@/generated/helpContent';
import { MarkdownRenderer } from '@/components/help/markdown-renderer';
import { ROUTES } from '@/lib/constants';

export default function ArticlePage() {
  const { collection: collectionId, article: articleSlug } = useParams<{
    collection: string;
    article: string;
  }>();

  const article = articles.find(
    (a) => a.collectionId === collectionId && a.slug === articleSlug,
  );
  const siblingArticles = articles.filter(
    (a) => a.collectionId === collectionId && a.slug !== articleSlug,
  );
  const collection = collections.find((c) => c.id === collectionId);

  if (!article) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Article not found.</p>
        <Link href={ROUTES.HELP} className="text-primary hover:underline mt-2 inline-block">
          Back to Help Center
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      {/* Article content */}
      <article className="min-w-0 flex-1">
        <MarkdownRenderer content={article.body} />
      </article>

      {/* Sibling articles sidebar */}
      {siblingArticles.length > 0 && (
        <aside className="w-full shrink-0 lg:w-64">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {collection?.title ?? 'More Articles'}
          </h2>
          <div className="space-y-1">
            {siblingArticles.map((a) => (
              <Link
                key={a.slug}
                href={`${ROUTES.HELP}/${collectionId}/${a.slug}`}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <FileText className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{a.title}</span>
              </Link>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}
