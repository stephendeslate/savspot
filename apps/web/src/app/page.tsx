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
  ChevronDown,
  Github,
  Terminal,
  Code2,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'SavSpot — Open-Source Booking Platform for Service Businesses',
  description:
    'Open-source booking and business management platform. Self-host with Docker or use our managed cloud. Scheduling, payments, CRM, and AI tools. AGPL v3 licensed.',
  openGraph: {
    title: 'SavSpot — Open-Source Booking Platform for Service Businesses',
    description:
      'Open-source booking and business management platform. Self-host with Docker or use our managed cloud. Scheduling, payments, CRM, and AI tools.',
    type: 'website',
    url: 'https://savspot.co',
    siteName: 'SavSpot',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SavSpot — Open-Source Booking Platform for Service Businesses',
    description:
      'Open-source booking platform. Self-host with Docker or use managed cloud. AGPL v3 licensed.',
  },
  keywords: [
    'open source booking platform',
    'self-hosted booking software',
    'appointment scheduling',
    'business management',
    'online booking',
    'service business software',
    'AGPL',
    'docker booking',
  ],
};

const BUSINESS_TYPES = [
  { label: 'Venues', icon: Building2, description: 'Event spaces, conference rooms, coworking', accent: 'from-primary/10 to-primary/5' },
  { label: 'Salons', icon: Scissors, description: 'Hair, nails, beauty, spa services', accent: 'from-accent/10 to-accent/5' },
  { label: 'Studios', icon: Music, description: 'Photography, recording, art studios', accent: 'from-primary/10 to-primary/5' },
  { label: 'Fitness', icon: Dumbbell, description: 'Gyms, yoga, personal training', accent: 'from-accent/10 to-accent/5' },
  { label: 'Professional', icon: Briefcase, description: 'Consulting, coaching, tutoring', accent: 'from-primary/10 to-primary/5' },
  { label: 'And More', icon: MoreHorizontal, description: 'Any service business', accent: 'from-accent/10 to-accent/5' },
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

const TOP_FEATURES = [
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
    description: 'Automated confirmations, reminders, and follow-ups via email. SMS alerts to you for new bookings and cancellations.',
  },
  {
    icon: Bot,
    title: 'AI agent bookings',
    description: 'Your business is discoverable by ChatGPT, Claude, Google AI, and other AI assistants. Clients can book you through any AI agent.',
  },
  {
    icon: Phone,
    title: 'AI voice receptionist',
    description: 'Never miss a call. An AI receptionist handles after-hours calls, checks availability, and books appointments by voice.',
  },
] as const;

const MORE_FEATURES = [
  { icon: Download, title: 'Import your clients', description: 'Switching from Booksy, Fresha, Square, or Vagaro? Import your client list in minutes.' },
  { icon: UserPlus, title: 'Walk-ins welcome', description: 'Quick-add walk-in appointments directly from your calendar.' },
  { icon: Clock, title: 'Smart availability', description: 'Real-time slot checking with double-booking prevention and buffer times.' },
  { icon: Shield, title: 'Cancellation policies', description: 'Set cancellation windows and fees per service. Enforce automatically.' },
  { icon: BarChart3, title: 'No-show insights', description: 'Risk indicators and slot demand analysis for smarter scheduling.' },
  { icon: Workflow, title: 'Workflow automation', description: 'Automate follow-ups, reminders, and multi-step workflows.' },
  { icon: FileText, title: 'Invoices & receipts', description: 'Professional PDF invoices generated for every booking.' },
  { icon: MessageSquare, title: 'Client communications', description: 'Email templates with smart variable substitution.' },
  { icon: Globe, title: 'Your booking page', description: 'A clean, mobile-optimized booking page with embeddable widget.' },
] as const;

const PRICING_FEATURES = {
  starter: [
    'Unlimited bookings',
    'Online & offline payments',
    '1% processing fee on transactions',
    'Google Calendar sync',
    'Client CRM',
    'Email notifications & reminders',
    '100 SMS/month',
    'Client import from competitors',
    'Walk-in booking support',
    'Invoice generation',
    'Booking page + QR code',
    'Cancellation policy enforcement',
    'AI agent discoverability (MCP)',
    'AI voice receptionist',
    'Data export (GDPR-compliant)',
    '14-day free trial',
  ],
  team: [
    'Everything in Starter',
    '2-10 staff members',
    '500 SMS/month',
    'Advanced analytics dashboard',
    'Embeddable booking widget (popup & inline)',
    'Custom email templates',
    'Intake forms & questionnaires',
    'Digital contracts & signatures',
    'Advanced workflow automation',
    'Multi-location management',
    'Team & staff management',
    'Custom integrations',
    'Custom domain support',
    'Advanced reporting',
  ],
  business: [
    'Everything in Team',
    'Unlimited staff members',
    '2,000 SMS/month',
    'Priority support',
    'Dedicated account manager',
    'Custom onboarding',
    'Accounting integrations',
    'SLA guarantee',
  ],
} as const;

