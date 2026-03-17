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

**Booking & Scheduling**
- Multi-step booking flow with service selection, provider choice, date/time picker, and checkout
- Public booking pages (`/book/your-business`) with SEO and structured data
- Calendar view with drag-and-drop, day/week/month views
- Google Calendar sync (bidirectional)
- Availability management with business hours, breaks, and blocked dates
- Service addons, group bookings, and buffer times

**Business Management**
- Multi-tenant architecture — each business gets isolated data via PostgreSQL RLS
- Team management with role-based access (Owner, Admin, Staff)
- Client database with booking history and notes
- Service categories, tax rates, and discount codes
- Invoicing and quotes
- Contract management
- File uploads (Cloudflare R2)

**Payments**
- Stripe Connect Express with destination charges
- Platform fee management
- Refunds and partial refunds
- Payment history and reporting

**Communications**
- Email notifications (booking confirmations, reminders, cancellations)
- Web push notifications
- In-app notification center
- Workflow automation (email, SMS, push, webhooks)

**Analytics**
- Revenue, bookings, and client metrics
- Booking funnel conversion tracking
- CSV/JSON data export

**Public API**
- RESTful API v1 with API key authentication
- Scoped access control and IP allowlisting
- Rate limiting per route

**Self-Hosting**
- One-command Docker setup
- Automatic HTTPS via Caddy
- PostgreSQL + Redis included
- All integrations gracefully degrade when unconfigured

## Tech Stack

| Layer | Technology |
|-------|-----------|
| API | NestJS 11, TypeScript, Prisma 6 |
| Web | Next.js 15 (App Router), React 19, Tailwind CSS 4 |
| Database | PostgreSQL 16 with Row-Level Security |
| Cache/Queue | Redis 7, BullMQ |
| Payments | Stripe Connect |
| Email | Resend |
| Storage | Cloudflare R2 |
| Proxy | Caddy (auto HTTPS) |
| Monorepo | Turborepo, pnpm workspaces |

## Quick Start (Self-Hosted)

```bash
git clone https://github.com/stephendeslate/savspot.git
cd savspot
./scripts/install.sh
```

This builds all containers, runs migrations, generates keys, and starts the full stack. SavSpot will be available at `http://localhost`.

See [docs/self-hosting.md](docs/self-hosting.md) for configuration, custom domains, and troubleshooting.

## Development

```bash
# Prerequisites: Node 22, pnpm 10.30+, Docker

# Start database and Redis
pnpm docker:up

# Install dependencies
pnpm install

# Generate Prisma client and run migrations
pnpm db:generate
pnpm db:migrate:dev

# Seed demo data
pnpm db:seed

# Start dev servers
pnpm dev
```

API: `http://localhost:3001` | Web: `http://localhost:3000`

## Project Structure

```
savspot/
  apps/
    api/             NestJS backend (REST API, BullMQ workers)
    web/             Next.js frontend (App Router, SSR)
  packages/
    shared/          Shared types, enums, validation schemas
    ui/              UI component library (Radix + Tailwind)
    embed-widget/    Embeddable booking widget
    mcp-server/      Model Context Protocol server
  prisma/            Schema, migrations, seed data
  docker/            Docker configs (Caddy, PostgreSQL init)
  docs/              Documentation
  specs/             Product specifications
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

SavSpot is licensed under the [GNU Affero General Public License v3.0](LICENSE).

This means you can use, modify, and distribute the software freely. If you run a modified version as a network service, you must make the source code available to your users.

For commercial use without AGPL obligations, contact us about the Pro License.

---

Built by [SD Solutions, LLC](https://savspot.co)
