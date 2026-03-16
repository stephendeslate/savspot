import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Github,
  Code2,
  Terminal,
  X,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Pricing — SavSpot',
  description:
    'Self-host SavSpot for free or use our managed cloud. Compare Self-Hosted, Cloud Free, and Cloud Pro plans.',
  openGraph: {
    title: 'Pricing — SavSpot',
    description:
      'Self-host SavSpot for free or use our managed cloud. Compare Self-Hosted, Cloud Free, and Cloud Pro plans.',
    type: 'website',
    url: 'https://savspot.co/pricing',
    siteName: 'SavSpot',
  },
};

const PLANS = [
  {
    name: 'Self-Hosted',
    price: 'Free',
    period: null,
    annualNote: null,
    description: 'Run on your own server. Full source code, no limits, no fees.',
    badge: 'AGPL v3',
    cta: {
      label: 'View on GitHub',
      href: 'https://github.com/stephendeslate/savspot',
      external: true,
      variant: 'outline' as const,
    },
    highlight: false,
  },
  {
    name: 'Cloud Free',
    price: '$0',
    period: '/month',
    annualNote: null,
    description: 'We host it for you. No credit card required.',
    badge: null,
    cta: {
      label: 'Get Started Free',
      href: '/register',
      external: false,
      variant: 'primary' as const,
    },
    highlight: false,
  },
  {
    name: 'Cloud Pro',
    price: '$10',
    period: '/month',
    annualNote: 'or $8/mo billed annually',
    description: 'For growing businesses that want more control.',
    badge: 'Most Popular',
    cta: {
      label: 'Start Free, Upgrade Later',
      href: '/register',
      external: false,
      variant: 'accent' as const,
    },
    highlight: true,
  },
] as const;

type FeatureValue = boolean | string;

interface ComparisonCategory {
  category: string;
  features: {
    name: string;
    selfHosted: FeatureValue;
    cloudFree: FeatureValue;
    cloudPro: FeatureValue;
  }[];
}

const COMPARISON: ComparisonCategory[] = [
  {
    category: 'Booking & Scheduling',
    features: [
      { name: 'Unlimited bookings', selfHosted: true, cloudFree: true, cloudPro: true },
      { name: 'Public booking page', selfHosted: true, cloudFree: true, cloudPro: true },
      { name: 'Google Calendar sync', selfHosted: true, cloudFree: true, cloudPro: true },
      { name: 'Walk-in booking', selfHosted: true, cloudFree: true, cloudPro: true },
      { name: 'Buffer times & breaks', selfHosted: true, cloudFree: true, cloudPro: true },
      { name: 'Service addons', selfHosted: true, cloudFree: true, cloudPro: true },
      { name: 'Embeddable widget', selfHosted: true, cloudFree: false, cloudPro: true },
      { name: 'Intake forms', selfHosted: true, cloudFree: false, cloudPro: true },
    ],
  },
  {
    category: 'Payments',
    features: [
      { name: 'Online payments (Stripe)', selfHosted: true, cloudFree: true, cloudPro: true },
      { name: 'Offline payment tracking', selfHosted: true, cloudFree: true, cloudPro: true },
      { name: 'Invoice generation', selfHosted: true, cloudFree: true, cloudPro: true },
      { name: 'Transaction fee', selfHosted: 'None', cloudFree: '1%', cloudPro: '1%' },
      { name: 'Cancellation policies', selfHosted: true, cloudFree: true, cloudPro: true },
    ],
  },
  {
    category: 'Client Management',
    features: [
      { name: 'Client CRM', selfHosted: true, cloudFree: true, cloudPro: true },
      { name: 'Client import (CSV)', selfHosted: true, cloudFree: true, cloudPro: true },
      { name: 'Booking history', selfHosted: true, cloudFree: true, cloudPro: true },
      { name: 'Digital contracts', selfHosted: true, cloudFree: false, cloudPro: true },
    ],
  },
  {
    category: 'Communications',
    features: [
      { name: 'Email notifications', selfHosted: true, cloudFree: true, cloudPro: true },
      { name: 'SMS alerts (to you)', selfHosted: true, cloudFree: true, cloudPro: true },
      { name: 'Custom email templates', selfHosted: true, cloudFree: false, cloudPro: true },
      { name: 'SMS to clients', selfHosted: true, cloudFree: false, cloudPro: true },
      { name: 'Workflow automation', selfHosted: true, cloudFree: false, cloudPro: true },
    ],
  },
  {
    category: 'AI Features',
    features: [
      { name: 'AI agent discoverability (MCP)', selfHosted: true, cloudFree: true, cloudPro: true },
      { name: 'AI voice receptionist', selfHosted: true, cloudFree: true, cloudPro: true },
    ],
  },
  {
    category: 'Business Tools',
    features: [
      { name: 'Analytics dashboard', selfHosted: true, cloudFree: false, cloudPro: true },
      { name: 'Data export (CSV/JSON)', selfHosted: true, cloudFree: true, cloudPro: true },
      { name: 'Multi-location', selfHosted: true, cloudFree: false, cloudPro: true },
      { name: 'Team & staff management', selfHosted: true, cloudFree: false, cloudPro: true },
      { name: 'Custom domain', selfHosted: true, cloudFree: false, cloudPro: true },
      { name: 'Custom integrations', selfHosted: true, cloudFree: false, cloudPro: true },
      { name: 'Accounting integrations', selfHosted: true, cloudFree: false, cloudPro: true },
    ],
  },
  {
    category: 'Infrastructure',
    features: [
      { name: 'Hosting', selfHosted: 'Your server', cloudFree: 'Managed', cloudPro: 'Managed' },
      { name: 'Automatic updates', selfHosted: false, cloudFree: true, cloudPro: true },
      { name: 'Automatic backups', selfHosted: false, cloudFree: true, cloudPro: true },
      { name: 'Auto HTTPS', selfHosted: 'Via Caddy', cloudFree: true, cloudPro: true },
      { name: 'Support', selfHosted: 'Community', cloudFree: 'Email', cloudPro: 'Priority' },
    ],
  },
];

