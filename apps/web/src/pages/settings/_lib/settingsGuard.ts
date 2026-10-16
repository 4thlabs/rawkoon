import { redirect } from "@tanstack/react-router";
import { getCurrentUser } from "@/lib/auth";

/** Route guard: signed in, and an admin for server and system pages. */
export function settingsGuard(opts: { adminOnly: boolean }) {
  return async () => {
    try {
      const user = await getCurrentUser();
      if (!user) throw redirect({ to: "/login" });
      if (opts.adminOnly && !user.is_admin) {
        throw redirect({ to: "/settings/profile", replace: true });
      }
      return { user };
    } catch (e: unknown) {
      if ((e as { status?: number })?.status === 429) return { user: null };
      throw e;
    }
  };
}
