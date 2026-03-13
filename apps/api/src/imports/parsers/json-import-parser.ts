export function parseJson(
  data: string | Buffer,
  columnMapping?: Record<string, string> | null,
): Record<string, string>[] {
  const parsed: unknown = JSON.parse(
    typeof data === 'string' ? data : data.toString(),
  );

  if (!Array.isArray(parsed)) {
    throw new Error('JSON import data must be an array');
  }

  if (!columnMapping) return parsed as Record<string, string>[];

  return (parsed as Record<string, unknown>[]).map((row) => {
    const mapped: Record<string, string> = {};
    for (const [sourceKey, targetKey] of Object.entries(columnMapping)) {
      if (row[sourceKey] !== undefined) {
        mapped[targetKey] = String(row[sourceKey]);
      }
    }
    return mapped;
  });
}
