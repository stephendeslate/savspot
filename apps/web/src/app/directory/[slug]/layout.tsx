import type { Metadata } from 'next';

const API_URL =
  process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3001';

interface DirectoryBusinessParams {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: DirectoryBusinessParams): Promise<Metadata> {
  const { slug } = await params;

  try {
    const res = await fetch(`${API_URL}/api/directory/${slug}`, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return { title: 'Business Not Found — SavSpot' };
    }

    const { data } = (await res.json()) as {
      data: {
        name: string;
        description?: string;
        coverPhotoUrl?: string;
      };
    };

    return {
      title: `${data.name} — SavSpot`,
      description:
        data.description ||
        `Book appointments with ${data.name} on SavSpot.`,
      openGraph: {
        title: `${data.name} — SavSpot`,
        description:
          data.description ||
          `Book appointments with ${data.name} on SavSpot.`,
        type: 'website',
        siteName: 'SavSpot',
        ...(data.coverPhotoUrl && {
          images: [{ url: data.coverPhotoUrl }],
        }),
      },
    };
  } catch {
    return { title: 'Business — SavSpot' };
  }
}

export default function DirectoryBusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
