import { useQuery } from "@tanstack/react-query";
import { useFetcher } from "@/lib/api/context";
import { queryKeys } from "@/lib/queryKeys";
import { DOWNLOADS_ENDPOINTS } from "@/lib/endpoints/downloads";
import type {
  ActiveDownloadsResponse,
  DownloadProgressSummaryResponse,
} from "@rawkoon/shared/types";
import {
  downloadProgressForMedia,
  etaForMedia,
  type MediaDownloadProgress,
} from "../lib/activeDownloads";

/**
 * In-flight grabs with titles and release names (admin only). The numbers are
 * pushed over the library events stream (useLibraryEvents patches this cache);
 * the slow poll only catches drift when the stream is down.
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

/** Progress for one title from the user-visible summary; only subscribes while it is downloading. */
export function useDownloadProgress(
  mediaId: number,
  downloading: boolean,
): MediaDownloadProgress | null {
  const fetcher = useFetcher();
  const { data } = useQuery<
    DownloadProgressSummaryResponse,
    Error,
    MediaDownloadProgress | null
  >({
    queryKey: queryKeys.downloads.progress(),
    queryFn: () =>
      fetcher<DownloadProgressSummaryResponse>(DOWNLOADS_ENDPOINTS.PROGRESS),
    enabled: downloading,
    refetchInterval: 30_000,
    select: (response) => downloadProgressForMedia(response, mediaId),
  });
  return downloading ? (data ?? null) : null;
}

/** ETA for one title from the admin queue list; the poll only runs while it downloads. */
export function useDownloadEta(
  mediaId: number,
  downloading: boolean,
): number | null {
  const fetcher = useFetcher();
  const { data } = useQuery<ActiveDownloadsResponse, Error, number | null>({
    queryKey: queryKeys.downloads.active(),
    queryFn: () => fetcher<ActiveDownloadsResponse>(DOWNLOADS_ENDPOINTS.ACTIVE),
    enabled: downloading,
    refetchInterval: 30_000,
    select: (response) => etaForMedia(response, mediaId),
  });
  return downloading ? (data ?? null) : null;
}
