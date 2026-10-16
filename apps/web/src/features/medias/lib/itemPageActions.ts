import type { LibraryMedia, LibraryMediaStatus } from "@rawkoon/shared/types";
import type { TFunction } from "i18next";
import { formatRelativeTime } from "@/lib/utils/relativeTime";

export type ItemPageTab = "info" | "similar" | "releases" | "management";

const TABS: readonly string[] = ["info", "similar", "releases", "management"];

/** Reads `?tab=`; "search" is what the release list was called before it became "releases". */
export function parseItemTab(raw: unknown): ItemPageTab | undefined {
  if (raw === "search") return "releases";
  return typeof raw === "string" && TABS.includes(raw)
    ? (raw as ItemPageTab)
    : undefined;
}

/** Missing items open on their release list (admins only); everything else on Info. */
export function defaultItemTab(opts: {
  isAdmin: boolean;
  status: LibraryMediaStatus | undefined;
  focusedEpisode: boolean;
}): ItemPageTab {
  if (opts.focusedEpisode) return "management";
  if (opts.isAdmin && opts.status === "wanted") return "releases";
  return "info";
}

export type HeaderActionKind = "missing" | "downloading" | "downloaded" | null;

/** Which action set the item header shows; non-admins get none. */
export function headerActionKind(
  status: LibraryMediaStatus,
  isAdmin: boolean,
): HeaderActionKind {
  if (!isAdmin) return null;
  if (status === "wanted") return "missing";
  if (status === "downloading" || status === "upgrading") return "downloading";
  if (status === "downloaded") return "downloaded";
  return null;
}

/** "Profile HD 1080p · Last searched 2h ago · no match"; empty when there is nothing to say. */
export function statusLineParts(
  item: Pick<
    LibraryMedia,
    "quality_profile" | "last_search_at" | "last_search_outcome"
  >,
  t: TFunction,
  language: string,
): string[] {
  const parts: string[] = [];
  if (item.quality_profile)
    parts.push(
      t("library.statusLine.profile", { name: item.quality_profile.name }),
    );
  const relative = formatRelativeTime(item.last_search_at, language);
  if (relative) {
    parts.push(t("library.statusLine.lastSearched", { relative }));
    if (item.last_search_outcome)
      parts.push(t(`library.statusLine.outcome.${item.last_search_outcome}`));
  }
  return parts;
}
