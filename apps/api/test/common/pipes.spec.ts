import { describe, it, expect } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { UuidValidationPipe } from '@/common/pipes/uuid-validation.pipe';

describe('UuidValidationPipe', () => {
  const pipe = new UuidValidationPipe();

  it('should accept a valid UUID v4', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    expect(pipe.transform(uuid)).toBe(uuid);
  });

  it('should accept a valid UUID v4 with uppercase hex digits', () => {
    const uuid = '550E8400-E29B-41D4-A716-446655440000';
    expect(pipe.transform(uuid)).toBe(uuid);
  });

  it('should reject a non-UUID string', () => {
    expect(() => pipe.transform('not-a-uuid')).toThrow(BadRequestException);
  });

  it('should reject an empty string', () => {
    expect(() => pipe.transform('')).toThrow(BadRequestException);
  });

  it('should reject a UUID without hyphens', () => {
    expect(() => pipe.transform('550e8400e29b41d4a716446655440000')).toThrow(
      BadRequestException,
    );
  });

  it('should reject a UUID v1 (version digit is not 4)', () => {
    expect(() =>
      pipe.transform('550e8400-e29b-11d4-a716-446655440000'),
    ).toThrow(BadRequestException);
  });

  it('should reject non-string values cast as string', () => {
    expect(() => pipe.transform(123 as never)).toThrow(BadRequestException);
  });

  it('should include the invalid value in the error message', () => {
    try {
      pipe.transform('bad-value');
    } catch (e) {
      expect((e as BadRequestException).message).toContain('bad-value');
    }
  });
});
