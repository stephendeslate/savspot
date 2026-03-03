import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from '@/health/health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return status ok', () => {
    const result = controller.check();

    expect(result).toHaveProperty('status', 'ok');
    expect(result).toHaveProperty('timestamp');
    expect(result).toHaveProperty('version', '0.1.0');
  });

  it('should return a valid ISO timestamp', () => {
    const result = controller.check();
    const parsed = new Date(result.timestamp);

    expect(parsed.toISOString()).toBe(result.timestamp);
  });
});
