import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('cn', () => {
  it('should merge class strings', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('should handle empty arguments', () => {
    expect(cn()).toBe('');
  });

  it('should filter falsy values', () => {
    const showBar = false;
    expect(cn('foo', showBar && 'bar', null, undefined, 'baz')).toBe('foo baz');
  });

  it('should handle conditional object syntax', () => {
    expect(cn({ 'text-red': true, hidden: false })).toBe('text-red');
  });

  it('should resolve tailwind conflicts (last wins)', () => {
    expect(cn('px-4', 'px-8')).toBe('px-8');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('should handle mixed inputs', () => {
    expect(cn('base', { active: true }, ['extra'])).toBe('base active extra');
  });
});
