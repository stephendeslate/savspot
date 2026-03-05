import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy | SavSpot',
  description: 'SavSpot Privacy Policy',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <nav className="mx-auto flex h-16 max-w-4xl items-center px-4">
          <Link href="/" className="text-xl font-bold tracking-tight">
            SavSpot
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-4 text-muted-foreground">
          This page will contain the SavSpot Privacy Policy, authored by legal
          counsel. Content is forthcoming.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          For questions, contact{' '}
          <a
            href="mailto:support@savspot.co"
            className="font-medium text-foreground hover:underline"
          >
            support@savspot.co
          </a>
          .
        </p>
      </main>

      <footer className="border-t py-8">
        <div className="mx-auto flex max-w-4xl items-center gap-6 px-4">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            Home
          </Link>
          <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground">
            Terms of Service
          </Link>
        </div>
      </footer>
    </div>
  );
}
