import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { TrendingUp } from "lucide-react";
import {
  Kicker,
  WidgetHeader,
  WidgetShell,
} from "@/pages/_component/widgetPrimitives";
import { useAuth } from "@/lib/auth/useAuth";
import { useFeatures } from "@/lib/routing/useFeatures";
import { formatBytes } from "@/lib/utils/format";
import { GrowthBars } from "./GrowthBars";
import { deltaPercent, isGrowthEmpty, metricIn } from "./growthMath";
import { useLibraryGrowth } from "./useLibraryGrowth";

const monthName = (start: string, locale: string): string =>
  new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }).format(
    new Date(`${start}T00:00:00Z`),
  );

export function LibraryGrowthWidget() {
  const { t, i18n } = useTranslation("common");
  const navigate = useNavigate();
  const { user } = useAuth();
  const features = useFeatures();
  const query = useLibraryGrowth();
  const growth = query.data?.growth;

  if (query.isError || !growth || isGrowthEmpty(growth)) return null;

  const locale = i18n.language;
  const booksEnabled = features.data?.books_enabled !== false;
  const showBytes = user?.is_admin === true && growth.month.bytes !== null;
  const current = metricIn(growth.month, showBytes, booksEnabled);
  const previous = metricIn(growth.previous_to_date, showBytes, booksEnabled);
  const percent = deltaPercent(current, previous);
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
            style={{ gridTemplateColumns: `repeat(${figures.length}, 1fr)` }}
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
      </button>
    </WidgetShell>
  );
}
