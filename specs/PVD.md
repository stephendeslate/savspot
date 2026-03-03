# Savspot -- Product Vision Document

**Version:** 1.2 | **Date:** March 1, 2026 | **Author:** SD Solutions, LLC
**Document:** PVD

---

## 1. Vision Statement

**"Find your spot. Book your moment."**

Savspot envisions a world where every bookable business -- from wedding venues to hair salons, photography studios to co-working spaces -- has a professional, automated booking system that works 24/7, whether the booker is a human or an AI agent.

---

## 2. Problem Statement

### For Businesses (Supply Side)
- Manual booking via phone, WhatsApp, email, pen-and-paper leads to double-bookings and lost leads
- No online booking capability despite having a website or social media presence
- Fragmented tools for scheduling, invoicing, contracts, communications, and client management
- Cannot add real-time booking, online payments, or structured availability to their existing site

### For Clients (Demand Side)
- Booking friction: multiple calls, emails, and manual coordination
- Scattered discovery with no consistent booking experience across providers
- AI agents cannot book because most businesses lack structured, API-accessible booking systems

### For Emerging Businesses (Greenfield Demand)
- AI tooling (Claude, GPT, local models, AI-powered design, AI-powered accounting) is lowering the barrier to starting a service business — individuals who previously couldn't justify the operational overhead of managing bookings, invoicing, and client communication can now lean on AI to handle the parts they dread
- These new business owners have no incumbent booking solution to switch from — they are choosing for the first time, not being converted
- Existing booking platforms assume an established business with existing workflows; new AI-enabled entrepreneurs need zero-friction onboarding that matches the speed at which AI helped them launch
- Founders who start businesses *because* of AI tools are inherently AI-native in their expectations — they will expect their tools to interoperate with AI agents as a baseline, not a premium feature

### For the Market
- Per-seat SaaS pricing ($20-$699/mo) is a barrier for micro-businesses and misaligned with AI agent usage
- No AI-native booking platform exists -- all current platforms designed for human-to-human interaction
- The addressable market is not static: AI tooling is actively expanding the population of service businesses, creating a growing greenfield segment with no platform allegiance

---

## 3. Target Market

| Segment | Examples | Est. Addressable Businesses |
|---------|----------|-----------------------------|
| Event Venues | Wedding venues, conference centers, banquet halls | ~2M globally |
| Service Businesses | Salons, spas, fitness studios, dental clinics | ~15M globally |
| Individual Providers | Photographers, consultants, trainers, tutors | ~50M globally |
| Co-working & Rentals | Desks, meeting rooms, studio rentals, equipment | ~500K globally |
| AI-Enabled New Businesses | Solo practitioners, side-hustle-to-business conversions, creators monetizing services | Expanding — see note below |

> **Methodology note:** Estimates are order-of-magnitude approximations based on available industry data (IBISWorld, Statista, Grand View Research, Bureau of Labor Statistics) and represent global counts of businesses in each category, not SAM or SOM. Savspot's Year 1 Serviceable Addressable Market is limited to English-speaking markets (US, UK, AU, CA, PH), representing approximately 30-40% of global totals.
>
> **Expanding addressable market thesis:** The segments above represent the *current* population of bookable businesses. Savspot's strategic thesis is that AI tooling is actively growing this population — particularly the Individual Providers and AI-Enabled New Businesses segments — by lowering the operational barrier to starting a service business. These new entrants have no incumbent booking solution, making them greenfield demand rather than conversion targets. The addressable market is not fixed; it is expanding, and Savspot is positioned to be the default choice for the new entrants. See §8a for how this thesis shapes distribution strategy.

**Customer profile:** 1-50 employees, $50K-$5M revenue, low-to-moderate tech savvy.

**Geographic phases:** Year 1: US, UK, AU, CA, PH. Year 2: Western Europe. Year 3: Asia-Pacific.

---

## 4. User Personas