const FAQ = [
  {
    q: 'What does "self-hosted" mean?',
    a: 'You run SavSpot on your own server or VPS. We provide a Docker setup that gets you running with a single command. You control your data, your infrastructure, and your costs.',
  },
  {
    q: 'Is the self-hosted version really free?',
    a: 'Yes. SavSpot is open source under the AGPL v3 license. You get the full platform — every feature, no artificial limits, no transaction fees. You just need a server to run it on (a $5/mo VPS works fine).',
  },
  {
    q: 'What\'s the 1% transaction fee on Cloud plans?',
    a: 'Cloud plans charge a 1% fee on transactions processed through Stripe. This is separate from Stripe\'s own processing fees. This fee is how we fund the managed cloud service. Self-hosted users pay no transaction fee to SavSpot.',
  },
  {
    q: 'Can I switch between plans?',
    a: 'Yes. You can upgrade from Cloud Free to Cloud Pro at any time. You can also migrate between self-hosted and cloud in either direction — we provide export/import tools.',
  },
  {
    q: 'Do I need a Pro License to use self-hosted commercially?',
    a: 'No. The AGPL v3 license allows commercial use. The only requirement is that if you modify the code and offer it as a service, you must make your modifications available under the same license. If you want to use modified SavSpot code without this requirement, contact us about the Pro License.',
  },
  {
    q: 'What do I need to self-host?',
    a: 'A Linux server with Docker installed, at least 1 CPU core and 1GB RAM. We recommend a VPS from any provider (Hetzner, DigitalOcean, Linode, etc.) starting around $5/month.',
  },
];

