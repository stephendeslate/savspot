# ADR-0008: Prisma Raw Queries for Slot Locking

## Status

Accepted

## Context

Booking slot reservation requires pessimistic locking to prevent double-bookings. The standard approach is:

1. Begin a transaction
2. `SELECT ... FOR UPDATE` on the target time slot (acquires a row-level lock)
3. Check availability
4. Insert the booking
5. Commit

However, Prisma Client Extensions with `$allOperations` (used for RLS tenant context injection per ADR-0001) wrap every operation in implicit logic. When combined with Prisma's interactive transactions (`$transaction`), this creates nested transaction behavior where:

- The extension's `$allOperations` hook runs `set_config()` inside its own implicit query context
- The explicit `$transaction` creates an outer transaction
- `SELECT ... FOR UPDATE` may not acquire the lock at the expected isolation level because of the nesting

This was discovered when concurrent booking tests showed race conditions despite `FOR UPDATE` locks being used.

## Decision

For booking slot reservation (and any operation requiring `SELECT ... FOR UPDATE`), bypass Prisma's query builder and use `$queryRaw` with explicit SQL within a single transaction:

```sql
BEGIN;
SELECT set_config('app.current_tenant', $1, TRUE);
SELECT * FROM booking_slots WHERE id = $2 FOR UPDATE;
-- check availability in application code
INSERT INTO bookings (...) VALUES (...);
COMMIT;
```

This ensures:
- Tenant context and the lock acquisition happen in the same transaction without nesting
- The `FOR UPDATE` lock is acquired at the correct isolation level
- No Prisma Client Extension middleware interferes with the lock semantics

## Consequences

**Positive:**
- Correct pessimistic locking behavior — eliminates the double-booking race condition
- Full control over transaction boundaries and isolation
- Explicit SQL makes the locking strategy visible and auditable

**Negative:**
- Raw SQL bypasses Prisma's type safety — must manually validate inputs and map results
- Two code paths for database access — Prisma query builder for most operations, raw SQL for locking-sensitive ones
- Raw queries must be updated manually if the schema changes (no automatic migration of query strings)
- Developers must know when to use raw queries vs. the Prisma client — this ADR serves as the guideline
