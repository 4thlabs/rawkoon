import { useTranslation } from "react-i18next";
import type { LibraryGrowth } from "@rawkoon/shared/types";
import { formatBytes } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { barHeightPercent, isBeforeSince, metricIn } from "./growthMath";

type Props = {
  growth: LibraryGrowth;
  showBytes: boolean;
  booksEnabled: boolean;
  locale: string;
};

/** 12 weekly bars as flex divs; the last (current) week is striped. */
export function GrowthBars({ growth, showBytes, booksEnabled, locale }: Props) {
  const { t } = useTranslation("common");
  const values = growth.weeks.map((w) => metricIn(w, showBytes, booksEnabled));
  const max = Math.max(...values, 0);
  const dateFmt = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const label = (start: string) =>
    dateFmt.format(new Date(`${start}T00:00:00Z`));

  return (
    <div>
      <div className="flex h-16 items-end gap-0.5 border-b border-neutral-800">
        {growth.weeks.map((week, i) => {
          const noData = isBeforeSince(week.start, growth.since);
          const current = i === growth.weeks.length - 1;
          const height = noData ? 0 : barHeightPercent(values[i], max);
          const summary = [
            t("libraryGrowth.weekOf", { date: label(week.start) }),
            t("libraryGrowth.movies") + ` ${week.movies}`,
            t("libraryGrowth.episodes") + ` ${week.episodes}`,
            ...(booksEnabled
              ? [t("libraryGrowth.books") + ` ${week.books}`]
              : []),
            ...(showBytes && week.bytes !== null
              ? [formatBytes(week.bytes)]
              : []),
          ];
          return (
            <div
              key={week.start}
              tabIndex={0}
              role="img"
              aria-label={
                noData ? t("libraryGrowth.noData") : summary.join(", ")
              }
              className="group relative flex h-full flex-1 items-end focus:outline-none"
            >
              <div
                className={cn(
                  "w-full rounded-t-[3px] bg-primary-500 group-hover:bg-primary-400 group-focus-visible:bg-primary-400",
                  noData && "!h-0.5 rounded-none !bg-neutral-700",
                  !noData &&
                    height === 0 &&
                    "!h-0.5 rounded-none !bg-neutral-700",
                  current &&
                    !noData &&
                    "border border-b-0 border-primary-500 !bg-transparent bg-[repeating-linear-gradient(135deg,var(--color-primary-500)_0_3px,transparent_3px_6px)]",
                )}
                style={{ height: `${height}%` }}
              />
              <div
                role="presentation"
                className={cn(
                  "pointer-events-none absolute bottom-full z-10 mb-1.5 hidden whitespace-nowrap rounded-md bg-neutral-100 px-2 py-1.5 text-xs leading-snug text-neutral-900 group-hover:block group-focus-visible:block",
                  i < 3
                    ? "left-0"
                    : i > 8
                      ? "right-0"
                      : "left-1/2 -translate-x-1/2",
                )}
              >
                <b>{summary[0]}</b>
                {noData ? (
                  <div>{t("libraryGrowth.noData")}</div>
                ) : (
                  summary.slice(1).map((line) => <div key={line}>{line}</div>)
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[11px] tabular-nums text-neutral-400">
        <span>{label(growth.weeks[0].start)}</span>
        <span>{t("libraryGrowth.thisWeek")}</span>
      </div>
    </div>
  );
}
