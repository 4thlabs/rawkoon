import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Headphones } from "lucide-react";
import { WidgetShell, WidgetHeader } from "@/pages/_component/widgetPrimitives";
import { useFeatures } from "@/lib/routing/useFeatures";
import { useListeningStats } from "./useListeningStats";
import {
  ListeningStatsFigures,
  weekBarMaxSeconds,
  weekdayLabel,
} from "./ListeningStatsFigures";

/** This week's listening at a glance; the whole card opens the full stats. */
export function BooksCard() {
  const { t } = useTranslation("common");
  const features = useFeatures();
  const stats = useListeningStats();

  if (features.data?.books_enabled === false) return null;
  if (stats.isError || !stats.data) return null;

  const maxSeconds = weekBarMaxSeconds(stats.data.week);

  return (
    <WidgetShell>
      <Link
        to="/books/listening"
        className="focus-ring block transition-colors hover:bg-neutral-800/40"
      >
        <WidgetHeader icon={Headphones} title={t("dashboard.home.books")} />
        <div className="space-y-4 px-4 py-3">
          <ListeningStatsFigures stats={stats.data} />
          <div className="flex h-10 items-end gap-1.5" aria-hidden>
            {stats.data.week.map((entry) => (
              <div
                key={entry.day}
                title={weekdayLabel(entry.day)}
                className="flex h-full flex-1 items-end"
              >
                <div
                  className={
                    entry.seconds === 0
                      ? "h-0.5 w-full rounded-full bg-neutral-800"
                      : "w-full rounded-t bg-primary-500/80"
                  }
                  style={
                    entry.seconds === 0
                      ? undefined
                      : { height: `${(entry.seconds / maxSeconds) * 100}%` }
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </Link>
    </WidgetShell>
  );
}
