import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFetcher } from "@/lib/api/context";
import { queryKeys } from "@/lib/queryKeys";
import { LIBRARY_ENDPOINTS } from "@/lib/endpoints";
import type { GrabReadinessResponse } from "@rawkoon/shared/types";

export function useGrabReadiness(options?: {
  enabled?: boolean;
  staleTime?: number;
}) {
  const fetcher = useFetcher();

  return useQuery({
    queryKey: queryKeys.library.grabReadiness(),
    queryFn: () =>
      fetcher<GrabReadinessResponse>(LIBRARY_ENDPOINTS.GRAB_READINESS),
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime ?? 0,
  });
}

/** Re-runs the connection probes the server otherwise caches for a short while. */
export function useRecheckGrabReadiness() {
  const fetcher = useFetcher();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      fetcher<GrabReadinessResponse>(
        `${LIBRARY_ENDPOINTS.GRAB_READINESS}?refresh=1`,
      ),
    onSuccess: (data) =>
      queryClient.setQueryData(queryKeys.library.grabReadiness(), data),
  });
}