| Persona | Role | Pain | Goal |
|---------|------|------|------|
| **Maria** (38, venue owner) | Business Admin | 3+ hrs/day on manual inquiries, quotes, contracts | Automate booking pipeline with shareable link |
| **James** (29, photographer) | Business Admin | Manages bookings via DMs/spreadsheets, loses deposits | Professional booking page, auto payment collection |
| **Marcus** (32, barber) | Business Admin | Using Booksy but frustrated by closed ecosystem, no client preference tracking, no API access for future AI tools; wants to evaluate alternatives without switching risk | Run SavSpot alongside Booksy, route 3–5 clients per week, compare the experience; eventually cancel Booksy when SavSpot covers his needs. The confirmed Phase 1 design partner (see savspot-gtm-distribution-strategy.md). |
| **Priya** (26, AI-enabled new business owner) | Business Admin | Just launched a freelance design consultancy using AI tools; has no existing booking system, no established workflow, needs professional infrastructure immediately | Zero-friction setup that matches the speed at which AI helped her start; a booking link she can share on day one |
| **Sarah** (31, wedding planner) | Client/Booker | Comparing venues requires calling each one | Real-time availability, book and pay in one session |
| **Alex** (AI agent) | API Consumer | No structured booking APIs exist | Discover, check, complete booking via API |

---

## 5. Competitive Landscape

| Competitor | Pricing | AI-Ready | Universal |
|-----------|---------|----------|-----------|
| Fresha | Free + 20% commission | No | Beauty only |
| Mindbody | $139-$699/mo | Limited | Fitness only |
| Calendly | Free-$20/seat/mo | No | Meetings only |
| SimplyBook.me | $9.90-$59.90/mo | No | General |
| Square Appointments | Free + 2.6%/txn | No | General |
| Acuity (Squarespace) | Free-$36/mo | No | General |
| Setmore | Free-$12/seat/mo | No | General |

### Differentiation
1. **AI-Agent-First Architecture** -- MCP + structured APIs from day one
2. **Universal Booking Engine** -- all businesses, not niche-locked
3. **Progressive Complexity** -- zero-config for freelancers, full-featured for venues; complexity scales with need, not with onboarding
4. **Free + Outcome-Aligned** -- revenue from transaction fees, not subscriptions; no upfront cost means zero psychological barrier for new businesses that haven't earned revenue yet
5. **Greenfield-Ready** -- designed for first-time business owners, not just businesses switching from another tool; onboarding friction (<5 min to live booking page) matches the speed at which AI-enabled entrepreneurs expect to operate
6. **Payment Provider Abstraction** -- provider-agnostic from Day 1; Stripe Connect in Phase 1, alternative providers (Adyen, PayPal, regional) in Phase 3+; offline payment as a first-class path
7. **Multi-Tenant by Design** -- shared infrastructure, isolated data
8. **Full Lifecycle** -- booking -> payment -> contracts -> comms -> CRM -> analytics

### Phase 1 Positioning

Until AI-agent features ship in Phase 3, the go-to-market positioning leads with:

- **Free universal booking** — not niche-locked like Fresha (beauty) or Mindbody (fitness)
- **Zero-config to live booking page in under 5 minutes** — lower friction than any competitor; matches the speed at which AI-enabled new business owners expect to operate
- **No per-seat pricing, no monthly fee for core features** — outcome-aligned revenue model; zero financial risk for businesses that haven't earned revenue yet
- **Offline payment as a first-class path** — serves markets competitors ignore
- **Built for businesses that don't exist yet** — as AI tooling drives new business formation, Savspot is the default choice for first-time business owners with no incumbent solution to defend

The AI-agent architecture (MCP-ready schema, API-first design) is foundational infrastructure from Phase 1, but AI-facing features (MCP server, public API, AI recommendations) are Phase 3+. Phase 1-2 marketing should not lead with AI claims. The positioning statement for Phase 1: *"The free booking platform that works for any business in under 5 minutes."*

---

## 6. Product Pillars

1. **Progressive Complexity Engine** -- zero-config defaults for individuals; business-type presets for guided onboarding; advanced features activated by configuring them, not by flipping flags. Service complexity indicators, category-based booking page grouping, and service configuration copying ensure that per-service granularity feels coherent rather than chaotic for both business owners and their clients.
2. **Booking Flow Wizard** -- dynamic multi-step per service; steps included or excluded based on what the business has configured (guest tracking, contracts, questionnaires are present only when their data exists)
3. **Client Portal** -- manage bookings, payments, contracts
4. **Admin CRM** -- progressive disclosure UI; basic settings visible by default, advanced options collapsed until needed
5. **Booking Page & Widget** -- shareable link (free) + JS embed (premium)
6. **AI Agent Gateway** -- MCP server + REST API
7. **Mobile Experience** -- React Native + Expo (iOS/Android), shipping in Phase 2. Phase 1 relies on mobile-responsive web (FR-BP-5) for client booking.

