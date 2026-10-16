import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { SearchResultEvent } from "@rawkoon/shared/types";
import { useAuth } from "@/lib/auth/useAuth";
import { queryKeys } from "@/lib/queryKeys";
import { applySearchResult } from "../lib/liveSearchToast";

/**
 * Feeds finished searches into their live toasts from any page, so an add on
 * Explore, Home or Discover resolves its toast even where no other library
 * stream is open. Admins only: they are the ones who add and search.
 */
export function useSearchResultStream() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.is_admin === true;

  useEffect(() => {
    if (!isAdmin || typeof globalThis.EventSource === "undefined") return;
    const es = new EventSource("/api/library/events", {
      withCredentials: true,
    });
    let refresh: ReturnType<typeof setTimeout> | null = null;
    es.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data as string) as
          | Partial<SearchResultEvent>
          | undefined;
        if (payload?.kind !== "search_result") return;
        applySearchResult(payload as SearchResultEvent);
        // The stored last outcome moved too, so cards and the item page refetch.
        // Scheduled checks emit one event per wanted title, so coalesce refetches.
        refresh ??= setTimeout(() => {
          refresh = null;
          queryClient.invalidateQueries({ queryKey: queryKeys.library.all });
        }, 1000);
      } catch {
        // malformed event — ignore
      }
    };
    return () => {
      if (refresh) clearTimeout(refresh);
      es.close();
    };
  }, [isAdmin, queryClient]);
}
