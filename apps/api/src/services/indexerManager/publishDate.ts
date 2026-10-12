/** ISO timestamp from an indexer's publish date field, or null when absent or unparseable. */
export function parsePublishDate(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}
