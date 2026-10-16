import { useQuery } from "@tanstack/react-query";
import { useFetcher } from "@/lib/api/context";
import { useCurrentUser } from "@/lib/auth/useAuth";
import { queryKeys } from "@/lib/queryKeys";
import { REQUEST_ENDPOINTS } from "@/lib/endpoints";
import { useUnreadCount } from "@/lib/notifications/useUnreadCount";
import type { MediaRequestsResponse } from "@rawkoon/shared/types";

/** Unread inbox items, plus pending requests for admins; a new request notifying an admin counts in both by design. */
export function useActivityBadge(): number {
  const fetcher = useFetcher();
  const { data: user } = useCurrentUser();
  const isAdmin = user?.is_admin === true;
  const { data: unread } = useUnreadCount();
  // No pending-count endpoint exists, so admins count from the shared requests list.
  const { data: requests } = useQuery({
    queryKey: queryKeys.requests.list(),
    queryFn: () => fetcher<MediaRequestsResponse>(REQUEST_ENDPOINTS.LIST),
    enabled: isAdmin,
    staleTime: 30_000,
  });

  const pending = isAdmin
    ? (requests?.requests.filter((r) => r.status === "pending").length ?? 0)
    : 0;
  return (unread?.unread_count ?? 0) + pending;
}
