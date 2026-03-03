import { describe, it, expect } from 'vitest';
import { cn } from './utils.js';

describe('cn (class name utility)', () => {
  it('should return an empty string when called with no arguments', () => {
    expect(cn()).toBe('');
  });

  it('should pass through a single class name', () => {
    expect(cn('px-4')).toBe('px-4');
  });

  it('should merge multiple class names', () => {
    const result = cn('px-4', 'py-2');
    expect(result).toContain('px-4');
    expect(result).toContain('py-2');
  });

  it('should handle conditional classes (false/undefined values)', () => {
    const isHidden = false;
    const result = cn('base', isHidden && 'hidden', undefined, null, 'visible');
    expect(result).toContain('base');
    expect(result).toContain('visible');
    expect(result).not.toContain('hidden');
  });

  it('should handle object syntax for conditional classes', () => {
    const result = cn({ 'text-red-500': true, 'text-blue-500': false });
    expect(result).toContain('text-red-500');
    expect(result).not.toContain('text-blue-500');
  });

  it('should handle array syntax', () => {
    const result = cn(['px-4', 'py-2']);
    expect(result).toContain('px-4');
    expect(result).toContain('py-2');
  });

  it('should resolve Tailwind conflicts — last value wins', () => {
    // tailwind-merge resolves conflicting classes
    const result = cn('px-4', 'px-8');
    expect(result).toBe('px-8');
    expect(result).not.toContain('px-4');
  });

  it('should resolve conflicting text color classes', () => {
    const result = cn('text-red-500', 'text-blue-500');
    expect(result).toBe('text-blue-500');
  });

  it('should resolve conflicting padding and keep non-conflicting', () => {
    const result = cn('px-4 py-2', 'px-8');
    expect(result).toContain('py-2');
    expect(result).toContain('px-8');
    expect(result).not.toContain('px-4');
  });

  it('should handle mixed object + string inputs', () => {
    const result = cn('base-class', { 'font-bold': true, italic: false }, 'mt-4');
    expect(result).toContain('base-class');
    expect(result).toContain('font-bold');
    expect(result).toContain('mt-4');
    expect(result).not.toContain('italic');
  });

  it('should handle deeply nested arrays', () => {
    const result = cn(['px-4', ['py-2', ['mt-4']]]);
    expect(result).toContain('px-4');
    expect(result).toContain('py-2');
    expect(result).toContain('mt-4');
  });

  it('should handle a realistic component pattern with variant overrides', () => {
    const baseClasses = 'rounded-md px-4 py-2 bg-blue-500 text-white';
    const variantOverride = 'bg-red-500';
    const userClassName = 'mt-8';
    const result = cn(baseClasses, variantOverride, userClassName);
    // bg-red-500 should override bg-blue-500
    expect(result).toContain('bg-red-500');
    expect(result).not.toContain('bg-blue-500');
    // Other base classes should remain
    expect(result).toContain('rounded-md');
    expect(result).toContain('text-white');
    expect(result).toContain('mt-8');
  });
});
