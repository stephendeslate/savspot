/**
 * RLS / Tenant Isolation Integration Tests
 *
 * Validates tenant data isolation against a real seeded database.
 * These tests require Docker Compose services (Postgres + Redis) and
 * a seeded database (`pnpm db:seed`).
 *
 * Run with: pnpm --filter @savspot/api test:integration
 *
 * NOTE: PostgreSQL RLS policies use `ENABLE ROW LEVEL SECURITY` but not
 * `FORCE ROW LEVEL SECURITY`. This means the table owner (the database user
 * used by Prisma) bypasses RLS. The primary isolation mechanism is the
 * Prisma Client Extension (withTenantExtension) which injects tenant_id
 * into all queries. RLS serves as defense-in-depth for non-owner roles.
 *
 * To enable DB-level isolation for the app user, a future migration should:
 * 1. Create a separate `app_user` role with limited privileges
 * 2. Apply `FORCE ROW LEVEL SECURITY` on tenant-scoped tables
 * 3. Use the `app_user` for all application queries
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '../../../prisma/generated/prisma';
import { withTenantExtension } from '../src/prisma/prisma-tenant.extension';

const TENANT_A = '00000000-0000-4000-b000-000000000001'; // From seed helpers
const TENANT_B = '00000000-0000-4000-b000-000000000002';

describe('Tenant Isolation Integration', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Prisma tenant extension (application-layer isolation)', () => {
    it('tenant A extension returns only tenant A services', async () => {
      const scopedPrisma = withTenantExtension(prisma, TENANT_A);
      const services = await scopedPrisma.service.findMany();

      expect(services.length).toBeGreaterThan(0);
      for (const service of services) {
        expect(service.tenantId).toBe(TENANT_A);
      }
    });

    it('tenant B extension returns only tenant B services', async () => {
      const scopedPrisma = withTenantExtension(prisma, TENANT_B);
      const services = await scopedPrisma.service.findMany();

      expect(services.length).toBeGreaterThan(0);
      for (const service of services) {
        expect(service.tenantId).toBe(TENANT_B);
      }
    });

    it('tenant extension returns empty for nonexistent tenant', async () => {
      const scopedPrisma = withTenantExtension(prisma, 'nonexistent-tenant');
      const services = await scopedPrisma.service.findMany();

      expect(services).toHaveLength(0);
    });

    it('tenant A extension returns only tenant A bookings', async () => {
      const scopedPrisma = withTenantExtension(prisma, TENANT_A);
      const bookings = await scopedPrisma.booking.findMany();

      for (const booking of bookings) {
        expect(booking.tenantId).toBe(TENANT_A);
      }
    });

    it('scoped extensions do not leak between instances', async () => {
      const scopedA = withTenantExtension(prisma, TENANT_A);
      const scopedB = withTenantExtension(prisma, TENANT_B);

      const servicesA = await scopedA.service.findMany();
      const servicesB = await scopedB.service.findMany();

      // No overlap in IDs
      const idsA = new Set(servicesA.map((s) => s.id));
      const idsB = new Set(servicesB.map((s) => s.id));

      for (const id of idsA) {
        expect(idsB.has(id)).toBe(false);
      }
    });
  });

  describe('PostgreSQL set_config (transaction-level context)', () => {
    it('should maintain context isolation between transactions', async () => {
      const contextA = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant', ${TENANT_A}, TRUE)`;
        const result = await tx.$queryRaw<Array<{ current_setting: string }>>`
          SELECT current_setting('app.current_tenant', TRUE)
        `;
        return result[0]?.current_setting;
      });

      const contextB = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant', ${TENANT_B}, TRUE)`;
        const result = await tx.$queryRaw<Array<{ current_setting: string }>>`
          SELECT current_setting('app.current_tenant', TRUE)
        `;
        return result[0]?.current_setting;
      });

      expect(contextA).toBe(TENANT_A);
      expect(contextB).toBe(TENANT_B);
    });

    it('set_config with TRUE scopes to transaction only', async () => {
      // Set context in a transaction
      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant', ${TENANT_A}, TRUE)`;
      });

      // Outside the transaction, context should be empty
      const result = await prisma.$queryRaw<Array<{ current_setting: string }>>`
        SELECT current_setting('app.current_tenant', TRUE)
      `;
      expect(result[0]?.current_setting).toBe('');
    });
  });
});