---

## 7. Success Metrics (Year 1)

| Metric | Target |
|--------|--------|
| Registered Businesses | 1,000 |
| Monthly Active Bookings | 10,000 |
| GMV | $2M |
| Platform Revenue | $100K |
| 90-day Retention | >70% |
| NPS | >40 |

> **Revenue model arithmetic (base vs. stretch):**
> - Payment processing: $2M GMV × 1% = $20K
> - Platform referral commission: Platform-sourced channels (API, directory, referrals) are not available until Phase 3-4. Year 1 referral revenue is minimal. Estimate: $5-10K.
> - Premium subscriptions: At industry-standard 5-10% freemium conversion and $20/mo average, 1,000 businesses yield 50-100 premium subscribers × $20 × 12 = $12-24K.
> - **Base case: $37-54K.** Stretch case ($100K) requires either above-average premium conversion or accelerated GMV growth beyond $2M.
>
> The $100K target is a stretch goal. The base case target is $40K, which achieves positive unit economics when combined with the bootstrap cost structure (BRD §8). Revenue targets will be revised quarterly based on actual conversion rates.

**North Star Metric:** Monthly Bookings Completed

**Leading Indicator (Soft Launch):** Unprompted booking page sharing — businesses putting their `savspot.co/{slug}` in Instagram bio, email signature, or website without being asked. This is the earliest organic signal that the product is delivering enough value to earn word-of-mouth. Tracked via referrer analysis on booking page traffic during the soft launch period (see §8a).

---

## 8. Business Objectives

| # | Objective | Target | Timeline |
|---|-----------|--------|----------|
| BO-1 | Production-ready platform + soft launch | First booking from non-founder business | Month 3 |
| BO-2 | Vertical adoption | 200+ businesses | Month 6 |
| BO-3 | Sustainable revenue | $8K+ MRR | Month 10 |
| BO-4 | AI-agent capability | 1+ integration | Month 6 |
| BO-5 | International readiness | 2+ countries | Month 8 |

> **BO-4 dependency note:** AI-agent capability (BO-4) depends on Phase 3 deliverables (MCP server, public REST API), which span months 4-6. Month 6 is achievable but has no buffer. If Phase 1-2 timelines slip, BO-4 should be the first objective to defer. The architecture is AI-ready from Phase 1 (API-first design, MCP-compatible schema), so BO-4 delivery requires building the public interface, not re-architecting.

---

## 8a. Initial Distribution Strategy

### Core Market Thesis: Greenfield > Conversion

Savspot's distribution strategy is grounded in a structural bet: **AI tooling is expanding the population of service businesses, and new businesses are easier to win than existing ones.**

The traditional SaaS distribution challenge is conversion — convincing an existing business to switch from their current solution (even if that solution is WhatsApp and a notebook). Switching costs are real, workflows are entrenched, and brand loyalty to incumbent tools creates friction that no amount of feature superiority easily overcomes.

Savspot bets on a different dynamic. AI tooling (Claude, GPT, local models, AI-powered design, AI-powered accounting, AI-powered marketing) is lowering the barrier to starting a service business. A photographer who previously couldn't justify the overhead of managing bookings, invoicing, and client communication can now lean on AI to handle the operational complexity. A fitness instructor who was hesitant to go independent can now launch with AI handling the business side. These AI-enabled entrepreneurs are creating **new demand for booking infrastructure** — demand that didn't exist 18 months ago and is growing.

These new businesses have three properties that make them structurally favorable for Savspot:

