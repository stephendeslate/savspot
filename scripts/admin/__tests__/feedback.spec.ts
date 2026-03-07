import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma before any imports that reference it
vi.mock('../../../prisma/generated/prisma/index.js', () => ({
  PrismaClient: vi.fn(),
  FeedbackType: {
    FEATURE_REQUEST: 'FEATURE_REQUEST',
    UX_FRICTION: 'UX_FRICTION',
    COMPARISON_NOTE: 'COMPARISON_NOTE',
    GENERAL: 'GENERAL',
  },
  FeedbackStatus: {
    NEW: 'NEW',
    ACKNOWLEDGED: 'ACKNOWLEDGED',
    PLANNED: 'PLANNED',
    SHIPPED: 'SHIPPED',
    DECLINED: 'DECLINED',
  },
}));

import { parseArgs, formatTable, formatDate, truncate, hasHelp } from '../_shared.js';

// ---------------------------------------------------------------------------
// These tests verify the validation rules, data mapping, and display logic
// used by feedback.ts without executing the full CLI (which requires a DB).
// ---------------------------------------------------------------------------

const VALID_TYPES = ['FEATURE_REQUEST', 'UX_FRICTION', 'COMPARISON_NOTE', 'GENERAL'];
const VALID_STATUSES = ['NEW', 'ACKNOWLEDGED', 'PLANNED', 'SHIPPED', 'DECLINED'];

// ---------------------------------------------------------------------------
// CLI argument validation (mirrors feedback.ts validation logic)
// ---------------------------------------------------------------------------
describe('feedback CLI argument validation', () => {
  describe('--type validation', () => {
    it('should accept all valid feedback types', () => {
      for (const type of VALID_TYPES) {
        expect(VALID_TYPES.includes(type.toUpperCase())).toBe(true);
      }
    });

    it('should accept lowercase type values (uppercased before validation)', () => {
      const input = 'feature_request';
      expect(VALID_TYPES.includes(input.toUpperCase())).toBe(true);
    });

    it('should reject invalid type values', () => {
      const invalid = 'INVALID_TYPE';
      expect(VALID_TYPES.includes(invalid)).toBe(false);
    });

    it('should parse --type from CLI args', () => {
      const args = parseArgs(['--type', 'GENERAL']);
      expect(args.flags['type']).toBe('GENERAL');
    });

    it('should parse --type=value from CLI args', () => {
      const args = parseArgs(['--type=UX_FRICTION']);
      expect(args.flags['type']).toBe('UX_FRICTION');
    });
  });

  describe('--status validation', () => {
    it('should accept all valid feedback statuses', () => {
      for (const status of VALID_STATUSES) {
        expect(VALID_STATUSES.includes(status.toUpperCase())).toBe(true);
      }
    });

    it('should reject invalid status values', () => {
      expect(VALID_STATUSES.includes('OPEN')).toBe(false);
      expect(VALID_STATUSES.includes('CLOSED')).toBe(false);
    });
  });

  describe('--limit validation', () => {
    it('should default to 50 when not provided', () => {
      const args = parseArgs([]);
      const limit = parseInt(args.flags['limit'] ?? '50', 10);
      expect(limit).toBe(50);
    });

    it('should parse a custom limit', () => {
      const args = parseArgs(['--limit', '100']);
      const limit = parseInt(args.flags['limit'] ?? '50', 10);
      expect(limit).toBe(100);
    });

    it('should detect invalid limit (NaN)', () => {
      const args = parseArgs(['--limit', 'abc']);
      const limit = parseInt(args.flags['limit'] ?? '50', 10);
      expect(isNaN(limit)).toBe(true);
    });

    it('should detect zero limit as invalid', () => {
      const args = parseArgs(['--limit', '0']);
      const limit = parseInt(args.flags['limit'] ?? '50', 10);
      expect(limit < 1).toBe(true);
    });

    it('should detect negative limit as invalid', () => {
      const args = parseArgs(['--limit', '-5']);
      const limit = parseInt(args.flags['limit'] ?? '50', 10);
      expect(limit < 1).toBe(true);
    });
  });

  describe('--since validation', () => {
    it('should accept valid ISO date strings', () => {
      const sinceDate = new Date('2026-01-01');
      expect(isNaN(sinceDate.getTime())).toBe(false);
    });

    it('should accept full ISO datetime strings', () => {
      const sinceDate = new Date('2026-03-06T14:30:00Z');
      expect(isNaN(sinceDate.getTime())).toBe(false);
    });

    it('should reject invalid date strings', () => {
      const sinceDate = new Date('not-a-date');
      expect(isNaN(sinceDate.getTime())).toBe(true);
    });

    it('should parse --since from CLI args', () => {
      const args = parseArgs(['--since', '2026-01-01']);
      expect(args.flags['since']).toBe('2026-01-01');
    });
  });

  describe('--acknowledge flag', () => {
    it('should parse acknowledge ID from args', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const args = parseArgs(['--acknowledge', uuid]);
      expect(args.flags['acknowledge']).toBe(uuid);
    });

    it('should parse acknowledge with = syntax', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const args = parseArgs([`--acknowledge=${uuid}`]);
      expect(args.flags['acknowledge']).toBe(uuid);
    });
  });

  describe('--help flag', () => {
    it('should detect --help in feedback context', () => {
      const args = parseArgs(['--help']);
      expect(hasHelp(args)).toBe(true);
    });

    it('should detect -h in feedback context', () => {
      const args = parseArgs(['-h']);
      expect(hasHelp(args)).toBe(true);
    });

    it('should not flag help when other flags are used', () => {
      const args = parseArgs(['--type', 'GENERAL', '--status', 'NEW']);
      expect(hasHelp(args)).toBe(false);
    });
  });

  describe('--tenant flag', () => {
    it('should parse tenant ID from args', () => {
      const args = parseArgs(['--tenant', 'tenant-uuid-123']);
      expect(args.flags['tenant']).toBe('tenant-uuid-123');
    });
  });

  describe('combined flag parsing', () => {
    it('should handle multiple filters together', () => {
      const args = parseArgs([
        '--type', 'FEATURE_REQUEST',
        '--status', 'NEW',
        '--tenant', 'tenant-123',
        '--since', '2026-01-01',
        '--limit', '25',
      ]);
      expect(args.flags['type']).toBe('FEATURE_REQUEST');
      expect(args.flags['status']).toBe('NEW');
      expect(args.flags['tenant']).toBe('tenant-123');
      expect(args.flags['since']).toBe('2026-01-01');
      expect(args.flags['limit']).toBe('25');
    });
  });
});

