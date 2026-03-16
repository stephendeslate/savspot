# SavSpot Pivot — Implementation Plan

**Version:** 1.0 | **Date:** March 16, 2026 | **Author:** SD Solutions, LLC
**Status:** Draft — Pending Approval

---

## 1. Strategic Context

### Why This Pivot

SavSpot is a production-grade multi-tenant SaaS booking platform. Phases 1–3 are code-complete with 920+ tests, deployed to savspot.co (Fly.io + Vercel), and architecturally sound. However:

- The service-business booking market is consolidating around well-funded incumbents (Fresha: $292M raised, Vagaro: $63M + Schedulicity acquisition, Booksy: $100M+).
- Person-to-person marketing is not feasible at this time.
- 92% of SaaS startups die within 3 years; 70% of micro-SaaS never break $1K/month.
- The founder is a UCSD CompEng 2023 grad with strong technical skills but no traditional work experience, making income generation a priority alongside product work.

### Why This Approach Wins

There is **no open-source multi-tenant service-business booking platform**. The awesome-selfhosted booking category has Cal.com (meeting scheduling), Easy!Appointments (single-tenant), QloApps (hotels) — none serve the Fresha/Vagaro/Booksy niche. SavSpot would be the first.

The open-source SaaS model is proven by solo devs and small teams:
- **Postiz** (solo dev): $14K/month, open-source social media scheduler
- **Plausible** (bootstrapped, no VC): $3.1M revenue in 2024, AGPL, zero ad spend
- **Cal.com**: $5.1M revenue in 2024, AGPL, 40.6K GitHub stars

The self-hosted community (r/selfhosted, awesome-selfhosted, Docker Hub, Hacker News) is an async, high-reach distribution channel that requires zero person-to-person interaction.

### What SavSpot Becomes

A four-leg business model:

| Leg | What | Revenue | Timeline |
|-----|------|---------|----------|
| **1. Open Source** | AGPL-licensed, Docker-first self-hosting | Distribution + credibility (enables legs 2–3) | Launch in ~2 weeks |
| **2. Managed Cloud** | savspot.co — hosted multi-tenant platform | MRR: $39–99/month per tenant | 3–6 months to first paying customers |
| **3. Pro License** | Commercial license + priority support for self-hosters | One-time: $399–499 | Available at launch |
| **4. Freelance/Consulting** | Upwork + technical writing using SavSpot as credential | Hourly: $30–150/hr + $200–500/article | Parallel track, starts immediately |

---

## 2. Licensing Strategy

### License: AGPL v3

**Why AGPL over alternatives:**

| License | OSI-Approved | Prevents Cloud Cloning | awesome-selfhosted Eligible | Used By |
|---------|-------------|----------------------|---------------------------|---------|
| **AGPL v3** | Yes | Yes (network use triggers copyleft) | Yes | Cal.com, Lago, Plausible |
| BSL | No | Yes (explicit production restriction) | No — rejected as non-FOSS | MariaDB, HashiCorp |
| SSPL | No | Yes (strongest protection) | No | MongoDB only |
| ELv2 | No | Yes | No | Elastic (added AGPL back in 2024) |

AGPL is the only option that provides cloud-hosting protection AND qualifies as genuine open source for community credibility.

### Contributor License Agreement (CLA)

Pair AGPL with a CLA so the project retains the right to:
- Offer commercial/enterprise licenses to organizations that cannot use AGPL code
- Dual-license if needed in the future
- Keep the Pro License offering legally clean

