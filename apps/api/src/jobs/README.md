# BullMQ Job Processors — Architecture Notes

## Dispatcher Pattern

Each queue has a single `@Processor` dispatcher class that routes jobs by `job.name`
to `@Injectable()` handler classes. This prevents BullMQ from creating competing
workers that silently drop jobs via round-robin distribution.

Exception: `QUEUE_INVOICES` has a single job type (`generateInvoicePdf`) and uses
a standalone `@Processor` without a dispatcher.

## RLS Migration Notes

All cross-tenant processors currently run with a PostgreSQL superuser role.
When migrating to a non-superuser role with `FORCE ROW LEVEL SECURITY`:

1. Query all distinct `tenant_id` values first
2. For each tenant, call `SELECT set_config('app.current_tenant', tenantId, TRUE)`
3. Process tenant data within that context
4. Clear context between tenants

### Affected processors (9):

- `enforce-approval-deadlines.processor.ts`
- `retry-failed-payments.processor.ts`
- `cleanup-retention.processor.ts`
- `enforce-payment-deadlines.processor.ts`
- `expire-reservations.processor.ts`
- `abandoned-recovery.processor.ts`
- `send-payment-reminders.processor.ts`
- `process-completed-bookings.processor.ts`

### Also affected:

- `client-portal.service.ts` — queries by `clientId` across tenants (architecturally
  correct for cross-tenant client portal, but needs per-tenant context setting under
  FORCE RLS)
