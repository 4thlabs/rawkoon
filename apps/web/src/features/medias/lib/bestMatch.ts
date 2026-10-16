import type { InteractiveReleaseItem } from "@rawkoon/shared/types";

/** The release a profile-scoped auto search would grab: top score among those it may grab. */
export function pickBestMatch(
  releases: InteractiveReleaseItem[],
): InteractiveReleaseItem | null {
  let best: InteractiveReleaseItem | null = null;
  for (const release of releases) {
    if (release.rejected || release.language_fallback) continue;
    if (release.quality_score == null) continue;
    // Same order as the search route: score descending, then title.
    if (
      best === null ||
      release.quality_score > (best.quality_score ?? 0) ||
      (release.quality_score === best.quality_score &&
        release.title.localeCompare(best.title) < 0)
    )
      best = release;
  }
  return best;
}

export type BestMatchReason =
  | { key: "quality"; quality: string }
  | { key: "language"; languages: string }
  | { key: "tracker"; indexer: string }
  | { key: "seeders"; count: number }
  | { key: "size"; size: number };

const MAX_REASONS = 4;

const componentValue = (release: InteractiveReleaseItem, code: string) =>
  release.score_breakdown?.components.find((c) => c.code === code)?.value ?? 0;

/** Up to four short facts that explain the pick, strongest signal first. */
export function bestMatchReasons(
  release: InteractiveReleaseItem,
): BestMatchReason[] {
  const reasons: BestMatchReason[] = [];
  const parsed = release.parsed_quality;
  const quality = [
    parsed?.resolution ? `${parsed.resolution}p` : null,
    parsed?.source,
  ]
    .filter(Boolean)
    .join(" ");
  if (quality) reasons.push({ key: "quality", quality });
  if (componentValue(release, "language_match") > 0) {
    reasons.push({ key: "language", languages: release.languages.join(", ") });
  }
  if (release.indexer && componentValue(release, "tracker_priority") > 0)
    reasons.push({ key: "tracker", indexer: release.indexer });
  if (release.seeders != null && release.seeders > 0)
    reasons.push({ key: "seeders", count: release.seeders });
  if (release.size_bytes != null && release.size_bytes > 0)
    reasons.push({ key: "size", size: release.size_bytes });
  return reasons.slice(0, MAX_REASONS);
}
