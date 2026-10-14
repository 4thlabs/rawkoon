import { useQuery } from "@tanstack/react-query";
import { useFetcher } from "@/lib/api/context";
import { queryKeys } from "@/lib/queryKeys";
import { DASHBOARD_ENDPOINTS } from "@/lib/endpoints";
import { useTitleLanguage } from "@/lib/useTitleLanguage";
import type { DashboardHeroResponse } from "@rawkoon/shared/types";

/** The Home hero deck: recent arrivals, else a personalized or trending pick list. */
export function useDashboardHero() {
  const fetcher = useFetcher();
  const titleLanguage = useTitleLanguage();

  return useQuery({
    queryKey: queryKeys.dashboard.hero(titleLanguage),
    queryFn: () =>
      fetcher<DashboardHeroResponse>(
        `${DASHBOARD_ENDPOINTS.HERO}?title_language=${titleLanguage}`,
      ),
    staleTime: 60_000,
  });
}
