import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { StripeConnectService } from '@/payments/stripe-connect.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-001';
const ACCOUNT_ID = 'acct_stripe_123';

function makePrisma() {
  return {
    tenant: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  };
}

function makeStripeProvider() {
  return {
    createConnectedAccount: vi.fn(),
    getOnboardingLink: vi.fn(),
    getDashboardLink: vi.fn(),
    getAccountStatus: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('StripeConnectService', () => {
  let service: StripeConnectService;
  let prisma: ReturnType<typeof makePrisma>;
  let stripeProvider: ReturnType<typeof makeStripeProvider>;

  beforeEach(() => {
    prisma = makePrisma();
    stripeProvider = makeStripeProvider();
    service = new StripeConnectService(prisma as never, stripeProvider as never);
  });

  // -------------------------------------------------------------------------
  // createAccount
  // -------------------------------------------------------------------------

  describe('createAccount', () => {
    it('should create a Stripe Connect account and update the tenant', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        id: TENANT_ID,
        paymentProviderAccountId: null,
        contactEmail: 'fallback@example.com',
      });
      stripeProvider.createConnectedAccount.mockResolvedValue({
        accountId: ACCOUNT_ID,
        onboardingComplete: false,
      });
      prisma.tenant.update.mockResolvedValue({});

      const result = await service.createAccount(TENANT_ID, 'owner@example.com', 'US');

      expect(result).toEqual({
        accountId: ACCOUNT_ID,
        onboardingComplete: false,
      });
      expect(stripeProvider.createConnectedAccount).toHaveBeenCalledWith(
        'owner@example.com',
        'US',
      );
      expect(prisma.tenant.update).toHaveBeenCalledWith({
        where: { id: TENANT_ID },
        data: {
          paymentProvider: 'STRIPE',
          paymentProviderAccountId: ACCOUNT_ID,
        },
      });
    });

    it('should fall back to tenant contactEmail when email param is empty', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        id: TENANT_ID,
        paymentProviderAccountId: null,
        contactEmail: 'fallback@example.com',
      });
      stripeProvider.createConnectedAccount.mockResolvedValue({
        accountId: ACCOUNT_ID,
        onboardingComplete: false,
      });
      prisma.tenant.update.mockResolvedValue({});

      await service.createAccount(TENANT_ID, '', 'US');

      expect(stripeProvider.createConnectedAccount).toHaveBeenCalledWith(
        'fallback@example.com',
        'US',
      );
    });

    it('should throw NotFoundException when tenant does not exist', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(
        service.createAccount(TENANT_ID, 'a@b.com', 'US'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when tenant already has a connected account', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        id: TENANT_ID,
        paymentProviderAccountId: ACCOUNT_ID,
        contactEmail: 'a@b.com',
      });

      await expect(
        service.createAccount(TENANT_ID, 'a@b.com', 'US'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when no email is available', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        id: TENANT_ID,
        paymentProviderAccountId: null,
        contactEmail: null,
      });

      await expect(
        service.createAccount(TENANT_ID, '', 'US'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // -------------------------------------------------------------------------
  // getOnboardingLink
  // -------------------------------------------------------------------------

  describe('getOnboardingLink', () => {
    it('should return an onboarding URL', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        paymentProviderAccountId: ACCOUNT_ID,
      });
      stripeProvider.getOnboardingLink.mockResolvedValue(
        'https://connect.stripe.com/setup/e/abc',
      );

      const result = await service.getOnboardingLink(
        TENANT_ID,
        'https://app.savspot.com/settings',
      );

      expect(result).toEqual({ url: 'https://connect.stripe.com/setup/e/abc' });
      expect(stripeProvider.getOnboardingLink).toHaveBeenCalledWith(
        ACCOUNT_ID,
        'https://app.savspot.com/settings?refresh=true',
        'https://app.savspot.com/settings',
      );
    });

    it('should throw NotFoundException when tenant does not exist', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(
        service.getOnboardingLink(TENANT_ID, 'https://example.com'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when tenant has no connected account', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        paymentProviderAccountId: null,
      });

      await expect(
        service.getOnboardingLink(TENANT_ID, 'https://example.com'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // -------------------------------------------------------------------------
  // getDashboardLink
  // -------------------------------------------------------------------------

  describe('getDashboardLink', () => {
    it('should return a dashboard login URL for an onboarded tenant', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        paymentProviderAccountId: ACCOUNT_ID,
        paymentProviderOnboarded: true,
      });
      stripeProvider.getDashboardLink.mockResolvedValue(
        'https://connect.stripe.com/express/login',
      );

      const result = await service.getDashboardLink(TENANT_ID);

      expect(result).toEqual({
        url: 'https://connect.stripe.com/express/login',
      });
      expect(stripeProvider.getDashboardLink).toHaveBeenCalledWith(ACCOUNT_ID);
    });

    it('should throw NotFoundException when tenant does not exist', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(service.getDashboardLink(TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when tenant has no connected account', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        paymentProviderAccountId: null,
        paymentProviderOnboarded: false,
      });

      await expect(service.getDashboardLink(TENANT_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when tenant has not completed onboarding', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        paymentProviderAccountId: ACCOUNT_ID,
        paymentProviderOnboarded: false,
      });

      await expect(service.getDashboardLink(TENANT_ID)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // -------------------------------------------------------------------------
  // getStatus
  // -------------------------------------------------------------------------

  describe('getStatus', () => {
    it('should return default status when tenant has no connected account', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        paymentProviderAccountId: null,
        paymentProviderOnboarded: false,
      });

      const result = await service.getStatus(TENANT_ID);

      expect(result).toEqual({
        accountId: null,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        onboarded: false,
      });
      expect(stripeProvider.getAccountStatus).not.toHaveBeenCalled();
    });

    it('should return status from Stripe when tenant has a connected account', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        paymentProviderAccountId: ACCOUNT_ID,
        paymentProviderOnboarded: true,
      });
      stripeProvider.getAccountStatus.mockResolvedValue({
        accountId: ACCOUNT_ID,
        chargesEnabled: true,
        payoutsEnabled: true,
        detailsSubmitted: true,
      });

      const result = await service.getStatus(TENANT_ID);

      expect(result).toEqual({
        accountId: ACCOUNT_ID,
        chargesEnabled: true,
        payoutsEnabled: true,
        detailsSubmitted: true,
        onboarded: true,
      });
    });

    it('should update tenant onboarded flag when charges become enabled', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        paymentProviderAccountId: ACCOUNT_ID,
        paymentProviderOnboarded: false,
      });
      stripeProvider.getAccountStatus.mockResolvedValue({
        accountId: ACCOUNT_ID,
        chargesEnabled: true,
        payoutsEnabled: true,
        detailsSubmitted: true,
      });
      prisma.tenant.update.mockResolvedValue({});

      const result = await service.getStatus(TENANT_ID);

      expect(prisma.tenant.update).toHaveBeenCalledWith({
        where: { id: TENANT_ID },
        data: { paymentProviderOnboarded: true },
      });
      expect(result.onboarded).toBe(true);
    });

    it('should not update tenant when charges were already enabled', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        paymentProviderAccountId: ACCOUNT_ID,
        paymentProviderOnboarded: true,
      });
      stripeProvider.getAccountStatus.mockResolvedValue({
        accountId: ACCOUNT_ID,
        chargesEnabled: true,
        payoutsEnabled: true,
        detailsSubmitted: true,
      });

      await service.getStatus(TENANT_ID);

      expect(prisma.tenant.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when tenant does not exist', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(service.getStatus(TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // -------------------------------------------------------------------------
  // handleAccountUpdate
  // -------------------------------------------------------------------------

  describe('handleAccountUpdate', () => {
    it('should update tenant onboarded status when it changes to true', async () => {
      prisma.tenant.findFirst.mockResolvedValue({
        id: TENANT_ID,
        paymentProviderOnboarded: false,
      });
      stripeProvider.getAccountStatus.mockResolvedValue({
        accountId: ACCOUNT_ID,
        chargesEnabled: true,
        payoutsEnabled: true,
        detailsSubmitted: true,
      });
      prisma.tenant.update.mockResolvedValue({});

      await service.handleAccountUpdate(ACCOUNT_ID);

      expect(prisma.tenant.update).toHaveBeenCalledWith({
        where: { id: TENANT_ID },
        data: { paymentProviderOnboarded: true },
      });
    });

    it('should update tenant onboarded status when it changes to false', async () => {
      prisma.tenant.findFirst.mockResolvedValue({
        id: TENANT_ID,
        paymentProviderOnboarded: true,
      });
      stripeProvider.getAccountStatus.mockResolvedValue({
        accountId: ACCOUNT_ID,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: true,
      });
      prisma.tenant.update.mockResolvedValue({});

      await service.handleAccountUpdate(ACCOUNT_ID);

      expect(prisma.tenant.update).toHaveBeenCalledWith({
        where: { id: TENANT_ID },
        data: { paymentProviderOnboarded: false },
      });
    });

    it('should not update tenant when status has not changed', async () => {
      prisma.tenant.findFirst.mockResolvedValue({
        id: TENANT_ID,
        paymentProviderOnboarded: true,
      });
      stripeProvider.getAccountStatus.mockResolvedValue({
        accountId: ACCOUNT_ID,
        chargesEnabled: true,
        payoutsEnabled: true,
        detailsSubmitted: true,
      });

      await service.handleAccountUpdate(ACCOUNT_ID);

      expect(prisma.tenant.update).not.toHaveBeenCalled();
    });

    it('should silently return when no tenant matches the account ID', async () => {
      prisma.tenant.findFirst.mockResolvedValue(null);

      await expect(
        service.handleAccountUpdate('acct_unknown'),
      ).resolves.toBeUndefined();

      expect(stripeProvider.getAccountStatus).not.toHaveBeenCalled();
      expect(prisma.tenant.update).not.toHaveBeenCalled();
    });
  });
});