1. **No incumbent solution to displace.** They aren't switching from Fresha or Calendly. They're choosing for the first time. Savspot doesn't need to overcome switching inertia — it needs to be discoverable and frictionless at the moment of first search.
2. **AI-native expectations.** Founders who start businesses *because* AI tools made it feasible already live in a world where AI agents do things for them. When their AI assistant says "I can manage your bookings if your platform supports it," they will expect that to work. MCP compatibility isn't a premium feature for this cohort — it's an expected baseline. This makes Savspot's AI-agent-first architecture a natural fit rather than a speculative differentiator.
3. **Zero-friction price sensitivity.** Someone who just launched a service business and hasn't booked their first client won't pay $30/month for Booksy. But they will set up a free booking page in 5 minutes and share the link on Instagram. Savspot's revenue model (earn when they earn) is psychologically aligned with founders who aren't yet sure the business will work.

This thesis does not replace the need to serve established businesses — the LifePlace proof-of-concept validates the platform for existing venues and service providers. But it reframes the distribution challenge from "how do we convert incumbents in a crowded market?" to "how do we become the default for businesses that don't exist yet?" The latter is a fundamentally more favorable position for a solo-operator bootstrap.

**Implications for product priorities:** The greenfield thesis makes the onboarding friction target (4 required fields + 1 decision to a live booking page) the single most important product metric — not just a nice-to-have, but the core competitive moat. New business owners choosing for the first time will select the platform that gets them operational fastest. Every additional onboarding step is a lost user from this cohort.

**Implications for the soft launch:** In addition to established business owners (the Maria and James personas), the soft launch cohort should include at least 1–2 first-time business owners (the Priya persona — see §4) who have no existing booking workflow. Their experience will validate whether Savspot works for the greenfield market, not just the conversion market.

**Risks of this thesis:** (1) The timeline for AI-driven business formation is uncertain — the tools are here, but the behavioral shift may lag. (2) New businesses have higher mortality than established ones, which may compress 90-day retention rates and reduce per-business GMV. (3) If the greenfield market materializes, competitors will also target it with AI-native tools, narrowing Savspot's window. See §11 for full risk treatment.

### Distribution as Founder Skill Development

Distribution and sales is the founder's least developed professional dimension. Technical execution is thoroughly proven (LifePlace: 805 commits, 122 models, 20 domains, ~543K LOC; published patent US20250140075A1; UCSD CS degree). The GTM strategy (savspot-gtm-distribution-strategy.md) is designed as a learning structure, not just an execution plan — each design partner installation is a compressed sales cycle (discovery, demo, objection handling, activation monitoring, referral ask, closing) that forces structured repetition of the distribution skill set. The founder is entering the weakest dimension with self-awareness and tolerance for iteration: the first 10 installations will produce mistakes and course corrections, and the strategy explicitly allows room for that. The 10-to-100 user transition remains the hardest unsolved problem, but it is deferred to be solved by the learning from the first 10 reps. See savspot-gtm-distribution-strategy.md §14 for the floor outcome analysis — even at minimum scale, the execution produces career-defining portfolio work alongside distribution skill acquisition.

### Organic Distribution Channels

Savspot's primary distribution is organic, built into the product:

1. **Booking link viral loop:** Every business that shares their `savspot.co/{slug}` URL exposes Savspot to their entire client base. Each completed booking is a product impression.
2. **Client account portability:** Clients who book through one business discover Savspot as a platform. A single client account works across all businesses, creating cross-pollination.
3. **AI agent distribution (Phase 3+):** When AI agents recommend booking providers, Savspot businesses are programmatically discoverable -- a distribution channel with zero marginal cost.
4. **Zero-friction supply-side:** Free software with no credit card required means word-of-mouth among business owners has no conversion barrier.

### Signal-First Soft Launch Strategy (5–10 Businesses)

Rather than scaling acquisition during active development or deferring it entirely until Phase 4, Savspot follows a deliberate middle path: a focused soft launch immediately after Phase 1, designed to generate real signal with minimal time investment.

**Why not scale during development?** A solo operator cannot simultaneously build Phase 2–3 features, white-glove onboard 50 businesses, and provide quality support. The time competition is unsustainable and risks both product quality and business relationships.

**Why not defer until after Phase 4?** Phase 4 features are explicitly demand-gated (see §9 Roadmap) — directory at >200 businesses, custom domains at >20 requests, multi-location at >10 businesses. Building Phase 4 without user data means guessing instead of responding. Additionally, every month of development without user feedback risks building the wrong things for a self-service product targeting thousands of strangers.

**The middle path:**

