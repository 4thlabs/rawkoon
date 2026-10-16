import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type {
  AddToLibraryResponse,
  LibrarySearchResponse,
} from "@rawkoon/shared/types";
import { useFetcher } from "@/lib/api/context";
import { LIBRARY_ENDPOINTS } from "@/lib/endpoints";
import { queryKeys } from "@/lib/queryKeys";
import { addToastMessage } from "../lib/addToastMessage";
import { applySearchResult, trackSearch } from "../lib/liveSearchToast";

interface SearchTarget {
  mediaId: number;
  title: string;
  profileName: string | null;
  isShow: boolean;
}

/**
 * One toast per add or "Search now", updated in place as the search finishes.
 * Every entry point (Explore dialog, Home hero, Discover deck, Search now)
 * goes through here so they all read the same.
 */
export function useLiveSearchToast() {
  const { t, i18n } = useTranslation("common");
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const queryClient = useQueryClient();

  return useMemo(() => {
    const language = i18n.language;

    const track = (
      target: SearchTarget,
      request: (() => Promise<LibrarySearchResponse>) | null,
    ) => {
      trackSearch({
        ...target,
        t,
        language,
        openItem: (releases) =>
          void navigate({
            to: "/library/$libraryId",
            params: { libraryId: String(target.mediaId) },
            ...(releases ? { search: { tab: "search" as const } } : {}),
          }),
        grabNow: (season) =>
          track(target, () =>
            fetcher<LibrarySearchResponse>(
              season != null
                ? LIBRARY_ENDPOINTS.SEARCH_SEASON(target.mediaId, season)
                : LIBRARY_ENDPOINTS.SEARCH(target.mediaId),
              { method: "POST", body: {} },
            ),
          ),
      });
      if (!request) return;
      request()
        .then((response) => {
          queryClient.invalidateQueries({ queryKey: queryKeys.library.all });
          if (response.search_result) applySearchResult(response.search_result);
        })
        .catch(() =>
          applySearchResult({ media_id: target.mediaId, outcome: "error" }),
        );
    };

    return {
      /** After an add: a live toast when a search was queued, a plain one otherwise. */
      announceAdd(response: AddToLibraryResponse, title: string) {
        if (!response.search_queued) {
          toast.success(addToastMessage(t, title, response, language));
          return;
        }
        track(
          {
            mediaId: response.item.id,
            title,
            profileName: response.item.quality_profile?.name ?? null,
            isShow: response.item.type === "show",
          },
          // The server's search-on-add job reports over the library stream.
          null,
        );
      },
      /** "Search now": `run` is the search request; its answer fills the toast. */
      announceSearch(
        target: SearchTarget,
        run: () => Promise<LibrarySearchResponse>,
      ) {
        track(target, run);
      },
    };
  }, [t, i18n.language, navigate, fetcher, queryClient]);
}
