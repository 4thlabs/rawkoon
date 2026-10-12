import { useQuery } from "@tanstack/react-query";
import { useFetcher } from "@/lib/api/context";
import { queryKeys } from "@/lib/queryKeys";
import { DOWNLOADS_ENDPOINTS } from "@/lib/endpoints/downloads";
import type { PendingReleasesResponse } from "@rawkoon/shared/types";

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
