import type { Metadata } from 'next';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3001';

interface TenantMetadata {
  name: string;
  description: string | null;
  logoUrl: string | null;
  coverPhotoUrl: string | null;
}

async function fetchTenantMeta(
  slug: string,
): Promise<TenantMetadata | null> {
  try {
    const res = await fetch(`${API_URL}/api/book/${slug}`, {
      next: { revalidate: 300 }, // cache for 5 minutes
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data: TenantMetadata };
    return json.data;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await fetchTenantMeta(slug);

  if (!tenant) {
    return {
      title: 'Business Not Found | SavSpot',
      description: 'The booking page you are looking for could not be found.',
    };
  }

  const title = `Book with ${tenant.name} | SavSpot`;
  const description =
    tenant.description ?? `Book an appointment with ${tenant.name} on SavSpot.`;
  const ogImage = tenant.coverPhotoUrl ?? tenant.logoUrl ?? undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'SavSpot',
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export default function BookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {children}
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <p>
          Powered by{' '}
          <a
            href="https://savspot.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground hover:underline"
          >
            SavSpot
          </a>
        </p>
      </footer>
    </div>
  );
}
