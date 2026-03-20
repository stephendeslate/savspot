<p align="center">
  <h1 align="center">SavSpot</h1>
  <p align="center">
    Open-source booking platform for service businesses
    <br />
    <a href="https://savspot.co/book/demo-barbershop">Live Demo</a> &middot; <a href="https://savspot.co">Cloud</a> &middot; <a href="docs/self-hosting.md">Self-Host</a> &middot; <a href="https://github.com/stephendeslate/savspot/issues">Issues</a>
  </p>
</p>

<p align="center">
  <a href="LICENSE"><img alt="AGPL v3" src="https://img.shields.io/badge/license-AGPL--3.0-blue.svg" /></a>
  <a href="https://github.com/stephendeslate/savspot/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/stephendeslate/savspot/actions/workflows/ci.yml/badge.svg" /></a>
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.9-blue.svg" />
  <img alt="Node" src="https://img.shields.io/badge/Node-22-green.svg" />
</p>

---

SavSpot is a multi-tenant booking platform built for salons, barbershops, studios, fitness centers, and other service businesses. It handles the full booking lifecycle — from public booking pages to payment processing, calendar management, and client communications.

Self-host it with Docker or use the managed cloud at [savspot.co](https://savspot.co).

## Features

### Booking & Scheduling

- Multi-step booking flow with service selection, provider choice, date/time picker, and checkout
- Public booking pages (`/book/your-business`) with SEO and structured data
- Calendar view with drag-and-drop, day/week/month views
- Google Calendar sync (bidirectional)
- Availability management with business hours, breaks, and blocked dates
- Service addons, group bookings, and buffer times
- Embeddable booking widget for external websites

### Business Management

- Multi-tenant architecture — each business gets isolated data via PostgreSQL Row-Level Security
- Team management with role-based access (Owner, Admin, Staff)
- Client database with booking history, notes, and portal access
- Service categories, tax rates, and discount codes
- Invoicing and quotes
- Contract management
- File uploads (Cloudflare R2)
- Onboarding tours for new businesses
- Business gallery and review management

### Payments

- Stripe Connect Express with destination charges
- Platform fee management
- Refunds and partial refunds
- Payment history and reporting
- Subscription billing

### Communications

- Email notifications via Resend (booking confirmations, reminders, cancellations)
- SMS notifications via Twilio
- Web push and mobile push notifications (Expo)
- In-app notification center
- Workflow automation (email, SMS, push, webhooks)

### Analytics & Reporting

- Revenue, bookings, and client metrics
- Booking funnel conversion tracking
- Platform-wide metrics for admins
- CSV/JSON data export

### Public API

- RESTful API v1 with API key authentication
- Scoped access control and IP allowlisting
- Rate limiting per route
- OpenAPI spec included (`docs/openapi.json`)
- Interactive API reference via Scalar

### AI & Integrations

- MCP (Model Context Protocol) server for AI agent integration
- AI-powered support ticket triage
- AI service recommendations (Enterprise)
- AI voice receptionist (Enterprise)

### Self-Hosting

- One-command Docker setup
- Automatic HTTPS via Caddy
- PostgreSQL + Redis included
- All integrations gracefully degrade when unconfigured

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **API** | NestJS 11, TypeScript, Prisma 6, Passport (JWT + OAuth) |
| **Web** | Next.js 15 (App Router), React 19, Tailwind CSS 4, Radix UI |
| **Mobile** | Expo 52, React Native, Expo Router |
| **UI Library** | Custom component library (Radix + Tailwind + CVA), Storybook |
| **Database** | PostgreSQL 16 with Row-Level Security |
| **Cache/Queue** | Redis 7, BullMQ |
| **Payments** | Stripe Connect |
| **Email** | Resend |
| **SMS** | Twilio |
| **Storage** | Cloudflare R2 (S3-compatible) |
| **Push** | Web Push (VAPID), Expo Push |
| **Calendar** | Google Calendar API |
| **Monitoring** | Sentry, PostHog |
| **Webhooks** | Svix |
| **Proxy** | Caddy (auto HTTPS via Let's Encrypt) |
| **Monorepo** | Turborepo, pnpm workspaces |
| **Testing** | Vitest, Playwright, Testing Library |
| **i18n** | next-intl |

## Quick Start (Self-Hosted)

```bash
git clone https://github.com/stephendeslate/savspot.git
cd savspot
./scripts/install.sh
```

The install script will:
1. Check prerequisites (Docker, Git, OpenSSL)
2. Generate environment variables from the production template
3. Create a random PostgreSQL password
4. Generate JWT keys and an encryption key
5. Build and start all containers
6. Wait for health checks to pass

SavSpot will be available at `http://localhost` (or your configured domain with automatic HTTPS).

See [docs/self-hosting.md](docs/self-hosting.md) for configuration, custom domains, backups, and troubleshooting.

### Hardware Recommendations

| Users | RAM | CPU |
|-------|-----|-----|
| 1–50 | 2 GB | 1 core |
| 50–200 | 4 GB | 2 cores |
| 200–500 | 4 GB | 2 cores |
| 500+ | 8 GB+ | 4 cores |

## Development

### Prerequisites

- Node.js 22+ (see `.nvmrc`)
- pnpm 10.30+
- Docker and Docker Compose

### Setup

```bash
# Start database and Redis
pnpm docker:up

# Install dependencies
pnpm install

# Generate Prisma client and run migrations
pnpm db:generate
pnpm db:migrate:dev

# Seed demo data
pnpm db:seed

# Start all dev servers
pnpm dev
```

| Service | URL |
|---------|-----|
| Web app | `http://localhost:3000` |
| API | `http://localhost:3001` |
| API docs | `http://localhost:3001/reference` |
| Prisma Studio | `pnpm db:studio` |
| Storybook | `cd packages/ui && pnpm storybook` |

### Common Commands

```bash
pnpm dev                  # Start all dev servers (Turborepo)
pnpm build                # Build all packages
pnpm lint                 # Lint all packages
pnpm typecheck            # Type-check all packages
pnpm test                 # Run all tests
pnpm format               # Format code with Prettier
pnpm format:check         # Check formatting

# Database
pnpm db:generate          # Generate Prisma client
pnpm db:migrate:dev       # Create and apply migrations
pnpm db:migrate:deploy    # Apply migrations (production)
pnpm db:seed              # Seed demo data
pnpm db:studio            # Open Prisma Studio

# Docker
pnpm docker:up            # Start PostgreSQL and Redis
pnpm docker:down          # Stop containers

# Admin CLI
pnpm admin:list-tenants       # List all tenants
pnpm admin:revenue-summary    # Revenue report
pnpm admin:manage-roles       # Manage user roles
pnpm admin:suspend-tenant     # Suspend a tenant
pnpm admin:platform-config    # View/edit platform config
pnpm admin:import-clients     # Bulk import clients
pnpm admin:import-services    # Bulk import services
pnpm admin:import-appointments # Bulk import appointments
pnpm admin:dead-letter        # Inspect failed jobs
pnpm admin:feedback           # View user feedback
pnpm admin:reset-demo         # Reset demo tenant data
```

### Environment Variables

Copy `.env.example` to `.env` for development. All integrations are optional and gracefully degrade when unconfigured:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `JWT_ACCESS_SECRET` | Yes | JWT signing key (auto-generated in dev) |
| `JWT_REFRESH_SECRET` | Yes | JWT refresh key (auto-generated in dev) |
| `ENCRYPTION_KEY` | Yes | 32-byte hex key for encrypting sensitive data |
| `RESEND_API_KEY` | No | Resend API key for email |
| `STRIPE_SECRET_KEY` | No | Stripe secret key for payments |
| `STRIPE_WEBHOOK_SECRET` | No | Stripe webhook signing secret |
| `R2_ACCESS_KEY_ID` | No | Cloudflare R2 access key for file uploads |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `TWILIO_ACCOUNT_SID` | No | Twilio account SID for SMS |
| `GOOGLE_CALENDAR_CLIENT_ID` | No | Google Calendar OAuth for sync |
| `VAPID_PUBLIC_KEY` | No | VAPID key for web push notifications |

See `.env.example` for the full list.

## Project Structure

```
savspot/
├── apps/
│   ├── api/                 # NestJS backend (REST API, BullMQ workers)
│   │   └── src/
│   │       ├── auth/        # Authentication (JWT, OAuth, Apple Sign-In)
│   │       ├── bookings/    # Booking CRUD and management
│   │       ├── booking-flow/ # Multi-step public booking flow
│   │       ├── payments/    # Stripe Connect integration
│   │       ├── services/    # Service management
│   │       ├── team/        # Team and role management
│   │       ├── clients/     # Client database
│   │       ├── availability/ # Schedule and availability rules
│   │       ├── calendar/    # Google Calendar sync
│   │       ├── analytics/   # Reporting and metrics
│   │       ├── communications/ # Email, SMS, push orchestration
│   │       ├── invoices/    # Invoice generation (PDF)
│   │       ├── public-api/  # External API v1
│   │       ├── support/     # Support ticket system
│   │       └── ...          # 50+ modules
│   ├── web/                 # Next.js frontend (App Router, SSR)
│   │   └── src/app/
│   │       ├── (auth)/      # Login, register, password reset
│   │       ├── (dashboard)/ # Business dashboard
│   │       ├── book/        # Public booking pages
│   │       ├── (portal)/    # Client portal
│   │       ├── onboarding/  # Business onboarding flow
│   │       ├── directory/   # Business directory
│   │       └── embed/       # Embeddable booking widget host
│   └── mobile/              # Expo / React Native app
├── packages/
│   ├── shared/              # Shared types, enums, validation schemas (Zod)
│   ├── ui/                  # UI component library (Radix + Tailwind + Storybook)
│   ├── embed-widget/        # Embeddable booking widget (Vite)
│   ├── mcp-server/          # Model Context Protocol server for AI agents
│   └── ee/                  # Enterprise Edition (commercial license)
├── prisma/                  # Database schema, migrations, seed data
├── docker/                  # Docker configs (Caddy, PostgreSQL init)
├── docs/                    # Documentation, ADRs, OpenAPI spec
│   ├── adr/                 # Architecture Decision Records
│   ├── help-center/         # In-app help articles
│   ├── openapi.json         # OpenAPI specification
│   └── self-hosting.md      # Self-hosting guide
├── scripts/                 # Dev, deployment, and admin scripts
├── config/                  # Shared configuration
├── docker-compose.yml       # Development (PostgreSQL + Redis)
└── docker-compose.prod.yml  # Production (full stack with Caddy)
```

## Production Architecture

```
                    ┌─────────────────┐
                    │     Caddy       │
                    │  :80 / :443     │
                    │  (auto HTTPS)   │
                    └────────┬────────┘
                             │
                 ┌───────────┴───────────┐
                 │                       │
          ┌──────┴──────┐         ┌──────┴──────┐
          │   Next.js   │         │   NestJS    │
          │    :3000    │         │    :3001    │
          │    (web)    │────────▶│    (api)    │
          └─────────────┘         └──────┬──────┘
                                         │
                              ┌──────────┼──────────┐
                              │          │          │
                       ┌──────┴───┐ ┌────┴────┐ ┌───┴──────┐
                       │PostgreSQL│ │  Redis  │ │  Worker  │
                       │  :5432   │ │  :6379  │ │ (BullMQ) │
                       │  (RLS)   │ │         │ │          │
                       └──────────┘ └─────────┘ └──────────┘
```

The production Docker Compose includes six services: **Caddy** (reverse proxy with automatic Let's Encrypt HTTPS), **Web** (Next.js standalone), **API** (NestJS), **Worker** (BullMQ background jobs), **PostgreSQL**, and **Redis**. Migrations run automatically on startup.

## Enterprise Edition

SavSpot follows an open-core model. The core platform is fully open source under AGPL-3.0. Enterprise features are available in `packages/ee/` under a commercial license.

### Enterprise Features

- **Audit Logging** — Full audit trail for compliance
- **Workflow Automation** — Automated email, SMS, push, and webhook sequences
- **Digital Contracts** — Send and track contracts with e-signatures
- **Quotes** — Create and send quotes to clients
- **Custom Domains** — Use your own domain for booking pages
- **Multi-Location** — Manage multiple business locations
- **Partner Programs** — Referral and partner management
- **AI Recommendations** — Smart service and time suggestions
- **AI Voice Receptionist** — Automated phone booking
- **Accounting Integrations** — Connect to accounting software
- **Directory Listing** — Enhanced visibility in the SavSpot directory
- **Platform Admin** — Advanced platform-wide administration
- **AI Operations** — AI-powered business insights
- **Public API** — Advanced API access with higher rate limits

### Licensing

| | Self-Hosted (Core) | Self-Hosted (Enterprise) | Cloud |
|---|---|---|---|
| **Core features** | All included | All included | All included |
| **Enterprise features** | — | License key required | Included |
| **Cost** | Free | Contact us | Subscription |
| **License** | AGPL-3.0 | Commercial | Commercial |

Enterprise features are gated by `SAVSPOT_LICENSE_KEY` environment variable or per-tenant database key. See [packages/ee/README.md](packages/ee/README.md) for details.

## MCP Server

SavSpot includes a Model Context Protocol server (`packages/mcp-server/`) that enables AI agents to manage bookings, services, and clients programmatically. Install it as an MCP tool in compatible AI clients:

```bash
npx @savspot/mcp-server
```

## Security

We take security seriously. If you discover a vulnerability, please report it responsibly.

- **Email**: security@savspot.co
- **Response time**: 48-hour acknowledgment, 5 business day assessment
- **Scope**: Auth bypasses, injection attacks, RLS tenant isolation, payment vulnerabilities, sensitive data exposure
- **Policy**: Coordinated disclosure with credits

See [SECURITY.md](SECURITY.md) for full details.

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

```bash
# Quick start
git clone https://github.com/stephendeslate/savspot.git
cd savspot
pnpm docker:up && pnpm install && pnpm db:generate && pnpm db:migrate:dev && pnpm db:seed && pnpm dev
```

**Key guidelines:**
- Branch naming: `feature/*`, `fix/*`, `chore/*`
- [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `chore:`
- DCO sign-off required: `git commit -s`
- All PRs must pass `pnpm lint`, `pnpm typecheck`, and `pnpm test`
- `packages/ee/` is not open for community contributions

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for our community standards.

## License

The core SavSpot platform is licensed under the [GNU Affero General Public License v3.0](LICENSE). You can use, modify, and distribute the software freely. If you run a modified version as a network service, you must make the source code available to your users.

The Enterprise Edition (`packages/ee/`) is licensed under a separate [commercial license](packages/ee/LICENSE).

---

Built by [SJD Labs, LLC](https://savspot.co)
