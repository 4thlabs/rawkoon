import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useFetcher } from "@/lib/api/context";
import { queryKeys } from "@/lib/queryKeys";
import { DOWNLOADS_ENDPOINTS } from "@/lib/endpoints/downloads";
import type {
  GrabPendingReleaseResponse,
  PendingReleasesResponse,
} from "@rawkoon/shared/types";

/** Held releases are admin-only, so a non-admin never polls (and never eats a 403). */
export function usePendingReleases(enabled = true) {
  const fetcher = useFetcher();
  return useQuery<PendingReleasesResponse>({
    queryKey: queryKeys.downloads.pendingReleases(),
    queryFn: () =>
      fetcher<PendingReleasesResponse>(DOWNLOADS_ENDPOINTS.PENDING_RELEASES),
    enabled,
    refetchInterval: 60_000,
    retry: false,
  });
}

/** Pull a held release's grab time forward and grab it now. */
export function useGrabPendingNow() {
  const fetcher = useFetcher();
  const queryClient = useQueryClient();
  const { t } = useTranslation("common");
  return useMutation({
    mutationFn: (targetKey: string) =>
      fetcher<GrabPendingReleaseResponse>(
        DOWNLOADS_ENDPOINTS.GRAB_PENDING_NOW,
        {
          method: "POST",
          body: { target_key: targetKey },
        },
      ),
    onSuccess: (res) => {
      if (res.grabbed) return;
      toast(t("dashboard.home.nothingGrabbed"), {
        description: res.reason
          ? t(`dashboard.home.grabMiss.${res.reason}`)
          : undefined,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.downloads.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.library.all });
    },
  });
}
