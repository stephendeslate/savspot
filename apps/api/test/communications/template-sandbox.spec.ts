import { describe, it, expect } from 'vitest';
import { sanitizeTemplate } from '@/communications/template-sandbox';
import { renderTemplate } from '@/communications/template-variables';

// ---------------------------------------------------------------------------
// sanitizeTemplate
// ---------------------------------------------------------------------------

describe('sanitizeTemplate', () => {
  it('should pass valid templates', () => {
    const result = sanitizeTemplate('<p>Hi {{client.name}}, your booking is confirmed.</p>');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should pass simple HTML templates', () => {
    const result = sanitizeTemplate('<h1>Welcome</h1><p>Thank you for booking.</p>');
    expect(result.valid).toBe(true);
  });

  it('should reject templates with script tags', () => {
    const result = sanitizeTemplate('<script>alert("xss")</script>');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should reject templates with javascript: protocol', () => {
    const result = sanitizeTemplate('<a href="javascript:alert(1)">click</a>');
    expect(result.valid).toBe(false);
  });

  it('should reject templates with inline event handlers', () => {
    const result = sanitizeTemplate('<img onerror="alert(1)" src="x">');
    expect(result.valid).toBe(false);
  });

  it('should reject templates with dunder patterns', () => {
    const result = sanitizeTemplate('Hello __proto__');
    expect(result.valid).toBe(false);
  });

  it('should reject templates with import()', () => {
    const result = sanitizeTemplate('{{import("fs")}}');
    expect(result.valid).toBe(false);
  });

  it('should reject templates with eval()', () => {
    const result = sanitizeTemplate('{{eval("code")}}');
    expect(result.valid).toBe(false);
  });

  it('should reject templates with require()', () => {
    const result = sanitizeTemplate('{{require("fs")}}');
    expect(result.valid).toBe(false);
  });

  it('should reject templates with load directive', () => {
    const result = sanitizeTemplate('{% load custom_tags %}');
    expect(result.valid).toBe(false);
  });

  it('should reject templates with include directive', () => {
    const result = sanitizeTemplate('{% include "header.html" %}');
    expect(result.valid).toBe(false);
  });

  it('should reject templates exceeding size limit', () => {
    const body = 'x'.repeat(100 * 1024 + 1);
    const result = sanitizeTemplate(body);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('maximum size');
  });

  it('should pass templates at exactly the size limit', () => {
    const body = 'x'.repeat(100 * 1024);
    const result = sanitizeTemplate(body);
    expect(result.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// renderTemplate
// ---------------------------------------------------------------------------

describe('renderTemplate', () => {
  it('should replace simple variables', () => {
    const result = renderTemplate('Hi {{client.name}}!', {
      client: { name: 'Alice' },
    });
    expect(result).toBe('Hi Alice!');
  });

  it('should handle nested paths', () => {
    const result = renderTemplate('Service: {{booking.service_name}}', {
      booking: { service_name: 'Haircut' },
    });
    expect(result).toBe('Service: Haircut');
  });

  it('should return empty string for null/undefined values', () => {
    const result = renderTemplate('Hi {{client.name}}!', {
      client: { name: null },
    });
    expect(result).toBe('Hi !');
  });

  it('should return empty string for missing variables', () => {
    const result = renderTemplate('Hi {{client.name}}!', {});
    expect(result).toBe('Hi !');
  });

  it('should handle multiple variables in one template', () => {
    const result = renderTemplate(
      '{{client.name}} booked {{booking.service_name}}',
      {
        client: { name: 'Alice' },
        booking: { service_name: 'Haircut' },
      },
    );
    expect(result).toBe('Alice booked Haircut');
  });

  it('should escape HTML by default', () => {
    const result = renderTemplate('{{client.name}}', {
      client: { name: '<b>Alice</b>' },
    });
    expect(result).toContain('&lt;b&gt;');
  });

  it('should not escape HTML when disabled', () => {
    const result = renderTemplate(
      '{{client.name}}',
      { client: { name: '<b>Alice</b>' } },
      { escapeHtml: false },
    );
    expect(result).toBe('<b>Alice</b>');
  });

  it('should handle whitespace around variable names', () => {
    const result = renderTemplate('Hi {{ client.name }}!', {
      client: { name: 'Alice' },
    });
    expect(result).toBe('Hi Alice!');
  });
});
