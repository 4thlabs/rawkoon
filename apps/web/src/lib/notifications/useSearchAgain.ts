import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useFetcher } from "@/lib/api/context";
import { LIBRARY_ENDPOINTS } from "@/lib/endpoints";
import { queryKeys } from "@/lib/queryKeys";
import type {
  LibraryEpisodesResponse,
  LibrarySearchResponse,
} from "@rawkoon/shared/types";

interface SearchAgainTarget {
  mediaId: number;
  season: number | null;
  episode: number | null;
}

/** Re-runs the search a "search gave up" notification refers to, at its movie, season or episode scope. */
export function useSearchAgain() {
  const fetcher = useFetcher();
  const queryClient = useQueryClient();
  const { t } = useTranslation("common");

  return useMutation({
    mutationFn: async ({ mediaId, season, episode }: SearchAgainTarget) => {
      const post = (url: string) =>
        fetcher<LibrarySearchResponse>(url, { method: "POST", body: {} });

      if (season == null) return post(LIBRARY_ENDPOINTS.SEARCH(mediaId));
      if (episode == null) {
        return post(LIBRARY_ENDPOINTS.SEARCH_SEASON(mediaId, season));
      }
      const { seasons } = await fetcher<LibraryEpisodesResponse>(
        LIBRARY_ENDPOINTS.EPISODES(mediaId),
      );
      const target = seasons
        .flatMap((s) => s.episodes)
        .find((e) => e.season === season && e.episode === episode);
      if (!target) throw new Error("Episode not found");
      return post(LIBRARY_ENDPOINTS.SEARCH_EPISODE(mediaId, target.id));
    },
    onSuccess: (res, vars) => {
      toast(
        res.grabbed
          ? t("notifications.searchAgainGrabbed")
          : vars.season == null
            ? t("notifications.searchAgainNothingTitle")
            : t("notifications.searchAgainNothing"),
      );
    },
    onError: () => toast.error(t("notifications.searchAgainFailed")),
    onSettled: (_data, _error, vars) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.library.all });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.library.downloads(vars.mediaId),
      });
    },
  });
}
