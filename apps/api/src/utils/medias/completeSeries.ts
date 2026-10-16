import {
  parseReleaseSeasonSpan,
  parseReleaseStructure,
} from "@rawkoon/shared/utils/releaseStructure";

/**
 * Whether a release is a multi-season pack covering every wanted season. An
 * unranged "complete series" label is trusted: it names no seasons to check.
 */
export function releaseCoversSeasons(
  title: string,
  seasons: number[],
): boolean {
  const structure = parseReleaseStructure(title);
  if (structure.episodes.length > 0 || structure.airDate) return false;
  const span = parseReleaseSeasonSpan(title);
  if (span) return seasons.every((s) => s >= span.from && s <= span.to);
  return structure.completeSeries;
}
