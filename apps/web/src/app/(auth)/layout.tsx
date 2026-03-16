import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Left panel — teal gradient + branding (hidden on mobile, compact banner instead) */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[40%] flex-col justify-between bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-12 text-primary-foreground">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            SavSpot
          </h1>
        </div>

        <div className="space-y-6">
          <blockquote className="text-2xl font-semibold leading-snug tracking-tight">
            Booking management
            <br />
            <span className="text-accent">built for real businesses.</span>
          </blockquote>
          <p className="max-w-sm text-sm text-primary-foreground/70">
            Accept bookings, manage clients, and get paid — all in one place.
            Trusted by salons, studios, fitness pros, and more.
          </p>
        </div>

        {/* Decorative dot grid */}
        <div
          className="h-24 w-48 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle, currentColor 1px, transparent 1px)',
            backgroundSize: '16px 16px',
          }}
        />
      </div>

      {/* Mobile banner (replaces left panel on small screens) */}
      <div className="flex items-center gap-3 border-b bg-primary px-4 py-3 text-primary-foreground lg:hidden fixed top-0 left-0 right-0 z-10">
        <h1 className="font-heading text-lg font-bold tracking-tight">
          SavSpot
        </h1>
        <span className="text-xs text-primary-foreground/70">
          Booking management for service businesses
        </span>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center bg-muted/30 p-4 pt-16 lg:pt-4">
        <div className="w-full max-w-md">
          <div className="rounded-xl border bg-card p-6 shadow-[var(--shadow-colored)]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
