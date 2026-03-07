import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { AuthService } from '../auth.service';

// passport-apple is a CommonJS module
// eslint-disable-next-line @typescript-eslint/no-require-imports
const AppleStrategy = require('passport-apple');

@Injectable()
export class AppleOAuthStrategy extends PassportStrategy(AppleStrategy, 'apple') {
  private readonly logger = new Logger(AppleOAuthStrategy.name);

  constructor(
    private readonly authService: AuthService,
    configService: ConfigService,
  ) {
    const clientID = configService.get<string>('APPLE_CLIENT_ID', 'not-configured');
    const teamID = configService.get<string>('APPLE_TEAM_ID', 'not-configured');
    const keyID = configService.get<string>('APPLE_KEY_ID', 'not-configured');
    const privateKeyLocation = configService.get<string>('APPLE_PRIVATE_KEY_PATH', '');
    const callbackURL = configService.get<string>(
      'APPLE_CALLBACK_URL',
      'http://localhost:3001/api/auth/apple/callback',
    );

    super({
      clientID,
      teamID,
      keyID,
      privateKeyLocation,
      callbackURL,
      scope: ['name', 'email'],
      passReqToCallback: true,
    });

    if (clientID === 'not-configured') {
      this.logger.warn('Apple Sign-In not configured — APPLE_CLIENT_ID missing');
    }
  }

  async validate(
    _req: Request,
    _accessToken: string,
    _refreshToken: string,
    decodedIdToken: { sub: string; email?: string },
    _profile: Record<string, unknown>,
    done: (err: Error | null, user?: Record<string, unknown>) => void,
  ): Promise<void> {
    try {
      // Apple only sends name on first authorization; extract from req.body if present
      const body = _req.body as { user?: string } | undefined;
      let firstName = '';
      let lastName = '';
      if (body?.user) {
        try {
          const userData = JSON.parse(body.user) as { name?: { firstName?: string; lastName?: string } };
          firstName = userData.name?.firstName || '';
          lastName = userData.name?.lastName || '';
        } catch {
          // user field not parseable
        }
      }

      const name = [firstName, lastName].filter(Boolean).join(' ') || '';

      const user = await this.authService.validateAppleUser({
        appleId: decodedIdToken.sub,
        email: decodedIdToken.email || '',
        name,
      });
      done(null, user);
    } catch (error) {
      done(error as Error, undefined);
    }
  }
}
