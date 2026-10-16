import { SearchX } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { LibraryMedia } from "@rawkoon/shared/types";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils/relativeTime";

/** Whether a wanted item's last search ended without a release, so the miss is worth showing. */
export function hasStoredMiss(
  item: Pick<LibraryMedia, "status" | "last_search_outcome" | "last_search_at">,
): boolean {
  return (
    item.status === "wanted" &&
    item.last_search_outcome === "no_match" &&
    item.last_search_at != null
  );
}

/** "No match · 2h ago", with the reason as a tooltip; a miss that outlives its toast. */
export function LastSearchNote({
  item,
  className,
}: {
  item: Pick<
    LibraryMedia,
    "status" | "last_search_outcome" | "last_search_at" | "last_search_reason"
  >;
  className?: string;
}) {
  const { t, i18n } = useTranslation("common");
  if (!hasStoredMiss(item)) return null;
  const relative = formatRelativeTime(item.last_search_at, i18n.language);
  return (
    <p
      title={item.last_search_reason ?? undefined}
      className={cn(
        "inline-flex items-center gap-1 text-[10px] leading-tight text-neutral-400",
        className,
      )}
    >
      <SearchX size={10} className="shrink-0" aria-hidden="true" />
      {relative
        ? t("library.lastSearch.noMatch", { relative })
        : t("library.lastSearch.noMatchNoTime")}
    </p>
  );
}
