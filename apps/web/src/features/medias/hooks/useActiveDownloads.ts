import { useQuery } from "@tanstack/react-query";
import { useFetcher } from "@/lib/api/context";
import { queryKeys } from "@/lib/queryKeys";
import { DOWNLOADS_ENDPOINTS } from "@/lib/endpoints/downloads";
import type { ActiveDownloadsResponse } from "@rawkoon/shared/types";
import { downloadPercentForMedia } from "../lib/activeDownloads";

/**
 * In-flight grabs with live progress. The numbers are pushed over the library
 * events stream (useLibraryEvents patches this cache); the slow poll only
 * catches drift when the stream is down.
 */
export function useActiveDownloads(opts: { enabled?: boolean } = {}) {
  const fetcher = useFetcher();
  return useQuery<ActiveDownloadsResponse>({
    queryKey: queryKeys.downloads.active(),
    queryFn: () => fetcher<ActiveDownloadsResponse>(DOWNLOADS_ENDPOINTS.ACTIVE),
    enabled: opts.enabled ?? true,
    refetchInterval: 30_000,
  });
}

/** Percent for one title; only subscribes to the list while it is downloading. */
export function useDownloadPercent(
  mediaId: number,
  downloading: boolean,
): number | null {
  const fetcher = useFetcher();
  const { data } = useQuery<ActiveDownloadsResponse, Error, number | null>({
    queryKey: queryKeys.downloads.active(),
    queryFn: () => fetcher<ActiveDownloadsResponse>(DOWNLOADS_ENDPOINTS.ACTIVE),
    enabled: downloading,
    refetchInterval: 30_000,
    select: (response) => downloadPercentForMedia(response, mediaId),
  });
  return downloading ? (data ?? null) : null;
}
