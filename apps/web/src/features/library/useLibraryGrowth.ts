import { useQuery } from "@tanstack/react-query";
import type { LibraryGrowthResponse } from "@rawkoon/shared/types";
import { useFetcher } from "@/lib/api/context";
import { LIBRARY_ENDPOINTS } from "@/lib/endpoints/library";
import { queryKeys } from "@/lib/queryKeys";

export function useLibraryGrowth() {
  const fetcher = useFetcher();
  return useQuery({
    queryKey: queryKeys.library.growth(),
    queryFn: () => fetcher<LibraryGrowthResponse>(LIBRARY_ENDPOINTS.GROWTH),
    staleTime: 5 * 60 * 1000,
  });
}
