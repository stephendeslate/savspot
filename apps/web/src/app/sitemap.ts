import type { MetadataRoute } from 'next';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3001';
const BASE_URL = process.env['NEXT_PUBLIC_URL'] || 'https://savspot.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'monthly' },
    { url: `${BASE_URL}/login`, lastModified: new Date(), changeFrequency: 'monthly' },
    { url: `${BASE_URL}/register`, lastModified: new Date(), changeFrequency: 'monthly' },
  ];

  // Fetch published booking page slugs
  try {
    const res = await fetch(`${API_URL}/api/book/slugs`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const slugs = (await res.json()) as string[];
      const bookingPages: MetadataRoute.Sitemap = slugs.map((slug: string) => ({
        url: `${BASE_URL}/book/${slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
      }));
      return [...staticPages, ...bookingPages];
    }
  } catch {
    // API unavailable — return static pages only
  }

  return staticPages;
}
