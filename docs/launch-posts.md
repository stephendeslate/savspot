# Community Launch Posts

Ready-to-post drafts for SavSpot open-source launch. Edit to match your voice before posting.

---

## 1. Hacker News (Show HN)

**Title:** Show HN: SavSpot - Open-source booking platform for service businesses (self-hostable)

**Body:**

Hey HN,

I built SavSpot, an open-source booking platform for service businesses — salons, studios, fitness centers, consultants, etc.

**What it does:**
- Multi-step booking flow with public booking pages
- Stripe Connect payments (deposits, full payment, invoicing)
- Google Calendar two-way sync
- Client CRM with booking history
- Email/SMS notifications and workflow automation
- AI agent discoverability via MCP (so AI assistants can book appointments)
- Multi-tenant with PostgreSQL Row-Level Security

**Tech stack:** NestJS 11, Next.js 15 (App Router), Prisma 6, PostgreSQL 16, Redis/BullMQ, TypeScript throughout.

**Self-hosting:** One-command Docker setup with Caddy (auto HTTPS), PostgreSQL, and Redis included. `git clone && ./scripts/install.sh` gets you running.

I originally built this as a custom solution for a client who ended up not needing it. Rather than let it rot, I decided to open-source it and build a managed cloud service alongside.

The codebase is AGPL v3 — you can run it commercially, modify it, whatever you want. The managed cloud at savspot.co has a free tier (1% transaction fee) and a Pro tier ($10/mo).

Looking for feedback on the architecture, the self-hosting experience, and whether the feature set actually matches what service businesses need. Happy to answer questions about the RLS multi-tenancy setup or anything else.

GitHub: https://github.com/stephendeslate/savspot
Self-hosting docs: https://github.com/stephendeslate/savspot/blob/main/docs/self-hosting.md
Live demo: https://savspot.co/book/demo-barbershop

---

## 2. r/selfhosted

**Title:** SavSpot - Open-source booking platform for service businesses (Docker, AGPL v3)

**Body:**

I've been building a booking platform for service businesses and just open-sourced it under AGPL v3.

**Quick setup:**
```bash
git clone https://github.com/stephendeslate/savspot.git
cd savspot
./scripts/install.sh
```

This pulls Docker images, generates keys, runs migrations, and starts everything. You get:

- **PostgreSQL 16** with Row-Level Security for multi-tenancy
- **Redis 7** for caching and job queues (BullMQ)
- **Caddy** reverse proxy with automatic HTTPS
- **NestJS API** + **Next.js frontend** + **Background workers**

**Features:**
- Online booking pages for your business (`yourdomain.com/book/your-business`)
- Stripe payments (bring your own Stripe account — no platform fees)
- Google Calendar sync (bidirectional)
- Client management / CRM
- Email notifications and reminders
- Walk-in bookings, service addons, buffer times
- Invoice generation
- Data export (GDPR-compliant)
- AI agent discoverability (MCP server included)

**Requirements:** Docker, 1 CPU core, 1GB RAM minimum. Runs great on a $5/mo VPS.

**No telemetry, no phoning home.** Your data stays on your server.

There's also a managed cloud at savspot.co if you don't want to self-host, but the self-hosted version has zero artificial limitations.

GitHub: https://github.com/stephendeslate/savspot
Docs: https://github.com/stephendeslate/savspot/blob/main/docs/self-hosting.md
Live demo: https://savspot.co/book/demo-barbershop

Happy to answer questions or take feature requests!

---

## 3. r/opensource

**Title:** I open-sourced my booking platform for service businesses — SavSpot (AGPL v3, TypeScript, Docker)

**Body:**

After building a booking platform as a custom project, I decided to open-source it rather than let the code go to waste.

**SavSpot** is a multi-tenant booking platform built for salons, studios, gyms, consultants — any service-based business that takes appointments.

**Why AGPL v3?**
I wanted the code to stay open. AGPL ensures that if someone takes the code and runs it as a service, they need to share their modifications. But you're free to self-host it commercially for your own business with no restrictions.

**Tech stack:**
- Monorepo (Turborepo + pnpm workspaces)
- API: NestJS 11, Prisma 6, PostgreSQL 16 (with RLS), BullMQ
- Frontend: Next.js 15 (App Router), React 19, Tailwind CSS 4
- Infrastructure: Docker, Caddy (auto HTTPS)

**What I'd love feedback on:**
- Is the self-hosting setup smooth enough? (`git clone && ./scripts/install.sh`)
- What features are missing for your use case?
- Code quality — PRs and issues welcome

The project includes a CONTRIBUTING.md with dev setup instructions if you want to hack on it.

GitHub: https://github.com/stephendeslate/savspot
Self-hosting guide: https://github.com/stephendeslate/savspot/blob/main/docs/self-hosting.md
Live demo: https://savspot.co/book/demo-barbershop

---

## Posting Notes

**Order:** Post to r/selfhosted first (most aligned audience), then r/opensource, then HN (Show HN on a weekday morning US time for best visibility).

**Timing:** Weekday, 9-11am ET for HN. Reddit posts do well in the morning too.

**Engagement:** Reply to every comment in the first few hours. Be genuine, not salesy. Acknowledge limitations honestly.

**Don't:**
- Link to the cloud product more than once
- Use marketing language ("revolutionary", "game-changing")
- Argue with critics — thank them for feedback
- Post to all three on the same day (space them 1-2 days apart)
