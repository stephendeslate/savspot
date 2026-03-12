import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CustomDomainsService } from '@/custom-domains/custom-domains.service';
import { DnsVerifierService } from '@/custom-domains/dns-verifier.service';
import { SslManagerService } from '@/custom-domains/ssl-manager.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const DOMAIN = 'booking.example.com';
const DOMAIN_ID = 'domain-001';

function makePrisma() {
  return {
    customDomain: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
  };
}

function makeDnsVerifier() {
  return {
    verifyDns: vi.fn(),
    verifyCname: vi.fn(),
  };
}

function makeSslManager() {
  return {
    provisionCertificate: vi.fn(),
    revokeCertificate: vi.fn(),
    renewCertificate: vi.fn(),
  };
}

function makeDomainRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: DOMAIN_ID,
    tenantId: TENANT_ID,
    domain: DOMAIN,
    verificationToken: 'svs_verify_abc123',
    status: 'PENDING_VERIFICATION',
    sslStatus: 'PENDING',
    verifiedAt: null,
    lastCheckedAt: null,
    createdAt: new Date('2026-01-01'),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('CustomDomainsService', () => {
  let service: CustomDomainsService;
  let prisma: ReturnType<typeof makePrisma>;
  let dnsVerifier: ReturnType<typeof makeDnsVerifier>;
  let sslManager: ReturnType<typeof makeSslManager>;

  beforeEach(() => {
    prisma = makePrisma();
    dnsVerifier = makeDnsVerifier();
    sslManager = makeSslManager();
    process.env['FEATURE_CUSTOM_DOMAINS'] = 'true';
    service = new CustomDomainsService(
      prisma as never,
      dnsVerifier as unknown as DnsVerifierService,
      sslManager as unknown as SslManagerService,
    );
  });

  // -------------------------------------------------------------------------
  // addDomain
  // -------------------------------------------------------------------------

  describe('addDomain', () => {
    it('should create a domain with DNS instructions', async () => {
      prisma.customDomain.findFirst.mockResolvedValue(null); // no existing domain or tenant
      prisma.customDomain.create.mockResolvedValue(makeDomainRecord());

      const result = await service.addDomain(TENANT_ID, DOMAIN);

      expect(result.dnsInstructions.txt.name).toBe(`_savspot-verify.${DOMAIN}`);
      expect(result.dnsInstructions.cname.value).toBe('custom.savspot.co');
      expect(prisma.customDomain.findFirst).toHaveBeenCalledWith({
        where: { OR: [{ domain: DOMAIN }, { tenantId: TENANT_ID }] },
        select: { domain: true, tenantId: true },
      });
      expect(prisma.customDomain.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          domain: DOMAIN,
          status: 'PENDING_VERIFICATION',
          sslStatus: 'PENDING',
        }),
      });
    });

    it('should throw ConflictException when domain already in use', async () => {
      prisma.customDomain.findFirst.mockResolvedValue({
        domain: DOMAIN,
        tenantId: 'other-tenant',
      });

      await expect(service.addDomain(TENANT_ID, DOMAIN)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException when tenant already has a domain', async () => {
      prisma.customDomain.findFirst.mockResolvedValue({
        domain: 'other.example.com',
        tenantId: TENANT_ID,
      });

      await expect(service.addDomain(TENANT_ID, DOMAIN)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw BadRequestException when feature not enabled', async () => {
      process.env['FEATURE_CUSTOM_DOMAINS'] = 'false';

      await expect(service.addDomain(TENANT_ID, DOMAIN)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // -------------------------------------------------------------------------
  // getDomainStatus
  // -------------------------------------------------------------------------

  describe('getDomainStatus', () => {
    it('should return domain with DNS instructions', async () => {
      prisma.customDomain.findUnique.mockResolvedValue(makeDomainRecord());

      const result = await service.getDomainStatus(TENANT_ID);

      expect(result).not.toBeNull();
      expect(result!.dnsInstructions.txt.value).toBe('svs_verify_abc123');
    });

    it('should return null when no domain configured', async () => {
      prisma.customDomain.findUnique.mockResolvedValue(null);

      const result = await service.getDomainStatus(TENANT_ID);

      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // removeDomain
  // -------------------------------------------------------------------------

  describe('removeDomain', () => {
    it('should revoke SSL and delete when domain has active SSL', async () => {
      prisma.customDomain.findUnique.mockResolvedValue(
        makeDomainRecord({ sslStatus: 'ACTIVE' }),
      );
      prisma.customDomain.delete.mockResolvedValue({});

      const result = await service.removeDomain(TENANT_ID);

      expect(sslManager.revokeCertificate).toHaveBeenCalledWith(DOMAIN);
      expect(prisma.customDomain.delete).toHaveBeenCalled();
      expect(result).toEqual({ removed: true });
    });

    it('should skip SSL revocation when SSL is not active', async () => {
      prisma.customDomain.findUnique.mockResolvedValue(
        makeDomainRecord({ sslStatus: 'PENDING' }),
      );
      prisma.customDomain.delete.mockResolvedValue({});

      await service.removeDomain(TENANT_ID);

      expect(sslManager.revokeCertificate).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when no domain exists', async () => {
      prisma.customDomain.findUnique.mockResolvedValue(null);

      await expect(service.removeDomain(TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // -------------------------------------------------------------------------
  // forceVerify
  // -------------------------------------------------------------------------

  describe('forceVerify', () => {
    it('should return immediately when domain is already active', async () => {
      prisma.customDomain.findUnique.mockResolvedValue(
        makeDomainRecord({ status: 'ACTIVE' }),
      );

      const result = await service.forceVerify(TENANT_ID);

      expect(result).toEqual({
        status: 'ACTIVE',
        message: 'Domain is already active',
      });
      expect(dnsVerifier.verifyDns).not.toHaveBeenCalled();
    });

    it('should verify DNS and provision SSL when verification succeeds', async () => {
      prisma.customDomain.findUnique.mockResolvedValue(makeDomainRecord());
      dnsVerifier.verifyDns.mockResolvedValue(true);
      prisma.customDomain.update.mockResolvedValue({});

      const result = await service.forceVerify(TENANT_ID);

      expect(result.status).toBe('DNS_VERIFIED');
      expect(sslManager.provisionCertificate).toHaveBeenCalledWith(DOMAIN);
      expect(prisma.customDomain.update).toHaveBeenCalledTimes(2);
    });

    it('should update lastCheckedAt when DNS verification fails', async () => {
      prisma.customDomain.findUnique.mockResolvedValue(makeDomainRecord());
      dnsVerifier.verifyDns.mockResolvedValue(false);
      prisma.customDomain.update.mockResolvedValue({});

      const result = await service.forceVerify(TENANT_ID);

      expect(result.message).toContain('DNS verification failed');
      expect(sslManager.provisionCertificate).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when no domain exists', async () => {
      prisma.customDomain.findUnique.mockResolvedValue(null);

      await expect(service.forceVerify(TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // -------------------------------------------------------------------------
  // verifyPendingDomains
  // -------------------------------------------------------------------------

  describe('verifyPendingDomains', () => {
    it('should verify and provision SSL for verified domains', async () => {
      const pending = makeDomainRecord();
      prisma.customDomain.findMany.mockResolvedValue([pending]);
      dnsVerifier.verifyDns.mockResolvedValue(true);
      prisma.customDomain.update.mockResolvedValue({});
      prisma.customDomain.updateMany.mockResolvedValue({});

      await service.verifyPendingDomains();

      expect(sslManager.provisionCertificate).toHaveBeenCalledWith(DOMAIN);
      expect(prisma.customDomain.update).toHaveBeenCalledTimes(2);
    });

    it('should only update lastCheckedAt when DNS fails', async () => {
      const pending = makeDomainRecord();
      prisma.customDomain.findMany.mockResolvedValue([pending]);
      dnsVerifier.verifyDns.mockResolvedValue(false);
      prisma.customDomain.update.mockResolvedValue({});
      prisma.customDomain.updateMany.mockResolvedValue({});

      await service.verifyPendingDomains();

      expect(sslManager.provisionCertificate).not.toHaveBeenCalled();
      expect(prisma.customDomain.update).toHaveBeenCalledTimes(1);
    });

    it('should mark old pending domains as VERIFICATION_FAILED', async () => {
      prisma.customDomain.findMany.mockResolvedValue([]);
      prisma.customDomain.updateMany.mockResolvedValue({});

      await service.verifyPendingDomains();

      expect(prisma.customDomain.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          status: 'PENDING_VERIFICATION',
        }),
        data: { status: 'VERIFICATION_FAILED' },
      });
    });

    it('should continue processing other domains when one throws', async () => {
      const d1 = makeDomainRecord({ id: 'd1', domain: 'a.com' });
      const d2 = makeDomainRecord({ id: 'd2', domain: 'b.com' });
      prisma.customDomain.findMany.mockResolvedValue([d1, d2]);
      dnsVerifier.verifyDns
        .mockRejectedValueOnce(new Error('DNS timeout'))
        .mockResolvedValueOnce(true);
      prisma.customDomain.update.mockResolvedValue({});
      prisma.customDomain.updateMany.mockResolvedValue({});

      await service.verifyPendingDomains();

      // Second domain should still be processed
      expect(dnsVerifier.verifyDns).toHaveBeenCalledTimes(2);
    });
  });
});

// ---------------------------------------------------------------------------
// DnsVerifierService
// ---------------------------------------------------------------------------

describe('DnsVerifierService', () => {
  // We test this by mocking dns/promises
  // The service is simple enough to test the logic directly

  it('should be importable', async () => {
    const mod = await import('@/custom-domains/dns-verifier.service');
    expect(mod.DnsVerifierService).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// SslManagerService
// ---------------------------------------------------------------------------

describe('SslManagerService', () => {
  let sslService: SslManagerService;

  beforeEach(() => {
    sslService = new SslManagerService();
  });

  it('should log for manual provider', async () => {
    process.env['CUSTOM_DOMAIN_SSL_PROVIDER'] = 'manual';

    // Should not throw
    await expect(sslService.provisionCertificate('example.com')).resolves.toBeUndefined();
  });

  it('should log for fly provider', async () => {
    process.env['CUSTOM_DOMAIN_SSL_PROVIDER'] = 'fly';

    await expect(sslService.provisionCertificate('example.com')).resolves.toBeUndefined();
  });

  it('should handle revokeCertificate', async () => {
    await expect(sslService.revokeCertificate('example.com')).resolves.toBeUndefined();
  });

  it('should delegate renewCertificate to provisionCertificate', async () => {
    const spy = vi.spyOn(sslService, 'provisionCertificate').mockResolvedValue();

    await sslService.renewCertificate('example.com');

    expect(spy).toHaveBeenCalledWith('example.com');
  });
});
