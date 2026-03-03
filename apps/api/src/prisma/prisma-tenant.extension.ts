import { PrismaClient } from '../../../../prisma/generated/prisma';

/**
 * Models that have a tenant_id column and should be scoped by tenant.
 * Any model NOT in this list will be skipped by the tenant extension.
 *
 * NOTE: This uses the Prisma model names (PascalCase), not the SQL table names.
 */
export const TENANT_SCOPED_MODELS: ReadonlySet<string> = new Set([
  'TenantMembership',
  'TeamInvitation',
  'BookingSession',
  'Booking',
  'BookingStateHistory',
  'DateReservation',
  'AvailabilityRule',
  'BlockedDate',
  'BookingFlow',
  'Payment',
  'PaymentStateHistory',
  'PaymentDispute',
  'Invoice',
  'Service',
  'Venue',
  'ServiceCategory',
  'ServiceProvider',
  'ServiceAddon',
  'Discount',
  'TaxRate',
  'Communication',
  'CommunicationTemplate',
  'EmailLayout',
  'Notification',
  'ContractTemplate',
  'Contract',
  'Quote',
  'WorkflowAutomation',
  'WorkflowTemplate',
  'WorkflowWebhook',
  'BookingReminder',
  'CalendarConnection',
  'CalendarEvent',
  'MessageThread',
  'ClientProfile',
  'GalleryPhoto',
  'BookingFlowAnalytics',
  'AuditLog',
  'DataRequest',
  'Review',
  'ApiKey',
  'Note',
  'ReferralLink',
  'SupportTicket',
  'Feedback',
  'ImportJob',
  'AccountingConnection',
  'BrowserPushSubscription',
]);

/**
 * Read operations where we inject a tenant_id where clause.
 */
const READ_OPERATIONS = new Set([
  'findMany',
  'findFirst',
  'findFirstOrThrow',
  'findUnique',
  'findUniqueOrThrow',
  'count',
  'aggregate',
  'groupBy',
]);

/**
 * Create operations where we inject tenant_id into data.
 */
const CREATE_OPERATIONS = new Set(['create', 'createMany', 'createManyAndReturn']);

/**
 * Update/delete operations where we inject tenant_id into the where clause.
 */
const MUTATION_OPERATIONS = new Set([
  'update',
  'updateMany',
  'upsert',
  'delete',
  'deleteMany',
]);

/**
 * Returns a Prisma client extended with automatic tenant_id filtering.
 *
 * This is application-layer defense-in-depth. PostgreSQL RLS policies
 * provide the authoritative row-level security boundary; this extension
 * adds a second safety net at the ORM layer.
 */
export function withTenantExtension(
  prisma: PrismaClient,
  tenantId: string,
) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // Skip models that don't have a tenant_id column
          if (!model || !TENANT_SCOPED_MODELS.has(model)) {
            return query(args);
          }

          // Cast args to a mutable record. Prisma's generated union types
          // make direct property access impossible without narrowing to
          // every individual model+operation combination. Since we are
          // operating generically across ALL models, a cast is the only
          // practical approach here.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const a = args as any;

          // ---- READ operations: inject where tenant_id ----
          if (READ_OPERATIONS.has(operation)) {
            a.where = { ...a.where, tenantId };
            return query(a);
          }

          // ---- CREATE operations: inject data.tenant_id ----
          if (CREATE_OPERATIONS.has(operation)) {
            if (operation === 'createMany' || operation === 'createManyAndReturn') {
              // createMany has data as an array or single object
              const data = a.data;
              if (Array.isArray(data)) {
                a.data = data.map(
                  (item: Record<string, unknown>) => ({
                    ...item,
                    tenantId,
                  }),
                );
              } else {
                a.data = { ...data, tenantId };
              }
            } else {
              // create — data is a single object
              a.data = { ...a.data, tenantId };
            }
            return query(a);
          }

          // ---- UPDATE / DELETE operations: inject where tenant_id ----
          if (MUTATION_OPERATIONS.has(operation)) {
            if (operation === 'upsert') {
              // upsert has where + create + update
              a.where = { ...a.where, tenantId };
              a.create = { ...a.create, tenantId };
            } else {
              a.where = { ...a.where, tenantId };
            }
            return query(a);
          }

          // Fallback: pass through unrecognised operations
          return query(args);
        },
      },
    },
  });
}
