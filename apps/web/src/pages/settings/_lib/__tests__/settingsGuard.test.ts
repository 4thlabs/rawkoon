import { describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
vi.mock("@/lib/auth", () => ({ getCurrentUser: () => getCurrentUser() }));
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  redirect: (opts: unknown) => ({ redirectTo: opts }),
}));

import { settingsGuard } from "../settingsGuard";

describe("settingsGuard", () => {
  it("sends anonymous visitors to login", async () => {
    getCurrentUser.mockResolvedValue(null);
    await expect(settingsGuard({ adminOnly: false })()).rejects.toEqual({
      redirectTo: { to: "/login" },
    });
  });

  it("sends a non-admin from an admin page to Profile", async () => {
    getCurrentUser.mockResolvedValue({ is_admin: false });
    await expect(settingsGuard({ adminOnly: true })()).rejects.toEqual({
      redirectTo: { to: "/settings/profile", replace: true },
    });
  });

  it("lets a non-admin onto a You page and an admin anywhere", async () => {
    getCurrentUser.mockResolvedValue({ is_admin: false });
    await expect(settingsGuard({ adminOnly: false })()).resolves.toEqual({
      user: { is_admin: false },
    });
    getCurrentUser.mockResolvedValue({ is_admin: true });
    await expect(settingsGuard({ adminOnly: true })()).resolves.toEqual({
      user: { is_admin: true },
    });
  });
});
