import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Resend } from 'resend';

interface EmailUser {
  id: string;
  email: string;
  name: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly fromEmail: string;
  private readonly webUrl: string;
  private readonly hmacSecret: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.fromEmail = this.configService.get<string>(
      'RESEND_FROM_EMAIL',
      'onboarding@savspot.co',
    );
    this.webUrl = this.configService.get<string>('WEB_URL', 'http://localhost:3000');

    if (apiKey) {
      this.resend = new Resend(apiKey);
    } else {
      this.logger.warn('RESEND_API_KEY not set — emails will be logged to console');
      this.resend = null;
    }

    // Derive HMAC secret from JWT private key
    const jwtKey = this.configService.get<string>('JWT_PRIVATE_KEY_BASE64');
    if (!jwtKey) {
      this.logger.warn(
        'JWT_PRIVATE_KEY_BASE64 not set — using non-persistent HMAC key. Set this for production.',
      );
    }
    this.hmacSecret = crypto
      .createHash('sha256')
      .update(jwtKey || crypto.randomBytes(32).toString('hex'))
      .digest('hex');
  }

  generateVerificationToken(userId: string): string {
    const payload = JSON.stringify({
      userId,
      exp: Date.now() + 24 * 60 * 60 * 1000, // 24h
    });
    const encoded = Buffer.from(payload).toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.hmacSecret)
      .update(encoded)
      .digest('base64url');
    return `${encoded}.${signature}`;
  }

  validateVerificationToken(token: string): { userId: string } | null {
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [encoded, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', this.hmacSecret)
      .update(encoded as string)
      .digest('base64url');

    const sigBuf = Buffer.from(signature as string);
    const expectedBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

    try {
      const payload = JSON.parse(
        Buffer.from(encoded as string, 'base64url').toString('utf8'),
      );
      if (payload.exp < Date.now()) return null;
      return { userId: payload.userId };
    } catch {
      return null;
    }
  }

  async sendVerificationEmail(user: EmailUser, token: string): Promise<void> {
    const verifyUrl = `${this.webUrl}/verify-email?token=${token}`;
    const subject = 'Verify your SavSpot email';
    const html = `
      <h2>Welcome to SavSpot, ${user.name}!</h2>
      <p>Please verify your email address by clicking the link below:</p>
      <p><a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#000;color:#fff;text-decoration:none;border-radius:6px;">Verify Email</a></p>
      <p>This link expires in 24 hours.</p>
      <p>If you didn't create an account, you can ignore this email.</p>
    `;

    await this.send(user.email, subject, html);
  }

  async sendPasswordResetEmail(user: EmailUser, token: string): Promise<void> {
    const resetUrl = `${this.webUrl}/reset-password?token=${token}`;
    const subject = 'Reset your SavSpot password';
    const html = `
      <h2>Password Reset</h2>
      <p>Hi ${user.name}, we received a request to reset your password.</p>
      <p><a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#000;color:#fff;text-decoration:none;border-radius:6px;">Reset Password</a></p>
      <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
    `;

    await this.send(user.email, subject, html);
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    if (this.resend) {
      try {
        await this.resend.emails.send({
          from: this.fromEmail,
          to,
          subject,
          html,
        });
        this.logger.log(`Email sent to ${to}: ${subject}`);
      } catch (error) {
        this.logger.error(`Failed to send email to ${to}: ${error}`);
      }
    } else {
      this.logger.log(`[DEV EMAIL] To: ${to} | Subject: ${subject}`);
      this.logger.log(`[DEV EMAIL] Body:\n${html}`);
    }
  }
}
