import type { LanguageFallbackSummary } from "@rawkoon/shared/types";
import { isFrenchFallbackTag } from "@rawkoon/shared/utils/languageFamily";

type T = (key: string, options?: Record<string, unknown>) => string;

/** "VFQ", "VFQ or VF2", "VFQ, VF2 or VFI". */
export function joinLanguages(t: T, languages: string[]): string {
  if (languages.length <= 1) return languages.join("");
  return `${languages.slice(0, -1).join(", ")}${t(
    "medias.interactive.languageFallback.or",
  )}${languages[languages.length - 1]}`;
}

function sortedCounts(summary: LanguageFallbackSummary) {
  return Object.entries(summary.counts).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );
}

export function languageFallbackTotal(summary: LanguageFallbackSummary) {
  return sortedCounts(summary).reduce((sum, [, n]) => sum + n, 0);
}

export function isFrenchSummary(summary: LanguageFallbackSummary): boolean {
  return Object.keys(summary.counts).every(isFrenchFallbackTag);
}

/** "VFF (4), VFI (2)" */
export function languageFallbackBreakdown(
  summary: LanguageFallbackSummary,
): string {
  return sortedCounts(summary)
    .map(([tag, n]) => `${tag} (${n})`)
    .join(", ");
}

/** "No VFQ or VF2 release yet; 6 in other French versions (VFF 4, VFI 2)" */
export function languageFallbackMissMessage(
  t: T,
  summary: LanguageFallbackSummary,
): string {
  return t(
    isFrenchSummary(summary)
      ? "library.management.languageFallbackMissFrench"
      : "library.management.languageFallbackMissOther",
    {
      languages: joinLanguages(t, summary.missing),
      count: languageFallbackTotal(summary),
      breakdown: sortedCounts(summary)
        .map(([tag, n]) => `${tag} ${n}`)
        .join(", "),
    },
  );
}
