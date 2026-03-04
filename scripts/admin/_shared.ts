// =============================================================================
// SavSpot Platform Admin — Shared Utilities
// =============================================================================

import { PrismaClient } from '../../prisma/generated/prisma/index.js';

// ---------------------------------------------------------------------------
// Prisma Client (singleton)
// ---------------------------------------------------------------------------

let _prisma: PrismaClient | undefined;

export function getPrisma(): PrismaClient {
  if (!_prisma) {
    _prisma = new PrismaClient();
  }
  return _prisma;
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

async function shutdown(): Promise<void> {
  if (_prisma) {
    await _prisma.$disconnect();
  }
}

process.on('SIGINT', async () => {
  await shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await shutdown();
  process.exit(0);
});

process.on('beforeExit', async () => {
  await shutdown();
});

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

export interface ParsedArgs {
  /** Positional arguments (non-flag values) */
  positional: string[];
  /** Named flags (e.g., --key value) */
  flags: Record<string, string>;
  /** Boolean flags (e.g., --help) */
  booleans: Set<string>;
}

const BOOLEAN_FLAGS = new Set(['help', 'h', 'verbose', 'v', 'dry-run']);

export function parseArgs(argv?: string[]): ParsedArgs {
  const args = argv ?? process.argv.slice(2);
  const positional: string[] = [];
  const flags: Record<string, string> = {};
  const booleans = new Set<string>();

  let i = 0;
  while (i < args.length) {
    const arg = args[i]!;

    if (arg.startsWith('--')) {
      const key = arg.slice(2);

      if (BOOLEAN_FLAGS.has(key)) {
        booleans.add(key);
        i++;
        continue;
      }

      // Check for --key=value syntax
      const eqIndex = key.indexOf('=');
      if (eqIndex !== -1) {
        flags[key.slice(0, eqIndex)] = key.slice(eqIndex + 1);
        i++;
        continue;
      }

      // Next argument is the value
      const next = args[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        flags[key] = next;
        i += 2;
      } else {
        booleans.add(key);
        i++;
      }
    } else if (arg.startsWith('-')) {
      const key = arg.slice(1);
      if (BOOLEAN_FLAGS.has(key)) {
        booleans.add(key);
        i++;
      } else {
        const next = args[i + 1];
        if (next !== undefined && !next.startsWith('-')) {
          flags[key] = next;
          i += 2;
        } else {
          booleans.add(key);
          i++;
        }
      }
    } else {
      positional.push(arg);
      i++;
    }
  }

  return { positional, flags, booleans };
}

// ---------------------------------------------------------------------------
// Table formatting
// ---------------------------------------------------------------------------

export function formatTable(headers: string[], rows: string[][]): string {
  const allRows = [headers, ...rows];

  // Calculate column widths
  const colWidths = headers.map((h, colIndex) => {
    let maxWidth = h.length;
    for (const row of rows) {
      const cell = row[colIndex] ?? '';
      if (cell.length > maxWidth) {
        maxWidth = cell.length;
      }
    }
    return maxWidth;
  });

  // Build separator
  const separator = colWidths.map((w) => '-'.repeat(w + 2)).join('+');

  // Build rows
  const lines: string[] = [];
  for (let rowIdx = 0; rowIdx < allRows.length; rowIdx++) {
    const row = allRows[rowIdx]!;
    const cells = headers.map((_, colIndex) => {
      const cell = row[colIndex] ?? '';
      return ` ${cell.padEnd(colWidths[colIndex]!)} `;
    });
    lines.push(cells.join('|'));

    // Add separator after header
    if (rowIdx === 0) {
      lines.push(separator);
    }
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Currency formatting
// ---------------------------------------------------------------------------

export function formatCurrency(cents: number | bigint | string): string {
  const numCents =
    typeof cents === 'bigint'
      ? Number(cents)
      : typeof cents === 'string'
        ? parseFloat(cents)
        : cents;
  const dollars = numCents / 100;
  return `$${dollars.toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

export function exitWithError(message: string): never {
  console.error(`\nError: ${message}\n`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function hasHelp(parsed: ParsedArgs): boolean {
  return parsed.booleans.has('help') || parsed.booleans.has('h');
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}
