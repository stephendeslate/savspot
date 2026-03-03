# Savspot — Go-to-Market & Distribution Strategy

**Version:** 1.1 | **Date:** March 1, 2026 | **Author:** SD Solutions, LLC
**Document:** GTM & Distribution Strategy
**Supersedes:** savspot-design-partner-strategy.md v1.0

---

## 1. Purpose & Scope

This document defines Savspot's complete go-to-market and distribution strategy, covering: (a) the strategic foundation — LifePlace as prior art, personal network assets, and identified distribution gaps; (b) segment sequencing for customer acquisition; (c) the design partner program (Marcus, barber, Booksy parallel-run); (d) the concierge launch playbook — outreach, demo, onboarding, and referral mechanics; (e) distribution channels — organic, content, build-in-public, AI agent, and directory; (f) signal collection and measurement; (g) architectural enhancements that enable the GTM strategy; (h) risk acknowledgment; and (i) distribution as a founder skill development dimension — the GTM strategy functions as a learning structure for the founder's least developed professional area, not just an execution plan.

It should be read alongside: PVD §8a (soft launch strategy and organic distribution channels), PVD §5 (competitive landscape and positioning), BRD §1-3 (revenue model and business rules), BRD §8 (constraints), PRD (functional requirements), SRS-2 (data model), SRS-3 (booking and payments), and SRS-4 (communications and workflows).

This document subsumes the design partner strategy (savspot-design-partner-strategy.md v1.0) and expands it with go-to-market context, distribution channel strategy, and a tactical launch playbook.

---

## 2. Strategic Foundation

### 2.1 LifePlace as Prior Art and Distribution Asset

LifePlace (lifeplace.dev) is a separate, production-deployed event management platform for a venue business in the Philippines, built by the same solo developer. It is live and undergoing internal testing. Key evidence (verified against github.com/stephendeslate/lifeplace-app):

