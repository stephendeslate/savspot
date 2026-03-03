import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from '@/app.controller';

describe('AppController', () => {
  let controller: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    controller = module.get<AppController>(AppController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getRoot', () => {
    it('should return message and version', () => {
      const result = controller.getRoot();
      expect(result).toEqual({
        message: 'SavSpot API',
        version: '0.1.0',
      });
    });

    it('should return the correct API name', () => {
      const result = controller.getRoot();
      expect(result.message).toBe('SavSpot API');
    });

    it('should return a semver-formatted version', () => {
      const result = controller.getRoot();
      expect(result.version).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });
});
