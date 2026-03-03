import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">SavSpot</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Booking management for service businesses
          </p>
        </div>

        {/* Card */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
