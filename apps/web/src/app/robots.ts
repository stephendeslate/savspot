import type { MetadataRoute } from 'next';

const BASE_URL = process.env['NEXT_PUBLIC_URL'] || 'https://savspot.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/dashboard/', '/settings/', '/portal/'],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