1. **Phase 1 completion (Month 2.5):** Ship the web-only platform (no mobile app in Phase 1 — see BRD §8). Booking page, onboarding, booking flow, payments, admin CRM, client portal, calendar sync (Phase 1 two-way per FR-CAL-10), transactional email, provider SMS (FR-COM-2a), browser push (FR-NOT-6), walk-in booking (FR-BFW-18), support triage.

2. **Soft launch (~1 week, immediately post Phase 1):** Onboard 5–10 businesses using the following structured cohort (see also savspot-gtm-distribution-strategy.md §7):

   | Slot | Type | Persona | What It Tests |
   |------|------|---------|---------------|
   | 1 | **Confirmed design partner** — barber friend | Marcus — established, switching from Booksy | Parallel-run, data import pipeline, calendar bridge, barber vertical, conversion readiness |
   | 2–3 | Other barbers in same shop (opportunistic) | Marcus variant | Multi-provider architecture within single tenant, word-of-mouth within a workplace |
   | 4–5 | Different vertical (photographer, tutor, consultant) | Maria / James | Cross-vertical validation, import from a different platform (Calendly/Acuity/Square) |
   | 6–7 | Greenfield (new business, no prior booking tool) | Priya — first-time owner | Greenfield thesis validation, onboarding friction measurement |
   | 8–10 | Opportunistic (whoever expresses interest) | Mixed | Volume, diversity, unexpected use cases |

   The design partner (Slot 1) receives white-glove setup: data import from Booksy CSV, Google Calendar connection for bridge sync, service configuration from his existing booking page, and a structured 90-day feedback program. All other businesses receive the standard white-glove setup (founder creates booking page, configures first service, walks them through Admin CRM). This costs 2–3 days of time, not money — aligned with bootstrap constraint (BRD §8).

3. **Observe, don't optimize (Months 3–6, concurrent with Phase 2–3 development):** Let the soft launch businesses use the product organically. Track:
   - **Unprompted booking page sharing** (the leading indicator — see §7): Are businesses putting their URL in Instagram bio, email signature, or website without being asked?
   - **Booking completion rate:** What percentage of sessions that enter the booking flow complete a booking?
   - **Payment flow completion:** Are businesses connecting Stripe? Are clients completing payment?
   - **Return usage:** Are businesses logging into the admin CRM after the first week?
   - **Support tickets:** What are the first 5–10 businesses actually confused about?

4. **Course-correct Phase 2–3 priorities:** If the soft launch reveals that businesses consistently fail at a specific step (e.g., Stripe onboarding), that becomes a Phase 2 priority. If businesses don't share their booking link, the core value proposition needs refinement before building more features. The signal shapes the roadmap.

5. **Scale acquisition after Phase 3 (Month 6+):** With AI agent distribution (MCP server, public API), the directory, and a proven product shaped by real user feedback, scale acquisition through organic channels and the AI agent channel — now with 6 months of product refinement behind it. The greenfield market thesis (new AI-enabled businesses choosing for the first time) provides a growing pool of users who discover Savspot without needing to be converted from a competitor — this channel strengthens over time as AI tooling adoption accelerates.

**Activation trigger:** Each soft launch business immediately shares their booking page URL, which starts the organic viral loop (bullet 1 above) for their client base — even a handful of active businesses can generate dozens of client-side product impressions.

**Fallback:** If <5 businesses agree to soft launch from personal network outreach, the positioning needs revision before investing in development beyond Phase 1. If soft launch businesses churn within 30 days, prioritize understanding why over building Phase 2 features.

Paid marketing, content strategy, and partnership development are deferred until product-market fit is validated through organic adoption metrics. The decision to invest in marketing is gated on: >50 businesses processing payments AND >70% 30-day retention.

---

## 9. Roadmap

**Phase 1 -- Foundation (Months 1-2.5):** Multi-tenant platform, business-type preset onboarding (zero-config to working booking page), dynamic booking flow wizard (steps determined by service configuration), PaymentProvider abstraction interface with Stripe Connect implementation, offline payment as first-class path, admin CRM with progressive disclosure, client portal, booking page, one-way calendar sync, basic transactional email (confirmation, receipt, reminders, follow-ups), AI-powered support triage via Open Claw. Web-only; mobile-responsive design covers client booking scenarios.

