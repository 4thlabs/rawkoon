import { useQuery } from "@tanstack/react-query";
import { useFetcher } from "@/lib/api/context";
import { queryKeys } from "@/lib/queryKeys";
import { DASHBOARD_ENDPOINTS } from "@/lib/endpoints";
import type { DashboardUpcomingResponse } from "@rawkoon/shared/types";
export function useDashboardUpcoming(options?: { enabled?: boolean }) {
  const fetcher = useFetcher();

  return useQuery({
    queryKey: queryKeys.dashboard.upcoming(),
    queryFn: () =>
      fetcher<DashboardUpcomingResponse>(DASHBOARD_ENDPOINTS.UPCOMING.LIST),
    enabled: options?.enabled ?? true,
  });
}
