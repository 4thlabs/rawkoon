import { Link } from "@tanstack/react-router";
import { Bookmark, Layers2, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useFeatures } from "@/lib/routing/useFeatures";

/** Shortcuts to the full shelf pages; Bestsellers is a books feature. */
export function FindShelves() {
  const { t } = useTranslation("common");
  const { data: features } = useFeatures();

  const shelves = [
    {
      to: "/find/watchlist",
      icon: Bookmark,
      label: t("find.shelves.watchlist"),
      hint: t("find.shelves.watchlistHint"),
    },
    {
      to: "/find/collections",
      icon: Layers2,
      label: t("find.shelves.collections"),
      hint: t("find.shelves.collectionsHint"),
    },
    ...(features?.books_enabled
      ? [
          {
            to: "/find/bestsellers",
            icon: Trophy,
            label: t("find.shelves.bestsellers"),
            hint: t("find.shelves.bestsellersHint"),
          },
        ]
      : []),
  ] as const;

  return (
    <ul
      aria-label={t("find.shelves.label")}
      className="grid grid-cols-1 gap-3 sm:grid-cols-3"
    >
      {shelves.map((shelf) => (
        <li key={shelf.to}>
          <Link
            to={shelf.to}
            className="focus-ring flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 transition-colors hover:border-neutral-700 hover:bg-neutral-800/60"
          >
            <shelf.icon size={18} className="shrink-0 text-primary-400" />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-neutral-100">
                {shelf.label}
              </span>
              <span className="block truncate text-xs text-neutral-400">
                {shelf.hint}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