// ---------------------------------------------------------------------------
// Feedback display/mapping logic (mirrors the row-mapping in feedback.ts)
// ---------------------------------------------------------------------------
describe('feedback display logic', () => {
  const HEADERS = ['Date', 'Type', 'Tenant', 'User', 'Body', 'Status'];

  function mapItemToRow(item: {
    createdAt: Date;
    type: string;
    tenant: { name: string };
    submitter: { email: string };
    body: string;
    status: string;
  }): string[] {
    const typeLabel =
      item.type === 'COMPARISON_NOTE'
        ? `[COMPETITIVE] ${item.type}`
        : item.type;

    return [
      formatDate(item.createdAt),
      typeLabel,
      truncate(item.tenant.name, 20),
      truncate(item.submitter.email, 25),
      truncate(item.body, 80),
      item.status,
    ];
  }

  it('should map a standard feedback item to a table row', () => {
    const item = {
      createdAt: new Date('2026-03-06T10:00:00Z'),
      type: 'FEATURE_REQUEST',
      tenant: { name: 'Acme Corp' },
      submitter: { email: 'user@example.com' },
      body: 'Please add dark mode',
      status: 'NEW',
    };

    const row = mapItemToRow(item);
    expect(row).toEqual([
      '2026-03-06 10:00:00',
      'FEATURE_REQUEST',
      'Acme Corp',
      'user@example.com',
      'Please add dark mode',
      'NEW',
    ]);
  });

  it('should prefix COMPARISON_NOTE with [COMPETITIVE] label', () => {
    const item = {
      createdAt: new Date('2026-02-01T08:00:00Z'),
      type: 'COMPARISON_NOTE',
      tenant: { name: 'Test Salon' },
      submitter: { email: 'owner@salon.com' },
      body: 'Competitor X has better calendar view',
      status: 'ACKNOWLEDGED',
    };

    const row = mapItemToRow(item);
    expect(row[1]).toBe('[COMPETITIVE] COMPARISON_NOTE');
  });

  it('should truncate long tenant names to 20 chars', () => {
    const item = {
      createdAt: new Date('2026-01-15T12:00:00Z'),
      type: 'GENERAL',
      tenant: { name: 'Very Long Tenant Name That Exceeds Limit' },
      submitter: { email: 'a@b.com' },
      body: 'Some feedback',
      status: 'NEW',
    };

    const row = mapItemToRow(item);
    expect(row[2]!.length).toBeLessThanOrEqual(20);
    expect(row[2]).toBe('Very Long Tenant ...');
  });

  it('should truncate long email addresses to 25 chars', () => {
    const item = {
      createdAt: new Date('2026-01-15T12:00:00Z'),
      type: 'UX_FRICTION',
      tenant: { name: 'Salon' },
      submitter: { email: 'very.long.email.address@extremely-long-domain.com' },
      body: 'Hard to find settings',
      status: 'NEW',
    };

    const row = mapItemToRow(item);
    expect(row[3]!.length).toBeLessThanOrEqual(25);
  });

  it('should truncate long feedback body to 80 chars', () => {
    const longBody = 'A'.repeat(120);
    const item = {
      createdAt: new Date('2026-01-15T12:00:00Z'),
      type: 'GENERAL',
      tenant: { name: 'Test' },
      submitter: { email: 'user@test.com' },
      body: longBody,
      status: 'NEW',
    };

    const row = mapItemToRow(item);
    expect(row[4]!.length).toBeLessThanOrEqual(80);
    expect(row[4]).toMatch(/\.\.\.$/);
  });

  it('should format the full table output correctly', () => {
    const rows = [
      [
        '2026-03-06 10:00:00',
        'FEATURE_REQUEST',
        'Acme Corp',
        'user@example.com',
        'Add dark mode',
        'NEW',
      ],
    ];

    const table = formatTable(HEADERS, rows);
    const lines = table.split('\n');
    expect(lines).toHaveLength(3); // header + separator + 1 row
    expect(lines[0]).toContain('Date');
    expect(lines[0]).toContain('Type');
    expect(lines[0]).toContain('Status');
  });

  describe('summary statistics', () => {
    const items = [
      { type: 'FEATURE_REQUEST', status: 'NEW' },
      { type: 'FEATURE_REQUEST', status: 'PLANNED' },
      { type: 'COMPARISON_NOTE', status: 'NEW' },
      { type: 'GENERAL', status: 'SHIPPED' },
      { type: 'UX_FRICTION', status: 'ACKNOWLEDGED' },
      { type: 'COMPARISON_NOTE', status: 'NEW' },
    ];

    it('should count competitive intelligence items correctly', () => {
      const competitiveCount = items.filter((i) => i.type === 'COMPARISON_NOTE').length;
      expect(competitiveCount).toBe(2);
    });

    it('should group items by type correctly', () => {
      const byType = items.reduce(
        (acc, i) => {
          acc[i.type] = (acc[i.type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );
      expect(byType['FEATURE_REQUEST']).toBe(2);
      expect(byType['COMPARISON_NOTE']).toBe(2);
      expect(byType['GENERAL']).toBe(1);
      expect(byType['UX_FRICTION']).toBe(1);
    });

    it('should group items by status correctly', () => {
      const byStatus = items.reduce(
        (acc, i) => {
          acc[i.status] = (acc[i.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );
      expect(byStatus['NEW']).toBe(3);
      expect(byStatus['PLANNED']).toBe(1);
      expect(byStatus['SHIPPED']).toBe(1);
      expect(byStatus['ACKNOWLEDGED']).toBe(1);
    });

    it('should report zero competitive items when none exist', () => {
      const noCompetitive = [
        { type: 'FEATURE_REQUEST', status: 'NEW' },
        { type: 'GENERAL', status: 'NEW' },
      ];
      const competitiveCount = noCompetitive.filter((i) => i.type === 'COMPARISON_NOTE').length;
      expect(competitiveCount).toBe(0);
    });
  });

  describe('where clause construction', () => {
    it('should build empty where clause when no filters given', () => {
      const args = parseArgs([]);
      const where: Record<string, unknown> = {};
      const typeFilter = args.flags['type']?.toUpperCase();
      const statusFilter = args.flags['status']?.toUpperCase();
      const tenantFilter = args.flags['tenant'];
      const sinceFilter = args.flags['since'];

      if (typeFilter) where['type'] = typeFilter;
      if (statusFilter) where['status'] = statusFilter;
      if (tenantFilter) where['tenantId'] = tenantFilter;
      if (sinceFilter) where['createdAt'] = { gte: new Date(sinceFilter) };

      expect(where).toEqual({});
    });

    it('should build where clause with type filter', () => {
      const args = parseArgs(['--type', 'general']);
      const where: Record<string, unknown> = {};
      const typeFilter = args.flags['type']?.toUpperCase();
      if (typeFilter) where['type'] = typeFilter;

      expect(where).toEqual({ type: 'GENERAL' });
    });

    it('should build where clause with all filters', () => {
      const args = parseArgs([
        '--type', 'feature_request',
        '--status', 'new',
        '--tenant', 'tid-123',
        '--since', '2026-01-01',
      ]);
      const where: Record<string, unknown> = {};
      const typeFilter = args.flags['type']?.toUpperCase();
      const statusFilter = args.flags['status']?.toUpperCase();
      const tenantFilter = args.flags['tenant'];
      const sinceFilter = args.flags['since'];

      if (typeFilter) where['type'] = typeFilter;
      if (statusFilter) where['status'] = statusFilter;
      if (tenantFilter) where['tenantId'] = tenantFilter;
      if (sinceFilter) where['createdAt'] = { gte: new Date(sinceFilter) };

      expect(where['type']).toBe('FEATURE_REQUEST');
      expect(where['status']).toBe('NEW');
      expect(where['tenantId']).toBe('tid-123');
      expect(where['createdAt']).toEqual({ gte: new Date('2026-01-01') });
    });
  });
});