function FeatureExpander() {
  return (
    <details className="group mt-8">
      <summary className="mx-auto flex cursor-pointer items-center justify-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors [&::-webkit-details-marker]:hidden list-none">
        Show all features
        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MORE_FEATURES.map((feature) => (
          <div key={feature.title} className="rounded-xl border border-border/60 bg-card p-5 shadow-[var(--shadow-colored)] transition-shadow hover:shadow-[var(--shadow-elevated)]">
            <feature.icon className="h-5 w-5 text-primary" />
            <h3 className="mt-2.5 text-sm font-semibold">{feature.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
          </div>
        ))}
      </div>
    </details>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <span className="text-xl font-bold tracking-tight text-primary">SavSpot</span>
          <div className="hidden items-center gap-6 sm:flex">
            <a href="#features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Features
            </a>
            <Link href="/pricing" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Pricing
            </Link>
            <Link href="/docs/self-hosting" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Self-Host
            </Link>
            <a
              href="https://github.com/stephendeslate/savspot"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <Github className="h-5 w-5" />
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="inline-flex h-10 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground shadow-[var(--shadow-colored)] transition-all hover:shadow-[var(--glow-accent)] hover:brightness-105"
            >
              Get Started Free
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          {/* Background pattern — CSS-only dot grid */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
          {/* Radial glow */}
          <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[600px] w-[800px] rounded-full bg-primary/[0.04] blur-3xl" />

          <div className="relative mx-auto max-w-6xl px-4 py-24 text-center sm:py-32 lg:py-36">
            <a
              href="https://github.com/stephendeslate/savspot"
              target="_blank"
              rel="noopener noreferrer"
              className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground shadow-sm transition-colors hover:text-foreground"
            >
              <Code2 className="h-4 w-4" />
              Open Source · AGPL v3
              <ArrowRight className="h-3 w-3" />
            </a>
            <h1 className="text-5xl font-bold tracking-tighter sm:text-6xl lg:text-7xl">
              The booking platform
              <br />
              <span className="text-accent">that pays for itself.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
              Open-source scheduling, payments, CRM, and AI tools for any service business.
              Self-host with Docker or use our managed cloud. Live in under 5 minutes.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center rounded-lg bg-accent px-8 text-base font-medium text-accent-foreground shadow-[0_0_20px_var(--glow-accent)] transition-all hover:shadow-[0_0_30px_var(--glow-accent)] hover:brightness-105"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <a
                href="https://github.com/stephendeslate/savspot"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-border bg-background px-8 text-base font-medium transition-colors hover:bg-secondary"
              >
                <Github className="mr-2 h-5 w-5" />
                Star on GitHub
              </a>
            </div>
            <div className="mt-5 flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-4">
              <p className="text-sm text-muted-foreground">
                No credit card required · Import from Booksy, Fresha, Square, or Vagaro
              </p>
              <span className="hidden text-muted-foreground/40 sm:inline">|</span>
              <Link
                href="/book/demo-barbershop"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Try the live demo &rarr;
              </Link>
              <span className="hidden text-muted-foreground/40 sm:inline">|</span>
              <a
                href="/docs/self-hosting"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                <Terminal className="h-3.5 w-3.5" />
                Self-host with Docker
              </a>
            </div>
          </div>
        </section>

        {/* Business Types */}
        <section className="border-t py-16 sm:py-20">
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
                  className={`flex items-center gap-4 rounded-xl border bg-gradient-to-br ${type.accent} p-5 shadow-[var(--shadow-colored)] transition-all hover:shadow-[var(--shadow-elevated)] hover:-translate-y-0.5`}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <type.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{type.label}</p>
                    <p className="text-sm text-muted-foreground">{type.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="border-t bg-muted/30 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
              Everything you need to run your business
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
              Scheduling, payments, CRM, notifications, and analytics — all included from day one.
            </p>

            {/* Top 6 features — larger cards with colored top border */}
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {TOP_FEATURES.map((feature, i) => (
                <div
                  key={feature.title}
                  className="rounded-xl border bg-card p-6 shadow-[var(--shadow-colored)] transition-shadow hover:shadow-[var(--shadow-elevated)]"
                  style={{
                    borderTopWidth: '3px',
                    borderTopColor: i % 2 === 0 ? 'var(--primary)' : 'var(--accent)',
                  }}
                >
                  <feature.icon className="h-6 w-6 text-primary" />
                  <h3 className="mt-3 text-base font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>

            {/* Expandable remaining features */}
            <FeatureExpander />
          </div>
        </section>

        {/* Switching Section */}
        <section className="border-t py-16 sm:py-20">
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
                {[
                  { icon: Download, title: 'Import clients', desc: 'Bring your full client list with contact details and notes.' },
                  { icon: Calendar, title: 'Run in parallel', desc: 'Google Calendar sync blocks slots from both systems — no double bookings.' },
                  { icon: CheckCircle2, title: 'Switch when ready', desc: 'Try SavSpot risk-free. Move at your own pace — no contracts.' },
                ].map((item) => (
                  <div key={item.title} className="rounded-xl border bg-card p-5 shadow-[var(--shadow-colored)]">
                    <item.icon className="mx-auto h-6 w-6 text-primary" />
                    <p className="mt-3 font-medium">{item.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="border-t bg-muted/30 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
              Live in under 5 minutes
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
              From sign-up to a working booking page — no credit card, no setup fees.
            </p>
            <div className="relative mt-12">
              {/* Horizontal connector line — hidden on mobile */}
              <div className="absolute left-0 right-0 top-6 hidden h-0.5 bg-gradient-to-r from-transparent via-primary/20 to-transparent sm:block" />
              <div className="grid gap-8 sm:grid-cols-3">
                {STEPS.map((step) => (
                  <div key={step.number} className="relative text-center">
                    <div className="relative z-10 mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground shadow-[0_0_12px_var(--glow-primary)]">
                      {step.number}
                    </div>
                    <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="border-t py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
              Simple, honest pricing
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
              Self-host for free or let us handle the infrastructure. All cloud plans include a 14-day free trial.
            </p>
            <div className="mx-auto mt-12 grid max-w-6xl gap-6 lg:grid-cols-4">
              {/* Self-Hosted Tier */}
              <div className="flex flex-col rounded-xl border bg-card p-6 shadow-[var(--shadow-colored)]">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">Self-Hosted</h3>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">AGPL v3</span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-bold">Free</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Run on your own server. Full source code, no limits, no fees.
                  </p>
                </div>
                <ul className="mt-6 flex-1 space-y-2.5">
                  {[
                    'Full source code access',
                    'All features included',
                    'No transaction fees',
                    'Docker one-command setup',
                    'Auto HTTPS via Caddy',
                    'PostgreSQL + Redis included',
                    'Unlimited businesses',
                    'Community support',
                  ].map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href="https://github.com/stephendeslate/savspot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-8 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-background text-sm font-medium transition-colors hover:bg-secondary"
                >
                  <Github className="h-4 w-4" />
                  View on GitHub
                </a>
              </div>

              {/* Cloud Starter Tier */}
              <div className="flex flex-col rounded-xl border bg-card p-6 shadow-[var(--shadow-colored)]">
                <div>
                  <h3 className="text-lg font-semibold">Cloud Starter</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-bold">$9</span>
                    <span className="text-sm text-muted-foreground">/month</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    or $7/mo billed annually
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Perfect for solo practitioners. 1 staff member included.
                  </p>
                </div>
                <ul className="mt-6 flex-1 space-y-2.5">
                  {PRICING_FEATURES.starter.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className="mt-8 inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Start Free Trial
                </Link>
              </div>

              {/* Cloud Team Tier */}
              <div className="relative flex flex-col rounded-xl border-2 border-accent bg-card p-6 shadow-[var(--shadow-elevated)]">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground shadow-[0_0_12px_var(--glow-accent)]">
                    Most Popular
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Cloud Team</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-bold">$7</span>
                    <span className="text-sm text-muted-foreground">/seat/month</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    or $5/seat/mo billed annually
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    For growing teams with 2-10 staff members.
                  </p>
                </div>
                <ul className="mt-6 flex-1 space-y-2.5">
                  {PRICING_FEATURES.team.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className="mt-8 inline-flex h-11 w-full items-center justify-center rounded-lg bg-accent text-sm font-medium text-accent-foreground shadow-[0_0_12px_var(--glow-accent)] transition-all hover:shadow-[0_0_20px_var(--glow-accent)] hover:brightness-105"
                >
                  Start Free Trial
                </Link>
              </div>

              {/* Cloud Business Tier */}
              <div className="flex flex-col rounded-xl border bg-card p-6 shadow-[var(--shadow-colored)]">
                <div>
                  <h3 className="text-lg font-semibold">Cloud Business</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-bold">Custom</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    For larger operations with 10+ staff. Custom pricing and onboarding.
                  </p>
                </div>
                <ul className="mt-6 flex-1 space-y-2.5">
                  {PRICING_FEATURES.business.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href="mailto:hello@savspot.com?subject=Business%20Plan%20Inquiry"
                  className="mt-8 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-background text-sm font-medium transition-colors hover:bg-secondary"
                >
                  Contact Us
                </a>
              </div>
            </div>
            <p className="mx-auto mt-6 max-w-lg text-center text-xs text-muted-foreground">
              All cloud plans include a 1% processing fee on transactions and a 14-day free trial (no credit card required).
              Self-hosted has no fees — bring your own Stripe account.
            </p>
          </div>
        </section>

        {/* Security & Trust */}
        <section className="border-t bg-muted/30 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Code2, title: 'Open source', desc: 'Full source code on GitHub. Audit it, extend it, or self-host it. AGPL v3 licensed.' },
                { icon: Shield, title: 'Secure by default', desc: 'Row-level security, encrypted tokens, GDPR-compliant data handling.' },
                { icon: Smartphone, title: 'Mobile-optimized', desc: 'Your booking page and admin dashboard work beautifully on any device.' },
                { icon: Star, title: 'AI-powered', desc: 'AI voice receptionist, agent-bookable via MCP, and smart insights built in.' },
              ].map((item) => (
                <div key={item.title} className="text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <p className="mt-3 text-sm font-medium">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative overflow-hidden border-t">
          <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80" />
          <div className="relative mx-auto max-w-2xl px-4 py-16 text-center sm:py-20">
            <h2 className="text-2xl font-bold tracking-tight text-primary-foreground sm:text-3xl">
              Your next booking is 5 minutes away.
            </h2>
            <p className="mt-3 text-primary-foreground/80">
              Join service businesses already using SavSpot to manage their schedule, payments, and clients — all in one place.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center rounded-lg bg-accent px-8 text-base font-medium text-accent-foreground shadow-[0_0_24px_var(--glow-accent)] transition-all hover:shadow-[0_0_36px_var(--glow-accent)] hover:brightness-105"
              >
                Create Your Free Booking Page
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <a
                href="https://github.com/stephendeslate/savspot"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-primary-foreground/20 px-8 text-base font-medium text-primary-foreground transition-colors hover:bg-primary-foreground/10"
              >
                <Github className="mr-2 h-5 w-5" />
                Self-Host for Free
              </a>
            </div>
            <p className="mt-3 text-sm text-primary-foreground/70">
              No credit card. No contracts. Open source forever.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-10">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-8 sm:grid-cols-5">
            <div>
              <span className="text-sm font-semibold text-primary">SavSpot</span>
              <p className="mt-2 text-xs text-muted-foreground">
                Open-source booking platform for service businesses.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Product</p>
              <ul className="mt-3 space-y-2">
                <li><a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a></li>
                <li><Link href="/docs/self-hosting" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Self-Host</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Community</p>
              <ul className="mt-3 space-y-2">
                <li><a href="https://github.com/stephendeslate/savspot" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">GitHub</a></li>
                <li><a href="https://github.com/stephendeslate/savspot/issues" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Issues</a></li>
                <li><a href="https://github.com/stephendeslate/savspot/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contributing</a></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account</p>
              <ul className="mt-3 space-y-2">
                <li><Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Sign In</Link></li>
                <li><Link href="/register" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Get Started</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Legal</p>
              <ul className="mt-3 space-y-2">
                <li><Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms</Link></li>
                <li><Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy</Link></li>
                <li><a href="https://github.com/stephendeslate/savspot/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">License (AGPL v3)</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t pt-6">
            <p className="text-center text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} SavSpot. Open source under AGPL v3.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
