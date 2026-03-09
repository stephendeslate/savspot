const HEX_COLOR_RE = /^#[0-9a-fA-F]{3,8}$/;
const DEFAULT_BRAND_COLOR = '#2563EB';

/**
 * Sanitizes a CSS color value to prevent CSS injection.
 * Only allows hex color codes. Returns the default brand color for invalid values.
 */
export function sanitizeColor(color: string | null | undefined, fallback = DEFAULT_BRAND_COLOR): string {
  if (!color) return fallback;
  return HEX_COLOR_RE.test(color) ? color : fallback;
}
