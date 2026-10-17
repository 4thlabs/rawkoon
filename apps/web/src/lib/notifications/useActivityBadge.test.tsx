import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useActivityBadge } from "@/lib/notifications/useActivityBadge";

let isAdmin = false;
const requests = {
  requests: [
    { status: "pending" },
    { status: "approved" },
    { status: "pending" },
  ],
};

vi.mock("@/lib/api/context", () => ({
  useFetcher: () => async () => requests,
}));
vi.mock("@/lib/auth/useAuth", () => ({
  useCurrentUser: () => ({ data: { is_admin: isAdmin } }),
}));
vi.mock("@/lib/notifications/useUnreadCount", () => ({
  useUnreadCount: () => ({ data: { unread_count: 4 } }),
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient();
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useActivityBadge", () => {
  beforeEach(() => {
    isAdmin = false;
  });

  it("counts only unread items for a regular user", () => {
    const { result } = renderHook(() => useActivityBadge(), { wrapper });
    expect(result.current).toBe(4);
  });

  it("adds pending requests for an admin", async () => {
    isAdmin = true;
    const { result } = renderHook(() => useActivityBadge(), { wrapper });
    await vi.waitFor(() => expect(result.current).toBe(6));
  });
});
