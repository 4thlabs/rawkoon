import {
  isFrenchFallbackTag,
  languageFallbackTag,
} from "@rawkoon/shared/utils/languageFamily";
import type { LanguageFallbackSummary } from "@rawkoon/shared/types";
import { parseAudioFlags } from "@rawkoon/api/utils/medias/filenameParser";

/**
 * Display tag when a release's only rejection is the language gate and its
 * audio is in a preferred language's family; null otherwise. Callers must keep
 * treating such a release as rejected for automatic grabs.
 */
export function classifyLanguageFallback(
  rawTitle: string,
  rejectionCodes: readonly string[],
  preferred: readonly string[],
): string | null {
  if (rejectionCodes.length !== 1 || rejectionCodes[0] !== "language_no_match")
    return null;
  return languageFallbackTag(parseAudioFlags(rawTitle), preferred);
}

export function buildLanguageFallbackSummary(
  preferred: readonly string[],
  tags: readonly string[],
): LanguageFallbackSummary | null {
  if (tags.length === 0) return null;
  const counts: Record<string, number> = {};
  for (const tag of tags) counts[tag] = (counts[tag] ?? 0) + 1;
  return { missing: [...preferred], counts };
}

function orList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} or ${items[items.length - 1]}`;
}

/** e.g. "No VFQ or VF2 release yet; 6 in other French versions (VFF 4, VFI 2)". */
export function languageFallbackReason(
  summary: LanguageFallbackSummary,
): string {
  const entries = Object.entries(summary.counts).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );
  const total = entries.reduce((sum, [, n]) => sum + n, 0);
  const french = entries.every(([tag]) => isFrenchFallbackTag(tag));
  const detail = entries.map(([tag, n]) => `${tag} ${n}`).join(", ");
  return `No ${orList(summary.missing)} release yet; ${total} in ${
    french ? "other French versions" : "other languages"
  } (${detail})`;
}
