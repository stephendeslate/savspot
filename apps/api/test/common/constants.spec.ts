import { describe, it, expect } from 'vitest';
import {
  WALK_IN_EMAIL_DOMAIN,
  getWalkInEmail,
} from '@/common/constants';

describe('WALK_IN_EMAIL_DOMAIN', () => {
  it('equals savspot.co', () => {
    expect(WALK_IN_EMAIL_DOMAIN).toBe('savspot.co');
  });
});

describe('getWalkInEmail', () => {
  it('returns correct email format for a standard tenant ID', () => {
    expect(getWalkInEmail('tenant-123')).toBe('walkin+tenant-123@savspot.co');
  });

  it('returns correct email format for a UUID tenant ID', () => {
    const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    expect(getWalkInEmail(uuid)).toBe(`walkin+${uuid}@savspot.co`);
  });

  it('handles empty string tenant ID', () => {
    expect(getWalkInEmail('')).toBe('walkin+@savspot.co');
  });

  it('handles tenant ID with special characters', () => {
    expect(getWalkInEmail('tenant+special')).toBe(
      'walkin+tenant+special@savspot.co',
    );
  });

  it('always uses the WALK_IN_EMAIL_DOMAIN', () => {
    const result = getWalkInEmail('any-tenant');
    expect(result).toMatch(/@savspot\.co$/);
  });
});
