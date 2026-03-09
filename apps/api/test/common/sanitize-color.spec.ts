import { describe, it, expect } from 'vitest';
import { sanitizeColor } from '../../src/common/utils/sanitize-color';

describe('sanitizeColor', () => {
  it('passes through valid 3-digit hex codes', () => {
    expect(sanitizeColor('#fff')).toBe('#fff');
    expect(sanitizeColor('#000')).toBe('#000');
    expect(sanitizeColor('#abc')).toBe('#abc');
  });

  it('passes through valid 6-digit hex codes', () => {
    expect(sanitizeColor('#000000')).toBe('#000000');
    expect(sanitizeColor('#2563EB')).toBe('#2563EB');
    expect(sanitizeColor('#ff00ff')).toBe('#ff00ff');
  });

  it('passes through valid 8-digit hex codes (with alpha)', () => {
    expect(sanitizeColor('#ff000080')).toBe('#ff000080');
  });

  it('returns default for null', () => {
    expect(sanitizeColor(null)).toBe('#2563EB');
  });

  it('returns default for undefined', () => {
    expect(sanitizeColor(undefined)).toBe('#2563EB');
  });

  it('returns default for empty string', () => {
    expect(sanitizeColor('')).toBe('#2563EB');
  });

  it('returns default for named CSS color', () => {
    expect(sanitizeColor('red')).toBe('#2563EB');
  });

  it('returns default for CSS injection attempt', () => {
    expect(sanitizeColor('red; } body { display:none')).toBe('#2563EB');
  });

  it('returns default for javascript injection attempt', () => {
    expect(sanitizeColor('javascript:alert(1)')).toBe('#2563EB');
  });

  it('uses custom fallback parameter', () => {
    expect(sanitizeColor(null, '#000')).toBe('#000');
    expect(sanitizeColor('invalid', '#FF0000')).toBe('#FF0000');
  });
});
