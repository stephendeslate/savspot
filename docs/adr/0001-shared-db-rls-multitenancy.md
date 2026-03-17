# ADR-0001: Shared DB with RLS for Multi-Tenancy

## Status

Accepted

## Context

SavSpot is a multi-tenant SaaS platform where each business (tenant) must have complete data isolation. The three common approaches are:

1. **Database-per-tenant** — strongest isolation but operationally expensive (migration rollouts, connection pooling, cost)
2. **Schema-per-tenant** — moderate isolation but Prisma has limited schema-level multi-tenancy support
3. **Shared database with row-level security (RLS)** — single schema, tenant filtering enforced at the database layer

As a bootstrapped product targeting small-to-medium service businesses, operational simplicity and cost efficiency are critical. The platform needs to scale to thousands of tenants without per-tenant infrastructure overhead.

## Decision

Use a shared PostgreSQL database with Row-Level Security (RLS) policies, implemented through:

- **Prisma Client Extensions** (`$allOperations`) to inject tenant context before every query
- **nestjs-cls** (continuation-local storage) to propagate the authenticated tenant ID through the request lifecycle
- **`select set_config('app.current_tenant', tenantId, TRUE)`** to set the session-level variable that RLS policies reference

Every table containing tenant-scoped data has a `tenant_id` column with an RLS policy that filters rows where `tenant_id = current_setting('app.current_tenant')`.

## Consequences

**Positive:**
- Single database to manage — one connection pool, one migration path, one backup strategy
- RLS enforcement is transparent to application code — queries cannot accidentally leak data across tenants
- Cost-efficient at scale — adding a tenant is a row insert, not infrastructure provisioning
- Prisma Client Extensions integrate cleanly with NestJS dependency injection

**Negative:**
- RLS policies must be maintained for every new table — missing a policy is a data leak
- Noisy-neighbor risk — one tenant's heavy queries can affect others (mitigated by query timeouts and indexing)
- Interactive transactions require care — Prisma's `$allOperations` extension can create nested transactions that interfere with explicit locks (see ADR-0008)
- Testing requires tenant context setup in every test that touches the database
