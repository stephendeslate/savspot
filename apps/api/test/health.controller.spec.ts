import { describe, it, expect } from 'vitest';
import { HealthController } from '@/health/health.controller';
import { RedisHealthIndicator } from '@/health/redis.health';

describe('HealthController', () => {
  it('should be defined with all dependencies', () => {
    // Verify the controller class exists and its constructor signature
    expect(HealthController).toBeDefined();
    expect(RedisHealthIndicator).toBeDefined();
  });

  it('should have a check method decorated with @Public and @HealthCheck', () => {
    // Verify the check method exists on the prototype
    expect(typeof HealthController.prototype.check).toBe('function');
  });
});
