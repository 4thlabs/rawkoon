import { useQuery } from "@tanstack/react-query";
import { useFetcher } from "@/lib/api/context";
import { queryKeys } from "@/lib/queryKeys";
import { DASHBOARD_ENDPOINTS } from "@/lib/endpoints";
import type { DashboardPipeline } from "@rawkoon/shared/types";

/** One admin snapshot of the download pipeline; live progress is patched in by useLibraryEvents. */
export function usePipeline(enabled: boolean) {
  const fetcher = useFetcher();
  return useQuery<DashboardPipeline>({
    queryKey: queryKeys.dashboard.pipeline(),
    queryFn: () => fetcher<DashboardPipeline>(DASHBOARD_ENDPOINTS.PIPELINE),
    enabled,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });
}
