import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Building2,
  Scissors,
  Music,
  Dumbbell,
  Briefcase,
  MoreHorizontal,
  CreditCard,
  Users,
  ArrowRight,
  Calendar,
  Bell,
  Shield,
  Download,
  Globe,
  Smartphone,
  Clock,
  CheckCircle2,
  Star,
  FileText,
  MessageSquare,
  BarChart3,
  UserPlus,
  Bot,
  Phone,
  Workflow,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'SavSpot — The Booking Platform That Pays for Itself',
  description:
    'All-in-one booking and business management platform for service businesses. Online scheduling, payments, client management, and AI-powered tools. Free to start.',
  openGraph: {
    title: 'SavSpot — The Booking Platform That Pays for Itself',
    description:
      'All-in-one booking and business management platform for service businesses. Online scheduling, payments, client management, and AI-powered tools.',
    type: 'website',
    url: 'https://savspot.com',
    siteName: 'SavSpot',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SavSpot — The Booking Platform That Pays for Itself',
    description:
      'All-in-one booking and business management platform for service businesses.',
  },
  keywords: [
    'booking platform',
    'appointment scheduling',
    'business management',
    'online booking',
    'service business software',
  ],
};

const BUSINESS_TYPES = [
  { label: 'Venues', icon: Building2, description: 'Event spaces, conference rooms, coworking' },
  { label: 'Salons', icon: Scissors, description: 'Hair, nails, beauty, spa services' },
  { label: 'Studios', icon: Music, description: 'Photography, recording, art studios' },
  { label: 'Fitness', icon: Dumbbell, description: 'Gyms, yoga, personal training' },
  { label: 'Professional', icon: Briefcase, description: 'Consulting, coaching, tutoring' },
  { label: 'And More', icon: MoreHorizontal, description: 'Any service business' },
] as const;

const STEPS = [
  {
    number: '1',
    title: 'Pick your business type',
    description: 'Choose a category and we auto-configure everything — calendar settings, booking flow, reminders, and payment options.',
  },
  {
    number: '2',
    title: 'Add services & availability',
    description: 'Set your services, prices, and hours. Connect Google Calendar to sync your existing schedule instantly.',
  },
  {
    number: '3',
    title: 'Share & start booking',
    description: 'Your booking page is live at savspot.co/your-name. Share the link, embed it on your site, or print the QR code.',
  },
] as const;

const CORE_FEATURES = [
  {
    icon: Calendar,
    title: 'Google Calendar sync',
    description: 'Two-way sync keeps your schedule accurate. Existing events block availability automatically — perfect for running SavSpot alongside your current system.',
  },
  {
    icon: CreditCard,
    title: 'Flexible payments',
    description: 'Accept full payment or deposits online via Stripe. Track cash and offline payments. Invoices and receipts generated automatically.',
  },
  {
    icon: Users,
    title: 'Built-in CRM',
    description: 'Client profiles with full booking history, contact details, and communication logs. Know your customers without a separate tool.',
  },
  {
    icon: Bell,
    title: 'Smart notifications',
    description: 'Automated confirmations, reminders, and follow-ups via email. SMS alerts to you for new bookings and cancellations. Morning summaries and weekly digests.',
  },
  {
    icon: Download,
    title: 'Import your clients',
    description: 'Switching from Booksy, Fresha, Square, or Vagaro? Import your client list and appointment history in minutes — no data left behind.',
  },
  {
    icon: UserPlus,
    title: 'Walk-ins welcome',
    description: 'Quick-add walk-in appointments directly from your calendar. Not every booking starts online — SavSpot handles both.',
  },
  {
    icon: Clock,
    title: 'Smart availability',
    description: 'Real-time slot checking with double-booking prevention. Buffer times, business hours, and provider schedules all factored in.',
  },
  {
    icon: Shield,
    title: 'Cancellation policies',
    description: 'Set cancellation windows and fees per service. Enforce policies automatically so you don\'t have to chase no-shows.',
  },
  {
    icon: BarChart3,
    title: 'No-show insights',
    description: 'Risk indicators help you spot likely no-shows. Slot demand analysis shows your busiest times so you can plan staffing.',
  },
  {
    icon: Bot,
    title: 'AI agent bookings',
    description: 'Your business is discoverable by ChatGPT, Claude, Google AI, and other AI assistants. Clients can book you through any AI agent — automatically.',
  },
  {
    icon: Phone,
    title: 'AI voice receptionist',
    description: 'Never miss a call. An AI receptionist handles after-hours calls, checks availability, and books appointments by voice.',
  },
  {
    icon: Workflow,
    title: 'Workflow automation',
    description: 'Automate follow-ups, reminders, and multi-step workflows. Set triggers and let SavSpot handle the rest.',
  },
  {
    icon: FileText,
    title: 'Invoices & receipts',
    description: 'Professional PDF invoices generated for every booking. Track payment status, issue refunds, and keep your records clean.',
  },
  {
    icon: MessageSquare,
    title: 'Client communications',
    description: 'Email templates with smart variable substitution. Category-aware reminder timing — 24 hours for appointments, 48 hours for venues.',
  },
  {
    icon: Globe,
    title: 'Your booking page',
    description: 'A clean, mobile-optimized booking page at savspot.co/your-name. Embed it on your website or share via QR code.',
  },
] as const;

