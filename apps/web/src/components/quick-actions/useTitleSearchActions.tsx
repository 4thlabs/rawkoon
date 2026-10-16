import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import type { TmdbMediaSearchItem } from "@rawkoon/shared/types";
import { useCurrentUser } from "@/lib/auth/useAuth";
import { useTmdbMediaSearch } from "@/features/medias/hooks/useTmdbMediaSearch";
import { useAddTitle } from "@/features/medias/hooks/useAddTitle";
import { LibraryStatusChip } from "@/features/medias/components/LibraryStatusChip";
import {
  TitlePoster,
  type QuickAction,
} from "@/components/quick-actions/QuickActionRow";

const MAX_TITLE_RESULTS = 6;
const TITLE_DEBOUNCE_MS = 300;

interface UseTitleSearchActionsOptions {
  isOpen: boolean;
  query: string;
  /** Closes the palette. */
  onClose: () => void;
  onOpenDetails: (item: TmdbMediaSearchItem) => void;
}

/** TMDB title rows for the palette: Enter adds (or opens the library item), the secondary action opens details. */
export function useTitleSearchActions({
  isOpen,
  query,
  onClose,
  onOpenDetails,
}: UseTitleSearchActionsOptions) {
  const { t, i18n } = useTranslation("common");
  const navigate = useNavigate();
  const { data: currentUser } = useCurrentUser();
  const isAdmin = currentUser?.is_admin === true;
  const { addTitle } = useAddTitle();
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [addingKey, setAddingKey] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedQuery(query),
      TITLE_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [query]);

  const searchEnabled = isOpen && debouncedQuery.length >= 2;
  const search = useTmdbMediaSearch(debouncedQuery, {
    enabled: searchEnabled,
    language: i18n.language,
  });
  const titleItems = useMemo(
    () =>
      searchEnabled
        ? (search.data?.items ?? []).slice(0, MAX_TITLE_RESULTS)
        : [],
    [searchEnabled, search.data?.items],
  );
  // Rows still belong to the previous query until the debounce catches up.
  const isStale = debouncedQuery !== query;
  const isSearchingTitles = query.length >= 2 && (isStale || search.isLoading);
  const titleSearchFailed = searchEnabled && !isStale && search.isError;

  const titleActions = useMemo<QuickAction[]>(() => {
    const openDetails = (item: TmdbMediaSearchItem) => () => {
      onOpenDetails(item);
      onClose();
    };

    return titleItems.map((item) => {
      const key = `${item.media_type}-${item.tmdb_id}`;
      const libraryId =
        item.already_exists && item.library_id != null && item.library_id > 0
          ? item.library_id
          : null;
      const canAdd = !item.already_exists && item.can_add && isAdmin;

      let action = openDetails(item);
      if (libraryId != null) {
        action = () => {
          navigate({
            to: "/library/$libraryId",
            params: { libraryId: String(libraryId) },
          });
          onClose();
        };
      } else if (canAdd) {
        action = () => {
          if (addingKey) return;
          setAddingKey(key);
          void addTitle(item)
            .then((response) => {
              if (response) onClose();
            })
            .finally(() => setAddingKey(null));
        };
      }

      let trailing: ReactNode = null;
      if (item.already_exists) {
        trailing = <LibraryStatusChip status={item.library_status} />;
      } else if (canAdd) {
        trailing = (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary-600 px-2.5 py-1 text-xs font-semibold text-neutral-950">
            {addingKey === key ? (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-neutral-950 border-t-transparent" />
            ) : (
              <Plus size={12} />
            )}
            {t("common.quickActionsAdd")}
          </span>
        );
      }

      const noop = () => {};
      return {
        id: `tmdb-${key}`,
        title: item.title,
        description: [
          item.release_year ?? "",
          item.media_type === "movie"
            ? t("medias.filterMovies")
            : t("medias.filterSeries"),
        ]
          .filter(Boolean)
          .join(" • "),
        icon: <TitlePoster item={item} />,
        section: "titles" as const,
        action: isStale ? noop : action,
        onDetails: isStale ? noop : openDetails(item),
        trailing,
        stale: isStale,
      };
    });
  }, [
    titleItems,
    isStale,
    isAdmin,
    addingKey,
    addTitle,
    onClose,
    onOpenDetails,
    navigate,
    t,
  ]);

  return { titleActions, titleItems, isSearchingTitles, titleSearchFailed };
}
