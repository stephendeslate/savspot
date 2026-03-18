import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Github,
  Terminal,
  Server,
  Shield,
  Database,
  Globe,
  HardDrive,
  Cpu,
  MemoryStick,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Self-Hosting Guide — SavSpot',
  description:
    'Run your own SavSpot instance with Docker. Full source code, no limits, no fees. One command to get started.',
  openGraph: {
    title: 'Self-Hosting Guide — SavSpot',
    description:
      'Run your own SavSpot instance with Docker. Full source code, no limits, no fees. One command to get started.',
    type: 'website',
    url: 'https://savspot.co/docs/self-hosting',
    siteName: 'SavSpot',
  },
};

function CodeBlock({ children, title }: { children: string; title?: string }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      {title && (
        <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-2">
          <div className="h-3 w-3 rounded-full bg-red-400/60" />
          <div className="h-3 w-3 rounded-full bg-yellow-400/60" />
          <div className="h-3 w-3 rounded-full bg-green-400/60" />
          <span className="ml-2 text-xs text-muted-foreground">{title}</span>
        </div>
      )}
      <pre className="overflow-x-auto px-4 py-3 text-sm">
        <code className="text-foreground">{children}</code>
      </pre>
    </div>
  );
}

export default function SelfHostingPage() {
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
            <Link href="/pricing" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Pricing
            </Link>
            <span className="text-sm font-medium text-foreground">
              Self-Host
            </span>
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
              Start Free Trial
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[400px] w-[600px] rounded-full bg-primary/[0.04] blur-3xl" />
          <div className="relative mx-auto max-w-3xl px-4 py-16 text-center sm:py-20">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Server className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">
              Self-host SavSpot
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Run your own instance with Docker. Full source code, no limits, no fees.
              One command to get started.
            </p>
          </div>
        </section>

        {/* Quick Start */}
        <section className="pb-16">
          <div className="mx-auto max-w-3xl px-4">
            <h2 className="text-2xl font-bold tracking-tight">Quick Start</h2>
            <p className="mt-2 text-muted-foreground">
              Clone the repo and run the install script. That&apos;s it.
            </p>
            <div className="mt-6">
              <CodeBlock title="terminal">{`$ git clone https://github.com/stephendeslate/savspot.git
$ cd savspot
$ ./scripts/install.sh`}</CodeBlock>
            </div>
            <div className="mt-6 space-y-2">
              <p className="text-sm text-muted-foreground">The install script will:</p>
              <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
                <li>Create <code className="rounded bg-muted px-1.5 py-0.5 text-xs">.env</code> from the production template</li>
                <li>Generate JWT keys and an encryption key</li>
                <li>Generate a random database password</li>
                <li>Build all containers</li>
                <li>Run database migrations</li>
                <li>Start the full stack</li>
              </ol>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              SavSpot will be available at <code className="rounded bg-muted px-1.5 py-0.5 text-xs">http://localhost</code> (or{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">https://yourdomain.com</code> if{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">DOMAIN</code> is configured).
            </p>
          </div>
        </section>

        {/* Prerequisites */}
        <section className="border-t bg-muted/30 py-16">
          <div className="mx-auto max-w-3xl px-4">
            <h2 className="text-2xl font-bold tracking-tight">Prerequisites</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border bg-card p-5 shadow-sm">
                <Terminal className="h-5 w-5 text-primary" />
                <h3 className="mt-3 font-semibold">Docker 24+</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  With Compose v2 (<code className="rounded bg-muted px-1.5 py-0.5 text-xs">docker compose</code>)
                </p>
              </div>
              <div className="rounded-xl border bg-card p-5 shadow-sm">
                <MemoryStick className="h-5 w-5 text-primary" />
                <h3 className="mt-3 font-semibold">2 GB RAM minimum</h3>
                <p className="mt-1 text-sm text-muted-foreground">4 GB recommended for production</p>
              </div>
              <div className="rounded-xl border bg-card p-5 shadow-sm">
                <Cpu className="h-5 w-5 text-primary" />
                <h3 className="mt-3 font-semibold">Linux server</h3>
                <p className="mt-1 text-sm text-muted-foreground">Ubuntu 22.04+, Debian 12+, or similar</p>
              </div>
              <div className="rounded-xl border bg-card p-5 shadow-sm">
                <Globe className="h-5 w-5 text-primary" />
                <h3 className="mt-3 font-semibold">Domain name (optional)</h3>
                <p className="mt-1 text-sm text-muted-foreground">Works on localhost for testing</p>
              </div>
            </div>
          </div>
        </section>

        {/* Manual Setup */}
        <section className="border-t py-16">
          <div className="mx-auto max-w-3xl px-4">
            <h2 className="text-2xl font-bold tracking-tight">Manual Setup</h2>
            <p className="mt-2 text-muted-foreground">
              If you prefer to set things up yourself:
            </p>
            <div className="mt-6">
              <CodeBlock title="terminal">{`$ git clone https://github.com/stephendeslate/savspot.git
$ cd savspot

# Create and edit your environment file
$ cp .env.production.example .env

# Generate keys (append to .env)
$ ./scripts/generate-keys.sh >> .env

# Edit .env — at minimum, set:
#   POSTGRES_PASSWORD (strong random password)
#   DOMAIN (your domain, or "localhost" for testing)

# Build and start
$ docker compose -f docker-compose.prod.yml up -d`}</CodeBlock>
            </div>
          </div>
        </section>

        {/* Configuration Reference */}
        <section className="border-t bg-muted/30 py-16">
          <div className="mx-auto max-w-3xl px-4">
            <h2 className="text-2xl font-bold tracking-tight">Configuration Reference</h2>

            <h3 className="mt-8 text-lg font-semibold">Required Variables</h3>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3 text-left font-medium text-muted-foreground">Variable</th>
                    <th className="pb-3 text-left font-medium text-muted-foreground">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="py-3 pr-4"><code className="rounded bg-muted px-1.5 py-0.5 text-xs">POSTGRES_PASSWORD</code></td>
                    <td className="py-3 text-muted-foreground">Database password (auto-generated by install script)</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 pr-4"><code className="rounded bg-muted px-1.5 py-0.5 text-xs">JWT_PRIVATE_KEY_BASE64</code></td>
                    <td className="py-3 text-muted-foreground">RS256 private key, base64-encoded</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 pr-4"><code className="rounded bg-muted px-1.5 py-0.5 text-xs">JWT_PUBLIC_KEY_BASE64</code></td>
                    <td className="py-3 text-muted-foreground">RS256 public key, base64-encoded</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 pr-4"><code className="rounded bg-muted px-1.5 py-0.5 text-xs">ENCRYPTION_KEY</code></td>
                    <td className="py-3 text-muted-foreground">32-byte hex key for encrypting sensitive data</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="mt-10 text-lg font-semibold">Domain & URLs</h3>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3 text-left font-medium text-muted-foreground">Variable</th>
                    <th className="pb-3 text-left font-medium text-muted-foreground">Default</th>
                    <th className="pb-3 text-left font-medium text-muted-foreground">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="py-3 pr-4"><code className="rounded bg-muted px-1.5 py-0.5 text-xs">DOMAIN</code></td>
                    <td className="py-3 pr-4 text-muted-foreground"><code className="rounded bg-muted px-1.5 py-0.5 text-xs">localhost</code></td>
                    <td className="py-3 text-muted-foreground">Your domain — Caddy auto-provisions HTTPS via Let&apos;s Encrypt</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 pr-4"><code className="rounded bg-muted px-1.5 py-0.5 text-xs">WEB_URL</code></td>
                    <td className="py-3 pr-4 text-muted-foreground"><code className="rounded bg-muted px-1.5 py-0.5 text-xs">http://localhost</code></td>
                    <td className="py-3 text-muted-foreground">Public URL (used for email links, CORS)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="mt-10 text-lg font-semibold">Optional Integrations</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              All integrations gracefully degrade — SavSpot runs without any of them.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3 text-left font-medium text-muted-foreground">Integration</th>
                    <th className="pb-3 text-left font-medium text-muted-foreground">Variables</th>
                    <th className="pb-3 text-left font-medium text-muted-foreground">Without it</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="py-3 pr-4 font-medium">Email (Resend)</td>
                    <td className="py-3 pr-4"><code className="rounded bg-muted px-1.5 py-0.5 text-xs">RESEND_API_KEY</code></td>
                    <td className="py-3 text-muted-foreground">Emails logged to console</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 pr-4 font-medium">Payments (Stripe)</td>
                    <td className="py-3 pr-4"><code className="rounded bg-muted px-1.5 py-0.5 text-xs">STRIPE_SECRET_KEY</code></td>
                    <td className="py-3 text-muted-foreground">Payment features disabled</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 pr-4 font-medium">File Uploads (R2)</td>
                    <td className="py-3 pr-4"><code className="rounded bg-muted px-1.5 py-0.5 text-xs">R2_ACCOUNT_ID</code>, etc.</td>
                    <td className="py-3 text-muted-foreground">Upload endpoints return errors</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 pr-4 font-medium">Google OAuth</td>
                    <td className="py-3 pr-4"><code className="rounded bg-muted px-1.5 py-0.5 text-xs">GOOGLE_CLIENT_ID</code></td>
                    <td className="py-3 text-muted-foreground">Google login button hidden</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Architecture */}
        <section className="border-t py-16">
          <div className="mx-auto max-w-3xl px-4">
            <h2 className="text-2xl font-bold tracking-tight">Architecture</h2>
            <p className="mt-2 text-muted-foreground">
              Six services, one <code className="rounded bg-muted px-1.5 py-0.5 text-xs">docker compose</code> command.
            </p>
            <div className="mt-6">
              <CodeBlock>{`┌─────────────┐
│   Caddy      │  :80/:443 — auto HTTPS, reverse proxy
├─────────────┤
│   Web        │  :3000 — Next.js frontend (standalone)
│   API        │  :3001 — NestJS backend
│   Worker     │  BullMQ background jobs
├─────────────┤
│   PostgreSQL │  :5432 — data store with RLS
│   Redis      │  :6379 — cache + job queue
└─────────────┘`}</CodeBlock>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              <strong>Caddy</strong> routes <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/api/*</code> to the API and everything else to the Web frontend.
              It handles TLS certificates automatically when <code className="rounded bg-muted px-1.5 py-0.5 text-xs">DOMAIN</code> is set to a real domain.
            </p>
          </div>
        </section>

        {/* Common Operations */}
        <section className="border-t bg-muted/30 py-16">
          <div className="mx-auto max-w-3xl px-4">
            <h2 className="text-2xl font-bold tracking-tight">Common Operations</h2>

            <h3 className="mt-8 text-lg font-semibold">View logs</h3>
            <div className="mt-3">
              <CodeBlock title="terminal">{`$ docker compose -f docker-compose.prod.yml logs -f        # All services
$ docker compose -f docker-compose.prod.yml logs -f api     # API only
$ docker compose -f docker-compose.prod.yml logs -f web     # Web only`}</CodeBlock>
            </div>

            <h3 className="mt-8 text-lg font-semibold">Stop / Start</h3>
            <div className="mt-3">
              <CodeBlock title="terminal">{`$ docker compose -f docker-compose.prod.yml down            # Stop all
$ docker compose -f docker-compose.prod.yml up -d           # Start all`}</CodeBlock>
            </div>

            <h3 className="mt-8 text-lg font-semibold">Update to latest version</h3>
            <div className="mt-3">
              <CodeBlock title="terminal">{`$ git pull
$ docker compose -f docker-compose.prod.yml build
$ docker compose -f docker-compose.prod.yml up -d`}</CodeBlock>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Migrations run automatically on startup via the <code className="rounded bg-muted px-1.5 py-0.5 text-xs">migrate</code> service.
            </p>

            <h3 className="mt-8 text-lg font-semibold">Database backup & restore</h3>
            <div className="mt-3">
              <CodeBlock title="backup">{`$ docker compose -f docker-compose.prod.yml exec postgres \\
    pg_dump -U savspot savspot > backup-$(date +%Y%m%d).sql`}</CodeBlock>
            </div>
            <div className="mt-3">
              <CodeBlock title="restore">{`$ docker compose -f docker-compose.prod.yml exec -T postgres \\
    psql -U savspot savspot < backup-20260316.sql`}</CodeBlock>
            </div>
          </div>
        </section>

        {/* Custom Domain */}
        <section className="border-t py-16">
          <div className="mx-auto max-w-3xl px-4">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Custom Domain with HTTPS</h2>
                <p className="mt-2 text-muted-foreground">
                  Caddy automatically obtains and renews Let&apos;s Encrypt certificates — no manual TLS configuration needed.
                </p>
              </div>
            </div>
            <ol className="mt-6 list-inside list-decimal space-y-3 text-sm">
              <li>Point your domain&apos;s DNS A record to your server&apos;s IP address</li>
              <li>Set <code className="rounded bg-muted px-1.5 py-0.5 text-xs">DOMAIN=yourdomain.com</code> in <code className="rounded bg-muted px-1.5 py-0.5 text-xs">.env</code></li>
              <li>Set <code className="rounded bg-muted px-1.5 py-0.5 text-xs">WEB_URL=https://yourdomain.com</code> in <code className="rounded bg-muted px-1.5 py-0.5 text-xs">.env</code></li>
              <li>Restart: <code className="rounded bg-muted px-1.5 py-0.5 text-xs">docker compose -f docker-compose.prod.yml up -d</code></li>
            </ol>
          </div>
        </section>

        {/* Troubleshooting */}
        <section className="border-t bg-muted/30 py-16">
          <div className="mx-auto max-w-3xl px-4">
            <h2 className="text-2xl font-bold tracking-tight">Troubleshooting</h2>
            <div className="mt-6 space-y-6">
              <div className="rounded-xl border bg-card p-5 shadow-sm">
                <h3 className="font-semibold">Containers won&apos;t start</h3>
                <div className="mt-3">
                  <CodeBlock title="terminal">{`# Check logs for errors
$ docker compose -f docker-compose.prod.yml logs

# Common issue: port 80/443 already in use
$ sudo lsof -i :80
$ sudo lsof -i :443`}</CodeBlock>
                </div>
              </div>
              <div className="rounded-xl border bg-card p-5 shadow-sm">
                <h3 className="font-semibold">API health check failing</h3>
                <div className="mt-3">
                  <CodeBlock title="terminal">{`# Check if migrations ran successfully
$ docker compose -f docker-compose.prod.yml logs migrate

# Check API logs
$ docker compose -f docker-compose.prod.yml logs api`}</CodeBlock>
                </div>
              </div>
              <div className="rounded-xl border bg-card p-5 shadow-sm">
                <h3 className="font-semibold">Database connection errors</h3>
                <div className="mt-3">
                  <CodeBlock title="terminal">{`# Verify postgres is healthy
$ docker compose -f docker-compose.prod.yml exec postgres pg_isready

# Check the DATABASE_URL matches POSTGRES_USER/PASSWORD/DB in .env`}</CodeBlock>
                </div>
              </div>
              <div className="rounded-xl border bg-card p-5 shadow-sm">
                <h3 className="font-semibold">Web app showing blank page</h3>
                <div className="mt-3">
                  <CodeBlock title="terminal">{`# Check if NEXT_PUBLIC_API_URL is reachable from the web container
$ docker compose -f docker-compose.prod.yml exec web \\
    wget -q --spider http://api:3001/health`}</CodeBlock>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Hardware Recommendations */}
        <section className="border-t py-16">
          <div className="mx-auto max-w-3xl px-4">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <HardDrive className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Hardware Recommendations</h2>
                <p className="mt-2 text-muted-foreground">
                  Rough estimates. Actual requirements depend on booking volume and feature usage.
                </p>
              </div>
            </div>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3 text-left font-medium text-muted-foreground">Users</th>
                    <th className="pb-3 text-left font-medium text-muted-foreground">RAM</th>
                    <th className="pb-3 text-left font-medium text-muted-foreground">CPU</th>
                    <th className="pb-3 text-left font-medium text-muted-foreground">Disk</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="py-3 pr-4">1–50</td>
                    <td className="py-3 pr-4">2 GB</td>
                    <td className="py-3 pr-4">1 core</td>
                    <td className="py-3">10 GB</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 pr-4">50–500</td>
                    <td className="py-3 pr-4">4 GB</td>
                    <td className="py-3 pr-4">2 cores</td>
                    <td className="py-3">20 GB</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 pr-4">500+</td>
                    <td className="py-3 pr-4">8 GB+</td>
                    <td className="py-3 pr-4">4 cores</td>
                    <td className="py-3">50 GB+</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Enterprise Features */}
        <section className="border-t bg-muted/30 py-16">
          <div className="mx-auto max-w-3xl px-4">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Enterprise Features</h2>
                <p className="mt-2 text-muted-foreground">
                  Self-hosted users can unlock enterprise features (audit logging, workflows, contracts, multi-location, and more) by setting a license key:
                </p>
              </div>
            </div>
            <div className="mt-6">
              <CodeBlock title=".env">{`SAVSPOT_LICENSE_KEY=your-license-key-here`}</CodeBlock>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Without a license key, SavSpot runs with the full AGPL core — every essential feature for running a booking business, with no limits.
              Enterprise features are available on managed cloud plans or with a self-hosted license key.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="relative overflow-hidden border-t">
          <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80" />
          <div className="relative mx-auto max-w-2xl px-4 py-16 text-center sm:py-20">
            <h2 className="text-2xl font-bold tracking-tight text-primary-foreground sm:text-3xl">
              Ready to self-host?
            </h2>
            <p className="mt-3 text-primary-foreground/80">
              Clone the repo and run one command. Or try our managed cloud with a 14-day free trial.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href="https://github.com/stephendeslate/savspot"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center justify-center rounded-lg bg-accent px-8 text-base font-medium text-accent-foreground shadow-[0_0_24px_var(--glow-accent)] transition-all hover:shadow-[0_0_36px_var(--glow-accent)] hover:brightness-105"
              >
                <Github className="mr-2 h-5 w-5" />
                Clone on GitHub
              </a>
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-primary-foreground/20 px-8 text-base font-medium text-primary-foreground transition-colors hover:bg-primary-foreground/10"
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
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
