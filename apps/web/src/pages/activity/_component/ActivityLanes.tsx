import { Link, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useCurrentUser } from "@/lib/auth/useAuth";
import { cn } from "@/lib/utils";

const LANES = [
  { to: "/activity", labelKey: "activity.lanes.inbox", exact: true },
  { to: "/activity/queue", labelKey: "activity.lanes.queue", adminOnly: true },
  { to: "/activity/requests", labelKey: "activity.lanes.requests" },
  { to: "/activity/calendar", labelKey: "activity.lanes.calendar" },
  { to: "/activity/history", labelKey: "activity.lanes.history" },
] as const;

/** The tab row shared by every Activity lane. */
export function ActivityLanes() {
  const { t } = useTranslation("common");
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdmin = useCurrentUser().data?.is_admin === true;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pt-6">
      <h1 className="mb-3 font-display text-2xl font-semibold tracking-tight text-neutral-50 sm:text-3xl">
        {t("nav.activity")}
      </h1>
      <nav
        aria-label={t("activity.lanes.label")}
        className="flex gap-1 overflow-x-auto"
      >
        {LANES.filter((lane) => isAdmin || !("adminOnly" in lane)).map(
          (lane) => {
            const active =
              "exact" in lane
                ? pathname === lane.to || pathname === `${lane.to}/`
                : pathname === lane.to || pathname.startsWith(`${lane.to}/`);
            return (
              <Link
                key={lane.to}
                to={lane.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "focus-ring shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-white/[0.1] text-white"
                    : "text-neutral-400 hover:bg-white/[0.05] hover:text-neutral-200",
                )}
              >
                {t(lane.labelKey)}
              </Link>
            );
          },
        )}
      </nav>
    </div>
  );
}
