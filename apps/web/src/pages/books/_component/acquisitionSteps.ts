import type { BookEdition } from "@rawkoon/shared";

type Step = {
  key: string;
  /** Translation key; the label is resolved where it is rendered. */
  labelKey: string;
  reached: boolean;
  active: boolean;
};

/**
 * Derive the acquisition steps from real fields, never from a stored
 * "progress" value that could drift from reality.
 */
export function stepsFor(edition: BookEdition): Step[] {
  const grabbed =
    edition.last_grabbed_at !== null ||
    ["downloading", "downloaded", "upgrading"].includes(edition.status);
  const imported = edition.file_count > 0 || edition.status === "downloaded";
  return [
    {
      key: "wanted",
      labelKey: "books.track.wanted",
      reached: true,
      active: !grabbed,
    },
    {
      key: "grabbed",
      labelKey: "books.track.grabbed",
      reached: grabbed,
      active: grabbed && !imported,
    },
    {
      key: "imported",
      labelKey: "books.track.inLibrary",
      reached: imported,
      active: imported,
    },
  ];
}
