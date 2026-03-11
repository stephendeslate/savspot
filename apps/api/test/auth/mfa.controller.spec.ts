import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MfaController } from '@/auth/mfa/mfa.controller';

describe('MfaController', () => {
  let controller: MfaController;
  let mfaService: {
    initSetup: ReturnType<typeof vi.fn>;
    confirmSetup: ReturnType<typeof vi.fn>;
    disableMfa: ReturnType<typeof vi.fn>;
    verifyMfaChallenge: ReturnType<typeof vi.fn>;
    useRecoveryCode: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mfaService = {
      initSetup: vi.fn(),
      confirmSetup: vi.fn(),
      disableMfa: vi.fn(),
      verifyMfaChallenge: vi.fn(),
      useRecoveryCode: vi.fn(),
    };

    controller = new MfaController(mfaService as never);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('setup', () => {
    it('should call initSetup with userId', async () => {
      const expected = { secret: 'JBSWY3DP', otpauthUrl: 'otpauth://...' };
      mfaService.initSetup.mockResolvedValue(expected);

      const result = await controller.setup('user-1');
      expect(result).toEqual(expected);
      expect(mfaService.initSetup).toHaveBeenCalledWith('user-1');
    });
  });

  describe('verify', () => {
    it('should call confirmSetup with userId and token', async () => {
      const expected = { recoveryCodes: ['code1234'] };
      mfaService.confirmSetup.mockResolvedValue(expected);

      const result = await controller.verify('user-1', { token: '123456' });
      expect(result).toEqual(expected);
      expect(mfaService.confirmSetup).toHaveBeenCalledWith('user-1', '123456');
    });
  });

  describe('disable', () => {
    it('should call disableMfa and return success message', async () => {
      mfaService.disableMfa.mockResolvedValue(undefined);

      const result = await controller.disable('user-1', { token: '123456' });
      expect(result).toEqual({ message: 'MFA disabled successfully' });
      expect(mfaService.disableMfa).toHaveBeenCalledWith('user-1', '123456');
    });
  });

  describe('challenge', () => {
    it('should call verifyMfaChallenge and return tokens', async () => {
      const expected = { accessToken: 'at', refreshToken: 'rt' };
      mfaService.verifyMfaChallenge.mockResolvedValue(expected);

      const result = await controller.challenge({
        userId: 'user-1',
        token: '123456',
      });
      expect(result).toEqual(expected);
      expect(mfaService.verifyMfaChallenge).toHaveBeenCalledWith(
        'user-1',
        '123456',
      );
    });
  });

  describe('recovery', () => {
    it('should call useRecoveryCode and return tokens', async () => {
      const expected = { accessToken: 'at', refreshToken: 'rt' };
      mfaService.useRecoveryCode.mockResolvedValue(expected);

      const result = await controller.recovery({
        userId: 'user-1',
        code: 'code1234',
      });
      expect(result).toEqual(expected);
      expect(mfaService.useRecoveryCode).toHaveBeenCalledWith(
        'user-1',
        'code1234',
      );
    });
  });
});
