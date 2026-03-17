#!/usr/bin/env tsx
// =============================================================================
// SavSpot Platform Admin — Platform Configuration
// Usage: tsx scripts/admin/platform-config.ts [get|set] [--key KEY] [--value VALUE]
// =============================================================================

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  parseArgs,
  formatTable,
  hasHelp,
  exitWithError,
} from './_shared.js';

const USAGE = `
SavSpot Admin — Platform Configuration

Usage:
  tsx scripts/admin/platform-config.ts <command> [options]

Commands:
  get     Read and display all config or a specific key
  set     Update a specific key-value pair

Options:
  --key <KEY>       Config key to get or set
  --value <VALUE>   Value to set (required for set command)
  --help            Show this help message

Available Keys:
  platform_fee_percent           Platform fee percentage (e.g., 1)
  referral_commission_percent    Referral commission percentage (e.g., 5)
  maintenance_mode               Enable/disable maintenance mode (true/false)

Examples:
  tsx scripts/admin/platform-config.ts get
  tsx scripts/admin/platform-config.ts get --key platform_fee_percent
  tsx scripts/admin/platform-config.ts set --key platform_fee_percent --value 1.5
  tsx scripts/admin/platform-config.ts set --key maintenance_mode --value true
`.trim();

// ---------------------------------------------------------------------------
// Configuration file management
// ---------------------------------------------------------------------------

interface PlatformConfig {
  platform_fee_percent: number;
  referral_commission_percent: number;
  maintenance_mode: boolean;
  [key: string]: unknown;
}

const VALID_KEYS = [
  'platform_fee_percent',
  'referral_commission_percent',
  'maintenance_mode',
] as const;

type ValidKey = (typeof VALID_KEYS)[number];

const DEFAULT_CONFIG: PlatformConfig = {
  platform_fee_percent: 1,
  referral_commission_percent: 5,
  maintenance_mode: false,
};

// Resolve config path relative to project root (two levels up from scripts/admin/)
const CONFIG_DIR = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '../../config',
);
const CONFIG_PATH = path.join(CONFIG_DIR, 'platform-config.json');

function ensureConfigExists(): PlatformConfig {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }

  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2) + '\n', 'utf-8');
    console.log(`  Config file created at: ${CONFIG_PATH}`);
    return { ...DEFAULT_CONFIG };
  }

  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as PlatformConfig;
    // Merge with defaults to ensure all keys exist
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    exitWithError(`Failed to parse config file at ${CONFIG_PATH}. Please check JSON syntax.`);
  }
}

function saveConfig(config: PlatformConfig): void {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}

function isValidKey(key: string): key is ValidKey {
  return (VALID_KEYS as readonly string[]).includes(key);
}

function parseValue(key: ValidKey, rawValue: string): unknown {
  switch (key) {
    case 'platform_fee_percent':
    case 'referral_commission_percent': {
      const num = parseFloat(rawValue);
      if (isNaN(num) || num < 0 || num > 100) {
        exitWithError(`"${key}" must be a number between 0 and 100. Got: "${rawValue}"`);
      }
      return num;
    }

    case 'maintenance_mode': {
      const lower = rawValue.toLowerCase();
      if (lower === 'true' || lower === '1' || lower === 'yes') return true;
      if (lower === 'false' || lower === '0' || lower === 'no') return false;
      exitWithError(
        `"${key}" must be true/false (or yes/no, 1/0). Got: "${rawValue}"`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

function getConfig(key?: string): void {
  const config = ensureConfigExists();

  if (key) {
    if (!isValidKey(key)) {
      exitWithError(
        `Unknown config key "${key}". Valid keys: ${VALID_KEYS.join(', ')}`,
      );
    }
    console.log(`\n  ${key} = ${JSON.stringify(config[key])}\n`);
    return;
  }

  // Show all config
  const headers = ['Key', 'Value', 'Type'];
  const rows = VALID_KEYS.map((k) => [
    k,
    JSON.stringify(config[k]),
    typeof config[k],
  ]);

  console.log(`\nPlatform Configuration (${CONFIG_PATH}):\n`);
  console.log(formatTable(headers, rows));
  console.log();
}

function setConfig(key: string, rawValue: string): void {
  if (!isValidKey(key)) {
    exitWithError(
      `Unknown config key "${key}". Valid keys: ${VALID_KEYS.join(', ')}`,
    );
  }

  const config = ensureConfigExists();
  const previousValue = config[key];
  const newValue = parseValue(key, rawValue);

  (config as Record<string, unknown>)[key] = newValue;
  saveConfig(config);

  console.log(`\nConfiguration updated:`);
  console.log(`  Key:            ${key}`);
  console.log(`  Previous Value: ${JSON.stringify(previousValue)}`);
  console.log(`  New Value:      ${JSON.stringify(newValue)}`);
  console.log(`  File:           ${CONFIG_PATH}`);
  console.log();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const args = parseArgs();

  if (hasHelp(args)) {
    console.log(USAGE);
    return;
  }

  const command = args.positional[0];

  if (!command) {
    console.log(USAGE);
    exitWithError('Please specify a command: get or set');
  }

  switch (command) {
    case 'get': {
      getConfig(args.flags['key']);
      break;
    }

    case 'set': {
      const key = args.flags['key'];
      const value = args.flags['value'];

      if (!key) {
        exitWithError('--key is required for set command');
      }
      if (value === undefined) {
        exitWithError('--value is required for set command');
      }

      setConfig(key, value);
      break;
    }

    default:
      exitWithError(`Unknown command "${command}". Use get or set.`);
  }
}

main();
