import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { TrendingUp } from "lucide-react";
import {
  Kicker,
  WidgetHeader,
  WidgetShell,
} from "@/pages/_component/widgetPrimitives";
import { formatBytes } from "@/lib/utils/format";
import { GrowthBars } from "./GrowthBars";
import { monthName, useGrowthFigures } from "./useGrowthFigures";

export function LibraryGrowthWidget() {
  const { t, i18n } = useTranslation("common");
  const navigate = useNavigate();
  const data = useGrowthFigures();
  if (!data) return null;

  const { growth, booksEnabled, showBytes, current, previous, percent } = data;
  const locale = i18n.language;
  const prevMonth = monthName(growth.previous_to_date.start, locale);
  const format = (n: number) => (showBytes ? formatBytes(n) : String(n));
  const arrow =
    percent === null || percent === 0 ? "–" : percent > 0 ? "▲" : "▼";
  const sinceDate = growth.since
    ? new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeZone: "UTC",
      }).format(new Date(`${growth.since}T00:00:00Z`))
    : null;

  const figures = [
    { key: "movies", value: growth.month.movies },
    { key: "episodes", value: growth.month.episodes },
    ...(booksEnabled ? [{ key: "books", value: growth.month.books }] : []),
  ];

  return (
    <WidgetShell>
      <button
        type="button"
        className="focus-ring block w-full text-left"
        onClick={() => void navigate({ to: "/library" })}
      >
        <WidgetHeader
          icon={TrendingUp}
          title={t("libraryGrowth.title")}
          right={
            <Kicker>
              {t("libraryGrowth.monthSoFar", {
                month: monthName(growth.month.start, locale),
              })}
            </Kicker>
          }
        />
        <div className="space-y-4 p-4">
          <div>
            <p className="font-display text-3xl font-semibold tabular-nums text-neutral-50">
              {showBytes
                ? formatBytes(current)
                : t("libraryGrowth.titles", { count: current })}
            </p>
            <p className="mt-0.5 text-xs text-neutral-400">
              {percent === null
                ? t("libraryGrowth.vsNoBaseline", {
                    value: format(previous),
                    month: prevMonth,
                  })
                : t("libraryGrowth.vsPrevious", {
                    arrow,
                    percent: Math.abs(percent),
                    month: prevMonth,
                  })}
            </p>
          </div>
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${figures.length}, minmax(0, 1fr))`,
            }}
          >
            {figures.map((f) => (
              <div
                key={f.key}
                className="rounded-lg bg-neutral-800/60 px-2.5 py-2"
              >
                <p className="text-lg font-semibold tabular-nums text-neutral-50">
                  {f.value}
                </p>
                <p className="text-[11.5px] text-neutral-400">
                  {t(`libraryGrowth.${f.key}`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </button>
      {/* Outside the button: the bars are focusable for their tooltips. */}
      <div className="space-y-4 px-4 pb-4">
        <GrowthBars
          growth={growth}
          showBytes={showBytes}
          booksEnabled={booksEnabled}
          locale={locale}
        />
        <div className="flex justify-between gap-2 text-xs text-neutral-400">
          <span>
            {t("libraryGrowth.upgrades", { count: growth.month.upgrades })}
          </span>
          {sinceDate ? (
            <span>{t("libraryGrowth.since", { date: sinceDate })}</span>
          ) : null}
        </div>
      </div>
    </WidgetShell>
  );
}
