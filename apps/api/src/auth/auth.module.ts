import { Module, forwardRef } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { ApiKeyController } from './api-key.controller';
import { MfaController } from './mfa/mfa.controller';
import { AuthService } from './auth.service';
import { TokenService } from './services/token.service';
import { PasswordService } from './services/password.service';
import { EmailService } from './services/email.service';
import { ApiKeyService } from './api-key.service';
import { MfaService } from './mfa/mfa.service';
import { PermissionsService } from './permissions/permissions.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { AppleOAuthStrategy } from './strategies/apple.strategy';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UsersModule } from '../users/users.module';
import { CommunicationsModule } from '../communications/communications.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    UsersModule,
    forwardRef(() => CommunicationsModule),
  ],
  controllers: [AuthController, ApiKeyController, MfaController],
  providers: [
    AuthService,
    TokenService,
    PasswordService,
    EmailService,
    ApiKeyService,
    MfaService,
    PermissionsService,
    JwtStrategy,
    LocalStrategy,
    GoogleStrategy,
    AppleOAuthStrategy,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  exports: [AuthService, TokenService, ApiKeyService, MfaService, PermissionsService],
})
export class AuthModule {}
