# ADR-0005: Tenant Context via `set_config()`

## Status

Accepted

## Context

RLS policies in PostgreSQL reference a session-level variable to determine the current tenant. There are two common ways to set this variable:

1. **`SET LOCAL 'app.current_tenant' = '...'`** — scoped to the current transaction
2. **`SELECT set_config('app.current_tenant', '...', TRUE)`** — sets the variable with transaction-local scope when the third parameter is `TRUE`

Both achieve transaction-scoped tenant context, but they behave differently with Prisma's transaction handling.

## Decision

Use `SELECT set_config('app.current_tenant', tenantId, TRUE)` instead of `SET LOCAL`.

The `set_config()` function:
- Is a regular SQL function call, compatible with Prisma's `$queryRaw`
- Returns a result set, which Prisma expects from queries
- Works correctly within Prisma interactive transactions (`$transaction`)
- The `TRUE` parameter ensures the value is scoped to the current transaction

## Consequences

**Positive:**
- Compatible with Prisma Client Extensions — can be called in `$allOperations` hooks via `$queryRaw`
- Transaction-scoped by default — tenant context is automatically cleared when the transaction ends
- Works consistently across Prisma's implicit and explicit transactions
- Standard PostgreSQL function — well-documented behavior

**Negative:**
- Slightly more verbose than `SET LOCAL`
- Developers must remember to pass `TRUE` as the third parameter — `FALSE` would set it for the entire session, which could leak tenant context between requests if connections are pooled
- The Prisma Client Extension that calls `set_config()` runs on every query, adding a small overhead per operation
