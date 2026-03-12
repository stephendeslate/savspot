import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Query,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ConfigService } from '@nestjs/config';
import { CommunicationsService } from '../communications/communications.service';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly communicationsService: CommunicationsService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @Throttle({ default: { limit: process.env['NODE_ENV'] === 'test' ? 60 : 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Email not verified' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and blacklist token' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(
    @CurrentUser() user: { jti: string; exp: number },
  ) {
    await this.authService.logout(user.jti, user.exp);
    return { message: 'Logged out successfully' };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Tokens refreshed' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @Public()
  @Post('verify-email')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address' })
  @ApiResponse({ status: 200, description: 'Email verified' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    await this.authService.verifyEmail(dto.token);
    return { message: 'Email verified successfully' };
  }

  @Public()
  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiResponse({ status: 200, description: 'If account exists, reset email sent' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return { message: 'If an account with that email exists, a reset link has been sent' };
  }

  @Public()
  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { message: 'Password reset successfully' };
  }

  @ApiBearerAuth()
  @Patch('change-password')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Change password (authenticated)' })
  @ApiResponse({ status: 200, description: 'Password changed' })
  @ApiResponse({ status: 401, description: 'Current password incorrect' })
  async changePassword(
    @CurrentUser('sub') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(
      userId,
      dto.currentPassword,
      dto.newPassword,
    );
    return { message: 'Password changed successfully' };
  }

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  async googleAuth() {
    // Guard redirects to Google
  }

  @Public()
  @SkipThrottle()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleCallback(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const webUrl = this.configService.get<string>('WEB_URL', 'http://localhost:3000');
    const user = req.user as Record<string, unknown> | undefined;

    if (!user || !user['id']) {
      return res.redirect(`${webUrl}/login?error=google_auth_failed`);
    }

    try {
      const result = await this.authService.loginOAuthUser(user['id'] as string);
      const params = new URLSearchParams({
        accessToken: result.accessToken as string,
        refreshToken: result.refreshToken as string,
      });
      return res.redirect(`${webUrl}/login?${params.toString()}`);
    } catch {
      return res.redirect(`${webUrl}/login?error=google_auth_failed`);
    }
  }

  @Public()
  @Post('apple')
  @UseGuards(AuthGuard('apple'))
  @ApiOperation({ summary: 'Initiate Apple Sign-In' })
  async appleAuth() {
    // Guard redirects to Apple
  }

  @Public()
  @SkipThrottle()
  @Post('apple/callback')
  @UseGuards(AuthGuard('apple'))
  @ApiOperation({ summary: 'Apple Sign-In callback' })
  async appleCallback(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const webUrl = this.configService.get<string>('WEB_URL', 'http://localhost:3000');
    const user = req.user as Record<string, unknown> | undefined;

    if (!user || !user['id']) {
      return res.redirect(`${webUrl}/login?error=apple_auth_failed`);
    }

    try {
      const result = await this.authService.loginOAuthUser(user['id'] as string);
      const params = new URLSearchParams({
        accessToken: result.accessToken as string,
        refreshToken: result.refreshToken as string,
      });
      return res.redirect(`${webUrl}/login?${params.toString()}`);
    } catch {
      return res.redirect(`${webUrl}/login?error=apple_auth_failed`);
    }
  }

  @Public()
  @Get('unsubscribe')
  @ApiOperation({ summary: 'Unsubscribe from marketing emails via signed token' })
  @ApiResponse({ status: 200, description: 'Successfully unsubscribed' })
  @ApiResponse({ status: 400, description: 'Invalid or missing token' })
  async unsubscribe(@Query('token') token: string) {
    if (!token) {
      throw new BadRequestException('Missing unsubscribe token');
    }

    const result = this.communicationsService.validateUnsubscribeToken(token);
    if (!result) {
      throw new BadRequestException('Invalid or expired unsubscribe token');
    }

    // Disable marketing email preferences for this user
    const existing = await this.prisma.notificationPreference.findUnique({
      where: { userId: result.userId },
    });

    const currentPrefs = (existing?.preferences as Record<string, unknown>) ?? {};
    const updatedPrefs = {
      ...currentPrefs,
      marketingEmails: false,
      followUpEmails: false,
    };

    await this.prisma.notificationPreference.upsert({
      where: { userId: result.userId },
      create: {
        userId: result.userId,
        preferences: updatedPrefs,
      },
      update: {
        preferences: updatedPrefs,
      },
    });

    this.logger.log(`User ${result.userId} unsubscribed from marketing emails`);

    return { message: 'You have been successfully unsubscribed from marketing emails.' };
  }
}
