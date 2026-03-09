/**
 * Maximum allowed page size to prevent DoS via unbounded queries.
 */
export const MAX_PAGE_SIZE = 100;

/**
 * Clamp a requested page size to a safe range [1, MAX_PAGE_SIZE].
 */
export function clampPageSize(limit: number | undefined, defaultSize = 20): number {
  const size = limit ?? defaultSize;
  return Math.min(Math.max(1, size), MAX_PAGE_SIZE);
}
