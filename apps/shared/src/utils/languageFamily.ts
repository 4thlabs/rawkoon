/** Audio flags emitted by the release parser that all mean "French audio". */
const FRENCH_FLAGS = new Set([
  "vff",
  "vfq",
  "vfi",
  "vf2",
  "truefrench",
  "vf",
  "french",
  "fr",
]);

/** Most specific first; the first match is the tag shown for a release. */
const FRENCH_DISPLAY_ORDER = ["VFF", "VFI", "VFQ", "VF2", "VF", "FRENCH"];

const ISO2 = /^[a-z]{2}$/;

/**
 * Language family of one parser flag or preferred-language entry: "fr" for any
 * French variant, the ISO code for a two-letter language, null otherwise
 * (MULTI and subtitle flags such as VOSTFR say nothing about the audio).
 */
export function languageFamilyOf(flag: string): string | null {
  const f = flag.trim().toLowerCase();
  if (FRENCH_FLAGS.has(f)) return "fr";
  return ISO2.test(f) ? f : null;
}

/**
 * The tag to show for a release whose audio is in a preferred language's
 * family without matching the preference itself, or null when it has none.
 */
export function languageFallbackTag(
  flags: readonly string[],
  preferred: readonly string[],
): string | null {
  const wanted = new Set(
    preferred.map(languageFamilyOf).filter((f): f is string => f != null),
  );
  const inFamily = flags.filter((f) => {
    const family = languageFamilyOf(f);
    return family != null && wanted.has(family);
  });
  if (inFamily.length === 0) return null;

  const upper = new Set(inFamily.map((f) => f.toUpperCase()));
  // TRUEFRENCH is the Parisian dub, shown as VFF.
  if (upper.has("TRUEFRENCH")) upper.add("VFF");
  const french = FRENCH_DISPLAY_ORDER.find((t) => upper.has(t));
  if (french) return french;
  if (flags.some((f) => f.toUpperCase() === "MULTI")) return "MULTi";
  const first = inFamily.find((f) => languageFamilyOf(f) !== "fr");
  return first ? first.toUpperCase() : "FR";
}

/** True when a tag from `languageFallbackTag` belongs to the French family. */
export function isFrenchFallbackTag(tag: string): boolean {
  const t = tag.toLowerCase();
  return t === "multi" || languageFamilyOf(t) === "fr";
}
