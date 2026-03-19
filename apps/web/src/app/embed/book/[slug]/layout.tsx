import type { Metadata } from 'next';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3001';

interface TenantMetadata {
  name: string;
  description: string | null;
}

async function fetchTenantMeta(slug: string): Promise<TenantMetadata | null> {
  try {
    const res = await fetch(`${API_URL}/api/book/${slug}`, {
      next: { revalidate: 300 },
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

  return {
    title: tenant ? `Book with ${tenant.name}` : 'Book an Appointment',
    description: tenant?.description ?? 'Book an appointment via SavSpot.',
  };
}

export default function EmbedBookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
