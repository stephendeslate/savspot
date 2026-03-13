import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { TokenService, JwtPayload } from './services/token.service';
import { PasswordService } from './services/password.service';
import { EmailService } from './services/email.service';
import { RegisterDto } from './dto/register.dto';

const RESET_TOKEN_PREFIX = 'password-reset:';
const RESET_TOKEN_TTL = 3600; // 1 hour

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly tokenService: TokenService,
    private readonly passwordService: PasswordService,
    private readonly emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await this.passwordService.hash(dto.password);
    const name = `${dto.firstName} ${dto.lastName}`.trim();
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        name,
      },
    });

    // Send verification email
    const verificationToken = this.emailService.generateVerificationToken(user.id);
    await this.emailService.sendVerificationEmail(
      { id: user.id, email: user.email, name: user.name },
      verificationToken,
    );

    const tokens = this.generateTokens(user);
    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async validateCredentials(
    email: string,
    password: string,
  ): Promise<Record<string, unknown> | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user || !user.passwordHash) return null;

    const valid = await this.passwordService.compare(password, user.passwordHash);
    if (!valid) return null;

    return this.sanitizeUser(user);
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        memberships: { select: { tenantId: true, role: true } },
      },
    });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await this.passwordService.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.emailVerified) {
      throw new ForbiddenException(
        'Email not verified. Please check your inbox.',
      );
    }

    if (user.mfaEnabled) {
      return {
        mfaRequired: true as const,
        userId: user.id,
      };
    }

    // If user has exactly one tenant membership, include it in tokens
    const membership = user.memberships.length === 1 ? user.memberships[0] : undefined;

    const tokens = this.generateTokens(user, membership);
    return {
      user: this.sanitizeUser(user),
      ...tokens,
      memberships: user.memberships.map((m) => ({
        tenantId: m.tenantId,
        role: m.role,
      })),
    };
  }

  async logout(jti: string, exp: number): Promise<void> {
    const expiresAt = new Date(exp * 1000);
    await this.tokenService.blacklistToken(jti, expiresAt);
  }

  async refreshTokens(refreshToken: string) {
    let payload: JwtPayload & { jti: string; type?: string; exp: number };
    try {
      payload = this.tokenService.verifyToken(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const isBlacklisted = await this.tokenService.isBlacklisted(payload.jti);
    if (isBlacklisted) {
      throw new UnauthorizedException('Token has been revoked');
    }

    // Blacklist old refresh token
    await this.tokenService.blacklistToken(
      payload.jti,
      new Date(payload.exp * 1000),
    );

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        memberships: { select: { tenantId: true, role: true } },
      },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const membership =
      payload.tenantId
        ? user.memberships.find((m) => m.tenantId === payload.tenantId)
        : user.memberships.length === 1
          ? user.memberships[0]
          : undefined;

    const tokens = this.generateTokens(user, membership);
    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async verifyEmail(token: string): Promise<void> {
    const result = this.emailService.validateVerificationToken(token);
    if (!result) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.prisma.user.update({
      where: { id: result.userId },
      data: { emailVerified: true },
    });
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    if (!user) return;

    const token = uuidv4();
    await this.redis.setex(
      `${RESET_TOKEN_PREFIX}${token}`,
      RESET_TOKEN_TTL,
      user.id,
    );

    await this.emailService.sendPasswordResetEmail(
      { id: user.id, email: user.email, name: user.name },
      token,
    );
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const userId = await this.redis.get(`${RESET_TOKEN_PREFIX}${token}`);
    if (!userId) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await this.passwordService.hash(newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Delete token so it can't be reused
    await this.redis.del(`${RESET_TOKEN_PREFIX}${token}`);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user || !user.passwordHash) {
      throw new BadRequestException('Cannot change password for this account');
    }

    const valid = await this.passwordService.compare(
      currentPassword,
      user.passwordHash,
    );
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const passwordHash = await this.passwordService.hash(newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  async loginOAuthUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: { select: { tenantId: true, role: true } },
      },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const membership = user.memberships.length === 1 ? user.memberships[0] : undefined;
    const tokens = this.generateTokens(user, membership);
    return {
      user: this.sanitizeUser(user),
      ...tokens,
      memberships: user.memberships.map((m) => ({
        tenantId: m.tenantId,
        role: m.role,
      })),
    };
  }

  async validateGoogleUser(profile: {
    googleId: string;
    email: string;
    name: string;
    avatarUrl?: string;
  }): Promise<Record<string, unknown>> {
    let user = await this.prisma.user.findUnique({
      where: { googleId: profile.googleId },
    });

    if (!user) {
      // Check if user exists with same email
      user = await this.prisma.user.findUnique({
        where: { email: profile.email.toLowerCase() },
      });

      if (user) {
        if (!user.emailVerified) {
          throw new UnauthorizedException(
            'Please verify your email before linking OAuth accounts',
          );
        }
        // Link Google account to existing user
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: profile.googleId,
            emailVerified: true,
            avatarUrl: user.avatarUrl || profile.avatarUrl,
          },
        });
      } else {
        // Create new user
        user = await this.prisma.user.create({
          data: {
            email: profile.email.toLowerCase(),
            name: profile.name,
            googleId: profile.googleId,
            avatarUrl: profile.avatarUrl,
            emailVerified: true,
          },
        });
      }
    }

    return this.sanitizeUser(user);
  }

  async validateAppleUser(profile: {
    appleId: string;
    email: string;
    name: string;
  }): Promise<Record<string, unknown>> {
    let user = await this.prisma.user.findUnique({
      where: { appleId: profile.appleId },
    });

    if (!user) {
      user = await this.prisma.user.findUnique({
        where: { email: profile.email.toLowerCase() },
      });

      if (user) {
        if (!user.emailVerified) {
          throw new UnauthorizedException(
            'Please verify your email before linking OAuth accounts',
          );
        }
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            appleId: profile.appleId,
            emailVerified: true,
          },
        });
      } else {
        user = await this.prisma.user.create({
          data: {
            email: profile.email.toLowerCase(),
            name: profile.name || 'Apple User',
            appleId: profile.appleId,
            emailVerified: true,
          },
        });
      }
    }

    return this.sanitizeUser(user);
  }

  private generateTokens(
    user: { id: string; email: string; role: string },
    membership?: { tenantId: string; role: string },
  ) {
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

  private sanitizeUser(user: Record<string, unknown>) {
    const result = { ...(user as Record<string, unknown>) };
    delete result['passwordHash'];
    delete result['mfaSecret'];
    delete result['mfaRecoveryCodes'];
    return result;
  }
}
