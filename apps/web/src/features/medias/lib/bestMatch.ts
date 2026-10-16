import type { InteractiveReleaseItem } from "@rawkoon/shared/types";

export interface BestMatchOptions {
  /** Lower-cased titles the user just blocked; they can no longer be grabbed. */
  blockedTitles?: Set<string>;
  /** Guid of the AI pick; it wins over the score so the list shows one winner. */
  aiPickKey?: string | null;
  /** Upgrade mode: only a release above this resolution counts (null = unknown, so none). */
  upgradeOverResolution?: number | null;
  upgradeMode?: boolean;
}

/**
 * The release auto search would grab: the AI pick when set, else the top score
 * among releases it may grab. Pass releases in server order; ties keep it.
 */
export function pickBestMatch(
  releases: InteractiveReleaseItem[],
  opts: BestMatchOptions = {},
): InteractiveReleaseItem | null {
  const eligible = releases.filter((release) => {
    if (release.rejected || release.language_fallback) return false;
    if (opts.blockedTitles?.has(release.title.trim().toLowerCase()))
      return false;
    if (!opts.upgradeMode) return true;
    const resolution = release.parsed_quality?.resolution;
    return (
      resolution != null &&
      opts.upgradeOverResolution != null &&
      resolution > opts.upgradeOverResolution
    );
  });
  const picked = opts.aiPickKey
    ? eligible.find((release) => release.guid === opts.aiPickKey)
    : undefined;
  if (picked) return picked;
  let best: InteractiveReleaseItem | null = null;
  for (const release of eligible) {
    if (release.quality_score == null) continue;
    if (best === null || release.quality_score > (best.quality_score ?? 0))
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
