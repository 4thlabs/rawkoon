import { describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
vi.mock("@/lib/auth", () => ({ getCurrentUser: () => getCurrentUser() }));
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  createFileRoute: () => (config: { beforeLoad: () => Promise<unknown> }) => ({
    options: config,
  }),
  redirect: (opts: unknown) => ({ redirectTo: opts }),
}));
vi.mock("@/pages/activity/queue/QueuePage", () => ({ QueuePage: () => null }));

describe("/activity/queue guard", () => {
  it("sends non-admins back to the inbox and lets admins in", async () => {
    const { Route } = (await import("../index")) as unknown as {
      Route: { options: { beforeLoad: () => Promise<unknown> } };
    };
    getCurrentUser.mockResolvedValue({ is_admin: false });
    await expect(Route.options.beforeLoad()).rejects.toEqual({
      redirectTo: { to: "/activity", replace: true },
    });
    getCurrentUser.mockResolvedValue({ is_admin: true });
    await expect(Route.options.beforeLoad()).resolves.toEqual({
      user: { is_admin: true },
    });
    getCurrentUser.mockResolvedValue(null);
    await expect(Route.options.beforeLoad()).rejects.toEqual({
      redirectTo: { to: "/login" },
    });
  });
});