**Soft Launch (~1 week, immediately post Phase 1):** Personally onboard 5–10 businesses across 1–2 verticals. Observe real usage, booking completion, payment flow, and organic sharing. Gather signal to inform Phase 2 priorities. See §8a for full strategy.

**Phase 2 -- Communications & Growth (Months 2.5-4):** Mobile app (React Native + Expo — client booking, push notifications, biometric auth), email/SMS with template sandbox, contracts with multi-party signatures, notifications with type registry, advanced booking steps (questionnaires, add-ons), reviews, two-way calendar sync, check-in/check-out management, booking flow builder, embeddable widget (premium).

**Phase 3 -- AI & Automation (Months 4-6):** MCP server + public REST API (headless booking engine), workflow automation with triggers and overrides, alternative payment providers (Adyen, PayPal Commerce Platform) via PaymentProvider abstraction, advanced analytics (premium), QuickBooks/Xero integration (premium), i18n, multi-currency.

**Phase 4 -- Scale (Demand-driven, post-launch):** AI recommendations, platform directory, custom domains, multi-location, regional payment providers, partner program, geographic expansion. Phase 4 features ship on demand based on user base metrics, not on a fixed calendar:

| Feature | Trigger |
|---------|---------|
| Platform directory | >200 businesses with published booking pages |
| Custom domains | >20 businesses requesting via support or feedback |
| Multi-location | >10 businesses operating 2+ physical locations |
| Regional payment providers | >50 businesses in a region where Stripe/Adyen/PayPal have limited coverage |
| Partner program | >500 businesses with consistent monthly bookings |

---

## 10. Development Philosophy

- **Two-Tier AI Development Pipeline:**

| Tier | Tool | Work Type |
|------|------|-----------|
| **Complexity tier** | Claude Code (cloud, $100/mo subscription) | Complex architecture (booking flow engine, payment state machine, availability resolution, concurrency model), multi-file orchestration, PR review, system design decisions |
| **Volume tier** | Qwen3 family on gmktec evo x2 (128GB RAM, local, zero marginal cost) | CRUD endpoint scaffolding, Prisma migration generation from spec, React component generation, Zod schema creation from data model tables, test factory writing, documentation generation, repetitive pattern implementation |
| **Monitoring tier** | Open Claw (24/7, local) | Automated quality checks, CI monitoring, deployment health, error tracking triage, support ticket triage and AI-powered L1 resolution (BRD §8a), development support |

  **Partition principle:** Claude Code handles decisions and complexity; Qwen3 handles volume and patterns; Open Claw handles continuity, monitoring, and support operations. This maps to the Savspot codebase as follows: Claude Code designs and implements the booking flow engine, payment integration, and availability resolver; Qwen3 scaffolds the ~60 API endpoints, ~40 database tables, ~50 React components, and their corresponding test suites; Open Claw monitors builds, deployments, and error rates 24/7 and triages incoming support tickets — routing to Qwen3 for L1 investigation/resolution and escalating to Claude Code or the developer when AI resolution is insufficient (see BRD §8a).

- **Solo Developer + AI:** SD Solutions, LLC (Stephen DeSlate). Validated by prior art: LifePlace App (805 commits, 122 models, 20 domains, ~543K LOC shipped to production in 6 months with $100 Claude Code subscription alone — before Qwen3 and Open Claw were available); published patent (US20250140075A1); UCSD Computer Science degree. Technical execution is the founder's strongest professional dimension. Distribution and sales is the least developed — and SavSpot's GTM strategy is designed to address this through structured repetition (see savspot-gtm-distribution-strategy.md §1, §5, §14).
- **Phase 1 is web-only:** The native mobile app is deferred to Phase 2 (see PRD §4.5) to tighten Phase 1 scope and maximize development focus on the core booking platform. Mobile-responsive web covers client booking needs during initial validation. The mobile app ships in Phase 2 alongside the notification system, check-in/check-out, and reviews — features that benefit more from native capabilities.
- **TypeScript everywhere** | **Multi-tenant from day one** | **API-first** | **AI-native** | **Provider-agnostic payment abstraction**
- **Progressive complexity:** Design the schema for the most complex case (venue/event), configure defaults for the simplest case (freelancer). The presence or absence of data is the configuration -- no feature flags, no configuration cascades. Complexity scales per service, not per tenant.
- **Zero-config principle:** A business that enters only a name, one service, and a duration gets a working, professional booking page with sensible defaults. Every advanced feature is opt-in by configuring it, never required.
- **International from day one:** UTC, i18n infrastructure, multi-currency
- **Privacy by design:** GDPR, CCPA built in