function FeatureCell({ value }: { value: FeatureValue }) {
  if (typeof value === 'string') {
    return <span className="text-sm text-foreground">{value}</span>;
  }
  return value ? (
    <CheckCircle2 className="mx-auto h-4 w-4 text-primary" />
  ) : (
    <X className="mx-auto h-4 w-4 text-muted-foreground/40" />
  );
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="text-xl font-bold tracking-tight text-primary">SavSpot</Link>
          <div className="hidden items-center gap-6 sm:flex">
            <Link href="/#features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Features
            </Link>
            <span className="text-sm font-medium text-foreground">
              Pricing
            </span>
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
        {/* Header */}
        <section className="relative overflow-hidden">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[400px] w-[600px] rounded-full bg-primary/[0.04] blur-3xl" />
          <div className="relative mx-auto max-w-6xl px-4 py-16 text-center sm:py-20">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">
              Simple, honest pricing
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Self-host for free or let us handle the infrastructure. No hidden fees, no feature gates on self-hosted.
            </p>
          </div>
        </section>

        {/* Plan Cards */}
        <section className="pb-16">
          <div className="mx-auto max-w-5xl px-4">
            <div className="grid gap-6 lg:grid-cols-3">
              {PLANS.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative flex flex-col rounded-xl p-6 shadow-[var(--shadow-colored)] ${
                    plan.highlight
                      ? 'border-2 border-accent shadow-[var(--shadow-elevated)]'
                      : 'border'
                  } bg-card`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${
                          plan.highlight
                            ? 'bg-accent text-accent-foreground shadow-[0_0_12px_var(--glow-accent)]'
                            : 'bg-primary/10 text-primary'
                        }`}
                      >
                        {plan.badge}
                      </span>
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-semibold">{plan.name}</h3>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-3xl font-bold">{plan.price}</span>
                      {plan.period && (
                        <span className="text-sm text-muted-foreground">{plan.period}</span>
                      )}
                    </div>
                    {plan.annualNote && (
                      <p className="mt-1 text-xs text-muted-foreground">{plan.annualNote}</p>
                    )}
                    <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
                  </div>
                  <div className="mt-auto pt-6">
                    {plan.cta.external ? (
                      <a
                        href={plan.cta.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-background text-sm font-medium transition-colors hover:bg-secondary"
                      >
                        <Github className="h-4 w-4" />
                        {plan.cta.label}
                      </a>
                    ) : (
                      <Link
                        href={plan.cta.href}
                        className={`inline-flex h-11 w-full items-center justify-center rounded-lg text-sm font-medium transition-all ${
                          plan.highlight
                            ? 'bg-accent text-accent-foreground shadow-[0_0_12px_var(--glow-accent)] hover:shadow-[0_0_20px_var(--glow-accent)] hover:brightness-105'
                            : 'bg-primary text-primary-foreground hover:bg-primary/90'
                        }`}
                      >
                        {plan.cta.label}
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="mx-auto mt-6 max-w-lg text-center text-xs text-muted-foreground">
              Cloud plans include a 1% processing fee on transactions.
              Self-hosted has no fees — bring your own Stripe account.
            </p>
          </div>
        </section>

        {/* Self-Host Callout */}
        <section className="border-t bg-muted/30 py-12">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <Terminal className="mx-auto h-8 w-8 text-primary" />
            <h2 className="mt-4 text-xl font-bold tracking-tight sm:text-2xl">
              One command to self-host
            </h2>
            <div className="mx-auto mt-4 max-w-md overflow-hidden rounded-lg border bg-card">
              <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-2">
                <div className="h-3 w-3 rounded-full bg-red-400/60" />
                <div className="h-3 w-3 rounded-full bg-yellow-400/60" />
                <div className="h-3 w-3 rounded-full bg-green-400/60" />
              </div>
              <pre className="px-4 py-3 text-left text-sm">
                <code className="text-foreground">
                  <span className="text-muted-foreground">$</span> git clone https://github.com/stephendeslate/savspot.git{'\n'}
                  <span className="text-muted-foreground">$</span> cd savspot{'\n'}
                  <span className="text-muted-foreground">$</span> ./scripts/install.sh
                </code>
              </pre>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Docker setup with PostgreSQL, Redis, Caddy (auto HTTPS), and automatic migrations.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/docs/self-hosting"
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Read the docs
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <span className="hidden text-muted-foreground/40 sm:inline">|</span>
              <a
                href="https://github.com/stephendeslate/savspot"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                <Github className="h-3.5 w-3.5" />
                View source
              </a>
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="border-t py-16 sm:py-20">
          <div className="mx-auto max-w-5xl px-4">
            <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
              Full feature comparison
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
              Self-hosted gets every feature. Cloud plans are tiered for simplicity.
            </p>

            <div className="mt-12 overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3 text-left font-medium text-muted-foreground">Feature</th>
                    <th className="pb-3 text-center font-medium">Self-Hosted</th>
                    <th className="pb-3 text-center font-medium">Cloud Free</th>
                    <th className="pb-3 text-center font-medium">Cloud Pro</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map((group) => (
                    <>
                      <tr key={group.category}>
                        <td colSpan={4} className="pb-2 pt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {group.category}
                        </td>
                      </tr>
                      {group.features.map((feature) => (
                        <tr key={feature.name} className="border-b border-border/50">
                          <td className="py-3 pr-4">{feature.name}</td>
                          <td className="py-3 text-center">
                            <FeatureCell value={feature.selfHosted} />
                          </td>
                          <td className="py-3 text-center">
                            <FeatureCell value={feature.cloudFree} />
                          </td>
                          <td className="py-3 text-center">
                            <FeatureCell value={feature.cloudPro} />
                          </td>
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t bg-muted/30 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-4">
            <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
              Frequently asked questions
            </h2>
            <div className="mt-10 space-y-6">
              {FAQ.map((item) => (
                <div key={item.q} className="rounded-xl border bg-card p-5 shadow-sm">
                  <h3 className="font-semibold">{item.q}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative overflow-hidden border-t">
          <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80" />
          <div className="relative mx-auto max-w-2xl px-4 py-16 text-center sm:py-20">
            <h2 className="text-2xl font-bold tracking-tight text-primary-foreground sm:text-3xl">
              Ready to get started?
            </h2>
            <p className="mt-3 text-primary-foreground/80">
              Try the managed cloud for free or self-host on your own infrastructure.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center rounded-lg bg-accent px-8 text-base font-medium text-accent-foreground shadow-[0_0_24px_var(--glow-accent)] transition-all hover:shadow-[0_0_36px_var(--glow-accent)] hover:brightness-105"
              >
                Get Started Free
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
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <Link href="/" className="text-sm font-semibold text-primary">SavSpot</Link>
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} SavSpot. Open source under AGPL v3.
            </p>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/stephendeslate/savspot"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
