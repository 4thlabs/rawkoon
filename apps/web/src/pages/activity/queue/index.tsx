import { createFileRoute, redirect } from "@tanstack/react-router";
import { getCurrentUser } from "@/lib/auth";
import { QueuePage } from "@/pages/activity/queue/QueuePage";

export const Route = createFileRoute("/activity/queue/")({
  beforeLoad: async () => {
    try {
      const user = await getCurrentUser();
      if (!user) throw redirect({ to: "/login" });
      if (!user.is_admin) throw redirect({ to: "/activity", replace: true });
      return { user };
    } catch (e: unknown) {
      if ((e as { status?: number })?.status === 429) return { user: null };
      throw e;
    }
  },
  component: QueuePage,
});
