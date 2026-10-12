import { useQuery } from "@tanstack/react-query";
import type { LibraryGrowthResponse } from "@rawkoon/shared/types";
import { useFetcher } from "@/lib/api/context";
import { LIBRARY_ENDPOINTS } from "@/lib/endpoints/library";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/lib/auth/useAuth";

export function useLibraryGrowth() {
  const fetcher = useFetcher();
  const { user } = useAuth();
  return useQuery({
    // Keyed by role: an admin payload carries sizes a member must not keep.
    queryKey: queryKeys.library.growth(user?.is_admin === true),
    queryFn: () => fetcher<LibraryGrowthResponse>(LIBRARY_ENDPOINTS.GROWTH),
    staleTime: 5 * 60 * 1000,
  });
}
