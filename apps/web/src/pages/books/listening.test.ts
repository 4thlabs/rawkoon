import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
vi.mock("@/lib/auth", () => ({ getCurrentUser: () => getCurrentUser() }));
const requireBooksEnabled = vi.fn();
vi.mock("@/lib/routing/useFeatures", () => ({
  requireBooksEnabled: (...a: unknown[]) => requireBooksEnabled(...a),
}));
vi.mock("@/features/listening/ListeningStatsPage", () => ({
  ListeningStatsPage: () => null,
}));

import { Route } from "./listening";

const run = () =>
  (
    Route.options.beforeLoad as (a: {
      context: { queryClient: QueryClient };
    }) => Promise<unknown>
  )({ context: { queryClient: new QueryClient() } });

describe("/books/listening", () => {
  it("sends a signed-out visitor to login", async () => {
    getCurrentUser.mockResolvedValueOnce(null);
    await expect(run()).rejects.toMatchObject({ options: { to: "/login" } });
  });

  it("is gated by the books feature flag", async () => {
    getCurrentUser.mockResolvedValueOnce({ id: 1 });
    requireBooksEnabled.mockRejectedValueOnce({ options: { to: "/" } });
    await expect(run()).rejects.toMatchObject({ options: { to: "/" } });
    expect(requireBooksEnabled).toHaveBeenCalled();
  });

  it("opens when books are enabled", async () => {
    getCurrentUser.mockResolvedValueOnce({ id: 1 });
    requireBooksEnabled.mockResolvedValueOnce(undefined);
    await expect(run()).resolves.toMatchObject({ user: { id: 1 } });
  });
});
