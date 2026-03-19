import { notFound } from 'next/navigation';
import type { TenantData } from '@/components/booking/booking-types';
import { EmbedBookingClient } from './embed-booking-client';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3001';

export default async function EmbedBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const res = await fetch(`${API_URL}/api/book/${slug}`, {
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    if (res.status === 404) notFound();
    throw new Error(`Failed to load booking page: ${res.status}`);
  }

  const json = (await res.json()) as { data: TenantData };
  const tenant = json.data;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <EmbedBookingClient tenant={tenant} />
    </div>
  );
}
