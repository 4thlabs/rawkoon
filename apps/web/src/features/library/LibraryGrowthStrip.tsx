import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { LibraryStatsPanel } from "@/pages/medias/_component/LibraryStatsPanel";
import { formatBytes } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { GrowthBars } from "./GrowthBars";
import { barHeightPercent, isBeforeSince, metricIn } from "./growthMath";
import { monthName, useGrowthFigures } from "./useGrowthFigures";

/** One line of this month's growth that opens into the full stats. */
export function LibraryGrowthStrip() {
  const { t, i18n } = useTranslation("common");
  const data = useGrowthFigures();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const locale = i18n.language;

  const toggle = (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={open ? panelId : undefined}
      aria-label={t("libraryGrowth.strip.allStats")}
      onClick={() => setOpen((o) => !o)}
      className="focus-ring ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-sm text-neutral-400 transition-colors hover:text-neutral-100"
    >
      <span className={data ? "hidden sm:inline" : undefined}>
        {t("libraryGrowth.strip.allStats")}
      </span>
      <ChevronDown
        size={14}
        aria-hidden
        className={cn("transition-transform", open && "rotate-180")}
      />
    </button>
  );

  const weekValues = data
    ? data.growth.weeks.map((w) =>
        isBeforeSince(w.start, data.growth.since)
          ? 0
          : metricIn(w, data.showBytes, data.booksEnabled),
      )
    : [];
  const max = Math.max(...weekValues, 0);

  const counts = data
    ? [
        { key: "movies", value: data.growth.month.movies },
        { key: "episodes", value: data.growth.month.episodes },
        ...(data.booksEnabled
          ? [{ key: "books", value: data.growth.month.books }]
          : []),
      ]
    : [];

  return (
    <section
      aria-label={t("library.stats.title")}
      className="rounded-xl border border-neutral-800 bg-surface-raised"
    >
      <div className="flex min-h-14 items-center gap-x-4 px-4 py-2.5 sm:gap-x-5">
        {data && (
          <>
            <div className="flex min-w-0 items-baseline gap-2">
              <span className="font-display text-xl font-semibold tabular-nums text-neutral-50">
                {data.showBytes
                  ? formatBytes(data.current)
                  : t("libraryGrowth.titles", { count: data.current })}
              </span>
              <span className="text-sm text-neutral-400 sm:hidden">
                {t("libraryGrowth.strip.thisMonth")}
              </span>
              <span className="hidden text-sm text-neutral-400 sm:inline">
                {t("libraryGrowth.strip.added", {
                  month: monthName(data.growth.month.start, locale),
                })}
              </span>
            </div>
            <div
              role="img"
              aria-label={t("libraryGrowth.strip.sparkline")}
              className="flex h-6 w-16 shrink-0 items-end gap-0.5 sm:w-28"
            >
              {weekValues.map((v, i) => {
                const last = i === weekValues.length - 1;
                const h = barHeightPercent(v, max);
                return (
                  <span
                    key={data.growth.weeks[i].start}
                    className={cn(
                      "flex-1 rounded-t-[2px]",
                      h === 0 ? "h-px bg-neutral-700" : "bg-primary-500",
                      last && h > 0 && "opacity-60",
                    )}
                    style={h === 0 ? undefined : { height: `${h}%` }}
                  />
                );
              })}
            </div>
            <dl className="hidden items-baseline gap-4 text-sm sm:flex">
              {counts.map((c) => (
                <div key={c.key} className="flex items-baseline gap-1.5">
                  <dt className="sr-only">{t(`libraryGrowth.${c.key}`)}</dt>
                  <dd className="font-medium tabular-nums text-neutral-100">
                    {c.value}
                  </dd>
                  <span aria-hidden className="text-neutral-400">
                    {t(`libraryGrowth.strip.${c.key}`, { count: c.value })}
                  </span>
                </div>
              ))}
            </dl>
          </>
        )}
        {toggle}
      </div>
      {open && (
        <div
          id={panelId}
          className="space-y-5 border-t border-neutral-800 px-4 py-4"
        >
          <LibraryStatsPanel />
          {data && (
            <GrowthBars
              growth={data.growth}
              showBytes={data.showBytes}
              booksEnabled={data.booksEnabled}
              locale={locale}
            />
          )}
        </div>
      )}
    </section>
  );
}
