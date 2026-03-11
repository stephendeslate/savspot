import './instrument';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const isProduction = process.env['NODE_ENV'] === 'production';
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    bufferLogs: true,
  });

  const logger = app.get(Logger);
  app.useLogger(logger);

  // Enable graceful shutdown (fires OnModuleDestroy hooks on SIGTERM/SIGINT)
  app.enableShutdownHooks();

  // Security headers via helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [`'self'`],
          // Relax CSP only in dev for Swagger UI
          scriptSrc: isProduction
            ? [`'self'`]
            : [`'self'`, `'unsafe-inline'`, `'unsafe-eval'`],
          styleSrc: isProduction
            ? [`'self'`]
            : [`'self'`, `'unsafe-inline'`],
          imgSrc: [`'self'`, 'data:', 'https:'],
          fontSrc: [`'self'`, 'https://fonts.gstatic.com'],
        },
      },
      crossOriginEmbedderPolicy: false,
      xFrameOptions: false, // Handled by SecurityHeadersMiddleware (supports /embed exception)
    }),
  );

  // Cookie parsing (for refresh tokens)
  app.use(cookieParser());

  // CORS — allow configured origin + www variant
  const webUrl = process.env['WEB_URL'] || 'http://localhost:3000';
  const corsOrigins: (string | RegExp)[] = [webUrl];
  if (webUrl.includes('://') && !webUrl.includes('localhost')) {
    const url = new URL(webUrl);
    if (url.hostname.startsWith('www.')) {
      corsOrigins.push(webUrl.replace('www.', ''));
    } else {
      corsOrigins.push(`${url.protocol}//www.${url.hostname}`);
    }
  }
  // In development, also allow access from LAN IPs (e.g. accessing from another machine)
  if (!isProduction) {
    const webPort = new URL(webUrl).port || '3000';
    corsOrigins.push(new RegExp(`^http://192\\.168\\.\\d+\\.\\d+:${webPort}$`));
    corsOrigins.push(new RegExp(`^http://10\\.\\d+\\.\\d+\\.\\d+:${webPort}$`));
    corsOrigins.push(new RegExp(`^http://172\\.(1[6-9]|2\\d|3[01])\\.\\d+\\.\\d+:${webPort}$`));
  }
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Global prefix (exclude health endpoint)
  app.setGlobalPrefix('api', {
    exclude: ['health'],
  });

  // Swagger (disabled in production — exposes full API schema)
  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('SavSpot API')
      .setDescription('SavSpot multi-tenant booking platform API')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  }

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global response transformer
  app.useGlobalInterceptors(new TransformInterceptor());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env['PORT'] || 3001;
  await app.listen(port);
  logger.log(`SavSpot API running on http://localhost:${port}`);
  if (!isProduction) {
    logger.log(`Swagger docs available at http://localhost:${port}/docs`);
  }
}

bootstrap().catch((err) => {
  // Ensure fatal startup errors are logged to stdout before exit
  // (Fly.io captures stdout/stderr in machine logs)
  console.error('Fatal startup error:', err);
  process.exit(1);
});
