import Link from 'next/link';
import {
  Building2,
  Scissors,
  Music,
  Dumbbell,
  Briefcase,
  MoreHorizontal,
  CalendarCheck,
  CreditCard,
  Users,
  ArrowRight,
  Zap,
} from 'lucide-react';

const BUSINESS_TYPES = [
  { label: 'Venues', icon: Building2, description: 'Event spaces, conference rooms, coworking' },
  { label: 'Salons', icon: Scissors, description: 'Hair, nails, beauty, spa services' },
  { label: 'Studios', icon: Music, description: 'Photography, recording, art studios' },
  { label: 'Fitness', icon: Dumbbell, description: 'Gyms, yoga, personal training' },
  { label: 'Professional', icon: Briefcase, description: 'Consulting, coaching, tutoring' },
  { label: 'And More', icon: MoreHorizontal, description: 'Any service business' },
] as const;

const STEPS = [
  { number: '1', title: 'Choose your business type', description: 'Select a category and we set up smart defaults for you.' },
  { number: '2', title: 'Add your first service', description: 'Name, duration, and price. That\'s all you need.' },
  { number: '3', title: 'Share your booking page', description: 'Your page is live. Share the link and start getting bookings.' },
] as const;

const VALUE_PROPS = [
  { icon: Zap, title: 'Free forever', description: 'No subscriptions, no monthly fees. We only earn when you do.' },
  { icon: CalendarCheck, title: 'Works for any business', description: 'From solo freelancers to multi-provider shops. One platform, every service type.' },
  { icon: CreditCard, title: 'Payments built in', description: 'Accept online payments or track offline ones. Invoices generated automatically.' },
  { icon: Users, title: 'CRM included', description: 'Client history, booking records, and communications in one place.' },
] as const;

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="border-b">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <span className="text-xl font-bold tracking-tight">SavSpot</span>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Get Started Free
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 py-20 text-center sm:py-28">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Find your spot.
            <br />
            Book your moment.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            The free booking platform that works for any business in under 5 minutes.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center rounded-md border border-input bg-background px-8 text-base font-medium transition-colors hover:bg-accent"
            >
              Sign In
            </Link>
          </div>
        </section>

        {/* Business Types */}
        <section className="border-t bg-muted/50 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
              Built for every service business
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
              One platform that adapts to your business type with smart defaults.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {BUSINESS_TYPES.map((type) => (
                <div
                  key={type.label}
                  className="flex items-center gap-4 rounded-lg border bg-card p-5 shadow-sm"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <type.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{type.label}</p>
                    <p className="text-sm text-muted-foreground">{type.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
              Live in under 5 minutes
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
              From sign-up to a working booking page — no credit card, no setup fees.
            </p>
            <div className="mt-10 grid gap-8 sm:grid-cols-3">
              {STEPS.map((step) => (
                <div key={step.number} className="text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                    {step.number}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Value Props */}
        <section className="border-t bg-muted/50 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
              Everything you need, nothing you don&apos;t
            </h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              {VALUE_PROPS.map((prop) => (
                <div key={prop.title} className="rounded-lg border bg-card p-6 shadow-sm">
                  <prop.icon className="h-6 w-6 text-primary" />
                  <h3 className="mt-3 text-lg font-semibold">{prop.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{prop.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-2xl px-4 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Ready to get started?
            </h2>
            <p className="mt-3 text-muted-foreground">
              Set up your booking page for free. No credit card required.
            </p>
            <Link
              href="/register"
              className="mt-8 inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Create Your Booking Page
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row">
          <div className="flex items-center gap-6">
            <span className="text-sm font-medium">SavSpot</span>
            <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground">
              Terms
            </Link>
            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">
              Privacy
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} SavSpot. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