Use a lightweight CLA (similar to Cal.com's) — contributors grant license to the project, project stays AGPL.

### Pro License

A separate commercial license for:
- Agencies who want to white-label without AGPL obligations
- Businesses that want self-hosting with priority support and SLA
- Priced at $399–499 one-time, or $99/month for ongoing support

This is additive — the AGPL version remains fully functional. The Pro License is a convenience + legal clarity offering.

---

## 3. Technical Implementation

### Phase A: Self-Hosting Infrastructure (Week 1–2)

**Goal:** `docker compose up` gives you a fully running SavSpot instance.

#### A1. Web App Dockerfile

Create `apps/web/Dockerfile` — multi-stage build with `output: 'standalone'` in next.config.ts.

```
Stage 1: deps (install pnpm + node_modules)
Stage 2: builder (build Next.js with standalone output)
Stage 3: runner (Node 22 Alpine, non-root, copy standalone + static + public)
```

**Changes:**
- New file: `apps/web/Dockerfile` (~45 lines)
- Edit: `apps/web/next.config.ts` — add `output: 'standalone'`
- New file: `apps/web/.dockerignore`

#### A2. Production Docker Compose

Create `docker-compose.prod.yml` with all services:

```yaml
services:
  postgres:    # PostgreSQL 16 + init.sql for extensions/RLS role
  redis:       # Redis 7
  migrate:     # One-shot: runs prisma migrate deploy, then exits
  api:         # NestJS API (depends on migrate)
  worker:      # BullMQ worker (depends on migrate)
  web:         # Next.js frontend (depends on api)
  caddy:       # Reverse proxy with automatic HTTPS
```

**Key decisions:**
- Migration runs as a one-shot service (`restart: on-failure`, exits 0 on success) that api/worker depend on via `service_completed_successfully`
- Caddy for automatic HTTPS (simpler than nginx/traefik for self-hosters)
- Single `.env` file drives all services
- Health checks on all services
- Named volumes for postgres data and redis data

**Changes:**
- New file: `docker-compose.prod.yml`
- New file: `docker/caddy/Caddyfile`
- New file: `scripts/migrate-and-seed.sh` (migration entrypoint)

#### A3. Environment Configuration

Create `.env.production.example` with:
- Clear grouping: Required / Optional (gracefully degraded)
- Inline comments explaining each variable
- Auto-generation script for JWT keys and encryption key

**Changes:**
- New file: `.env.production.example`
- New file: `scripts/generate-keys.sh` (generates JWT RS256 pair + encryption key)
- New file: `scripts/install.sh` (one-liner: generates `.env`, runs `docker compose up`)

#### A4. Documentation for Self-Hosters

Create `docs/self-hosting.md`:
- Prerequisites (Docker, 2GB RAM, domain name)
- Quick start (3 commands)
- Environment variable reference
- Updating (pull + restart)
- Backup and restore (pg_dump/pg_restore commands)
- Reverse proxy configuration (Caddy included, nginx/traefik examples)
- Troubleshooting FAQ

**Changes:**
- New file: `docs/self-hosting.md`

---

### Phase B: Repository Preparation (Week 2)

**Goal:** The GitHub repo is ready for public consumption.

#### B1. README Overhaul

Replace the current README with an open-source project README:
- Hero screenshot/GIF of the booking page and dashboard
- "What is SavSpot?" — one paragraph
- Feature list with checkmarks
- Quick start (self-hosted Docker)
- Cloud option (savspot.co)
- Tech stack badges
- Contributing guide link
- License (AGPL v3)
- Star history badge, GitHub Actions CI badge

#### B2. Repository Hygiene

- Audit `.gitignore` — ensure no secrets, credentials, or personal config leak
- Audit git history — check for any committed secrets (use `git log --all -p | grep -i "secret\|password\|key=" | head -50`)
- Remove or genericize any hardcoded references to personal infrastructure (Fly.io app names, Vercel project IDs, etc.)
- Add `LICENSE` file (AGPL v3 full text)
- Add `CONTRIBUTING.md` (code style, PR process, CLA reference)
- Add `SECURITY.md` (responsible disclosure process)
- Add `CODE_OF_CONDUCT.md`

#### B3. Demo Instance

Set up a read-only demo at `demo.savspot.co` or a pre-populated booking page at `savspot.co/book/demo-barbershop`:
- Pre-seeded tenant with realistic data (services, availability, reviews)
- Stripe in test mode (visitors can go through the flow without real charges)
- Reset on a schedule (daily cron wipes and re-seeds)
- This is the single most important conversion tool for community posts

#### B4. CI/CD for Open Source

Update GitHub Actions workflows:
- CI runs on PRs from forks (not just internal branches)
- Remove deploy workflows from the public repo (keep deploy config private or in a separate branch)
- Add Docker image build + push to GitHub Container Registry (ghcr.io) on tagged releases
- Ensure CI works without any secrets (mocked/skipped for external PRs)

---

### Phase C: Launch Preparation (Week 3)

**Goal:** Everything needed for the community launch is ready.

#### C1. Landing Page Updates

Update savspot.co to reflect the new positioning:
- Add "Open Source" badge/section to the hero
- Add "Self-Host" option alongside "Get Started Free" CTA
- Link to GitHub repo prominently
- Add "Star on GitHub" social proof element
- Keep the existing cloud signup flow — this is still the primary conversion path

#### C2. Pricing Page

Create/update pricing to show:

| | Self-Hosted | Cloud Free | Cloud Pro |
|---|---|---|---|
| Price | Free (AGPL) | $0/month | $39–99/month |
| Hosting | You manage | savspot.co | savspot.co |
| Support | Community (GitHub Issues) | Community | Priority email + SLA |
| Updates | Manual pull | Automatic | Automatic |
| Branding | Your own | SavSpot badge | White-label |

Pro License ($399–499 one-time): Commercial license + 1 year priority support.

#### C3. Community Launch Assets

Prepare posts for (write all drafts before posting any):

1. **Hacker News** — "Show HN: SavSpot — Open-source booking platform for service businesses"
   - Focus: technical architecture, why open-source, what makes it different from Cal.com
   - Tone: factual, humble, technical

2. **r/selfhosted** — "I built an open-source alternative to Fresha/Booksy for service businesses"
   - Focus: Docker setup, what it does, screenshots, demo link
   - Tone: community-first, self-hosting friendly

3. **r/opensource** — Similar framing to r/selfhosted

4. **awesome-selfhosted** — Submit PR to add SavSpot under Booking and Scheduling
   - **Important:** Requires the project to have been first released 4+ months ago. Cannot submit at launch.
   - Target submission: ~Month 5 (August 2026)
   - Requirements: FOSS license (AGPL qualifies), active maintenance, working Docker setup
   - Review by a single maintainer (nodiscc) — expect 2–6 week wait after submission

5. **Product Hunt** — Save for after GitHub reaches 50+ stars and you have a polished demo. Likely Month 3–4 at earliest.

6. **Industry-specific subreddits** (r/barbers, r/salonowners, r/personaltrainers, r/yoga) — post only AFTER the technical community launch validates the product. These audiences want a working tool, not a GitHub repo. Likely Month 2–3.

---

### Phase D: Freelance/Consulting Track (Parallel, Starts Week 1)

**Goal:** Generate income while the open-source project grows.

#### D1. Upwork Profile Setup

- Profile headline: "NestJS + Next.js Developer | Multi-Tenant SaaS Architect"
- Portfolio: link to savspot.co, GitHub repo, specific technical achievements
- Niche: multi-tenant SaaS, Stripe Connect integrations, NestJS/Prisma architecture
- **Starting rate: $20–30/hr** — this is the uncomfortable reality with 0 reviews. You're competing against developers in lower-cost regions who already have reviews. Undercharging for the first 3–5 jobs is the standard advice to build credibility.
- After 5+ reviews and Rising Talent badge: raise to $40–60/hr
- After 10+ reviews and 90%+ JSS: raise to $60–80/hr
- Proposal strategy: respond within 30 minutes of posting (2.3x higher success rate), reference SavSpot as proof of capability
- **Budget for Connects:** Each proposal costs 2–16 Connects ($0.30–$2.40 per bid). Budget $50–100 for the first 2 months of proposals that may yield nothing.
- **Expect 50–100 proposals before first hire.** This is normal, not a sign of failure.
- **First job will likely be small:** $50–300 fixed-price or a few hours of hourly work. Take it. The review matters more than the money.
- **The grind timeline:** Months 1–3 are about surviving the credibility gap. Months 4–6 are when repeat clients and inbound invites start replacing cold proposals.

#### D2. Technical Writing

**Phase 1 — Portfolio Building (Weeks 1–4, $0 income):**

You cannot pitch paid platforms with zero published work. Every platform requires writing samples. The path:

1. Set up a DEV.to or Hashnode account (zero friction, instant audience)
2. Publish 3–5 free articles derived from SavSpot:
   - "Multi-Tenant Row-Level Security with Prisma and PostgreSQL"
   - "Stripe Connect Express: Destination Charges for Marketplace Platforms"
   - "BullMQ Dispatcher Pattern: One Worker Per Queue in NestJS"
   - "Building a Dynamic Booking Flow Engine with NestJS"
3. Each article takes 8–15 hours (research, working code examples, writing, proofreading). Budget 2 articles/month alongside other work.

**Phase 2 — Pitching Paid Platforms (Weeks 5–8):**

With 3+ published articles as portfolio, pitch to platforms that are confirmed open in 2026:
- **Smashing Magazine** ($200–500/article) — explicitly accepts first-timers, pitch an outline
- **Draft.dev** ($300+/article) — agency model, they assign topics from clients
- **Auth0/Okta** (~$450/article) — submit via email with topic ideas
- **Fauna** (up to $700/article) — submit proposal
- **Vultr** ($800/article) — highest pay, cloud/DevOps focus
- **Appsmith** ($200–400/article) — low-code tutorials

**Note:** LogRocket is currently NOT accepting new writers. DigitalOcean's program is paused. Many lists online are outdated — verify before pitching.

Full verified list: github.com/malgamves/CommunityWriterPrograms

**Phase 3 — Steady Output (Month 3+):**

- Target 1–2 paid articles/month (realistic alongside Upwork and open-source work)
- 2–4/month is a full-time writing commitment and unlikely when starting out
- Expect 4–8 weeks from first pitch to first payment (editorial review + revision cycles)
- Realistic income: $0 month 1, $0–300 month 2, $300–700 month 3, $400–800/month by month 4–6

Each article serves double duty: income + content marketing for SavSpot.

#### D3. LinkedIn Technical Content

Post 3–5x/week — not "build in public" fluff, but genuine technical insights:
- Architecture decisions and trade-offs from SavSpot
- Lessons learned (BullMQ one-worker-per-queue, Prisma RLS gotchas)
- This builds the referral network needed for job opportunities (cold applications have <2% success rate)

---

## 4. What NOT to Build

Explicitly out of scope for this pivot:

- **Phase 4 features** (directory, multi-location, AI recommendations) — don't build more, polish what exists
- **Mobile app** — React Native app is a separate effort, not needed for launch
- **End-user documentation** — self-hosters read developer docs, not user guides
- **White-label agency program** — add this later when agencies find you through the open-source project
- **API documentation portal** — the Public API v1 exists but documenting it is lower priority than self-hosting docs
- **Video tutorials** — write first, video later if demand warrants it

---

## 5. Success Metrics (Honest, Ground-Zero Expectations)

> **Context:** These projections assume zero existing audience, zero published articles, zero freelance history, zero GitHub followers, and zero social media presence. They are based on median outcomes from research on cold-start open-source launches, new Upwork freelancers, and first-time technical writers — not survivor-bias success stories.

### The Reality of Cold Starts

**GitHub stars:** 99.7% of GitHub repos have fewer than 15 stars. The median Show HN post gets 1–2 points. A funded startup (ZenStack, not a solo dev) reported ~500 stars after 7 months of active work and called it "not bad."

**Upwork:** ~90% of new freelancers quit within 12 months. The typical new developer sends 50–100 proposals before their first contract. Starting effective rate after fees: $15–25/hr. The first 3 months are a credibility grind, not a showcase.

**Technical writing:** Month 1 is portfolio building (free articles). First paid article arrives month 2–3. Realistic income: $0 for weeks, then $300–800/month once established.

**awesome-selfhosted:** Requires your project to have been public for 4+ months before submission. Not a launch-day activity.

### 30-Day Targets (Post-Launch)

| Metric | Target | Honest Range | Why It Matters |
|--------|--------|-------------|---------------|
| GitHub stars | 10–30 | 2–50 depending on HN/Reddit luck | Any signal of interest validates the niche |
| Docker pulls | 50–200 | Mostly bots/crawlers initially | Baseline for tracking real adoption later |
| GitHub Issues opened | 1–5 | 0 is possible and normal | Even 1 real issue means someone tried it |
| Cloud signups | 3–10 | Could be 0 | Don't conflate signups with paying customers |
| Upwork proposals sent | 40–60 | 3–5/day, 5 days/week | Pipeline volume matters more than quality at this stage |
| Upwork contracts won | 0–1 | Likely 0 in month 1 | First job typically comes month 2–4 |
| Free articles published | 2–3 | On DEV.to/Hashnode (portfolio building) | Required before pitching paid platforms |
| Paid articles pitched | 2–3 | Pitches sent, not articles accepted | Starting the relationship pipeline |

### 90-Day Targets

| Metric | Target | Honest Range | Why It Matters |
|--------|--------|-------------|---------------|
| GitHub stars | 30–100 | 10–150 depending on whether any post catches | Enough to not look abandoned |
| Cloud signups | 10–30 | Signups, not paying customers | Funnel health check |
| Cloud paying customers | 0–3 | Likely 0–1 | First paying customer is a milestone, not a given |
| MRR | $0–150 | Don't plan around this income | Infrastructure costs ~$20–40/mo — break-even is the goal |
| Pro License sales | 0–1 | Likely 0 | This is gravy, not a revenue plan |
| Upwork contracts completed | 2–5 | At $15–30/hr, small projects | Building reviews and JSS is the goal, not income |
| Upwork earnings | $500–2,000 total | After fees and connect costs | Treat this as investment in your profile |
| Paid articles published | 1–3 | $300–900 total | Supplementary income, not primary |
| Total income (all sources) | $800–3,000 | 3-month cumulative, not monthly | Honest floor to plan finances around |

### 6-Month Checkpoint

| Metric | Optimistic | Realistic | Pessimistic |
|--------|-----------|-----------|-------------|
| GitHub stars | 200+ | 50–150 | 20–50 |
| Cloud paying customers | 5–10 | 1–5 | 0–1 |
| MRR | $200–500 | $0–200 | $0 |
| Upwork monthly income | $1,500–3,000 | $500–1,500 | $200–500 |
| Writing monthly income | $600–1,200 | $300–800 | $0–300 |
| Total monthly income | $2,500–5,000 | $800–2,500 | $200–800 |

### 12-Month North Star

| Metric | Target | Notes |
|--------|--------|-------|
| GitHub stars | 300–1,000 | Enough for awesome-selfhosted listing and credibility |
| Cloud MRR | $200–1,000 | 5–20 paying customers at $39–99/mo |
| Upwork monthly | $2,000–4,000 | Rate should be $40–60/hr by now with 10+ reviews |
| Writing monthly | $800–1,500 | 2–3 paid articles/month at established platforms |
| Total monthly income | $3,000–6,500 | Sustainable, not spectacular |

> **The honest trajectory:** Months 1–3 will feel like nothing is working. Stars trickle in. Upwork proposals go unanswered. Your first paid article takes 6 weeks from pitch to payment. This is normal for cold starts. The compounding effect kicks in around month 4–6 when reviews, stars, and published articles start creating inbound interest. Plan your finances for 3–6 months of minimal income.

---

## 6. Financial Reality Check

### Costs

| Item | Monthly Cost | Notes |
|------|-------------|-------|
| Fly.io (API + Worker) | $10–30 | Two shared-cpu-1x machines |
| Vercel (Web) | $0–20 | Free tier may suffice initially |
| Domain (savspot.co) | ~$1 | Annual, amortized |
| PostgreSQL (Fly.io) | $0–15 | Fly Postgres or external |
| Redis (Fly.io/Upstash) | $0–10 | |
| Upwork Connects | $15–30 | For 40–60 proposals/month |
| **Total** | **$25–105/month** | |

### Income Timeline (Cumulative, All Sources)

| Month | Upwork | Writing | Cloud/License | Total (Cumulative) |
|-------|--------|---------|--------------|-------------------|
| 1 | $0 | $0 | $0 | $0 |
| 2 | $0–200 | $0 | $0 | $0–200 |
| 3 | $200–800 | $0–300 | $0 | $200–1,100 |
| 4 | $500–1,500 | $300–600 | $0 | $1,000–3,200 |
| 5 | $800–2,000 | $300–700 | $0–100 | $2,100–6,000 |
| 6 | $1,200–2,500 | $400–800 | $0–200 | $3,700–9,500 |

**Bottom line:** Plan your personal finances for 2–3 months of near-zero income and 4–6 months before anything resembling sustainability. The total 6-month realistic range is $2,000–$6,000 — not $0, but not a salary either.

---

## 7. Execution Order

```
Week 1:  A1 (Web Dockerfile) + A2 (docker-compose.prod.yml) + D1 (Upwork profile)
         A3 (env config + scripts)
         Start D2 (first technical article draft)

Week 2:  A4 (self-hosting docs) + B1 (README) + B2 (repo hygiene)
         B3 (demo instance setup)
         B4 (CI/CD updates)
         Submit Upwork proposals daily

Week 3:  C1 (landing page updates) + C2 (pricing page)
         C3 (draft all community launch posts)
         Publish first technical article
         Continue Upwork proposals

Week 4:  LAUNCH — Make repo public
         Post to r/selfhosted (Day 1)
         Post to r/opensource (Day 2)
         Post to HN Show HN (Day 3 — Tuesday/Wednesday morning)
         Monitor, respond to issues, iterate based on feedback
         DO NOT submit to awesome-selfhosted yet (4-month minimum wait)

Ongoing: Upwork proposals daily (3-5/day)
         1 free article every 2 weeks (months 1-2)
         Pitch paid platforms starting month 2
         LinkedIn technical posts 3x/week
         Respond to GitHub issues within 24 hours
         Monthly: reassess what's working, cut what isn't
```

**Important:** The launch week will likely feel anticlimactic. A few stars, a handful of comments, maybe one person who tries the Docker setup. This is normal. The value compounds over months, not days. The real wins come from being consistently present in communities, not from a single launch event.

---

## 8. Risk Acknowledgment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Nobody stars/uses the open-source version for months | **High** | Medium | This is the most likely outcome for the first 1–3 months. 99.7% of repos have <15 stars. Demo instance + quality README reduce friction, but don't expect viral adoption. Consistency matters more than launch day. |
| Show HN / Reddit posts get zero traction | **High** | Low | The median HN submission gets 1–2 points. Plan multiple attempts over months, not one big launch. Each post is a lottery ticket, not a strategy. |
| Self-hosters consume support time without paying | Medium | Medium | GitHub Issues only (no email support for free tier). Excellent docs reduce support load. This is a good problem to have — it means people are using it. |
| Someone forks and outcompetes | Low | Medium | AGPL requires sharing modifications. Moat is integrations, reliability, and hosted convenience — not source code. |
| Upwork takes 3+ months to generate any income | **High** | High | 50–100 proposals before first hire is normal. Budget for Connect costs ($50–100) and plan finances for zero Upwork income for months 1–3. Technical writing provides a parallel income path. |
| Cloud conversion rate is zero for 6+ months | **Medium-High** | Medium | Open-source → cloud conversion is slow. Plausible took years to reach $1M ARR. Don't count on cloud revenue in the first 6 months. |
| Technical writing platforms reject you | Medium | Low | Mitigated by publishing 3–5 free articles first. Smashing Magazine explicitly accepts first-timers. Multiple platforms means you don't depend on any one acceptance. |
| Personal burnout from grinding multiple tracks | **Medium-High** | High | Running open-source + Upwork + writing + job search simultaneously is exhausting. Prioritize ruthlessly: Upwork proposals daily, 1 article/month, open-source maintenance weekly. Don't try to do everything at full intensity. |
| The "3-year gap" blocks traditional employment | **High** | High | Cold applications have <2% success rate even without a gap. Mitigated by: Upwork reviews as de facto work experience, published articles as credibility, open-source project as proof of capability. LinkedIn technical content builds the referral network that actually gets you past resume screens. |
| Market timing — "SaaSpocalypse" reduces demand | Low-Medium | Low | Open-source positioning is counter-cyclical: businesses cutting SaaS costs look for self-hosted alternatives. |

---

## 9. Architecture Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| License | AGPL v3 | Only FOSS license with cloud-hosting protection. Required for awesome-selfhosted. |
| CLA | Yes (lightweight) | Retains dual-licensing flexibility for Pro License and future enterprise tier. |
| Reverse proxy | Caddy (included in compose) | Automatic HTTPS, simpler than nginx/traefik for self-hosters. |
| Docker registry | GitHub Container Registry (ghcr.io) | Free for public repos. Keeps everything in GitHub ecosystem. |
| Demo instance | Pre-seeded tenant on savspot.co | No additional infrastructure. Daily cron reset. |
| Pricing | Free / Cloud Free / Cloud Pro / Pro License | Covers self-hosters, hobbyists, serious businesses, and agencies. |