const PRICING_FEATURES = {
  free: [
    'Unlimited bookings',
    'Online & offline payments',
    '1% processing fee on transactions',
    'Google Calendar sync',
    'Client CRM',
    'Email notifications & reminders',
    'SMS alerts (to you)',
    'Client import from competitors',
    'Walk-in booking support',
    'Invoice generation',
    'Booking page + QR code',
    'Cancellation policy enforcement',
    'AI agent discoverability (MCP)',
    'AI voice receptionist',
    'Data export (GDPR-compliant)',
  ],
  pro: [
    'Everything in Free (incl. 1% processing fee)',
    'Custom email templates',
    'SMS to clients',
    'Advanced analytics dashboard',
    'Embeddable booking widget',
    'Intake forms & questionnaires',
    'Digital contracts & signatures',
    'Advanced workflow automation',
    'Multi-location management',
    'Team & staff management',
    'Custom integrations',
    'Custom domain support',
    'Advanced reporting',
    'Accounting integrations',
    'Priority support',
  ],
} as const;

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
            The booking platform
            <br />
            that pays for itself.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Scheduling, payments, CRM, Google Calendar sync, and AI-powered tools for any service business.
            Live in under 5 minutes. No monthly fees — we only earn when you do.
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
          <p className="mt-4 text-sm text-muted-foreground">
            No credit card required. Import your clients from Booksy, Fresha, Square, or Vagaro.
          </p>
        </section>

        {/* Business Types */}
        <section className="border-t bg-muted/50 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
              Built for every service business
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
              Pick your business type and we configure everything — booking flow, reminders, payment options, and calendar settings.
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

        {/* Features Grid */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
              Everything you need to run your business
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
              Scheduling, payments, CRM, notifications, and analytics — all included from day one.
            </p>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {CORE_FEATURES.map((feature) => (
                <div key={feature.title} className="rounded-lg border bg-card p-6 shadow-sm">
                  <feature.icon className="h-6 w-6 text-primary" />
                  <h3 className="mt-3 text-base font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Switching Section */}
        <section className="border-t bg-muted/50 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Switching from another platform?
              </h2>
              <p className="mt-4 text-muted-foreground sm:text-lg">
                Import your client list and appointment history from Booksy, Fresha, Square, Vagaro, or any CSV export.
                No data left behind, no starting over.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border bg-card p-5 shadow-sm">
                  <Download className="mx-auto h-6 w-6 text-primary" />
                  <p className="mt-3 font-medium">Import clients</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Bring your full client list with contact details and notes.
                  </p>
                </div>
                <div className="rounded-lg border bg-card p-5 shadow-sm">
                  <Calendar className="mx-auto h-6 w-6 text-primary" />
                  <p className="mt-3 font-medium">Run in parallel</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Google Calendar sync blocks slots from both systems — no double bookings.
                  </p>
                </div>
                <div className="rounded-lg border bg-card p-5 shadow-sm">
                  <CheckCircle2 className="mx-auto h-6 w-6 text-primary" />
                  <p className="mt-3 font-medium">Switch when ready</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Try SavSpot risk-free. Move at your own pace — no contracts.
                  </p>
                </div>
              </div>
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

        {/* Pricing */}
        <section className="border-t bg-muted/50 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
              Simple, honest pricing
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
              Start free with everything you need. Upgrade only when you want more.
            </p>
            <div className="mx-auto mt-12 grid max-w-4xl gap-6 lg:grid-cols-2">
              {/* Free Tier */}
              <div className="flex flex-col rounded-lg border bg-card p-6 shadow-sm">
                <div>
                  <h3 className="text-lg font-semibold">Free</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-bold">$0</span>
                    <span className="text-sm text-muted-foreground">/month</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Free forever. No credit card required.
                  </p>
                </div>
                <ul className="mt-6 flex-1 space-y-2.5">
                  {PRICING_FEATURES.free.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className="mt-8 inline-flex h-11 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Get Started Free
                </Link>
              </div>

              {/* Pro Tier */}
              <div className="relative flex flex-col rounded-lg border-2 border-primary bg-card p-6 shadow-sm">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                    Most Popular
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Pro</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-bold">$10</span>
                    <span className="text-sm text-muted-foreground">/month</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    or $8/mo billed annually
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    For growing businesses that want more control.
                  </p>
                </div>
                <ul className="mt-6 flex-1 space-y-2.5">
                  {PRICING_FEATURES.pro.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className="mt-8 inline-flex h-11 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Start Free, Upgrade Later
                </Link>
              </div>
            </div>
            <p className="mx-auto mt-6 max-w-lg text-center text-xs text-muted-foreground">
              A 1% processing fee applies to all transactions on both plans.
              This is how we keep SavSpot affordable — no hidden charges.
            </p>
          </div>
        </section>

        {/* Security & Trust */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <div className="text-center">
                <Shield className="mx-auto h-6 w-6 text-primary" />
                <p className="mt-3 text-sm font-medium">Secure by default</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Row-level security, encrypted tokens, GDPR-compliant data handling.
                </p>
              </div>
              <div className="text-center">
                <Smartphone className="mx-auto h-6 w-6 text-primary" />
                <p className="mt-3 text-sm font-medium">Mobile-optimized</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Your booking page and admin dashboard work beautifully on any device.
                </p>
              </div>
              <div className="text-center">
                <Globe className="mx-auto h-6 w-6 text-primary" />
                <p className="mt-3 text-sm font-medium">Multi-timezone</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  UTC storage with timezone-aware display. Serve clients anywhere.
                </p>
              </div>
              <div className="text-center">
                <Star className="mx-auto h-6 w-6 text-primary" />
                <p className="mt-3 text-sm font-medium">AI-powered</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  AI voice receptionist, agent-bookable via MCP, and smart insights built in.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t bg-muted/50 py-16 sm:py-20">
          <div className="mx-auto max-w-2xl px-4 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Your next booking is 5 minutes away.
            </h2>
            <p className="mt-3 text-muted-foreground">
              Join service businesses already using SavSpot to manage their schedule, payments, and clients — all in one place.
            </p>
            <Link
              href="/register"
              className="mt-8 inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Create Your Free Booking Page
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              No credit card. No contracts. Cancel anytime.
            </p>
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
