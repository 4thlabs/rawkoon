import { Link, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const LANES = [
  { to: "/activity", labelKey: "activity.lanes.inbox", exact: true },
  { to: "/activity/requests", labelKey: "activity.lanes.requests" },
  { to: "/activity/calendar", labelKey: "activity.lanes.calendar" },
  { to: "/activity/history", labelKey: "activity.lanes.history" },
] as const;

/** The tab row shared by every Activity lane. */
export function ActivityLanes() {
  const { t } = useTranslation("common");
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      aria-label={t("activity.lanes.label")}
      className="mx-auto flex w-full max-w-4xl gap-1 overflow-x-auto px-4 pt-6"
    >
      {LANES.map((lane) => {
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
      })}
    </nav>
  );
}
