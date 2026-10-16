import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFetcher } from "@/lib/api/context";
import { queryKeys } from "@/lib/queryKeys";
import { DOWNLOADS_ENDPOINTS } from "@/lib/endpoints/downloads";
import type {
  GrabPendingReleaseResponse,
  PendingReleasesResponse,
} from "@rawkoon/shared/types";

export function usePendingReleases() {
  const fetcher = useFetcher();
  return useQuery<PendingReleasesResponse>({
    queryKey: queryKeys.downloads.pendingReleases(),
    queryFn: () =>
      fetcher<PendingReleasesResponse>(DOWNLOADS_ENDPOINTS.PENDING_RELEASES),
    refetchInterval: 60_000,
    retry: false,
  });
}

/** Pull a held release's grab time forward and grab it now. */
export function useGrabPendingNow() {
  const fetcher = useFetcher();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (targetKey: string) =>
      fetcher<GrabPendingReleaseResponse>(
        DOWNLOADS_ENDPOINTS.GRAB_PENDING_NOW,
        {
          method: "POST",
          body: { target_key: targetKey },
        },
      ),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.downloads.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.library.all });
    },
  });
}
