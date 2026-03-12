import type { MetadataRoute } from 'next';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3001';
const BASE_URL = process.env['NEXT_PUBLIC_URL'] || 'https://savspot.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'monthly' },
    { url: `${BASE_URL}/login`, lastModified: new Date(), changeFrequency: 'monthly' },
    { url: `${BASE_URL}/register`, lastModified: new Date(), changeFrequency: 'monthly' },
    { url: `${BASE_URL}/directory`, lastModified: new Date(), changeFrequency: 'weekly' },
    { url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: 'yearly' },
    { url: `${BASE_URL}/terms`, lastModified: new Date(), changeFrequency: 'yearly' },
  ];

  const dynamicPages: MetadataRoute.Sitemap = [];

  // Fetch published booking page slugs
  try {
    const res = await fetch(`${API_URL}/api/book/slugs`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const slugs = (await res.json()) as string[];
      for (const slug of slugs) {
        dynamicPages.push({
          url: `${BASE_URL}/book/${slug}`,
          lastModified: new Date(),
          changeFrequency: 'weekly',
        });
      }
    }
  } catch {
    // API unavailable — skip booking pages
  }

  // Fetch directory business slugs
  try {
    const res = await fetch(`${API_URL}/api/directory/slugs`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const slugs = (await res.json()) as string[];
      for (const slug of slugs) {
        dynamicPages.push({
          url: `${BASE_URL}/directory/${slug}`,
          lastModified: new Date(),
          changeFrequency: 'weekly',
        });
      }
    }
  } catch {
    // API unavailable — skip directory pages
  }

  return [...staticPages, ...dynamicPages];
}
