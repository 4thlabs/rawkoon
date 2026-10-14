import { useEffect, useState } from "react";
import { useQuery, type QueryClient } from "@tanstack/react-query";
import { freshLanded, insertLanded } from "@rawkoon/shared/utils";
import type { LandedArrival } from "@rawkoon/shared/types";
import { queryKeys } from "@/lib/queryKeys";

/** Records an arrival in the client-side store that Home reads. */
export function recordLanded(queryClient: QueryClient, arrival: LandedArrival) {
  // Written while Home may be unmounted, so it must outlive the default 5-minute gcTime.
  queryClient.setQueryDefaults(queryKeys.home.landed(), { gcTime: Infinity });
  const now = Date.now();
  // Expire on receipt time, not the server's clock, so a skewed device clock can't hide it.
  queryClient.setQueryData<LandedArrival[]>(
    queryKeys.home.landed(),
    (current) => insertLanded(current ?? [], { ...arrival, ts: now }, now),
  );
}

/** Re-renders once a minute so expiry and the time-of-day greeting are noticed. */
export function useMinuteClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/** Arrivals still fresh at `now`, newest first. */
export function useFreshLanded(now: Date): LandedArrival[] {
  // Never fetches: the cache is written by the library events stream.
  const { data } = useQuery<LandedArrival[]>({
    queryKey: queryKeys.home.landed(),
    queryFn: () => [],
    enabled: false,
    initialData: [],
  });
  return freshLanded(data, now.getTime());
}
