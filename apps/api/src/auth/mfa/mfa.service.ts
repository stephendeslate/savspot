import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createHmac,
  randomBytes,
  createCipheriv,
  createDecipheriv,
} from 'crypto';
import { Prisma } from '../../../../../prisma/generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenService, JwtPayload } from '../services/token.service';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

@Injectable()
export class MfaService {
  private readonly logger = new Logger(MfaService.name);
  private readonly encryptionKey: Buffer;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly tokenService: TokenService,
  ) {
    const keyHex = this.configService.get<string>('MFA_ENCRYPTION_KEY');
    if (keyHex) {
      this.encryptionKey = Buffer.from(keyHex, 'hex');
    } else {
      this.logger.warn(
        'MFA_ENCRYPTION_KEY not set — generating ephemeral key (development only)',
      );
      this.encryptionKey = randomBytes(32);
    }
  }

  generateSecret(): { secret: string; otpauthUrl: string } {
    const secretBytes = randomBytes(20);
    const secret = this.base32Encode(secretBytes);
    const otpauthUrl = `otpauth://totp/SavSpot?secret=${secret}&issuer=SavSpot&digits=6&period=30`;
    return { secret, otpauthUrl };
  }

  verifyToken(secret: string, token: string, window = 1): boolean {
    const secretBytes = this.base32Decode(secret);
    const time = Math.floor(Date.now() / 1000 / 30);
    for (let i = -window; i <= window; i++) {
      if (this.generateTOTP(secretBytes, time + i) === token) {
        return true;
      }
    }
    return false;
  }

  encryptSecret(secret: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const encrypted = Buffer.concat([
      cipher.update(secret, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  decryptSecret(encrypted: string): string {
    const parts = encrypted.split(':');
    if (parts.length !== 3) {
      throw new BadRequestException('Invalid encrypted secret format');
    }
    const [ivHex, authTagHex, dataHex] = parts as [string, string, string];
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const data = Buffer.from(dataHex, 'hex');
    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(data).toString('utf8') + decipher.final('utf8');
  }

  generateRecoveryCodes(): string[] {
    const codes: string[] = [];
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 10; i++) {
      let code = '';
      const bytes = randomBytes(8);
      for (let j = 0; j < 8; j++) {
        code += chars[bytes[j]! % chars.length];
      }
      codes.push(code);
    }
    return codes;
  }

  async initSetup(userId: string): Promise<{ secret: string; otpauthUrl: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mfaEnabled: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }
    if (user.mfaEnabled) {
      throw new BadRequestException('MFA is already enabled');
    }

    const { secret, otpauthUrl } = this.generateSecret();

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: this.encryptSecret(secret) },
    });

    return { secret, otpauthUrl };
  }

  async confirmSetup(userId: string, token: string): Promise<{ recoveryCodes: string[] }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mfaEnabled: true, mfaSecret: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }
    if (user.mfaEnabled) {
      throw new BadRequestException('MFA is already enabled');
    }
    if (!user.mfaSecret) {
      throw new BadRequestException('MFA setup has not been initiated');
    }

    const secret = this.decryptSecret(user.mfaSecret);
    if (!this.verifyToken(secret, token)) {
      throw new BadRequestException('Invalid TOTP token');
    }

    const recoveryCodes = this.generateRecoveryCodes();

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: true,
        mfaRecoveryCodes: recoveryCodes,
      },
    });

    this.logger.log(`MFA enabled for user ${userId}`);
    return { recoveryCodes };
  }

  async disableMfa(userId: string, token: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mfaEnabled: true, mfaSecret: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }
    if (!user.mfaEnabled || !user.mfaSecret) {
      throw new BadRequestException('MFA is not enabled');
    }

    const secret = this.decryptSecret(user.mfaSecret);
    if (!this.verifyToken(secret, token)) {
      throw new BadRequestException('Invalid TOTP token');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
        mfaRecoveryCodes: Prisma.DbNull,
      },
    });

    this.logger.log(`MFA disabled for user ${userId}`);
  }

  async verifyMfaChallenge(userId: string, token: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: { select: { tenantId: true, role: true } },
      },
    });

    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      throw new UnauthorizedException('Invalid MFA challenge');
    }

    const secret = this.decryptSecret(user.mfaSecret);
    if (!this.verifyToken(secret, token)) {
      throw new UnauthorizedException('Invalid TOTP token');
    }

    const membership = user.memberships.length === 1 ? user.memberships[0] : undefined;
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      platformRole: user.role,
      tenantId: membership?.tenantId,
      tenantRole: membership?.role,
    };

    const access = this.tokenService.generateAccessToken(payload);
    const refresh = this.tokenService.generateRefreshToken(payload);

    return {
      accessToken: access.token,
      refreshToken: refresh.token,
    };
  }

  async useRecoveryCode(userId: string, code: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: { select: { tenantId: true, role: true } },
      },
    });

    if (!user || !user.mfaEnabled) {
      throw new UnauthorizedException('Invalid MFA challenge');
    }

    const codes = user.mfaRecoveryCodes as string[] | null;
    if (!codes || !Array.isArray(codes)) {
      throw new UnauthorizedException('No recovery codes available');
    }

    const normalizedCode = code.toLowerCase().trim();
    const codeIndex = codes.findIndex(
      (c) => c.toLowerCase() === normalizedCode,
    );

    if (codeIndex === -1) {
      throw new UnauthorizedException('Invalid recovery code');
    }

    const remainingCodes = [...codes];
    remainingCodes.splice(codeIndex, 1);

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaRecoveryCodes: remainingCodes },
    });

    this.logger.log(
      `Recovery code used for user ${userId} (${remainingCodes.length} remaining)`,
    );

    const membership = user.memberships.length === 1 ? user.memberships[0] : undefined;
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      platformRole: user.role,
      tenantId: membership?.tenantId,
      tenantRole: membership?.role,
    };

    const access = this.tokenService.generateAccessToken(payload);
    const refresh = this.tokenService.generateRefreshToken(payload);

    return {
      accessToken: access.token,
      refreshToken: refresh.token,
    };
  }

  private generateTOTP(secret: Buffer, time: number): string {
    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeBigUInt64BE(BigInt(time));
    const hmac = createHmac('sha1', secret).update(timeBuffer).digest();
    const offset = hmac[hmac.length - 1]! & 0x0f;
    const code =
      (((hmac[offset]! & 0x7f) << 24) |
        (hmac[offset + 1]! << 16) |
        (hmac[offset + 2]! << 8) |
        hmac[offset + 3]!) %
      1000000;
    return code.toString().padStart(6, '0');
  }

  private base32Encode(buffer: Buffer): string {
    let bits = 0;
    let value = 0;
    let output = '';

    for (let i = 0; i < buffer.length; i++) {
      value = (value << 8) | buffer[i]!;
      bits += 8;

      while (bits >= 5) {
        output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }

    if (bits > 0) {
      output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
    }

    return output;
  }

  private base32Decode(encoded: string): Buffer {
    const cleanInput = encoded.replace(/=+$/, '').toUpperCase();
    let bits = 0;
    let value = 0;
    const output: number[] = [];

    for (let i = 0; i < cleanInput.length; i++) {
      const idx = BASE32_ALPHABET.indexOf(cleanInput[i]!);
      if (idx === -1) {
        throw new BadRequestException('Invalid base32 character');
      }
      value = (value << 5) | idx;
      bits += 5;

      if (bits >= 8) {
        output.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }

    return Buffer.from(output);
  }
}