- 805 commits, 122 database models, 20 domain modules, ~543K LOC
- Django/Python backend (architecture divergence from Savspot's NestJS/TypeScript — full rewrite, not a fork; see savspot-validation-analysis.md §1.1)
- Production deployment on Fly.io + Cloudflare Pages
- Core domains: booking flow engine, Stripe payments, contracts with digital signatures, client portal, admin CRM, mobile app (React Native + Expo), Google Calendar sync, file storage (Cloudflare R2), RBAC, workflow automation (48 Celery tasks), support system
- ~80% domain overlap with what Savspot requires (savspot-validation-analysis.md §1.1)

LifePlace remains a separate codebase on a separate timeline. A future migration onto the Savspot multi-tenant platform is possible but not committed.

**LifePlace as technical validation** is documented in the BRD §8 (timeline validation), PVD §10 (development philosophy), PRD §4.5 (mobile app capability), SRS-4 §41b (support system prior art), and savspot-validation-analysis.md §1.1 and §4.1.

**LifePlace as a distribution asset** is new to this document. LifePlace provides:

1. **Social proof in outreach.** Every pitch to a prospective user can reference a live, production-deployed booking system. This answers the trust objection ("why should I try something untested?") with a verifiable fact. LifePlace is not positioned as a Savspot customer — it is referenced as proof that the builder has shipped this class of product before, and that the underlying booking engine concepts are production-validated.

2. **Case study material.** The narrative — "I built a booking system for a real venue business; now I've generalized it into a multi-tenant SaaS available to any service business for free" — is a stronger pitch than "I am building a new booking platform." The distinction is proof vs. promise.

3. **Architecture proof for venue-segment expansion (Month 6+).** When Savspot pursues venue businesses (Segment 3, §3.3), LifePlace is the existence proof that the platform can handle complex configurations. No other zero-config booking SaaS can point to a live venue deployment as evidence of progressive complexity.

**What LifePlace is NOT used for in distribution:**

- Savspot is not positioned as "LifePlace for everyone." LifePlace is a separate product. Savspot stands on its own.
- LifePlace migration to Savspot is not part of any marketing narrative. It is a future possibility, not a current claim.
- LifePlace's private business data is not shared as social proof. Only the technical facts (LOC, commits, domain coverage, live deployment) are used.

### 2.2 Personal Network Distribution Assets

The founder has a personal network of service business owners and operators. These contacts constitute the primary acquisition channel for Phase 1 and the soft launch cohort (PVD §8a). The network includes:

| Contact Type | Relationship | Segment | Persona (PVD §4) |
|---|---|---|---|
| Barber friend (Marcus) | Close personal relationship | Independent provider, Booksy user | Marcus — conversion persona |
| Second barber at Marcus's shop | Friend, Booksy-dependent | Independent provider, Booksy user | Marcus variant |
| Former coworkers — nail techs, salon owners, independent stylists | Acquaintances, warm contacts | Mixed: some on platforms (conversion), some using nothing formal (greenfield) | Mixed: Marcus (conversion) / Priya (greenfield) |

**Estimated reachable contacts:** 5–10 individuals within a 2–4 week outreach window. This aligns with the PVD §8a soft launch cohort size (5–10 businesses). The founder is confident that personal network contacts will at least try the product when asked directly — the ask is low-commitment ("can you try this out for me?") and the relationship context lowers the activation barrier. This is correctly sized for Phase 1 seeding: the product speaks for itself once a contact has a populated booking page and receives their first real booking. The PVD §8a fallback trigger ("If <5 businesses agree to soft launch from personal network outreach, the positioning needs revision before investing in development beyond Phase 1") remains the floor threshold, but the founder's assessment is that reaching 5 is likely given the personal relationships involved.

**Shop dynamics (Marcus's workplace):** Whether barbers in Marcus's shop choose their own tools independently or the shop owner makes platform decisions is currently unknown. This must be determined before Phase 1 launch, as it affects the land-and-expand path (§3.2).

### 2.3 Current Distribution Gaps

The following gaps exist in the Savspot document set as of this version. Each gap is assessed against what the documents specify, what research indicates, and what is appropriate for the current stage.

| Gap | Document Status | Assessment |
|---|---|---|
| No pre-launch demand capture | savspot-validation-analysis.md §10 recommends "launch a waitlist or landing page before Phase 1 is complete." No FR code exists. | **Action required.** A one-page landing page at savspot.co with email capture should precede Phase 1 completion. |
| No competitor comparison content | Detailed competitive intelligence exists across PVD §5, BRD §1-3, and savspot-validation-analysis.md §2.2-2.3, but is not externalized into marketing content. | **Action post-launch.** "Savspot vs Booksy" comparison page with interactive cost calculator. See §6.2. |
| No B2B referral incentive | The `referral_links` table (SRS-2, Phase 3) handles client-to-business referral attribution (FR-CRM-25). No business-to-business referral incentive exists. | **Manual for now.** At 5–10 users, ask for intros and track in a spreadsheet. Formalize at Phase 3. See §5.4. |
| No content/SEO strategy beyond booking page basics | FR-BP-6 (Open Graph meta tags, canonical URLs), FR-BP-9 (JSON-LD structured data, sitemap.xml) are booking-page-level SEO. No domain-level keyword strategy, blog, or comparison page infrastructure. | **Addressed by comparison pages (§6.2) and build-in-public content (§6.3).** |
| No onboarding nurture sequence | FR-COM-1a covers transactional email only (booking confirmation, cancellation, reminder, follow-up). No post-signup activation drip. | **Founder-as-nurture at this stage.** Personal texts at day 1, 3, and 7. See §5.3. Automate at 50+ users. |
| No marketplace / directory until Phase 4 | PVD §9 gates the platform directory on >200 businesses with published booking pages. | **No change needed.** Gate is correct. The booking link viral loop (PVD §8a) is the discovery mechanism until then. |
| No community or public narrative | No forums, Discord, LinkedIn presence, or public founder narrative. | **Addressed by build-in-public strategy (§6.3).** Two narratives for two audiences. |
| Cold-start problem acknowledged but not fully solved | savspot-validation-analysis.md §5.1: "This is a legitimate growth flywheel, but it has a cold-start problem." | **Addressed by concierge launch playbook (§5) and personal network outreach.** The cold start is solved manually, not programmatically. |

**Distribution as a learning objective:** The gaps enumerated above are the expected gaps for a founder whose professional strength is technical execution (LifePlace: 805 commits, 122 models, ~543K LOC; published patent US20250140075A1; UCSD CS degree) and whose least developed dimension is distribution and sales. This is structurally optimal: technical execution is the hardest dimension to fake or acquire quickly — it is already strong. Distribution and sales skills are learnable through repetition, and the GTM strategy below is designed to force that repetition through each concierge installation. The distribution gaps are not treated as deficiencies to be ashamed of but as a known training cost that the project is designed to address. The founder allows himself room for mistakes in the first 10 reps — the strategy is iterative by design, not fragile.

---

## 3. Segment Sequencing

Savspot's target market spans multiple segments (PVD §3): event venues (~2M globally), service businesses (~15M globally), individual providers (~50M globally), co-working/rentals (~500K globally), and AI-enabled new businesses (expanding). The founder's personal network provides access to individual providers and service businesses. Sequencing these segments determines the order of acquisition.

### 3.1 Segment 1: Independent Service Providers (Months 1–3)

**Why first:** Shortest sales cycle (one person decides and uses the product), lowest product complexity (single provider, single schedule, no multi-user permissions), strongest personal network overlap, and validated by analogous companies — theCut (barbershop booking platform) targeted individual barbers as their atomic unit and achieved approximately 50% of monthly signups through barber-to-barber referrals.

**Targets within this segment:**

- Marcus (confirmed design partner, Booksy user, conversion persona)
- Marcus's colleague (Booksy-dependent, relationship and interest TBD)
- Former coworkers and friends who are independent nail techs, salon owners, stylists

**Contact segmentation by pain type:**

| Group | Current State | Persona | Pitch Framework | Switching Cost |
|---|---|---|---|---|
| A — Using nothing formal | DMs, texts, pen and paper, no booking system | Priya (PVD §4) | "Get a professional booking page in 5 minutes, free. I'll set it up for you." | Zero |
| B — Frustrated with current platform | Booksy, Fresha, Square, Vagaro | Marcus (PVD §4) | "Run Savspot alongside what you have now. No switching. I'll import your data." | Data migration + workflow relearning + client disruption (all addressed by parallel-run architecture) |

The pitch for each group is different because the switching cost structure is different. Group A has no incumbent to displace — they are greenfield demand (PVD §8a greenfield thesis). Group B has an incumbent and requires the parallel-run architecture (§4.3) to eliminate switching risk.

### 3.2 Segment 2: Multi-Provider Shops / Salons (Months 3–6)

**Why second:** Requires social proof from Segment 1 ("5 providers in your area already use Savspot"). Also requires the multi-provider UI — the `service_providers` join table (SRS-2 §6a) ships in Phase 1, but the provider-service assignment UI (FR-CRM-30) is Phase 2.

**Entry vector:** Marcus's shop. If Marcus succeeds on Savspot and his colleagues observe it working daily, the shop becomes the first multi-provider account. This is the land-and-expand model — one provider in, then colleagues follow. The expansion is social and visible, not sales-driven.

**Prerequisite:** Determine shop dynamics (§2.2). If barbers choose their own tools independently, expansion requires individual conversations. If the shop owner decides, expansion requires one conversation with a different stakeholder.

### 3.3 Segment 3: Venue Businesses (Months 6+)

**Why last:** Most complex use case (event scheduling, multi-service configuration, potentially different booking flows), longest sales cycle, but highest average contract value. LifePlace proves the technology supports this complexity (§2.1), but the Savspot multi-tenant platform needs to be stable with 15+ happy users from Segments 1–2 before pursuing this segment.

**Not pursued at launch.** Venue businesses are deferred until Savspot can support venue-level configuration through self-service onboarding without compromising the <5 minute target (BRD §7 stakeholder success criteria) for simpler businesses.

---

## 4. Design Partner Program

### 4.1 Design Partner vs. Beta Tester — Why the Distinction Matters

A design partner is an early-stage collaborator who shapes the product **before** market release, exchanging time and insight for early access and influence over product direction. A beta tester validates a nearly-finished product. The distinction matters both strategically and operationally.

"Design partner" implies the partner's feedback directly shapes what gets built. When they say "I wish it did X" and Savspot builds X in the next sprint, they become invested in the product's success in a way a beta tester never does. This framing protects the relationship and creates genuine product ownership.

### 4.2 Partnership Structure

The first confirmed design partner is a barber friend — an established professional currently using Booksy who will run Savspot alongside Booksy with zero switching risk. This is a textbook design partner scenario: real clients, real revenue at stake, real comparison data.

**Duration:** 90 days minimum (one quarter provides sufficient data collection for signal evaluation).

**Commitment from the design partner:**
- Route 3–5 real clients per week through the Savspot booking page
- 10-minute weekly check-in (voice note, text, or whatever is natural)
- Flag friction points in real-time (screenshot + text is fine)

**Commitment from Savspot:**
- Import the partner's data before day one (clients, services, availability)
- Respond to feedback within 24 hours
- Ship at least one fix or enhancement per week based on their input
- Be transparent about what is not yet built

**Compensation:** Free access, plus genuine product influence. The design partner's name should appear in Savspot's early adopters acknowledgment, and their input should visibly shape the roadmap.

### 4.3 The Parallel-Run Architecture — Google Calendar as the Bridge

The technical core of making the parallel run work without double-bookings. Booksy's calendar limitations actually make Google Calendar the natural coordination layer.

**Booksy's Calendar Integration Reality:**
Booksy allows importing an external Google or Apple calendar as a one-time .ics file upload. For outbound sync, Booksy exports appointments to Google Calendar — but with a critical limitation: it does not offer true two-way sync. Appointments placed in Google Calendar do not flow back into Booksy. Booksy operates as a closed system with no outbound API, no webhooks for real-time calendar sync, and no native bidirectional sync capability.

**The Bridge Pattern:**

```
Booksy → (one-way export) → Google Calendar ← (two-way sync, Phase 1) → Savspot
```

**How it works in practice:**

1. The barber connects his Google Calendar to both Booksy (one-way) and Savspot (two-way per FR-CAL-10 through FR-CAL-15)
2. When a client books through Booksy, the appointment appears in Google Calendar via Booksy's outbound export
3. Savspot's INBOUND sync cycle picks up that Google Calendar event as an INBOUND block (`calendar_events.direction = INBOUND`)
4. Savspot shows that time slot as unavailable, preventing double-booking
5. When a client books through Savspot, the appointment syncs to Google Calendar as an OUTBOUND event
6. The barber manually blocks that time in Booksy (Booksy does not read from Google Calendar automatically)

**Step 6 is intentionally manual.** Booksy's closed architecture makes programmatic back-sync impossible. For a parallel test with 3–5 Savspot bookings per week, daily manual blocking in Booksy is manageable — and the friction of doing so is part of the value signal. At higher volumes, this manual step becomes untenable, which is exactly the point at which the parallel run should convert to a full switch.

**Latency:** Booksy's export delay + Savspot's 15-minute sync cycle = roughly 20–45 minutes before a Booksy appointment appears as blocked in Savspot. For appointments typically booked hours or days in advance, this latency is acceptable. The double-booking risk window is small.

**Implementation dependency:** This bridge requires FR-CAL-10 through FR-CAL-15 to be Phase 1 (not Phase 2 as originally planned). Two-way calendar sync is the infrastructure that makes the parallel run viable. See PRD §3.3 for the updated requirement phases.

### 4.4 The Data Import — Making Day One Feel Populated

A design partner logging into an empty dashboard with zero clients and zero services cannot meaningfully compare anything. The import is what makes the parallel run evaluative rather than theoretical.

**Pre-Launch Data Gathering:**

1. Have the partner request their client list CSV from Booksy support (email info.us@booksy.com)
2. Request appointment history CSV from Booksy support
3. Manually transcribe their service menu from their public Booksy booking page (service names, durations, prices)

**Day-One Import (Phase 1 — Admin Performs on Behalf of Partner):**

Phase 1 import is a CLI script (FR-IMP-1): accepts a CSV file plus a platform identifier, auto-maps known column schemas for Booksy/Fresha/Square/Vagaro, and imports with duplicate detection. No UI required for Phase 1. This is sufficient for onboarding the barber and the initial soft-launch cohort.

**What the barber sees on first login:** Their actual client list, their actual services, and their actual availability. The comparison is immediately meaningful. Empty state is avoided.

**Phase 2 — Self-Service Import Wizard (FR-IMP-2):**

Phase 2 adds a self-service import UI: file upload → column mapping screen (pre-filled for known platforms, manual override for generic CSV) → preview → confirm → background processing via BullMQ. This is a genuine differentiator — every competitor handles imports through their support team (GlossGenius, Glamiris, Goldie, Fluum, Bookedin all require emailing files to support for manual import). Self-service import is aligned with the <5 minute onboarding principle.

### 4.5 Activation Chain — Engineering the "Aha" Moment

For a booking platform, the activation moment is bilateral: it requires both the business owner AND a client to complete the loop. The aha moment only arrives when a real client successfully books through the platform and shows up for their appointment.

**The Seven-Link Chain:**

**Link 1: Populated Account (pre-activation, performed by Savspot)**
Import clients and services. Connect Google Calendar. Set availability. When the barber logs in for the first time, Savspot looks like his business, not an empty template.

**Link 2: The Booking Page Looks Professional (within 5 minutes)**
He opens savspot.co/{slug} on his phone and shares it with a client. The page needs: business name prominently displayed, service list with prices and durations, available time slots, professional visual design. His actual data presented cleanly. If the page looks amateur compared to his Booksy profile, he will not share it again.

**Link 3: A Client Successfully Books (within first week)**
One of the 3–5 test clients clicks the link, selects a service, picks a time, and confirms. This is the bilateral activation event. The client receives immediate confirmation (email + SMS). The barber receives a real-time notification.

**Link 4: The Barber Sees the Booking Appear (within seconds)**
The booking must appear on his Savspot calendar and sync to Google Calendar. Any lag erodes trust in the system as a reliable parallel tool.

**Link 5: The Client Gets a Reminder (24 hours before)**
The automated reminder fires. The client shows up. This closes the loop and proves end-to-end notification reliability.

**Link 6: The Barber Processes the Appointment (on the day)**
He marks the booking complete. Optionally processes payment if Stripe is connected. One-tap completion from the calendar view.

**Link 7: The Barber Compares (after 2–3 completed bookings)**
He forms his opinion. This is where his first substantive feedback emerges. Links 1–6 must be flawless so that Link 7 produces a positive comparison.

### 4.6 The Phone-First Reality

A barber's day is structured around clients in his chair. Every interaction with a booking platform happens on his phone, in stolen moments between clients. The Admin CRM mobile web experience must go beyond "doesn't break on a phone":

- **Glanceable calendar view** (FR-CRM-27): Next 3–4 appointments in a chronological list — client name, service, time — visible in under 1 second. Not a full calendar grid.
- **One-tap quick actions** (FR-CRM-28): Mark arrived, mark completed, add walk-in — achievable in a single tap from the list view, not buried in navigation.
- **Browser push notifications** (FR-NOT-6): When a client books through savspot.co/{slug}, the barber receives an immediate browser notification on his phone. Without this, Savspot feels silent compared to Booksy's native push notifications.
- **Offline-tolerant calendar view**: Cache the last-synced schedule and display it even when connectivity drops, with a "last synced X minutes ago" indicator.

### 4.7 Minimizing the Two-App Tax

The two-app tax: in a parallel run, the barber has to check two apps. The natural default is whichever he opens out of muscle memory — Booksy. Savspot must become the path of least resistance for specific tasks:

- **Google Calendar as source of truth for his day**: Savspot's value is in enrichment — client context, preferences, notes — not in competing for "primary calendar" status. He checks Google Calendar for the schedule; he checks Savspot for CRM data Booksy lacks.
- **Morning summary notification** (FR-COM-10): At a configurable time each morning (default 7:30 AM), Savspot sends an SMS: "Today: 3 bookings via Savspot. Next: Marcus Williams at 9:00 AM (Standard Fade, 45 min)." This proactive outreach means he does not have to remember to open Savspot.
- **Weekly comparison digest** (FR-COM-11): "This week on Savspot: 4 bookings, $180 revenue, 0 no-shows. Your booking page was viewed 12 times." Makes the migration journey visible and tangible.

---

## 5. Concierge Launch Playbook

This section defines the tactical sequence for acquiring the first 5–10 users from the founder's personal network. It operationalizes the PVD §8a signal-first soft launch strategy with specific outreach, demo, onboarding, and referral mechanics.

The approach is modeled on the "Collison installation" — Stripe's founders would physically set up Stripe for users on the spot rather than sending them a signup link. At 5–10 users, white-glove onboarding for every user is the highest-converting early-stage tactic, not a scaling limitation.

**Each installation is also a sales skill rep.** The playbook is not just a launch tactic but a structured skill acquisition program for the founder's least developed professional dimension (distribution/sales). Each of the steps below — discovery conversation (§5.1), demo and objection handling (§5.2), activation monitoring (§5.3), referral ask (§5.4) — maps to a core sales cycle competency. Ten installations across multiple verticals and contact types (Group A greenfield, Group B conversion) produce a compressed learning loop: make the pitch, observe the reaction, adjust, repeat. The founder enters this loop with self-awareness about his starting point and tolerance for iteration — the first demo will not be polished, and that is acceptable. What matters is the learning rate across 10 reps, not the quality of rep 1.

### 5.1 Pre-Phase 1: Demand Validation

**Goal:** Confirm that >=5 contacts will try Savspot before Phase 1 is complete. This pre-validates demand against the PVD §8a fallback threshold.

**Outreach method:** Individual text or DM to each contact. Not mass messaging. Calibrated to their situation:

**For Group A contacts (using nothing formal — greenfield personas):**
Frame around the value of having a professional booking page, free, set up by the builder. Reference LifePlace as credibility evidence ("I already built one for a venue business that's live").

**For Group B contacts (frustrated with current platform — conversion personas):**
Frame around running alongside their current tool with zero switching risk. Emphasize data import and the parallel-run architecture. Reference LifePlace as credibility evidence.

**For Marcus (confirmed design partner):**
Follow the design partner protocol (§4) as specified. The seven-link activation chain (§4.5) and signal collection framework (§8) are the governing structures.

**Response tracking:** If <5 contacts respond positively, the PVD §8a fallback trigger activates: "the positioning needs revision before investing in development beyond Phase 1."

### 5.2 The 15-Minute Demo + Collison Installation

When a contact agrees to see Savspot, the founder goes to their shop or salon in person. The demo follows a structured framework:

**Minutes 1–3: Discovery (not product).**
Ask: "Walk me through what happens when a client wants to book with you right now." Listen. Write down their exact words — these become marketing copy and competitive intelligence.

**Minutes 3–10: Show, don't tell.**
Show only 2–3 features on the contact's phone. Use THEIR business name, THEIR services, THEIR actual schedule (pre-loaded from demo data or imported data). For a barber: (1) client books online, (2) barber gets a notification, (3) day's schedule at a glance. For a nail tech: same, with emphasis on service duration accuracy and no-show reduction via reminders.

**Minutes 10–12: The "aha" moment.**
Show one thing they cannot do with their current setup. For Group A (using nothing): "See this? When a client books, they automatically get a confirmation. No more back-and-forth texting." For Group B (on Booksy/Fresha): "See this? Your client preferences are right here on the appointment view — Booksy doesn't surface this."

**Minutes 12–15: The Collison installation.**
"Want me to set this up for you right now?" Then do it: build their profile, add services, set availability, configure their booking page, generate their savspot.co/{slug} link, and text it to them on the spot. Have them book a test appointment from their own phone to see the client experience.

For Group B contacts (migrating from a platform), also import their client list: "Forward me the CSV from Booksy/Fresha and your clients will be in Savspot by tomorrow."

### 5.3 Activation Monitoring

After onboarding, the founder is the nurture sequence. Personal follow-up replaces automated drips at this scale:

- **Day 1:** "How did it go? Any clients book yet?"
- **Day 3:** "Noticed you added 3 services — looking good." (Reflects real usage data)
- **Day 7:** "Any questions? How are clients reacting to the link?"

**Behavioral signals that supersede verbal feedback:**

The design partner strategy (§4, §8) already acknowledges friend bias ("discount it by ~30% for market reality"). At this stage, behavioral data is the primary signal; verbal feedback is secondary. Apply the "Mom Test" framework — ask about specific past behaviors, not hypothetical futures. Seek the "no" deliberately:

- "What would make you NOT use this?"
- "If you had to pick the worst thing, what is it?"
- "Where did you get confused or stuck?"

See §8.6 for the full behavioral vs. sentiment signal framework.

### 5.4 The Referral Ask

For each user showing real engagement (logging in, processing bookings, sharing their link), make a direct referral ask at or after week 4:

"Do you know any other [barbers/stylists/nail techs] who deal with the same scheduling headaches? I'll set them up for free too. Just text me their number or have them reach out."

**Referral mechanics at this stage:**

- No referral software. Track referrals in a spreadsheet.
- No cash incentive. At 5–10 users, personal goodwill and product quality drive referrals, not incentive programs.
- The `referral_links` table (SRS-2, Phase 3) and FR-CRM-25 (referral link management) are the correct time to formalize. For now, a text message and a spreadsheet is sufficient.
- When Savspot has premium features (Phase 2+), double-sided non-cash incentives (e.g., free month of premium for both referrer and referee) should be evaluated.

---

## 6. Distribution Channels

### 6.1 Organic Viral Loop (Phase 1+)

The primary distribution mechanism is specified in PVD §8a:

1. **Booking link viral loop:** Every business that shares their savspot.co/{slug} URL exposes Savspot to their entire client base. Each completed booking is a product impression.
2. **Client account portability:** Clients who book through one business discover Savspot as a platform. A single client account works across all businesses (BRD BR-RULE-4), creating cross-pollination.
3. **Zero-friction supply-side:** Free software with no credit card required means word-of-mouth among business owners has no conversion barrier.

**Phase availability of each booking source (BRD §3 BR-RULE-2, PRD):**

| Source | Phase | Commission-Eligible |
|---|---|---|
| DIRECT | Phase 1 | No |
| WALK_IN | Phase 1 | No |
| WIDGET | Phase 2 | No |
| REFERRAL | Phase 3 | Yes (first booking only) |
| API | Phase 3 | Yes (first booking only) |
| DIRECTORY | Phase 4 | Yes (first booking only) |

**The leading indicator** (PVD §7): Unprompted booking page sharing — businesses putting their savspot.co/{slug} in Instagram bio, email signature, or website without being asked. This is the earliest organic signal that the product is delivering enough value to earn word-of-mouth.

### 6.2 Competitor Comparison Content (Post-Launch)

Savspot's document set contains detailed competitive intelligence (PVD §5, BRD §1-3, savspot-validation-analysis.md §2.2-2.3) that is not externalized into marketing content. Comparison pages rank for high-intent searches ("[competitor] alternatives") and convert at 5-10x the rate of general informational content.

**Recommended comparison pages, in priority order:**

**Page 1: "Savspot vs Booksy" (first, targeting Marcus's exact use case).**

| Cost Component | Booksy ($29.99/mo) | Savspot (Free) |
|---|---|---|
| Monthly subscription | $29.99 | $0 |
| New client commission | Boost fees (variable, charged even on no-shows per competitor research) | $0 on DIRECT / WALK_IN bookings (BRD BR-RULE-2) |
| Payment processing | Included in subscription | ~3.9% + $0.30 via Stripe Connect (BRD BR-RULE-3) |
| Provider SMS notifications | Limited | Included (FR-COM-2a, Phase 1) |
| Data export | Closed ecosystem — must email support for CSV | Open architecture — data portability as a core value |
| API access | None (no outbound API, no webhooks) | Phase 3: MCP server + public API (FR-API-1 through FR-API-8) |

**Page 2: "Savspot vs Fresha"** — emphasize no hidden 20% commission on "new" clients (Fresha charges 20% commission on marketplace-sourced first bookings, minimum $6 per booking; savspot-validation-analysis.md §2.2), no $9.95/team member fee, predictable monthly cost.

**Page 3: "Savspot vs Square Appointments"** — emphasize booking-specific depth vs. general POS breadth, client CRM with preferences (FR-CRM-29), walk-in management (FR-BFW-18).

**Page 4: "Savspot vs Vagaro"** — emphasize modern UI, AI-native architecture, zero subscription.

Each page: feature comparison table + interactive cost calculator + "Import your data in 5 minutes" CTA referencing the import pipeline (FR-IMP-1).

**Timing:** Post-launch, after Phase 1 is stable and at least one real user can be referenced. One page at a time, starting with Booksy.

### 6.3 Build-in-Public (Two Narratives)

The founder is open to building in public but wants the product to speak for itself. The founder is also experimenting with a novel hybrid AI development workflow (Claude + Qwen3 + OpenClaw on a gmktec evo x2) that is a legitimate content angle. These are two separate narratives for two separate audiences.

**Narrative 1: Developer/AI Audience.**

**Channels:** Twitter/X, Reddit (r/LocalLLaMA, r/SaaS, r/SideProject), Hacker News, LinkedIn.

**Story:** "I shipped a ~543K LOC production booking system (805 commits) in 6 months with Claude Code alone. Now I'm building a multi-tenant SaaS using a hybrid pipeline — Claude for complex reasoning, Qwen3 for fast iteration, OpenClaw for autonomous tasks — running on a gmktec evo x2. Here is what I've learned about orchestrating multiple AI models for production development."

**Content types:** Workflow architecture, model comparisons on the same task, edge hardware performance data, development velocity metrics, honest failures and course corrections.

**Distribution value:** Developer communities are the earliest adopters of new tools. People who follow the dev workflow story may know service business owners, or may be building their own service businesses (the Priya greenfield persona, PVD §4). It generates backlinks to savspot.co, builds domain authority for SEO, and creates a halo effect. The product speaks for itself when people click through.

**Narrative 2: Customer Audience.**

**Channels:** Instagram (where barbers and stylists live), local Facebook groups.

**Story:** Let users tell it. Once Marcus or another early user has been on Savspot for 4–6 weeks, ask to record a 60-second video testimonial: them showing their booking page, their schedule, saying what changed.

**Distribution value:** One authentic practitioner testimonial is the most effective social proof for service business owners. This narrative does not launch until at least one genuine user story exists.

**Social proof bootstrapping sequence:**

| Timeline | Action |
|---|---|
| Months 1–3 (design partner) | 1 deep case study + video testimonial from Marcus |
| Months 3–6 (soft launch cohort) | 3–5 written testimonials + G2/Capterra reviews from cohort members |
| Month 6+ | Referral program activation with non-cash incentives |

### 6.4 AI Agent Distribution (Phase 3+)

Specified in PVD §8a and SRS-2 §14 (Public API v1, Phase 3) and SRS-2 §16 (MCP Server, 6 tools). AI agents discover and book through Savspot programmatically. This is the zero-marginal-cost distribution channel.

**Current MCP ecosystem status** (savspot-validation-analysis.md §6.1): MCP SDK downloads reached 97M+ monthly by late 2025, governed by Linux Foundation, backed by Anthropic, OpenAI, Google, Microsoft. No booking SaaS competitor has shipped an MCP server yet — Savspot is a potential first-mover (savspot-validation-analysis.md §6.3).

**Timing:** Phase 3 (Months 4–6). Not a Phase 1 distribution channel. The PVD §5 correctly states: "Phase 1-2 marketing should not lead with AI claims."

### 6.5 Platform Directory (Phase 4)

Consumer-facing marketplace for business discovery. Gated on >200 businesses with published booking pages (PVD §9). Bookings from the directory are tagged `source = DIRECTORY` and are commission-eligible (BRD BR-RULE-2).

**Not a factor for the launch strategy.** The directory is a scale channel, not a cold-start channel.

---

## 7. Soft Launch Cohort Composition

Updated from PVD §8a to incorporate the design partner, personal network contacts, and segment sequencing:

| Slot | Type | Persona | Segment | What It Tests |
|---|---|---|---|---|
| 1 | Barber (confirmed design partner) | Marcus — established, switching from Booksy | Segment 1 (independent) | Parallel-run, import pipeline, calendar bridge, barber vertical, conversion readiness |
| 2–3 | Other barbers in same shop (opportunistic) | Marcus variant — same vertical, word-of-mouth | Segment 1 → 2 transition | Multi-provider within single tenant, land-and-expand dynamics, viral within a single workplace |
| 4–5 | Different vertical — nail techs, salon owners | Mixed: Group A (greenfield) or Group B (conversion) | Segment 1 (independent) | Cross-vertical validation, import from different platform or onboarding from zero |
| 6–7 | Greenfield (new business, no prior booking tool) | Priya — first-time owner, AI-native | Segment 1 (independent) | Greenfield thesis validation (PVD §8a), onboarding friction measurement, sharing behavior comparison |
| 8–10 | Opportunistic (whoever expresses interest) | Mixed | Mixed | Volume, diversity, unexpected use cases |

The barber design partner is Slot 1 because he provides the deepest, most structured feedback. Slots 2–3 test the land-and-expand model within a single shop. Slots 4–5 test cross-vertical applicability with the founder's personal network. Slots 6–7 test the greenfield thesis. Slots 8–10 provide optionality.

**Critical measurement:** Track greenfield users (Slots 6–7) separately from conversion users (Slots 1–5). Compare: onboarding completion time, time-to-first-booking, unprompted sharing behavior, 30-day retention, support ticket volume and type. If greenfield users adopt faster and share more readily, the greenfield thesis (PVD §8a) is validated and should shape all subsequent acquisition strategy. If they do not, the distribution strategy reverts to the conversion playbook. (See savspot-validation-analysis.md §10.)

---

## 8. Signal Collection Framework

### 8.1 Leading Indicators (Weeks 1–4)

- Does the partner check Savspot unprompted, or only when reminded?
- Does he route *more* than the agreed 3–5 clients, or stick to the minimum?
- Does he mention Savspot to other barbers at the shop without being asked?
- What does he reach for that is not there? (Phase 2 prioritization data)

### 8.2 Conversion Indicators (Weeks 4–8)

- Does he start preferring Savspot for any specific task (checking schedule, viewing client notes, adding services)?
- Does he express frustration at maintaining two systems, and in which direction? ("I wish I could just use Savspot" vs. "This is too much work, I'll stick with Booksy")
- Does he share his savspot.co/{slug} link with clients outside the 3–5 test group?

### 8.3 The Kill Question (Week 8–12)

Ask: "If Savspot had everything you needed, would you cancel Booksy tomorrow?" Listen for hesitation. Immediate yes = product-market fit for the conversion persona. Hesitation = the reason is the roadmap.

### 8.4 The Shop-Expansion Signal

If other barbers in the shop ask about Savspot, that is the strongest possible signal — word-of-mouth within a single workplace, the smallest possible viral loop. Even one additional barber wanting to try it provides multi-provider validation within a single tenant.

### 8.5 No-Show Rate Tracking

No-shows are a top-3 decision factor in barbershop software evaluations. Track Savspot booking no-show rates vs. the barber's reported Booksy no-show rate. If Savspot demonstrates measurable improvement through better reminder timing, add-to-calendar integration, and card-on-file requirements, this alone could justify switching.

### 8.6 Behavioral vs. Sentiment Signals

Friend bias is a documented risk (§13). Behavioral signals always supersede verbal feedback:

| Behavioral Signal | What It Means | How to Track |
|---|---|---|
| Logs in daily/weekly | Real usage | Server-side session logs |
| Shares booking link unprompted | The #1 leading indicator (PVD §7) | Booking source attribution — bookings from unknown referral paths |
| Routes real clients through Savspot | Product-market fit | Booking volume per week |
| Tells another provider without being asked | Organic referral | Ask in weekly check-in |
| Stops texting clients to schedule | Workflow replacement | Ask in weekly check-in |
| Does NOT log in after week 1 | Churn risk — investigate immediately | Server-side session logs |
| Pays for premium feature (Phase 2+) | Willingness to pay validated | Stripe subscription event |

**Questions that defeat friend bias (adapted from The Mom Test framework):**

| Bad Question (Invites Bias) | Good Question (Reveals Truth) |
|---|---|
| "Do you like my booking app?" | "Walk me through how you handle bookings today." |
| "Would you pay for this?" | "How much are you paying for Booksy right now?" |
| "Is this useful?" | "When was the last time you used [feature]? What happened?" |
| "Would you recommend this?" | "Have you told anyone else about it? Who?" |
| "What do you think of the design?" | "Where did you get confused or stuck?" |

---

## 9. The Client-Side Booking Experience

### 9.1 Conversion Requirements for the Barber's Clients

The barber's activation depends on his clients' experience. If a client clicks savspot.co/{slug} and bounces, the barber never gets the booking that triggers his activation.

- **Load in under 2 seconds on mobile** (NFR-PERF-1 already specifies < 2s FCP)
- **No account required to book** (FR-BFW-17 guest checkout)
- **Three-tap booking flow**: select service → select date/time → confirm with contact info
- **Immediate confirmation**: booking confirmation screen + simultaneous email + SMS
- **Add-to-Calendar prompt** (FR-BFW-10 already specifies .ics download)

For a solo barber, the provider selection step is auto-skipped entirely (data presence is configuration — one provider means no provider step).

### 9.2 Social Link Architecture

Barbers acquire clients primarily through Instagram. The conversion funnel is: Instagram post → profile visit → link-in-bio click → booking page → confirmed appointment.

- **savspot.co/{slug} must be short, memorable, and shareable.** The slug should be customizable (FR-ONB-8): "savspot.co/kings-barbershop" rather than an auto-generated identifier.
- **Open Graph meta tags** (FR-BP-6 already specified): when the barber shares his Savspot link in a DM or iMessage, the preview shows business name, a brief description, and logo/cover photo. A bare URL link looks unprofessional against Booksy's rich link previews.
- **Reserve with Google** (Phase 4): Multiple barbershop platform reviews highlight direct booking from Google Search and Maps as a significant client acquisition feature. Plan architecturally even if not Phase 1.

### 9.3 The Social Proof Gap

The barber has reviews on Booksy. Those reviews drive client confidence. Savspot has zero reviews on day one. This is not solvable through migration — Booksy reviews are not exportable.

**Mitigation:**
- After each completed booking, the `processPostAppointmentTriggers` job (SRS-4 §40) sends a review request email 2 hours after completion (FR-COM-4, Phase 1). The full review management UI (FR-CRM-24) and client-side review submission (FR-CP-11) ship in Phase 2.
- Display reviews on the booking page once Phase 2 review features are live — even 1–2 reviews transform a blank booking page.
- Phase 2: Display Google Business Profile rating on the Savspot page as external social proof.

---

## 10. Notification Architecture for Parallel-Run Success

In a parallel-run, the platform that communicates better wins. Booksy sends push notifications for every booking, reminder, and cancellation. If Savspot is silent between sessions, the barber will forget it exists.

### 10.1 Provider Notification Map

| Event | Channel | Timing | Content |
|-------|---------|--------|---------|
| New booking | SMS + browser push | Immediate | "{Client} booked {Service} at {Time} on {Date}" |
| Booking cancelled | SMS + browser push | Immediate | "{Client} cancelled their {Time} appointment" |
| Morning summary | SMS | 7:30 AM (configurable) | "Today: {N} bookings. Next: {Name} at {Time}" |
| Weekly digest | Email | Monday morning | Week summary: bookings, revenue, page views |
| New review | Email | Within 1 hour | "{Client} left a {N}-star review" |
| Payment received | SMS | Immediate | "Payment: ${Amount} from {Client} for {Service}" |

**Critical design decision:** SMS for time-sensitive provider events is Phase 1, not Phase 2. Without it, Savspot feels silent compared to Booksy's native push notifications, and the parallel-run comparison is immediately unfavorable. See PRD §3.6 (FR-COM-2a) for the updated phase.

### 10.2 Client Notification Map

| Event | Channel | Timing | Content |
|-------|---------|--------|---------|
| Booking confirmed | Email + SMS | Immediate | Confirmation with date, time, service, address, add-to-calendar link |
| Reminder | SMS | 24 hours before | "Reminder: {Service} with {Business} tomorrow at {Time}" |
| Second reminder | SMS | 2 hours before | "Your appointment at {Business} is in 2 hours" |
| Review request | Email + SMS | 2 hours after completion | "How was your {Service}? Rate your experience" |
| Rebooking prompt | Email + SMS | 2 hours after completion | "Book your next {Service} — [link pre-populated with same service]" |

---

## 11. Architectural Enhancements Revealed by the GTM Strategy

The following architectural additions to Savspot are directly motivated by the design partner scenario and broader GTM requirements. Each has been incorporated into the corresponding PRD and SRS documents.

### 11.1 Data Import Pipeline

**Documents updated:** PRD §3.13 (FR-IMP-1 through FR-IMP-5), SRS-2 §13a (`import_jobs`, `import_records` tables)

Self-service import with platform-specific column profiles (Booksy, Fresha, Square, Vagaro, Mindbody, CSV_GENERIC, JSON_GENERIC — per SRS-2 §13a `import_jobs.source_platform` enum). Phase 1: CLI script. Phase 2: self-service wizard with preview and background processing. Deduplication by email (primary) or phone (secondary): merge empty fields, preserve existing data.

### 11.2 Calendar Bridge Enhancement

**Documents updated:** PRD §3.3 (FR-CAL-10 through FR-CAL-15 moved to Phase 1; FR-CAL-16 added), SRS-3 §6 (INBOUND blocking)

Two-way Google Calendar sync is Phase 1, not Phase 2. INBOUND calendar events (`calendar_events.direction = INBOUND`, `booking_id = null`) participate in the availability resolver as hard blocks, identical to Savspot bookings. Client sees "Unavailable" — no distinction between Savspot bookings and external calendar blocks.

The iCal feed export (FR-CAL-16, Phase 2) exposes each tenant's booking calendar as `https://api.savspot.co/ical/{tenant_slug}/{provider_slug}.ics`. Enables platforms that support iCal import (including Booksy's one-time .ics import) to pull Savspot bookings. Feed includes: event summary (service name), start/end times, BUSY status. No client PII in the feed.

### 11.3 Walk-In Booking Support

**Documents updated:** PRD §3.2 (FR-BFW-18), SRS-2 §4 (`bookings.source` enum adds `WALK_IN`), SRS-3 §2 (booking state machine)

Walk-in bookings are a fundamental barbershop pattern. A new `WALK_IN` source value is added to the `bookings.source` enum. Walk-in bookings bypass the reservation token flow and the PENDING state, entering CONFIRMED directly from a Quick-Add action in the calendar view. No confirmation email or reservation hold — the booking is already happening. The Quick-Add action (FR-CRM-28) allows staff to tap a time slot on the calendar, select the service, optionally select or create the client, and create the booking instantly.

This is consistent with progressive complexity: businesses that do not do walk-ins never see the Quick-Add button (the UI respects the service configuration context).

### 11.4 Provider-Service Assignment (Multi-Barber Shop)

**Documents updated:** PRD §4.4 (FR-CRM-30), SRS-2 §6a (`service_providers` join table)

In a multi-barber shop, each barber has their own service specialties. A `service_providers` join table enables: this barber offers fades and beard trims, that barber offers hot towel shaves. The booking flow filters providers by the selected service. A solo barber (one implicit provider) never sees the provider selection step — data presence is configuration.

This is Phase 2 because the barber design partner is solo, but the data model ships in Phase 1 so multi-barber expansion can begin without migration when shop colleagues join.

### 11.5 Client Preferences

**Documents updated:** PRD §4.4 (FR-CRM-29), SRS-2 (`client_profiles.preferences` JSONB)

Barbers remember their regulars' preferences. A `preferences` JSONB column on the `client_profiles` table stores structured preference data (hair type, preferred style, product allergies, custom notes). Visible to the barber on the appointment view when he taps a booking — he sees client name, service, time, AND their preferences in context. This is competitive intelligence Booksy does not surface as effectively. Phase 1 scope: store and display. Phase 2: template-guided preference capture.

### 11.6 Product Feedback System (Separate from Support)

**Documents updated:** PRD §3.14 (FR-FBK-1 through FR-FBK-3), SRS-2 §12b (`feedback` table)

A `feedback` table is distinct from `support_tickets`. Support is "something is broken." Feedback is "I wish this existed" or "this workflow feels wrong." The `COMPARISON_NOTE` type is specifically valuable during parallel runs: when the partner reports "Booksy does X better," that is competitive intelligence from the field, not a bug report.

In-app implementation: a persistent "Give Feedback" widget (floating button) in the Admin CRM sidebar. One tap → select type → write → optionally attach screenshot → submit. No ticket number, no formality. This should feel like texting, not filing a support ticket.

### 11.7 Migration Readiness Dashboard ("Switch Score")

**Documents updated:** PRD §4.4 (FR-CRM-31)

A Phase 2–3 read-only dashboard answering "what is left before I can cancel Booksy?" Metrics include: client coverage (% of imported clients who have booked through Savspot), service coverage (all services configured), calendar connection status, Stripe Connect onboarding status, and booking volume trend. All data already exists in the schema — this is an aggregation layer, not new infrastructure. Designed now so data structures are ready when the feature ships.

### 11.8 Rebooking Prompt

**Documents updated:** PRD §3.2 (FR-BFW-19), SRS-4 §40 (post-appointment job — `processPostAppointmentTriggers`)

Barber clients typically return every 2–4 weeks. After a booking is marked COMPLETED, the post-appointment follow-up email/SMS includes a "Book your next appointment" link pre-populated with the same service and provider (URL parameters deep-link to savspot.co/{slug} with service pre-selected). This is the 80% solution for recurring bookings — it does not auto-book but reduces re-booking to a single tap. Full recurring booking automation (configurable frequency, automatic hold) is Phase 2 scope.

**Note:** PVD §12 previously listed "Recurring bookings" as out of scope for v1. This has been updated to clarify the distinction: rebooking *prompt* (Phase 1) vs. full recurring *automation* (Phase 2). The prompt is not a recurring booking feature — it is a post-appointment communication enhancement.

---

## 12. Implementation Sequence

### Before Phase 1 Ships

1. **Demand validation outreach** — text 5–8 contacts to gauge interest (§5.1)
2. **Landing page** at savspot.co with email capture (§2.3)
3. **Determine shop dynamics** for Marcus's workplace (§2.2)
4. **Categorize contacts** into Group A (greenfield) vs Group B (conversion) (§3.1)
5. Request Booksy data export from design partner (client CSV + appointment history)
6. Transcribe service menu from Booksy booking page
7. Use the real CSV to validate the import column mapping
8. Begin capturing dev workflow notes for build-in-public content (§6.3)

### During Phase 1 Development (incorporated into PRD phases)

9. Build MVP import as CLI script (FR-IMP-1)
10. Ensure INBOUND calendar events participate in availability resolution (SRS-3 §6)
11. Add WALK_IN booking source with Quick-Add from calendar view (FR-BFW-18, FR-CRM-28)
12. Add provider SMS for new bookings (FR-COM-2a)
13. Add browser push notifications for Admin CRM (FR-NOT-6)
14. Add morning summary SMS (FR-COM-10)
15. Add in-app feedback widget (FR-FBK-1)
16. Move FR-CAL-10 through FR-CAL-15 to Phase 1

### Phase 1 Launch Day with Design Partner

17. Import client list and services
18. Connect Google Calendar (bridge sync)
19. Set availability, configure services, generate booking page
20. He shares savspot.co/{slug} with 3–5 clients. Parallel run begins.

### Weeks 1–4: Concierge Onboard Remaining Cohort

21. Demo + Collison install for each additional contact (§5.2)
22. Personal follow-up at day 1, 3, 7 for each user (§5.3)
23. Monitor behavioral signals (§8.6)
24. Begin build-in-public content (Narrative 1, §6.3) if ready

### Phase 2 Refinements (Informed by Feedback)

25. Self-service import wizard UI (FR-IMP-2)
26. iCal feed export (FR-CAL-16)
27. Migration Readiness dashboard (FR-CRM-31)
28. Provider-service assignment UI (FR-CRM-30)
29. "Savspot vs Booksy" comparison page (§6.2)
30. G2/Capterra review solicitation from soft launch cohort (§6.3)
31. First video testimonial from design partner (§6.3)
32. Whatever the top 3 feature requests turn out to be

---

## 13. Risk Acknowledgment

**Friend bias:** His tolerance for bugs and missing features will be higher than a stranger's. Calibrate signal accordingly — if he struggles, strangers will struggle much more. If he is enthusiastic, discount it by ~30% for market reality. Behavioral signals (§8.6) always supersede verbal feedback. Include at least one non-friend contact in the soft launch cohort if possible.

**Barber vertical trap:** Over-optimizing for barbershop workflows risks building a barber app instead of a universal booking platform. Use barber feedback to validate universal patterns (scheduling, payments, CRM) and be cautious about barber-only features. The progressive complexity principle is the guardrail: if a feature only benefits barbers, it should be activated by data presence, not by a vertical flag. Include at least one non-barber (nail tech, salon owner) in the first 5 users.

**Scope creep:** A design partner will generate more feature requests than can be built. Establish a parking lot from day one. The `feedback` table's `ACKNOWLEDGED → PLANNED → SHIPPED → DECLINED` lifecycle gives a structured way to say "great idea, not yet" without losing the signal.

**Parallel-run duration:** If it runs too long, he will settle into "Booksy is primary, Savspot is the thing I check sometimes." Set a milestone at week 8: either he is routing >=50% of new bookings through Savspot, or understand why not. The answer is the Phase 2 roadmap.

**Thin contact pool:** 5–10 reachable contacts against the PVD §8a fallback threshold of <5 leaves limited buffer. The founder is confident that personal network contacts will at least try the product when asked directly — the ask is personal, low-commitment, and backed by a live demo (§5.2) rather than an abstract pitch. Pre-validate interest (§5.1) before Phase 1 is complete as the objective check. If <5 say yes despite personal relationships, the positioning has a fundamental problem that more polish will not solve.

**Solo operator bandwidth:** White-glove onboarding for every user plus building Phase 2 simultaneously creates time pressure. Cap active design partners at 3 with weekly check-ins. Others get setup + async support (personal text, not scheduled calls).

**LifePlace timeline conflict:** LifePlace is on a separate timeline. If both projects demand attention simultaneously, prioritize based on which produces revenue-relevant signal faster. Savspot's soft launch is the critical path for market validation.

**Distribution as learning objective:** Distribution and sales is the founder's least developed professional dimension. This is acknowledged explicitly, not defensively. Technical execution is thoroughly proven (LifePlace: 805 commits, 122 models, ~543K LOC; published patent US20250140075A1; UCSD CS degree). Distribution skill is learnable through structured repetition, and the concierge playbook (§5) provides exactly that structure. The aggregate risk profile for distribution is reframed from "primary threat to the project" to "known training cost that the project is designed to address." The first 10 installations are the training reps. The 10-to-100 user transition is the hardest unsolved problem, but it is explicitly deferred to be solved by the learning from those first 10 reps. The floor outcome (§14) is career-valuable regardless of SavSpot's ultimate scale.

---

## 14. Floor Outcome Analysis

Even at minimum scale — fewer than 50 users, no significant revenue — the SavSpot execution produces outcomes that are career-valuable independent of the product's market trajectory:

| Outcome | Evidence Produced | Career Value |
|---|---|---|
| Multi-tenant SaaS architecture | Production codebase: NestJS + Prisma + PostgreSQL RLS, PaymentProvider abstraction, TypeScript monorepo with shared Zod schemas | Second production platform alongside LifePlace; demonstrates multi-tenant design capability |
| Payment platform integration | Stripe Connect Express implementation, platform fee collection, connected account management | End-to-end payment integration experience with a platform fee model |
| Distribution skill development | 10+ concierge installations, structured sales cycles (discovery, demo, objection handling, activation monitoring, referral ask, closing), documented in this playbook | Documented sales reps; transition from zero distribution experience to structured, repeatable outreach capability |
| Revenue experience | GMV processed, platform fees collected, payment provider reconciliation | Real revenue operations, even at modest scale |
| AI development pipeline | Three-tier AI pipeline (Claude Code + Qwen3 + Open Claw) operating on production codebase | Documented, reproducible AI-augmented development methodology |
| Published specification | 9 internally consistent documents covering business requirements, product requirements, architecture, data model, booking/payment logic, communications/security, GTM strategy, and validation analysis | Portfolio-quality specification work demonstrating system design discipline |

**The floor is not failure.** The floor is a second production platform, payment integration experience, documented sales reps, and a published specification — alongside a UCSD CS degree, a published patent (US20250140075A1), and LifePlace (805 commits, 122 models, ~543K LOC). Distribution skill acquisition happens during the attempt, not only upon achieving scale. The learning from 10 concierge installations is not contingent on those installations converting to 100 users.

---

*Cross-references: PRD §3.2 (FR-BFW-18, FR-BFW-19), §3.3 (FR-CAL-10 to FR-CAL-16), §3.6 (FR-COM-2a, FR-COM-10, FR-COM-11), §3.7 (FR-NOT-6), SRS-2 §14 (Public API v1), SRS-2 §16 (MCP Server), §3.13 (FR-IMP-1 through FR-IMP-5), §3.14 (FR-FBK-1 through FR-FBK-3), §4.4 (FR-CRM-24, FR-CRM-25, FR-CRM-27 through FR-CRM-31), PVD §3 (target market), PVD §4 (Marcus, Priya, Maria, James personas), PVD §5 (competitive landscape), PVD §7 (leading indicator), PVD §8a (soft launch strategy, organic distribution channels, greenfield thesis), PVD §9 (Phase 4 demand gates), BRD §1-3 (revenue model, business rules), BRD §7 (stakeholder success criteria), BRD §8 (constraints), BRD §9 (assumptions), SRS-2 §4 (WALK_IN source), SRS-2 §6a (service_providers), SRS-2 (client_profiles.preferences), SRS-2 §12b (feedback table), SRS-2 §13a (import_jobs, import_records), SRS-3 §2 (walk-in state machine), SRS-3 §6 (INBOUND blocking), SRS-4 §21 (trigger events), SRS-4 §24 (post-appointment job), SRS-4 §40 (background jobs), savspot-validation-analysis.md §1.1 (LifePlace prior art), §2.2-2.3 (competitive landscape), §4.1-4.3 (user validation), §5.1-5.5 (distribution analysis), PVD §10 (development philosophy — distribution as learning dimension), PVD §11 (slow adoption risk — distribution as training cost)*
