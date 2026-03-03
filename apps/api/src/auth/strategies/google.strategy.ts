import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(
    private readonly authService: AuthService,
    configService: ConfigService,
  ) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID', 'not-configured');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET', 'not-configured');
    const callbackURL = configService.get<string>(
      'GOOGLE_CALLBACK_URL',
      'http://localhost:3001/api/auth/google/callback',
    );

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
    });

    if (clientID === 'not-configured') {
      this.logger.warn('Google OAuth not configured — GOOGLE_CLIENT_ID missing');
    }
  }

  async validate(
    accessToken: string,
    _refreshToken: string,
    profile: {
      id: string;
      emails?: Array<{ value: string }>;
      displayName?: string;
      photos?: Array<{ value: string }>;
    },
    done: VerifyCallback,
  ): Promise<void> {
    try {
      const user = await this.authService.validateGoogleUser({
        googleId: profile.id,
        email: profile.emails?.[0]?.value || '',
        name: profile.displayName || '',
        avatarUrl: profile.photos?.[0]?.value,
      });
      done(null, user);
    } catch (error) {
      done(error as Error, undefined);
    }
  }
}
