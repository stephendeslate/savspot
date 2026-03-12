import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Business Directory — SavSpot',
  description:
    'Browse and discover service businesses on SavSpot. Find salons, studios, fitness centers, venues, and more near you.',
  openGraph: {
    title: 'Business Directory — SavSpot',
    description: 'Browse and discover service businesses on SavSpot.',
    type: 'website',
    siteName: 'SavSpot',
  },
};

export default function DirectoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
