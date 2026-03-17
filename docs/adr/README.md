# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for the SavSpot platform. ADRs document significant architectural choices, their context, and consequences.

## Format

Each ADR follows the [Michael Nygard template](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions):

- **Status** — Accepted, Superseded, or Deprecated
- **Context** — Why the decision was needed
- **Decision** — What was decided
- **Consequences** — Positive and negative outcomes

## Index

| # | Title | Status |
|---|-------|--------|
| [0001](0001-shared-db-rls-multitenancy.md) | Shared DB with RLS for multi-tenancy | Accepted |
| [0002](0002-progressive-complexity-nullable-jsonb.md) | Progressive complexity via nullable JSONB | Accepted |
| [0003](0003-one-time-business-presets.md) | One-time business presets (not persistent config) | Accepted |
| [0004](0004-dynamic-booking-step-resolution.md) | Dynamic booking step resolution | Accepted |
| [0005](0005-tenant-context-set-config.md) | Tenant context via `set_config()` | Accepted |
| [0006](0006-bullmq-tenant-in-job-payload.md) | BullMQ workers: tenant ID in job payload | Accepted |
| [0007](0007-stripe-connect-destination-charges.md) | Stripe Connect with destination charges | Accepted |
| [0008](0008-prisma-raw-queries-for-slot-locking.md) | Prisma raw queries for slot locking | Accepted |
