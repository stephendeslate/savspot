import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { GeistSans } from 'geist/font/sans';
import { Inter } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { QueryProvider } from '@/providers/query-provider';
import { AuthProvider } from '@/providers/auth-provider';
import './globals.css';

// Development-only: loads @axe-core/react to report a11y violations in browser console
const AxeCoreDev =
  process.env.NODE_ENV === 'development'
    ? dynamic(() =>
        import('@/components/dev/axe-core-dev').then((m) => m.AxeCoreDev),
      )
    : () => null;

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'SavSpot',
  description: 'Multi-tenant booking platform for service businesses',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <QueryProvider>
            <AuthProvider>{children}</AuthProvider>
          </QueryProvider>
          <Toaster position="top-right" richColors closeButton />
          <AxeCoreDev />
        </ThemeProvider>
      </body>
    </html>
  );
}
