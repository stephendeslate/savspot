import type { ReactNode } from 'react';

export default function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/50 p-4">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">SavSpot</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Let&apos;s set up your business
          </p>
        </div>

        {children}
      </div>
    </div>
  );
}
