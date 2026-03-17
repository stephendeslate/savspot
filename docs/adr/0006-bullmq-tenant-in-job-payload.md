# ADR-0006: BullMQ Workers — Tenant ID in Job Payload

## Status

Accepted

## Context

SavSpot uses BullMQ for background job processing (email notifications, payment webhooks, scheduled reminders, analytics aggregation). These workers run outside the HTTP request lifecycle, which means:

- There is no HTTP request to extract the tenant ID from (no JWT, no session)
- nestjs-cls (continuation-local storage) is not available — CLS is scoped to the request context
- The Prisma Client Extension that sets `app.current_tenant` via CLS won't have a tenant ID to inject

Without explicit tenant context, background jobs would either bypass RLS (dangerous) or fail to query tenant-scoped data.

## Decision

Every BullMQ job payload must include `tenant_id` as a required field. The worker is responsible for:

1. Extracting `tenant_id` from the job payload
2. Setting the tenant context via `set_config()` before executing any database queries
3. Ensuring the tenant context is set within the same transaction as the queries

Job producers (typically NestJS services within the HTTP lifecycle) must include the current tenant ID when enqueuing jobs.

## Consequences

**Positive:**
- RLS is enforced in background jobs — same data isolation guarantees as HTTP requests
- Explicit tenant propagation is easy to audit — every job payload visibly includes `tenant_id`
- Workers can process jobs for different tenants without connection pool segmentation
- Failed jobs retain their tenant context for debugging and retry

**Negative:**
- Every job producer must remember to include `tenant_id` — a missing field silently breaks tenant isolation
- Job payloads are slightly larger (one UUID per job)
- The worker must manually set up tenant context — it can't reuse the CLS-based middleware from the HTTP path
- Schema validation of job payloads should enforce `tenant_id` presence to prevent silent failures
