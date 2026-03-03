import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { TenantContextService } from './tenant-context.service';
import { TenantContextMiddleware } from './tenant-context.middleware';

@Module({
  imports: [
    ClsModule.forRoot({
      middleware: {
        // Automatically mount CLS middleware for all routes
        mount: true,
        // Generate a request ID for each request
        generateId: true,
      },
    }),
  ],
  providers: [TenantContextService, TenantContextMiddleware],
  exports: [TenantContextService],
})
export class TenantContextModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Apply tenant context middleware to all API routes.
    // The middleware is safe for routes without a tenant context —
    // it simply skips setting the context if no tenantId is found.
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
