const DANGEROUS_PATTERNS = [
  /\{%\s*load\b/i,
  /\{%\s*include\b/i,
  /\{%\s*extends\b/i,
  /\{%\s*ssi\b/i,
  /\{%\s*debug\b/i,
  /__[a-zA-Z]+__/,
  /\bimport\s*\(/,
  /\bexec\s*\(/,
  /\beval\s*\(/,
  /\brequire\s*\(/,
  /<script[\s>]/i,
  /javascript:/i,
  /on\w+\s*=/i,
];

const MAX_BODY_SIZE = 100 * 1024; // 100KB

export function sanitizeTemplate(body: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (body.length > MAX_BODY_SIZE) {
    errors.push(
      `Template body exceeds maximum size of ${MAX_BODY_SIZE} bytes (got ${body.length})`,
    );
  }

  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(body)) {
      errors.push(`Template contains dangerous construct matching ${pattern.source}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
