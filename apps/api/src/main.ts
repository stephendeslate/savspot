import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // CORS
  app.enableCors({
    origin: process.env['WEB_URL'] || 'http://localhost:3000',
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
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

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
