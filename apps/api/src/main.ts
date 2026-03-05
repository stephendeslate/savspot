import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  // Security headers via helmet (configured to allow Swagger UI)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [`'self'`],
          scriptSrc: [`'self'`, `'unsafe-inline'`, `'unsafe-eval'`],
          styleSrc: [`'self'`, `'unsafe-inline'`],
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
  const corsOrigins = [webUrl];
  if (webUrl.includes('://') && !webUrl.includes('localhost')) {
    const url = new URL(webUrl);
    if (url.hostname.startsWith('www.')) {
      corsOrigins.push(webUrl.replace('www.', ''));
    } else {
      corsOrigins.push(`${url.protocol}//www.${url.hostname}`);
    }
  }
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Global prefix (exclude health endpoint)
  app.setGlobalPrefix('api', {
    exclude: ['health'],
  });

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('SavSpot API')
    .setDescription('SavSpot multi-tenant booking platform API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

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
  logger.log(`Swagger docs available at http://localhost:${port}/docs`);
}

bootstrap();
