import { searchIndex } from '@/generated/helpContent';
import type { SearchEntry } from '@/generated/helpContent';

export interface SearchResult extends SearchEntry {
  snippet: string;
}

const SNIPPET_RADIUS = 80;

function buildSnippet(text: string, query: string): string {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return text.slice(0, SNIPPET_RADIUS * 2);

  const start = Math.max(0, idx - SNIPPET_RADIUS);
  const end = Math.min(text.length, idx + query.length + SNIPPET_RADIUS);
  let snippet = text.slice(start, end).replace(/\n/g, ' ');
  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet += '...';
  return snippet;
}

export function searchHelp(query: string): SearchResult[] {
  const q = query.trim();
  if (q.length < 2) return [];

  const lowerQ = q.toLowerCase();
  return searchIndex
    .filter(
      (entry) =>
        entry.title.toLowerCase().includes(lowerQ) ||
        entry.plaintext.toLowerCase().includes(lowerQ),
    )
    .map((entry) => ({
      ...entry,
      snippet: buildSnippet(entry.plaintext, q),
    }));
}