---

## 11. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Crowded market | AI-first + universal engine differentiation; greenfield market thesis reduces reliance on converting incumbents (see §8a) |
| Slow adoption | Signal-first soft launch (5–10 businesses, §8a) validates demand before scaling; organic viral loop (booking links = product impressions) + free software + zero-friction onboarding + AI channel (Phase 3); greenfield demand from AI-enabled new businesses provides growing inbound independent of conversion efforts; paid marketing deferred until PMF validated. Distribution weakness is a known training cost, not an unmitigated risk — the GTM strategy (savspot-gtm-distribution-strategy.md §5, §14) is designed to develop the founder's distribution skills through structured repetition; personal network contacts are expected to try the product when asked directly, providing the initial cohort; the floor outcome includes career-valuable sales experience regardless of scale. |
| Solo bottleneck | Two-tier AI pipeline: Claude Code (cloud, complexity) + Qwen3 on gmktec evo x2 128GB (local, volume) + Open Claw (24/7 monitoring + support triage). Phase 1 mobile deferral reduces scope by ~2–3 weeks, concentrating effort on core web platform. Soft launch (5–10 businesses) requires only 2–3 days of founder time, not sustained acquisition effort. Effective throughput estimated 2-3x LifePlace baseline. Validated: LifePlace ~543K LOC (805 commits) shipped solo in 6 months with Claude Code alone. |
| Support burden at scale | AI-powered support triage pipeline: Open Claw monitors tickets 24/7, routes to Qwen3/Claude Code for L1 resolution, escalates only unresolvable issues to developer. Target: >60% AI resolution rate. Validated by existing support system in LifePlace production. See BRD §8a. |
| AI adoption slower than expected | Core works for humans; AI is incremental value |
| Price sensitivity | Free core; commission-only model; zero upfront cost is psychologically aligned with new business owners who haven't yet earned revenue |
| Stripe Connect dependency | PaymentProvider abstraction interface from Day 1; Stripe implements Phase 1; Adyen + PayPal in Phase 3; regional providers in Phase 4; offline payment as first-class path for markets Stripe doesn't serve |
| Greenfield thesis timing | AI tooling is available now, but the behavioral shift (people starting businesses because of it) may lag the technology. Savspot's core product works for established businesses regardless — the greenfield channel is additive, not load-bearing for Year 1 survival. Revenue model achieves positive unit economics at modest scale ($3K/month) without requiring the greenfield thesis to fully materialize. |
| New business mortality | AI-enabled new businesses may have higher churn than established ones, compressing 90-day retention and per-business GMV. Mitigated by: (1) revenue model has no subscription to lose on churn — Savspot earns only when the business earns; (2) even short-lived businesses contribute booking link impressions to the viral loop; (3) businesses that survive the initial period become long-term, high-value users. |
| Competing AI-native entrants | If the greenfield market materializes, competitors will target it with AI-native tools. Savspot's head start (MCP-ready architecture from Phase 1, MCP server shipping Phase 3) and zero-friction onboarding provide a window, but it is not permanent. Speed to market and product quality during the window are critical. |

---

## 12. Out of Scope (v1)

Multi-language UI, white-label, native admin app, video conferencing, inventory/POS, loyalty programs, affiliate system, custom reporting builder.

**Recurring bookings clarification:** Full recurring booking automation — configurable frequency, automatic slot hold, automatic confirmation for each recurrence — is out of scope for v1. However, a **rebooking prompt** (FR-BFW-19) ships in Phase 1: after a booking is marked COMPLETED, the post-appointment follow-up email includes a deep-link that pre-selects the same service and provider, reducing re-booking to a single tap. This is a communication enhancement, not a recurring booking feature. Phase 2 may introduce full recurring booking based on demand signals from the soft launch.

---

**Company:** SD Solutions, LLC | **Founder:** Stephen Deslate